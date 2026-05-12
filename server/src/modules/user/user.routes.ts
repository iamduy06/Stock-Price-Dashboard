import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { makeGetPortfolio, getOrderHistory, getMe } from './user.controller';
import { getWatchlist, addWatchlist, removeWatchlist } from './watchlist.controller';
import { RelayManager } from '../../relay';

export const makeUserRouter = (relay: RelayManager) => {
  const router = Router();

  router.get('/me',        requireAuth, getMe);
  router.get('/portfolio', requireAuth, makeGetPortfolio(relay));
  router.get('/orders',    requireAuth, getOrderHistory);

  router.get('/watchlist',           requireAuth, getWatchlist);
  router.post('/watchlist',          requireAuth, addWatchlist);
  router.delete('/watchlist/:symbol', requireAuth, removeWatchlist);

  return router;
};
