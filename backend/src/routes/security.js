import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';

import {
  createBehaviorEvent,
} from '../controllers/behaviorController.js';

import {
  rebuildBaseline,
  getBaseline,
} from '../controllers/baselineController.js';

const router = Router();

router.post(
  '/events',
  requireAuth,
  createBehaviorEvent,
);

router.post(
  '/baseline/rebuild',
  requireAuth,
  rebuildBaseline,
);

router.get(
  '/baseline',
  requireAuth,
  getBaseline,
);

export default router;