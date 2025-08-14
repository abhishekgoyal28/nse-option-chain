import { 
  ChartData, 
  MarketAnalysis, 
  Signal, 
  SignalSummary, 
  PCRAnalysis, 
  VolumeAnalysis, 
  Recommendation 
} from '@/types';
import { 
  calculateTrend, 
  calculateVolatility, 
  calculateSupportResistance, 
  calculateAverage 
} from '@/utils/calculations';

export class AnalysisService {
  public performMarketAnalysis(data: ChartData): MarketAnalysis {
    const latest = data.timestamps.length - 1;

    if (latest < 20) {
      return {
        trend: {
          direction: 'SIDEWAYS',
          strength: 0,
          confidence: 0
        },
        volatility: {
          current: 0,
          level: 'LOW'
        },
        levels: {
          support: null,
          resistance: null,
          current: 0
        },
        pcr: {
          current: 0,
          sentiment: 'NEUTRAL',
          strength: 'WEAK',
          interpretation: 'Insufficient data for analysis'
        },
        volume: {
          call_volume: 0,
          put_volume: 0,
          total_volume: 0,
          call_ratio: 0,
          bias: 'NEUTRAL'
        },
        recommendation: {
          action: 'HOLD',
          confidence: 'LOW',
          reasoning: 'Not enough data for analysis'
        },
        lastUpdated: new Date().toISOString()
      };
    }

    // Calculate trend
    const recentPrices = data.spotPrices.slice(-20);
    const trend = calculateTrend(recentPrices);

    // Calculate volatility
    const volatility = calculateVolatility(recentPrices);

    // Calculate support/resistance levels
    const levels = calculateSupportResistance(data.spotPrices);

    // PCR analysis
    const pcrAnalysis = this.analyzePCR(data.ratios);

    // Volume analysis
    const volumeAnalysis = this.analyzeVolume(data.calls.volume, data.puts.volume);

    // Generate recommendation
    const recommendation = this.generateRecommendation(trend, volatility, pcrAnalysis);

    return {
      trend: {
        direction: trend > 0.1 ? 'BULLISH' : trend < -0.1 ? 'BEARISH' : 'SIDEWAYS',
        strength: Math.abs(trend),
        confidence: trend !== 0 ? Math.min(100, Math.abs(trend) * 100) : 0
      },
      volatility: {
        current: volatility,
        level: volatility > 0.02 ? 'HIGH' : volatility > 0.01 ? 'MEDIUM' : 'LOW'
      },
      levels,
      pcr: pcrAnalysis,
      volume: volumeAnalysis,
      recommendation,
      lastUpdated: new Date().toISOString()
    };
  }

