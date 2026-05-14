import express from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { FinnhubClient } from './finnhub';
import { TcbsClient } from './tcbs';
import { RelayManager } from './relay';
import { RawTrade } from './types';
import { makeTradeRouter } from './modules/trade/trade.routes';
import authRouter from './modules/auth/auth.routes';
import { makeUserRouter } from './modules/user/user.routes';
import rateLimit from 'express-rate-limit';
import { initDb } from './db';
import quotesRouter from './routes/quotes';
import candlesRouter from './routes/candles';
import symbolsRouter from './routes/symbols';

dotenv.config();

initDb();

const DEFAULT_FINNHUB_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA',
  'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT',
];

const DEFAULT_VN_TICKERS = ['VNM', 'VCB', 'FPT', 'VHM', 'HPG'];

const DEFAULT_SYMBOLS = [
  ...DEFAULT_FINNHUB_SYMBOLS,
  ...DEFAULT_VN_TICKERS.map(t => `VN:${t}`),
];

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const relay = new RelayManager();

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/api/stats', (_req, res) => res.json(relay.getStats()));
app.use('/api/trade', makeTradeRouter(relay));
app.use('/api/auth',  authLimiter, authRouter);
app.use('/api/user',  makeUserRouter(relay));
app.use('/api/quote',   quotesRouter);
app.use('/api/candles', candlesRouter);
app.use('/api/symbols', symbolsRouter);

const finnhub = new FinnhubClient(process.env.FINNHUB_API_KEY ?? '');
const tcbs = new TcbsClient();

finnhub.on('trade', (trade) => relay.onTrade(trade));
tcbs.on('trade', (trade) => relay.onTrade(trade));

async function seedFinnhubQuote(symbol: string): Promise<void> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return;
  try {
    const { data } = await axios.get('https://finnhub.io/api/v1/quote', {
      params: { symbol, token },
      timeout: 5000,
    });

    if (!data.c) return;
    relay.onTrade({
      symbol,
      price: data.c,
      volume: 0,
      timestamp: Date.now(),
      ...(data.pc ? { prevClose: data.pc } : {}),
    } as RawTrade);
  } catch {
    // Silence errors during seeding
  }
}

finnhub.on('connected', () => {
  DEFAULT_FINNHUB_SYMBOLS.forEach(sym => finnhub.subscribe(sym));

  DEFAULT_FINNHUB_SYMBOLS.forEach((sym, i) => {
    setTimeout(() => void seedFinnhubQuote(sym), i * 200);
  });
});

finnhub.connect();

DEFAULT_VN_TICKERS.forEach(t => tcbs.subscribe(t));
tcbs.start();

const WS_VN_TICKER_RE   = /^[A-Z0-9]{1,10}$/;
const WS_CRYPTO_RE      = /^[A-Z0-9]{1,20}:[A-Z0-9]{1,20}$/;
const WS_US_TICKER_RE   = /^[A-Z]{1,10}$/;

function isValidWsSymbol(sym: string): boolean {
  if (sym.startsWith('VN:')) return WS_VN_TICKER_RE.test(sym.slice(3));
  if (sym.includes(':'))    return WS_CRYPTO_RE.test(sym);
  return WS_US_TICKER_RE.test(sym);
}

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  relay.addClient(clientId, ws);

  const welcome = JSON.stringify({
    type: 'connected',
    clientId,
    defaultSymbols: DEFAULT_SYMBOLS,
  });
  ws.send(welcome);

  ws.on('message', (raw: Buffer) => {
    const msg = raw.toString();

    try {
      const parsed = JSON.parse(msg);
      const sym: string = typeof parsed.symbol === 'string' ? parsed.symbol.toUpperCase() : '';
      if (!sym) return;

      if (!isValidWsSymbol(sym)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid symbol format' }));
        return;
      }

      relay.handleClientMessage(clientId, JSON.stringify({ ...parsed, symbol: sym }));

      if (parsed.type === 'subscribe') {
        if (sym.startsWith('VN:')) {
          tcbs.subscribe(sym.slice(3));
        } else {
          finnhub.subscribe(sym);
          void seedFinnhubQuote(sym);
        }
      } else if (parsed.type === 'unsubscribe') {
        if (sym.startsWith('VN:')) {
          tcbs.unsubscribe(sym.slice(3));
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  });

  ws.on('close', () => relay.removeClient(clientId));

  ws.on('error', (err) => {
    console.error(`[WS] Client ${clientId} error:`, err.message);
    relay.removeClient(clientId);
  });
});

const PORT = Number(process.env.PORT ?? 3001);
server.listen(PORT, () => {
  console.log(`[Server] Real-time Streaming Relay listening on port ${PORT}`);
  console.log(`[Server] Default symbols: ${DEFAULT_SYMBOLS.join(', ')}`);
});

process.on('SIGTERM', () => {
  finnhub.destroy();
  tcbs.destroy();
  server.close(() => process.exit(0));
});
