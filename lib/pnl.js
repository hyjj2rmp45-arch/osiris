/**
 * Real-Time PNL Updates – Phase 3 (P3.4)
 *
 * PNL computations:
 *   - computeRealizedPnl(): triggered on trade completion
 *   - computeUnrealizedPnl(): updates on price change (price polling)
 *   - Events streamed to SSE (pnl.update)
 *
 * In production this runs in the worker on trade completion and on price
 * updates from Birdeye/DexScreener, then publishes via the event bus.
 * This stub provides the PNL math and event publication hooks.
 */

// In-memory position store: positionId -> { entryPrice, size }
const positions = new Map();
// Optional event hook (set by caller to publish to SSE/event bus)
let publishHook = null;

/**
 * Set an event publish hook (e.g., eventBus.publish('pnl.update', ...)).
 * @param {Function} fn - (payload) => void
 */
function setPublishHook(fn) {
  publishHook = fn;
}

/**
 * Open a position (records entry for PNL purposes).
 * @param {string} positionId
 * @param {number} entryPrice
 * @param {number} sizeLamports
 */
function openPosition(positionId, entryPrice, sizeLamports) {
  positions.set(positionId, { entryPrice, size: sizeLamports });
}

/**
 * Compute realized PNL on trade completion.
 *
 * @param {Object} params
 * @param {string} params.positionId
 * @param {number} params.exitPrice
 * @param {number} params.sizeLamports
 * @returns {Object} { realizedPnlLamports, pnlPct, positionId }
 */
function computeRealizedPnl({ positionId, exitPrice, sizeLamports }) {
  const pos = positions.get(positionId) || { entryPrice: exitPrice, size: sizeLamports };
  const entryPrice = pos.entryPrice;
  // Price diff * size = PNL (simplified linear model)
  const pnlLamports = (exitPrice - entryPrice) / entryPrice * sizeLamports;
  const result = {
    positionId,
    realizedPnlLamports: Math.round(pnlLamports),
    pnlPct: (pnlLamports / sizeLamports) * 100
  };
  if (publishHook) {
    publishHook({ type: 'pnl.update', reason: 'realized', ...result });
  }
  positions.delete(positionId);
  return result;
}

/**
 * Compute unrealized PNL on a price change.
 * @param {string} positionId
 * @param {number} currentPrice
 * @returns {Object} { unrealizedPnlLamports, pnlPct, positionId }
 */
function computeUnrealizedPnl(positionId, currentPrice) {
  const pos = positions.get(positionId);
  if (!pos) throw new Error('POSITION_NOT_FOUND');
  const { entryPrice, size } = pos;
  const pnlLamports = (currentPrice - entryPrice) / entryPrice * size;
  const result = {
    positionId,
    unrealizedPnlLamports: Math.round(pnlLamports),
    pnlPct: (pnlLamports / size) * 100
  };
  if (publishHook) {
    publishHook({ type: 'pnl.update', reason: 'unrealized', ...result });
  }
  return result;
}

/**
 * Current position state (for consistency with trade history).
 * @param {string} positionId
 * @returns {Object|null}
 */
function getPosition(positionId) {
  const pos = positions.get(positionId);
  return pos ? { ...pos } : null;
}

/**
 * Reset PNL state (test helper).
 */
function resetPNL() {
  positions.clear();
  publishHook = null;
}

module.exports = {
  setPublishHook,
  openPosition,
  computeRealizedPnl,
  computeUnrealizedPnl,
  getPosition,
  resetPNL
};