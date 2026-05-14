import WebSocket from 'ws';
import EventEmitter from 'events';
import { RawTrade } from './types';

interface FinnhubTrade {
  s: string;
  p: number;
  v: number;
  t: number;
}

interface FinnhubMessage {
  type: string;
  data?: FinnhubTrade[];
}

export class FinnhubClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private token: string;
  private subscriptions = new Set<string>();
  private reconnectDelay = 1000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  constructor(token: string) {
    super();
    this.token = token;
  }

  connect(): void {
    if (this.isDestroyed) return;

    const url = `wss://ws.finnhub.io?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[Finnhub] Connected');
      this.reconnectDelay = 1000;
      this.subscriptions.forEach(sym => this.sendSubscribe(sym));
      this.startPing();
      this.emit('connected');
    });

    this.ws.on('message', (raw: Buffer) => {
      try {
        const msg: FinnhubMessage = JSON.parse(raw.toString());
        if (msg.type === 'trade' && Array.isArray(msg.data)) {
          msg.data.forEach(trade => {
            const event: RawTrade = {
              symbol: trade.s,
              price: trade.p,
              volume: trade.v,
              timestamp: trade.t,
            };
            this.emit('trade', event);
          });
        }
      } catch {

      }
    });

    this.ws.on('close', () => {
      console.log(`[Finnhub] Disconnected, retry in ${this.reconnectDelay}ms`);
      this.stopPing();
      if (!this.isDestroyed) {
        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
          this.connect();
        }, this.reconnectDelay);
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[Finnhub] WS error:', err.message);
      this.ws?.terminate();
    });
  }

  subscribe(symbol: string): void {
    this.subscriptions.add(symbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(symbol);
    }
  }

  unsubscribe(symbol: string): void {
    this.subscriptions.delete(symbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.stopPing();
    this.ws?.terminate();
  }

  private sendSubscribe(symbol: string): void {
    this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }));
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 25_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
