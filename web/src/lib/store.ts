export const VALID_STATUSES = [
  "created",
  "accepted",
  "local_paid",
  "remote_paid",
  "completed",
  "timeout",
] as const;

export type CorridorStatus = (typeof VALID_STATUSES)[number];

export interface CorridorRecord {
  id: number;
  sender: string;
  receiverPhone: string;
  amountSend: number;
  amountReceive: number;
  status: CorridorStatus;
  agent: string | null;
  createdAt: number;
  expiresAt: number;
  completedAt: number | null;
  feeBps: number;
  paystackRef: string | null;
}

export interface AgentRecord {
  address: string;
  reputation: number;
  activeCorridors: number;
  maxCorridors: number;
  collateral: number;
  rateBps: number;
  supportedSide: string;
  completedToday: number;
  registeredAt: number;
}

// ─── Shared in-memory stores (singleton across all API routes) ──────────

const _corridors = new Map<number, CorridorRecord>();
const _agents = new Map<string, AgentRecord>();

// ─── Corridor operations ───────────────────────────────────────────────

export function getCorridor(id: number): CorridorRecord | undefined {
  return _corridors.get(id);
}

export function setCorridor(record: CorridorRecord): void {
  _corridors.set(record.id, record);
}

export function hasCorridor(id: number): boolean {
  return _corridors.has(id);
}

