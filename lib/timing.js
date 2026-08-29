/**
 * Latency Budget Tracking & Alerting – Phase 3 (P3.6)
 *
 *   - Per-request timing spans
 *   - Latency budget definitions per trade type
 *   - Alert on budget breach (Slack/Discord webhook)
 *   - p99 tracking
 *
 * Budgets:
 *   - copy trade: < 500ms end-to-end max
 *   - standard trade: < 2s end-to-end max
 *
 * In production this feeds a Grafana dashboard. This stub provides timing
 * spans, budget checking, alerting hooks, and p99 computation.
 */

const BUDGETS = {
  copy: 500,        // ms
  standard: 2000    // ms
};

const spans = new Map();   // spanId -> { type, start }
const latencies = [];      // recorded latencies (ms)
let alertHook = null;

/**
 * Set an alert hook (e.g., send to Slack/Discord webhook).
 * @param {Function} fn - (alert) => void
 */
function setAlertHook(fn) {
  alertHook = fn;
}

/**
 * Start a timing span.
 * @param {string} spanId
 * @param {string} type - 'copy' | 'standard'
 */
function startSpan(spanId, type) {
  spans.set(spanId, { type, start: Date.now() });
}

/**
 * End a span, record latency, check budget, and alert on breach.
 * @param {string} spanId
 * @returns {Object} { latencyMs, budgetMs, breached }
 */
function endSpan(spanId) {
  const span = spans.get(spanId);
  if (!span) throw new Error('SPAN_NOT_FOUND');
  spans.delete(spanId);
  const latency = Date.now() - span.start;
  latencies.push(latency);
  const budgetMs = BUDGETS[span.type] || BUDGETS.standard;
  const breached = latency > budgetMs;
  if (breached && alertHook) {
    alertHook({ spanId, type: span.type, latencyMs: latency, budgetMs, breached: true });
  }
  return { latencyMs: latency, budgetMs, breached };
}

/**
 * Check whether a measured latency breaches a trade type's budget.
 * @param {string} type - 'copy' | 'standard'
 * @param {number} latencyMs
 * @returns {Object} { budgetMs, breached }
 */
function checkBudget(type, latencyMs) {
  const budgetMs = BUDGETS[type] || BUDGETS.standard;
  return { budgetMs, breached: latencyMs > budgetMs };
}

/**
 * Compute p99 latency over recorded spans.
 * @returns {number|null} p99 in ms, or null if no data
 */
function computeP99() {
  if (latencies.length === 0) return null;
  const sorted = [...latencies].sort((a, b) => a - b);
  const idx = Math.ceil((sorted.length * 99) / 100) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Get the copy/standard budget constants.
 * @returns {Object}
 */
function getBudgets() {
  return { ...BUDGETS };
}

/**
 * Reset timing state (test helper).
 */
function resetTiming() {
  spans.clear();
  latencies.length = 0;
  alertHook = null;
}

module.exports = {
  BUDGETS,
  setAlertHook,
  startSpan,
  endSpan,
  checkBudget,
  computeP99,
  getBudgets,
  resetTiming
};