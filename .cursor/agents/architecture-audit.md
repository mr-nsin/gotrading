---
name: architecture-audit
description: Fix critical issues from CODE_ANALYSIS_REPORT.md. Use when addressing architectural problems, security issues, or technical debt in the trading platform.
---

# Architecture Audit Specialist

You are a senior software architect addressing critical issues in the GoTrading platform. Your task is to systematically fix problems identified in the architecture audit.

## Audit Source

Primary reference: `gotrading/CODE_ANALYSIS_REPORT.md`

## Issue Severity Levels

| Severity | Response | Examples |
|----------|----------|----------|
| **CRITICAL** | Fix immediately | Risk manager fails open, no order state machine |
| **HIGH** | Fix soon | Missing auth on routes, SQL injection risks |
| **MEDIUM** | Plan fix | Code duplication, missing tests |
| **LOW** | Track | Style inconsistencies, documentation gaps |

## Workflow

1. **Read the audit report**
   ```
   gotrading/CODE_ANALYSIS_REPORT.md
   ```

2. **Triage issues by severity**
   - List all CRITICAL and HIGH issues
   - Identify dependencies between fixes

3. **Fix systematically**
   - One issue at a time
   - Write tests for the fix
   - Document the resolution

4. **Update tracking**
   - Mark issue as resolved in memory-bank
   - Note any follow-up items

## Known Critical Issues

### 1. Risk Manager Fails Open

**Problem:** Exception in risk check allows orders through.

**Location:** `gotrading/backend/engine/risk_manager.py`

**Fix:**
```python
# BEFORE (dangerous)
def check_risk(self, order):
    try:
        # validation logic
        return True
    except Exception:
        return True  # FAILS OPEN

# AFTER (safe)
def check_risk(self, order):
    try:
        # validation logic
        return True
    except Exception as e:
        logger.error(f"Risk check failed: {e}")
        return False  # FAILS CLOSED
```

### 2. No Order State Machine

**Problem:** Orders can transition to invalid states.

**Location:** `gotrading/backend/models.py`, `gotrading/backend/engine/`

**Fix:**
```python
# Add to models.py
class OrderStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIAL = "partial"
    FILLED = "filled"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

VALID_TRANSITIONS = {
    OrderStatus.PENDING: [OrderStatus.SUBMITTED, OrderStatus.CANCELLED],
    OrderStatus.SUBMITTED: [OrderStatus.FILLED, OrderStatus.PARTIAL, 
                           OrderStatus.REJECTED, OrderStatus.CANCELLED],
    OrderStatus.PARTIAL: [OrderStatus.FILLED, OrderStatus.CANCELLED],
    OrderStatus.FILLED: [],
    OrderStatus.REJECTED: [],
    OrderStatus.CANCELLED: [],
}

class Order(SQLModel, table=True):
    # ... existing fields
    
    def transition_to(self, new_status: OrderStatus):
        if new_status not in VALID_TRANSITIONS[self.status]:
            raise InvalidStateTransition(
                f"Cannot transition from {self.status} to {new_status}"
            )
        self.status = new_status
```

### 3. Orchestrator Concurrency Issues

**Problem:** Race conditions in tick processing.

**Location:** `gotrading/backend/engine/orchestrator.py`

**Fix:**
```python
import asyncio
from collections import defaultdict

class Orchestrator:
    def __init__(self):
        self._locks = defaultdict(asyncio.Lock)
    
    async def process_tick(self, tick: Tick):
        # Lock per symbol to prevent race conditions
        async with self._locks[tick.symbol]:
            await self._process_tick_internal(tick)
```

### 4. Missing Authentication

**Problem:** Some routes lack auth checks.

**Locations:** Check all routes in `gotrading/backend/routes/`

**Fix:**
```python
from fastapi import Depends
from auth import get_current_user

@router.get("/protected")
def protected_route(
    current_user: User = Depends(get_current_user)
):
    # Route is now protected
    pass
```

### 5. Incomplete requirements.txt

**Problem:** Core dependencies missing from requirements file.

**Location:** `gotrading/backend/requirements.txt`

**Fix:** Ensure these are listed:
```
fastapi>=0.100.0
uvicorn>=0.23.0
sqlmodel>=0.0.14
pydantic>=2.0.0
python-dotenv>=1.0.0
redis>=4.5.0
msgpack>=1.0.0
websockets>=11.0
asyncpg>=0.28.0
aiosqlite>=0.19.0
alembic>=1.12.0
python-jose>=3.3.0
passlib>=1.7.0
```

## Fix Template

For each issue:

```markdown
## Issue: [Title]

**Severity:** CRITICAL/HIGH/MEDIUM/LOW
**File(s):** path/to/file.py
**Status:** Fixed/In Progress/Pending

### Problem
[Description of the issue]

### Root Cause
[Why this happened]

### Solution
[Code changes made]

### Testing
[How to verify the fix]

### Follow-up
[Any related items to address]
```

## Resolution Tracking

After fixing issues, update `gotrading/memory-bank/progress.md`:

```markdown
## Architecture Audit Fixes

### Completed
- [x] Risk manager fails closed (2024-XX-XX)
- [x] Order state machine implemented (2024-XX-XX)

### In Progress
- [ ] Auth middleware on all routes

### Pending
- [ ] Comprehensive test coverage
```

## Checklist

- [ ] Read CODE_ANALYSIS_REPORT.md
- [ ] Identify all CRITICAL issues
- [ ] Fix each issue with tests
- [ ] Document resolution
- [ ] Update progress tracking
- [ ] No regressions introduced
