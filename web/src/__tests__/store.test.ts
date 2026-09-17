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
