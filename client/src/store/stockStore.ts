import { create } from 'zustand';
import { TradePayload } from '../types';
import { AuthUser, clearSession, getUser as getStoredUser } from '../services/authService';

export const DEFAULT_WATCHLIST = [
  'VN:VNM', 'VN:VCB', 'VN:FPT', 'VN:VHM', 'VN:HPG',
  'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT',
  'AAPL', 'MSFT', 'NVDA',
];

interface StockStore {
  stocks: Record<string, TradePayload>;
  selectedSymbol: string;
  watchlist: string[];
  wsConnected: boolean;
  reconnectAttempts: number;
  user: AuthUser | null;

  updateStock: (data: TradePayload) => void;
  setSelectedSymbol: (symbol: string) => void;
  setWatchlist: (symbols: string[]) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setWsConnected: (connected: boolean) => void;
  incrementReconnect: () => void;
  resetReconnect: () => void;
  setUser: (user: AuthUser | null) => void;
  updateBalance: (balance: number) => void;
  logout: () => void;
}

export const useStockStore = create<StockStore>((set) => ({
  stocks: {},
  selectedSymbol: 'VN:VNM',
  watchlist: DEFAULT_WATCHLIST,
  wsConnected: false,
  reconnectAttempts: 0,
  user: getStoredUser(),

  updateStock: (data) =>
    set((state) => ({ stocks: { ...state.stocks, [data.symbol]: data } })),

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

  setWatchlist: (symbols) => set({ watchlist: symbols }),

  addToWatchlist: (symbol) =>
    set((state) =>
      state.watchlist.includes(symbol) ? state : { watchlist: [...state.watchlist, symbol] }
    ),

  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== symbol),
      selectedSymbol:
        state.selectedSymbol === symbol ? (state.watchlist[0] ?? '') : state.selectedSymbol,
    })),

  setWsConnected: (connected) => set({ wsConnected: connected }),
  incrementReconnect: () => set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
  resetReconnect: () => set({ reconnectAttempts: 0 }),

  setUser: (user) => set({ user }),

  updateBalance: (balance) =>
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, balance };
      localStorage.setItem('user', JSON.stringify(updated));
      return { user: updated };
    }),

  logout: () => {
    clearSession();
    set({ user: null, watchlist: DEFAULT_WATCHLIST });
  },
}));
