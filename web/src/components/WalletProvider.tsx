"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import * as SorobanClient from "@stellar/stellar-sdk";

interface WalletContextType {
  address: string | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSubmit: (tx: SorobanClient.Transaction) => Promise<string>;
  balance: string | null;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  connect: async () => {},
  disconnect: () => {},
  signAndSubmit: async () => "",
  balance: null,
  refreshBalance: async () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  const connect = async () => {
    if (typeof window === "undefined") return;

    const freighter = (window as any).freighter;
    if (!freighter) {
      console.warn("Freighter wallet not installed");
      return;
    }

    try {
      const addr = await freighter.getAddress();
      setAddress(addr);
      setConnected(true);
      await refreshBalanceFor(addr);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setConnected(false);
    setBalance(null);
  };

  const refreshBalanceFor = async (addr: string) => {
    try {
      const network =
        process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
          ? SorobanClient.Networks.PUBLIC
          : SorobanClient.Networks.TESTNET;

      const server = new SorobanClient.Horizon.Server(
        process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org"
      );

      const account = await server.loadAccount(addr);
      const usdcBalance = account.balances.find(
        (b: any) => b.asset_code === "USDC"
      );
      setBalance(usdcBalance ? usdcBalance.balance : "0");
    } catch {
      setBalance("0");
    }
  };

  const refreshBalance = async () => {
    if (address) await refreshBalanceFor(address);
  };

  const signAndSubmit = async (tx: SorobanClient.Transaction): Promise<string> => {
    const freighter = (window as any).freighter;
    if (!freighter) throw new Error("Freighter not installed");

    const signedXdr = await freighter.signTransaction(tx.toXDR(), {
      network:
        process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
          ? SorobanClient.Networks.PUBLIC
          : SorobanClient.Networks.TESTNET,
    });

    const server = new SorobanClient.Horizon.Server(
      process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org"
    );

    const result = await server.submitTransaction(
      SorobanClient.TransactionBuilder.fromXDR(
        signedXdr,
        process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
          ? SorobanClient.Networks.PUBLIC
          : SorobanClient.Networks.TESTNET
      )
    );

    return result.hash;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const checkFreighter = async () => {
      const freighter = (window as any).freighter;
      if (!freighter) return;

      try {
        const isConnected = await freighter.isConnected();
        if (isConnected && !cancelled) {
          await connect();
        }
      } catch {
        // Freighter not ready
      }
    };

    checkFreighter();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, connected, connect, disconnect, signAndSubmit, balance, refreshBalance }}
    >
      {children}
    </WalletContext.Provider>
  );
}
