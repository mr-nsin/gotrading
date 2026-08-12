# Antigravity Trading Platform - Development Rules

These rules dictate strict boundaries for AI agent execution to maintain code quality, avoid hallucinations, and optimize for product development speed.

## 1. Code Generation Constraints
- **No Unnecessary Code (Bloat Prevention):** DO NOT generate extra classes, files, or utilities unless explicitly required for the current task. Always evaluate if existing code can be reused.
- **Critical Code Reviewer Mode:** Frequently act as a critic of existing code. Proactively suggest simplifications, removal of unused dependencies, and optimizations. If bloated code is found, prune it.
- **Mock Data Ban:** Do not generate mock data or interval simulators unless connecting to the real backend is impossible. Always wire frontend directly to real FastAPI endpoints.

## 2. Conversation & Product Workflow Rules
- **Progress Tracking:** At the end of EVERY response prompt, explicitly list:
  1. What features have just been completed.
  2. What features are pending/upcoming next.
- **Product Questioning:** At the end of EVERY response prompt, ask exactly **one** clarifying, product-related question. This helps accelerate product development and clear ambiguity before assumptions are made.

## 3. High-Frequency Trading Constraints
- **Performance First:** All Python backend code must be optimized for speed. Use async loops, O(1) lookups, and avoid blocking operations.
- **Binary Data:** Use `msgpack` or similar binary formats over WebSockets instead of JSON to minimize serialization latency.
