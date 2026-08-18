import logging
import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, select
from database import engine
from models import BrokerCredential, Notification
from engine.broker.angel_broker import AngelBroker

logger = logging.getLogger(__name__)

class BrokerSessionManager:
    """
    Automated Daily Session Refresher & Health Monitor.
    Runs every morning before market open (08:30 AM IST) to:
    1. Regenerate TOTP sessions for Angel One.
    2. Check connection health across all configured broker credentials.
    3. Alert user via Notification system if any broker token is expired.
    """

    @classmethod
    def refresh_daily_sessions(cls):
        logger.info("Executing daily morning broker session refresh...")
        with Session(engine) as session:
            brokers = session.exec(select(BrokerCredential)).all()

            for broker in brokers:
                code = (broker.code or "").upper()
                try:
                    if code in ("ANGEL", "SMARTAPI"):
                        angel = AngelBroker(user_id=broker.user_id, broker_id=broker.id)
                        if angel.smartApi:
                            broker.connection_status = "connected"
                            broker.last_connected = datetime.utcnow()
                            logger.info(f"Angel One session auto-refreshed successfully.")
                        else:
                            broker.connection_status = "token_expiring"
                            cls._create_alert(session, broker.user_id, "Angel One Session Warning", "TOTP session login required.")

                    elif code in ("KITE", "ZERODHA", "FYERS", "UPX"):
                        # Check token expiry (validity 24 hours)
                        if broker.token_expiry and broker.token_expiry < datetime.utcnow():
                            broker.connection_status = "token_expiring"
                            cls._create_alert(session, broker.user_id, f"{broker.code} Token Expired", "Please re-authenticate broker session.")
                        else:
                            broker.connection_status = "connected"

                    session.add(broker)
                except Exception as e:
                    logger.error(f"Error refreshing session for {broker.code}: {e}")

            session.commit()

    @staticmethod
    def _create_alert(session: Session, user_id, title: str, body: str):
        n = Notification(
            user_id=user_id,
            time=datetime.utcnow(),
            category="broker",
            level="warning",
            title=title,
            body=body,
            read=False
        )
        session.add(n)
