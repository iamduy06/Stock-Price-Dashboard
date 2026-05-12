import { useState, useRef, useEffect } from 'react';

const PRESETS = [
  'VN:VNM', 'VN:VCB', 'VN:FPT', 'VN:VHM', 'VN:HPG',
  'VN:MSN', 'VN:MWG', 'VN:VIC', 'VN:TCB', 'VN:SSI',
  'VN:ACB', 'VN:BID', 'VN:CTG', 'VN:GAS', 'VN:PLX',
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
  'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT', 'BINANCE:BNBUSDT',
  'BINANCE:ADAUSDT', 'BINANCE:XRPUSDT',
];

interface Props {
  watchlist: string[];
  onAdd: (symbol: string) => void;
}

export default function SymbolSearch({ watchlist, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = PRESETS.filter(
    (s) =>
      s.toLowerCase().includes(query.toLowerCase()) &&
      !watchlist.includes(s)
  );

  const handleAdd = (symbol: string) => {
    onAdd(symbol.toUpperCase().trim());
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      handleAdd(query.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Add symbol… (e.g. AAPL)"
        className="w-full bg-surface border border-border rounded px-3 py-1.5 text-xs font-mono
          text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent
          transition-colors"
      />

      {open && (query.length > 0 || suggestions.length > 0) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border
          rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleAdd(s)}
                className="w-full text-left px-3 py-2 text-xs font-mono text-text-primary
                  hover:bg-[#1c2333] transition-colors"
              >
                {s}
              </button>
            ))
          ) : query.trim() ? (
            <button
              onClick={() => handleAdd(query.trim())}
              className="w-full text-left px-3 py-2 text-xs font-mono text-accent hover:bg-[#1c2333]"
            >
              Add "{query.trim().toUpperCase()}"
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
