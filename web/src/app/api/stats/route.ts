import { NextResponse } from "next/server";
import { getAllCorridors, getAllAgents, enforceExpiry } from "@/lib/store";

export async function GET() {
  enforceExpiry();

  const corridors = getAllCorridors();
  const agents = getAllAgents();

  const completed = corridors.filter((c) => c.status === "completed");
  const active = corridors.filter(
    (c) => c.status !== "completed" && c.status !== "timeout"
  );

  const volumeNgn = completed.reduce((sum, c) => sum + c.amountSend, 0);
  const volumeBob = completed.reduce((sum, c) => sum + c.amountReceive, 0);

  const avgFeeBps =
    corridors.length > 0
      ? Math.round(
          corridors.reduce((sum, c) => sum + c.feeBps, 0) / corridors.length
        )
      : 100;

  const totalCollateral = agents.reduce((sum, a) => sum + a.collateral, 0);

  return NextResponse.json({
    corridors: {
      total: corridors.length,
      completed: completed.length,
      active: active.length,
      volumeNgn,
      volumeBob,
      avgFeeBps,
    },
    agents: {
      total: agents.length,
      totalCollateral,
      avgReputation:
        agents.length > 0
          ? Math.round(
              agents.reduce((sum, a) => sum + a.reputation, 0) / agents.length
            )
          : 0,
    },
    timestamp: Date.now(),
  });
}
