# Demo Script

## 3-Minute Demo Walkthrough

### Opening (30s)
"Corridor solves a real problem: sending money from Nigeria to Bolivia. Two countries that both know what it's like to watch their currency devalue, meeting at a USDC midpoint on Stellar."

### Problem (30s)
- Show Nigeria parallel FX rates vs Bolivia parallel rates
- "Western Union charges 5-10% and takes 3-5 days. We do it in minutes for 2-3%."

### Send Flow (60s)
1. Enter 50,000 NGN
2. Enter Bolivian phone number
3. Show quote: ₦50,000 → Bs 207.90 (1% fee, ~2 min)
4. Click "Create Corridor"
5. Show corridor created confirmation

### Corridor Tracking (30s)
1. Switch to Track tab
2. Show corridor card with progress bar
3. "Created → Waiting for agent → Agent matched"
4. "The agent has collateral locked in a Soroban smart contract"

### Agent Dashboard (30s)
1. Switch to Agent tab
2. Show 3 agents with different reputations
3. "Higher reputation = more corridor matches = more earnings"
4. Show activity feed

### Technical Depth (30s)
1. Show Soroban contract: 23 tests, 16KB WASM
2. Show CI/CD: GitHub Actions running tests
3. "Full Soroban escrow with collateral, timeout, reputation"
4. "Non-custodial end to end via Pollar"

### Closing (10s)
"Corridor is a real product for a real corridor. The agent network is the differentiator — it's infrastructure that gets more valuable with every transaction."

## Key Demo Points

- **Real money movement**: Paystack sandbox → USDC → BOB
- **Smart contract**: On-chain escrow, not just UI
- **Agent network**: P2P, collateralized, reputation-based
- **Parallel-FX story**: Two countries, one USDC bridge

## Backup: If Something Breaks

- Paystack sandbox: Use mock data, document flow
- Pollar API keys: Use placeholder, show architecture
- Stellar testnet: Use mock transactions
- Always have the docs ready to show architecture
