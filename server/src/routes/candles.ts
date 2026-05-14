import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getCandlesWithCache, CandleRow } from '../db';

const router = Router();

const VALID_RESOLUTIONS = new Set(['1', '5', '15', '30', '60', 'D']);

const VN_TICKER_RE    = /^[A-Z0-9]{1,10}$/;
const CRYPTO_RE       = /^[A-Z0-9]{1,20}:[A-Z0-9]{1,20}$/;
const US_TICKER_RE    = /^[A-Z]{1,10}$/;
const MIN_TS          = 946684800;
const MAX_TS          = 4102444800;
const MAX_RANGE_S     = 5 * 365 * 24 * 3600;

function validateSymbol(raw: string): string | null {
  if (raw.startsWith('VN:')) {
    return VN_TICKER_RE.test(raw.slice(3)) ? null : 'Invalid VN symbol — use alphanumeric only (e.g. VN:VNM)';
  }
  if (raw.includes(':')) {
    return CRYPTO_RE.test(raw) ? null : 'Invalid EXCHANGE:PAIR format';
  }
  return US_TICKER_RE.test(raw) ? null : 'Invalid symbol — use uppercase letters only (e.g. AAPL)';
}

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YF_UA    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const YF_INTERVAL: Record<string, string> = {
  '1': '1m', '5': '5m', '15': '15m', '30': '30m', '60': '60m', 'D': '1d',
};

async function fetchVnFromApi(
  ticker: string, resolution: string, from: number, to: number
): Promise<CandleRow[]> {
  const { data } = await axios.get(`${YF_CHART}/${ticker}.VN`, {
    params: { interval: YF_INTERVAL[resolution] ?? '1d', period1: from, period2: to },
    headers: { 'User-Agent': YF_UA },
    timeout: 8000,
  });

  const result = data.chart?.result?.[0];
  if (!result?.timestamp) return [];

  const ts: number[] = result.timestamp;
  const q = result.indicators.quote[0] as {
    open: (number | null)[]; high: (number | null)[];
    low:  (number | null)[]; close: (number | null)[]; volume: (number | null)[];
  };

  return (ts
    .map((t, i) => ({
      time:   t,
      open:   q.open[i],
      high:   q.high[i],
      low:    q.low[i],
      close:  q.close[i],
      volume: q.volume[i] ?? 0,
    }))
    .filter(c => c.open != null && c.high != null && c.low != null && c.close != null)
    .sort((a, b) => a.time - b.time)) as CandleRow[];
}

const BINANCE_INTERVAL: Record<string, string> = {
  '1': '1m', '5': '5m', '15': '15m', '30': '30m', '60': '1h', 'D': '1d',
};

async function fetchBinanceFromApi(
  rawSymbol: string, resolution: string, from: number, to: number
): Promise<CandleRow[]> {

  const pair     = rawSymbol.includes(':') ? rawSymbol.split(':')[1] : rawSymbol;
  const interval = BINANCE_INTERVAL[resolution] ?? '1d';

  const all: CandleRow[] = [];
  let startMs = from * 1000;
  const endMs  = to   * 1000;

  for (let page = 0; page < 5; page++) {
    const { data } = await axios.get('https://api.binance.com/api/v3/klines', {
      params: { symbol: pair, interval, startTime: startMs, endTime: endMs, limit: 1000 },
      timeout: 8000,
    });

    if (!Array.isArray(data) || data.length === 0) break;

    for (const k of data as [number, string, string, string, string, string][]) {
      all.push({
        time:   Math.floor(k[0] / 1000),
        open:   parseFloat(k[1]),
        high:   parseFloat(k[2]),
        low:    parseFloat(k[3]),
        close:  parseFloat(k[4]),
        volume: parseFloat(k[5]),
      });
    }

    if (data.length < 1000) break;
    startMs = (data[data.length - 1] as [number])[0] + 1;
    if (startMs >= endMs) break;
  }

  return all.sort((a, b) => a.time - b.time);
}

async function fetchFinnhubFromApi(
  rawSymbol: string, resolution: string, token: string, from: number, to: number
): Promise<CandleRow[]> {
  const { data } = await axios.get('https://finnhub.io/api/v1/stock/candle', {
    params: { symbol: rawSymbol, resolution, from, to, token },
    timeout: 8000,
  });

  if (data.s === 'no_data' || !Array.isArray(data.t)) return [];

  return (data.t as number[]).map((_: number, i: number) => ({
    time:   data.t[i] as number,
    open:   data.o[i] as number,
    high:   data.h[i] as number,
    low:    data.l[i] as number,
    close:  data.c[i] as number,
    volume: data.v[i] as number,
  }));
}

router.get('/:symbol', async (req: Request, res: Response) => {
  const rawSymbol = req.params.symbol.toUpperCase();
  const { resolution = '1', from, to } = req.query;

  const symbolErr = validateSymbol(rawSymbol);
  if (symbolErr) return res.status(400).json({ error: symbolErr });

  if (!VALID_RESOLUTIONS.has(String(resolution))) {
    return res.status(400).json({ error: 'Invalid resolution. Allowed: 1, 5, 15, 30, 60, D' });
  }

  const now      = Math.floor(Date.now() / 1000);
  const fromTime = from ? Number(from) : now - 24 * 3600;
  const toTime   = to   ? Number(to)   : now;

  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) {
    return res.status(400).json({ error: 'Invalid from/to — must be Unix timestamps' });
  }
  if (fromTime < MIN_TS || toTime > MAX_TS) {
    return res.status(400).json({ error: 'Timestamps out of valid range (2000–2100)' });
  }
  if (fromTime >= toTime) {
    return res.status(400).json({ error: '"from" must be before "to"' });
  }
  if (toTime - fromTime > MAX_RANGE_S) {
    return res.status(400).json({ error: 'Time range too large (max 5 years)' });
  }

  console.log(`[Candles] ${rawSymbol} res=${resolution} from=${fromTime}`);

  try {
    let candles: CandleRow[];

    if (rawSymbol.startsWith('VN:')) {

      const ticker = rawSymbol.slice(3);
      candles = await getCandlesWithCache(
        rawSymbol, String(resolution), fromTime, toTime,
        (f, t) => fetchVnFromApi(ticker, String(resolution), f, t)
      );
    } else if (rawSymbol.includes(':')) {

      candles = await getCandlesWithCache(
        rawSymbol, String(resolution), fromTime, toTime,
        (f, t) => fetchBinanceFromApi(rawSymbol, String(resolution), f, t)
      );
    } else {

      const token = process.env.FINNHUB_API_KEY ?? '';
      candles = await getCandlesWithCache(
        rawSymbol, String(resolution), fromTime, toTime,
        (f, t) => fetchFinnhubFromApi(rawSymbol, String(resolution), token, f, t)
      );
    }

    console.log(`[Candles] ${rawSymbol} → ${candles.length} rows (cache+api)`);
    res.json(candles);
  } catch (err) {
    console.error(`[Candles] Error for ${rawSymbol}:`, err);
    if (axios.isAxiosError(err)) {
      res.status(err.response?.status ?? 500).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch candles' });
    }
  }
});

export default router;
