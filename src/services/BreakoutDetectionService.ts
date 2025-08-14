import { 
  BreakoutSignal, 
  BreakoutPatternType, 
  BreakoutDetails, 
  BreakoutConfig, 
  BreakoutAnalysisResult,
  MarketDataPoint,
  VWAPData,
  HistoricalBreakoutData
} from '@/types/breakout';
import { NiftyOptionChainData } from '@/types';
import logger from '@/utils/logger';

export class BreakoutDetectionService {
  private config: BreakoutConfig;
  private historicalData: MarketDataPoint[] = [];
  private vwapData: VWAPData[] = [];
  private firstHourData: { high: number; low: number; timestamp: string } | null = null;
  private previousMaxPain: number | null = null;
  // keyLevels will be used for future enhancements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _keyLevels: number[] = [];

  constructor() {
    this.config = {
      volumeMultiplier: 2.5,
      highVolumeMultiplier: 5.0,
      oiChangeThreshold: 15, // 15% change
      oiImbalanceRatio: 2.0,
      vwapDistanceThreshold: 0.1, // 0.1% from VWAP
      vwapConsolidationMinutes: 20,
      ivDropThreshold: 10, // 10% drop
      ivStabilityThreshold: 2, // 2% max change
      maxPainShiftThreshold: 50, // 50 points shift
      roundNumberLevels: this.generateRoundNumbers(),
      levelProximityThreshold: 25, // 25 points proximity
      firstHourMinutes: 60,
      lookbackPeriods: 20,
      minConfidenceThreshold: 60
    };
    
    this.initializeKeyLevels();
  }

  private generateRoundNumbers(): number[] {
    const levels: number[] = [];
    // Generate round numbers around typical NIFTY levels
    for (let i = 20000; i <= 25000; i += 50) {
      if (i % 100 === 0) levels.push(i); // Every 100 points
    }
    return levels;
  }

  private initializeKeyLevels(): void {
    // Initialize with common NIFTY levels - can be updated dynamically
    this._keyLevels = [
      22000, 22100, 22200, 22300, 22400, 22500,
      22600, 22700, 22800, 22900, 23000, 23100,
      23200, 23300, 23400, 23500
    ];
  }

  public addDataPoint(data: NiftyOptionChainData): void {
    const marketData = this.convertToMarketDataPoint(data);
    this.historicalData.push(marketData);
    
    // Keep only last N periods
    if (this.historicalData.length > this.config.lookbackPeriods * 2) {
      this.historicalData = this.historicalData.slice(-this.config.lookbackPeriods);
    }

    // Update VWAP
    this.updateVWAP(marketData);
    
    // Update first hour data
    this.updateFirstHourData(marketData);
  }

  private convertToMarketDataPoint(data: NiftyOptionChainData): MarketDataPoint {
    const atmOptions = data.options[data.atm_strike];
    
    return {
      timestamp: data.timestamp,
      spotPrice: data.spot_price,
      volume: (atmOptions?.CE?.volume || 0) + (atmOptions?.PE?.volume || 0),
      atmCallOI: atmOptions?.CE?.oi || 0,
      atmPutOI: atmOptions?.PE?.oi || 0,
      atmCallIV: atmOptions?.CE?.iv || 0,
      atmPutIV: atmOptions?.PE?.iv || 0,
      atmCallVolume: atmOptions?.CE?.volume || 0,
      atmPutVolume: atmOptions?.PE?.volume || 0,
      totalCallOI: this.calculateTotalOI(data, 'CE'),
      totalPutOI: this.calculateTotalOI(data, 'PE')
    };
  }

  private calculateTotalOI(data: NiftyOptionChainData, type: 'CE' | 'PE'): number {
    let total = 0;
    Object.values(data.options).forEach(option => {
      if (option[type]) {
        total += option[type]!.oi;
      }
    });
    return total;
  }

  private updateVWAP(data: MarketDataPoint): void {
    const vwapPoint: VWAPData = {
      value: this.calculateVWAP(),
      timestamp: data.timestamp,
      volume: data.volume,
      price: data.spotPrice
    };
    
    this.vwapData.push(vwapPoint);
    
    // Keep only today's data for VWAP calculation
    const today = new Date().toDateString();
    this.vwapData = this.vwapData.filter(point => 
      new Date(point.timestamp).toDateString() === today
    );
  }

