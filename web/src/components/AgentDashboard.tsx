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
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-white/20" />
        <p className="mt-4 text-sm text-white/40">Loading agent network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Users className="h-3 w-3" />
            Active Agents
          </div>
          <p className="mt-2 text-2xl font-bold">{agents.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <TrendingUp className="h-3 w-3" />
            Completed
          </div>
          <p className="mt-2 text-2xl font-bold">{totalCompleted}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Coins className="h-3 w-3" />
            Collateral
          </div>
          <p className="mt-2 text-2xl font-bold">
            ${totalCollateral.toLocaleString()}
          </p>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <Shield className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm text-white/40">No agents registered yet</p>
          <p className="mt-1 text-xs text-white/30">
            Agents register by posting USDC collateral on-chain
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-5 py-3">
            <h3 className="font-medium">Agent Network</h3>
          </div>
          <div className="divide-y divide-white/5">
            {agents.map((a) => (
              <div
                key={a.address}
                className="px-5 py-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        a.reputation >= 200
                          ? "bg-corridor-500/20 text-corridor-400"
                          : a.reputation >= 100
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {a.address.slice(0, 6)}...{a.address.slice(-4)}
                      </p>
                      <p className="text-xs text-white/40">
                        Rep: {a.reputation} · {a.supportedSide} ·{" "}
                        {(a.rateBps / 100).toFixed(1)}% fee
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {a.activeCorridors}/{a.maxCorridors} active
                    </p>
                    <p className="text-xs text-white/40">
                      ${a.collateral.toLocaleString()} collateral
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCorridors.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-medium">Active Corridors</h3>
          <div className="mt-4 space-y-3">
            {activeCorridors.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="h-4 w-4 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium">
                      ₦{tx.amountSend.toLocaleString()} → Bs{" "}
                      {tx.amountReceive.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/40">
                      #{tx.id} · {tx.status} ·{" "}
                      {new Date(tx.createdAt * 1000).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleComplete(tx.id)}
                  className="flex items-center gap-1 rounded-md bg-corridor-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-corridor-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {corridors.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-medium">Recent Activity</h3>
          <div className="mt-4 space-y-3">
            {corridors.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {tx.status === "completed" ? (
                    <ArrowDownRight className="h-4 w-4 text-corridor-400" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-yellow-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      ₦{tx.amountSend.toLocaleString()} → Bs{" "}
                      {tx.amountReceive.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/40">
                      #{tx.id} ·{" "}
                      {new Date(tx.createdAt * 1000).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs ${
                    tx.status === "completed"
                      ? "text-corridor-400"
                      : tx.status === "timeout"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {tx.status === "completed"
                    ? "Settled"
                    : tx.status === "timeout"
                    ? "Timed Out"
                    : "In Progress"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
