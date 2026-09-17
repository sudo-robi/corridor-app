"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  User,
  RefreshCw,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, type Corridor } from "@/types";

export function CorridorTracker() {
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCorridors = useCallback(async () => {
    try {
      const res = await fetch("/api/corridors");
      const data = await res.json();
      setCorridors(data.corridors || []);
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCorridors();
    const interval = setInterval(fetchCorridors, 10000);
    return () => clearInterval(interval);
  }, [fetchCorridors]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-white/20" />
        <p className="mt-4 text-sm text-white/40">Loading corridors...</p>
      </div>
    );
  }

  if (corridors.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <Clock className="mx-auto h-12 w-12 text-white/20" />
        <p className="mt-4 text-white/40">No corridors yet</p>
        <p className="mt-1 text-sm text-white/30">
          Send your first corridor to see it tracked here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">
          {corridors.length} corridor{corridors.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={fetchCorridors}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {corridors.map((corridor) => (
        <div
          key={corridor.id}
          className="rounded-xl border border-white/10 bg-white/5 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nigeria-green/20 text-sm font-bold text-nigeria-green">
                NG
              </div>
              <ArrowRight className="h-4 w-4 text-white/30" />
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bolivia-red/20 text-sm font-bold text-bolivia-red">
                BO
              </div>
              <div className="ml-2">
                <p className="font-medium">
                  ₦{corridor.amountSend.toLocaleString()} → Bs{" "}
                  {corridor.amountReceive.toLocaleString()}
                </p>
                <p className="text-xs text-white/40">
                  #{corridor.id} · {corridor.receiverPhone}
                </p>
              </div>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                STATUS_COLORS[corridor.status as keyof typeof STATUS_COLORS]
              }`}
            >
              {STATUS_LABELS[corridor.status as keyof typeof STATUS_LABELS] || corridor.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1">
            {(["created", "accepted", "local_paid", "remote_paid", "completed"] as const).map(
              (s, i) => {
                const statusOrder = [
                  "created",
                  "accepted",
                  "local_paid",
                  "remote_paid",
                  "completed",
                ];
                const currentIdx = statusOrder.indexOf(corridor.status as any);
                const isDone =
                  corridor.status === "completed"
                    ? true
                    : corridor.status === "timeout"
                    ? false
                    : i <= currentIdx;
                const isCurrent =
                  corridor.status !== "completed" &&
                  corridor.status !== "timeout" &&
                  i === currentIdx;

                return (
                  <div key={s} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-2 w-full rounded-full ${
                        isDone
                          ? "bg-corridor-500"
                          : isCurrent
                          ? "bg-corridor-500/50 animate-pulse"
                          : "bg-white/10"
                      }`}
                    />
                    <span
                      className={`text-[9px] ${
                        isDone ? "text-corridor-400" : "text-white/30"
                      }`}
                    >
                      {s === "created"
                        ? "Created"
                        : s === "accepted"
                        ? "Matched"
                        : s === "local_paid"
                        ? "NGN Paid"
                        : s === "remote_paid"
                        ? "BOB Sent"
                        : "Settled"}
                    </span>
                  </div>
                );
              }
            )}
          </div>

          {corridor.agent && (
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
              <User className="h-3 w-3" />
              Agent: {corridor.agent.slice(0, 8)}...{corridor.agent.slice(-4)}
              <span className="text-corridor-400">
                · {(corridor.feeBps / 100).toFixed(1)}% fee
              </span>
            </div>
          )}

          {corridor.status === "completed" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-corridor-400">
              <CheckCircle2 className="h-4 w-4" />
              Completed — funds delivered to Bolivia
            </div>
          )}

          {corridor.status === "timeout" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <XCircle className="h-4 w-4" />
              Timed out — refund initiated
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
