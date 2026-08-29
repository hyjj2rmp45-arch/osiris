import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Central Prometheus registry + metrics for OSIRIS.
 * Imported by both the /api/metrics route and business logic (copy-trading-flow)
 * so counters can be incremented without circular imports.
 */
export const register = new Registry();
collectDefaultMetrics({ register });

// ------------------------------- Counters ---------------------------------
export const tradeVolumeCounter = new Counter({
  name: 'osiris_trade_volume_usdc_total',
  help: 'Total USDC volume of executed copy trades',
  labelNames: ['sourceWallet', 'targetWallet', 'protocol'],
  registers: [register],
});

export const tradesTotalCounter = new Counter({
  name: 'osiris_trades_total',
  help: 'Total copy trades attempted (success/failed)',
  labelNames: ['outcome'], // success | failed
  registers: [register],
});

export const feeRevenueCounter = new Counter({
  name: 'osiris_fee_revenue_usdc_total',
  help: 'Total fees collected by fee type',
  labelNames: ['feeType'], // taker | transfer
  registers: [register],
});

export const breakerTripCounter = new Counter({
  name: 'osiris_circuit_breaker_trips_total',
  help: 'Number of times the circuit breaker engaged',
  registers: [register],
});

export const rateLimitBlockedCounter = new Counter({
  name: 'osiris_rate_limit_blocked_total',
  help: 'Number of trades blocked by the rate limiter',
  registers: [register],
});

// --------------------------------- Gauges ---------------------------------
export const activeSessionsGauge = new Gauge({
  name: 'osiris_active_sessions',
  help: 'Number of currently active copy-trading sessions',
  registers: [register],
});

// ------------------------------- Histograms -------------------------------
export const tradeDurationHistogram = new Histogram({
  name: 'osiris_trade_duration_seconds',
  help: 'Duration of trade execution from webhook to confirmation',
  labelNames: ['outcome'], // success | failure
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});