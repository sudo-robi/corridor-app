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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Header />

      <nav className="mt-8 flex gap-1 rounded-lg bg-white/5 p-1">
        {([
          ["send", "Send Money"],
          ["track", "Track Corridor"],
          ["agent", "Agent Dashboard"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-corridor-600 text-white"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "send" && <SendCorridor onCreated={() => setTab("track")} />}
        {tab === "track" && <CorridorTracker />}
        {tab === "agent" && <AgentDashboard />}
      </div>
    </div>
  );
}
