"use client";

import { ArrowRightLeft, Shield, Wallet } from "lucide-react";
import { useWallet } from "./WalletProvider";

export function Header() {
  const { address, connected, connect, disconnect, balance } = useWallet();

  return (
    <header className="border-b border-platinum/10">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-[28px] py-[16px]">
        <div className="flex items-center gap-[18px]">
          <span className="text-[14px] tracking-[0.04em] text-platinum/60 uppercase">
            Corridor
          </span>
        </div>

        <div className="flex items-center gap-[8px]">
          <ArrowRightLeft className="h-[18px] w-[18px] text-accent" />
          <h1 className="text-[24px] font-[450] tracking-[0.04em] uppercase text-platinum">
            <span className="text-[#008751]">NG</span>
            <span className="mx-[6px] text-[14px] text-platinum/40">→</span>
            <span className="text-[#d52b1e]">BO</span>
          </h1>
        </div>

        <div className="flex items-center gap-[18px]">
          {connected && address ? (
            <div className="flex items-center gap-[12px]">
              <span className="font-[var(--font-mono)] text-[11px] tracking-[0.042em] text-ash">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              {balance !== null && (
                <span className="text-[11px] tracking-[0.042em] text-accent">
                  {parseFloat(balance).toFixed(2)} USDC
                </span>
              )}
              <button
                onClick={disconnect}
                className="border border-platinum/30 bg-transparent px-[12px] py-[4px] text-[11px] uppercase tracking-[0.042em] text-platinum transition-colors hover:bg-platinum hover:text-page-canvas"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              className="border border-platinum bg-transparent px-[16px] py-[7px] text-[14px] uppercase tracking-[0.04em] text-platinum transition-colors hover:bg-platinum hover:text-page-canvas"
            >
              <Wallet className="mr-[6px] inline h-[14px] w-[14px]" />
              Connect
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
