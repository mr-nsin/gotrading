# Database Design Document

## ER Diagram (Text Representation)
```text
[ Users ] 1 ------ * [ BrokerCredentials ]
[ Users ] 1 ------ * [ Orders ]
[ Users ] 1 ------ * [ AuditLogs ]
[ Orders ] * ----- 1 [ AlgorithmicStrategies ]
```

## Tables

### `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | Unique User ID |
| email | VARCHAR | UNIQUE | Google Auth Email |
| subscription_tier | VARCHAR | DEFAULT "FREE" | FREE, PREMIUM |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation date |

### `broker_credentials`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | Credential ID |
| user_id | UUID | FK(users.id) | Belongs to User |
| fyers_app_id | VARCHAR | | Encrypted Fyers App ID |
| fyers_access_token | VARCHAR | | Daily rolling access token |

### `orders`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | Internal Order ID |
| broker_order_id| VARCHAR | | Fyers returned Order ID |
| user_id | UUID | FK(users.id) | Who placed the trade |
| symbol | VARCHAR | | e.g. NSE:NIFTY24JUN22000CE |
| side | VARCHAR | | BUY / SELL |
| quantity | INT | | |
| status | VARCHAR | | PENDING, FILLED, REJECTED |
| is_algo_trade | BOOLEAN | DEFAULT FALSE | If executed by ML Engine |

### `audit_logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | |
| user_id | UUID | FK(users.id) | |
| audio_s3_url | VARCHAR | | Link to raw voice command |
| transcript | TEXT | | "Nifty straddle becho" |
| parsed_json | JSONB | | The resulting JSON payload |
| created_at | TIMESTAMP | | SEBI compliance timestamp |
