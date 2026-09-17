import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { transitionCorridor, setCorridor, getCorridor } from "@/lib/store";

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Read raw body BEFORE parsing — needed for HMAC verification
  const rawBody = await req.text();

  const hash = req.headers.get("x-paystack-signature");
  if (!hash) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const expectedHash = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  // Timing-safe comparison
  const hashBuf = Buffer.from(hash, "hex");
  const expectedBuf = Buffer.from(expectedHash, "hex");

  if (hashBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hashBuf, expectedBuf)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // NOW parse the body (after verification)
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.event === "charge.success") {
    const { corridorId } = body.data?.metadata || {};

    if (corridorId) {
      const id = parseInt(corridorId);
      if (isNaN(id)) {
        console.warn(`[Paystack] Invalid corridorId: ${corridorId}`);
        return NextResponse.json({ received: true });
      }

      // Transition corridor: accepted → local_paid
      const result = transitionCorridor(id, "local_paid");
      if (result.ok) {
        result.corridor.paystackRef = body.data.reference;
        setCorridor(result.corridor);
        console.log(`[Paystack] Corridor ${id} → local_paid. Ref: ${body.data.reference}`);
      } else {
        console.warn(`[Paystack] Corridor ${id} transition failed: ${result.error}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
