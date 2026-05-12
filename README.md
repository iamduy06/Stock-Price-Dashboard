# StockStream Dashboard

Real-time stock price dashboard với streaming WebSocket architecture, chart visualization, và update frequency metrics.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ WatchList   │  │ Price Chart  │  │  Update Metrics      │  │
│  │ TickerCards │  │ (LW-Charts)  │  │  (UPS Gauge)         │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
│           │               │                    │               │
│           └───────────────┴────────────────────┘               │
│                           │ WebSocket                          │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                    SERVER (Node.js)                             │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │                   RelayManager                            │ │
│  │  - Client registry   - Subscription map                  │ │
│  │  - Broadcast engine  - UPS tracker (1s sliding window)   │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │               FinnhubClient (EventEmitter)                │ │
│  │  - WSS upstream      - Auto-reconnect (exp. backoff)     │ │
│  │  - Symbol subscribe  - Trade event parsing                │ │
│  └────────────────────────┬──────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────────┘
                            │ wss://ws.finnhub.io
┌───────────────────────────▼─────────────────────────────────────┐
│                   Finnhub.io API                                │
│         Real-time trades (stocks + crypto)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- **Sub-second updates**: WebSocket relay với 1s sliding window UPS tracker
- **Candlestick chart**: TradingView Lightweight Charts, real-time candle building từ tick data
- **Update frequency metrics**: Realtime updates/second per symbol, total tick count
- **Multi-symbol watchlist**: Subscribe/unsubscribe dynamic, hỗ trợ cả stocks (AAPL) và crypto (BINANCE:BTCUSDT)
- **Auto-reconnect**: Exponential backoff cho cả server↔Finnhub và client↔server
- **Historical candles**: REST API fallback cho OHLCV data theo timeframe

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js 20 + TypeScript |
| HTTP/WS server | Express 4 + ws 8 |
| Upstream data | Finnhub.io WebSocket API |
| Frontend | React 18 + TypeScript + Vite |
| Charts | TradingView Lightweight Charts v4 |
| State | Zustand 4 |
| Styling | Tailwind CSS v3 |

## Quick Start

### 1. Lấy Finnhub API key (miễn phí)

Đăng ký tại [finnhub.io](https://finnhub.io) → Dashboard → API Keys → copy key.

Free tier hỗ trợ: WebSocket real-time trades, REST quotes/candles, 60 req/min.

### 2. Setup server

```bash
cd server
npm install
cp ../.env.example .env
# Điền FINNHUB_API_KEY vào .env
npm run dev
```

Server chạy tại `http://localhost:3001`, WebSocket tại `ws://localhost:3001`.

### 3. Setup client

```bash
cd client
npm install
npm run dev
```

Client chạy tại `http://localhost:5173`.

## Environment Variables

```env
FINNHUB_API_KEY=your_key_here   # Bắt buộc - lấy từ finnhub.io
PORT=3001                        # Optional, default 3001
```

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quote/:symbol` | Current quote (price, change, volume) |
| GET | `/api/candles/:symbol?resolution=1&from=&to=` | OHLCV candles |

Resolution codes: `1` (1m), `5`, `15`, `30`, `60` (1h), `D` (1D), `W`, `M`

### WebSocket Protocol

**Client → Server:**
```json
{ "type": "subscribe", "symbol": "AAPL" }
{ "type": "unsubscribe", "symbol": "AAPL" }
```

**Server → Client:**
```json
// On connect
{ "type": "connected", "clientId": "...", "defaultSymbols": ["AAPL", ...] }

// On trade / snapshot
{
  "type": "trade",
  "symbol": "AAPL",
  "data": {
    "price": 182.45,
    "change": 1.23,
    "changePercent": 0.68,
    "high24h": 183.10,
    "low24h": 180.50,
    "volume24h": 45123456,
    "updatesPerSecond": 3.0,
    "updateCount": 142,
    "timestamp": 1699123456789
  }
}
```

## Update Frequency Evaluation

Dashboard hiển thị 3 metrics để đánh giá streaming performance:

| Metric | Mô tả |
|--------|-------|
| **UPS** | Updates/second - đếm tick nhận trong 1s sliding window |
| **Total ticks** | Tổng số trades nhận từ khi subscribe |
| **WS Status** | Connected / Reconnecting với latency indicator |

Với Finnhub free tier, stocks US thường: 1-5 UPS trong giờ giao dịch. Crypto BINANCE: 5-20 UPS.

## Project Structure

```
.
├── server/
│   ├── src/
│   │   ├── index.ts          # HTTP + WS server entry
│   │   ├── finnhub.ts        # Finnhub upstream client
│   │   ├── relay.ts          # Client relay + UPS tracker
│   │   └── routes/
│   │       ├── quotes.ts     # GET /api/quote/:symbol
│   │       └── candles.ts    # GET /api/candles/:symbol
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── PriceChart.tsx
│   │   │   ├── TickerCard.tsx
│   │   │   ├── UpdateMetrics.tsx
│   │   │   └── SymbolSearch.tsx
│   │   ├── hooks/
│   │   │   └── useStockWS.ts
│   │   └── store/
│   │       └── stockStore.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── .env.example
└── README.md
```
