import express from 'express';
import npzStore from './npz-store';
import npzRouter from './npz-router';
import engine from './npz-engine';

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

// Admin scores endpoint
router.get('/npz/scores', (req: any, res: any) => {
  try {
    const store = engine.getStore();
    const items = Object.values(store).map((r: any) => ({ laneId: r.laneId, score: r.score, lastSuccess: r.lastSuccess, lastFailure: r.lastFailure }));
    items.sort((a: any, b: any) => a.score - b.score);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