  private calculateVWAP(): number {
    if (this.vwapData.length === 0) return 0;
    
    let totalVolumePrice = 0;
    let totalVolume = 0;
    
    this.vwapData.forEach(point => {
      totalVolumePrice += point.price * point.volume;
      totalVolume += point.volume;
    });
    
    return totalVolume > 0 ? totalVolumePrice / totalVolume : 0;
  }

  private updateFirstHourData(data: MarketDataPoint): void {
    const dataTime = new Date(data.timestamp);
    const marketOpen = new Date(dataTime);
    marketOpen.setHours(9, 30, 0, 0);
    
    const firstHourEnd = new Date(marketOpen);
    firstHourEnd.setMinutes(firstHourEnd.getMinutes() + this.config.firstHourMinutes);
    
    if (dataTime >= marketOpen && dataTime <= firstHourEnd) {
      if (!this.firstHourData) {
        this.firstHourData = {
          high: data.spotPrice,
          low: data.spotPrice,
          timestamp: data.timestamp
        };
      } else {
        this.firstHourData.high = Math.max(this.firstHourData.high, data.spotPrice);
        this.firstHourData.low = Math.min(this.firstHourData.low, data.spotPrice);
      }
    }
  }

  public analyzeBreakouts(): BreakoutAnalysisResult {
    if (this.historicalData.length < 5) {
      return this.getEmptyResult();
    }

    const signals: BreakoutSignal[] = [];
    const currentData = this.historicalData[this.historicalData.length - 1];
    
    if (!currentData) {
      return this.getEmptyResult();
    }

    // 1. Call/Put Writing Imbalance
    const oiImbalanceSignal = this.detectOIImbalance(currentData);
    if (oiImbalanceSignal) signals.push(oiImbalanceSignal);

    // 2. VWAP & Volume Breakout
    const vwapBreakoutSignal = this.detectVWAPBreakout(currentData);
    if (vwapBreakoutSignal) signals.push(vwapBreakoutSignal);

    // 3. OI + Price Divergence
    const oiPriceDivergenceSignal = this.detectOIPriceDivergence(currentData);
    if (oiPriceDivergenceSignal) signals.push(oiPriceDivergenceSignal);

    // 4. First Hour Breakout
    const firstHourBreakoutSignal = this.detectFirstHourBreakout(currentData);
    if (firstHourBreakoutSignal) signals.push(firstHourBreakoutSignal);

    // 5. Max Pain Shift
    const maxPainShiftSignal = this.detectMaxPainShift(currentData);
    if (maxPainShiftSignal) signals.push(maxPainShiftSignal);

    // 6. IV Crush + Price Stability
    const ivCrushSignal = this.detectIVCrushBreakout(currentData);
    if (ivCrushSignal) signals.push(ivCrushSignal);

    // 7. Volume Spike at Key Levels
    const volumeSpikeSignal = this.detectVolumeSpikeAtKeyLevels(currentData);
    if (volumeSpikeSignal) signals.push(volumeSpikeSignal);

    return this.buildAnalysisResult(signals, currentData);
  }

  private detectOIImbalance(currentData: MarketDataPoint): BreakoutSignal | null {
    if (this.historicalData.length < 3) return null;

    const previousData = this.historicalData[this.historicalData.length - 2];
    if (!previousData) return null;
    
    const callOIChange = previousData.atmCallOI > 0 
      ? ((currentData.atmCallOI - previousData.atmCallOI) / previousData.atmCallOI) * 100 
      : 0;
    const putOIChange = previousData.atmPutOI > 0 
      ? ((currentData.atmPutOI - previousData.atmPutOI) / previousData.atmPutOI) * 100 
      : 0;
    
    let signal: BreakoutSignal | null = null;
    
    // Bearish: ATM Call OI rising sharply, Put OI drops
    if (callOIChange > this.config.oiChangeThreshold && putOIChange < -this.config.oiChangeThreshold) {
      signal = this.createSignal(
        'BEARISH',
        'CALL_PUT_WRITING_IMBALANCE',
        'Strong Call writing detected - Bearish signal',
        currentData,
        {
          callOI: currentData.atmCallOI,
          putOI: currentData.atmPutOI,
          oiChange: { call: callOIChange, put: putOIChange }
        }
      );
    }
    // Bullish: ATM Put OI rising sharply, Call OI drops
    else if (putOIChange > this.config.oiChangeThreshold && callOIChange < -this.config.oiChangeThreshold) {
      signal = this.createSignal(
        'BULLISH',
        'CALL_PUT_WRITING_IMBALANCE',
        'Strong Put writing detected - Bullish signal',
        currentData,
        {
          callOI: currentData.atmCallOI,
          putOI: currentData.atmPutOI,
          oiChange: { call: callOIChange, put: putOIChange }
        }
      );
    }

    if (signal) {
      signal.confidence = Math.min(95, Math.abs(callOIChange - putOIChange) * 2);
      signal.strength = signal.confidence > 80 ? 'STRONG' : signal.confidence > 60 ? 'MODERATE' : 'WEAK';
    }

    return signal;
  }

