import { NextRequest, NextResponse } from "next/server";
import {
  transitionCorridor,
  setCorridor,
  getCorridor,
  getAgent,
  patchAgent,
} from "@/lib/store";

// POST /api/corridors/complete — Simulate corridor completion
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { corridorId } = body;

  if (!corridorId) {
    return NextResponse.json({ error: "corridorId required" }, { status: 400 });
  }

  const corridor = getCorridor(corridorId);
  if (!corridor) {
    return NextResponse.json({ error: "Corridor not found" }, { status: 404 });
  }

  // Transition through the remaining steps
  if (corridor.status === "local_paid") {
    const r1 = transitionCorridor(corridorId, "remote_paid");
    if (!r1.ok) return NextResponse.json({ error: r1.error }, { status: 400 });

    const r2 = transitionCorridor(corridorId, "completed");
    if (!r2.ok) return NextResponse.json({ error: r2.error }, { status: 400 });

    // Update agent reputation +1
    if (corridor.agent) {
      const agent = getAgent(corridor.agent);
      if (agent) {
        patchAgent(corridor.agent, {
          reputation: agent.reputation + 1,
          activeCorridors: Math.max(0, agent.activeCorridors - 1),
          completedToday: agent.completedToday + 1,
        });
      }
    }

    return NextResponse.json({ corridor: r2.corridor });
  }

  if (corridor.status === "accepted") {
    const r1 = transitionCorridor(corridorId, "local_paid");
    if (!r1.ok) return NextResponse.json({ error: r1.error }, { status: 400 });

    const r2 = transitionCorridor(corridorId, "remote_paid");
    if (!r2.ok) return NextResponse.json({ error: r2.error }, { status: 400 });

    const r3 = transitionCorridor(corridorId, "completed");
    if (!r3.ok) return NextResponse.json({ error: r3.error }, { status: 400 });

    if (corridor.agent) {
      const agent = getAgent(corridor.agent);
      if (agent) {
        patchAgent(corridor.agent, {
          reputation: agent.reputation + 1,
          activeCorridors: Math.max(0, agent.activeCorridors - 1),
          completedToday: agent.completedToday + 1,
        });
      }
    }

    return NextResponse.json({ corridor: r3.corridor });
  }

  return NextResponse.json(
    { error: `Corridor in status ${corridor.status} cannot be completed` },
    { status: 400 }
  );
}
