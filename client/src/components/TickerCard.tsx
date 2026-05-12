import React, { useEffect, useRef, useState } from 'react';
import { TradePayload } from '../types';

interface Props {
  symbol: string;
  data: TradePayload | undefined;
  selected: boolean;
  onClick: () => void;
  onRemove: () => void;
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function shortSymbol(s: string): string {
  return s.includes(':') ? s.split(':')[1] : s;
}

const TickerCard = React.memo(function TickerCard({
  symbol,
  data,
  selected,
  onClick,
  onRemove,
}: Props) {
  const prevPriceRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (!data) return;
    const prev = prevPriceRef.current;
    if (prev !== null && prev !== data.price) {
      setFlash(data.price > prev ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 400);
      prevPriceRef.current = data.price;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = data.price;
  }, [data?.price]);

  const isUp = (data?.changePercent ?? 0) >= 0;
  const changeColor = isUp ? 'text-price-up' : 'text-price-down';

  return (
    <div
      onClick={onClick}
      className={`relative group cursor-pointer rounded-lg border p-3 transition-colors duration-150
        ${selected
          ? 'border-accent bg-[#1c2333]'
          : 'border-border bg-card hover:border-[#444c56]'}
        ${flash === 'up' ? 'animate-flash-up' : ''}
        ${flash === 'down' ? 'animate-flash-down' : ''}
      `}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-price-down transition-opacity text-xs"
        title="Remove"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono font-bold text-text-primary text-sm">
          {shortSymbol(symbol)}
        </span>
        {data && (
          <span
            className="text-xs px-1 rounded font-mono"
            style={{
              backgroundColor: isUp ? 'rgba(0,217,126,0.15)' : 'rgba(255,71,87,0.15)',
              color: isUp ? '#00d97e' : '#ff4757',
            }}
          >
            {isUp ? '+' : ''}{fmt(data.changePercent)}%
          </span>
        )}
      </div>

      {data ? (
        <>
          <div className={`font-mono font-bold text-lg ${changeColor}`}>
            {fmt(data.price, data.price < 1 ? 4 : 2)}
          </div>
          <div className={`font-mono text-xs ${changeColor} mt-0.5`}>
            {isUp ? '+' : ''}{fmt(data.change, data.change < 1 ? 4 : 2)}
          </div>

          <div className="mt-2 text-xs font-mono text-text-secondary">
            <div className="flex justify-between">
              <span>L {fmt(data.low24h, 2)}</span>
              <span>H {fmt(data.high24h, 2)}</span>
            </div>
            <div className="mt-1 h-0.5 bg-border rounded-full overflow-hidden">
              {data.high24h > data.low24h && (
                <div
                  className="h-full bg-accent rounded-full"
                  style={{
                    width: `${((data.price - data.low24h) / (data.high24h - data.low24h)) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-text-secondary text-xs font-mono">
              Vol {fmtVolume(data.volume24h)}
            </span>
            <span
              className="text-xs font-mono px-1 rounded"
              style={{
                backgroundColor: data.updatesPerSecond > 0
                  ? 'rgba(56,139,253,0.15)'
                  : 'rgba(125,133,144,0.15)',
                color: data.updatesPerSecond > 0 ? '#388bfd' : '#7d8590',
              }}
            >
              {data.updatesPerSecond} UPS
            </span>
          </div>
        </>
      ) : (
        <div className="text-text-secondary text-xs font-mono animate-pulse mt-2">
          Waiting for data...
        </div>
      )}
    </div>
  );
});

export default TickerCard;