  private detectVWAPBreakout(currentData: MarketDataPoint): BreakoutSignal | null {
    if (this.vwapData.length < 10) return null;

    const currentVWAP = this.calculateVWAP();
    if (currentVWAP === 0) return null;

    const vwapDistance = ((currentData.spotPrice - currentVWAP) / currentVWAP) * 100;
    const avgVolume = this.getAverageVolume();
    const volumeRatio = avgVolume > 0 ? currentData.volume / avgVolume : 0;

    // Check for consolidation near VWAP
    const recentPrices = this.historicalData.slice(-10).map(d => d.spotPrice);
    const priceRange = Math.max(...recentPrices) - Math.min(...recentPrices);
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const consolidationRange = (priceRange / avgPrice) * 100;

    if (consolidationRange < 0.5 && // Tight consolidation
        Math.abs(vwapDistance) > this.config.vwapDistanceThreshold && 
        volumeRatio > this.config.volumeMultiplier) {
      
      const type = vwapDistance > 0 ? 'BULLISH' : 'BEARISH';
      const message = `VWAP breakout ${type.toLowerCase()} with ${volumeRatio.toFixed(1)}x volume`;
      
      return this.createSignal(
        type,
        'VWAP_VOLUME_BREAKOUT',
        message,
        currentData,
        {
          vwap: currentVWAP,
          vwapDistance: vwapDistance,
          volumeRatio: volumeRatio,
          vwapBreakoutConfirmed: true
        }
      );
    }

    return null;
  }

  private detectOIPriceDivergence(currentData: MarketDataPoint): BreakoutSignal | null {
    if (this.historicalData.length < 5) return null;

    const previousData = this.historicalData[this.historicalData.length - 2];
    if (!previousData) return null;
    
    const priceChange = previousData.spotPrice > 0 
      ? ((currentData.spotPrice - previousData.spotPrice) / previousData.spotPrice) * 100 
      : 0;
    const totalOICurrent = currentData.totalCallOI + currentData.totalPutOI;
    const totalOIPrevious = previousData.totalCallOI + previousData.totalPutOI;
    const totalOIChange = totalOIPrevious > 0 
      ? ((totalOICurrent - totalOIPrevious) / totalOIPrevious) * 100 
      : 0;

    let signal: BreakoutSignal | null = null;

    // Bullish: Price rising + OI falling (Short covering)
    if (priceChange > 0.2 && totalOIChange < -2) {
      signal = this.createSignal(
        'BULLISH',
        'OI_PRICE_DIVERGENCE',
        'Short covering rally detected - Bullish divergence',
        currentData,
        {
          oiChange: { call: totalOIChange, put: totalOIChange }
        }
      );
    }
    // Bearish: Price falling + OI rising (Fresh shorts)
    else if (priceChange < -0.2 && totalOIChange > 2) {
      signal = this.createSignal(
        'BEARISH',
        'OI_PRICE_DIVERGENCE',
        'Fresh short build-up detected - Bearish divergence',
        currentData,
        {
          oiChange: { call: totalOIChange, put: totalOIChange }
        }
      );
    }

    if (signal) {
      signal.confidence = Math.min(90, Math.abs(priceChange) * 10 + Math.abs(totalOIChange) * 5);
    }

    return signal;
  }

