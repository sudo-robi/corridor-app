import { NextResponse } from "next/server";

export async function GET() {
  try {
    // CoinGecko free API: get USDC in USD, then NGN/USD and BOB/USD separately
    const [usdcRes, ngnRes, bobRes] = await Promise.all([
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd",
        { next: { revalidate: 120 } }
      ),
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn",
        { next: { revalidate: 120 } }
      ),
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=bob",
        { next: { revalidate: 120 } }
      ),
    ]);

    const usdcData = usdcRes.ok ? await usdcRes.json() : null;
    const ngnData = ngnRes.ok ? await ngnRes.json() : null;
    const bobData = bobRes.ok ? await bobRes.json() : null;

    // USDC ≈ $1, NGN per USD from USDT, BOB per USD from USDT
    const ngnPerUsd = ngnData?.tether?.ngn || 1600;
    const bobPerUsd = bobData?.tether?.bob || 6.9;

    const ngnToBob = bobPerUsd / ngnPerUsd;

    return NextResponse.json({
      rate: ngnToBob,
      ngnPerUsd,
      bobPerUsd,
      source: usdcData ? "coingecko" : "fallback",
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { rate: 0.0042, ngnPerUsd: 1600, bobPerUsd: 6.9, source: "fallback", timestamp: Date.now() },
      { status: 200 }
    );
  }
}
