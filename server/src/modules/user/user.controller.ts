import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../../config/supabase.js';
import { SimulatorService } from '../../services/SimulatorService.js';

export const getPortfolio = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id: user_id } = (request as any).user;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user_id)
      .single();

    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user_id);

    const simulator = SimulatorService.getInstance();
    
    const stocksWithRealtime = await Promise.all((portfolio || []).map(async (item) => {
      const currentPrice = await simulator.getCurrentPrice(item.symbol) || Number(item.average_price);
      return {
        ...item,
        current_price: currentPrice,
        total_value: currentPrice * item.quantity,
        profit_loss: (currentPrice - Number(item.average_price)) * item.quantity,
        profit_percent: ((currentPrice - Number(item.average_price)) / Number(item.average_price)) * 100
      };
    }));

    const totalStockValue = stocksWithRealtime.reduce((sum, item) => sum + item.total_value, 0);

    return reply.send({
      balance: user?.balance,
      total_stock_value: totalStockValue,
      total_assets: Number(user?.balance) + totalStockValue,
      portfolio: stocksWithRealtime
    });
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};
