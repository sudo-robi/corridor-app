"use client";

import { useState, useEffect } from "react";
import { Send, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useWallet } from "./WalletProvider";
import type { Corridor } from "@/types";

interface Props {
  onCreated: (corridor: Corridor) => void;
}

interface ExchangeRate {
  rate: number;
  ngnPerUsd: number;
  bobPerUsd: number;
  source: string;
}

export function SendCorridor({ onCreated }: Props) {
  const { connected, address } = useWallet();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "creating" | "done">("form");
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [corridorCount, setCorridorCount] = useState(0);

  const FEE_BPS = 100;

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then(setExchangeRate)
      .catch(() => setExchangeRate({ rate: 0.0042, ngnPerUsd: 1600, bobPerUsd: 6.9, source: "fallback" }));
  }, []);

  const amountNgn = parseInt(amount) || 0;
  const rate = exchangeRate?.rate || 0.0042;

  const computeQuote = (n: number) => {
    const fee = Math.floor((n * FEE_BPS) / 10_000);
    const afterFee = n - fee;
    const bobAmount = Math.floor(afterFee * rate);
    return { sendAmount: n, receiveAmount: bobAmount, feeBps: FEE_BPS, exchangeRate: rate };
  };

  const quote = amountNgn >= 1000 ? computeQuote(amountNgn) : null;

  // Explicit order of operations:
  //   1. Corridor workflow API creates the corridor record
  //   2. Corridor workflow API matches an agent (accept)
  //   3. Paystack initialization starts the NGN payment for that corridor
  // Payment can never start without a corridor, and the corridor id
  // travels in the Paystack metadata so the webhook can close the loop.
  const handleCreate = async () => {
    if (!quote || !phone) return;
    if (connected && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email for the Paystack receipt.");
      return;
    }
    setStep("creating");
    setLoading(true);
    setError(null);

    try {
      const corridorId = Date.now() * 100 + corridorCount;
      setCorridorCount((c) => c + 1);
      const now = Math.floor(Date.now() / 1000);

      const res = await fetch("/api/corridors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: corridorId,
          sender: address || "",
          receiverPhone: phone,
          amountSend: quote.sendAmount,
          amountReceive: quote.receiveAmount,
          status: "created",
          createdAt: now,
          expiresAt: now + 300,
          feeBps: quote.feeBps,
        }),
      });

      if (!res.ok) throw new Error("Failed to create corridor");

      const { corridor } = await res.json();

      try {
        const acceptRes = await fetch("/api/corridors/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ corridorId: corridor.id }),
        });
        if (acceptRes.ok) {
          const { corridor: accepted } = await acceptRes.json();
          Object.assign(corridor, accepted);
        }
      } catch {
        // Agent acceptance failed. Corridor stays in "created".
      }

      if (connected && address) {
        try {
          const paystackRes = await fetch("/api/paystack/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: amountNgn,
              email,
              corridorId: String(corridorId),
            }),
          });

          if (paystackRes.ok) {
            const { authorization_url } = await paystackRes.json();
            if (authorization_url) {
              window.open(authorization_url, "_blank");
            }
          } else {
            const errBody = await paystackRes.json().catch(() => null);
            console.warn("Paystack init failed:", errBody?.error);
          }
        } catch (e) {
          console.warn("Paystack init failed, corridor created without payment:", e);
        }
      }

      setStep("done");
      setTimeout(() => {
        onCreated(corridor);
        setStep("form");
        setAmount("");
        setPhone("");
        setEmail("");
      }, 800);
    } catch (e: any) {
      setError(e.message || "Failed to create corridor");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-[28px] border border-platinum/10 bg-deep-surface">
      {error && (
        <div className="border-b border-accent/30 bg-accent/10 px-[21px] py-[12px] text-[14px] tracking-[0.04em] text-accent">
          {error}
        </div>
      )}

      {exchangeRate && (
        <div className="border-b border-platinum/10 px-[21px] py-[8px] text-[11px] tracking-[0.042em] text-ash">
          RATE 1 NGN ≈ {rate.toFixed(6)} BOB · SRC {exchangeRate.source.toUpperCase()}
        </div>
      )}

      {step === "form" && (
        <div className="p-[21px]">
          <div className="grid grid-cols-2 gap-[16px]">
            <div>
              <label className="mb-[4px] block text-[11px] uppercase tracking-[0.042em] text-ash">
                Amount (NGN)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50,000"
                min="1000"
                className="w-full border border-platinum/20 bg-iron px-[18px] py-[14px] text-[14px] tracking-[0.04em] text-platinum placeholder:text-ash focus:border-platinum focus:outline-none"
                style={{ borderRadius: "7px" }}
              />
              {amountNgn > 0 && amountNgn < 1000 && (
                <p className="mt-[4px] text-[11px] tracking-[0.042em] text-accent">
                  MIN 1,000 NGN
                </p>
              )}
            </div>
            <div>
              <label className="mb-[4px] block text-[11px] uppercase tracking-[0.042em] text-ash">
                Receiver Phone (Bolivia)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+591 7000 0000"
                className="w-full border border-platinum/20 bg-iron px-[18px] py-[14px] text-[14px] tracking-[0.04em] text-platinum placeholder:text-ash focus:border-platinum focus:outline-none"
                style={{ borderRadius: "7px" }}
              />
            </div>
          </div>

          <div className="mt-[16px]">
            <label className="mb-[4px] block text-[11px] uppercase tracking-[0.042em] text-ash">
              Email (Paystack receipt)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-platinum/20 bg-iron px-[18px] py-[14px] text-[14px] tracking-[0.04em] text-platinum placeholder:text-ash focus:border-platinum focus:outline-none"
              style={{ borderRadius: "7px" }}
            />
          </div>

          {quote && (
            <div className="mt-[16px] border border-platinum/10 bg-void p-[21px]">
              <div className="flex items-center justify-between text-[14px] tracking-[0.04em]">
                <span className="text-ash">YOU SEND</span>
                <span className="font-[450] text-platinum">
                  ₦{quote.sendAmount.toLocaleString()}
                </span>
              </div>
              <div className="my-[12px] flex items-center gap-[8px] text-platinum/20">
                <div className="h-px flex-1 bg-platinum/10" />
                <ArrowRight className="h-[14px] w-[14px]" />
                <div className="h-px flex-1 bg-platinum/10" />
              </div>
              <div className="flex items-center justify-between text-[14px] tracking-[0.04em]">
                <span className="text-ash">THEY GET</span>
                <span className="font-[450] text-accent">
                  Bs {quote.receiveAmount.toLocaleString()}
                </span>
              </div>
              <div className="mt-[12px] flex items-center justify-between text-[11px] tracking-[0.042em] text-ash">
                <span>FEE {(quote.feeBps / 100).toFixed(1)}%</span>
                <span>~2-5 MIN</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep("confirm")}
            disabled={!quote || !phone || amountNgn < 1000}
            className="mt-[16px] w-full border border-platinum bg-transparent px-[24px] py-[11px] text-[14px] uppercase tracking-[0.04em] text-platinum transition-colors hover:bg-platinum hover:text-page-canvas disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-platinum"
          >
            <Send className="mr-[6px] inline h-[14px] w-[14px]" />
            Review Corridor
          </button>
        </div>
      )}

      {step === "confirm" && quote && (
        <div className="p-[21px]">
          <div className="border border-platinum/10 bg-void p-[21px]">
            <div className="space-y-[8px]">
              {[
                ["AMOUNT", `₦${quote.sendAmount.toLocaleString()}`],
                ["RECEIVER", phone],
                ["EMAIL", email || "not provided"],
                ["THEY GET", `Bs ${quote.receiveAmount.toLocaleString()}`],
                ["SETTLE", "Stellar USDC"],
                ["TIME", "~2-5 min"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-[14px] tracking-[0.04em]">
                  <span className="text-ash">{label}</span>
                  <span className={label === "THEY GET" ? "text-accent" : "text-platinum"}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {!connected && (
              <div className="mt-[12px] border border-accent/30 bg-accent/10 px-[12px] py-[8px] text-[11px] tracking-[0.042em] text-accent">
                WALLET NOT CONNECTED. COMPLETE PAYMENT MANUALLY.
              </div>
            )}
          </div>

          <div className="mt-[16px] flex gap-[8px]">
            <button
              onClick={() => setStep("form")}
              className="flex-1 border border-platinum/30 bg-transparent px-[24px] py-[11px] text-[14px] uppercase tracking-[0.04em] text-platinum/60 transition-colors hover:border-platinum hover:text-platinum"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 border border-platinum bg-platinum px-[24px] py-[11px] text-[14px] uppercase tracking-[0.04em] text-page-canvas transition-colors hover:bg-transparent hover:text-platinum disabled:opacity-30"
            >
              {loading ? (
                <Loader2 className="mr-[6px] inline h-[14px] w-[14px] animate-spin" />
              ) : (
                <Send className="mr-[6px] inline h-[14px] w-[14px]" />
              )}
              Create Corridor
            </button>
          </div>
        </div>
      )}

      {(step === "creating" || step === "done") && (
        <div className="flex flex-col items-center gap-[12px] py-[60px]">
          {step === "creating" ? (
            <Loader2 className="h-[24px] w-[24px] animate-spin text-platinum" />
          ) : (
            <CheckCircle2 className="h-[24px] w-[24px] text-accent" />
          )}
          <p className="text-[11px] uppercase tracking-[0.042em] text-ash">
            {step === "creating" ? "Creating corridor..." : "Corridor created"}
          </p>
        </div>
      )}
    </div>
  );
}
