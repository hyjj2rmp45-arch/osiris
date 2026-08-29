import { logger } from './logger';

export { logger };

export function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class SafetyManager {
  checkTradeLimits(trade: {
    tradePercentage: number;
    maxPositionSize: number;
  }): boolean {
    const percentage = trade.tradePercentage || 100;
    const maxSize = trade.maxPositionSize || 0;

    if (percentage <= 0 || percentage > 100) {
      logger.warn('safety_manager.trade_limit_invalid', { percentage, maxSize });
      return false;
    }

    if (maxSize <= 0) {
      logger.warn('safety_manager.max_position_size_invalid', { percentage, maxSize });
      return false;
    }

    return true;
  }
}

export const safetyManager = new SafetyManager();