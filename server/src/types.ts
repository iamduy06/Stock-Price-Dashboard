export interface RawTrade {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  prevClose?: number;
}

export interface TradePayload {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatesPerSecond: number;
  updateCount: number;
  timestamp: number;
}

export interface SymbolState {
  lastPrice: number;
  prevClose: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updateCount: number;
  updateTimestamps: number[];
  updatesPerSecond: number;
}

export interface ClientSubscription {
  ws: import('ws').WebSocket;
  symbols: Set<string>;
}

export interface WsClientMessage {
  type: 'subscribe' | 'unsubscribe';
  symbol: string;
}

export interface WsServerMessage {
  type: 'connected' | 'trade' | 'snapshot' | 'error';
  symbol?: string;
  data?: TradePayload;
  clientId?: string;
  defaultSymbols?: string[];
  message?: string;
}
