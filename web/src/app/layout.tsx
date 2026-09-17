import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "Corridor — Africa ↔ Latin America Payments",
  description:
    "Send money from Nigeria to Bolivia in minutes. Powered by Pollar + Stellar USDC. Non-custodial, agent-collateralized, near-zero fees.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#09090b] text-white antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
