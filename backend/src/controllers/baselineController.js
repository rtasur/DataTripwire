import {
  calculateUserBaseline,
  getUserBaseline,
} from '../services/baseline/baselineService.js';

export async function rebuildBaseline(req, res) {
  try {
    const baseline = await calculateUserBaseline(
      req.auth.userId,
    );

    if (!baseline) {
      return res.status(404).json({
        error: 'No behavior data available for baseline',
      });
    }

    return res.status(200).json({
      baseline,
    });
  } catch (error) {
    console.error('Baseline calculation error:', error);

    return res.status(500).json({
      error: 'Unable to calculate baseline',
    });
  }
}

export async function getBaseline(req, res) {
  try {
    const baseline = await getUserBaseline(
      req.auth.userId,
    );

    if (!baseline) {
      return res.status(404).json({
        error: 'Baseline not found',
      });
    }

    return res.status(200).json({
      baseline,
    });
  } catch (error) {
    console.error('Baseline retrieval error:', error);

    return res.status(500).json({
      error: 'Unable to retrieve baseline',
    });
  }
}