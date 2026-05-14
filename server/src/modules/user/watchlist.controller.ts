import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthRequest } from '../auth/auth.middleware';

const SYMBOL_RE = /^[A-Z0-9:._-]{1,20}$/i;

export const getWatchlist = async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;
  try {
    const { data, error } = await supabase
      .from('watchlists')
      .select('symbol, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    console.error('[getWatchlist]', err.message);
    return res.status(500).json({ message: 'Failed to load watchlist' });
  }
};

export const addWatchlist = async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;
  const { symbol } = req.body as { symbol?: string };

  if (!symbol || !SYMBOL_RE.test(symbol))
    return res.status(400).json({ message: 'Invalid symbol format' });

  try {
    const { data, error } = await supabase
      .from('watchlists')
      .insert({ user_id, symbol: symbol.toUpperCase() })
      .select()
      .single();
    if (error) return res.status(400).json({ message: 'Already in watchlist or invalid symbol' });
    return res.status(201).json(data);
  } catch (err: any) {
    console.error('[addWatchlist]', err.message);
    return res.status(500).json({ message: 'Failed to update watchlist' });
  }
};

export const removeWatchlist = async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;
  const { symbol } = req.params;

  try {
    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('user_id', user_id)
      .eq('symbol', symbol);
    if (error) throw error;
    return res.json({ message: 'Removed from watchlist' });
  } catch (err: any) {
    console.error('[removeWatchlist]', err.message);
    return res.status(500).json({ message: 'Failed to update watchlist' });
  }
};
