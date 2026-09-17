import { NextRequest, NextResponse } from "next/server";
import { acceptCorridor } from "@/lib/store";

// POST /api/corridors/accept
// Corridor workflow API owns the settlement trigger: it matches an agent
// and reserves their slot via the workflow layer.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { corridorId, agentAddress } = body;

  if (!corridorId) {
    return NextResponse.json({ error: "corridorId required" }, { status: 400 });
  }

  const result = acceptCorridor(corridorId, agentAddress);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ corridor: result.corridor });
}
