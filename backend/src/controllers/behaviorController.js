import {
  recordBehaviorEvent,
} from '../services/behavior/behaviorService.js';

import {
  evaluateBehaviorRisk,
  saveRiskDecision,
} from '../services/risk/riskService.js';

import {
  applyPolicy,
} from '../services/policy/policyService.js';

import {
  createAuditLog,
} from '../services/policy/auditService.js';

export async function createBehaviorEvent(req, res) {
  try {
    const {
      event_type: eventType,
      resource,
      method,
      device_id: deviceId,
      location,
      request_count: requestCount,
      metadata,
    } = req.body;

    if (!eventType) {
      return res.status(400).json({
        error: 'event_type is required',
      });
    }

    if (
      requestCount !== undefined &&
      (!Number.isInteger(requestCount) ||
        requestCount < 0)
    ) {
      return res.status(400).json({
        error:
          'request_count must be a non-negative integer',
      });
    }

    const event = await recordBehaviorEvent({
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      eventType,
      resource,
      method,
      deviceId,
      location,
      ipAddress: req.ip,
      requestCount,
      metadata,
    });

    const riskResult = await evaluateBehaviorRisk({
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      event,
    });

    const riskDecision = await saveRiskDecision({
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      result: riskResult,
    });

    const policyResult = await applyPolicy({
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      decision: riskDecision.decision,
    });

    await createAuditLog({
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      riskDecisionId: riskDecision.id,
      action: 'RISK_DECISION',
      previousState: 'ACTIVE',
      newState: policyResult.sessionStatus.toUpperCase(),
      details: {
        score: riskDecision.new_score,
        decision: riskDecision.decision,
        requiredAction: policyResult.requiredAction,
        enforcement: policyResult.enforcement,
        factors: riskDecision.risk_factors,
        explanation: riskDecision.explanation,
      },
    });

    return res.status(201).json({
      event,
      risk: {
        previous_score: riskDecision.previous_score,
        new_score: riskDecision.new_score,
        decision: riskDecision.decision,
        factors: riskDecision.risk_factors,
        explanation: riskDecision.explanation,
      },
      policy: policyResult,
    });
  } catch (error) {
    console.error(
      'Behavior/risk processing error:',
      error,
    );

    if (
      error.message === 'Session not found' ||
      error.message === 'Session is not active'
    ) {
      return res.status(401).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Unable to process behavior event',
    });
  }
}