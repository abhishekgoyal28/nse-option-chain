import { Request, Response } from 'express';
import { DataService } from '@/services/DataService';
import { asyncHandler } from '@/middleware/errorHandler';
import { ValidationError } from '@/types';
import logger from '@/utils/logger';

export class GoogleSheetsController {
  constructor(private dataService: DataService) {}

  public getSheetsStatus = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      const sheetInfo = await this.dataService.getGoogleSheetsStatus();
      
      res.json({
        success: true,
        googleSheets: sheetInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting Google Sheets status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Google Sheets status',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public getSheetsHistoricalData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.dataService.isGoogleSheetsConfigured()) {
        throw new ValidationError('Google Sheets service not configured');
      }

      const { date, strikePrice, limit } = req.query;

      const filters: any = {};
      if (date) filters.date = date as string;
      if (strikePrice) filters.strikePrice = parseInt(strikePrice as string);
      if (limit) filters.limit = parseInt(limit as string);

      const historicalData = await this.dataService.getGoogleSheetsHistoricalData(filters);

      logger.info(`Google Sheets historical data fetched: ${historicalData.length} records`);

      res.json({
        success: true,
        data: historicalData,
        count: historicalData.length,
        filters: filters,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching historical data from Google Sheets:', error);
      res.status(error instanceof ValidationError ? 400 : 500).json({
        success: false,
        error: 'Failed to fetch historical data from Google Sheets',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public getSheetsDailySummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.dataService.isGoogleSheetsConfigured()) {
        throw new ValidationError('Google Sheets service not configured');
      }

      const { date } = req.query;
      const summaryData = await this.dataService.getGoogleSheetsDailySummary(date as string);

      logger.info(`Google Sheets daily summary fetched for date: ${date || 'today'}`);

      res.json({
        success: true,
        data: summaryData,
        date: date || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching daily summary from Google Sheets:', error);
      res.status(error instanceof ValidationError ? 400 : 500).json({
        success: false,
        error: 'Failed to fetch daily summary from Google Sheets',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });
}