  private detectFirstHourBreakout(currentData: MarketDataPoint): BreakoutSignal | null {
    if (!this.firstHourData) return null;

    const currentTime = new Date(currentData.timestamp);
    const marketOpen = new Date(currentTime);
    marketOpen.setHours(9, 30, 0, 0);
    const firstHourEnd = new Date(marketOpen);
    firstHourEnd.setMinutes(firstHourEnd.getMinutes() + this.config.firstHourMinutes);

    // Only trigger after first hour is complete
    if (currentTime <= firstHourEnd) return null;

    const avgVolume = this.getAverageVolume();
    const volumeRatio = avgVolume > 0 ? currentData.volume / avgVolume : 0;

    let signal: BreakoutSignal | null = null;

    // Bullish breakout above first hour high
    if (currentData.spotPrice > this.firstHourData.high && volumeRatio > this.config.volumeMultiplier) {
      signal = this.createSignal(
        'BULLISH',
        'FIRST_HOUR_BREAKOUT',
        `Breakout above first hour high (${this.firstHourData.high})`,
        currentData,
        {
          firstHourHigh: this.firstHourData.high,
          firstHourLow: this.firstHourData.low,
          breakoutLevel: this.firstHourData.high,
          volumeRatio: volumeRatio
        }
      );
    }
    // Bearish breakdown below first hour low
    else if (currentData.spotPrice < this.firstHourData.low && volumeRatio > this.config.volumeMultiplier) {
      signal = this.createSignal(
        'BEARISH',
        'FIRST_HOUR_BREAKOUT',
        `Breakdown below first hour low (${this.firstHourData.low})`,
        currentData,
        {
          firstHourHigh: this.firstHourData.high,
          firstHourLow: this.firstHourData.low,
          breakoutLevel: this.firstHourData.low,
          volumeRatio: volumeRatio
        }
      );
    }

    if (signal) {
      signal.confidence = Math.min(85, volumeRatio * 20);
    }

    return signal;
  }

  private detectMaxPainShift(currentData: MarketDataPoint): BreakoutSignal | null {
    const currentMaxPain = this.calculateMaxPain();
    
    if (this.previousMaxPain === null) {
      this.previousMaxPain = currentMaxPain;
      return null;
    }

    const maxPainShift = currentMaxPain - this.previousMaxPain;
    
    if (Math.abs(maxPainShift) >= this.config.maxPainShiftThreshold) {
      const type = maxPainShift > 0 ? 'BULLISH' : 'BEARISH';
      const message = `Max Pain shifted ${maxPainShift > 0 ? 'higher' : 'lower'} by ${Math.abs(maxPainShift)} points`;
      
      const signal = this.createSignal(
        type,
        'MAX_PAIN_SHIFT',
        message,
        currentData,
        {
          maxPain: currentMaxPain,
          maxPainShift: maxPainShift
        }
      );
      
      signal.confidence = Math.min(80, Math.abs(maxPainShift) / 2);
      this.previousMaxPain = currentMaxPain;
      
      return signal;
    }

    this.previousMaxPain = currentMaxPain;
    return null;
  }

  private detectIVCrushBreakout(currentData: MarketDataPoint): BreakoutSignal | null {
    if (this.historicalData.length < 5) return null;

    const recentData = this.historicalData.slice(-5);
    const avgCallIV = recentData.reduce((sum, d) => sum + d.atmCallIV, 0) / recentData.length;
    const avgPutIV = recentData.reduce((sum, d) => sum + d.atmPutIV, 0) / recentData.length;
    
    const callIVDrop = ((avgCallIV - currentData.atmCallIV) / avgCallIV) * 100;
    const putIVDrop = ((avgPutIV - currentData.atmPutIV) / avgPutIV) * 100;
    
    // Check for price stability (tight range)
    const recentPrices = recentData.map(d => d.spotPrice);
    const priceRange = Math.max(...recentPrices) - Math.min(...recentPrices);
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const priceStability = (priceRange / avgPrice) * 100;

    if ((callIVDrop > this.config.ivDropThreshold || putIVDrop > this.config.ivDropThreshold) &&
        priceStability < this.config.ivStabilityThreshold) {
      
      return this.createSignal(
        'BULLISH', // IV crush often precedes breakout
        'IV_CRUSH_BREAKOUT',
        `IV crush detected - Potential breakout setup (Call IV: ${callIVDrop.toFixed(1)}%, Put IV: ${putIVDrop.toFixed(1)}%)`,
        currentData,
        {
          atmCallIV: currentData.atmCallIV,
          atmPutIV: currentData.atmPutIV,
          ivChange: { call: -callIVDrop, put: -putIVDrop }
        }
      );
    }

    return null;
  }

