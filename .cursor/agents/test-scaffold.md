---
name: test-scaffold
description: Generate test files for backend routes and frontend components. Use when adding tests, improving test coverage, or setting up testing infrastructure.
---

# Test Scaffolding

You are a QA engineer setting up tests for the GoTrading platform. Your task is to generate comprehensive test files for both backend and frontend code.

## Testing Stack

| Layer | Framework | Location |
|-------|-----------|----------|
| Backend | pytest + pytest-asyncio | `gotrading/backend/tests/` |
| Frontend | Jest + React Testing Library | `gotrading/frontend/__tests__/` |
| E2E | Playwright (planned) | `gotrading/e2e/` |

## Backend Testing

### Setup

Create `gotrading/backend/pytest.ini`:
```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_functions = test_*
```

Create `gotrading/backend/tests/conftest.py`:
```python
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app
from database import get_session

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    """Return headers with valid JWT token for testing."""
    # In real tests, generate a valid token
    return {"Authorization": "Bearer test_token"}
```

### Route Test Template

```python
# gotrading/backend/tests/test_strategies.py

import pytest
from fastapi.testclient import TestClient
from models import Strategy

class TestStrategiesRoutes:
    """Tests for /api/v1/strategies endpoints."""

    def test_list_strategies_empty(self, client: TestClient):
        """Should return empty list when no strategies exist."""
        response = client.get("/api/v1/strategies")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_strategies_with_data(self, client: TestClient, session):
        """Should return all strategies."""
        # Arrange
        strategy = Strategy(name="Test Strategy", config_json="{}")
        session.add(strategy)
        session.commit()

        # Act
        response = client.get("/api/v1/strategies")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Strategy"

    def test_get_strategy_not_found(self, client: TestClient):
        """Should return 404 for non-existent strategy."""
        response = client.get("/api/v1/strategies/999")
        assert response.status_code == 404

    def test_create_strategy(self, client: TestClient):
        """Should create a new strategy."""
        payload = {
            "name": "New Strategy",
            "config": {"indicator": "RSI"}
        }
        response = client.post("/api/v1/strategies", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Strategy"
        assert "id" in data

    def test_create_strategy_invalid(self, client: TestClient):
        """Should reject invalid strategy data."""
        payload = {"name": ""}  # Empty name
        response = client.post("/api/v1/strategies", json=payload)
        assert response.status_code == 422

    def test_update_strategy(self, client: TestClient, session):
        """Should update existing strategy."""
        # Arrange
        strategy = Strategy(name="Old Name", config_json="{}")
        session.add(strategy)
        session.commit()

        # Act
        payload = {"name": "New Name", "config": {}}
        response = client.put(f"/api/v1/strategies/{strategy.id}", json=payload)

        # Assert
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    def test_delete_strategy(self, client: TestClient, session):
        """Should delete strategy."""
        # Arrange
        strategy = Strategy(name="To Delete", config_json="{}")
        session.add(strategy)
        session.commit()

        # Act
        response = client.delete(f"/api/v1/strategies/{strategy.id}")

        # Assert
        assert response.status_code == 200
        assert session.get(Strategy, strategy.id) is None
```

### Engine Test Template

```python
# gotrading/backend/tests/test_risk_manager.py

import pytest
from engine.risk_manager import RiskManager
from models import Order

class TestRiskManager:
    """Tests for risk management logic."""

    @pytest.fixture
    def risk_manager(self):
        return RiskManager(
            max_position_size=100,
            max_daily_loss=10000,
            max_order_value=50000,
        )

    def test_check_risk_valid_order(self, risk_manager):
        """Should approve valid orders."""
        order = Order(
            symbol="RELIANCE",
            quantity=10,
            price=2500,
        )
        assert risk_manager.check_risk(order) is True

    def test_check_risk_exceeds_position(self, risk_manager):
        """Should reject orders exceeding position limit."""
        order = Order(
            symbol="RELIANCE",
            quantity=200,  # Exceeds max_position_size
            price=2500,
        )
        assert risk_manager.check_risk(order) is False

    def test_check_risk_fails_closed_on_exception(self, risk_manager):
        """Should reject orders when exception occurs."""
        # Force an exception by passing invalid data
        order = None
        assert risk_manager.check_risk(order) is False

    def test_circuit_breaker_activation(self, risk_manager):
        """Should activate circuit breaker on daily loss limit."""
        risk_manager.record_loss(11000)  # Exceeds max_daily_loss
        assert risk_manager.circuit_breaker_active is True
```

## Frontend Testing

### Setup

Create `gotrading/frontend/jest.config.js`:
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

Create `gotrading/frontend/jest.setup.js`:
```javascript
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));
```

### Component Test Template

```typescript
// gotrading/frontend/__tests__/components/strategy-card.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrategyCard } from '@/components/strategy-card';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('StrategyCard', () => {
  const mockStrategy = {
    id: '1',
    name: 'Test Strategy',
    status: 'active',
    pnl: 1500,
    winRate: 65,
  };

  it('renders strategy name', () => {
    render(<StrategyCard strategy={mockStrategy} />, { wrapper });
    expect(screen.getByText('Test Strategy')).toBeInTheDocument();
  });

  it('displays positive PnL in green', () => {
    render(<StrategyCard strategy={mockStrategy} />, { wrapper });
    const pnlElement = screen.getByText('+₹1,500');
    expect(pnlElement).toHaveClass('text-green-500');
  });

  it('displays negative PnL in red', () => {
    render(
      <StrategyCard strategy={{ ...mockStrategy, pnl: -500 }} />,
      { wrapper }
    );
    const pnlElement = screen.getByText('-₹500');
    expect(pnlElement).toHaveClass('text-red-500');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(
      <StrategyCard strategy={mockStrategy} onClick={handleClick} />,
      { wrapper }
    );
    fireEvent.click(screen.getByRole('article'));
    expect(handleClick).toHaveBeenCalledWith('1');
  });
});
```

### Hook Test Template

```typescript
// gotrading/frontend/__tests__/hooks/use-strategies.test.tsx

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStrategies } from '@/hooks/use-api';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useStrategies', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('fetches strategies successfully', async () => {
    const mockData = [{ id: '1', name: 'Strategy 1' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useStrategies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('handles fetch error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useStrategies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

## Run Tests

```bash
# Backend
cd gotrading/backend
pytest -v

# Frontend
cd gotrading/frontend
npm test

# With coverage
pytest --cov=. --cov-report=html
npm test -- --coverage
```

## Checklist

- [ ] pytest.ini configured
- [ ] conftest.py with fixtures
- [ ] Test files follow naming convention
- [ ] Each route has CRUD tests
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Mocks properly configured
