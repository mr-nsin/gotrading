import uuid
import secrets
import hashlib
from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    subscription_tier: str = Field(default="FREE")


class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    broker_credentials: List["BrokerCredential"] = Relationship(back_populates="user")
    orders: List["Order"] = Relationship(back_populates="user")
    audit_logs: List["AuditLog"] = Relationship(back_populates="user")


class BrokerCredentialBase(SQLModel):
    user_id: uuid.UUID = Field(foreign_key="user.id")
    fyers_app_id: Optional[str] = None
    fyers_access_token: Optional[str] = None
    zerodha_api_key: Optional[str] = None
    dhan_client_id: Optional[str] = None
    angelone_client_code: Optional[str] = None
    angelone_password: Optional[str] = None
    angelone_api_key: Optional[str] = None
    angelone_totp_secret: Optional[str] = None


class BrokerCredential(BrokerCredentialBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Enhanced fields for UI
    code: str = Field(default="")  # "KITE", "UPX", "SMARTAPI", "FYERS-V3", "DHANHQ"
    api_key_masked: str = Field(default="")  # Masked display: "kt_9f2a••••••e41b"
    token_expiry: Optional[datetime] = Field(default=None)
    funds: float = Field(default=0.0)
    margin_used: float = Field(default=0.0)
    margin_available: float = Field(default=0.0)
    strategies_count: int = Field(default=0)
    client_id: str = Field(default="")
    auto_square_off: str = Field(default="15:20")
    max_daily_loss: float = Field(default=50000.0)
    max_margin_util: float = Field(default=70.0)
    max_positions: int = Field(default=10)
    leverage_cap: float = Field(default=5.0)
    last_connected: Optional[datetime] = Field(default=None)
    connection_status: str = Field(default="disconnected")  # "connected" | "disconnected" | "token_expiring"
    accent_hue: str = Field(default="var(--chart-1)")
    
    user: User = Relationship(back_populates="broker_credentials")


class OrderBase(SQLModel):
    user_id: uuid.UUID = Field(foreign_key="user.id")
    broker_order_id: Optional[str] = None
    symbol: str
    side: str
    quantity: int
    status: str = Field(default="PENDING", index=True)  # INDEX: frequently filtered
    is_algo_trade: bool = Field(default=False)
    order_type: Optional[str] = None
    product: Optional[str] = None
    exchange: Optional[str] = None
    average_price: Optional[float] = None
    filled_quantity: Optional[int] = None
    strategy_id: Optional[str] = Field(default=None, index=True)  # INDEX: frequently filtered
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    error_message: Optional[str] = None


class Order(OrderBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Enhanced fields for UI
    segment: str = Field(default="EQ")  # "EQ" | "FUT" | "OPT"
    broker_id: Optional[str] = Field(default=None)
    avg_fill: float = Field(default=0.0)
    rejection_reason: Optional[str] = Field(default=None)
    lifecycle_json: str = Field(default="[]")  # JSON array of {t, label}
    
    user: User = Relationship(back_populates="orders")


class AuditLogBase(SQLModel):
    user_id: uuid.UUID = Field(foreign_key="user.id")
    audio_s3_url: Optional[str] = None
    transcript: str
    parsed_json: str


class AuditLog(AuditLogBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user: User = Relationship(back_populates="audit_logs")


# --- Virtual Engine Models ---

class VirtualTrade(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    strategy_name: str = Field(index=True)  # INDEX: frequently filtered by strategy
    symbol: str = Field(index=True)  # INDEX: frequently filtered by symbol
    side: str  # BUY / SELL
    quantity: int
    entry_price: float
    ltp: Optional[float] = Field(default=None)
    exit_price: Optional[float] = None
    status: str = Field(default="OPEN", index=True)  # INDEX: frequently filtered (OPEN/CLOSED)
    pnl: float = Field(default=0.0)
    pnl_pct: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    
    # Enhanced fields for UI
    segment: str = Field(default="EQ")  # "EQ" | "FUT" | "OPT"
    broker_id: Optional[str] = Field(default=None)
    strategy_id: Optional[str] = Field(default=None)
    avg_price: float = Field(default=0.0)
    day_change: float = Field(default=0.0)
    trade_type: str = Field(default="Intraday")  # "Intraday" | "Carry Forward"


class VirtualPortfolio(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    total_capital: float = Field(default=1000000.0)
    available_margin: float = Field(default=1000000.0)
    realized_pnl: float = Field(default=0.0)
    unrealized_pnl: float = Field(default=0.0)


class Strategy(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    type: str = Field(default="INTRADAY")  # INTRADAY, SWING, OPTIONS
    instrument: str = Field(default="NIFTY")
    broker_id: Optional[uuid.UUID] = Field(default=None)
    status: str = Field(default="STOPPED")  # RUNNING, PAUSED, STOPPED, ERROR
    capital_allocated: float = Field(default=0.0)
    capital_deployed: float = Field(default=0.0)
    todays_pnl: float = Field(default=0.0)
    total_pnl: float = Field(default=0.0)
    win_rate: float = Field(default=0.0)
    total_trades: int = Field(default=0)
    max_drawdown: float = Field(default=0.0)
    sharpe_ratio: float = Field(default=0.0)
    settings_json: str = Field(default='{}')
    schedule_json: str = Field(default='{}')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Enhanced fields for UI
    segment: str = Field(default="Options")  # "Equity Cash" | "Futures" | "Options"
    description: str = Field(default="")
    brokers_json: str = Field(default="[]")  # JSON array of broker IDs
    open_positions: int = Field(default=0)
    last_signal: Optional[datetime] = Field(default=None)
    mode: str = Field(default="Live")  # "Live" | "Paper" | "Backtest"
    instruments_json: str = Field(default="[]")  # JSON array of instrument symbols
    entry_rules_json: str = Field(default="[]")  # JSON array of rule objects
    exit_rules_json: str = Field(default="[]")  # JSON array of rule objects
    risk_json: str = Field(default='{"stopLoss": "1.5%", "target": "3%", "trailingStop": "0.5%"}')
    sizing_json: str = Field(default='{"type": "fixed", "lots": 1}')
    spark_data_json: str = Field(default="[]")  # 24 data points for sparkline
    webhook_enabled: bool = Field(default=False)


class LogEntry(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    level: str = Field(index=True)  # INFO, WARN, ERROR, TRADE, ALERT - INDEX for filtering
    message: str
    broker_id: Optional[str] = None
    strategy_id: Optional[str] = Field(default=None, index=True)  # INDEX: filter by strategy
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)  # INDEX: ORDER BY timestamp
    
    # Enhanced field for UI
    source: str = Field(default="system")  # "strategy" | "broker" | "system" | "order" | "webhook"


class RiskSettings(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    daily_loss_limit: float = Field(default=50000.0)
    daily_loss_limit_pct: float = Field(default=3.0)
    max_open_positions: int = Field(default=10)
    max_capital_per_strategy_pct: float = Field(default=30.0)
    max_order_value: float = Field(default=500000.0)
    max_per_trade_loss: float = Field(default=25000.0)
    auto_kill_switch: bool = Field(default=True)
    circuit_breaker_enabled: bool = Field(default=True)
    circuit_breaker_threshold: float = Field(default=5.0)
    circuit_breaker_action: str = Field(default="PAUSE_ALL")
    vix_threshold: float = Field(default=12.0)
    block_entries_after: str = Field(default="14:45")


# --- UI Migration: Enhanced Models ---

class Notification(SQLModel, table=True):
    """Notification for trade, risk, broker, and system alerts"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    time: datetime = Field(default_factory=datetime.utcnow)
    category: str = Field(default="system")  # trade, risk, broker, system
    level: str = Field(default="info")  # info, warning, error, critical
    title: str
    body: str
    read: bool = Field(default=False)


class UserSession(SQLModel, table=True):
    """Active user sessions for security tracking"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    device: str = Field(default="Unknown Device")
    location: str = Field(default="Unknown")
    ip_address: str = Field(default="0.0.0.0")
    last_active: datetime = Field(default_factory=datetime.utcnow)
    is_current: bool = Field(default=False)


class NotificationSettings(SQLModel, table=True):
    """User notification preferences"""
    id: int = Field(default=1, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    email_enabled: bool = Field(default=True)
    push_enabled: bool = Field(default=True)
    trade_alerts: bool = Field(default=True)
    risk_alerts: bool = Field(default=True)
    broker_alerts: bool = Field(default=True)
    system_alerts: bool = Field(default=True)
    channel_matrix_json: str = Field(default="{}")
    alert_rules_json: str = Field(default="{}")


class Instrument(SQLModel, table=True):
    """Market instrument data cache mapping symbols to broker tokens"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    symbol: str = Field(unique=True, index=True) # e.g. "RELIANCE-EQ" or "RELIANCE"
    segment: str = Field(default="EQ")  # EQ, FUT, OPT
    exchange: str = Field(default="NSE") # NSE, NFO, BSE
    
    # Token Mappings for different brokers
    angelone_token: Optional[str] = None
    zerodha_token: Optional[str] = None
    dhan_token: Optional[str] = None
    fyers_token: Optional[str] = None
    upstox_token: Optional[str] = None
    aliceblue_token: Optional[str] = None
    fivepaisa_token: Optional[str] = None
    kotakneo_token: Optional[str] = None
    
    ltp: float = Field(default=0.0)
    change_pct: float = Field(default=0.0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# --- New Tables for UI Features ---

class Holding(SQLModel, table=True):
    """Portfolio holdings (long-term equity positions)"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    symbol: str = Field(index=True)
    sector: str = Field(default="Others")
    qty: int = Field(default=0)
    avg_price: float = Field(default=0.0)
    ltp: float = Field(default=0.0)
    value: float = Field(default=0.0)
    pnl: float = Field(default=0.0)
    pnl_pct: float = Field(default=0.0)
    broker_id: Optional[str] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Webhook(SQLModel, table=True):
    """Webhook endpoints for external signal integration"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    name: str
    url: str = Field(unique=True, index=True)
    strategy_id: Optional[str] = Field(default=None)
    strategy_name: str = Field(default="")
    secret_hash: str = Field(default="")
    calls: int = Field(default=0)
    last_call: Optional[datetime] = Field(default=None)
    status: str = Field(default="active")  # "active" | "paused"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @staticmethod
    def generate_secret() -> tuple[str, str]:
        """Generate a secret and its hash"""
        secret = f"whsec_{secrets.token_hex(16)}"
        secret_hash = hashlib.sha256(secret.encode()).hexdigest()
        return secret, secret_hash


class ApiKey(SQLModel, table=True):
    """API keys for programmatic access"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    label: str
    key_hash: str = Field(index=True)
    key_masked: str  # "ak_live_9f2a••••••41b7"
    scopes: str = Field(default="read:*")  # comma-separated
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = Field(default=None)
    
    @staticmethod
    def generate_key() -> tuple[str, str, str]:
        """Generate an API key, its hash, and masked version"""
        key = f"ak_live_{secrets.token_hex(16)}"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        key_masked = f"ak_live_{key[8:12]}••••••{key[-4:]}"
        return key, key_hash, key_masked


class BacktestRun(SQLModel, table=True):
    """Backtest simulation runs"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    strategy_id: Optional[str] = Field(default=None)
    strategy_name: str
    period_start: datetime
    period_end: datetime
    starting_capital: float = Field(default=1000000.0)
    slippage_pct: float = Field(default=0.05)
    brokerage_per_order: float = Field(default=20.0)
    include_costs: bool = Field(default=True)
    
    # Results
    trades: int = Field(default=0)
    win_rate: float = Field(default=0.0)
    pnl: float = Field(default=0.0)
    max_drawdown: float = Field(default=0.0)
    sharpe: float = Field(default=0.0)
    profit_factor: float = Field(default=0.0)
    avg_win: float = Field(default=0.0)
    avg_loss: float = Field(default=0.0)
    
    status: str = Field(default="running")  # "running" | "completed" | "failed"
    results_json: str = Field(default="{}")  # Extended results
    equity_curve_json: str = Field(default="[]")  # Equity curve data points
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)


class DailyPnl(SQLModel, table=True):
    """Daily P&L records for reporting"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    date: datetime = Field(index=True)
    pnl: float = Field(default=0.0)
    trades: int = Field(default=0)
    charges: float = Field(default=0.0)  # Brokerage + taxes
    strategy_breakdown_json: str = Field(default="{}")  # P&L by strategy
    broker_breakdown_json: str = Field(default="{}")  # P&L by broker


class WebhookLog(SQLModel, table=True):
    """Webhook delivery logs"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    webhook_id: uuid.UUID = Field(foreign_key="webhook.id")
    time: datetime = Field(default_factory=datetime.utcnow)
    level: str = Field(default="info")  # info, warning, error
    message: str
    payload_json: str = Field(default="{}")
    response_status: Optional[int] = Field(default=None)
    latency_ms: Optional[int] = Field(default=None)


