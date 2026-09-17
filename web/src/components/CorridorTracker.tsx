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
      <div className="mt-[28px] border border-platinum/10 bg-deep-surface py-[60px] text-center">
        <RefreshCw className="mx-auto h-[18px] w-[18px] animate-spin text-ash" />
        <p className="mt-[12px] text-[11px] uppercase tracking-[0.042em] text-ash">
          Loading...
        </p>
      </div>
    );
  }

  if (corridors.length === 0) {
    return (
      <div className="mt-[28px] border border-platinum/10 bg-deep-surface py-[60px] text-center">
        <Clock className="mx-auto h-[24px] w-[24px] text-platinum/20" />
        <p className="mt-[12px] text-[14px] tracking-[0.04em] text-ash">
          No corridors yet
        </p>
        <p className="mt-[4px] text-[11px] tracking-[0.042em] text-ash/60">
          Send your first corridor to see it tracked here
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[28px]">
      <div className="mb-[12px] flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.042em] text-ash">
          {corridors.length} corridor{corridors.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={fetchCorridors}
          className="flex items-center gap-[4px] text-[11px] uppercase tracking-[0.042em] text-ash hover:text-platinum"
        >
          <RefreshCw className="h-[11px] w-[11px]" />
          Refresh
        </button>
      </div>

      <div className="space-y-[4px]">
        {corridors.map((corridor) => (
          <div
            key={corridor.id}
            className="border border-platinum/10 bg-deep-surface p-[21px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[12px]">
                <span className="text-[14px] font-[450] tracking-[0.04em] text-[#008751]">
                  NG
                </span>
                <ArrowRight className="h-[11px] w-[11px] text-platinum/30" />
                <span className="text-[14px] font-[450] tracking-[0.04em] text-[#d52b1e]">
                  BO
                </span>
                <div className="ml-[8px]">
                  <p className="text-[14px] tracking-[0.04em] text-platinum">
                    ₦{corridor.amountSend.toLocaleString()} → Bs{" "}
                    {corridor.amountReceive.toLocaleString()}
                  </p>
                  <p className="font-[var(--font-mono)] text-[11px] tracking-[0.042em] text-ash">
                    #{corridor.id} · {corridor.receiverPhone}
                  </p>
                </div>
              </div>

              <span
                className={`border px-[12px] py-[4px] text-[11px] uppercase tracking-[0.042em] ${
                  STATUS_COLORS[corridor.status as keyof typeof STATUS_COLORS]
                }`}
                style={{ borderRadius: "0px" }}
              >
                {STATUS_LABELS[corridor.status as keyof typeof STATUS_LABELS] || corridor.status}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-[16px] grid grid-cols-5 gap-[4px]">
              {(["created", "accepted", "local_paid", "remote_paid", "completed"] as const).map(
                (s, i) => {
                  const statusOrder = ["created", "accepted", "local_paid", "remote_paid", "completed"];
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
                    <div key={s} className="flex flex-col items-center gap-[4px]">
                      <div
                        className={`h-[2px] w-full ${
                          isDone
                            ? "bg-platinum"
                            : isCurrent
                            ? "bg-platinum/40"
                            : "bg-platinum/10"
                        }`}
                      />
                      <span
                        className={`text-[9px] uppercase tracking-[0.042em] ${
                          isDone ? "text-platinum" : "text-ash/40"
                        }`}
                      >
                        {s === "created"
                          ? "Init"
                          : s === "accepted"
                          ? "Match"
                          : s === "local_paid"
                          ? "NGN"
                          : s === "remote_paid"
                          ? "BOB"
                          : "Done"}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            {corridor.agent && (
              <div className="mt-[12px] flex items-center gap-[8px] text-[11px] tracking-[0.042em] text-ash">
                <User className="h-[11px] w-[11px]" />
                <span className="font-[var(--font-mono)]">
                  {corridor.agent.slice(0, 6)}...{corridor.agent.slice(-4)}
                </span>
                <span className="text-accent">
                  · {(corridor.feeBps / 100).toFixed(1)}%
                </span>
              </div>
            )}

            {corridor.paystackRef && (
              <div className="mt-[12px] font-mono text-[11px] tracking-[0.042em] text-ash">
                FIAT CONFIRMED · {corridor.paystackRef}
              </div>
            )}

            {corridor.status === "completed" && (
              <div className="mt-[12px] flex items-center gap-[8px] text-[11px] uppercase tracking-[0.042em] text-accent">
                <CheckCircle2 className="h-[11px] w-[11px]" />
                Completed. Bs {corridor.amountReceive.toLocaleString()} to{" "}
                {corridor.receiverPhone} via BOB-QR
              </div>
            )}

            {corridor.status === "timeout" && (
              <div className="mt-[12px] flex items-center gap-[8px] text-[11px] uppercase tracking-[0.042em] text-accent">
                <XCircle className="h-[11px] w-[11px]" />
                Timed Out
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
