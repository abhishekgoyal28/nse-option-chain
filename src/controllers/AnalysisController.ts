import { Request, Response } from 'express';
import { DataService } from '@/services/DataService';
import { AnalysisService } from '@/services/AnalysisService';
import { asyncHandler } from '@/middleware/errorHandler';
import { NotFoundError } from '@/types';
import logger from '@/utils/logger';

export class AnalysisController {
  private analysisService: AnalysisService;

  constructor(private dataService: DataService) {
    this.analysisService = new AnalysisService();
  }

  public getMarketAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeframe = '1d' } = req.query;

      const historicalData = await this.dataService.getHistoricalData({ 
        timeframe: timeframe as any 
      });

      if (!historicalData.success || !historicalData.data || historicalData.data.timestamps.length === 0) {
        throw new NotFoundError('No data available for analysis');
      }

      const analysis = this.analysisService.performMarketAnalysis(historicalData.data);

      logger.info(`Market analysis generated for timeframe: ${timeframe}`);

      res.json({
        success: true,
        timeframe: timeframe,
        analysis: analysis,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Market analysis API error:', error);
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof NotFoundError ? 'No data available for analysis' : 'Analysis failed',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public getSignals = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeframe = '1d', priority = 'all' } = req.query;

      const historicalData = await this.dataService.getHistoricalData({ 
        timeframe: timeframe as any 
      });

      if (!historicalData.success || !historicalData.data || historicalData.data.timestamps.length === 0) {
        res.json({
          success: true,
          signals: [],
          summary: {
            total: 0,
            bullish: 0,
            bearish: 0,
            neutral: 0,
            strong: 0,
            high_priority: 0,
            bias: 'NEUTRAL'
          },
          message: 'No data available for signal analysis',
          timeframe,
          priority,
          generatedAt: new Date().toISOString()
        });
        return;
      }

      const signals = this.analysisService.generateSignals(historicalData.data, priority as string);
      const summary = this.analysisService.generateSignalSummary(signals);

      logger.info(`Generated ${signals.length} signals for timeframe: ${timeframe}, priority: ${priority}`);

      res.json({
        success: true,
        timeframe: timeframe,
        priority: priority,
        signals: signals,
        summary: summary,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Signals API error:', error);
      res.status(500).json({
        success: false,
        message: 'Signal generation failed',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public exportData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { format } = req.params;
      const { timeframe = 'all' } = req.query;

      if (!format || !['json', 'csv', 'xlsx'].includes(format.toLowerCase())) {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use json, csv, or xlsx',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const data = await this.dataService.getHistoricalData({ 
        timeframe: timeframe as any 
      });

      if (!data.success || !data.data || data.data.timestamps.length === 0) {
        throw new NotFoundError('No data available for export');
      }

      const exportData = this.prepareExportData(data.data, format.toLowerCase());
      const filename = `nifty-data-${timeframe}-${Date.now()}`;

      switch (format.toLowerCase()) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
          res.send(JSON.stringify(exportData, null, 2));
          break;

        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
          res.send(exportData);
          break;

        case 'xlsx':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
          res.send(exportData);
          break;
      }

      logger.info(`Data exported in ${format} format for timeframe: ${timeframe}`);
    } catch (error) {
      logger.error('Export API error:', error);
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof NotFoundError ? 'No data available for export' : 'Export failed',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public getWebSocketInfo = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      websocket: {
        available: false,
        endpoint: '/ws',
        protocols: ['nse-tracker']
      },
      polling: {
        recommended_interval: 30000,
        endpoints: {
          current_data: '/api/nifty-data',
          signals: '/api/signals',
          analysis: '/api/market-analysis'
        }
      },
      timestamp: new Date().toISOString()
    });
  });

  private prepareExportData(data: any, format: string): any {
    switch (format) {
      case 'json':
        return {
          metadata: {
            exported_at: new Date().toISOString(),
            data_points: data.timestamps.length,
            timeframe: data.timestamps.length > 0 ? {
              start: data.timestamps[0],
              end: data.timestamps[data.timestamps.length - 1]
            } : null
          },
          data: data
        };

      case 'csv':
        let csv = 'Timestamp,Date,Time,Spot Price,ATM Strike,Call OI,Call Volume,Call LTP,Put OI,Put Volume,Put LTP,PCR Volume,PCR OI\n';

        for (let i = 0; i < data.timestamps.length; i++) {
          const row = [
            data.timestamps[i],
            new Date(data.timestamps[i]).toLocaleDateString(),
            new Date(data.timestamps[i]).toLocaleTimeString(),
            data.spotPrices[i],
            data.atmStrikes ? data.atmStrikes[i] : '',
            data.calls.oi[i],
            data.calls.volume[i],
            data.calls.ltp[i],
            data.puts.oi[i],
            data.puts.volume[i],
            data.puts.ltp[i],
            data.ratios.pcr_volume[i],
            data.ratios.pcr_oi[i]
          ].join(',');

          csv += row + '\n';
        }

        return csv;

      case 'xlsx':
        return JSON.stringify(data, null, 2);

      default:
        return data;
    }
  }
}
