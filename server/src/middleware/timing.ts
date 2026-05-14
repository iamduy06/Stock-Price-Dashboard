import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../db';

// Measures response time per request and writes to SQLite for latency stats.
export function timingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const endpoint = normalise(req.path);
    logRequest(endpoint, req.method, res.statusCode, durationMs);
  });

  next();
}

function normalise(p: string): string {
  return p.replace(/\/[^/]+$/, '/:param');
}
