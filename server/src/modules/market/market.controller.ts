import type { FastifyRequest, FastifyReply } from 'fastify';
import * as MarketService from './market.service.js';

export const getStocks = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const stocks = await MarketService.getAllStocks();
    
    return reply.send(stocks);
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};

export const getHistory = async (request: FastifyRequest, reply: FastifyReply) => {
  const { symbol } = request.params as any;
  const { timeframe } = request.query as any;

  try {
    const history = await MarketService.getStockHistory(symbol, timeframe);
    return reply.send(history);
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};

export const getStockDetail = async (request: FastifyRequest, reply: FastifyReply) => {
  const { symbol } = request.params as any;
  try {
    const { supabase } = await import('../../config/supabase.js');
    const { SimulatorService } = await import('../../services/SimulatorService.js');

    const { data: stock } = await supabase.from('stocks').select('*').eq('symbol', symbol).single();
    if (!stock) return reply.status(404).send({ message: 'Stock not found' });

    const currentPrice = await SimulatorService.getInstance().getCurrentPrice(symbol);

    return reply.send({
      ...stock,
      current_price: currentPrice || stock.reference_price
    });
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};

export const getTopMovers = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { SimulatorService } = await import('../../services/SimulatorService.js');
    return reply.send(SimulatorService.getInstance().getTopMovers());
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};
