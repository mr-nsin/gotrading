import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trading.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# SECURITY FIX: Only enable SQL echo in debug mode
# echo=True logs all SQL queries including potentially sensitive data
DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
engine = create_engine(DATABASE_URL, echo=DEBUG_MODE, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    
    # Auto-migration helper for adding missing columns if existing tables lack them
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # Check brokercredential table
        if inspector.has_table("brokercredential"):
            columns = [c["name"] for c in inspector.get_columns("brokercredential")]
            add_cols = [
                ("fyers_app_id", "VARCHAR"),
                ("fyers_access_token", "VARCHAR"),
                ("zerodha_api_key", "VARCHAR"),
                ("dhan_client_id", "VARCHAR"),
                ("angelone_api_key", "VARCHAR"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE brokercredential ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                    except Exception as e:
                        print(f"Migration notice for {col_name}: {e}")

        # Check order table
        if inspector.has_table("order"):
            columns = [c["name"] for c in inspector.get_columns("order")]
            add_cols = [
                ("order_type", "VARCHAR"),
                ("product", "VARCHAR"),
                ("exchange", "VARCHAR"),
                ("average_price", "FLOAT"),
                ("filled_quantity", "INTEGER"),
                ("strategy_id", "VARCHAR"),
                ("timestamp", "TIMESTAMP"),
                ("error_message", "VARCHAR"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f'ALTER TABLE "order" ADD COLUMN {col_name} {col_type};'))
                        conn.commit()
                    except Exception as e:
                        print(f"Migration notice for {col_name}: {e}")

        # Check virtualtrade table
        if inspector.has_table("virtualtrade"):
            columns = [c["name"] for c in inspector.get_columns("virtualtrade")]
            float_type = "FLOAT" if DATABASE_URL.startswith("sqlite") else "DOUBLE PRECISION"
            add_cols = [
                ("ltp", float_type),
                ("pnl_pct", float_type),
                ("segment", "VARCHAR"),
                ("broker_id", "VARCHAR"),
                ("strategy_id", "VARCHAR"),
                ("avg_price", float_type),
                ("day_change", float_type),
                ("trade_type", "VARCHAR"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE virtualtrade ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                    except Exception as e:
                        print(f"Migration notice for virtualtrade.{col_name}: {e}")
        
        # Check strategy table for new UI columns
        if inspector.has_table("strategy"):
            columns = [c["name"] for c in inspector.get_columns("strategy")]
            add_cols = [
                ("segment", "VARCHAR"),
                ("description", "TEXT"),
                ("brokers_json", "TEXT"),
                ("open_positions", "INTEGER"),
                ("last_signal", "TIMESTAMP"),
                ("mode", "VARCHAR"),
                ("instruments_json", "TEXT"),
                ("entry_rules_json", "TEXT"),
                ("exit_rules_json", "TEXT"),
                ("risk_json", "TEXT"),
                ("sizing_json", "TEXT"),
                ("spark_data_json", "TEXT"),
                ("webhook_enabled", "BOOLEAN"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE strategy ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                    except Exception as e:
                        print(f"Migration notice for strategy.{col_name}: {e}")
        
        # Check brokercredential table for new UI columns
        if inspector.has_table("brokercredential"):
            columns = [c["name"] for c in inspector.get_columns("brokercredential")]
            float_type = "FLOAT" if DATABASE_URL.startswith("sqlite") else "DOUBLE PRECISION"
            add_cols = [
                ("code", "VARCHAR"),
                ("api_key_masked", "VARCHAR"),
                ("token_expiry", "TIMESTAMP"),
                ("funds", float_type),
                ("margin_used", float_type),
                ("margin_available", float_type),
                ("strategies_count", "INTEGER"),
                ("client_id", "VARCHAR"),
                ("auto_square_off", "VARCHAR"),
                ("max_daily_loss", float_type),
                ("max_margin_util", float_type),
                ("max_positions", "INTEGER"),
                ("leverage_cap", float_type),
                ("last_connected", "TIMESTAMP"),
                ("connection_status", "VARCHAR"),
                ("accent_hue", "VARCHAR"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE brokercredential ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                    except Exception as e:
                        print(f"Migration notice for brokercredential.{col_name}: {e}")
        
        # Check order table for new UI columns
        if inspector.has_table("order"):
            columns = [c["name"] for c in inspector.get_columns("order")]
            float_type = "FLOAT" if DATABASE_URL.startswith("sqlite") else "DOUBLE PRECISION"
            add_cols = [
                ("segment", "VARCHAR"),
                ("broker_id", "VARCHAR"),
                ("avg_fill", float_type),
                ("rejection_reason", "TEXT"),
                ("lifecycle_json", "TEXT"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f'ALTER TABLE "order" ADD COLUMN {col_name} {col_type};'))
                        conn.commit()
                    except Exception as e:
                        print(f"Migration notice for order.{col_name}: {e}")
        
        # Check logentry table for source column
        if inspector.has_table("logentry"):
            columns = [c["name"] for c in inspector.get_columns("logentry")]
            if "source" not in columns:
                try:
                    conn.execute(text("ALTER TABLE logentry ADD COLUMN source VARCHAR;"))
                    conn.commit()
                except Exception as e:
                    print(f"Migration notice for logentry.source: {e}")
        
        # Check notificationsettings table for new columns
        if inspector.has_table("notificationsettings"):
            columns = [c["name"] for c in inspector.get_columns("notificationsettings")]
            add_cols = [
                ("channel_matrix_json", "TEXT"),
                ("alert_rules_json", "TEXT"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE notificationsettings ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                    except Exception as e:
                        print(f"Migration notice for notificationsettings.{col_name}: {e}")

try:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker

    ASYNC_DATABASE_URL = DATABASE_URL
    if ASYNC_DATABASE_URL.startswith("postgresql://"):
        ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif ASYNC_DATABASE_URL.startswith("sqlite:///"):
        ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

    if ASYNC_DATABASE_URL.startswith("postgresql+asyncpg"):
        async_engine = create_async_engine(
            ASYNC_DATABASE_URL,
            echo=False,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True
        )
    else:
        async_engine = create_async_engine(
            ASYNC_DATABASE_URL,
            echo=False
        )

    AsyncSessionLocal = sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async def get_async_session():
        async with AsyncSessionLocal() as session:
            yield session
except ImportError as err:
    print(f"Notice: asyncpg/aiosqlite driver not installed ({err}). Using default engine session.")
    async def get_async_session():
        with Session(engine) as session:
            yield session

def get_session():
    with Session(engine) as session:
        yield session
