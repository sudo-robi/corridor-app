import { NextRequest, NextResponse } from "next/server";
import { completeCorridor } from "@/lib/store";

// POST /api/corridors/complete
// Corridor workflow API owns completion: it walks the corridor to
// "completed", pays out agent reputation, and emits the explicit
// BOB payout instruction consumed by the off-ramp network.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { corridorId } = body;

  if (!corridorId) {
    return NextResponse.json({ error: "corridorId required" }, { status: 400 });
  }

  const result = completeCorridor(corridorId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    corridor: result.corridor,
    payout: result.extra?.payout ?? null,
  });
}
