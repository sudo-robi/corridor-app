"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Activity } from "lucide-react";

interface Stats {
  corridors: {
    total: number;
    completed: number;
    active: number;
    volumeNgn: number;
    volumeBob: number;
    avgFeeBps: number;
  };
  agents: {
    total: number;
    totalCollateral: number;
    avgReputation: number;
  };
}

interface Rate {
  rate: number;
  ngnPerUsd: number;
  bobPerUsd: number;
  source: string;
}

export function Hero({ onSend }: { onSend: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rate, setRate] = useState<Rate | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch("/api/stats").then((x) => x.json()),
        fetch("/api/exchange-rate").then((x) => x.json()),
      ]);
      setStats(s);
      setRate(r);
    } catch {
      // keep previous
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const tiles = [
    {
      label: "MOVED",
      value: stats ? `₦${stats.corridors.volumeNgn.toLocaleString()}` : "—",
      sub: stats ? `Bs ${stats.corridors.volumeBob.toLocaleString()} delivered` : "loading",
    },
    {
      label: "CORRIDORS",
      value: stats ? String(stats.corridors.total) : "—",
      sub: stats ? `${stats.corridors.completed} settled` : "loading",
    },
    {
      label: "AGENTS",
      value: stats ? String(stats.agents.total) : "—",
      sub: stats ? `$${stats.agents.totalCollateral.toLocaleString()} locked` : "loading",
    },
    {
      label: "AVG FEE",
      value: stats ? `${(stats.corridors.avgFeeBps / 100).toFixed(1)}%` : "—",
      sub: "vs 5-10% legacy rails",
    },
  ];

  return (
    <section className="border-b border-platinum/10">
      <div className="mx-auto max-w-[1280px] px-[28px] pb-[40px] pt-[60px]">
        <div className="mb-[4px] h-[4px] w-[80px] bg-accent" />
        <h2 className="max-w-[900px] text-[64px] font-[450] leading-[0.95] tracking-[-0.01em] text-platinum max-md:text-[35px]">
          NIGERIA TO BOLIVIA IN MINUTES
        </h2>
        <p className="mt-[16px] max-w-[640px] text-[18px] leading-[1.5] tracking-[0.017em] text-platinum/80">
          Two parallel-FX economies meeting at a USDC midpoint on Stellar.
          Fund with NGN. Cash out BOB. Agents settle the last mile.
        </p>

        <div className="mt-[28px] flex flex-wrap items-center gap-[12px]">
          <button
            onClick={onSend}
            className="border border-platinum bg-platinum px-[24px] py-[11px] text-[14px] uppercase tracking-[0.04em] text-page-canvas transition-colors hover:bg-transparent hover:text-platinum"
          >
            Send Money
            <ArrowRight className="ml-[8px] inline h-[14px] w-[14px]" />
          </button>
          {rate && (
            <span className="flex items-center gap-[8px] border border-platinum/20 px-[16px] py-[11px] font-mono text-[11px] uppercase tracking-[0.042em] text-ash">
              <Activity className="h-[11px] w-[11px] text-accent" />
              1 NGN ≈ {rate.rate.toFixed(6)} BOB · {rate.source.toUpperCase()}
            </span>
          )}
        </div>

        <div className="mt-[40px] grid grid-cols-4 gap-[4px] max-md:grid-cols-2">
          {tiles.map((t) => (
            <div key={t.label} className="border border-platinum/10 bg-deep-surface p-[21px]">
              <p className="text-[11px] uppercase tracking-[0.042em] text-ash">
                {t.label}
              </p>
              <p className="mt-[8px] text-[31px] font-[450] leading-[1.2] tracking-[0.013em] text-platinum">
                {t.value}
              </p>
              <p className="mt-[4px] text-[11px] tracking-[0.042em] text-ash">
                {t.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
