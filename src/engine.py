"""
OSIRIS Engine Module - Core transaction lifecycle state machine.
Implements fail-closed execution with explicit partial failure states.

Phase 0: Foundation (completed)
Phase 1: Core trading engine (in progress)
"""

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Optional, Dict, Any, Callable, Awaitable
from dataclasses import dataclass, field

from .types import (
    OrderRequest,
    TradeStatus,
    TransactionState,
    TransactionContext,
    TokenAmount,
)

logger = logging.getLogger(__name__)


class CongestionLevel(Enum):
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class EngineState(Enum):
    INITIALIZING = "initializing"
    READY = "ready"
    PROCESSING = "processing"
    DEGRADED = "degraded"
    HALTING = "halting"
    STOPPED = "stopped"


@dataclass
class EngineConfig:
    """Configuration for the trading engine."""
    max_concurrent_transactions: int = 5
    max_retry_attempts: int = 3
    retry_backoff_base: float = 1.5
    congestion_threshold_high: float = 0.7  # 70% failure rate
    congestion_threshold_critical: float = 0.9  # 90% failure rate
    transaction_timeout_seconds: int = 30
    reconciliation_interval_seconds: int = 60
    min_confirmations: int = 1
    me_threshold_seconds: int = 300  # 5 minutes


class EngineStateHandler:
    """
    State machine for transaction lifecycle.
    Implements R-153: Partial Failure Is An Explicit State
    """

    def __init__(self, config: EngineConfig):
        self.config = config
        self._transactions: Dict[str, TransactionContext] = {}
        self._state = EngineState.INITIALIZING
        self._congestion_level = CongestionLevel.NORMAL
        self._failure_rate_window: list = []
        self._failure_threshold_seconds = 300

    @property
    def state(self) -> EngineState:
        return self._state

    @property
    def congestion_level(self) -> CongestionLevel:
        return self._congestion_level

    async def initialize(self) -> bool:
        """Initialize the engine and verify system readiness."""
        try:
            logger.info("Initializing OSIRIS Engine...")
            self._state = EngineState.READY
            logger.info("Engine initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Engine initialization failed: {e}")
            self._state = EngineState.STOPPED
            return False

    def record_failure(self, transaction_id: str, error: str):
        """Record a failure for congestion analysis."""
        self._failure_rate_window.append(datetime.utcnow())
        self._cleanup_old_failures()
        self._assess_congestion()

    def _cleanup_old_failures(self):
        """Remove failures older than threshold window."""
        cutoff = datetime.utcnow() - timedelta(seconds=self._failure_threshold_seconds)
        self._failure_rate_window = [
            t for t in self._failure_rate_window if t > cutoff
        ]

    def _assess_congestion(self):
        """Assess current congestion level."""
        if len(self._failure_rate_window) < 10:
            self._congestion_level = CongestionLevel.NORMAL
            return

        failure_rate = len(self._failure_rate_window) / 300  # failures per second
        if failure_rate > self.config.congestion_threshold_critical:
            self._congestion_level = CongestionLevel.CRITICAL
            self._state = EngineState.DEGRADED
            logger.warning(f"CRITICAL congestion detected: {failure_rate:.2%} failure rate")
        elif failure_rate > self.config.congestion_threshold_high:
            self._congestion_level = CongestionLevel.HIGH
            self._state = EngineState.DEGRADED
            logger.warning(f"HIGH congestion detected: {failure_rate:.2%} failure rate")
        else:
            self._congestion_level = CongestionLevel.NORMAL
            if self._state == EngineState.DEGRADED:
                logger.info("Congestion cleared, returning to NORMAL mode")
            self._state = EngineState.READY

    def evaluate_degraded_mode_actions(self):
        """
        R-321: Degraded mode actions based on congestion.
        Returns appropriate actions to take.
        """
        actions = {
            "raise_minimums": False,
            "reduce_concurrency": 1,
            "widen_deadlines": 1.0,
            "halt_new_trades": False,
        }

        if self._congestion_level == CongestionLevel.CRITICAL:
            actions["raise_minimums"] = True
            actions["reduce_concurrency"] = 3  # Reduce by factor of 3
            actions["widen_deadlines"] = 2.0
            actions["halt_new_trades"] = True
        elif self._congestion_level == CongestionLevel.HIGH:
            actions["reduce_concurrency"] = 2  # Reduce by factor of 2
            actions["widen_deadlines"] = 1.5

        return actions

    async def create_transaction(self, order: OrderRequest) -> TransactionContext:
        """Create a new transaction context with initial state."""
        transaction_id = f"tx_{order.order_id}_{datetime.utcnow().timestamp()}"
        context = TransactionContext(
            transaction_id=transaction_id,
            order_id=order.order_id,
            status=TransactionState.CREATED,
        )
        self._transactions[transaction_id] = context
        logger.info(f"Created transaction {transaction_id} for order {order.order_id}")
        return context

    async def update_state(
        self, transaction_id: str, new_state: TransactionState, error: Optional[str] = None
    ) -> TransactionContext:
        """Update transaction state with explicit state transitions."""
        context = self._transactions.get(transaction_id)
        if not context:
            raise ValueError(f"Transaction {transaction_id} not found")

        context.status = new_state
        context.last_update = datetime.utcnow()
        if error:
            context.last_error = error

        logger.info(
            f"Transaction {transaction_id} state: {context.status.name}"
        )
        return context

    async def get_state(self, transaction_id: str) -> TransactionContext:
        """Get current transaction state."""
        context = self._transactions.get(transaction_id)
        if not context:
            raise ValueError(f"Transaction {transaction_id} not found")
        return context

    async def resolve_unknown_state(
        self, transaction_id: str, resolver_func: Callable[[], Awaitable[bool]]
    ) -> bool:
        """
        Resolve a transaction in unknown state by querying the chain.
        Implements fail-closed: never assume SENT without chain verification.
        """
        context = await self.get_state(transaction_id)
        if context.status != TransactionState.CONFIRMED:
            context.status = TransactionState.RECONCILING
            try:
                confirmed = await resolver_func()
                if confirmed:
                    await self.update_state(transaction_id, TransactionState.CONFIRMED)
                else:
                    await self.update_state(
                        transaction_id,
                        TransactionState.FAILED,
                        "Resolution failed - transaction not found on chain"
                    )
                return confirmed
            except Exception as e:
                logger.error(f"State resolution failed for {transaction_id}: {e}")
                self.record_failure(transaction_id, str(e))
                return False
        return True

    def get_active_transaction_count(self) -> int:
        """Get count of non-terminal transactions."""
        terminal_states = {TransactionState.CONFIRMED, TransactionState.FAILED, TransactionState.RECONCILING}
        return sum(
            1 for ctx in self._transactions.values()
            if ctx.status not in terminal_states
        )