import { Request, Response } from 'express';
import { EnhancedBreakoutSignalService, BreakoutSignal } from '@/services/EnhancedBreakoutSignalService';
import { DataService } from '@/services/DataService';
import { asyncHandler } from '@/utils/asyncHandler';
import logger from '@/utils/logger';

export class EnhancedBreakoutController {
  constructor(
    private enhancedBreakoutService: EnhancedBreakoutSignalService,
    private dataService: DataService
  ) {}

  public getEnhancedBreakoutSignals = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      // First try to get cached signals from real-time processing
      const cachedSignals = this.getCachedSignals();
      
      if (cachedSignals && cachedSignals.length > 0) {
        const categorizedSignals = this.categorizeSignals(cachedSignals);
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          signalCount: cachedSignals.length,
          source: 'real-time',
          data: {
            signals: cachedSignals,
            categorized: categorizedSignals,
            summary: this.generateSignalSummary(cachedSignals)
          }
        });
        return;
      }

      // Fallback to on-demand generation
      const currentData = await this.getCurrentMarketData();
      if (!currentData) {
        res.status(404).json({
          success: false,
          error: 'No current market data available'
        });
        return;
      }

      const historicalData = await this.getHistoricalDataForAnalysis();
      if (!historicalData) {
        res.status(404).json({
          success: false,
          error: 'Insufficient historical data for analysis'
        });
        return;
      }

      // Generate enhanced breakout signals on-demand
      const signals = this.enhancedBreakoutService.generateEnhancedBreakoutSignals(
        currentData,
        historicalData
      );

      const categorizedSignals = this.categorizeSignals(signals);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        signalCount: signals.length,
        source: 'on-demand',
        data: {
          signals,
          categorized: categorizedSignals,
          summary: this.generateSignalSummary(signals)
        }
      });

    } catch (error) {
      logger.error('Error getting enhanced breakout signals:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  private getCachedSignals(): BreakoutSignal[] | null {
    // This would access the cached signals from the server instance
    // For now, return null to indicate no cached signals
    return null;
  }

  public getSignalsByType = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { type } = req.params;
    
    try {
      const currentData = await this.getCurrentMarketData();
      const historicalData = await this.getHistoricalDataForAnalysis();

      if (!currentData || !historicalData) {
        res.status(404).json({
          success: false,
          error: 'Insufficient data for analysis'
        });
        return;
      }

      const allSignals = this.enhancedBreakoutService.generateEnhancedBreakoutSignals(
        currentData,
        historicalData
      );

      const filteredSignals = allSignals.filter(signal => 
        signal.type.toLowerCase().includes(type.toLowerCase())
      );

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        signalType: type,
        signalCount: filteredSignals.length,
        data: filteredSignals
      });

    } catch (error) {
      logger.error(`Error getting signals by type ${type}:`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  public getHighConfidenceSignals = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const minConfidence = parseFloat(req.query['minConfidence'] as string) || 0.7;
    
    try {
      const currentData = await this.getCurrentMarketData();
      const historicalData = await this.getHistoricalDataForAnalysis();

      if (!currentData || !historicalData) {
        res.status(404).json({
          success: false,
          error: 'Insufficient data for analysis'
        });
        return;
      }

      const allSignals = this.enhancedBreakoutService.generateEnhancedBreakoutSignals(
        currentData,
        historicalData
      );

      const highConfidenceSignals = allSignals.filter(signal => 
        signal.confidence >= minConfidence
      );

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        minConfidence,
        signalCount: highConfidenceSignals.length,
        data: highConfidenceSignals.sort((a, b) => b.confidence - a.confidence)
      });

    } catch (error) {
      logger.error('Error getting high confidence signals:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  private async getCurrentMarketData(): Promise<any> {
    try {
      // This would integrate with your existing data service
      // For now, return null to indicate we need to implement this
      return null;
    } catch (error) {
      logger.error('Error getting current market data:', error);
      return null;
    }
  }

  private async getHistoricalDataForAnalysis(): Promise<any> {
    try {
      // This would integrate with your existing historical data
      // For now, return null to indicate we need to implement this
      return null;
    } catch (error) {
      logger.error('Error getting historical data:', error);
      return null;
    }
  }

  private categorizeSignals(signals: BreakoutSignal[]): {
    highConfidence: BreakoutSignal[];
    mediumConfidence: BreakoutSignal[];
    lowConfidence: BreakoutSignal[];
    bullish: BreakoutSignal[];
    bearish: BreakoutSignal[];
    neutral: BreakoutSignal[];
  } {
    return {
      highConfidence: signals.filter(s => s.confidence >= 0.8),
      mediumConfidence: signals.filter(s => s.confidence >= 0.6 && s.confidence < 0.8),
      lowConfidence: signals.filter(s => s.confidence < 0.6),
      bullish: signals.filter(s => s.direction === 'bullish'),
      bearish: signals.filter(s => s.direction === 'bearish'),
      neutral: signals.filter(s => s.direction === 'neutral')
    };
  }

  private generateSignalSummary(signals: BreakoutSignal[]): {
    totalSignals: number;
    averageConfidence: number;
    averageStrength: number;
    dominantDirection: string;
    signalTypes: { [key: string]: number };
    timeframes: { [key: string]: number };
  } {
    if (signals.length === 0) {
      return {
        totalSignals: 0,
        averageConfidence: 0,
        averageStrength: 0,
        dominantDirection: 'neutral',
        signalTypes: {},
        timeframes: {}
      };
    }

    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;

    // Count directions
    const directions = { bullish: 0, bearish: 0, neutral: 0 };
    signals.forEach(s => directions[s.direction]++);
    const dominantDirection = Object.keys(directions).reduce((a, b) => 
      directions[a as keyof typeof directions] > directions[b as keyof typeof directions] ? a : b
    );

    // Count signal types
    const signalTypes: { [key: string]: number } = {};
    signals.forEach(s => {
      signalTypes[s.type] = (signalTypes[s.type] || 0) + 1;
    });

    // Count timeframes
    const timeframes: { [key: string]: number } = {};
    signals.forEach(s => {
      timeframes[s.timeframe] = (timeframes[s.timeframe] || 0) + 1;
    });

    return {
      totalSignals: signals.length,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      averageStrength: Math.round(avgStrength * 100) / 100,
      dominantDirection,
      signalTypes,
      timeframes
    };
  }
}
