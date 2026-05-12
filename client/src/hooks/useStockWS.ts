import { useEffect, useRef, useCallback } from 'react';
import { useStockStore } from '../store/stockStore';
import { WsMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:3001`;
const MAX_RECONNECT_DELAY = 30_000;

let _ws: WebSocket | null = null;

export function subscribeSymbol(symbol: string) {
  if (_ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify({ type: 'subscribe', symbol }));
  }
}

export function unsubscribeSymbol(symbol: string) {
  if (_ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
  }
}

export function useStockWS() {
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(2_000);

  const {
    updateStock,
    setWsConnected,
    incrementReconnect,
    resetReconnect,
  } = useStockStore.getState();

  const subscribeAll = useCallback((socket: WebSocket) => {
    const list = useStockStore.getState().watchlist;
    list.forEach((symbol) => {
      socket.send(JSON.stringify({ type: 'subscribe', symbol }));
    });
  }, []);

  const connect = useCallback(() => {
    if (_ws?.readyState === WebSocket.CONNECTING) return;

    const socket = new WebSocket(WS_URL);
    _ws = socket;

    socket.onopen = () => {
      setWsConnected(true);
      resetReconnect();
      reconnectDelay.current = 2_000;
      subscribeAll(socket);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.type === 'trade' || msg.type === 'snapshot') {
          updateStock(msg.data);
        }
      } catch {
       
      }
    };

    socket.onclose = () => {
      _ws = null;
      setWsConnected(false);
      incrementReconnect();
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, MAX_RECONNECT_DELAY);
        connect();
      }, reconnectDelay.current);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [subscribeAll, updateStock, setWsConnected, incrementReconnect, resetReconnect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      _ws?.close();
      _ws = null;
    };
  }, []);

  const { watchlist } = useStockStore();
  useEffect(() => {
    if (_ws?.readyState === WebSocket.OPEN) {
      subscribeAll(_ws);
    }
  }, [watchlist, subscribeAll]);
}
