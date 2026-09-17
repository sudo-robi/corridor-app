import { NextRequest, NextResponse } from "next/server";
import {
  hasCorridor,
  setCorridor,
  transitionCorridor,
  enforceExpiry,
  type CorridorRecord,
  type CorridorStatus,
  VALID_STATUSES,
} from "@/lib/store";
import { getCorridor, getAllCorridors } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Validate required fields
  if (!body.id && body.id !== 0) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (typeof body.id !== "number" || !Number.isFinite(body.id)) {
    return NextResponse.json({ error: "id must be a finite number" }, { status: 400 });
  }
  if (!body.receiverPhone) {
    return NextResponse.json({ error: "receiverPhone required" }, { status: 400 });
  }
  if (!body.amountSend || body.amountSend <= 0) {
    return NextResponse.json({ error: "amountSend must be > 0" }, { status: 400 });
  }
  if (!body.amountReceive || body.amountReceive <= 0) {
    return NextResponse.json({ error: "amountReceive must be > 0" }, { status: 400 });
  }

  const status = (body.status || "created") as CorridorStatus;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  if (hasCorridor(body.id)) {
    return NextResponse.json({ error: "Corridor ID already exists" }, { status: 409 });
  }

  const now = Math.floor(Date.now() / 1000);
  const record: CorridorRecord = {
    id: body.id,
    sender: body.sender || "",
    receiverPhone: body.receiverPhone,
    amountSend: body.amountSend,
    amountReceive: body.amountReceive,
    status,
    agent: body.agent || null,
    createdAt: body.createdAt || now,
    expiresAt: body.expiresAt || now + 300,
    completedAt: null,
    feeBps: body.feeBps || 100,
    paystackRef: body.paystackRef || null,
  };

  setCorridor(record);

  return NextResponse.json({ corridor: record });
}

export async function GET(req: NextRequest) {
  // Enforce expiry on every read
  enforceExpiry();

  const idParam = req.nextUrl.searchParams.get("id");

  if (idParam) {
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const corridor = getCorridor(id);
    if (!corridor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ corridor });
  }

  const all = getAllCorridors();
  return NextResponse.json({ corridors: all });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (body.id === undefined || body.id === null) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const corridor = getCorridor(body.id);
  if (!corridor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If status transition requested, use the state machine
  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }

    const result = transitionCorridor(body.id, body.status);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Apply additional patches
    if (body.agent !== undefined) result.corridor.agent = body.agent;
    if (body.paystackRef !== undefined) result.corridor.paystackRef = body.paystackRef;
    setCorridor(result.corridor);

    return NextResponse.json({ corridor: result.corridor });
  }

  // No status change — apply partial updates
  if (body.agent !== undefined) corridor.agent = body.agent;
  if (body.completedAt !== undefined) corridor.completedAt = body.completedAt;
  if (body.paystackRef !== undefined) corridor.paystackRef = body.paystackRef;
  setCorridor(corridor);

  return NextResponse.json({ corridor });
}
