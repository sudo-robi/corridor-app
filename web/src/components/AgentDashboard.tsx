"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  TrendingUp,
  Shield,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface Agent {
  address: string;
  reputation: number;
  activeCorridors: number;
  maxCorridors: number;
  collateral: number;
  rateBps: number;
  supportedSide: string;
  completedToday: number;
}

interface CorridorRecord {
  id: number;
  amountSend: number;
  amountReceive: number;
  status: string;
  createdAt: number;
  agent: string | null;
}

export function AgentDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [corridors, setCorridors] = useState<CorridorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, corridorsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/corridors"),
      ]);

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }

      if (corridorsRes.ok) {
        const data = await corridorsRes.json();
        setCorridors(data.corridors || []);
      }
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleComplete = async (corridorId: number) => {
    try {
      await fetch("/api/corridors/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corridorId }),
      });
      fetchData();
    } catch (e) {
      console.error("Failed to complete corridor:", e);
    }
  };

  const totalCollateral = agents.reduce((a, b) => a + b.collateral, 0);
  const totalCompleted = corridors.filter((c) => c.status === "completed").length;
  const activeCorridors = corridors.filter(
    (c) => c.status !== "completed" && c.status !== "timeout"
  );

  if (loading) {
    return (
      <div className="mt-[28px] border border-platinum/10 bg-deep-surface py-[60px] text-center">
        <RefreshCw className="mx-auto h-[18px] w-[18px] animate-spin text-ash" />
        <p className="mt-[12px] text-[11px] uppercase tracking-[0.042em] text-ash">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[28px] space-y-[4px]">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-[4px]">
        {[
          { icon: Users, label: "AGENTS", value: agents.length },
          { icon: TrendingUp, label: "COMPLETED", value: totalCompleted },
          { icon: Coins, label: "COLLATERAL", value: `$${totalCollateral.toLocaleString()}` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="border border-platinum/10 bg-deep-surface p-[21px]">
            <div className="flex items-center gap-[8px] text-[11px] uppercase tracking-[0.042em] text-ash">
              <Icon className="h-[11px] w-[11px]" />
              {label}
            </div>
            <p className="mt-[8px] text-[28px] font-[450] tracking-[0.013em] text-platinum">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Agent list */}
      {agents.length === 0 ? (
        <div className="border border-platinum/10 bg-deep-surface py-[40px] text-center">
          <Shield className="mx-auto h-[18px] w-[18px] text-platinum/20" />
          <p className="mt-[12px] text-[14px] tracking-[0.04em] text-ash">
            No agents registered
          </p>
        </div>
      ) : (
        <div className="border border-platinum/10 bg-deep-surface">
          <div className="border-b border-platinum/10 px-[21px] py-[12px] text-[11px] uppercase tracking-[0.042em] text-ash">
            Agent Network
          </div>
          <div className="divide-y divide-platinum/10">
            {agents.map((a) => (
              <div key={a.address} className="px-[21px] py-[16px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[12px]">
                    <div
                      className={`flex h-[28px] w-[28px] items-center justify-center ${
                        a.reputation >= 200
                          ? "bg-accent/20 text-accent"
                          : a.reputation >= 100
                          ? "bg-platinum/10 text-platinum"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      <Shield className="h-[14px] w-[14px]" />
                    </div>
                    <div>
                      <p className="font-[var(--font-mono)] text-[14px] tracking-[0.04em] text-platinum">
                        {a.address.slice(0, 6)}...{a.address.slice(-4)}
                      </p>
                      <p className="text-[11px] tracking-[0.042em] text-ash">
                        REP {a.reputation} · {a.supportedSide.toUpperCase()} ·{" "}
                        {(a.rateBps / 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] tracking-[0.04em] text-platinum">
                      {a.activeCorridors}/{a.maxCorridors}
                    </p>
                    <p className="text-[11px] tracking-[0.042em] text-ash">
                      ${a.collateral.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active corridors */}
      {activeCorridors.length > 0 && (
        <div className="border border-platinum/10 bg-deep-surface">
          <div className="border-b border-platinum/10 px-[21px] py-[12px] text-[11px] uppercase tracking-[0.042em] text-ash">
            Active Corridors
          </div>
          <div className="divide-y divide-platinum/10">
            {activeCorridors.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-[21px] py-[16px]">
                <div className="flex items-center gap-[12px]">
                  <ArrowUpRight className="h-[14px] w-[14px] text-ash" />
                  <div>
                    <p className="text-[14px] tracking-[0.04em] text-platinum">
                      ₦{tx.amountSend.toLocaleString()} → Bs{" "}
                      {tx.amountReceive.toLocaleString()}
                    </p>
                    <p className="font-[var(--font-mono)] text-[11px] tracking-[0.042em] text-ash">
                      #{tx.id} · {tx.status} ·{" "}
                      {new Date(tx.createdAt * 1000).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleComplete(tx.id)}
                  className="border border-platinum bg-transparent px-[12px] py-[4px] text-[11px] uppercase tracking-[0.042em] text-platinum transition-colors hover:bg-platinum hover:text-page-canvas"
                >
                  <CheckCircle2 className="mr-[4px] inline h-[11px] w-[11px]" />
                  Complete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {corridors.length > 0 && (
        <div className="border border-platinum/10 bg-deep-surface">
          <div className="border-b border-platinum/10 px-[21px] py-[12px] text-[11px] uppercase tracking-[0.042em] text-ash">
            Recent Activity
          </div>
          <div className="divide-y divide-platinum/10">
            {corridors.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-[21px] py-[16px]">
                <div className="flex items-center gap-[12px]">
                  {tx.status === "completed" ? (
                    <ArrowDownRight className="h-[14px] w-[14px] text-accent" />
                  ) : (
                    <ArrowUpRight className="h-[14px] w-[14px] text-ash" />
                  )}
                  <div>
                    <p className="text-[14px] tracking-[0.04em] text-platinum">
                      ₦{tx.amountSend.toLocaleString()} → Bs{" "}
                      {tx.amountReceive.toLocaleString()}
                    </p>
                    <p className="font-[var(--font-mono)] text-[11px] tracking-[0.042em] text-ash">
                      #{tx.id} · {new Date(tx.createdAt * 1000).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] uppercase tracking-[0.042em] ${
                    tx.status === "completed"
                      ? "text-accent"
                      : tx.status === "timeout"
                      ? "text-accent"
                      : "text-ash"
                  }`}
                >
                  {tx.status === "completed"
                    ? "Settled"
                    : tx.status === "timeout"
                    ? "Timed Out"
                    : "Active"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
