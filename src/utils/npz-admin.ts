import express from 'express';
import npzStore from './npz-store';
import npzRouter from './npz-router';

const router = express.Router();

function requireToken(req: any, res: any, next: any) {
  const token = process.env.NPZ_ADMIN_TOKEN;
  if (!token) return res.status(403).json({ error: 'admin token not configured' });
  const provided = req.headers['x-admin-token'] || req.query.token;
  if (!provided || provided !== token) return res.status(401).json({ error: 'invalid token' });
  next();
}

router.use('/npz', requireToken);

router.get('/npz/inspect/:id', async (req: any, res: any) => {
  const r = await npzStore.getRequestRecord(req.params.id);
  res.json(r || { error: 'not found' });
});

router.get('/npz/lanes', (req: any, res: any) => {
  res.json(npzRouter.DEFAULT_LANES);
});

router.get('/npz/preferred/:host', (req: any, res: any) => {
  const host = req.params.host;
  const pref = npzRouter.getPreferredLane(host);
  res.json({ host, preferred: pref });
});

router.get('/npz/circuit/:host', (req: any, res: any) => {
  const host = req.params.host;
  const state = npzRouter.getCircuitState(host);
  res.json(state);
});

export default router;
