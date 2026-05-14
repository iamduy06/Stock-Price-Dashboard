import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStockStore } from '../store/stockStore';
import { getPortfolio, getOrders, PortfolioResponse, Order } from '../services/apiService';
import { subscribeSymbol } from '../hooks/useStockWS';

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const { user, stocks } = useStockStore();

  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'holdings' | 'orders'>('holdings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    Promise.all([getPortfolio(), getOrders()])
      .then(([p, o]) => {
        setPortfolio(p);
        setOrders(o);
        p.portfolio.forEach((item) => subscribeSymbol(item.symbol));
      })
      .catch((err) => {
        if (err.response?.status === 401) { navigate('/login'); return; }
        setError(err.response?.data?.message ?? 'Không thể tải dữ liệu');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-mono text-text-secondary text-sm">
        Đang tải...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-mono text-price-down text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-text-primary font-mono">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <button
          onClick={() => navigate('/')}
          className="text-text-secondary hover:text-text-primary text-xs transition-colors"
        >
          ← Dashboard
        </button>
        <span className="text-border">|</span>
        <span className="text-accent font-bold text-sm tracking-wider">DANH MỤC</span>
        <span className="ml-auto text-text-secondary text-xs">{user?.username}</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tiền mặt', value: `${fmt(Number(portfolio?.balance))} đ` },
            { label: 'Giá trị CP', value: `${fmt(Number(portfolio?.total_stock_value))} đ` },
            {
              label: 'Tổng tài sản',
              value: `${fmt(Number(portfolio?.total_assets))} đ`,
              highlight: true,
            },
          ].map((c) => (
            <div key={c.label} className="bg-card border border-border rounded-xl px-5 py-4">
              <p className="text-text-secondary text-xs mb-1">{c.label}</p>
              <p className={`text-base font-bold ${c.highlight ? 'text-price-up' : 'text-text-primary'}`}>
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          {(['holdings', 'orders'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs rounded-md transition-colors font-medium ${
                tab === t ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t === 'holdings' ? 'Đang nắm giữ' : 'Lịch sử lệnh'}
            </button>
          ))}
        </div>

        {/* Holdings table */}
        {tab === 'holdings' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {portfolio?.portfolio.length === 0 ? (
              <p className="text-text-secondary text-xs text-center py-10">
                Chưa nắm giữ cổ phiếu nào
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Mã', 'SL', 'Giá TB', 'Giá hiện tại', 'Giá trị', 'Lãi/Lỗ', '%'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolio?.portfolio.map((item) => {
                    // Use live price from WS if available
                    const livePrice = stocks[item.symbol]?.price ?? item.current_price;
                    const liveValue = livePrice * item.quantity;
                    const livePnL = (livePrice - item.average_price) * item.quantity;
                    const livePct = item.average_price > 0
                      ? (livePnL / (item.average_price * item.quantity)) * 100 : 0;
                    const isProfit = livePnL >= 0;

                    return (
                      <tr key={item.symbol} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-text-primary">{item.symbol}</td>
                        <td className="px-4 py-3 text-text-primary">{item.quantity}</td>
                        <td className="px-4 py-3 text-text-secondary">{fmt(item.average_price, 2)}</td>
                        <td className="px-4 py-3 text-text-primary">{fmt(livePrice, 2)}</td>
                        <td className="px-4 py-3 text-text-primary">{fmt(liveValue)}</td>
                        <td className={`px-4 py-3 font-medium ${isProfit ? 'text-price-up' : 'text-price-down'}`}>
                          {isProfit ? '+' : ''}{fmt(livePnL)}
                        </td>
                        <td className={`px-4 py-3 font-medium ${isProfit ? 'text-price-up' : 'text-price-down'}`}>
                          {isProfit ? '+' : ''}{livePct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Orders table */}
        {tab === 'orders' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {orders.length === 0 ? (
              <p className="text-text-secondary text-xs text-center py-10">
                Chưa có lệnh nào
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Thời gian', 'Mã', 'Loại', 'SL', 'Giá', 'Tổng GT'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 text-text-secondary">
                        {new Date(o.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 font-bold text-text-primary">{o.symbol}</td>
                      <td className={`px-4 py-3 font-bold ${o.type === 'BUY' ? 'text-price-up' : 'text-price-down'}`}>
                        {o.type}
                      </td>
                      <td className="px-4 py-3 text-text-primary">{o.quantity}</td>
                      <td className="px-4 py-3 text-text-secondary">{fmt(o.price, 2)}</td>
                      <td className="px-4 py-3 text-text-primary">{fmt(o.total_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
