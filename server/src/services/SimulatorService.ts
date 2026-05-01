import { supabase } from '../config/supabase.js';
import { Redis } from 'ioredis';

interface StockTick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

export class SimulatorService {
  private static instance: SimulatorService;
  private stocks: any[] = [];
  private redis: Redis;
  private ticks: Map<string, StockTick[]> = new Map();
  private interval: NodeJS.Timeout | null = null;
  private topMovers: any = { gainers: [], losers: [] };
  private onTickCallback: ((tick: StockTick) => void) | null = null;

  private constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  public static getInstance(): SimulatorService {
    if (!SimulatorService.instance) {
      SimulatorService.instance = new SimulatorService();
    }
    return SimulatorService.instance;
  }

  public async start() {
    const { data, error } = await supabase.from('stocks').select('*');
    if (error) return;
    this.stocks = data;

    for (const s of this.stocks) {
      await this.redis.hset('stock_prices', s.symbol, s.reference_price);
      this.ticks.set(s.symbol, []);
      this.hourlyTicks.set(s.symbol, []);
    }

    this.interval = setInterval(() => this.tick(), 1000);
    setInterval(() => this.aggregateOHLC('1M'), 60000);
    setInterval(() => this.aggregateOHLC('1H'), 3600000);
  }

  private async tick() {
    for (const stock of this.stocks) {
      const priceStr = await this.redis.hget('stock_prices', stock.symbol);
      const current = priceStr ? Number(priceStr) : Number(stock.reference_price);

      const volatility = 0.015;
      const randomFactor = (Math.random() * 2) - 1;
      let newPrice = current * (1 + randomFactor * volatility);

      newPrice = Math.max(Number(stock.floor_price), Math.min(newPrice, Number(stock.ceiling_price)));
      newPrice = Math.round(newPrice / 10) * 10;

      await this.redis.hset('stock_prices', stock.symbol, newPrice);

      const tickData: StockTick = {
        symbol: stock.symbol,
        price: newPrice,
        volume: Math.floor(Math.random() * 1000) + 10,
        timestamp: Date.now()
      };

      this.ticks.get(stock.symbol)?.push(tickData);
      this.hourlyTicks.get(stock.symbol)?.push(tickData);
      this.onTickCallback?.(tickData);
    }
  }

  public setOnTickCallback(callback: (tick: StockTick) => void) {
    this.onTickCallback = callback;
  }

  public async getCurrentPrice(symbol: string) {
    const price = await this.redis.hget('stock_prices', symbol);
    return price ? Number(price) : null;
  }

  public getTopMovers() {
    return this.topMovers;
  }

  private async calculateTopMovers() {
    const list = [];
    for (const s of this.stocks) {
      const priceStr = await this.redis.hget('stock_prices', s.symbol);
      const current = priceStr ? Number(priceStr) : Number(s.reference_price);
      const ref = Number(s.reference_price);
      const changePercent = ((current - ref) / ref) * 100;
      list.push({ symbol: s.symbol, changePercent });
    }

    const sorted = [...list].sort((a, b) => b.changePercent - a.changePercent);
    this.topMovers = {
      gainers: sorted.slice(0, 3),
      losers: sorted.slice(-3).reverse()
    };
  }

  private hourlyTicks: Map<string, StockTick[]> = new Map();

  private async aggregateOHLC(timeframe: string = '1M') {
    if (timeframe === '1M') {
      await this.calculateTopMovers();
    }

    const now = new Date();
    const sourceMap = timeframe === '1M' ? this.ticks : this.hourlyTicks;

    for (const stock of this.stocks) {
      const stockTicks = sourceMap.get(stock.symbol) || [];
      if (stockTicks.length === 0) continue;

      const prices = stockTicks.map(t => t.price);
      const open = stockTicks[0]!.price;
      const close = stockTicks[stockTicks.length - 1]!.price;
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const totalVolume = stockTicks.reduce((sum, t) => sum + t.volume, 0);

      sourceMap.set(stock.symbol, []);

      await supabase.from('price_history').insert({
        symbol: stock.symbol,
        timeframe: timeframe,
        open,
        high,
        low,
        close,
        volume: totalVolume,
        timestamp: now.toISOString()
      });
    }
  }
}
