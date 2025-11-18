import express from 'express';
import npzStore from './npz-store';
import npzRouter from './npz-router';

const router = express.Router();

router.get('/npz/inspect/:id', async (req, res) => {
  const r = await npzStore.getRequestRecord(req.params.id);
  res.json(r || { error: 'not found' });
});

router.get('/npz/lanes', (req, res) => {
  res.json(npzRouter.DEFAULT_LANES);
});

router.get('/npz/preferred/:host', (req, res) => {
  const host = req.params.host;
  const pref = npzRouter.getPreferredLane(host);
  res.json({ host, preferred: pref });
});

router.get('/npz/circuit/:host', (req, res) => {
  const host = req.params.host;
  const state = npzRouter.getCircuitState(host);
  res.json(state);
});

export default router;
