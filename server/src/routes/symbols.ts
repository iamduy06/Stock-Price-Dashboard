import { Router, Request, Response } from 'express';

const router = Router();

interface SymbolInfo {
  symbol: string;
  name: string;
  exchange: string;
  type: 'vn' | 'us' | 'crypto';
}

const VN_SYMBOLS: SymbolInfo[] = [

  { symbol: 'VN:VNM',  name: 'Vinamilk',                       exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:VCB',  name: 'Vietcombank',                    exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:FPT',  name: 'FPT Corporation',                exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:VHM',  name: 'Vinhomes',                       exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:HPG',  name: 'Hoa Phat Group',                 exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:MSN',  name: 'Masan Group',                    exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:MWG',  name: 'Mobile World Investment',        exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:VIC',  name: 'Vingroup',                       exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:TCB',  name: 'Techcombank',                    exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:SSI',  name: 'SSI Securities',                 exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:ACB',  name: 'Asia Commercial Bank',           exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:BID',  name: 'BIDV',                           exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:CTG',  name: 'VietinBank',                     exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:GAS',  name: 'PetroVietnam Gas',               exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:PLX',  name: 'Petrolimex',                     exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:VPB',  name: 'VPBank',                         exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:MBB',  name: 'Military Bank',                  exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:HDB',  name: 'HDBank',                         exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:STB',  name: 'Sacombank',                      exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:VJC',  name: 'Vietjet Air',                    exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:REE',  name: 'REE Corporation',                exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:DGC',  name: 'Duc Giang Chemicals',            exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:NVL',  name: 'Novaland',                       exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:PDR',  name: 'Phat Dat Real Estate',           exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:KDH',  name: 'Khang Dien House',               exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:VCI',  name: 'Viet Capital Securities',        exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:HCM',  name: 'Ho Chi Minh City Securities',    exchange: 'HOSE', type: 'vn' },
  { symbol: 'VN:VDS',  name: 'Rong Viet Securities',           exchange: 'HOSE', type: 'vn' },

  { symbol: 'VN:PVS',  name: 'PetroVietnam Technical Services', exchange: 'HNX', type: 'vn' },
  { symbol: 'VN:SHN',  name: 'Sai Gon - Ha Noi Securities',    exchange: 'HNX', type: 'vn' },
  { symbol: 'VN:VCS',  name: 'VICOSTONE',                       exchange: 'HNX', type: 'vn' },
];

const US_SYMBOLS: SymbolInfo[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.',                exchange: 'NASDAQ', type: 'us' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation',     exchange: 'NASDAQ', type: 'us' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',             exchange: 'NASDAQ', type: 'us' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',           exchange: 'NASDAQ', type: 'us' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                exchange: 'NASDAQ', type: 'us' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',        exchange: 'NASDAQ', type: 'us' },
  { symbol: 'META',  name: 'Meta Platforms Inc.',       exchange: 'NASDAQ', type: 'us' },
  { symbol: 'NFLX',  name: 'Netflix Inc.',              exchange: 'NASDAQ', type: 'us' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',    exchange: 'NASDAQ', type: 'us' },
  { symbol: 'INTC',  name: 'Intel Corporation',         exchange: 'NASDAQ', type: 'us' },
];

const CRYPTO_SYMBOLS: SymbolInfo[] = [
  { symbol: 'BINANCE:BTCUSDT',  name: 'Bitcoin / USDT',  exchange: 'BINANCE', type: 'crypto' },
  { symbol: 'BINANCE:ETHUSDT',  name: 'Ethereum / USDT', exchange: 'BINANCE', type: 'crypto' },
  { symbol: 'BINANCE:BNBUSDT',  name: 'BNB / USDT',      exchange: 'BINANCE', type: 'crypto' },
  { symbol: 'BINANCE:SOLUSDT',  name: 'Solana / USDT',   exchange: 'BINANCE', type: 'crypto' },
  { symbol: 'BINANCE:XRPUSDT',  name: 'XRP / USDT',      exchange: 'BINANCE', type: 'crypto' },
  { symbol: 'BINANCE:ADAUSDT',  name: 'Cardano / USDT',  exchange: 'BINANCE', type: 'crypto' },
];

const ALL_SYMBOLS = [...VN_SYMBOLS, ...US_SYMBOLS, ...CRYPTO_SYMBOLS];

router.get('/search', (req: Request, res: Response) => {
  const q    = String(req.query.q ?? '').toLowerCase().trim();
  const type = req.query.type as string | undefined;

  let results = ALL_SYMBOLS;

  if (type) results = results.filter(s => s.type === type);

  if (q) {
    results = results.filter(s =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
    );
  }

  res.json(results.slice(0, 20));
});

router.get('/', (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const result = type ? ALL_SYMBOLS.filter(s => s.type === type) : ALL_SYMBOLS;
  res.json(result);
});

export default router;
