"use client";

import { useState } from "react";
import { SendCorridor } from "./SendCorridor";
import { CorridorTracker } from "./CorridorTracker";
import { AgentDashboard } from "./AgentDashboard";
import { Header } from "./Header";

type Tab = "send" | "track" | "agent";

export function CorridorApp() {
  const [tab, setTab] = useState<Tab>("send");

  return (
    <div className="min-h-screen bg-page-canvas">
      <Header />

      <main className="mx-auto max-w-[1280px] px-[28px]">
        {/* Section heading */}
        <div className="pt-[60px]">
          <div className="mb-[4px] h-[4px] w-[80px] bg-accent" />
          <h2 className="text-[31px] font-[450] leading-[1.5] tracking-[0.04em] uppercase text-platinum">
            {tab === "send"
              ? "Send Money"
              : tab === "track"
              ? "Track Corridor"
              : "Agent Network"}
          </h2>
          <p className="mt-[4px] text-[14px] tracking-[0.04em] text-ash">
            {tab === "send"
              ? "Nigeria → Bolivia via Stellar USDC"
              : tab === "track"
              ? "Real-time corridor status"
              : "P2P agent collateral & reputation"}
          </p>
        </div>

        {/* Tab navigation */}
        <nav className="mt-[28px] flex border border-platinum/20">
          {([
            ["send", "SEND"],
            ["track", "TRACK"],
            ["agent", "AGENTS"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 border-r border-platinum/10 px-[16px] py-[12px] text-[14px] uppercase tracking-[0.04em] transition-colors last:border-r-0 ${
                tab === key
                  ? "bg-platinum text-page-canvas"
                  : "bg-transparent text-platinum hover:bg-deep-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="pb-[80px]">
          {tab === "send" && <SendCorridor onCreated={() => setTab("track")} />}
          {tab === "track" && <CorridorTracker />}
          {tab === "agent" && <AgentDashboard />}
        </div>
      </main>
    </div>
  );
}
