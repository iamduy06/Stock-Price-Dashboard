import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { makePlaceOrder } from './trade.controller';
import { RelayManager } from '../../relay';

export const makeTradeRouter = (relay: RelayManager) => {
  const router = Router();
  router.post('/order', requireAuth, makePlaceOrder(relay));
  return router;
};
