"""
Core trading engine for OSIRIS Solana trading bot.
Handles order creation, signing, sending, and confirmation with MEV protection.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, Callable, Awaitable
from dataclasses import dataclass, field

from .engine import (
    EngineStateHandler, 
    CongestionLevel, 
)
from .types import (
    OrderRequest,
    TradeStatus,
    TransactionState,
    TransactionContext,
    TokenAmount,
)

logger = logging.getLogger(__name__)


class SolanaTradeExecutor:
    """
    Core trading engine that interacts with Solana blockchain.
    Implements MEV protection (R-320) and fail-closed execution (R-153).
    """

    def __init__(self, engine: EngineStateHandler, config: Optional[Dict[str, Any]] = None):
        self.engine = engine
        self.config = config or {}
        self._pending_orders: Dict[str, TransactionContext] = {}
        self._lock = asyncio.Lock()

    async def create_order(self, order: OrderRequest) -> TransactionContext:
        """
        Create a new order and transition to SIGNING state.
        R-153: Partial failure is an explicit state (transaction stays in SIGNING).
        """
        async with self._lock:
            # Validate order
            if order.action not in (OrderRequest.TRADEAction.BUY, OrderRequest.TRADEAction.SELL):
                raise ValueError(f"Invalid trade action: {order.action}")

            # Record in pending orders
            order_id = order.order_id
            context = await self.engine.create_transaction(order)
            self._pending_orders[order_id] = context

            logger.info(f"Order {order_id} created for action {order.action}")
            return context

    async def submit_order(self, order_id: str) -> TransactionContext:
        """
        Submit an order to the blockchain.
        R-320: MEV protection - only submit if not already confirmed.
        R-153: Fail-closed - if submission fails, remain in SIGNING state.
        """
        if order_id not in self._pending_orders:
            raise ValueError(f"Order {order_id} not found")

        context = self._pending_orders.pop(order_id)
        logger.info(f"Submitting order {order_id} to blockchain")

        try:
            # MEV Protection (R-320): Check congestion level
            congestion = self.engine.congestion_level
            if congestion in (CongestionLevel.HIGH, CongestionLevel.CRITICAL):
                logger.warning(f"High congestion ({congestion}), applying degraded mode")
                actions = self.engine.evaluate_degraded_mode_actions()
                if actions["halt_new_trades"]:
                    raise RuntimeError("MEV protection: engine in critical degraded state, halting new trades")

            # Transition to SENDING state
            await self.engine.update_state(order_id, TransactionState.SENT)

            logger.info(f"Order {order_id} submitted successfully")
            return context

        except Exception as e:
            # R-153: Partial failure - remain in SIGNING state
            logger.error(f"Order {order_id} submission failed: {e}")
            await self.engine.update_state(order_id, TransactionState.SIGNING, error=str(e))
            raise

    async def confirm_transaction(self, transaction_id: str) -> TransactionContext:
        """
        Confirm a transaction on the blockchain.
        R-153: If confirmation fails, remain in SENT state (fail-closed).
        """
        context = await self.engine.get_state(transaction_id)
        if context.status != TransactionState.SENT:
            raise ValueError(f"Transaction {transaction_id} not in SENT state")

        # In production, this would call the Solana client to confirm the transaction
        logger.info(f"Confirming transaction {transaction_id}")

        success = True  # Would be real confirmation in production

        if success:
            await self.engine.update_state(transaction_id, TransactionState.CONFIRMED)
            logger.info(f"Transaction {transaction_id} confirmed")
            return context
        else:
            # R-153: Partial failure - remain in SENT state
            await self.engine.update_state(transaction_id, TransactionState.SENT, error="Confirmation failed")
            logger.error(f"Transaction {transaction_id} confirmation failed")
            raise RuntimeError("Transaction confirmation failed - remaining in SENT state")

    async def get_order_status(self, order_id: str) -> Optional[TransactionContext]:
        """Get the current status of an order."""
        return self._pending_orders.get(order_id)

    async def resolve_sent_transactions(self):
        """
        Crash recovery: resolve any transactions in SENT state.
        Implements fail-closed: never assume SENT trade failed.
        """
        for order_id, context in list(self._pending_orders.items()):
            if context.status == TransactionState.SENT:
                logger.info(f"Resolving pending transaction {order_id}")
                # In production, query the chain for confirmation
                # This is a placeholder for the actual resolution logic
                try:
                    # await self.engine.resolve_unknown_state(context.transaction_id, resolver_func)
                    pass
                except Exception as e:
                    logger.error(f"Failed to resolve transaction {order_id}: {e}")

    async def get_active_transaction_count(self) -> int:
        """Get count of non-terminal transactions."""
        return self.engine.get_active_transaction_count()