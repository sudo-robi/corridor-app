"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  isConnected,
  requestAccess,
  signTransaction as freighterSign,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

interface WalletContextType {
  address: string | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSubmit: (tx: StellarSdk.Transaction) => Promise<string>;
  balance: string | null;
  refreshBalance: () => Promise<void>;
  error: string | null;
  freighterMissing: boolean;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  connect: async () => {},
  disconnect: () => {},
  signAndSubmit: async () => "",
  balance: null,
  refreshBalance: async () => {},
  error: null,
  freighterMissing: false,
});

export function useWallet() {
  return useContext(WalletContext);
}

function networkPassphrase(): string {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? StellarSdk.Networks.PUBLIC
    : StellarSdk.Networks.TESTNET;
}

function horizonUrl(): string {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freighterMissing, setFreighterMissing] = useState(false);

  const connect = async () => {
    if (typeof window === "undefined") return;
    setError(null);
    setFreighterMissing(false);

    try {
      const status = await isConnected();
      if (!status.isConnected) {
        setFreighterMissing(true);
        setError("Freighter wallet not detected.");
        return;
      }

      const result = await requestAccess();
      if (result.error || !result.address) {
        setError("Connection request was rejected. Please approve in Freighter and try again.");
        return;
      }

      setAddress(result.address);
      setConnected(true);
      await refreshBalanceFor(result.address);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setError("Could not connect to Freighter. Please try again.");
    }
  };

  const disconnect = () => {
    setAddress(null);
    setConnected(false);
    setBalance(null);
    setError(null);
    setFreighterMissing(false);
  };

  const refreshBalanceFor = async (addr: string) => {
    try {
      const server = new StellarSdk.Horizon.Server(horizonUrl());
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

  const signAndSubmit = async (tx: StellarSdk.Transaction): Promise<string> => {
    const signed = await freighterSign(tx.toXDR(), {
      networkPassphrase: networkPassphrase(),
    });

    if (signed.error || !signed.signedTxXdr) {
      throw new Error("Freighter refused to sign the transaction.");
    }

    const server = new StellarSdk.Horizon.Server(horizonUrl());
    const result = await server.submitTransaction(
      StellarSdk.TransactionBuilder.fromXDR(
        signed.signedTxXdr,
        networkPassphrase()
      )
    );

    return result.hash;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const checkExisting = async () => {
      try {
        const status = await isConnected();
        if (!status.isConnected || cancelled) return;

        // Do not auto-popup on load. Only restore if the user
        // previously connected in this browser session.
        if (sessionStorage.getItem("corridor_wallet") === "connected") {
          await connect();
        }
      } catch {
        // Freighter not ready yet. User can click Connect manually.
      }
    };

    checkExisting();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (connected && address) {
      sessionStorage.setItem("corridor_wallet", "connected");
    } else {
      sessionStorage.removeItem("corridor_wallet");
    }
  }, [connected, address]);

  return (
    <WalletContext.Provider
      value={{ address, connected, connect, disconnect, signAndSubmit, balance, refreshBalance, error, freighterMissing }}
    >
      {children}
    </WalletContext.Provider>
  );
}
