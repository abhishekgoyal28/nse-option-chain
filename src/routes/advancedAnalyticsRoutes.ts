import { Router } from 'express';
import { AdvancedAnalyticsController } from '@/controllers/AdvancedAnalyticsController';
import { apiLimiter } from '@/middleware/security';

export function advancedAnalyticsRoutes(controller: AdvancedAnalyticsController): Router {
  const router = Router();

  // Apply rate limiting
  router.use(apiLimiter);

  /**
   * @route GET /api/advanced-analytics
   * @desc Get comprehensive advanced analytics (IV skew, GEX, OI clusters, patterns)
   * @access Public
   */
  router.get('/', controller.getAdvancedAnalytics);

  /**
   * @route GET /api/advanced-analytics/iv-skew
   * @desc Get IV skew analysis with trading implications
   * @access Public
   */
  router.get('/iv-skew', controller.getIVSkewAnalysis);

  /**
   * @route GET /api/advanced-analytics/gex
   * @desc Get Gamma Exposure (GEX) analysis with key levels
   * @access Public
   */
  router.get('/gex', controller.getGEXAnalysis);

  /**
   * @route GET /api/advanced-analytics/oi-clusters
   * @desc Get OI clustering analysis with migration detection
   * @access Public
   */
  router.get('/oi-clusters', controller.getOIClusterAnalysis);

  return router;
}
