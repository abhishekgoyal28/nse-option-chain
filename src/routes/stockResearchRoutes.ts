import { Router } from 'express';
import { StockResearchController } from '@/controllers/StockResearchController';
import { apiLimiter } from '@/middleware/security';

export function stockResearchRoutes(controller: StockResearchController): Router {
  const router = Router();

  // Apply rate limiting
  router.use(apiLimiter);

  /**
   * @route POST /api/stock-research
   * @desc Research a stock with comprehensive analysis
   * @body { query: string } - Stock name or symbol to research
   * @access Public
   */
  router.post('/', controller.researchStock);

  /**
   * @route GET /api/stock-search
   * @desc Get stock search suggestions
   * @query q - Search query string
   * @access Public
   */
  router.get('/search', controller.getStockSuggestions);

  return router;
}