  public generateSignals(data: ChartData, priority: string = 'all'): Signal[] {
    const signals: Signal[] = [];
    const latest = data.timestamps.length - 1;

    if (latest < 10) return signals;

    // PCR signals
    const currentPCR = data.ratios.pcr_volume[latest];
    if (currentPCR !== undefined && currentPCR < 0.7) {
      signals.push({
        type: 'BULLISH',
        indicator: 'PCR_VOLUME',
        message: `Low PCR indicates bullish sentiment: ${currentPCR.toFixed(2)}`,
        strength: currentPCR < 0.5 ? 'STRONG' : 'MODERATE',
        priority: currentPCR < 0.5 ? 'HIGH' : 'MEDIUM',
        timestamp: data.timestamps[latest] || new Date().toISOString(),
        value: currentPCR
      });
    } else if (currentPCR !== undefined && currentPCR > 1.3) {
      signals.push({
        type: 'BEARISH',
        indicator: 'PCR_VOLUME',
        message: `High PCR indicates bearish sentiment: ${currentPCR.toFixed(2)}`,
        strength: currentPCR > 1.5 ? 'STRONG' : 'MODERATE',
        priority: currentPCR > 1.5 ? 'HIGH' : 'MEDIUM',
        timestamp: data.timestamps[latest] || new Date().toISOString(),
        value: currentPCR
      });
    }

    // Volume spike signals
    const callVolumeAvg = calculateAverage(data.calls.volume.slice(-10));
    const putVolumeAvg = calculateAverage(data.puts.volume.slice(-10));
    const currentCallVolume = data.calls.volume[latest];
    const currentPutVolume = data.puts.volume[latest];

    if (currentCallVolume !== undefined && currentCallVolume > callVolumeAvg * 2) {
      signals.push({
        type: 'BULLISH',
        indicator: 'CALL_VOLUME_SPIKE',
        message: `Call volume spike: ${(currentCallVolume / callVolumeAvg).toFixed(1)}x average`,
        strength: 'STRONG',
        priority: 'HIGH',
        timestamp: data.timestamps[latest] || new Date().toISOString(),
        value: currentCallVolume
      });
    }

    if (currentPutVolume !== undefined && currentPutVolume > putVolumeAvg * 2) {
      signals.push({
        type: 'BEARISH',
        indicator: 'PUT_VOLUME_SPIKE',
        message: `Put volume spike: ${(currentPutVolume / putVolumeAvg).toFixed(1)}x average`,
        strength: 'STRONG',
        priority: 'HIGH',
        timestamp: data.timestamps[latest] || new Date().toISOString(),
        value: currentPutVolume
      });
    }

    // OI change signals
    const callOIChange = this.calculateOIChange(data.calls.oi);
    const putOIChange = this.calculateOIChange(data.puts.oi);

    if (callOIChange > 0.2) {
      signals.push({
        type: 'BULLISH',
        indicator: 'CALL_OI_BUILDUP',
        message: `Significant call OI buildup: ${(callOIChange * 100).toFixed(1)}%`,
        strength: 'MODERATE',
        priority: 'MEDIUM',
        timestamp: data.timestamps[latest] || new Date().toISOString(),
        value: callOIChange
      });
    }

    if (putOIChange > 0.2) {
      signals.push({
        type: 'BEARISH',
        indicator: 'PUT_OI_BUILDUP',
        message: `Significant put OI buildup: ${(putOIChange * 100).toFixed(1)}%`,
        strength: 'MODERATE',
        priority: 'MEDIUM',
        timestamp: data.timestamps[latest] || new Date().toISOString(),
        value: putOIChange
      });
    }

    // Price momentum signals
    const priceChange = this.calculatePriceChange(data.spotPrices);
    if (Math.abs(priceChange) > 0.02) {
      signals.push({
        type: priceChange > 0 ? 'BULLISH' : 'BEARISH',
        indicator: 'PRICE_MOMENTUM',
        message: `Strong price momentum: ${(priceChange * 100).toFixed(2)}%`,
        strength: Math.abs(priceChange) > 0.05 ? 'STRONG' : 'MODERATE',
        priority: Math.abs(priceChange) > 0.05 ? 'HIGH' : 'MEDIUM',
        timestamp: data.timestamps[latest] || new Date().toISOString(),
        value: priceChange
      });
    }

    // Filter by priority if specified
    if (priority !== 'all') {
      return signals.filter(signal => signal.priority.toLowerCase() === priority.toLowerCase());
    }

    return signals;
  }

  public generateSignalSummary(signals: Signal[]): SignalSummary {
    const bullish = signals.filter(s => s.type === 'BULLISH').length;
    const bearish = signals.filter(s => s.type === 'BEARISH').length;
    const neutral = signals.filter(s => s.type === 'NEUTRAL').length;
    const strong = signals.filter(s => s.strength === 'STRONG').length;
    const high = signals.filter(s => s.priority === 'HIGH').length;

    return {
      total: signals.length,
      bullish,
      bearish,
      neutral,
      strong,
      high_priority: high,
      bias: bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL'
    };
  }

