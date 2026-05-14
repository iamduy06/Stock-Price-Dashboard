import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStockWS } from './hooks/useStockWS';
import { useStockStore } from './store/stockStore';
import { getMe } from './services/apiService';
import { getToken } from './services/authService';
import Dashboard from './components/Dashboard';
import LoginPage from './pages/LoginPage';
import PortfolioPage from './pages/PortfolioPage';

function AppRoutes() {
  useStockWS();
  const { updateBalance, logout } = useStockStore();

  // Syncs balance from server on startup to clear any stale/NaN value in localStorage
  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then((me) => updateBalance(Number(me.balance)))
      .catch((err) => { if (err.response?.status === 401) logout(); });
  }, []);

  return (
    <Routes>
      <Route path="/"          element={<Dashboard />} />
      <Route path="/login"     element={<LoginPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
