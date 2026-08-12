"""UI Migration Schema Updates

Revision ID: 20260812_ui_migration
Revises: 96db291b2109
Create Date: 2026-08-12 00:00:00.000000

This migration adds all new tables and columns required for the
migrated UI from algo-desk-central:
- New tables: Holding, Webhook, ApiKey, BacktestRun, DailyPnl, WebhookLog
- Enhanced fields on: Strategy, BrokerCredential, Order, VirtualTrade, LogEntry, RiskSettings, NotificationSettings
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '20260812_ui_migration'
down_revision: Union[str, Sequence[str], None] = '96db291b2109'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =====================================================
    # CREATE NEW TABLES
    # =====================================================
    
    # 1. Holding table for portfolio holdings
    op.create_table(
        'holding',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('symbol', sa.String(50), nullable=False),
        sa.Column('sector', sa.String(50), server_default='Others'),
        sa.Column('qty', sa.Integer, server_default='0'),
        sa.Column('avg_price', sa.Float, server_default='0.0'),
        sa.Column('ltp', sa.Float, server_default='0.0'),
        sa.Column('value', sa.Float, server_default='0.0'),
        sa.Column('pnl', sa.Float, server_default='0.0'),
        sa.Column('pnl_pct', sa.Float, server_default='0.0'),
        sa.Column('broker_id', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('idx_holding_symbol', 'holding', ['symbol'])
    
    # 2. Webhook table for external signal integration
    op.create_table(
        'webhook',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('strategy_id', sa.String(50), nullable=True),
        sa.Column('strategy_name', sa.String(100), server_default=''),
        sa.Column('secret_hash', sa.String(64), server_default=''),
        sa.Column('calls', sa.Integer, server_default='0'),
        sa.Column('last_call', sa.DateTime, nullable=True),
        sa.Column('status', sa.String(20), server_default='active'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('idx_webhook_url', 'webhook', ['url'], unique=True)
    
    # 3. WebhookLog table for delivery logs
    op.create_table(
        'webhooklog',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('webhook_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('webhook.id'), nullable=False),
        sa.Column('time', sa.DateTime, server_default=sa.func.now()),
        sa.Column('level', sa.String(20), server_default='info'),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('payload_json', sa.Text, server_default='{}'),
        sa.Column('response_status', sa.Integer, nullable=True),
        sa.Column('latency_ms', sa.Integer, nullable=True),
    )
    
    # 4. ApiKey table for programmatic access
    op.create_table(
        'apikey',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('label', sa.String(100), nullable=False),
        sa.Column('key_hash', sa.String(64), nullable=False),
        sa.Column('key_masked', sa.String(50), nullable=False),
        sa.Column('scopes', sa.String(255), server_default='read:*'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('last_used', sa.DateTime, nullable=True),
    )
    op.create_index('idx_apikey_key_hash', 'apikey', ['key_hash'])
    
    # 5. BacktestRun table for backtest simulations
    op.create_table(
        'backtestrun',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('strategy_id', sa.String(50), nullable=True),
        sa.Column('strategy_name', sa.String(100), nullable=False),
        sa.Column('period_start', sa.DateTime, nullable=False),
        sa.Column('period_end', sa.DateTime, nullable=False),
        sa.Column('starting_capital', sa.Float, server_default='1000000.0'),
        sa.Column('slippage_pct', sa.Float, server_default='0.05'),
        sa.Column('brokerage_per_order', sa.Float, server_default='20.0'),
        sa.Column('include_costs', sa.Boolean, server_default='true'),
        sa.Column('trades', sa.Integer, server_default='0'),
        sa.Column('win_rate', sa.Float, server_default='0.0'),
        sa.Column('pnl', sa.Float, server_default='0.0'),
        sa.Column('max_drawdown', sa.Float, server_default='0.0'),
        sa.Column('sharpe', sa.Float, server_default='0.0'),
        sa.Column('profit_factor', sa.Float, server_default='0.0'),
        sa.Column('avg_win', sa.Float, server_default='0.0'),
        sa.Column('avg_loss', sa.Float, server_default='0.0'),
        sa.Column('status', sa.String(20), server_default='running'),
        sa.Column('results_json', sa.Text, server_default='{}'),
        sa.Column('equity_curve_json', sa.Text, server_default='[]'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime, nullable=True),
    )
    
    # 6. DailyPnl table for reporting
    op.create_table(
        'dailypnl',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('date', sa.DateTime, nullable=False),
        sa.Column('pnl', sa.Float, server_default='0.0'),
        sa.Column('trades', sa.Integer, server_default='0'),
        sa.Column('charges', sa.Float, server_default='0.0'),
        sa.Column('strategy_breakdown_json', sa.Text, server_default='{}'),
        sa.Column('broker_breakdown_json', sa.Text, server_default='{}'),
    )
    op.create_index('idx_dailypnl_date', 'dailypnl', ['date'])
    
    # =====================================================
    # ADD COLUMNS TO EXISTING TABLES
    # =====================================================
    
    # Strategy table - add 13 new columns
    op.add_column('strategy', sa.Column('segment', sa.String(50), server_default='Options'))
    op.add_column('strategy', sa.Column('description', sa.Text, server_default=''))
    op.add_column('strategy', sa.Column('brokers_json', sa.Text, server_default='[]'))
    op.add_column('strategy', sa.Column('open_positions', sa.Integer, server_default='0'))
    op.add_column('strategy', sa.Column('last_signal', sa.DateTime, nullable=True))
    op.add_column('strategy', sa.Column('mode', sa.String(20), server_default='Live'))
    op.add_column('strategy', sa.Column('instruments_json', sa.Text, server_default='[]'))
    op.add_column('strategy', sa.Column('entry_rules_json', sa.Text, server_default='[]'))
    op.add_column('strategy', sa.Column('exit_rules_json', sa.Text, server_default='[]'))
    op.add_column('strategy', sa.Column('risk_json', sa.Text, server_default='{}'))
    op.add_column('strategy', sa.Column('sizing_json', sa.Text, server_default='{}'))
    op.add_column('strategy', sa.Column('spark_data_json', sa.Text, server_default='[]'))
    op.add_column('strategy', sa.Column('webhook_enabled', sa.Boolean, server_default='false'))
    
    # BrokerCredential table - add 16 new columns
    op.add_column('brokercredential', sa.Column('code', sa.String(20), server_default=''))
    op.add_column('brokercredential', sa.Column('api_key_masked', sa.String(50), server_default=''))
    op.add_column('brokercredential', sa.Column('token_expiry', sa.DateTime, nullable=True))
    op.add_column('brokercredential', sa.Column('funds', sa.Float, server_default='0.0'))
    op.add_column('brokercredential', sa.Column('margin_used', sa.Float, server_default='0.0'))
    op.add_column('brokercredential', sa.Column('margin_available', sa.Float, server_default='0.0'))
    op.add_column('brokercredential', sa.Column('strategies_count', sa.Integer, server_default='0'))
    op.add_column('brokercredential', sa.Column('client_id', sa.String(50), server_default=''))
    op.add_column('brokercredential', sa.Column('auto_square_off', sa.String(10), server_default='15:20'))
    op.add_column('brokercredential', sa.Column('max_daily_loss', sa.Float, server_default='50000.0'))
    op.add_column('brokercredential', sa.Column('max_margin_util', sa.Float, server_default='70.0'))
    op.add_column('brokercredential', sa.Column('max_positions', sa.Integer, server_default='10'))
    op.add_column('brokercredential', sa.Column('leverage_cap', sa.Float, server_default='5.0'))
    op.add_column('brokercredential', sa.Column('last_connected', sa.DateTime, nullable=True))
    op.add_column('brokercredential', sa.Column('connection_status', sa.String(20), server_default='disconnected'))
    op.add_column('brokercredential', sa.Column('accent_hue', sa.String(30), server_default='var(--chart-1)'))
    
    # Order table - add 5 new columns
    op.add_column('order', sa.Column('segment', sa.String(10), server_default='EQ'))
    op.add_column('order', sa.Column('broker_id', sa.String(50), nullable=True))
    op.add_column('order', sa.Column('avg_fill', sa.Float, server_default='0.0'))
    op.add_column('order', sa.Column('rejection_reason', sa.Text, nullable=True))
    op.add_column('order', sa.Column('lifecycle_json', sa.Text, server_default='[]'))
    
    # VirtualTrade table - add 6 new columns (ltp and pnl_pct already exist)
    op.add_column('virtualtrade', sa.Column('segment', sa.String(10), server_default='EQ'))
    op.add_column('virtualtrade', sa.Column('broker_id', sa.String(50), nullable=True))
    op.add_column('virtualtrade', sa.Column('strategy_id', sa.String(50), nullable=True))
    op.add_column('virtualtrade', sa.Column('avg_price', sa.Float, server_default='0.0'))
    op.add_column('virtualtrade', sa.Column('day_change', sa.Float, server_default='0.0'))
    op.add_column('virtualtrade', sa.Column('trade_type', sa.String(20), server_default='Intraday'))
    
    # LogEntry table - add 1 new column
    op.add_column('logentry', sa.Column('source', sa.String(20), server_default='system'))
    
    # RiskSettings table - add 6 new columns
    op.add_column('risksettings', sa.Column('daily_loss_limit_pct', sa.Float, server_default='3.0'))
    op.add_column('risksettings', sa.Column('max_order_value', sa.Float, server_default='500000.0'))
    op.add_column('risksettings', sa.Column('max_per_trade_loss', sa.Float, server_default='25000.0'))
    op.add_column('risksettings', sa.Column('auto_kill_switch', sa.Boolean, server_default='true'))
    op.add_column('risksettings', sa.Column('vix_threshold', sa.Float, server_default='12.0'))
    op.add_column('risksettings', sa.Column('block_entries_after', sa.String(10), server_default='14:45'))
    
    # NotificationSettings table - add 2 new columns
    op.add_column('notificationsettings', sa.Column('channel_matrix_json', sa.Text, server_default='{}'))
    op.add_column('notificationsettings', sa.Column('alert_rules_json', sa.Text, server_default='{}'))


def downgrade() -> None:
    # Remove new columns from NotificationSettings
    op.drop_column('notificationsettings', 'alert_rules_json')
    op.drop_column('notificationsettings', 'channel_matrix_json')
    
    # Remove new columns from RiskSettings
    op.drop_column('risksettings', 'block_entries_after')
    op.drop_column('risksettings', 'vix_threshold')
    op.drop_column('risksettings', 'auto_kill_switch')
    op.drop_column('risksettings', 'max_per_trade_loss')
    op.drop_column('risksettings', 'max_order_value')
    op.drop_column('risksettings', 'daily_loss_limit_pct')
    
    # Remove new column from LogEntry
    op.drop_column('logentry', 'source')
    
    # Remove new columns from VirtualTrade
    op.drop_column('virtualtrade', 'trade_type')
    op.drop_column('virtualtrade', 'day_change')
    op.drop_column('virtualtrade', 'avg_price')
    op.drop_column('virtualtrade', 'strategy_id')
    op.drop_column('virtualtrade', 'broker_id')
    op.drop_column('virtualtrade', 'segment')
    
    # Remove new columns from Order
    op.drop_column('order', 'lifecycle_json')
    op.drop_column('order', 'rejection_reason')
    op.drop_column('order', 'avg_fill')
    op.drop_column('order', 'broker_id')
    op.drop_column('order', 'segment')
    
    # Remove new columns from BrokerCredential
    op.drop_column('brokercredential', 'accent_hue')
    op.drop_column('brokercredential', 'connection_status')
    op.drop_column('brokercredential', 'last_connected')
    op.drop_column('brokercredential', 'leverage_cap')
    op.drop_column('brokercredential', 'max_positions')
    op.drop_column('brokercredential', 'max_margin_util')
    op.drop_column('brokercredential', 'max_daily_loss')
    op.drop_column('brokercredential', 'auto_square_off')
    op.drop_column('brokercredential', 'client_id')
    op.drop_column('brokercredential', 'strategies_count')
    op.drop_column('brokercredential', 'margin_available')
    op.drop_column('brokercredential', 'margin_used')
    op.drop_column('brokercredential', 'funds')
    op.drop_column('brokercredential', 'token_expiry')
    op.drop_column('brokercredential', 'api_key_masked')
    op.drop_column('brokercredential', 'code')
    
    # Remove new columns from Strategy
    op.drop_column('strategy', 'webhook_enabled')
    op.drop_column('strategy', 'spark_data_json')
    op.drop_column('strategy', 'sizing_json')
    op.drop_column('strategy', 'risk_json')
    op.drop_column('strategy', 'exit_rules_json')
    op.drop_column('strategy', 'entry_rules_json')
    op.drop_column('strategy', 'instruments_json')
    op.drop_column('strategy', 'mode')
    op.drop_column('strategy', 'last_signal')
    op.drop_column('strategy', 'open_positions')
    op.drop_column('strategy', 'brokers_json')
    op.drop_column('strategy', 'description')
    op.drop_column('strategy', 'segment')
    
    # Drop indexes
    op.drop_index('idx_dailypnl_date', table_name='dailypnl')
    op.drop_index('idx_apikey_key_hash', table_name='apikey')
    op.drop_index('idx_webhook_url', table_name='webhook')
    op.drop_index('idx_holding_symbol', table_name='holding')
    
    # Drop new tables
    op.drop_table('dailypnl')
    op.drop_table('backtestrun')
    op.drop_table('apikey')
    op.drop_table('webhooklog')
    op.drop_table('webhook')
    op.drop_table('holding')
