import { Request, Response } from 'express';
import { AdvancedAnalyticsService, AdvancedMetrics } from '@/services/AdvancedAnalyticsService';
import { DataService } from '@/services/DataService';
import { asyncHandler } from '@/utils/asyncHandler';
import logger from '@/utils/logger';

export class AdvancedAnalyticsController {
  constructor(
    private advancedAnalyticsService: AdvancedAnalyticsService,
    private dataService: DataService
  ) {}

  public getAdvancedAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      // Get current market data
      const currentData = await this.getCurrentMarketData();
      if (!currentData) {
        res.status(404).json({
          success: false,
          error: 'No current market data available'
        });
        return;
      }

      // Get historical data for analysis
      const historicalData = await this.getHistoricalDataForAnalysis();

      // Generate advanced analytics
      const analytics = this.advancedAnalyticsService.calculateAdvancedMetrics(
        currentData,
        historicalData
      );

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: analytics
      });

    } catch (error) {
      logger.error('Error getting advanced analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  public getIVSkewAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const currentData = await this.getCurrentMarketData();
      if (!currentData) {
        res.status(404).json({
          success: false,
          error: 'No current market data available'
        });
        return;
      }

      const analytics = this.advancedAnalyticsService.calculateAdvancedMetrics(currentData);
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          ivSkew: analytics.ivSkew,
          analysis: this.analyzeIVSkew(analytics.ivSkew)
        }
      });

    } catch (error) {
      logger.error('Error getting IV skew analysis:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  public getGEXAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const currentData = await this.getCurrentMarketData();
      if (!currentData) {
        res.status(404).json({
          success: false,
          error: 'No current market data available'
        });
        return;
      }

      const analytics = this.advancedAnalyticsService.calculateAdvancedMetrics(currentData);
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          gex: analytics.gex,
          analysis: this.analyzeGEX(analytics.gex)
        }
      });

    } catch (error) {
      logger.error('Error getting GEX analysis:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  public getOIClusterAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const currentData = await this.getCurrentMarketData();
      if (!currentData) {
        res.status(404).json({
          success: false,
          error: 'No current market data available'
        });
        return;
      }

      const analytics = this.advancedAnalyticsService.calculateAdvancedMetrics(currentData);
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          oiClusters: analytics.oiClusters,
          analysis: this.analyzeOIClusters(analytics.oiClusters)
        }
      });

    } catch (error) {
      logger.error('Error getting OI cluster analysis:', error);
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

  private analyzeIVSkew(ivSkew: any): any {
    return {
      interpretation: this.interpretIVSkew(ivSkew.overallSkew),
      velocity_signal: this.interpretSkewVelocity(ivSkew.skewVelocity),
      trading_implications: this.getIVSkewTradingImplications(ivSkew)
    };
  }

  private analyzeGEX(gex: any): any {
    return {
      interpretation: this.interpretGEX(gex.totalGEX),
      gamma_zone: gex.dominantGammaZone,
      key_levels: {
        zero_gamma: gex.zeroGammaLevel,
        max_pain: gex.maxPainLevel
      },
      trading_implications: this.getGEXTradingImplications(gex)
    };
  }

  private analyzeOIClusters(oiClusters: any): any {
    return {
      cluster_count: oiClusters.clusters.length,
      migration_detected: !!oiClusters.clusterMigration,
      break_alert: oiClusters.clusterBreakAlert,
      trading_implications: this.getOIClusterTradingImplications(oiClusters)
    };
  }

  private interpretIVSkew(skew: number): string {
    if (skew > 5) return 'High put skew - bearish sentiment';
    if (skew > 2) return 'Moderate put skew - cautious sentiment';
    if (skew < -5) return 'High call skew - bullish sentiment';
    if (skew < -2) return 'Moderate call skew - optimistic sentiment';
    return 'Balanced skew - neutral sentiment';
  }

  private interpretSkewVelocity(velocity: number): string {
    if (velocity > 1) return 'Rapidly increasing put skew - growing fear';
    if (velocity > 0.5) return 'Increasing put skew - rising caution';
    if (velocity < -1) return 'Rapidly decreasing put skew - fear subsiding';
    if (velocity < -0.5) return 'Decreasing put skew - improving sentiment';
    return 'Stable skew - no major sentiment shift';
  }

  private interpretGEX(gex: number): string {
    if (gex > 100000) return 'High positive GEX - low volatility expected';
    if (gex > 50000) return 'Moderate positive GEX - range-bound market';
    if (gex < -100000) return 'High negative GEX - high volatility expected';
    if (gex < -50000) return 'Moderate negative GEX - trending market likely';
    return 'Neutral GEX - balanced gamma exposure';
  }

  private getIVSkewTradingImplications(ivSkew: any): string[] {
    const implications = [];
    
    if (ivSkew.overallSkew > 3) {
      implications.push('Consider call spreads or put selling strategies');
      implications.push('High put premiums may offer selling opportunities');
    }
    
    if (ivSkew.skewVelocity > 0.5) {
      implications.push('Increasing fear - potential contrarian opportunity');
    }
    
    if (Math.abs(ivSkew.overallSkew) < 1) {
      implications.push('Balanced skew - straddle/strangle strategies may work');
    }
    
    return implications;
  }

  private getGEXTradingImplications(gex: any): string[] {
    const implications = [];
    
    if (gex.dominantGammaZone === 'long') {
      implications.push('Long gamma zone - expect range-bound trading');
      implications.push('Breakouts may face resistance from gamma hedging');
    } else if (gex.dominantGammaZone === 'short') {
      implications.push('Short gamma zone - expect trending moves');
      implications.push('Momentum strategies may be more effective');
    }
    
    implications.push(`Key support/resistance at zero gamma level: ${gex.zeroGammaLevel}`);
    implications.push(`Max pain level at: ${gex.maxPainLevel}`);
    
    return implications;
  }

  private getOIClusterTradingImplications(oiClusters: any): string[] {
    const implications = [];
    
    if (oiClusters.clusterBreakAlert) {
      implications.push('OI cluster break detected - potential breakout setup');
      implications.push('Monitor for directional moves away from previous support/resistance');
    }
    
    if (oiClusters.clusterMigration) {
      implications.push(`OI migration detected: ${oiClusters.clusterMigration.migrationDistance} points`);
      implications.push('Smart money may be repositioning');
    }
    
    if (oiClusters.clusters.length > 2) {
      implications.push('Multiple OI clusters - expect range-bound trading');
    } else if (oiClusters.clusters.length === 0) {
      implications.push('No strong OI clusters - potential for large moves');
    }
    
    return implications;
  }
}
