import axios from 'axios';
import { authHeader } from './authService';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  total_value: number;
  profit_loss: number;
  profit_percent: number;
}

export interface PortfolioResponse {
  balance: number;
  total_stock_value: number;
  total_assets: number;
  portfolio: PortfolioItem[];
}

export interface Order {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_value: number;
  created_at: string;
}

export const getPortfolio = async (): Promise<PortfolioResponse> => {
  const { data } = await axios.get(`${BASE}/user/portfolio`, { headers: authHeader() });
  return data;
};

export const getOrders = async (): Promise<Order[]> => {
  const { data } = await axios.get(`${BASE}/user/orders`, { headers: authHeader() });
  return data;
};

export const placeOrder = async (symbol: string, type: 'BUY' | 'SELL', quantity: number) => {
  const { data } = await axios.post(
    `${BASE}/trade/order`,
    { symbol, type, quantity },
    { headers: authHeader() }
  );
  return data;
};

export const getServerWatchlist = async (): Promise<{ symbol: string }[]> => {
  const { data } = await axios.get(`${BASE}/user/watchlist`, { headers: authHeader() });
  return data;
};

export const addServerWatchlist = async (symbol: string) => {
  await axios.post(`${BASE}/user/watchlist`, { symbol }, { headers: authHeader() });
};

export const removeServerWatchlist = async (symbol: string) => {
  await axios.delete(`${BASE}/user/watchlist/${encodeURIComponent(symbol)}`, { headers: authHeader() });
};

export const getMe = async () => {
  const { data } = await axios.get(`${BASE}/user/me`, { headers: authHeader() });
  return data;
};