  private detectVolumeSpikeAtKeyLevels(currentData: MarketDataPoint): BreakoutSignal | null {
    const nearestLevel = this.findNearestKeyLevel(currentData.spotPrice);
    if (!nearestLevel) return null;

    const distance = Math.abs(currentData.spotPrice - nearestLevel.level);
    if (distance > this.config.levelProximityThreshold) return null;

    const avgVolume = this.getAverageVolume();
    const volumeRatio = avgVolume > 0 ? currentData.volume / avgVolume : 0;

    if (volumeRatio > this.config.highVolumeMultiplier) {
      const type = currentData.spotPrice > nearestLevel.level ? 'BULLISH' : 'BEARISH';
      const action = currentData.spotPrice > nearestLevel.level ? 'breakout above' : 'rejection at';
      
      return this.createSignal(
        type,
        'VOLUME_SPIKE_KEY_LEVELS',
        `High volume ${action} key level ${nearestLevel.level} (${volumeRatio.toFixed(1)}x volume)`,
        currentData,
        {
          keyLevel: nearestLevel.level,
          levelType: nearestLevel.type,
          volumeRatio: volumeRatio
        }
      );
    }

    return null;
  }

  private findNearestKeyLevel(price: number): { level: number; type: 'ROUND_NUMBER' | 'SUPPORT' | 'RESISTANCE' } | null {
    let nearest = null;
    let minDistance = Infinity;

    // Check round numbers
    for (const level of this.config.roundNumberLevels) {
      const distance = Math.abs(price - level);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { level, type: 'ROUND_NUMBER' as const };
      }
    }

