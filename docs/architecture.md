# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CORRIDOR APP                             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  SENDER       │    │  AGENT       │    │  RECEIVER    │      │
│  │  (Nigeria)    │    │  (P2P)       │    │  (Bolivia)   │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    WEB APP (Next.js)                     │   │
│  │  PollarProvider → Auth → Wallet → Corridor UI           │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐         │
│  │  Paystack   │   │  Pollar     │   │  Soroban    │         │
│  │  NGN On-ramp│   │  Wallets +  │   │  Escrow     │         │
│  │  API        │   │  BOB Ramp   │   │  Contract   │         │
│  └─────────────┘   └─────────────┘   └─────────────┘         │
│                             │                                   │
│                             ▼                                   │
│                    ┌──────────────┐                            │
│                    │   Stellar    │                            │
│                    │   USDC       │                            │
│                    └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Soroban Escrow Contract (`contracts/corridor_escrow/`)

**Storage model:**
- Instance storage: admin, next_id, total_volume, total_corridors
- Persistent storage: agent data (keyed by address), corridor data (keyed by ID), agent address list

**Key functions:**
- `register_agent` — Agent posts collateral, gets registered with side/rate
- `find_best_agent` — Matches corridor to best available agent
- `create_corridor` — Sender initiates transfer
- `accept_corridor` — Agent takes the corridor
- `confirm_local_payment` — Sender confirms NGN sent
- `confirm_remote_payment` — Agent confirms BOB sent
- `settle_corridor` — Complete, release collateral, update reputation
- `timeout_refund` — Expired corridor, slash agent, free slot

**Reputation system:**
- Start at 100
- +1 per completed corridor
- -5 on timeout (if agent accepted but didn't complete)
- Used in `find_best_agent` to rank agents

### 2. Web App (`web/`)

**Pages:**
- `/` — Main corridor app (Send, Track, Agent tabs)
- `/api/paystack/initialize` — Initialize Paystack payment
- `/api/paystack/webhook` — Paystack webhook handler

**Components:**
- `CorridorApp` — Tab container with state management
- `Header` — Nigeria ↔ Bolivia branding
- `SendCorridor` — NGN amount input, quote computation, corridor creation
- `CorridorTracker` — Status visualization with progress bar
- `AgentDashboard` — Network stats, agent list, activity feed

### 3. Paystack Integration

**Flow:**
1. Sender enters NGN amount and email
2. Frontend calls `/api/paystack/initialize`
3. Paystack returns authorization URL
4. Sender completes bank transfer
5. Paystack sends webhook to `/api/paystack/webhook`
6. Webhook verifies signature, triggers corridor update

### 4. Pollar Integration

**Setup:**
1. Wrap app in `PollarProvider` with API key
2. Use `usePollar()` hook for auth, wallet, balance
3. Use `runTx()` for USDC payments
4. Use `openRampModal()` for BOB off-ramp

**Corridor-specific:**
- Sender creates Pollar wallet via social login
- NGN deposit → USDC credit in wallet
- USDC transferred to agent wallet
- Agent uses Pollar ramp for BOB cash-out

## Data Flow

```
1. Sender creates corridor
   → create_corridor() on Soroban
   → Paystack initialize()

2. Sender pays NGN
   → Paystack bank transfer
   → Webhook confirms

3. USDC credited
   → Pollar wallet funded
   → Soroban corridor updated

4. Agent accepts
   → accept_corridor() on Soroban
   → Agent locks collateral

5. Agent pays BOB
   → Pollar BOB ramp (Stereum)
   → confirm_remote_payment()

6. Settlement
   → settle_corridor() on Soroban
   → Reputation +1
   → Volume tracked
```

## Security

- **Non-custodial**: Pollar handles key management, we never touch private keys
- **DPoP-bound tokens**: Stolen tokens useless without per-session keypair
- **Collateral**: Agents must post USDC before accepting corridors
- **Timeout**: Corridors expire, agents get slashed, users get refunded
- **Webhook verification**: Paystack HMAC signature validated
