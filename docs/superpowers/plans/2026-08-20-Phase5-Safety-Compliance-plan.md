# Phase 5 — Safety & Compliance Implementation Plan

> **Goal:** Implement all 11 Phase 5 deliverables from the master plan, starting with highest-risk gaps.
> **Constraint:** Inline execution only (no subagents), strict rule compliance, verifiable artifacts.

## Phase 5 Deliverables (from master plan)

| ID | Deliverable | Priority | Status | Notes |
|----|-------------|----------|--------|-------|
| P5.1 | Loss Circuit Breaker | HIGH | PARTIAL | `src/lib/circuit-breaker.ts` exists; needs DB persistence, rolling window PNL, override flow |
| P5.2 | Tax Lot Accounting (FIFO) | HIGH | MISSING | New `tax_lots` table + FIFO algorithm |
| P5.3 | PNL Computation | HIGH | MISSING | Realized/unrealized PNL engine, multi-wallet aggregation |
| P5.4 | Token Metadata Cache | MEDIUM | MISSING | `token_metadata` table + Jupiter list + on-chain fallback |
| P5.5 | RugCheck Integration | MEDIUM | MISSING | API client + risk scoring + trade blocking |
| P5.6 | Rate Limiting (Full) | HIGH | PARTIAL | `src/lib/redis.ts` exists; needs sliding window, per-action limits, fail-open/closed policies |
| P5.7 | Dynamic Fee & CU Strategy | MEDIUM | MISSING | Per-tx-type CU limits, percentile fee strategy, 1% ceiling |
| P5.8 | Global Emergency Kill Switch | CRITICAL | MISSING | Multi-layer halt: DB flag, session cascade, remote signer HALT, on-chain pause |
| P5.9 | Admin Multi-Sig Controls | HIGH | MISSING | Ed25519 key pairs, proposal system, 2-of-3 threshold |
| P5.10 | Solana Network Upgrade Handling | MEDIUM | MISSING | Version detection, cautious mode, post-upgrade validation |
| P5.11 | Token Price Feed Strategy | HIGH | MISSING | Multi-source (Jupiter, Birdeye, DexScreener), 30s Redis cache, staleness alerts |

## Implementation Order (Risk-Based)

1. **P5.8** Global Kill Switch — highest impact if missing
2. **P5.6** Full Rate Limiting — protects all endpoints
3. **P5.1** Complete Circuit Breaker — integrate with kill switch
4. **P5.2** Tax Lot Accounting (FIFO) — foundation for P5.3
5. **P5.3** PNL Computation — depends on P5.2
6. **P5.11** Token Price Feed — feeds P5.3, P5.5
7. **P5.4** Token Metadata Cache — supports P5.5, P5.11
8. **P5.5** RugCheck Integration — risk scoring
9. **P5.7** Dynamic Fee Strategy — optimization
10. **P5.9** Admin Multi-Sig — governance
11. **P5.10** Solana Upgrade Handling — operational resilience

## File Structure Plan

```
src/
├── lib/
│   ├── killswitch.ts              # P5.8
│   ├── rate-limiter.ts            # P5.6 (extend redis.ts)
│   ├── tax-lots.ts                # P5.2
│   ├── pnl-engine.ts              # P5.3
│   ├── token-metadata.ts          # P5.4
│   ├── rugcheck.ts                # P5.5
│   ├── price-feed.ts              # P5.11
│   ├── fee-strategy.ts            # P5.7
│   ├── multisig.ts                # P5.9
│   ├── solana-upgrade.ts          # P5.10
│   └── schema.ts                  # ADD: tax_lots, token_metadata, circuit_breaker_state, rate_limits, multisig_proposals
├── services/
│   ├── safety/
│   │   ├── killswitch.ts          # P5.8 orchestration
│   │   └── circuit-breaker.ts     # P5.1 full implementation
│   ├── admin/
│   │   └── multisig.ts            # P5.9
│   ├── prices/
│   │   └── feed.ts                # P5.11
│   └── fees/
│       └── strategy.ts            # P5.7
├── app/api/
│   ├── killswitch/route.ts        # P5.8 endpoints
│   ├── multisig/route.ts          # P5.9 endpoints
│   └── rate-limits/route.ts       # P5.6 admin
```

## Gates (Verifiable Conditions)

Each deliverable must satisfy its master plan gates before moving on. Example for P5.8:
- [ ] HALT flag stops ALL trading within 1 second
- [ ] In-flight jobs cancelled via pg-boss
- [ ] WebSocket clients receive HALT event and disable UI
- [ ] Remote signer rejects ALL requests when HALT is set
- [ ] Automatic triggers fire correctly (tested)
- [ ] Recovery requires 2-of-3 admin approval
- [ ] Post-HALT audit review is mandatory
- [ ] HALT state is logged with full context

## Next Step

Start with **P5.8 Global Emergency Kill Switch** — create `src/lib/killswitch.ts` with:
1. DB `trading_halted` flag (fail-closed)
2. Session revocation cascade
3. Remote signer HALT check integration
4. Automatic triggers (circuit trip, rate limit, >50% sim failure, unusual withdrawal)
5. Manual triggers (admin dashboard panic, Telegram /halt Tier 3)
6. Recovery: 2-of-3 admin signatures, 60-min cooldown, typed confirmation

Then add migration for `trading_halted` flag and `circuit_breaker_state` table.