import {
  setCorridor,
  getCorridor,
  hasCorridor,
  getAllCorridors,
  transitionCorridor,
  enforceExpiry,
  setAgent,
  getAgent,
  patchAgent,
  getAllAgents,
  hasAgent,
  clearAll,
  type CorridorRecord,
  type AgentRecord,
} from "../lib/store";

beforeEach(() => {
  clearAll();
});

function makeCorridor(overrides: Partial<CorridorRecord> = {}): CorridorRecord {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: 1,
    sender: "GABC123",
    receiverPhone: "+59170000000",
    amountSend: 50000,
    amountReceive: 207,
    status: "created",
    agent: null,
    createdAt: now,
    expiresAt: now + 300,
    completedAt: null,
    feeBps: 100,
    paystackRef: null,
    ...overrides,
  };
}

function makeAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    address: "GAGENT123",
    reputation: 100,
    activeCorridors: 0,
    maxCorridors: 5,
    collateral: 500,
    rateBps: 100,
    supportedSide: "both",
    completedToday: 0,
    registeredAt: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe("Corridor Store", () => {
  test("set and get corridor", () => {
    const c = makeCorridor({ id: 999 });
    setCorridor(c);
    expect(getCorridor(999)).toEqual(c);
  });

  test("hasCorridor returns true/false", () => {
    const c = makeCorridor({ id: 888 });
    setCorridor(c);
    expect(hasCorridor(888)).toBe(true);
    expect(hasCorridor(777)).toBe(false);
  });

  test("getAllCorridors returns sorted by createdAt desc", () => {
    const c1 = makeCorridor({ id: 1, createdAt: 100 });
    const c2 = makeCorridor({ id: 2, createdAt: 200 });
    setCorridor(c1);
    setCorridor(c2);
    const all = getAllCorridors();
    expect(all[0].id).toBe(2);
    expect(all[1].id).toBe(1);
  });

  test("transitionCorridor valid transition", () => {
    const c = makeCorridor({ id: 500, status: "created" });
    setCorridor(c);
    const result = transitionCorridor(500, "accepted");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.corridor.status).toBe("accepted");
    }
  });

  test("transitionCorridor invalid transition", () => {
    const c = makeCorridor({ id: 501, status: "created" });
    setCorridor(c);
    const result = transitionCorridor(501, "completed");
    expect(result.ok).toBe(false);
  });

  test("transitionCorridor sets completedAt on completion", () => {
    const c = makeCorridor({ id: 502, status: "remote_paid" });
    setCorridor(c);
    const result = transitionCorridor(502, "completed");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.corridor.completedAt).toBeTruthy();
    }
  });

  test("transitionCorridor on nonexistent corridor", () => {
    const result = transitionCorridor(99999, "accepted");
    expect(result.ok).toBe(false);
  });

  test("enforceExpiry expires old corridors", () => {
    const now = Math.floor(Date.now() / 1000);
    const c = makeCorridor({ id: 600, status: "accepted", expiresAt: now - 10 });
    setCorridor(c);
    const expired = enforceExpiry();
    expect(expired.length).toBe(1);
    expect(expired[0].status).toBe("timeout");
  });

  test("enforceExpiry skips completed corridors", () => {
    const now = Math.floor(Date.now() / 1000);
    const c = makeCorridor({ id: 601, status: "completed", expiresAt: now - 10 });
    setCorridor(c);
    const expired = enforceExpiry();
    expect(expired.length).toBe(0);
  });

  test("enforceExpiry skips non-expired corridors", () => {
    const now = Math.floor(Date.now() / 1000);
    const c = makeCorridor({ id: 602, status: "accepted", expiresAt: now + 300 });
    setCorridor(c);
    const expired = enforceExpiry();
    expect(expired.length).toBe(0);
  });
});

describe("Agent Store", () => {
  test("set and get agent", () => {
    const a = makeAgent({ address: "GTESTAGENT" });
    setAgent(a);
    expect(getAgent("GTESTAGENT")).toEqual(a);
  });

  test("hasAgent", () => {
    setAgent(makeAgent({ address: "GEXIST" }));
    expect(hasAgent("GEXIST")).toBe(true);
    expect(hasAgent("GNOPE")).toBe(false);
  });

  test("patchAgent updates fields", () => {
    setAgent(makeAgent({ address: "GPATCH", reputation: 100 }));
    const result = patchAgent("GPATCH", { reputation: 200 });
    expect(result).toBeTruthy();
    expect(result!.reputation).toBe(200);
  });

  test("patchAgent returns null for nonexistent", () => {
    const result = patchAgent("GNONEXIST", { reputation: 200 });
    expect(result).toBeNull();
  });

  test("getAllAgents sorted by reputation", () => {
    setAgent(makeAgent({ address: "GLOW", reputation: 50 }));
    setAgent(makeAgent({ address: "GHIGH", reputation: 200 }));
    const all = getAllAgents();
    expect(all[0].address).toBe("GHIGH");
    expect(all[1].address).toBe("GLOW");
  });
});

