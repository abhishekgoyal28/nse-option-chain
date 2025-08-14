import { Request, Response } from 'express';
import { BreakoutDetectionService } from '@/services/BreakoutDetectionService';
import { DataService } from '@/services/DataService';
import { ApiResponse } from '@/types';
import { BreakoutAnalysisResult, BreakoutConfig } from '@/types/breakout';
import logger from '@/utils/logger';

export class BreakoutController {
  constructor(
    private breakoutService: BreakoutDetectionService,
    private _dataService: DataService // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {}

  /**
   * Get current breakout analysis
   */
  public getCurrentBreakouts = async (_req: Request, res: Response): Promise<void> => {
    try {
      const analysis = this.breakoutService.analyzeBreakouts();
      
      const response: ApiResponse<BreakoutAnalysisResult> = {
        success: true,
        data: analysis,
        message: `Found ${analysis.summary.totalSignals} breakout signals`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
      logger.info(`Breakout analysis returned ${analysis.summary.totalSignals} signals`);
    } catch (error) {
      logger.error('Error getting current breakouts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze breakouts',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get breakout signals summary
   */
  public getBreakoutSummary = async (_req: Request, res: Response): Promise<void> => {
    try {
      const analysis = this.breakoutService.analyzeBreakouts();
      
      const summary = {
        ...analysis.summary,
        marketState: analysis.marketState,
        lastAnalyzed: analysis.lastAnalyzed,
        activeSignals: analysis.signals.filter(s => s.actionable),
        highPrioritySignals: analysis.signals.filter(s => s.priority === 'HIGH'),
        recentSignals: analysis.signals.slice(-5) // Last 5 signals
      };

      const response: ApiResponse = {
        success: true,
        data: summary,
        message: `Breakout summary with ${summary.totalSignals} total signals`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting breakout summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get breakout summary',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get breakout signals by pattern type
   */
  public getBreakoutsByPattern = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pattern } = req.params;
      
      if (!pattern) {
        res.status(400).json({
          success: false,
          error: 'Pattern parameter is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const analysis = this.breakoutService.analyzeBreakouts();
      
      const filteredSignals = analysis.signals.filter(signal => 
        signal.pattern === pattern.toUpperCase()
      );

      const response: ApiResponse = {
        success: true,
        data: {
          pattern: pattern.toUpperCase(),
          signals: filteredSignals,
          count: filteredSignals.length,
          summary: analysis.summary
        },
        message: `Found ${filteredSignals.length} signals for pattern ${pattern}`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting breakouts by pattern:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get breakouts by pattern',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get high priority breakout alerts
   */
  public getHighPriorityAlerts = async (_req: Request, res: Response): Promise<void> => {
    try {
      const analysis = this.breakoutService.analyzeBreakouts();
      
      const highPrioritySignals = analysis.signals.filter(signal => 
        signal.priority === 'HIGH' && signal.actionable
      );

      const alerts = highPrioritySignals.map(signal => ({
        id: signal.id,
        type: signal.type,
        pattern: signal.pattern,
        message: signal.message,
        confidence: signal.confidence,
        spotPrice: signal.spotPrice,
        timestamp: signal.timestamp,
        urgency: signal.strength === 'STRONG' ? 'IMMEDIATE' : 'SOON'
      }));

      const response: ApiResponse = {
        success: true,
        data: {
          alerts,
          count: alerts.length,
          overallBias: analysis.summary.overallBias,
          marketState: analysis.marketState
        },
        message: `${alerts.length} high priority breakout alerts`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting high priority alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get high priority alerts',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get breakout configuration
   */
  public getBreakoutConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
      const config = this.breakoutService.getConfig();
      
      const response: ApiResponse<BreakoutConfig> = {
        success: true,
        data: config,
        message: 'Breakout detection configuration',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting breakout config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get breakout config',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Update breakout configuration
   */
  public updateBreakoutConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const configUpdate: Partial<BreakoutConfig> = req.body;
      
      // Validate config update
      if (typeof configUpdate !== 'object' || configUpdate === null) {
        res.status(400).json({
          success: false,
          error: 'Invalid configuration data',
          message: 'Configuration must be a valid object',
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.breakoutService.updateConfig(configUpdate);
      const updatedConfig = this.breakoutService.getConfig();
      
      const response: ApiResponse<BreakoutConfig> = {
        success: true,
        data: updatedConfig,
        message: 'Breakout configuration updated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
      logger.info('Breakout configuration updated', configUpdate);
    } catch (error) {
      logger.error('Error updating breakout config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update breakout config',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get historical breakout data
   */
  public getHistoricalBreakouts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeframe = '1d', limit = 100 } = req.query;
      
      const historicalData = this.breakoutService.getHistoricalBreakouts();
      
      // Apply timeframe and limit filters
      let filteredData = historicalData;
      
      if (timeframe !== 'all') {
        const now = new Date();
        let cutoffTime = new Date();
        
        switch (timeframe) {
          case '1h':
            cutoffTime.setHours(now.getHours() - 1);
            break;
          case '4h':
            cutoffTime.setHours(now.getHours() - 4);
            break;
          case '1d':
            cutoffTime.setDate(now.getDate() - 1);
            break;
          case '7d':
            cutoffTime.setDate(now.getDate() - 7);
            break;
          case '30d':
            cutoffTime.setDate(now.getDate() - 30);
            break;
        }
        
        filteredData = historicalData.filter(data => 
          new Date(data.timestamp) >= cutoffTime
        );
      }
      
      // Apply limit
      if (typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum)) {
          filteredData = filteredData.slice(-limitNum);
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          breakouts: filteredData,
          count: filteredData.length,
          timeframe,
          limit
        },
        message: `Retrieved ${filteredData.length} historical breakout records`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting historical breakouts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get historical breakouts',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get breakout statistics
   */
  public getBreakoutStats = async (_req: Request, res: Response): Promise<void> => {
    try {
      const analysis = this.breakoutService.analyzeBreakouts();
      const historicalData = this.breakoutService.getHistoricalBreakouts();
      
      // Calculate statistics
      const stats = {
        current: {
          totalSignals: analysis.summary.totalSignals,
          bullishSignals: analysis.summary.bullishSignals,
          bearishSignals: analysis.summary.bearishSignals,
          strongSignals: analysis.summary.strongSignals,
          highPrioritySignals: analysis.summary.highPrioritySignals,
          overallBias: analysis.summary.overallBias,
          confidenceScore: analysis.summary.confidenceScore
        },
        historical: {
          totalDataPoints: historicalData.length,
          timeRange: historicalData.length > 0 ? {
            from: historicalData[0]?.timestamp,
            to: historicalData[historicalData.length - 1]?.timestamp
          } : null
        },
        patterns: this.calculatePatternStats(analysis),
        marketState: analysis.marketState,
        performance: {
          avgConfidence: analysis.summary.confidenceScore,
          signalFrequency: this.calculateSignalFrequency(historicalData),
          accuracyMetrics: 'Not implemented' // Would require trade outcome tracking
        }
      };

      const response: ApiResponse = {
        success: true,
        data: stats,
        message: 'Breakout detection statistics',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting breakout stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get breakout statistics',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  };

  private calculatePatternStats(analysis: BreakoutAnalysisResult) {
    const patternCounts: Record<string, number> = {};
    const patternConfidence: Record<string, number[]> = {};
    
    analysis.signals.forEach(signal => {
      const pattern = signal.pattern;
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      
      if (!patternConfidence[pattern]) {
        patternConfidence[pattern] = [];
      }
      patternConfidence[pattern].push(signal.confidence);
    });

    const patternStats: Record<string, any> = {};
    Object.keys(patternCounts).forEach(pattern => {
      const confidences = patternConfidence[pattern];
      if (confidences && confidences.length > 0) {
        patternStats[pattern] = {
          count: patternCounts[pattern],
          avgConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
          maxConfidence: Math.max(...confidences),
          minConfidence: Math.min(...confidences)
        };
      }
    });

    return patternStats;
  }

  private calculateSignalFrequency(historicalData: any[]): string {
    if (historicalData.length < 2) return 'Insufficient data';
    
    const totalMinutes = (new Date(historicalData[historicalData.length - 1].timestamp).getTime() - 
                         new Date(historicalData[0].timestamp).getTime()) / (1000 * 60);
    
    const signalsPerHour = (historicalData.length / totalMinutes) * 60;
    
    if (signalsPerHour > 1) return `${signalsPerHour.toFixed(1)} signals/hour`;
    if (signalsPerHour > 0.1) return `${(signalsPerHour * 60).toFixed(1)} signals/day`;
    return 'Low frequency';
  }
}
