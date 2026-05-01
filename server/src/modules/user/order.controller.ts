import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../../config/supabase.js';
import { SimulatorService } from '../../services/SimulatorService.js';

export const placeOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id: user_id } = (request as any).user;
  const { symbol, type, quantity } = request.body as any;

  if (!symbol || !type || !quantity || quantity <= 0) {
    return reply.status(400).send({ message: 'Invalid order data' });
  }

  const simulator = SimulatorService.getInstance();
  const currentPrice = await simulator.getCurrentPrice(symbol);

  if (!currentPrice) {
    return reply.status(400).send({ message: 'Stock symbol not found in market' });
  }

  const totalValue = currentPrice * quantity;

  try {
    const { data, error } = await supabase.rpc('place_order_atomic', {
      p_user_id: user_id,
      p_symbol: symbol,
      p_type: type,
      p_quantity: quantity,
      p_price: currentPrice
    });

    if (error) {
      return reply.status(500).send({ message: error.message });
    }

    if (!data.success) {
      return reply.status(400).send({ message: data.message });
    }

    return reply.send(data);
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};
