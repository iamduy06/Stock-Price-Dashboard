import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, saveSession } from '../services/authService';
import { getServerWatchlist } from '../services/apiService';
import { subscribeSymbol } from '../hooks/useStockWS';
import { useStockStore } from '../store/stockStore';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setWatchlist } = useStockStore();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const fn = mode === 'login' ? login : register;
      const { token, user } = await fn(username.trim(), password);
      saveSession(token, user);
      setUser(user);

      try {
        const serverList = await getServerWatchlist();
        if (serverList.length > 0) {
          const symbols = serverList.map((w) => w.symbol);
          setWatchlist(symbols);
          symbols.forEach(subscribeSymbol);
        }
      } catch {

      }

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center font-mono">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-accent font-bold text-xl tracking-widest">STOCKSTREAM</span>
          <p className="text-text-secondary text-xs mt-1">Real-time Stock Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1f2e] border border-border rounded-xl p-8">
          {/* Tab switcher */}
          <div className="flex mb-6 bg-surface rounded-lg p-1">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-1.5 text-xs rounded-md transition-colors font-medium ${
                  mode === m
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoFocus
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-xs mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {error && (
              <p className="text-price-down text-xs bg-price-down/10 border border-price-down/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
            >
              {loading ? '...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          </form>
        </div>

        <p className="text-center mt-4">
          <button onClick={() => navigate('/')} className="text-text-secondary text-xs hover:text-text-primary transition-colors">
            ← Quay lại dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
