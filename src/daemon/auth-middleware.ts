// ROME-TAG: 0x92EED4

import { Request, Response, NextFunction } from 'express';

export function requireQflushToken(req: Request, res: Response, next: NextFunction) {
  const token = process.env.QFLUSH_TOKEN || '';
  if (!token) return res.status(401).json({ success: false, error: 'QFLUSH_TOKEN not configured on server' });
  const header = req.headers['x-qflush-token'] as string | undefined;
  if (!header || header !== token) return res.status(403).json({ success: false, error: 'invalid token' });
  return next();
}
