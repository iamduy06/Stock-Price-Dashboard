# StockStream

Dashboard theo dõi giá cổ phiếu real-time, hỗ trợ mua/bán ảo, xem danh mục và lịch sử lệnh.

Dữ liệu lấy từ Finnhub (US stocks + crypto) và TCBS (cổ phiếu Việt Nam) qua WebSocket.

## Tính năng

- Giá real-time qua WebSocket, tốc độ cập nhật < 1s
- Biểu đồ nến (candlestick) xây từ tick data — TradingView Lightweight Charts
- Đo tốc độ cập nhật: updates/second theo từng symbol
- Watchlist động: thêm/xóa symbol, hỗ trợ `AAPL`, `BINANCE:BTCUSDT`, `VN:FPT`
- Đăng ký / đăng nhập, số dư ảo 100 triệu
- Đặt lệnh MUA/BÁN tức thì theo giá thị trường
- Xem danh mục, P&L, lịch sử giao dịch
- Auto-reconnect cả server↔Finnhub và client↔server

## Stack

| | |
|---|---|
| Server | Node.js 20 + TypeScript + Express 4 |
| WebSocket | ws 8 |
| Dữ liệu | Finnhub WebSocket + TCBS REST |
| Database | Supabase (PostgreSQL) |
| Client | React 18 + TypeScript + Vite |
| Charts | TradingView Lightweight Charts v4 |
| State | Zustand 4 |
| Styling | Tailwind CSS v3 |

## Cài đặt

### 1. Tài khoản cần có

- **Finnhub API key** (miễn phí): đăng ký tại [finnhub.io](https://finnhub.io) → Dashboard → API Keys
- **Supabase project**: tạo tại [supabase.com](https://supabase.com), lấy Project URL và Service Role Key

### 2. Setup database

Chạy file `server/src/database/schema.sql` trong Supabase SQL Editor để tạo bảng và function.

### 3. Cấu hình môi trường

```bash
cp .env.example server/.env
```

Điền vào `server/.env`:

```env
FINNHUB_API_KEY=...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...           # chuỗi random bất kỳ
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
```

### 4. Chạy server

```bash
cd server
npm install
npm run dev
```

### 5. Chạy client

```bash
cd client
npm install
npm run dev
```

Client: `http://localhost:5173` — Server: `http://localhost:3001`

## API

### Auth

| Method | Path | |
|--------|------|-|
| POST | `/api/auth/register` | Đăng ký (`username`, `password`) |
| POST | `/api/auth/login` | Đăng nhập, trả JWT |

### User (yêu cầu Bearer token)

| Method | Path | |
|--------|------|-|
| GET | `/api/user/me` | Thông tin tài khoản + số dư |
| GET | `/api/user/portfolio` | Danh mục + P&L |
| GET | `/api/user/orders` | Lịch sử lệnh (100 lệnh gần nhất) |
| GET/POST/DELETE | `/api/user/watchlist` | Quản lý watchlist |

### Trade (yêu cầu Bearer token)

| Method | Path | |
|--------|------|-|
| POST | `/api/trade/order` | Đặt lệnh (`symbol`, `type: BUY\|SELL`, `quantity`) |

### Market data

| Method | Path | |
|--------|------|-|
| GET | `/api/quote/:symbol` | Quote hiện tại |
| GET | `/api/candles/:symbol?resolution=1&from=&to=` | Nến OHLCV |
| GET | `/api/stats` | Thống kê WebSocket server |

API docs (Swagger UI): `http://localhost:3001/api/docs`

### WebSocket

Kết nối `ws://localhost:3001`, server gửi `connected` kèm danh sách symbol mặc định.

```json
// Subscribe / unsubscribe
{ "type": "subscribe",   "symbol": "AAPL" }
{ "type": "unsubscribe", "symbol": "AAPL" }

// Nhận trade event
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
    "updatesPerSecond": 3,
    "updateCount": 142,
    "timestamp": 1699123456789
  }
}
```

## Cấu trúc dự án

```
.
├── server/src/
│   ├── index.ts                    # Entry point, HTTP + WS server
│   ├── finnhub.ts                  # Finnhub WebSocket client
│   ├── tcbs.ts                     # TCBS client (VN stocks)
│   ├── relay.ts                    # Relay & UPS tracker
│   ├── db.ts                       # SQLite (candle cache)
│   ├── database/schema.sql         # Supabase schema + stored function
│   ├── config/supabase.ts
│   ├── middleware/timing.ts
│   ├── routes/                     # quotes, candles, symbols, stats
│   └── modules/
│       ├── auth/                   # register, login, JWT middleware
│       ├── trade/                  # place order
│       └── user/                   # portfolio, orders, watchlist
├── client/src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── TickerCard.tsx
│   │   ├── PriceChart.tsx
│   │   ├── TradingPanel.tsx
│   │   ├── SymbolSearch.tsx
│   │   └── UpdateMetrics.tsx
│   ├── hooks/useStockWS.ts
│   ├── store/stockStore.ts
│   ├── services/                   # apiService, authService
│   └── pages/                      # LoginPage, PortfolioPage
├── .env.example
└── README.md
```
