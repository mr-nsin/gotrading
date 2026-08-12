import logging
import gym
from gym import spaces
import numpy as np

# stable_baselines3 is assumed to be installed
from stable_baselines3 import PPO

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from database import engine
from models import VirtualTrade
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

class VirtualTradingEnv(gym.Env):
    metadata = {'render.modes': ['human']}

    def __init__(self):
        super(VirtualTradingEnv, self).__init__()
        self.action_space = spaces.Box(low=np.array([-0.05, -0.01]), high=np.array([0.05, 0.01]), dtype=np.float32)
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(4,), dtype=np.float32)

    def step(self, action):
        with Session(engine) as session:
            statement = select(VirtualTrade).where(VirtualTrade.status == "CLOSED")
            trades = session.exec(statement).all()
            
            # Handle possible None in trade.pnl
            total_pnl = sum((trade.pnl or 0.0) for trade in trades)
            reward = float(total_pnl)
            
        observation = np.array([15.0, 0.0, reward, 3.0], dtype=np.float32)
        done = False
        info = {}
        return observation, reward, done, info

    def reset(self):
        with Session(engine) as session:
            statement = select(VirtualTrade)
            trades = session.exec(statement).all()
            total_pnl = sum((trade.pnl or 0.0) for trade in trades) if trades else 0.0
            
        return np.array([15.0, 0.0, float(total_pnl), 7.0], dtype=np.float32)

    def render(self, mode='human', close=False):
        pass

def train_optimizer():
    logger.info("Initializing PyTorch PPO Agent for Strategy Optimization...")
    env = VirtualTradingEnv()
    model = PPO("MlpPolicy", env, verbose=1)
    model.learn(total_timesteps=10000)
    model.save("ppo_trading_agent")
    
    logger.info("Agent initialization stub complete. Ready to connect to PostgreSQL execution logs.")

if __name__ == "__main__":
    train_optimizer()
