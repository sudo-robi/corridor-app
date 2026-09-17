"use client";

const PROBLEMS = [
  {
    side: "NG",
    country: "Nigeria",
    color: "text-[#008751]",
    points: ["₦1,600+ per USD on the parallel market", "5 to 10% fees on legacy remittance rails", "3 to 5 day settlement for freelancers"],
  },
  {
    side: "BO",
    country: "Bolivia",
    color: "text-[#d52b1e]",
    points: ["Currency floated June 2026 after a 15 year peg", "Dollar scarcity with steep parallel premium", "QR first and mobile money first behavior"],
  },
];

const STEPS = [
  {
    n: "01",
    title: "Fund",
    body: "Pay NGN by bank transfer through Paystack. USDC credits to your Stellar wallet.",
  },
  {
    n: "02",
    title: "Match",
    body: "The Soroban escrow matches the best P2P agent by collateral, reputation, and rate.",
  },
  {
    n: "03",
    title: "Settle",
    body: "USDC moves on Stellar. The agent pays out BOB by QR or bank in Bolivia.",
  },
  {
    n: "04",
    title: "Done",
    body: "Corridor settles on chain. Agent reputation rises. Receipt in about 5 minutes.",
  },
];

export function Story() {
  return (
    <>
      <section className="border-b border-platinum/10">
        <div className="mx-auto max-w-[1280px] px-[28px] py-[60px]">
          <div className="mb-[4px] h-[4px] w-[80px] bg-accent" />
          <h3 className="text-[31px] font-[450] uppercase leading-[1.5] tracking-[0.04em] text-platinum">
            The Problem
          </h3>
          <div className="mt-[28px] grid grid-cols-2 gap-[4px] max-md:grid-cols-1">
            {PROBLEMS.map((p) => (
              <div key={p.side} className="border border-platinum/10 bg-deep-surface p-[21px]">
                <div className="flex items-baseline gap-[12px]">
                  <span className={`text-[35px] font-[500] ${p.color}`}>{p.side}</span>
                  <span className="text-[14px] uppercase tracking-[0.04em] text-platinum">
                    {p.country}
                  </span>
                </div>
                <ul className="mt-[16px] space-y-[8px]">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-[8px] text-[14px] tracking-[0.04em] text-platinum/80">
                      <span className="text-accent">▪</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-[16px] max-w-[640px] text-[14px] tracking-[0.04em] text-ash">
            No Western Union style rail serves this corridor. Corridor bridges it
            at about 1% with agents holding local float on both sides.
          </p>
        </div>
      </section>

      <section className="border-b border-platinum/10">
        <div className="mx-auto max-w-[1280px] px-[28px] py-[60px]">
          <div className="mb-[4px] h-[4px] w-[80px] bg-accent" />
          <h3 className="text-[31px] font-[450] uppercase leading-[1.5] tracking-[0.04em] text-platinum">
            How It Works
          </h3>
          <div className="mt-[28px] grid grid-cols-4 gap-[4px] max-md:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.n} className="border border-platinum/10 bg-deep-surface p-[21px]">
                <p className="font-mono text-[11px] tracking-[0.042em] text-accent">
                  {s.n}
                </p>
                <p className="mt-[8px] text-[18px] tracking-[0.017em] text-platinum">
                  {s.title}
                </p>
                <p className="mt-[8px] text-[14px] leading-[1.5] tracking-[0.04em] text-platinum/70">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
