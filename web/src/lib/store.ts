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
