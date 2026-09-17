import { NextRequest, NextResponse } from "next/server";
import {
  hasAgent,
  setAgent,
  getAgent,
  getAllAgents,
  patchAgent,
  type AgentRecord,
} from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.address || typeof body.address !== "string") {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  if (hasAgent(body.address)) {
    return NextResponse.json({ error: "Agent already registered" }, { status: 409 });
  }

  const record: AgentRecord = {
    address: body.address,
    reputation: body.reputation ?? 100,
    activeCorridors: body.activeCorridors ?? 0,
    maxCorridors: body.maxCorridors ?? 5,
    collateral: body.collateral ?? 0,
    rateBps: body.rateBps ?? 100,
    supportedSide: body.supportedSide || "both",
    completedToday: body.completedToday ?? 0,
    registeredAt: body.registeredAt || Math.floor(Date.now() / 1000),
  };

  setAgent(record);

  return NextResponse.json({ agent: record });
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (address) {
    const agent = getAgent(address);
    if (!agent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ agent });
  }

  const all = getAllAgents();
  return NextResponse.json({ agents: all });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (!body.address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const agent = patchAgent(body.address, body);
  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ agent });
}
