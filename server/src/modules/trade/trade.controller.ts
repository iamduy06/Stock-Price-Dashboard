import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthRequest } from '../auth/auth.middleware';
import { RelayManager } from '../../relay';

const MAX_QUANTITY = 1_000_000;

export const makePlaceOrder = (relay: RelayManager) =>
  async (req: AuthRequest, res: Response) => {
    const user_id = req.user!.id;
    const { symbol, type, quantity } = req.body as {
      symbol?: string;
      type?: string;
      quantity?: number;
    };

    if (!symbol || !type || quantity == null)
      return res.status(400).json({ message: 'symbol, type, and quantity are required' });

    if (type !== 'BUY' && type !== 'SELL')
      return res.status(400).json({ message: 'type must be BUY or SELL' });

    // Validate quantity: must be a positive integer
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY)
      return res.status(400).json({ message: `quantity must be a whole number between 1 and ${MAX_QUANTITY}` });

    // Validate symbol: reasonable length, no injection chars
    if (typeof symbol !== 'string' || symbol.length > 20 || !/^[A-Z0-9:._-]+$/i.test(symbol))
      return res.status(400).json({ message: 'Invalid symbol format' });

    const price = relay.getPrice(symbol.toUpperCase());
    if (!price)
      return res.status(400).json({ message: 'Symbol not found or no price available — subscribe to it on the dashboard first' });

    try {
      const { data, error } = await supabase.rpc('place_order_atomic', {
        p_user_id:  user_id,
        p_symbol:   symbol.toUpperCase(),
        p_type:     type,
        p_quantity: quantity,
        p_price:    price,
      });

      if (error) return res.status(500).json({ message: 'Order failed, please try again' });
      if (!data.success) return res.status(400).json({ message: data.message });

      return res.json(data);
    } catch (err: any) {
      console.error('[placeOrder] error:', err.message);
      return res.status(500).json({ message: 'Order failed, please try again' });
    }
  };
