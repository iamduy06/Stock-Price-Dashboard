import { supabase } from '../../config/supabase.js';

export const getAllStocks = async () => {
  const { data, error } = await supabase
    .from('stocks')
    .select('*');

  if (error) throw error;
  return data;
};

export const getStockHistory = async (symbol: string, timeframe: string = '1D', limit: number = 100) => {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};
