# Wireframe Document (Text-Based)

## 1. Main Trading Dashboard (Mid-Fidelity Layout)
```text
+---------------------------------------------------------+
| [Logo] 3Option      |  Margin: ₹5,00,000  |  [Profile]  |
+---------------------------------------------------------+
| [ Sidebar ] | [ Main Area - Real Time P&L Grid ]        |
| - Dashboard | Symbol       | Qty | LTP   | MTM          |
| - Algos     | NIFTY 24000  | 50  | 120.5 | +₹1,500      |
| - History   | NIFTY 23500  | -50 | 80.2  | -₹500        |
| - Settings  |-------------------------------------------|
|             | Net MTM: +₹1,000    |  Max Drawdown: 2%   |
|             +-------------------------------------------+
|             | [ BIG RED MICROPHONE BUTTON ]             |
|             | "Hold to speak your trade..."             |
+---------------------------------------------------------+
```

## 2. Pre-Trade Confirmation Modal
```text
+---------------------------------------------------------+
| Confirm Strategy: IRON CONDOR                           |
+---------------------------------------------------------+
| You said: "Sell 24000 CE/PE, Buy hedges 500 points away"|
|                                                         |
| Legs:                                                   |
| 1. SELL NIFTY 24000 CE x 50                             |
| 2. SELL NIFTY 24000 PE x 50                             |
| 3. BUY NIFTY 24500 CE x 50                              |
| 4. BUY NIFTY 23500 PE x 50                              |
|                                                         |
| Est. Margin: ₹1,20,000 | Max Loss: ₹25,000              |
|                                                         |
| [ CANCEL ]                           [ EXECUTE NOW ]    |
+---------------------------------------------------------+
```
