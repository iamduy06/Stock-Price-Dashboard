import { useMemo } from 'react';
import { TradePayload } from '../types';

interface Props {
  stocks: Record<string, TradePayload>;
  wsConnected: boolean;
  reconnectAttempts: number;
}

function UpsBar({ ups, maxUps = 20 }: { ups: number; maxUps?: number }) {
  const pct = Math.min((ups / maxUps) * 100, 100);
  const color =
    ups === 0 ? '#7d8590'
    : ups < 3 ? '#d29922'
    : '#00d97e';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-xs w-10 text-right" style={{ color }}>
        {ups}/s
      </span>
    </div>
  );
}

export default function UpdateMetrics({ stocks, wsConnected, reconnectAttempts }: Props) {
  const totalUps = useMemo(
    () => Object.values(stocks).reduce((acc, s) => acc + s.updatesPerSecond, 0),
    [stocks]
  );

  const totalTicks = useMemo(
    () => Object.values(stocks).reduce((acc, s) => acc + s.updateCount, 0),
    [stocks]
  );

  const activeSymbols = Object.entries(stocks)
    .filter(([, d]) => d.updatesPerSecond > 0)
    .sort(([, a], [, b]) => b.updatesPerSecond - a.updatesPerSecond);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-text-secondary text-xs font-mono uppercase tracking-wider">
          Stream Metrics
        </h3>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: wsConnected ? '#00d97e' : '#ff4757',
              boxShadow: wsConnected ? '0 0 6px #00d97e' : 'none',
            }}
          />
          <span className="text-xs font-mono text-text-secondary">
            {wsConnected ? 'LIVE' : reconnectAttempts > 0 ? `RETRY #${reconnectAttempts}` : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface rounded p-2">
          <div className="text-text-secondary text-xs font-mono mb-1">Total UPS</div>
          <div className="text-accent font-mono font-bold text-lg">{totalUps}</div>
        </div>
        <div className="bg-surface rounded p-2">
          <div className="text-text-secondary text-xs font-mono mb-1">Total Ticks</div>
          <div className="text-text-primary font-mono font-bold text-lg">
            {totalTicks.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Per-symbol UPS breakdown */}
      <div className="space-y-2">
        <div className="text-text-secondary text-xs font-mono">Active Streams</div>
        {activeSymbols.length === 0 ? (
          <div className="text-text-secondary text-xs font-mono italic">
            Waiting for data...
          </div>
        ) : (
          activeSymbols.map(([symbol, data]) => (
            <div key={symbol}>
              <div className="flex justify-between mb-0.5">
                <span className="text-text-primary text-xs font-mono">
                  {symbol.includes(':') ? symbol.split(':')[1] : symbol}
                </span>
                <span className="text-text-secondary text-xs font-mono">
                  {data.updateCount.toLocaleString()} ticks
                </span>
              </div>
              <UpsBar ups={data.updatesPerSecond} />
            </div>
          ))
        )}
      </div>

      {/* Timestamp */}
      <div className="text-text-secondary text-xs font-mono border-t border-border pt-2">
        {new Date().toLocaleTimeString('en-US', { hour12: false })} local
      </div>
    </div>
  );
}
