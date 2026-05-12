import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthRequest } from '../auth/auth.middleware';
import { RelayManager } from '../../relay';

export const makeGetPortfolio = (relay: RelayManager) =>
  async (req: AuthRequest, res: Response) => {
    const user_id = req.user!.id;

    try {
      const [{ data: user, error: userErr }, { data: portfolio, error: portErr }] = await Promise.all([
        supabase.from('users').select('balance').eq('id', user_id).single(),
        supabase.from('portfolios').select('*').eq('user_id', user_id),
      ]);

      if (userErr) throw userErr;
      if (portErr) throw portErr;

      const holdings = (portfolio ?? []).map((item) => {
        const currentPrice = relay.getPrice(item.symbol) ?? Number(item.average_price);
        const totalValue   = currentPrice * item.quantity;
        const profitLoss   = (currentPrice - Number(item.average_price)) * item.quantity;
        const profitPct    = Number(item.average_price) > 0
          ? (profitLoss / (Number(item.average_price) * item.quantity)) * 100
          : 0;
        return { ...item, current_price: currentPrice, total_value: totalValue, profit_loss: profitLoss, profit_percent: profitPct };
      });

      const totalStockValue = holdings.reduce((sum, h) => sum + h.total_value, 0);

      return res.json({
        balance:           user?.balance ?? 0,
        total_stock_value: totalStockValue,
        total_assets:      Number(user?.balance ?? 0) + totalStockValue,
        portfolio:         holdings,
      });
    } catch (err: any) {
      console.error('[getPortfolio]', err.message);
      return res.status(500).json({ message: 'Failed to load portfolio' });
    }
  };

export const getOrderHistory = async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    console.error('[getOrderHistory]', err.message);
    return res.status(500).json({ message: 'Failed to load orders' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, balance, created_at')
      .eq('id', user_id)
      .single();
    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    console.error('[getMe]', err.message);
    return res.status(500).json({ message: 'Failed to load user data' });
  }
};
