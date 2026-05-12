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

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Resolution = '1' | '5' | '15' | '30' | '60' | 'D';

export interface WsConnectedMessage {
  type: 'connected';
  clientId: string;
  defaultSymbols: string[];
}

export interface WsTradeMessage {
  type: 'trade' | 'snapshot';
  symbol: string;
  data: TradePayload;
}

export type WsMessage = WsConnectedMessage | WsTradeMessage;
