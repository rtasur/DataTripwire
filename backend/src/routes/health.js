import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ service: 'backend', status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
