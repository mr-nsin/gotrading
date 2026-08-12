import logging
import sys
import os
from datetime import datetime, timedelta

import torch
import torch.nn as nn
import torch.optim as optim

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from database import engine
from models import VirtualTrade
from sqlmodel import Session, select

# Optionally can import from optimizer.py
# import engine.ml.optimizer as rl_optimizer

logger = logging.getLogger(__name__)

class RLPolicyNet(nn.Module):
    """
    Stub PyTorch Model for Strategy Optimization
    """
    def __init__(self):
        super(RLPolicyNet, self).__init__()
        self.fc = nn.Linear(4, 2) # e.g. 4 state features -> 2 action predictions

    def forward(self, x):
        return self.fc(x)

class ModelTrainer:
    def __init__(self, model_path="daily_model.pth"):
        self.model_path = model_path
        self.model = RLPolicyNet()
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)
        self.loss_fn = nn.MSELoss()
        logger.info(f"ModelTrainer initialized. Weights will be saved to {self.model_path}")

    def train_daily_batch(self):
        """
        Query VirtualTrade for the previous day, calculate PnL,
        and feed it into the PyTorch models to update weights.
        """
        logger.info("Starting train_daily_batch for ML training loop...")
        
        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)
        start_of_yesterday = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_yesterday = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)

        with Session(engine) as session:
            statement = select(VirtualTrade).where(
                VirtualTrade.closed_at >= start_of_yesterday,
                VirtualTrade.closed_at <= end_of_yesterday,
                VirtualTrade.status == "CLOSED"
            )
            trades = session.exec(statement).all()

        if not trades:
            logger.info("No closed trades found for yesterday. Skipping training.")
            return

        daily_pnl = sum(trade.pnl for trade in trades)
        logger.info(f"Total PnL for yesterday ({yesterday.date()}): {daily_pnl}")

        # Stub: Feed the daily PnL as a reward/target into the PyTorch models to update weights
        self._update_weights(daily_pnl)

        # Save model step
        self.save_model()

    def _update_weights(self, pnl: float):
        """
        Stubbed deep PyTorch backward pass logic using the total_pnl.
        """
        self.model.train()
        
        # Dummy input (e.g. market state) and target (e.g. expected PnL reward)
        dummy_state = torch.tensor([[1.0, 15.0, 0.0, 7.0]], dtype=torch.float32)
        target_reward = torch.tensor([[float(pnl), float(pnl)]], dtype=torch.float32)
        
        # Forward pass
        predictions = self.model(dummy_state)
        
        # Calculate loss against PnL
        loss = self.loss_fn(predictions, target_reward)
        
        # Backward pass
        self.optimizer.zero_grad()
        loss.backward()
        
        # Optimizer step (update weights)
        self.optimizer.step()
        
        logger.info(f"PyTorch weights updated via backward pass. Loss: {loss.item():.4f}")

    def save_model(self):
        """
        Save the PyTorch model weights to disk.
        """
        # Ensure directory exists if saving in a nested path
        model_dir = os.path.dirname(os.path.abspath(self.model_path))
        if model_dir:
            os.makedirs(model_dir, exist_ok=True)
            
        torch.save(self.model.state_dict(), self.model_path)
        logger.info(f"Model successfully saved to {self.model_path}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    trainer = ModelTrainer()
    trainer.train_daily_batch()
