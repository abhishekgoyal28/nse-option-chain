import { Router } from 'express';
import { BreakoutController } from '@/controllers/BreakoutController';
import { apiLimiter } from '@/middleware/security';
import { validateBreakoutConfig } from '@/middleware/validation';

export function breakoutRoutes(controller: BreakoutController): Router {
  const router = Router();

  // Apply rate limiting to all breakout routes
  router.use(apiLimiter);

  /**
   * @route GET /api/breakouts/current
   * @desc Get current breakout analysis with all detected patterns
   * @access Public
   */
  router.get('/current', controller.getCurrentBreakouts);

  /**
   * @route GET /api/breakouts/summary
   * @desc Get breakout signals summary with key metrics
   * @access Public
   */
  router.get('/summary', controller.getBreakoutSummary);

  /**
   * @route GET /api/breakouts/alerts
   * @desc Get high priority breakout alerts for immediate action
   * @access Public
   */
  router.get('/alerts', controller.getHighPriorityAlerts);

  /**
   * @route GET /api/breakouts/pattern/:pattern
   * @desc Get breakout signals filtered by specific pattern type
   * @param pattern - Pattern type (e.g., VWAP_VOLUME_BREAKOUT, OI_PRICE_DIVERGENCE)
   * @access Public
   */
  router.get('/pattern/:pattern', controller.getBreakoutsByPattern);

  /**
   * @route GET /api/breakouts/historical
   * @desc Get historical breakout data with filtering options
   * @query timeframe - Time range (1h, 4h, 1d, 7d, 30d, all)
   * @query limit - Maximum number of records to return
   * @access Public
   */
  router.get('/historical', controller.getHistoricalBreakouts);

  /**
   * @route GET /api/breakouts/stats
   * @desc Get comprehensive breakout detection statistics
   * @access Public
   */
  router.get('/stats', controller.getBreakoutStats);

  /**
   * @route GET /api/breakouts/config
   * @desc Get current breakout detection configuration
   * @access Public
   */
  router.get('/config', controller.getBreakoutConfig);

  /**
   * @route PUT /api/breakouts/config
   * @desc Update breakout detection configuration
   * @body Partial<BreakoutConfig> - Configuration parameters to update
   * @access Public
   */
  router.put('/config', validateBreakoutConfig, controller.updateBreakoutConfig);

  return router;
}
