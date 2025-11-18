import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import npzRouter, { npzRoute } from './npz-router';
import npzStore from './npz-store';
import npz from './npz';
import logger from './logger';

export type NpzMiddlewareOptions = {
  lanes?: any[];
  cookieName?: string;
  cookieMaxAge?: number;
};

export function npzMiddleware(opts: NpzMiddlewareOptions = {}) {
  const cookieName = opts.cookieName || 'npz_lane';
  const lanes = opts.lanes || undefined;
  const maxAge = opts.cookieMaxAge || 24 * 3600; // seconds

  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      // assign npz_id
      const npz_id = (req.headers['x-npz-id'] as string) || req.cookies?.['npz_id'] || uuidv4();
      res.cookie('npz_id', npz_id, { maxAge: maxAge * 1000, httpOnly: true });
      npzStore.createRequestRecord(npz_id, { path: req.path, method: req.method });

      // determine lanes and host
      const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

      // try NPZ router first
      const report = await npzRoute({ method: req.method, url: fullUrl, headers: req.headers as any, body: (req as any).body });

      if (report && (report.status || report.body)) {
        // if lane preference updated, set cookie
        const rec = npzStore.getRequestRecord(npz_id);
        if (rec && rec.laneId !== undefined) {
          res.cookie(cookieName, String(rec.laneId), { maxAge: maxAge * 1000 });
        }
        // send response upstream body
        if (report.status) res.status(report.status);
        res.set(report.headers || {});
        res.send(report.body || '');
        return;
      }

      next();
    } catch (err) {
      logger.warn(`npz-middleware: error ${err}`);
      next();
    }
  };
}

export default npzMiddleware;
