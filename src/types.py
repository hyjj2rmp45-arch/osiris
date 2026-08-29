from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum, auto
from typing import Optional, Dict, Any
from datetime import datetime

class TradeAction(Enum):
    BUY = "buy"
    SELL = "sell"

class TradeSide(Enum):
    BUY = "buy"
    SELL = "sell"

class TradeStatus(Enum):
    PENDING = "pending"
    SIGNING = "signing"
    SENT = "sent"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    UNKNOWN = "unknown"

class TransactionState(Enum):
    CREATED = "created"
    SIGNING = "signing"
    SENT = "sent"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    RECONCILING = "reconciling"

@dataclass(frozen=True)
class TokenAmount:
    amount: Decimal
    decimals: int
    mint: str

@dataclass
class OrderRequest:
    order_id: str
    action: TradeAction
    side: TradeSide
    amount: Decimal
    token_mint: str
    sol_amount: Optional[Decimal] = None
    user_pubkey: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TradeExecutionResult:
    order_id: str
    transaction_id: Optional[str] = None
    status: TradeStatus = TradeStatus.PENDING
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    signature: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TransactionContext:
    transaction_id: str
    order_id: str
    status: TransactionState
    retry_count: int = 0
    last_error: Optional[str] = None
    last_update: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)
