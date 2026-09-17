# Corridor

**Send money from Nigeria to Bolivia in minutes.**

Two parallel-FX economies meeting at a USDC midpoint on Stellar.

[![Contract CI](https://github.com/sudo-robi/corridor-app/actions/workflows/contract.yml/badge.svg)](https://github.com/sudo-robi/corridor-app/actions/workflows/contract.yml)
[![Web CI](https://github.com/sudo-robi/corridor-app/actions/workflows/web.yml/badge.svg)](https://github.com/sudo-robi/corridor-app/actions/workflows/web.yml)

---

## What is this?

Corridor is a cross-border remittance app for the Africa ↔ Latin America corridor. It uses:

- **Pollar SDK** for embedded wallets and Stellar payments
- **Soroban** for on-chain escrow with agent collateral and reputation
- **Paystack** for Nigerian bank transfers
- **Stellar USDC** as the settlement layer

A Nigerian freelancer gets paid by a Bolivian client. The money moves in minutes, not days. Local agents on both sides handle the cash in/out, collateralized on-chain with reputation that compounds.

## The Problem

Nigeria and Bolivia share a parallel story: currency devaluation, parallel FX markets, and populations that treat dollars as a savings product rather than a payment instrument.

- **Nigeria**: Naira devaluation, 3-5 day bank transfers, 5-10% fees
- **Bolivia**: Floated currency June 2026, dollar scarcity, QR/mobile-first
- **Corridor**: No Western Union-style rail dominates it

## Architecture

```
Nigeria (NGN)                Stellar                   Bolivia (BOB)
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Paystack │─>│  Pollar  │─>│   USDC   │─>│  Pollar  │─>│ Stereum  │
│ Bank TX  │  │  Wallet  │  │ on-chain │  │  Wallet  │  │ QR/Bank  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
                   │                             │
                   └────── Soroban Escrow ───────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Rust 1.74+ with `wasm32-unknown-unknown` target
- Pollar API key (from dashboard.pollar.xyz)
- Paystack sandbox keys

### Contract

```bash
cd contracts/corridor_escrow
cargo test        # 23 tests pass
cargo build --target wasm32-unknown-unknown --release
```

### Web App

```bash
cd web
cp .env.example .env.local
# Add your API keys to .env.local
pnpm install
pnpm run dev      # http://localhost:3000
```

## Project Structure

```
corridor-app/
├── contracts/
│   └── corridor_escrow/        # Soroban escrow contract
│       ├── Cargo.toml
│       └── src/lib.rs          # 23 tests, 16KB WASM
├── web/                        # Next.js web app
│   ├── src/
│   │   ├── app/                # Pages + API routes
│   │   ├── components/         # UI components
│   │   ├── lib/                # Utilities
│   │   └── types/              # TypeScript types
│   └── package.json
├── docs/
│   ├── problem.md              # Judges Cat 1 (20 pts)
│   ├── corridor-design.md      # Judges Cat 2 (25 pts)
│   ├── architecture.md         # System design
│   ├── feasibility.md          # Judges Cat 7 (5 pts)
│   ├── ux.md                   # Judges Cat 5 (10 pts)
│   └── demo-script.md          # Demo walkthrough
└── .github/workflows/
    ├── contract.yml            # Contract CI/CD
    └── web.yml                 # Web CI/CD
```

## Smart Contract

The `corridor_escrow` Soroban contract manages:

- **Agent lifecycle**: Register, collateral, reputation, capacity
- **Corridor flow**: Create, accept, confirm, settle, timeout
- **Matching**: `find_best_agent` by reputation, rate, capacity
- **Safety**: Collateral lock, timeout refund, reputation slashing

Run tests: `cargo test` (23/23 passing)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Soroban (Rust) + Stellar testnet |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Wallet | Pollar SDK (non-custodial) |
| Payments | Paystack (sandbox) |
| Settlement | Stellar USDC |
| Off-ramp | Pollar Stereum (BOB) |
| CI/CD | GitHub Actions |

## Docs

- [Problem Statement](docs/problem.md): why this corridor matters
- [Architecture](docs/architecture.md): system design and data flow
- [Corridor Design](docs/corridor-design.md): agent network and fallback flows
- [Feasibility](docs/feasibility.md): beyond the hackathon
- [UX Design](docs/ux.md): design decisions and accessibility

## License

MIT