    return nearest;
  }

  private calculateMaxPain(): number {
    // Simplified max pain calculation - would need full option chain for accurate calculation
    // For now, return ATM strike as approximation
    if (this.historicalData.length === 0) return 0;
    
    const currentData = this.historicalData[this.historicalData.length - 1];
    return Math.round(currentData.spotPrice / 50) * 50; // Round to nearest 50
  }

  private getAverageVolume(): number {
    if (this.historicalData.length < 5) return 0;
    
    const recentData = this.historicalData.slice(-10);
    return recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length;
  }

  private createSignal(
    type: 'BULLISH' | 'BEARISH',
    pattern: BreakoutPatternType,
    message: string,
    currentData: MarketDataPoint,
    details: Partial<BreakoutDetails>
  ): BreakoutSignal {
    return {
      id: `${pattern}_${Date.now()}`,
      type,
      pattern,
      strength: 'MODERATE', // Will be updated based on confidence
      confidence: 70, // Default, will be updated
      timestamp: currentData.timestamp,
      spotPrice: currentData.spotPrice,
      message,
      details: {
        currentPrice: currentData.spotPrice,
        volume: currentData.volume,
        ...details
      },
      actionable: true,
      priority: 'MEDIUM' // Will be updated based on strength
    };
  }

  private buildAnalysisResult(signals: BreakoutSignal[], currentData: MarketDataPoint): BreakoutAnalysisResult {
    // Update signal priorities and strengths
    signals.forEach(signal => {
      if (signal.confidence >= 80) {
        signal.strength = 'STRONG';
        signal.priority = 'HIGH';
      } else if (signal.confidence >= 60) {
        signal.strength = 'MODERATE';
        signal.priority = 'MEDIUM';
      } else {
        signal.strength = 'WEAK';
        signal.priority = 'LOW';
      }
    });

    // Filter signals by minimum confidence
    const filteredSignals = signals.filter(s => s.confidence >= this.config.minConfidenceThreshold);

    const bullishSignals = filteredSignals.filter(s => s.type === 'BULLISH').length;
    const bearishSignals = filteredSignals.filter(s => s.type === 'BEARISH').length;
    const strongSignals = filteredSignals.filter(s => s.strength === 'STRONG').length;
    const highPrioritySignals = filteredSignals.filter(s => s.priority === 'HIGH').length;

    let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (bullishSignals > bearishSignals) overallBias = 'BULLISH';
    else if (bearishSignals > bullishSignals) overallBias = 'BEARISH';

    const avgConfidence = filteredSignals.length > 0 
      ? filteredSignals.reduce((sum, s) => sum + s.confidence, 0) / filteredSignals.length 
      : 0;

    // Safely handle currentData
    const safeCurrentData = currentData || this.historicalData[this.historicalData.length - 1];
    
    if (!safeCurrentData) {
      return this.getEmptyResult();
    }
    
    return {
      signals: filteredSignals,
      summary: {
        totalSignals: filteredSignals.length,
        bullishSignals,
        bearishSignals,
        strongSignals,
        highPrioritySignals,
        overallBias,
        confidenceScore: avgConfidence
      },
      marketState: {
        currentTrend: this.determineTrend(safeCurrentData),
        volatilityLevel: this.determineVolatilityLevel(safeCurrentData),
        volumeProfile: this.determineVolumeProfile(safeCurrentData),
        keyLevels: {
          support: safeCurrentData ? this.findSupport(safeCurrentData.spotPrice) : null,
          resistance: safeCurrentData ? this.findResistance(safeCurrentData.spotPrice) : null,
          vwap: this.calculateVWAP(),
          maxPain: this.calculateMaxPain()
        }
      },
      lastAnalyzed: new Date().toISOString()
    };
  }

  private determineTrend(_currentData: MarketDataPoint): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    if (this.historicalData.length < 10) return 'SIDEWAYS';
    
    const recentPrices = this.historicalData.slice(-10).map(d => d.spotPrice);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];
    
    if (!firstPrice || !lastPrice) return 'SIDEWAYS';
    
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (change > 0.5) return 'BULLISH';
    if (change < -0.5) return 'BEARISH';
    return 'SIDEWAYS';
  }

  private determineVolatilityLevel(currentData: MarketDataPoint): 'HIGH' | 'MEDIUM' | 'LOW' {
    const avgIV = (currentData.atmCallIV + currentData.atmPutIV) / 2;
    if (avgIV > 20) return 'HIGH';
    if (avgIV > 15) return 'MEDIUM';
    return 'LOW';
  }

  private determineVolumeProfile(currentData: MarketDataPoint): 'HIGH' | 'NORMAL' | 'LOW' {
    const avgVolume = this.getAverageVolume();
    if (avgVolume === 0) return 'NORMAL';
    
    const ratio = currentData.volume / avgVolume;
    if (ratio > 2) return 'HIGH';
    if (ratio < 0.5) return 'LOW';
    return 'NORMAL';
  }

  private findSupport(currentPrice: number): number | null {
    // Simplified support calculation
    const roundedDown = Math.floor(currentPrice / 100) * 100;
    return roundedDown;
  }

  private findResistance(currentPrice: number): number | null {
    // Simplified resistance calculation
    const roundedUp = Math.ceil(currentPrice / 100) * 100;
    return roundedUp;
  }

  private getEmptyResult(): BreakoutAnalysisResult {
    return {
      signals: [],
      summary: {
        totalSignals: 0,
        bullishSignals: 0,
        bearishSignals: 0,
        strongSignals: 0,
        highPrioritySignals: 0,
        overallBias: 'NEUTRAL',
        confidenceScore: 0
      },
      marketState: {
        currentTrend: 'SIDEWAYS',
        volatilityLevel: 'MEDIUM',
        volumeProfile: 'NORMAL',
        keyLevels: {
          support: null,
          resistance: null,
          vwap: null,
          maxPain: null
        }
      },
      lastAnalyzed: new Date().toISOString()
    };
  }

  public getHistoricalBreakouts(): HistoricalBreakoutData[] {
    // Return historical breakout data for analysis
    return this.historicalData.map(data => ({
      timestamp: data.timestamp,
      signals: [], // Would store historical signals
      marketData: data
    }));
  }

  public updateConfig(newConfig: Partial<BreakoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Breakout detection config updated', newConfig);
  }

  public getConfig(): BreakoutConfig {
    return { ...this.config };
  }
}
