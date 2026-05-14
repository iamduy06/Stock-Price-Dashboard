import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStockStore } from '../store/stockStore';
import { placeOrder } from '../services/apiService';

interface Props {
  symbol: string;
}

export default function TradingPanel({ symbol }: Props) {
  const navigate = useNavigate();
  const { user, updateBalance, stocks } = useStockStore();

  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const currentPrice = stocks[symbol]?.price;

  const handleOrder = async (type: 'BUY' | 'SELL') => {
    setMessage(null);

    if (!user) {
      navigate('/login');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setMessage({ ok: false, text: 'Nhập số lượng hợp lệ' });
      return;
    }

    setLoading(true);
    try {
      const data = await placeOrder(symbol, type, qty);
      setMessage({
        ok: true,
        text: `${type} ${qty} ${symbol} @ ${Number(data.price).toLocaleString()} — Tổng: ${Number(data.total_value).toLocaleString()}`,
      });
      setQuantity('');
      const nb = Number(data.new_balance);
      if (!isNaN(nb)) updateBalance(nb);
    } catch (err: any) {
      setMessage({
        ok: false,
        text: err.response?.data?.message ?? 'Đặt lệnh thất bại',
      });
    } finally {
      setLoading(false);
    }
  };

  const estimatedTotal = currentPrice && quantity
    ? currentPrice * parseInt(quantity || '0', 10)
    : null;

  return (
    <div className="border-t border-border pt-3 mt-3">
      <p className="text-text-secondary text-xs font-medium mb-2 tracking-wider uppercase">
        Đặt lệnh — {symbol || '—'}
      </p>

      {!user ? (
        <p className="text-text-secondary text-xs">
          <button
            onClick={() => navigate('/login')}
            className="text-accent hover:underline"
          >
            Đăng nhập
          </button>{' '}
          để giao dịch
        </p>
      ) : (
        <div className="space-y-2">
          <input
            type="number"
            min="1"
            placeholder="Số lượng..."
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
          />

          {estimatedTotal != null && estimatedTotal > 0 && (
            <p className="text-text-secondary text-xs">
              ~ {estimatedTotal.toLocaleString()}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleOrder('BUY')}
              disabled={loading}
              className="flex-1 py-1.5 bg-price-up hover:bg-price-up/80 disabled:opacity-50 text-surface text-xs font-bold rounded transition-colors"
            >
              MUA
            </button>
            <button
              onClick={() => handleOrder('SELL')}
              disabled={loading}
              className="flex-1 py-1.5 bg-price-down hover:bg-price-down/80 disabled:opacity-50 text-white text-xs font-bold rounded transition-colors"
            >
              BÁN
            </button>
          </div>

          {message && (
            <p className={`text-xs leading-snug ${message.ok ? 'text-price-up' : 'text-price-down'}`}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
