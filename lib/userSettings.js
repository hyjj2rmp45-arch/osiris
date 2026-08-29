/**
 * User Settings – Phase 2 (P2.5)
 *
 * Per‑user settings: default slippage, max trade size, notifications,
 * paper trading toggle, copy trading toggle. Settings are persisted per user
 * and affect trading behavior.
 *
 * In production these live in the `user_settings` DB table. This stub provides
 * an in‑memory store with sensible defaults and validation.
 */

const DEFAULT_SETTINGS = {
  defaultSlippageBps: 50,      // 0.5%
  maxTradeSizeLamports: 1_000_000_000, // 1 SOL
  notificationsEnabled: true,
  paperTrading: false,
  copyTrading: false
};

// In‑memory store: userId -> settings
const settingsStore = new Map();

/**
 * Get settings for a user, creating with defaults if not present.
 * @param {string} userId
 * @returns {Object} settings
 */
function getSettings(userId) {
  if (!settingsStore.has(userId)) {
    settingsStore.set(userId, { ...DEFAULT_SETTINGS });
  }
  return { ...settingsStore.get(userId) };
}

/**
 * Update settings for a user (partial update, validates fields).
 * @param {string} userId
 * @param {Object} updates - partial settings to apply
 * @returns {Object} updated settings
 * @throws {Error} on invalid field
 */
function updateSettings(userId, updates) {
  const current = getSettings(userId);

  for (const [key, value] of Object.entries(updates || {})) {
    if (!(key in DEFAULT_SETTINGS)) {
      throw new Error(`Unknown setting: ${key}`);
    }
    // Basic validation
    if (key === 'defaultSlippageBps') {
      if (typeof value !== 'number' || value < 0 || value > 10000) {
        throw new Error('defaultSlippageBps must be 0-10000');
      }
    }
    if (key === 'maxTradeSizeLamports') {
      if (typeof value !== 'number' || value < 0) {
        throw new Error('maxTradeSizeLamports must be >= 0');
      }
    }
    if (['notificationsEnabled', 'paperTrading', 'copyTrading'].includes(key)) {
      if (typeof value !== 'boolean') {
        throw new Error(`${key} must be boolean`);
      }
    }
    current[key] = value;
  }

  settingsStore.set(userId, current);
  return { ...current };
}

/**
 * Whether paper trading is on for a user (affects trade execution).
 * @param {string} userId
 * @returns {boolean}
 */
function isPaperTrading(userId) {
  return getSettings(userId).paperTrading;
}

/**
 * Reset settings store (test helper).
 */
function resetSettings() {
  settingsStore.clear();
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  isPaperTrading,
  resetSettings
};