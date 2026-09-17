# Corridor Design — Africa ↔ Latin America

## Why This Corridor?

The Nigeria ↔ Bolivia corridor is not about "Nigerian families sending money to Bolivian relatives." That barely exists. It's about **two parallel-FX economies meeting at a USDC midpoint**.

### Nigeria (Sender Side)
- Naira devaluation: 60%+ loss against USD since 2023
- Parallel market premium: 30-50% above official rate
- 40%+ unbanked, but 80%+ mobile phone penetration
- Paystack: dominant payment gateway, bank transfer API available

### Bolivia (Receiver Side)
- Currency floated June 2026 after 15-year peg
- Dollar scarcity drove organic crypto adoption
- QR and mobile-money-first behavior
- Pollar BOB ramp: live via Stereum (buy by QR, sell to bank)

### The Connection
Both countries:
- Treat dollars as savings, not payments
- Have parallel FX markets
- Are mobile-first
- Lack traditional cross-border infrastructure

USDC on Stellar is the natural bridge.

## Agent Network Design

### Why Agents?
Every working African corridor runs on humans holding local float. The interesting build is making that safe.

### How It Works
1. **Registration**: Agent posts USDC collateral into Soroban escrow
2. **Matching**: `find_best_agent` selects by reputation, rate, capacity
3. **Execution**: User pays agent locally, agent pays receiver
4. **Settlement**: Corridor completes, reputation updates
5. **Disputes**: Timeout → auto-refund, agent reputation slashed

### Reputation System
- Start at 100 (neutral)
- +1 per completed corridor
- -5 on timeout
- Higher reputation → more corridor matches → more earnings
- Creates a flywheel: good agents get more work

### Collateral Requirements
- Minimum 100 USDC to register
- Proportional lock per corridor (1% of send amount)
- Released on completion
- Slashed on timeout

## Fallback Flows

The hackathon allows semi-manual flows. Here's what's automated vs. coordinated:

### Automated (Sandbox)
- Paystack bank transfer initialization
- Webhook verification
- Corridor creation on Soroban
- Agent matching algorithm
- Quote computation

### Semi-Manual (Documented)
- Actual Paystack → USDC conversion (requires liquidity desk)
- Pollar wallet funding (requires API keys)
- Stereum BOB off-ramp (requires Pollar team coordination)

### Manual Coordination
- Agent ↔ sender local payment confirmation
- Agent ↔ receiver BOB delivery confirmation

## Quote Math

```
NGN → USDC → BOB

1. Sender deposits 50,000 NGN
2. Agent fee: 100 bps = 1% = 500 NGN
3. After fee: 49,500 NGN
4. Exchange rate: 1 NGN ≈ 0.0042 BOB
5. Receiver gets: 49,500 × 0.0042 × 100 = 207.9 BOB

In practice:
- 1 USD ≈ 1,600 NGN (parallel)
- 1 USD ≈ 6.90 BOB (official)
- Agent margin: 0.8-1.5%
- Total cost: ~2-3% vs Western Union's 5-10%
```

## Timeline

| Phase | Duration | What |
|-------|----------|------|
| Corridor created | 0s | User enters amount, phone |
| Agent matched | 0-30s | `find_best_agent` selects best fit |
| NGN payment | 30s-5min | User sends bank transfer |
| USDC credited | 1-3min | Paystack webhook → Pollar wallet |
| BOB delivered | 1-5min | Agent pays via QR/bank |
| Settled | 5-10min total | On-chain confirmation |
