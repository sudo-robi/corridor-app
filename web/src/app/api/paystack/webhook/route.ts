import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { markFiatPaid } from "@/lib/store";

// Layered confirmation loop:
//   Paystack rail → this webhook (HMAC verified) → workflow state
//   (markFiatPaid: marks fiat paid) → settlement adapter (stellar.ts)
//   pushes the state on-chain. The webhook never writes to the
//   escrow contract directly and never touches raw store maps.
export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Read raw body BEFORE parsing. Required for HMAC verification.
  const rawBody = await req.text();

  const hash = req.headers.get("x-paystack-signature");
  if (!hash) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const expectedHash = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  const hashBuf = Buffer.from(hash, "hex");
  const expectedBuf = Buffer.from(expectedHash, "hex");

  if (hashBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hashBuf, expectedBuf)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

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

      const result = markFiatPaid(id, body.data.reference);
      if (result.ok) {
        console.log(
          `[Paystack] Corridor ${id} marked fiat paid. Ref: ${body.data.reference}` +
            (result.extra?.duplicate ? " (duplicate replay ignored)" : "")
        );
      } else {
        console.warn(`[Paystack] Corridor ${id} fiat-paid failed: ${result.error}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
