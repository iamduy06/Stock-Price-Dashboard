import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/auth` : 'http://localhost:3001/api/auth';

export interface AuthUser {
  id: string;
  username: string;
  balance: number;
}

export const register = async (username: string, password: string): Promise<{ token: string; user: AuthUser }> => {
  const { data } = await axios.post(`${API}/register`, { username, password });
  return data;
};

export const login = async (username: string, password: string): Promise<{ token: string; user: AuthUser }> => {
  const { data } = await axios.post(`${API}/login`, { username, password });
  return data;
};

export const saveSession = (token: string, user: AuthUser) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const getToken = (): string | null => localStorage.getItem('token');

export const getUser = (): AuthUser | null => {
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as AuthUser) : null;
};

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
