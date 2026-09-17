"use client";

import { ArrowRightLeft, Shield, Wallet, AlertTriangle, ExternalLink } from "lucide-react";
import { useWallet, FREIGHTER_INSTALL_URL } from "./WalletProvider";

export function Header() {
  const { address, connected, connect, disconnect, balance, error, freighterMissing } = useWallet();

  return (
    <header className="border-b border-platinum/10">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-[12px] px-[28px] py-[16px]">
        <div className="flex items-center gap-[18px]">
          <span className="text-[14px] uppercase tracking-[0.04em] text-platinum/60">
            Corridor
          </span>
        </div>

        <div className="flex items-center gap-[8px]">
          <ArrowRightLeft className="h-[18px] w-[18px] text-accent" />
          <h1 className="text-[24px] font-[450] uppercase tracking-[0.04em] text-platinum">
            <span className="text-[#008751]">NG</span>
            <span className="mx-[6px] text-[14px] text-platinum/40">→</span>
            <span className="text-[#d52b1e]">BO</span>
          </h1>
        </div>

        <div className="flex flex-col items-end gap-[8px]">
          <div className="flex items-center gap-[18px]">
            {connected && address ? (
              <div className="flex items-center gap-[12px]">
                <span className="font-mono text-[11px] tracking-[0.042em] text-ash">
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

          {error && (
            <div className="flex items-center gap-[8px] border border-accent/40 bg-accent/10 px-[12px] py-[6px] text-[11px] uppercase tracking-[0.042em] text-accent">
              <AlertTriangle className="h-[11px] w-[11px] shrink-0" />
              <span>{error}</span>
              {freighterMissing && (
                <a
                  href={FREIGHTER_INSTALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-[4px] underline underline-offset-2 hover:no-underline"
                >
                  Install Freighter
                  <ExternalLink className="h-[11px] w-[11px]" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-[1280px] items-center gap-[8px] px-[28px] pb-[12px]">
        <Shield className="h-[11px] w-[11px] text-ash" />
        <span className="text-[11px] uppercase tracking-[0.042em] text-ash">
          Non-custodial · Stellar testnet · Freighter wallet required
        </span>
      </div>
    </header>
  );
}
