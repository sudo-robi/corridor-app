import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const initializeSchema = z.object({
  amount: z.number().min(1000, "Minimum 1,000 NGN"),
  email: z.string().email(),
  corridorId: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = initializeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { amount, email, corridorId } = parsed.data;

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * 100,
          email,
          metadata: { corridorId },
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/callback`,
        }),
      }
    );

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json(
        { error: data.message || "Paystack init failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Payment initialization failed" },
      { status: 500 }
    );
  }
}
