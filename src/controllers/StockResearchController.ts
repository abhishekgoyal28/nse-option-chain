import { Request, Response } from 'express';
import { StockResearchService } from '@/services/StockResearchService';
import { asyncHandler } from '@/utils/asyncHandler';
import logger from '@/utils/logger';
import axios from 'axios';

export class StockResearchController {
  constructor(private stockResearchService: StockResearchService) {}

  public researchStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
      return;
    }

    logger.info(`Stock research request: ${query}`);
    
    try {
      const research = await this.stockResearchService.researchStock(query.trim());
      
      res.json({
        success: true,
        query: query.trim(),
        data: research,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Stock research error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query || ''
      });
    }
  });

  public getStockSuggestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({
        success: true,
        suggestions: []
      });
      return;
    }

    try {
      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q.trim())}&quotesCount=10`;
      const response = await axios.get(searchUrl, {
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const quotes = response.data?.quotes || [];
      
      const suggestions = quotes
        .filter((quote: any) => quote.symbol && quote.shortname)
        .slice(0, 8)
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname,
          exchange: quote.exchange || 'Unknown',
          type: quote.quoteType || 'EQUITY'
        }));

      res.json({
        success: true,
        query: q.trim(),
        suggestions
      });
      
    } catch (error) {
      logger.error('Stock search error:', error);
      res.json({
        success: true,
        query: q as string || '',
        suggestions: []
      });
    }
  });
}
