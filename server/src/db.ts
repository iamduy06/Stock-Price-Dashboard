import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH  = path.join(DATA_DIR, 'stockstream.db');

let _db: Database.Database;

export function initDb(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  _db = new Database(DB_PATH);

  // Performance tuning
  _db.pragma('journal_mode = WAL');    // concurrent reads while writing
  _db.pragma('synchronous = NORMAL');  // safe + fast
  _db.pragma('cache_size = -32000');   // 32 MB page cache
  _db.pragma('temp_store = MEMORY');

  _db.exec(`
    -- ── Historical OHLCV candles ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS candles (
      symbol      TEXT    NOT NULL,
      resolution  TEXT    NOT NULL,
      timestamp   INTEGER NOT NULL,   -- Unix seconds UTC
      open        REAL    NOT NULL,
      high        REAL    NOT NULL,
      low         REAL    NOT NULL,
      close       REAL    NOT NULL,
      volume      REAL    NOT NULL DEFAULT 0,
      PRIMARY KEY (symbol, resolution, timestamp)
    );

    -- Primary lookup: by symbol + resolution + time range
    CREATE INDEX IF NOT EXISTS idx_candles_range
      ON candles (symbol, resolution, timestamp);

    -- ── Request latency log ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS request_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint    TEXT    NOT NULL,
      method      TEXT    NOT NULL,
      status      INTEGER NOT NULL,
      duration_ms REAL    NOT NULL,
      ts          INTEGER NOT NULL    -- Unix seconds
    );

    CREATE INDEX IF NOT EXISTS idx_reqlog_endpoint
      ON request_log (endpoint, ts);
  `);

  console.log(`[DB] SQLite ready → ${DB_PATH}`);
  return _db;
}

export function getDb(): Database.Database {
  return _db;
}

// ── Candle cache ─────────────────────────────────────────────────────────────

export interface CandleRow {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const stmtGetCandles = () => _db.prepare<[string, string, number, number]>(`
  SELECT timestamp AS time, open, high, low, close, volume
  FROM   candles
  WHERE  symbol = ? AND resolution = ? AND timestamp >= ? AND timestamp <= ?
  ORDER  BY timestamp ASC
`);

const stmtInsertCandle = () => _db.prepare<[string, string, number, number, number, number, number, number]>(`
  INSERT OR REPLACE INTO candles
    (symbol, resolution, timestamp, open, high, low, close, volume)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

export function getCachedCandles(
  symbol: string, resolution: string, from: number, to: number
): CandleRow[] {
  return stmtGetCandles().all(symbol, resolution, from, to) as CandleRow[];
}

export function saveCandles(
  symbol: string, resolution: string, candles: CandleRow[]
): void {
  if (!candles.length) return;
  const insert = stmtInsertCandle();
  const run = _db.transaction(() => {
    for (const c of candles)
      insert.run(symbol, resolution, c.time, c.open, c.high, c.low, c.close, c.volume);
  });
  run();
}

/**
 * Hybrid cache strategy:
 *   - Historical data (older than RECENT_WINDOW) → served from SQLite (fast, ~1 ms)
 *   - Recent data (last RECENT_WINDOW seconds)   → always re-fetched from API (accurate)
 * On a cache miss for historical, the API is called once and the result is stored permanently.
 */
const RECENT_WINDOW = 24 * 3600; // 24 h

export async function getCandlesWithCache(
  symbol: string,
  resolution: string,
  from: number,
  to: number,
  apiFetch: (from: number, to: number) => Promise<CandleRow[]>
): Promise<CandleRow[]> {
  const now = Math.floor(Date.now() / 1000);
  const boundary = now - RECENT_WINDOW; // older than this → historical

  const parts: CandleRow[] = [];

  // 1. Historical portion: try cache first
  if (from < boundary) {
    const histTo = Math.min(to, boundary);
    const cached = getCachedCandles(symbol, resolution, from, histTo);
    if (cached.length > 0) {
      parts.push(...cached);
    } else {
      const fetched = await apiFetch(from, histTo);
      saveCandles(symbol, resolution, fetched);
      parts.push(...fetched);
    }
  }

  // 2. Recent portion: always re-fetch
  if (to > boundary) {
    const recentFrom = Math.max(from, boundary);
    const fetched = await apiFetch(recentFrom, to);
    saveCandles(symbol, resolution, fetched);

    const existTs = new Set(parts.map(c => c.time));
    parts.push(...fetched.filter(c => !existTs.has(c.time)));
  }

  return parts.sort((a, b) => a.time - b.time);
}

// ── Request log ──────────────────────────────────────────────────────────────

export function logRequest(
  endpoint: string, method: string, status: number, durationMs: number
): void {
  _db.prepare(`
    INSERT INTO request_log (endpoint, method, status, duration_ms, ts)
    VALUES (?, ?, ?, ?, ?)
  `).run(endpoint, method, status, durationMs, Math.floor(Date.now() / 1000));
}

export interface LatencyStats {
  endpoint: string;
  count: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  min_ms: number;
  max_ms: number;
}

export function getLatencyStats(windowSeconds = 3600): LatencyStats[] {
  const since = Math.floor(Date.now() / 1000) - windowSeconds;
  const rows = _db.prepare<[number]>(`
    SELECT endpoint, duration_ms
    FROM   request_log
    WHERE  ts >= ?
    ORDER  BY endpoint, duration_ms ASC
  `).all(since) as { endpoint: string; duration_ms: number }[];

  const grouped = new Map<string, number[]>();
  for (const r of rows) {
    if (!grouped.has(r.endpoint)) grouped.set(r.endpoint, []);
    grouped.get(r.endpoint)!.push(r.duration_ms);
  }

  const stats: LatencyStats[] = [];
  for (const [endpoint, durations] of grouped) {
    const n = durations.length;
    const p = (pct: number) => durations[Math.min(Math.floor(n * pct), n - 1)] ?? 0;
    stats.push({
      endpoint,
      count: n,
      avg_ms: Math.round(durations.reduce((a, b) => a + b, 0) / n),
      p50_ms: p(0.50),
      p95_ms: p(0.95),
      p99_ms: p(0.99),
      min_ms: durations[0] ?? 0,
      max_ms: durations[n - 1] ?? 0,
    });
  }
  return stats;
}
