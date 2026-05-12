import WebSocket from 'ws';
import {
  RawTrade,
  TradePayload,
  SymbolState,
  ClientSubscription,
  WsServerMessage,
} from './types';

const MAX_SYMBOLS_PER_CLIENT = 50;

export class RelayManager {
  private clients = new Map<string, ClientSubscription>();
  private symbolStates = new Map<string, SymbolState>();

  addClient(id: string, ws: WebSocket): void {
    this.clients.set(id, { ws, symbols: new Set() });
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  handleClientMessage(id: string, raw: string): void {
    try {
      const msg = JSON.parse(raw);
      const client = this.clients.get(id);
      if (!client || !msg.symbol) return;

      if (msg.type === 'subscribe') {
        if (!client.symbols.has(msg.symbol) && client.symbols.size >= MAX_SYMBOLS_PER_CLIENT) {
          this.send(client.ws, {
            type: 'error',
            message: `Subscription limit reached (max ${MAX_SYMBOLS_PER_CLIENT} symbols per connection)`,
          });
          return;
        }
        client.symbols.add(msg.symbol);
        const state = this.symbolStates.get(msg.symbol);
        if (state) {
          this.send(client.ws, {
            type: 'snapshot',
            symbol: msg.symbol,
            data: this.buildPayload(msg.symbol, state),
          });
        }
      } else if (msg.type === 'unsubscribe') {
        client.symbols.delete(msg.symbol);
      }
    } catch {
      // ignore malformed messages
    }
  }

  onTrade(trade: RawTrade): void {
    const now = Date.now();
    let state = this.symbolStates.get(trade.symbol);

    if (!state) {
      state = {
        lastPrice: trade.price,
        prevClose: trade.prevClose ?? trade.price,
        high24h: trade.price,
        low24h: trade.price,
        volume24h: 0,
        updateCount: 0,
        updateTimestamps: [],
        updatesPerSecond: 0,
      };
      this.symbolStates.set(trade.symbol, state);
    }

    state.lastPrice = trade.price;
    state.high24h = Math.max(state.high24h, trade.price);
    state.low24h = Math.min(state.low24h, trade.price);
    state.volume24h += trade.volume;
    state.updateCount++;

    // Sliding 1-second window for UPS
    state.updateTimestamps.push(now);
    const cutoff = now - 1_000;
    let i = 0;
    while (i < state.updateTimestamps.length && state.updateTimestamps[i] <= cutoff) i++;
    if (i > 0) state.updateTimestamps.splice(0, i);
    state.updatesPerSecond = state.updateTimestamps.length;

    const payload: WsServerMessage = {
      type: 'trade',
      symbol: trade.symbol,
      data: this.buildPayload(trade.symbol, state),
    };

    this.clients.forEach(client => {
      if (client.symbols.has(trade.symbol) && client.ws.readyState === WebSocket.OPEN) {
        this.send(client.ws, payload);
      }
    });
  }

  getSubscribedSymbols(): string[] {
    const symbols = new Set<string>();
    this.clients.forEach(c => c.symbols.forEach(s => symbols.add(s)));
    return Array.from(symbols);
  }

  getPrice(symbol: string): number | null {
    return this.symbolStates.get(symbol)?.lastPrice ?? null;
  }

  getStats() {
    let totalSubs = 0;
    this.clients.forEach(c => { totalSubs += c.symbols.size; });
    return {
      connected_clients: this.clients.size,
      tracked_symbols:   this.symbolStates.size,
      total_subscriptions: totalSubs,
      symbols: Array.from(this.symbolStates.keys()),
    };
  }

  private buildPayload(symbol: string, state: SymbolState): TradePayload {
    const change = state.lastPrice - state.prevClose;
    const changePercent = state.prevClose > 0
      ? (change / state.prevClose) * 100
      : 0;

    return {
      symbol,
      price: state.lastPrice,
      change: Number(change.toFixed(4)),
      changePercent: Number(changePercent.toFixed(4)),
      high24h: state.high24h,
      low24h: state.low24h,
      volume24h: state.volume24h,
      updatesPerSecond: state.updatesPerSecond,
      updateCount: state.updateCount,
      timestamp: Date.now(),
    };
  }

  private send(ws: WebSocket, data: WsServerMessage): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    } catch {
      // client gone
    }
  }
}
