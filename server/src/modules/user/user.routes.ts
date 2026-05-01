import { FastifyInstance } from 'fastify';
import { getPortfolio } from './user.controller.js';
import { placeOrder } from './order.controller.js';
import { getOrderHistory } from './order.history.controller.js';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from './watchlist.controller.js';
import { authenticate } from '../auth/auth.middleware.js';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/portfolio', getPortfolio);
  fastify.post('/orders/place', placeOrder);
  fastify.get('/orders', getOrderHistory);
  
  fastify.get('/watchlist', getWatchlist);
  fastify.post('/watchlist', addToWatchlist);
  fastify.delete('/watchlist/:symbol', removeFromWatchlist);
}
