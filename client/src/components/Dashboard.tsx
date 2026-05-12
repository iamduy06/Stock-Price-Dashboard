import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStockStore } from '../store/stockStore';
import { subscribeSymbol, unsubscribeSymbol } from '../hooks/useStockWS';
import { addServerWatchlist, removeServerWatchlist } from '../services/apiService';
import PriceChart from './PriceChart';
import TickerCard from './TickerCard';
import UpdateMetrics from './UpdateMetrics';
import TradingPanel from './TradingPanel';
import SymbolSearch from './SymbolSearch';
import { Resolution } from '../types';

const RESOLUTIONS: { label: string; value: Resolution }[] = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '1h', value: '60' },
  { label: '1D', value: 'D' },
];

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [resolution, setResolution] = useState<Resolution>('1');

  const {
    stocks,
    selectedSymbol,
    watchlist,
    wsConnected,
    reconnectAttempts,
    user,
    logout,
    setSelectedSymbol,
    addToWatchlist,
    removeFromWatchlist,
  } = useStockStore();

  const selected = stocks[selectedSymbol];
  const isUp = (selected?.changePercent ?? 0) >= 0;

  const handleAddSymbol = (symbol: string) => {
    addToWatchlist(symbol);
    subscribeSymbol(symbol);
    if (user) addServerWatchlist(symbol).catch(() => {});
  };

  const handleRemoveSymbol = (symbol: string) => {
    removeFromWatchlist(symbol);
    unsubscribeSymbol(symbol);
    if (user) removeServerWatchlist(symbol).catch(() => {});
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="h-screen bg-surface text-text-primary font-mono flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-accent font-bold text-sm tracking-wider">STOCKSTREAM</span>
          <span className="text-border">|</span>
          <span className="text-text-secondary text-xs">Real-time Dashboard</span>
        </div>

        {selected && (
          <div className="flex items-center gap-4">
            <span className="text-text-primary font-bold">
              {selectedSymbol.includes(':') ? selectedSymbol.split(':')[1] : selectedSymbol}
            </span>
            <span className={`text-xl font-bold ${isUp ? 'text-price-up' : 'text-price-down'}`}>
              {fmt(selected.price, selected.price < 1 ? 4 : 2)}
            </span>
            <span className={`text-sm ${isUp ? 'text-price-up' : 'text-price-down'}`}>
              {isUp ? '+' : ''}{fmt(selected.changePercent)}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-price-up text-xs font-medium">
                {Number(user.balance).toLocaleString('vi-VN')} đ
              </span>
              <span className="text-text-secondary text-xs">{user.username}</span>
              <button
                onClick={() => navigate('/portfolio')}
                className="px-2 py-1 text-xs border border-accent text-accent rounded hover:bg-accent/10 transition-colors"
              >
                Portfolio
              </button>
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs border border-border text-text-secondary rounded hover:text-price-down hover:border-price-down transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
            >
              Đăng nhập
            </button>
          )}
          <span className="text-border">|</span>
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: wsConnected ? '#00d97e' : '#ff4757' }}
          />
          <span className="text-text-secondary text-xs">{wsConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Watchlist */}
        <aside className="w-56 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <SymbolSearch watchlist={watchlist} onAdd={handleAddSymbol} />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {watchlist.map((sym) => (
              <TickerCard
                key={sym}
                symbol={sym}
                data={stocks[sym]}
                selected={sym === selectedSymbol}
                onClick={() => setSelectedSymbol(sym)}
                onRemove={() => handleRemoveSymbol(sym)}
              />
            ))}
          </div>
        </aside>

        {/* Center — Chart */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setResolution(r.value)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  resolution === r.value
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-[#21262d]'
                }`}
              >
                {r.label}
              </button>
            ))}

            {selected && (
              <div className="ml-auto flex items-center gap-4 text-xs text-text-secondary">
                <span>H <span className="text-price-up">{fmt(selected.high24h)}</span></span>
                <span>L <span className="text-price-down">{fmt(selected.low24h)}</span></span>
                <span>UPS <span className="text-accent">{selected.updatesPerSecond}</span></span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {selectedSymbol ? (
              <PriceChart
                symbol={selectedSymbol}
                resolution={resolution}
                latestTrade={selected}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                Select a symbol from the watchlist
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar — Metrics + Trading */}
        <aside className="w-56 border-l border-border p-3 shrink-0 overflow-y-auto flex flex-col gap-3">
          <UpdateMetrics
            stocks={stocks}
            wsConnected={wsConnected}
            reconnectAttempts={reconnectAttempts}
          />
          <TradingPanel symbol={selectedSymbol} />
        </aside>
      </div>
    </div>
  );
}
