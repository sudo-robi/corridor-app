# Corridor: Nigeria to Bolivia Payments

**Send money from Lagos to La Paz in minutes.**

Two parallel-FX economies meeting at a USDC midpoint on Stellar.

## What is this?

Corridor is a cross-border remittance app for the Africa ↔ Latin America corridor. A Nigerian freelancer gets paid by a Bolivian client. The money moves in minutes, not days. Local agents on both sides handle the cash in/out, collateralized on-chain with reputation that compounds.

## The Problem (Judges Category 1, 20 pts)

Nigeria and Bolivia share a parallel story: currency devaluation, parallel FX markets, and populations that treat dollars as a savings product rather than a payment instrument.

- **Nigeria**: Naira devaluation, 3-5 day bank transfers, 5-10% fees on international remittances, Western Union dominance with poor UX.
- **Bolivia**: Just floated its currency in June 2026 after abandoning a peg held since 2011. Dollars trade at a steep premium on the parallel market. QR and mobile-money-first behavior.
- **The corridor**: No Western Union-style rail dominates it. Existing options are slow, expensive, and require bank accounts that 40%+ of both populations don't have.

**Target personas:**
1. Nigerian freelancer receiving payment from Bolivian startup
2. Bolivian SME paying Nigerian contractor
3. Diaspora sending money home

## The Solution (Judges Category 2, 25 pts)

**Architecture:**

```
Nigeria (NGN)                    Stellar                     Bolivia (BOB)
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Paystack │───>│  Pollar  │───>│   USDC   │───>│  Pollar  │───>│ Stereum  │
│ Bank TX  │    │  Wallet  │    │ on-chain │    │  Wallet  │    │ QR/Bank  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                               │
                     └─────── Soroban Escrow ────────┘
                         (Agent collateral + reputation)
```

**How it works:**
1. Sender in Nigeria deposits NGN via Paystack bank transfer
2. USDC credited to sender's Pollar wallet on Stellar
3. Best agent matched by reputation/capacity/rate from Soroban escrow contract
4. Agent pays receiver in Bolivia via QR or bank transfer
5. Corridor settled on-chain, agent reputation increases

**Key innovations:**
- **P2P agent network**: Real people holding local float, collateralized on Soroban with reputation scoring
- **Parallel-FX framing**: Two countries that both know what it's like to watch their currency devalue, meeting at USDC
- **Non-custodial end to end**: Pollar handles embedded wallets, users never see seed phrases
- **Yield on transit**: Idle USDC can sit in Blend/DeFindex pools while waiting

## Working Product (Judges Category 3, 20 pts)

- ✅ Soroban escrow contract: 23/23 tests passing, 16KB WASM
- ✅ Next.js web app: TypeScript strict, builds clean
- ✅ Send corridor UI: NGN amount → USDC → BOB with quote
- ✅ Corridor tracker: Real-time status with progress visualization
- ✅ Agent dashboard: Network stats, agent list, activity feed
- ✅ Paystack integration: Initialize + webhook verification
- ✅ CI/CD: GitHub Actions for contract (fmt/clippy/test/WASM) and web (tsc/eslint/build)

## Creativity and Innovation (Judges Category 4, 20 pts)

**What makes this different:**
1. **Agent escrow on Soroban**: not just an SDK demo. A real smart contract with collateral, timeout, and reputation slashing.
2. **find_best_agent algorithm**: Matches corridors to agents by reputation, rate, and capacity
3. **The story**: two parallel-FX economies meeting at a USDC midpoint. No other team has this framing.
4. **Semi-manual fallback**: Documented, realistic for hackathon, honest about what's automated vs. coordinated

## UX and Design (Judges Category 5, 10 pts)

- Mobile-first responsive design
- Dark theme with green (Nigeria) and red (Bolivia) accents
- Clear corridor status progression: Created → Matched → NGN Paid → Settled
- Accessible form labels, error states, loading states
- Agent reputation visualized with color coding

## Feasibility and Impact (Judges Category 7, 5 pts)

**Beyond hackathon:**
- Real Paystack integration (sandbox → production)
- Real Pollar BOB ramp (already live via Stereum)
- Agent network grows organically as corridor volume increases
- Revenue model: Agent fee in basis points (0.8-1.5%)
- Scalable to other corridors: Nigeria↔Mexico, Kenya↔Colombia, Ghana↔Peru

## Quick Start

```bash
# Contract
cd contracts/corridor_escrow
cargo test

# Web
cd web
cp .env.example .env.local
npm install
npm run dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Soroban (Rust), Stellar testnet |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Wallet | Pollar SDK (@pollar/react, @pollar/core) |
| Payments | Paystack (sandbox), Stellar USDC |
| Off-ramp | Pollar Stereum (BOB) |
| CI/CD | GitHub Actions |
