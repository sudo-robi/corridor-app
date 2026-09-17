"use client";

import { ArrowRightLeft, Shield, Wallet } from "lucide-react";
import { useWallet } from "./WalletProvider";

export function Header() {
  const { address, connected, connect, disconnect, balance } = useWallet();

  return (
    <header className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-corridor-500/10 px-3 py-1 text-xs text-corridor-400">
        <Shield className="h-3 w-3" />
        Non-custodial · Stellar USDC
      </div>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">
        <span className="text-nigeria-green">Nigeria</span>
        <ArrowRightLeft className="mx-3 inline h-8 w-8 text-corridor-400" />
        <span className="text-bolivia-red">Bolivia</span>
      </h1>
      <p className="mt-2 text-lg text-white/60">
        Two parallel-FX economies meeting at a USDC midpoint
      </p>
      <p className="mt-1 text-sm text-white/40">
        Send money from Lagos to La Paz in minutes — not days. Powered by
        Pollar + Stellar.
      </p>

      <div className="mt-4 flex justify-center">
        {connected ? (
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
            <Wallet className="h-4 w-4 text-corridor-400" />
            {connected && address && (
              <>
                <span className="text-sm">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                {balance !== null && (
                  <span className="text-xs text-corridor-400">
                    {parseFloat(balance).toFixed(2)} USDC
                  </span>
                )}
              </>
            )}
            <button
              onClick={disconnect}
              className="text-xs text-white/40 hover:text-white"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            className="rounded-lg bg-corridor-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-corridor-700"
          >
            <Wallet className="mr-2 inline h-4 w-4" />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
