"use client";

import { useEffect, useRef } from "react";
import { SendCorridor } from "./SendCorridor";
import { CorridorTracker } from "./CorridorTracker";
import { AgentDashboard } from "./AgentDashboard";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Story } from "./Story";

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <div className="mb-[4px] h-[4px] w-[80px] bg-accent" />
      <h3 className="text-[31px] font-[450] uppercase leading-[1.5] tracking-[0.04em] text-platinum">
        {title}
      </h3>
      <p className="mt-[4px] text-[14px] tracking-[0.04em] text-ash">{sub}</p>
    </div>
  );
}

export function CorridorApp() {
  const sendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).catch(() => {});
  }, []);

  const scrollToSend = () => {
    sendRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-page-canvas">
      <Header />
      <Hero onSend={scrollToSend} />
      <Story />

      <section className="border-b border-platinum/10">
        <div className="mx-auto max-w-[1280px] px-[28px] py-[60px]">
          <div ref={sendRef} className="scroll-mt-[20px]">
            <SectionHead title="Send Money" sub="Nigeria to Bolivia via Stellar USDC" />
          </div>
          <SendCorridor
            onCreated={() => {
              document
                .getElementById("track-section")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      </section>

      <section id="track-section" className="border-b border-platinum/10">
        <div className="mx-auto max-w-[1280px] px-[28px] py-[60px]">
          <SectionHead title="Live Tracking" sub="Every corridor, every state transition" />
          <CorridorTracker />
        </div>
      </section>

      <section className="border-b border-platinum/10">
        <div className="mx-auto max-w-[1280px] px-[28px] py-[60px]">
          <SectionHead title="Agent Network" sub="Collateral locked. Reputation earned." />
          <AgentDashboard />
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-[12px] px-[28px] py-[28px]">
        <span className="text-[11px] uppercase tracking-[0.042em] text-ash">
          Corridor · NG to BO · Stellar USDC
        </span>
        <span className="font-mono text-[11px] tracking-[0.042em] text-ash">
          Soroban escrow · Paystack NGN · Pollar BOB
        </span>
      </footer>
    </div>
  );
}
