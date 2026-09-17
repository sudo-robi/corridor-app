"use client";

import { useState, useEffect } from "react";
import { Send, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useWallet } from "./WalletProvider";

interface Props {
  onCreated: (corridor: any) => void;
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

  const handleCreate = async () => {
    if (!quote || !phone) return;
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

      // Auto-accept corridor (simulate agent matching)
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
        // Agent acceptance failed — corridor stays in "created"
      }

      if (connected && address) {
        try {
          const paystackRes = await fetch("/api/paystack/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: amountNgn,
              email: `${address}@corridor.app`,
              corridorId: String(corridorId),
            }),
          });

          if (paystackRes.ok) {
            const { authorization_url } = await paystackRes.json();
            if (authorization_url) {
              window.open(authorization_url, "_blank");
            }
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
      }, 800);
    } catch (e: any) {
      setError(e.message || "Failed to create corridor");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold">Send Money to Bolivia</h2>
      <p className="mt-1 text-sm text-white/50">
        Enter the amount in NGN and a Bolivian phone number
      </p>

      {exchangeRate && (
        <div className="mt-2 flex items-center gap-2 text-xs text-white/30">
          <span>Rate: 1 NGN ≈ {rate.toFixed(6)} BOB</span>
          <span>·</span>
          <span>Source: {exchangeRate.source}</span>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === "form" && (
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm text-white/60 mb-1.5">
              Amount (NGN)
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50,000"
              min="1000"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-lg text-white placeholder:text-white/30 focus:border-corridor-500 focus:outline-none focus:ring-1 focus:ring-corridor-500"
            />
            {amountNgn > 0 && amountNgn < 1000 && (
              <p className="mt-1 text-xs text-red-400">Minimum 1,000 NGN</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm text-white/60 mb-1.5">
              Receiver Phone (Bolivia)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+591 7000 0000"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-corridor-500 focus:outline-none focus:ring-1 focus:ring-corridor-500"
            />
          </div>

          {quote && (
            <div className="rounded-lg border border-corridor-500/20 bg-corridor-500/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">You send</span>
                <span className="font-medium">
                  ₦{quote.sendAmount.toLocaleString()}
                </span>
              </div>
              <div className="my-2 flex items-center gap-2 text-white/30">
                <div className="h-px flex-1 bg-white/10" />
                <ArrowRight className="h-4 w-4" />
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Receiver gets</span>
                <span className="font-medium text-corridor-400">
                  Bs {quote.receiveAmount.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-white/40">
                <span>Agent fee: {(quote.feeBps / 100).toFixed(1)}%</span>
                <span>Settlement: ~2-5 min</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep("confirm")}
            disabled={!quote || !phone || amountNgn < 1000}
            className="w-full rounded-lg bg-corridor-600 px-4 py-3 font-medium text-white transition-colors hover:bg-corridor-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="mr-2 inline h-4 w-4" />
            Review Corridor
          </button>
        </div>
      )}

      {step === "confirm" && quote && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Amount</span>
              <span>₦{quote.sendAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Receiver</span>
              <span>{phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">They receive</span>
              <span className="text-corridor-400">
                Bs {quote.receiveAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Settlement</span>
              <span>Stellar USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Time</span>
              <span>~2-5 minutes</span>
            </div>
            {!connected && (
              <div className="mt-2 rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                Wallet not connected. Corridor will be created but payment must be completed manually.
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("form")}
              className="flex-1 rounded-lg border border-white/10 px-4 py-3 font-medium text-white/60 transition-colors hover:bg-white/5"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 rounded-lg bg-corridor-600 px-4 py-3 font-medium text-white transition-colors hover:bg-corridor-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 inline h-4 w-4" />
              )}
              Create Corridor
            </button>
          </div>
        </div>
      )}

      {(step === "creating" || step === "done") && (
        <div className="mt-6 flex flex-col items-center gap-3 py-8">
          {step === "creating" ? (
            <Loader2 className="h-8 w-8 animate-spin text-corridor-400" />
          ) : (
            <CheckCircle2 className="h-8 w-8 text-corridor-400" />
          )}
          <p className="text-sm text-white/60">
            {step === "creating"
              ? "Creating corridor on Stellar..."
              : "Corridor created! Tracking..."}
          </p>
        </div>
      )}
    </div>
  );
}
