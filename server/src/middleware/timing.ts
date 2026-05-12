import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../db';

/**
 * Express middleware that measures response time and persists it to SQLite.
 * Strips query-string and numeric path segments so endpoints aggregate cleanly:
 *   /api/candles/AAPL?resolution=D  →  /api/candles/:symbol
 */
export function timingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const endpoint = normalise(req.path);
    logRequest(endpoint, req.method, res.statusCode, durationMs);
  });

  next();
}

// Replace last path segment (the dynamic :symbol / :id part) with a placeholder
function normalise(p: string): string {
  return p.replace(/\/[^/]+$/, '/:param');
}
