import { Router, Request, Response } from 'express';
import { getLatencyStats } from '../db';
import { RelayManager } from '../relay';
import { requireAuth } from '../modules/auth/auth.middleware';

export function makeStatsRouter(relay: RelayManager) {
  const router = Router();

  router.get('/latency', requireAuth, (req: Request, res: Response) => {
    const window = Math.min(Number(req.query.window ?? 3600), 86400);
    const endpoints = getLatencyStats(window);
    const ws = relay.getStats();

    res.json({
      window_s: window,
      generated_at: new Date().toISOString(),
      endpoints,
      websocket: ws,
    });
  });

  router.get('/system', requireAuth, (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    res.json({
      uptime_s:    Math.floor(process.uptime()),
      node_version: process.version,
      memory: {
        rss_mb:       (mem.rss       / 1024 / 1024).toFixed(1),
        heap_used_mb: (mem.heapUsed  / 1024 / 1024).toFixed(1),
        heap_total_mb:(mem.heapTotal / 1024 / 1024).toFixed(1),
      },
    });
  });

  return router;
}
