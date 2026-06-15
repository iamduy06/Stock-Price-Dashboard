import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  CrosshairMode,
  UTCTimestamp,
} from 'lightweight-charts';
import axios from 'axios';
import { TradePayload, Resolution, CandleData } from '../types';

interface Props {
  symbol: string;
  resolution: Resolution;
  latestTrade: TradePayload | undefined;
}

const CHART_THEME = {
  layout: { background: { color: '#0d1117' }, textColor: '#7d8590' },
  grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: '#21262d' },
  timeScale: { borderColor: '#21262d', timeVisible: true, secondsVisible: false },
};

const RESOLUTION_SECONDS: Record<Resolution, number> = {
  '1': 60, '5': 300, '15': 900, '30': 1800, '60': 3600, 'D': 86400,
};

const RESOLUTION_LOOKBACK: Record<Resolution, number> = {
  '1':  7  * 24 * 3600,       
  '5':  60 * 24 * 3600,       
  '15': 60 * 24 * 3600,       
  '30': 60 * 24 * 3600,      
  '60': 2  * 365 * 86400,   
  'D':  3  * 365 * 86400,    
};

type Status = 'idle' | 'loading' | 'empty' | 'error';

export default function PriceChart({ symbol, resolution, latestTrade }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const currentCandleRef = useRef<CandlestickData | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      ...CHART_THEME,
      width: el.clientWidth,
      height: el.clientHeight || el.offsetHeight || 400,
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00d97e',
      downColor: '#ff4757',
      borderUpColor: '#00d97e',
      borderDownColor: '#ff4757',
      wickUpColor: '#00d97e',
      wickDownColor: '#ff4757',
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: '#388bfd',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      if (el && chartRef.current) {
        chartRef.current.applyOptions({
          width: el.clientWidth,
          height: el.clientHeight || el.offsetHeight || 400,
        });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    currentCandleRef.current = null;
    setStatus('loading');
    setErrorMsg('');

    const controller = new AbortController();

    (async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const from = now - RESOLUTION_LOOKBACK[resolution];

        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const { data: candles } = await axios.get<CandleData[]>(
          `${API_BASE}/candles/${encodeURIComponent(symbol)}`,
          {
            params: { resolution, from, to: now },
            signal: controller.signal,
          }
        );

        if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

        const valid = candles
          .filter(c =>
            c.open != null && c.high != null && c.low != null && c.close != null &&
            isFinite(c.open) && isFinite(c.high) && isFinite(c.low) && isFinite(c.close)
          )
          .sort((a, b) => a.time - b.time);

        if (valid.length === 0) {
          candleSeriesRef.current.setData([]);
          volumeSeriesRef.current.setData([]);
          setStatus('empty');
          return;
        }

        const candleData: CandlestickData[] = valid.map(c => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        const volumeData: HistogramData[] = valid.map(c => ({
          time: c.time as UTCTimestamp,
          value: c.volume ?? 0,
          color: c.close >= c.open ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)',
        }));

        candleSeriesRef.current.setData(candleData);
        volumeSeriesRef.current.setData(volumeData);
        chartRef.current?.timeScale().fitContent();
        currentCandleRef.current = candleData[candleData.length - 1];
        setStatus('idle');
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error('[Chart] candles fetch failed:', err);
        setErrorMsg(axios.isAxiosError(err) ? err.message : String(err));
        setStatus('error');
      }
    })();

    return () => controller.abort();
  }, [symbol, resolution]);

  const updateCandle = useCallback((trade: TradePayload) => {
    if (!candleSeriesRef.current) return;

    const resSeconds = RESOLUTION_SECONDS[resolution];
    const candleTime = (Math.floor(trade.timestamp / 1000 / resSeconds) * resSeconds) as UTCTimestamp;
    const price = trade.price;

    let current = currentCandleRef.current;

    if (!current || current.time !== candleTime) {
      current = { time: candleTime, open: price, high: price, low: price, close: price };
    } else {
      current = {
        ...current,
        high: Math.max(current.high, price),
        low: Math.min(current.low, price),
        close: price,
      };
    }

    currentCandleRef.current = current;
    try {
      candleSeriesRef.current.update(current);
    } catch {
     
    }
  }, [resolution]);

  useEffect(() => {
    if (latestTrade && latestTrade.symbol === symbol) {
      updateCandle(latestTrade);
    }
  }, [latestTrade, symbol, updateCandle]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-text-secondary font-mono animate-pulse">Loading…</span>
        </div>
      )}

      {status === 'empty' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-text-secondary font-mono">No data for this period</span>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-price-down font-mono">{errorMsg || 'Failed to load candles'}</span>
        </div>
      )}
    </div>
  );
}
