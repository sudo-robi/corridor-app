import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "Corridor: NG to BO Payments",
  description:
    "Send money from Nigeria to Bolivia via Stellar USDC. Non-custodial, agent-collateralized.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page-canvas text-platinum">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
