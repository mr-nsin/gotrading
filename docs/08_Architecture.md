# Technical Architecture Document

## High Level Architecture
```text
[ Next.js Frontend ] -> (WebSocket / MessagePack) -> [ Nginx API Gateway ]
       |                                                    |
       v                                                    v
[ Zustand State ]                                  [ FastAPI Backend ]
                                                            |
                                        +-------------------+--------------------+
                                        |                   |                    |
                                 [ Redis Cache ]     [ PostgreSQL DB ]    [ ML Models (.pt) ]
                                 (Tick Pub/Sub)      (Users/Audit Logs)   (RLlib / PyTorch)
                                        |
                                        v
                               [ Fyers WebSocket/REST APIs ]
```

## Technology Stack

### Frontend
*   **Framework:** Next.js 14 (App Router)
*   **State:** Zustand (Optimized for frequent tick updates without re-renders)
*   **Styling:** Tailwind CSS
*   **Data Parsing:** `msgpack-lite`

### Backend
*   **Framework:** Python FastAPI
*   **Concurrency:** `asyncio` for high-throughput websocket handling
*   **AI/NLP:** Sarvam AI (Hinglish STT), OpenAI (JSON Structuring)
*   **ML Engine:** PyTorch (Inference), Ray RLlib (Training)

### Database & Cache
*   **Database:** PostgreSQL 14 (ACID compliance for order execution states)
*   **ORM:** SQLModel / SQLAlchemy
*   **Cache:** Redis (Pub/Sub for market data streaming across scaling instances)

### Infrastructure (Target)
*   **Cloud:** AWS
*   **Compute:** EC2 (T4g.medium for API, G4dn for ML inference)
*   **Load Balancing:** ALB (Application Load Balancer) supporting WebSockets.
