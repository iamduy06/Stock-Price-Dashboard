import type { FastifyInstance } from 'fastify';
import { getStocks, getHistory, getStockDetail, getTopMovers } from './market.controller.js';

export default async function marketRoutes(fastify: FastifyInstance) {
  fastify.get('/', getStocks);
  fastify.get('/top-movers', getTopMovers);
  fastify.get('/:symbol', getStockDetail);
  fastify.get('/:symbol/history', getHistory);
}
