import { Router } from 'express';
import { EnhancedBreakoutController } from '@/controllers/EnhancedBreakoutController';
import { apiLimiter } from '@/middleware/security';

export function enhancedBreakoutRoutes(controller: EnhancedBreakoutController): Router {
  const router = Router();

  // Apply rate limiting
  router.use(apiLimiter);

  /**
   * @route GET /api/enhanced-breakouts
   * @desc Get all enhanced breakout signals with advanced options analysis
   * @access Public
   */
  router.get('/', controller.getEnhancedBreakoutSignals);

  /**
   * @route GET /api/enhanced-breakouts/type/:type
   * @desc Get breakout signals filtered by specific type
   * @param type - Signal type (e.g., OI_IMBALANCE, VWAP_BREAKOUT, etc.)
   * @access Public
   */
  router.get('/type/:type', controller.getSignalsByType);

  /**
   * @route GET /api/enhanced-breakouts/high-confidence
   * @desc Get high confidence breakout signals
   * @query minConfidence - Minimum confidence threshold (default: 0.7)
   * @access Public
   */
  router.get('/high-confidence', controller.getHighConfidenceSignals);

  return router;
}