  private analyzePCR(ratios: { pcr_volume: number[]; pcr_oi: number[] }): PCRAnalysis {
    if (!ratios || !ratios.pcr_volume || ratios.pcr_volume.length === 0) {
      return {
        current: 0,
        sentiment: 'NEUTRAL',
        strength: 'WEAK',
        interpretation: 'No PCR data available'
      };
    }

    const latest = ratios.pcr_volume.length - 1;
    const currentPCR = ratios.pcr_volume[latest];

    if (currentPCR === undefined) {
      return {
        current: 0,
        sentiment: 'NEUTRAL',
        strength: 'WEAK',
        interpretation: 'No PCR data available'
      };
    }

    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let strength: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';

    if (currentPCR < 0.7) {
      sentiment = 'BULLISH';
      strength = currentPCR < 0.5 ? 'STRONG' : 'MODERATE';
    } else if (currentPCR > 1.3) {
      sentiment = 'BEARISH';
      strength = currentPCR > 1.5 ? 'STRONG' : 'MODERATE';
    }

    return {
      current: currentPCR,
      sentiment,
      strength,
      interpretation: this.getPCRInterpretation(currentPCR)
    };
  }

  private analyzeVolume(callVolume: number[], putVolume: number[]): VolumeAnalysis {
    if (!callVolume || !putVolume || callVolume.length === 0) {
      return {
        call_volume: 0,
        put_volume: 0,
        total_volume: 0,
        call_ratio: 0,
        bias: 'NEUTRAL'
      };
    }

    const latest = callVolume.length - 1;
    const currentCallVolume = callVolume[latest] || 0;
    const currentPutVolume = putVolume[latest] || 0;
    const totalVolume = currentCallVolume + currentPutVolume;
    const callRatio = totalVolume > 0 ? currentCallVolume / totalVolume : 0;

    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (callRatio > 0.6) bias = 'BULLISH';
    else if (callRatio < 0.4) bias = 'BEARISH';

    return {
      call_volume: currentCallVolume,
      put_volume: currentPutVolume,
      total_volume: totalVolume,
      call_ratio: callRatio,
      bias
    };
  }

  private generateRecommendation(trend: number, volatility: number, pcrAnalysis: PCRAnalysis): Recommendation {
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    if (trend > 0.05 && pcrAnalysis.sentiment === 'BULLISH') {
      action = 'BUY';
      confidence = 'MEDIUM';
    } else if (trend < -0.05 && pcrAnalysis.sentiment === 'BEARISH') {
      action = 'SELL';
      confidence = 'MEDIUM';
    }

    if (volatility > 0.02) {
      confidence = 'LOW';
    }

    const reasoning = `Trend: ${trend > 0 ? 'Positive' : 'Negative'}, PCR: ${pcrAnalysis.sentiment}, Volatility: ${volatility > 0.02 ? 'High' : 'Normal'}`;

    return {
      action,
      confidence,
      reasoning
    };
  }

  private getPCRInterpretation(pcr: number): string {
    if (pcr < 0.5) return 'Extremely bullish - Very low put activity';
    if (pcr < 0.7) return 'Bullish - Low put activity suggests optimism';
    if (pcr < 1.0) return 'Slightly bullish - More calls than puts';
    if (pcr < 1.3) return 'Slightly bearish - More puts than calls';
    if (pcr < 1.5) return 'Bearish - High put activity suggests pessimism';
    return 'Extremely bearish - Very high put activity';
  }

  private calculateOIChange(oiData: number[]): number {
    if (oiData.length < 2) return 0;
    
    const current = oiData[oiData.length - 1];
    const previous = oiData[oiData.length - 2];
    
    if (!current || !previous || previous === 0) return 0;
    
    return (current - previous) / previous;
  }

  private calculatePriceChange(prices: number[]): number {
    if (prices.length < 10) return 0;
    
    const recent = prices.slice(-10);
    const current = recent[recent.length - 1];
    const previous = recent[0];
    
    if (!current || !previous || previous === 0) return 0;
    
    return (current - previous) / previous;
  }
}