export function getAllCorridors(): CorridorRecord[] {
  return Array.from(_corridors.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function patchCorridor(
  id: number,
  patch: Partial<CorridorRecord>
): CorridorRecord | null {
  const corridor = _corridors.get(id);
  if (!corridor) return null;

  const updated = { ...corridor, ...patch, id };
  _corridors.set(id, updated);
  return updated;
}

export function transitionCorridor(
  id: number,
  newStatus: CorridorStatus
): { ok: true; corridor: CorridorRecord } | { ok: false; error: string } {
  const corridor = _corridors.get(id);
  if (!corridor) return { ok: false, error: "Corridor not found" };

  const validTransitions: Record<CorridorStatus, CorridorStatus[]> = {
    created: ["accepted", "timeout"],
    accepted: ["local_paid", "timeout"],
    local_paid: ["remote_paid", "timeout"],
    remote_paid: ["completed", "timeout"],
    completed: [],
    timeout: [],
  };

  const allowed = validTransitions[corridor.status] || [];
  if (!allowed.includes(newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from ${corridor.status} to ${newStatus}`,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const updated: CorridorRecord = {
    ...corridor,
    status: newStatus,
    completedAt: newStatus === "completed" || newStatus === "timeout" ? now : null,
  };

  _corridors.set(id, updated);
  return { ok: true, corridor: updated };
}

export function enforceExpiry(): CorridorRecord[] {
  const now = Math.floor(Date.now() / 1000);
  const expired: CorridorRecord[] = [];

  for (const [id, corridor] of _corridors) {
    if (
      corridor.status !== "completed" &&
      corridor.status !== "timeout" &&
      now > corridor.expiresAt
    ) {
      const result = transitionCorridor(id, "timeout");
      if (result.ok) expired.push(result.corridor);
    }
  }

  return expired;
}

// ─── Agent operations ──────────────────────────────────────────────────

export function getAgent(address: string): AgentRecord | undefined {
  return _agents.get(address);
}

export function setAgent(record: AgentRecord): void {
  _agents.set(record.address, record);
}

export function hasAgent(address: string): boolean {
  return _agents.has(address);
}

export function getAllAgents(): AgentRecord[] {
  return Array.from(_agents.values()).sort(
    (a, b) => b.reputation - a.reputation
  );
}

export function patchAgent(
  address: string,
  patch: Partial<AgentRecord>
): AgentRecord | null {
  const agent = _agents.get(address);
  if (!agent) return null;

  const updated = { ...agent, ...patch, address };
  _agents.set(address, updated);
  return updated;
}

// ─── Test helper: clear all data ───────────────────────────────────────

export function clearAll(): void {
  _corridors.clear();
  _agents.clear();
}

// ─── Workflow layer ────────────────────────────────────────────────────
// Business-rule entry points. API routes call these, never raw maps.
// Order of operations for a corridor:
//   create (POST /api/corridors)
//     → accept (agent matched, collateral reserved)
//     → local_paid (Paystack webhook confirms NGN)
//     → remote_paid (agent confirms BOB payout)
//     → completed (settled, reputation paid out)

export interface PayoutInstruction {
  corridorId: number;
  to: string;
  amountBob: number;
  rail: "BOB-QR" | "BOB-BANK";
  agent: string | null;
}

type WorkflowResult<T> =
  | { ok: true; corridor: CorridorRecord; extra?: T }
  | { ok: false; error: string };

const NEXT_STEP: Record<CorridorStatus, CorridorStatus | null> = {
  created: null,
  accepted: "local_paid",
  local_paid: "remote_paid",
  remote_paid: "completed",
  completed: null,
  timeout: null,
};

export function findBestAgent(
  side: AgentRecord["supportedSide"] = "ngn"
): AgentRecord | null {
  const ranked = getAllAgents()
    .filter(
      (a) =>
        a.activeCorridors < a.maxCorridors &&
        (a.supportedSide === "both" || a.supportedSide === side)
    )
    .sort((a, b) => b.reputation - a.reputation || a.rateBps - b.rateBps);
  return ranked[0] ?? null;
}

// Match an agent to a corridor and reserve their slot.
export function acceptCorridor(
  id: number,
  agentAddr?: string
): WorkflowResult<never> {
  const corridor = _corridors.get(id);
  if (!corridor) return { ok: false, error: "Corridor not found" };

  let addr = agentAddr;
  if (!addr) {
    const best = findBestAgent("ngn");
    if (!best) return { ok: false, error: "No available agents" };
    addr = best.address;
  }

  const agent = _agents.get(addr);
  if (!agent) return { ok: false, error: "Agent not registered" };
  if (agent.activeCorridors >= agent.maxCorridors) {
    return { ok: false, error: "Agent at capacity" };
  }

  const result = transitionCorridor(id, "accepted");
  if (!result.ok) return result;

  result.corridor.agent = addr;
  result.corridor.feeBps = agent.rateBps;
  _corridors.set(id, result.corridor);

  agent.activeCorridors += 1;
  _agents.set(addr, agent);

  return { ok: true, corridor: result.corridor };
}

// Called ONLY by the verified Paystack webhook after HMAC check.
// Idempotent: replaying the same reference is a no-op success.
// Auto-accepts corridors still in "created" so a payment can never orphan.
export function markFiatPaid(
  id: number,
  ref: string
): WorkflowResult<{ duplicate: boolean }> {
  const corridor = _corridors.get(id);
  if (!corridor) return { ok: false, error: "Corridor not found" };

  if (corridor.status === "local_paid" && corridor.paystackRef === ref) {
    return { ok: true, corridor, extra: { duplicate: true } };
  }

  if (corridor.status === "created") {
    const acc = acceptCorridor(id);
    if (!acc.ok) return acc;
  }

  const result = transitionCorridor(id, "local_paid");
  if (!result.ok) return result;

  result.corridor.paystackRef = ref;
  _corridors.set(id, result.corridor);

  return { ok: true, corridor: result.corridor, extra: { duplicate: false } };
}

// Walk a corridor to completion, pay out agent reputation,
// and emit the explicit BOB payout instruction for the off-ramp network.
export function completeCorridor(
  id: number
): WorkflowResult<{ payout: PayoutInstruction | null }> {
  let corridor = _corridors.get(id);
  if (!corridor) return { ok: false, error: "Corridor not found" };

  if (corridor.status === "created") {
    const acc = acceptCorridor(id);
    if (!acc.ok) return acc;
    corridor = acc.corridor;
  }

  while (corridor.status !== "completed" && corridor.status !== "timeout") {
    const next = NEXT_STEP[corridor.status];
    if (!next) {
      return { ok: false, error: `Cannot complete from ${corridor.status}` };
    }
    const r = transitionCorridor(id, next);
    if (!r.ok) return r;
    corridor = r.corridor;
  }

  let payout: PayoutInstruction | null = null;
  if (corridor.agent) {
    const agent = _agents.get(corridor.agent);
    if (agent) {
      agent.reputation += 1;
      agent.activeCorridors = Math.max(0, agent.activeCorridors - 1);
      agent.completedToday += 1;
      _agents.set(agent.address, agent);
    }
    payout = {
      corridorId: id,
      to: corridor.receiverPhone,
      amountBob: corridor.amountReceive,
      rail: "BOB-QR",
      agent: corridor.agent,
    };
  }

  return { ok: true, corridor, extra: { payout } };
}
