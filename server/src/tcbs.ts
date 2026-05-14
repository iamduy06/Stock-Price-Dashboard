import EventEmitter from 'events';
import axios from 'axios';
import { RawTrade } from './types';

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const POLL_MS = 5000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

interface YFMeta {
  regularMarketPrice: number;
  regularMarketVolume: number;
  chartPreviousClose?: number;
  regularMarketPreviousClose?: number;
}

const TICKER_RE = /^[A-Z0-9]{1,10}$/;

export class TcbsClient extends EventEmitter {
  private subscriptions = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    void this.poll();
    this.timer = setInterval(() => { void this.poll(); }, POLL_MS);
  }

  subscribe(ticker: string): void {
    const t = ticker.toUpperCase();
    if (!TICKER_RE.test(t)) {
      console.warn(`[VN] Rejected invalid ticker: ${ticker}`);
      return;
    }
    this.subscriptions.add(t);
    void this.fetchQuote(t);
    console.log(`[VN] Subscribed: ${t}`);
  }

  unsubscribe(ticker: string): void {
    this.subscriptions.delete(ticker.toUpperCase());
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    const tickers = Array.from(this.subscriptions);
    await Promise.allSettled(tickers.map(t => this.fetchQuote(t)));
  }

  private async fetchQuote(ticker: string): Promise<void> {
    try {
      const { data } = await axios.get(`${YF_CHART}/${ticker}.VN`, {
        params: { interval: '1m', range: '1d' },
        headers: { 'User-Agent': UA },
        timeout: 6000,
      });

      const result = data.chart?.result?.[0];
      if (!result) return;

      const meta: YFMeta = result.meta;
      const price = meta.regularMarketPrice;
      if (!price) return;

      const prevClose = meta.chartPreviousClose ?? meta.regularMarketPreviousClose;

      this.emit('trade', {
        symbol: `VN:${ticker}`,
        price,
        volume: meta.regularMarketVolume ?? 0,
        timestamp: Date.now(),
        ...(prevClose ? { prevClose } : {}),
      } as RawTrade);
    } catch {

    }
  }
}
