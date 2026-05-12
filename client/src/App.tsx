import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStockWS } from './hooks/useStockWS';
import Dashboard from './components/Dashboard';
import LoginPage from './pages/LoginPage';
import PortfolioPage from './pages/PortfolioPage';

function AppRoutes() {
  useStockWS(); // WebSocket persistent across all routes
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