describe("Workflow: acceptCorridor", () => {
  test("accepts with best agent and reserves slot", async () => {
    const { acceptCorridor } = await import("../lib/store");
    const { setCorridor, setAgent } = await import("../lib/store");
    setAgent({
      address: "GACC1",
      reputation: 150,
      activeCorridors: 0,
      maxCorridors: 5,
      collateral: 5000,
      rateBps: 100,
      supportedSide: "both",
      completedToday: 0,
      registeredAt: 1,
    });
    const now = Math.floor(Date.now() / 1000);
    setCorridor({
      id: 700,
      sender: "GS1",
      receiverPhone: "+5917",
      amountSend: 50000,
      amountReceive: 207,
      status: "created",
      agent: null,
      createdAt: now,
      expiresAt: now + 300,
      completedAt: null,
      feeBps: 100,
      paystackRef: null,
    });

    const result = acceptCorridor(700);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.corridor.status).toBe("accepted");
      expect(result.corridor.agent).toBe("GACC1");
    }
  });

  test("fails with no available agents", async () => {
    const { acceptCorridor, setCorridor } = await import("../lib/store");
    const now = Math.floor(Date.now() / 1000);
    setCorridor({
      id: 701,
      sender: "GS1",
      receiverPhone: "+5917",
      amountSend: 1000,
      amountReceive: 4,
      status: "created",
      agent: null,
      createdAt: now,
      expiresAt: now + 300,
      completedAt: null,
      feeBps: 100,
      paystackRef: null,
    });
    const result = acceptCorridor(701);
    expect(result.ok).toBe(false);
  });

  test("fails on nonexistent corridor", async () => {
    const { acceptCorridor } = await import("../lib/store");
    expect(acceptCorridor(99998).ok).toBe(false);
  });
});

describe("Workflow: markFiatPaid", () => {
  test("marks paid and is idempotent on replay", async () => {
    const mod = await import("../lib/store");
    mod.setAgent({
      address: "GPAY1",
      reputation: 100,
      activeCorridors: 0,
      maxCorridors: 5,
      collateral: 5000,
      rateBps: 100,
      supportedSide: "both",
      completedToday: 0,
      registeredAt: 1,
    });
    const now = Math.floor(Date.now() / 1000);
    mod.setCorridor({
      id: 710,
      sender: "GS1",
      receiverPhone: "+5917",
      amountSend: 10000,
      amountReceive: 41,
      status: "created",
      agent: null,
      createdAt: now,
      expiresAt: now + 300,
      completedAt: null,
      feeBps: 100,
      paystackRef: null,
    });

    const first = mod.markFiatPaid(710, "ref_abc");
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.corridor.status).toBe("local_paid");
      expect(first.corridor.paystackRef).toBe("ref_abc");
      expect(first.extra?.duplicate).toBe(false);
    }

    const replay = mod.markFiatPaid(710, "ref_abc");
    expect(replay.ok).toBe(true);
    if (replay.ok) expect(replay.extra?.duplicate).toBe(true);
  });

  test("fails on nonexistent corridor", async () => {
    const { markFiatPaid } = await import("../lib/store");
    expect(markFiatPaid(99997, "ref_x").ok).toBe(false);
  });
});

describe("Workflow: completeCorridor", () => {
  test("completes and emits payout instruction", async () => {
    const mod = await import("../lib/store");
    mod.setAgent({
      address: "GCMP1",
      reputation: 100,
      activeCorridors: 1,
      maxCorridors: 5,
      collateral: 5000,
      rateBps: 100,
      supportedSide: "both",
      completedToday: 0,
      registeredAt: 1,
    });
    const now = Math.floor(Date.now() / 1000);
    mod.setCorridor({
      id: 720,
      sender: "GS1",
      receiverPhone: "+59171234567",
      amountSend: 50000,
      amountReceive: 207,
      status: "local_paid",
      agent: "GCMP1",
      createdAt: now,
      expiresAt: now + 300,
      completedAt: null,
      feeBps: 100,
      paystackRef: "ref_done",
    });

    const result = mod.completeCorridor(720);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.corridor.status).toBe("completed");
      expect(result.extra?.payout).toEqual({
        corridorId: 720,
        to: "+59171234567",
        amountBob: 207,
        rail: "BOB-QR",
        agent: "GCMP1",
      });
    }
  });

  test("fails on nonexistent corridor", async () => {
    const { completeCorridor } = await import("../lib/store");
    expect(completeCorridor(99996).ok).toBe(false);
  });
});

describe("Workflow: findBestAgent", () => {
  test("picks highest reputation then lowest rate", async () => {
    const mod = await import("../lib/store");
    mod.setAgent({
      address: "GR1",
      reputation: 100,
      activeCorridors: 0,
      maxCorridors: 5,
      collateral: 5000,
      rateBps: 200,
      supportedSide: "both",
      completedToday: 0,
      registeredAt: 1,
    });
    mod.setAgent({
      address: "GR2",
      reputation: 100,
      activeCorridors: 0,
      maxCorridors: 5,
      collateral: 5000,
      rateBps: 50,
      supportedSide: "both",
      completedToday: 0,
      registeredAt: 1,
    });
    const best = mod.findBestAgent("ngn");
    expect(best?.address).toBe("GR2");
  });
});
