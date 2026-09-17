import { NextRequest, NextResponse } from "next/server";
import {
  getCorridor,
  transitionCorridor,
  setCorridor,
  getAllAgents,
  patchAgent,
  getAgent,
} from "@/lib/store";

// POST /api/corridors/accept. Simulates agent accepting a corridor.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { corridorId, agentAddress } = body;

  if (!corridorId) {
    return NextResponse.json({ error: "corridorId required" }, { status: 400 });
  }

  const corridor = getCorridor(corridorId);
  if (!corridor) {
    return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
  }

  // Find best agent if none specified
  let agentAddr = agentAddress;
  if (!agentAddr) {
    const agents = getAllAgents();
    const available = agents.find(
      (a) =>
        a.activeCorridors < a.maxCorridors &&
        (a.supportedSide === "both" || a.supportedSide === "ngn")
    );
    if (!available) {
      return NextResponse.json({ error: "No available agents" }, { status: 404 });
    }
    agentAddr = available.address;
  }

  // Transition: created → accepted
  const result = transitionCorridor(corridorId, "accepted");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Assign agent
  result.corridor.agent = agentAddr;
  result.corridor.feeBps = getAgent(agentAddr)?.rateBps || 100;
  setCorridor(result.corridor);

  // Update agent active corridors
  const agent = getAgent(agentAddr);
  if (agent) {
    patchAgent(agentAddr, { activeCorridors: agent.activeCorridors + 1 });
  }

  return NextResponse.json({ corridor: result.corridor });
}
