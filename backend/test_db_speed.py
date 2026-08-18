import cProfile
import sys
sys.path.append('.')
from database import get_session
from models import Strategy
from sqlmodel import select

cProfile.run('session = next(get_session()); session.exec(select(Strategy)).all()', sort='cumtime')
