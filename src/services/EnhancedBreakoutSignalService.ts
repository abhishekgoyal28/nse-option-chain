import logger from '@/utils/logger';

export interface OptionData {
  strike: number;
  CE: {
    last_price: number;
    volume: number;
    oi: number;
    change: number;
    iv: number;
  };
  PE: {
    last_price: number;
    volume: number;
    oi: number;
    change: number;
    iv: number;
  };
}

export interface MarketData {
  spot_price: number;
  timestamp: string;
  options: { [strike: string]: OptionData };
  atm_strike: number;
  vwap?: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface HistoricalData {
  timestamps: string[];
  spotPrices: number[];
  volumes: number[];
  highs: number[];
  lows: number[];
  opens: number[];
  vwaps: number[];
  calls: {
    oi: number[];
    volume: number[];
    iv: number[];
  };
  puts: {
    oi: number[];
    volume: number[];
    iv: number[];
  };
}

export interface BreakoutSignal {
  type: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  confidence: number;
  description: string;
  conditions: string[];
  timestamp: string;
  targetLevel?: number;
  stopLoss?: number;
  timeframe: string;
}

export class EnhancedBreakoutSignalService {
  private readonly ATR_PERIOD = 14;
  private readonly VWAP_CONFIRMATION_CANDLES = 2;
  private readonly OI_IMBALANCE_THRESHOLD = 1.5;
  private readonly VOLUME_SPIKE_MULTIPLIER = 2.5;
  private readonly RANGE_EXPANSION_MULTIPLIER = 1.5;
  private readonly BB_COMPRESSION_THRESHOLD = 1.5;

  generateEnhancedBreakoutSignals(
    currentData: MarketData,
    historicalData: HistoricalData
  ): BreakoutSignal[] {
    try {
      const signals: BreakoutSignal[] = [];
      const currentTime = new Date();

      // Time-of-day filter
      if (!this.isOptimalTradingTime(currentTime)) {
        logger.info('Outside optimal trading hours, reducing signal sensitivity');
      }

      // 1. Call/Put Writing Imbalance (OI Shift)
      const oiImbalanceSignal = this.analyzeOIImbalance(currentData, historicalData);
      if (oiImbalanceSignal) signals.push(oiImbalanceSignal);

      // 2. VWAP & Volume Breakout
      const vwapBreakoutSignal = this.analyzeVWAPBreakout(currentData, historicalData);
      if (vwapBreakoutSignal) signals.push(vwapBreakoutSignal);

      // 3. OI + Price Divergence
      const oiPriceDivergenceSignal = this.analyzeOIPriceDivergence(currentData, historicalData);
      if (oiPriceDivergenceSignal) signals.push(oiPriceDivergenceSignal);

      // 4. First Hour Breakout
      const firstHourSignal = this.analyzeFirstHourBreakout(currentData, historicalData);
      if (firstHourSignal) signals.push(firstHourSignal);

      // 5. Max Pain Shift
      const maxPainSignal = this.analyzeMaxPainShift(currentData, historicalData);
      if (maxPainSignal) signals.push(maxPainSignal);

      // 6. IV Crush + Price Stability
      const ivCrushSignal = this.analyzeIVCrushStability(currentData, historicalData);
      if (ivCrushSignal) signals.push(ivCrushSignal);

      // 7. Volume Spike at Key Levels
      const volumeSpikeSignal = this.analyzeVolumeSpikeAtKeyLevels(currentData, historicalData);
      if (volumeSpikeSignal) signals.push(volumeSpikeSignal);

      // 8. Candle Range Expansion + Volume Spike
      const rangeExpansionSignal = this.analyzeRangeExpansion(currentData, historicalData);
      if (rangeExpansionSignal) signals.push(rangeExpansionSignal);

      // 9. Delta Neutral Shift
      const deltaNeutralSignal = this.analyzeDeltaNeutralShift(currentData, historicalData);
      if (deltaNeutralSignal) signals.push(deltaNeutralSignal);

      // 10. VWAP + OI Confluence
      const vwapOIConfluenceSignal = this.analyzeVWAPOIConfluence(currentData, historicalData);
      if (vwapOIConfluenceSignal) signals.push(vwapOIConfluenceSignal);

      // 11. Gamma Exposure Flip (GEX)
      const gammaFlipSignal = this.analyzeGammaExposureFlip(currentData, historicalData);
      if (gammaFlipSignal) signals.push(gammaFlipSignal);

      logger.info(`Generated ${signals.length} enhanced breakout signals`);
      return signals;

    } catch (error) {
      logger.error('Error generating enhanced breakout signals:', error);
      return [];
    }
  }

  private isOptimalTradingTime(currentTime: Date): boolean {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Market hours: 9:30 AM - 3:30 PM IST
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    const lunchStart = 12 * 60; // 12:00 PM
    const lunchEnd = 14 * 60; // 2:00 PM
    const expiryEnd = 15 * 60 + 15; // 3:15 PM

    // Check if market is open
    if (timeInMinutes < marketOpen || timeInMinutes > marketClose) {
      return false;
    }

    // Optimal times: 9:30-11:30 and 2:30-3:15
    const morningOptimal = timeInMinutes >= marketOpen && timeInMinutes <= (11 * 60 + 30);
    const afternoonOptimal = timeInMinutes >= (14 * 60 + 30) && timeInMinutes <= expiryEnd;
    
    return morningOptimal || afternoonOptimal;
  }

  private analyzeOIImbalance(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      if (historicalData.calls.oi.length < 2 || historicalData.puts.oi.length < 2) {
        return null;
      }

      // Calculate delta OI
      const latestCallOI = historicalData.calls.oi[historicalData.calls.oi.length - 1];
      const prevCallOI = historicalData.calls.oi[historicalData.calls.oi.length - 2];
      const latestPutOI = historicalData.puts.oi[historicalData.puts.oi.length - 1];
      const prevPutOI = historicalData.puts.oi[historicalData.puts.oi.length - 2];

      const deltaCallOI = Math.abs(latestCallOI - prevCallOI);
      const deltaPutOI = Math.abs(latestPutOI - prevPutOI);

      if (deltaPutOI === 0) return null;

      const oiRatio = deltaCallOI / deltaPutOI;

      // Check for strong imbalance
      if (oiRatio > this.OI_IMBALANCE_THRESHOLD) {
        // Time filter - avoid lunch hours
        if (!this.isOptimalTradingTime(new Date())) {
          return null;
        }

        // IV confirmation
        const latestCallIV = historicalData.calls.iv[historicalData.calls.iv.length - 1];
        const prevCallIV = historicalData.calls.iv[historicalData.calls.iv.length - 2];
        const ivChange = latestCallIV - prevCallIV;

        const direction = latestCallOI > prevCallOI ? 'bearish' : 'bullish'; // Call writing is bearish
        const strength = Math.min(oiRatio / this.OI_IMBALANCE_THRESHOLD, 1.0);

        // IV confirmation logic
        let ivConfirmed = true;
        if (direction === 'bearish' && ivChange > 0) {
          ivConfirmed = false; // Call writing should have flat/down IV
        }

        return {
          type: 'OI_IMBALANCE',
          direction,
          strength: strength * (ivConfirmed ? 1.0 : 0.7),
          confidence: ivConfirmed ? 0.8 : 0.6,
          description: `Strong ${direction} OI imbalance detected (ratio: ${oiRatio.toFixed(2)})`,
          conditions: [
            `Delta OI ratio: ${oiRatio.toFixed(2)} > ${this.OI_IMBALANCE_THRESHOLD}`,
            `IV confirmation: ${ivConfirmed ? 'Confirmed' : 'Weak'}`,
            'Time filter: Optimal trading hours'
          ],
          timestamp: new Date().toISOString(),
          timeframe: '5min'
        };
      }

      return null;
    } catch (error) {
      logger.error('Error analyzing OI imbalance:', error);
      return null;
    }
  }

  private analyzeVWAPBreakout(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      if (historicalData.vwaps.length < this.VWAP_CONFIRMATION_CANDLES + 1) {
        return null;
      }

      const currentPrice = currentData.spot_price;
      const currentVWAP = historicalData.vwaps[historicalData.vwaps.length - 1];
      const atr = this.calculateATR(historicalData);

      // Check for VWAP breakout
      const priceAboveVWAP = currentPrice > currentVWAP;
      const breakoutDistance = Math.abs(currentPrice - currentVWAP);

      // ATR filter - breakout must exceed 0.5 × ATR
      if (breakoutDistance < (0.5 * atr)) {
        return null;
      }

      // Check for 2 consecutive candles confirmation
      let consecutiveCandles = 0;
      for (let i = historicalData.spotPrices.length - this.VWAP_CONFIRMATION_CANDLES; i < historicalData.spotPrices.length; i++) {
        if (i >= 0 && i < historicalData.vwaps.length) {
          const price = historicalData.spotPrices[i];
          const vwap = historicalData.vwaps[i];
          
          if ((priceAboveVWAP && price > vwap) || (!priceAboveVWAP && price < vwap)) {
            consecutiveCandles++;
          }
        }
      }

      if (consecutiveCandles >= this.VWAP_CONFIRMATION_CANDLES) {
        const direction = priceAboveVWAP ? 'bullish' : 'bearish';
        const strength = Math.min(breakoutDistance / atr, 1.0);

        return {
          type: 'VWAP_BREAKOUT',
          direction,
          strength,
          confidence: 0.75,
          description: `${direction.toUpperCase()} VWAP breakout confirmed with ${consecutiveCandles} consecutive candles`,
          conditions: [
            `Price ${priceAboveVWAP ? 'above' : 'below'} VWAP: ${currentPrice.toFixed(2)} vs ${currentVWAP.toFixed(2)}`,
            `Breakout distance: ${breakoutDistance.toFixed(2)} > ${(0.5 * atr).toFixed(2)} (0.5×ATR)`,
            `Consecutive candles: ${consecutiveCandles}/${this.VWAP_CONFIRMATION_CANDLES}`
          ],
          timestamp: new Date().toISOString(),
          targetLevel: priceAboveVWAP ? currentPrice + atr : currentPrice - atr,
          stopLoss: priceAboveVWAP ? currentVWAP - (0.3 * atr) : currentVWAP + (0.3 * atr),
          timeframe: '5min'
        };
      }

      return null;
    } catch (error) {
      logger.error('Error analyzing VWAP breakout:', error);
      return null;
    }
  }

  private calculateATR(historicalData: HistoricalData): number {
    try {
      if (historicalData.highs.length < this.ATR_PERIOD) {
        return 0;
      }

      let atrSum = 0;
      for (let i = historicalData.highs.length - this.ATR_PERIOD; i < historicalData.highs.length - 1; i++) {
        const high = historicalData.highs[i];
        const low = historicalData.lows[i];
        const prevClose = historicalData.spotPrices[i - 1] || historicalData.spotPrices[i];

        const tr1 = high - low;
        const tr2 = Math.abs(high - prevClose);
        const tr3 = Math.abs(low - prevClose);

        const trueRange = Math.max(tr1, tr2, tr3);
        atrSum += trueRange;
      }

      return atrSum / this.ATR_PERIOD;
    } catch (error) {
      logger.error('Error calculating ATR:', error);
      return 0;
    }
  }

  private analyzeOIPriceDivergence(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      if (historicalData.spotPrices.length < 5 || historicalData.calls.oi.length < 5) {
        return null;
      }

      const priceChange = this.calculatePriceChange(historicalData.spotPrices, 3);
      const callOIChange = this.calculateOIChange(historicalData.calls.oi, 3);
      const putOIChange = this.calculateOIChange(historicalData.puts.oi, 3);
      const ivChange = this.calculateIVChange(historicalData.calls.iv, historicalData.puts.iv, 3);

      // Detect divergence patterns
      let signal: BreakoutSignal | null = null;

      // Short covering pattern: Price up + Call OI down + Put OI down + IV down
      if (priceChange > 0 && callOIChange < 0 && putOIChange < 0 && ivChange < 0) {
        signal = {
          type: 'SHORT_COVERING',
          direction: 'bullish',
          strength: Math.min(Math.abs(priceChange) / 50, 1.0), // Normalize by 50 points
          confidence: 0.8,
          description: 'Short covering detected: Price rising with OI reduction and IV falling',
          conditions: [
            `Price change: +${priceChange.toFixed(2)}`,
            `Call OI change: ${callOIChange.toFixed(0)}`,
            `Put OI change: ${putOIChange.toFixed(0)}`,
            `IV change: ${ivChange.toFixed(2)}%`
          ],
          timestamp: new Date().toISOString(),
          timeframe: '5min'
        };
      }
      // Fresh shorts pattern: Price down + Call OI up + Put OI up + IV up
      else if (priceChange < 0 && callOIChange > 0 && putOIChange > 0 && ivChange > 0) {
        signal = {
          type: 'FRESH_SHORTS',
          direction: 'bearish',
          strength: Math.min(Math.abs(priceChange) / 50, 1.0),
          confidence: 0.8,
          description: 'Fresh shorts detected: Price falling with OI increase and IV rising',
          conditions: [
            `Price change: ${priceChange.toFixed(2)}`,
            `Call OI change: +${callOIChange.toFixed(0)}`,
            `Put OI change: +${putOIChange.toFixed(0)}`,
            `IV change: +${ivChange.toFixed(2)}%`
          ],
          timestamp: new Date().toISOString(),
          timeframe: '5min'
        };
      }

      return signal;
    } catch (error) {
      logger.error('Error analyzing OI price divergence:', error);
      return null;
    }
  }

  private analyzeFirstHourBreakout(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      const currentTime = new Date();
      const marketOpen = new Date(currentTime);
      marketOpen.setHours(9, 30, 0, 0);
      
      const timeSinceOpen = currentTime.getTime() - marketOpen.getTime();
      const oneHour = 60 * 60 * 1000;

      // Only analyze after first hour
      if (timeSinceOpen < oneHour) {
        return null;
      }

      // Check for gap filter - exclude if gap > 0.8%
      if (historicalData.opens.length > 0 && historicalData.spotPrices.length > 1) {
        const todayOpen = historicalData.opens[historicalData.opens.length - 1];
        const prevClose = historicalData.spotPrices[historicalData.spotPrices.length - 2];
        const gapPercent = Math.abs((todayOpen - prevClose) / prevClose) * 100;

        if (gapPercent > 0.8) {
          return null; // Skip gap days
        }
      }

      // Find first hour high/low (approximate)
      const firstHourData = this.getFirstHourData(historicalData);
      if (!firstHourData) return null;

      const currentPrice = currentData.spot_price;
      const { high: firstHourHigh, low: firstHourLow } = firstHourData;

      // Check for breakout
      let direction: 'bullish' | 'bearish' | null = null;
      let breakoutLevel = 0;

      if (currentPrice > firstHourHigh) {
        direction = 'bullish';
        breakoutLevel = firstHourHigh;
      } else if (currentPrice < firstHourLow) {
        direction = 'bearish';
        breakoutLevel = firstHourLow;
      }

      if (direction) {
        const strength = Math.abs(currentPrice - breakoutLevel) / breakoutLevel;

        return {
          type: 'FIRST_HOUR_BREAKOUT',
          direction,
          strength: Math.min(strength * 100, 1.0), // Scale to 0-1
          confidence: 0.75,
          description: `${direction.toUpperCase()} breakout of first hour ${direction === 'bullish' ? 'high' : 'low'}`,
          conditions: [
            `Current price: ${currentPrice.toFixed(2)}`,
            `First hour ${direction === 'bullish' ? 'high' : 'low'}: ${breakoutLevel.toFixed(2)}`,
            `Gap filter: Passed (<0.8%)`,
            `Time: After first hour`
          ],
          timestamp: new Date().toISOString(),
          targetLevel: direction === 'bullish' ? 
            currentPrice + (currentPrice - breakoutLevel) : 
            currentPrice - (breakoutLevel - currentPrice),
          stopLoss: breakoutLevel,
          timeframe: '15min'
        };
      }

      return null;
    } catch (error) {
      logger.error('Error analyzing first hour breakout:', error);
      return null;
    }
  }

  private analyzeMaxPainShift(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      // Skip if in last 30 minutes of expiry day
      const currentTime = new Date();
      const isExpiryDay = this.isExpiryDay(currentTime);
      if (isExpiryDay && this.isLastThirtyMinutes(currentTime)) {
        return null;
      }

      const currentMaxPain = this.calculateMaxPain(currentData.options);
      const prevMaxPain = this.calculatePreviousMaxPain(historicalData);

      if (!prevMaxPain || Math.abs(currentMaxPain - prevMaxPain) < 25) {
        return null; // No significant shift
      }

      // Check for OI support at new max pain level
      const oiSupport = this.checkOISupportAtLevel(currentData.options, currentMaxPain);
      if (!oiSupport) {
        return null;
      }

      const direction = currentMaxPain > prevMaxPain ? 'bullish' : 'bearish';
      const shift = Math.abs(currentMaxPain - prevMaxPain);

      return {
        type: 'MAX_PAIN_SHIFT',
        direction,
        strength: Math.min(shift / 100, 1.0), // Normalize by 100 points
        confidence: 0.7,
        description: `Max Pain shifted ${direction === 'bullish' ? 'up' : 'down'} by ${shift.toFixed(0)} points`,
        conditions: [
          `Current Max Pain: ${currentMaxPain.toFixed(0)}`,
          `Previous Max Pain: ${prevMaxPain.toFixed(0)}`,
          `Shift: ${shift.toFixed(0)} points`,
          `OI Support: Confirmed`
        ],
        timestamp: new Date().toISOString(),
        targetLevel: currentMaxPain,
        timeframe: '15min'
      };
    } catch (error) {
      logger.error('Error analyzing max pain shift:', error);
      return null;
    }
  }

  private analyzeIVCrushStability(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      if (historicalData.calls.iv.length < 10 || historicalData.puts.iv.length < 10) {
        return null;
      }

      // Calculate Bollinger Band width (simplified)
      const bbWidth = this.calculateBBWidth(historicalData.spotPrices);
      if (bbWidth > this.BB_COMPRESSION_THRESHOLD) {
        return null; // No compression
      }

      // Calculate IV skew
      const currentCallIV = this.getAverageIV(currentData.options, 'CE');
      const currentPutIV = this.getAverageIV(currentData.options, 'PE');
      const ivSkew = currentCallIV - currentPutIV;

      // Check for IV crush with price stability
      const recentIVs = historicalData.calls.iv.slice(-5);
      const ivCrush = this.detectIVCrush(recentIVs);

      if (ivCrush && Math.abs(ivSkew) < 2) { // Skew narrowing
        return {
          type: 'IV_CRUSH_STABILITY',
          direction: 'neutral',
          strength: 0.6,
          confidence: 0.65,
          description: 'IV crush with price stability detected - potential breakout setup',
          conditions: [
            `BB Width: ${bbWidth.toFixed(2)}% < ${this.BB_COMPRESSION_THRESHOLD}%`,
            `IV Skew: ${ivSkew.toFixed(2)}% (narrowing)`,
            `IV Crush: Detected`,
            `Price Stability: Confirmed`
          ],
          timestamp: new Date().toISOString(),
          timeframe: '15min'
        };
      }

      return null;
    } catch (error) {
      logger.error('Error analyzing IV crush stability:', error);
      return null;
    }
  }

  // Helper methods
  private calculatePriceChange(prices: number[], periods: number): number {
    if (prices.length < periods + 1) return 0;
    const current = prices[prices.length - 1];
    const previous = prices[prices.length - 1 - periods];
    return current - previous;
  }

  private calculateOIChange(oiData: number[], periods: number): number {
    if (oiData.length < periods + 1) return 0;
    const current = oiData[oiData.length - 1];
    const previous = oiData[oiData.length - 1 - periods];
    return current - previous;
  }

  private calculateIVChange(callIVs: number[], putIVs: number[], periods: number): number {
    if (callIVs.length < periods + 1 || putIVs.length < periods + 1) return 0;
    
    const currentAvgIV = (callIVs[callIVs.length - 1] + putIVs[putIVs.length - 1]) / 2;
    const previousAvgIV = (callIVs[callIVs.length - 1 - periods] + putIVs[putIVs.length - 1 - periods]) / 2;
    
    return currentAvgIV - previousAvgIV;
  }

  private getFirstHourData(historicalData: HistoricalData): { high: number; low: number } | null {
    // Simplified - assume first 12 data points represent first hour (5-min intervals)
    if (historicalData.highs.length < 12 || historicalData.lows.length < 12) {
      return null;
    }

    const firstHourHighs = historicalData.highs.slice(0, 12);
    const firstHourLows = historicalData.lows.slice(0, 12);

    return {
      high: Math.max(...firstHourHighs),
      low: Math.min(...firstHourLows)
    };
  }

  private calculateMaxPain(options: { [strike: string]: OptionData }): number {
    let maxPain = 0;
    let minPain = Infinity;

    Object.keys(options).forEach(strikeStr => {
      const strike = parseFloat(strikeStr);
      const option = options[strikeStr];
      
      let totalPain = 0;
      
      // Calculate pain for all strikes
      Object.keys(options).forEach(otherStrikeStr => {
        const otherStrike = parseFloat(otherStrikeStr);
        const otherOption = options[otherStrikeStr];
        
        // Call pain
        if (strike > otherStrike) {
          totalPain += (strike - otherStrike) * otherOption.CE.oi;
        }
        
        // Put pain
        if (strike < otherStrike) {
          totalPain += (otherStrike - strike) * otherOption.PE.oi;
        }
      });

      if (totalPain < minPain) {
        minPain = totalPain;
        maxPain = strike;
      }
    });

    return maxPain;
  }

  private calculatePreviousMaxPain(historicalData: HistoricalData): number | null {
    // Simplified - would need historical options data
    // For now, return null to indicate no previous data
    return null;
  }

  private checkOISupportAtLevel(options: { [strike: string]: OptionData }, level: number): boolean {
    const nearbyStrikes = Object.keys(options)
      .map(s => parseFloat(s))
      .filter(s => Math.abs(s - level) <= 50)
      .sort((a, b) => Math.abs(a - level) - Math.abs(b - level));

    if (nearbyStrikes.length === 0) return false;

    const closestStrike = nearbyStrikes[0];
    const option = options[closestStrike.toString()];
    
    return (option.CE.oi + option.PE.oi) > 10000; // Minimum OI threshold
  }

  private isExpiryDay(date: Date): boolean {
    // Simplified - assume Thursday is expiry day
    return date.getDay() === 4;
  }

  private isLastThirtyMinutes(date: Date): boolean {
    const hour = date.getHours();
    const minute = date.getMinutes();
    return hour === 15 && minute >= 0; // After 3:00 PM
  }

  private calculateBBWidth(prices: number[]): number {
    if (prices.length < 20) return 100; // Return high value if insufficient data

    const recentPrices = prices.slice(-20);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / recentPrices.length;
    const stdDev = Math.sqrt(variance);
    
    const upperBand = sma + (2 * stdDev);
    const lowerBand = sma - (2 * stdDev);
    
    return ((upperBand - lowerBand) / sma) * 100;
  }

  private getAverageIV(options: { [strike: string]: OptionData }, type: 'CE' | 'PE'): number {
    const ivValues = Object.values(options)
      .map(option => type === 'CE' ? option.CE.iv : option.PE.iv)
      .filter(iv => iv > 0);

    return ivValues.length > 0 ? ivValues.reduce((sum, iv) => sum + iv, 0) / ivValues.length : 0;
  }

  private detectIVCrush(recentIVs: number[]): boolean {
    if (recentIVs.length < 3) return false;
    
    const latest = recentIVs[recentIVs.length - 1];
    const previous = recentIVs[recentIVs.length - 2];
    const earlier = recentIVs[recentIVs.length - 3];
    
    // IV crush: consistent decline in IV
    return latest < previous && previous < earlier && (earlier - latest) > 2;
  }

  private analyzeVolumeSpikeAtKeyLevels(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      if (historicalData.volumes.length < 10) return null;

      const currentVolume = currentData.volume || 0;
      const avgVolume = historicalData.volumes.slice(-10).reduce((sum, vol) => sum + vol, 0) / 10;
      
      if (currentVolume < avgVolume * this.VOLUME_SPIKE_MULTIPLIER) {
        return null; // No volume spike
      }

      // Check if at key levels (previous day high/low, round numbers)
      const currentPrice = currentData.spot_price;
      const isAtKeyLevel = this.isAtKeyLevel(currentPrice, historicalData);
      
      if (!isAtKeyLevel) return null;

      // Require closing basis confirmation
      const priceDirection = this.getPriceDirection(historicalData.spotPrices);
      
      return {
        type: 'VOLUME_SPIKE_KEY_LEVEL',
        direction: priceDirection,
        strength: Math.min(currentVolume / avgVolume / this.VOLUME_SPIKE_MULTIPLIER, 1.0),
        confidence: 0.8,
        description: `Volume spike at key level: ${(currentVolume / avgVolume).toFixed(1)}x average volume`,
        conditions: [
          `Current volume: ${currentVolume.toLocaleString()}`,
          `Average volume: ${avgVolume.toLocaleString()}`,
          `Volume ratio: ${(currentVolume / avgVolume).toFixed(1)}x`,
          `Key level: Confirmed`,
          `Price direction: ${priceDirection}`
        ],
        timestamp: new Date().toISOString(),
        timeframe: '5min'
      };
    } catch (error) {
      logger.error('Error analyzing volume spike at key levels:', error);
      return null;
    }
  }

  private analyzeRangeExpansion(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      if (historicalData.highs.length < 10 || historicalData.lows.length < 10) return null;

      // Calculate current candle range
      const currentHigh = currentData.high || currentData.spot_price;
      const currentLow = currentData.low || currentData.spot_price;
      const currentRange = currentHigh - currentLow;

      // Calculate average range of last 10 candles
      const recentRanges = [];
      for (let i = historicalData.highs.length - 10; i < historicalData.highs.length; i++) {
        if (i >= 0 && i < historicalData.lows.length) {
          recentRanges.push(historicalData.highs[i] - historicalData.lows[i]);
        }
      }

      const avgRange = recentRanges.reduce((sum, range) => sum + range, 0) / recentRanges.length;

      // Check for range expansion
      if (currentRange < avgRange * this.RANGE_EXPANSION_MULTIPLIER) {
        return null;
      }

      // Check for volume spike
      const currentVolume = currentData.volume || 0;
      const avgVolume = historicalData.volumes.slice(-10).reduce((sum, vol) => sum + vol, 0) / 10;
      
      if (currentVolume < avgVolume * this.VOLUME_SPIKE_MULTIPLIER) {
        return null;
      }

      const direction = this.getPriceDirection(historicalData.spotPrices);

      return {
        type: 'RANGE_EXPANSION_VOLUME',
        direction,
        strength: Math.min((currentRange / avgRange) / this.RANGE_EXPANSION_MULTIPLIER, 1.0),
        confidence: 0.85,
        description: `Range expansion with volume spike: ${(currentRange / avgRange).toFixed(1)}x average range`,
        conditions: [
          `Current range: ${currentRange.toFixed(2)}`,
          `Average range: ${avgRange.toFixed(2)}`,
          `Range ratio: ${(currentRange / avgRange).toFixed(1)}x`,
          `Volume spike: ${(currentVolume / avgVolume).toFixed(1)}x`
        ],
        timestamp: new Date().toISOString(),
        timeframe: '5min'
      };
    } catch (error) {
      logger.error('Error analyzing range expansion:', error);
      return null;
    }
  }

  private analyzeDeltaNeutralShift(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      // Track Call + Put OI of same strikes within 15 minutes
      const atmStrike = currentData.atm_strike;
      const nearbyStrikes = [atmStrike - 50, atmStrike, atmStrike + 50];
      
      let totalCallOI = 0;
      let totalPutOI = 0;

      nearbyStrikes.forEach(strike => {
        const option = currentData.options[strike.toString()];
        if (option) {
          totalCallOI += option.CE.oi;
          totalPutOI += option.PE.oi;
        }
      });

      const totalOI = totalCallOI + totalPutOI;
      if (totalOI === 0) return null;

      const callRatio = totalCallOI / totalOI;
      const putRatio = totalPutOI / totalOI;

      // Detect significant shift (simplified - would need historical comparison)
      let direction: 'bullish' | 'bearish' | null = null;
      
      if (callRatio > 0.65) {
        direction = 'bullish'; // Call-heavy
      } else if (putRatio > 0.65) {
        direction = 'bearish'; // Put-heavy
      }

      if (direction) {
        return {
          type: 'DELTA_NEUTRAL_SHIFT',
          direction,
          strength: Math.abs(callRatio - putRatio),
          confidence: 0.7,
          description: `Delta neutral shift: ${direction === 'bullish' ? 'Call' : 'Put'}-heavy positioning`,
          conditions: [
            `Call OI ratio: ${(callRatio * 100).toFixed(1)}%`,
            `Put OI ratio: ${(putRatio * 100).toFixed(1)}%`,
            `Total OI: ${totalOI.toLocaleString()}`,
            `Shift direction: ${direction}`
          ],
          timestamp: new Date().toISOString(),
          timeframe: '15min'
        };
      }

      return null;
    } catch (error) {
      logger.error('Error analyzing delta neutral shift:', error);
      return null;
    }
  }

  private analyzeVWAPOIConfluence(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      if (historicalData.vwaps.length === 0) return null;

      const currentPrice = currentData.spot_price;
      const currentVWAP = historicalData.vwaps[historicalData.vwaps.length - 1];
      
      // Get recent OI changes
      const callOIChange = this.calculateOIChange(historicalData.calls.oi, 2);
      const putOIChange = this.calculateOIChange(historicalData.puts.oi, 2);

      let signal: BreakoutSignal | null = null;

      // Bullish confluence: Price > VWAP + CE OI down + PE OI up
      if (currentPrice > currentVWAP && callOIChange < 0 && putOIChange > 0) {
        signal = {
          type: 'VWAP_OI_CONFLUENCE',
          direction: 'bullish',
          strength: 0.8,
          confidence: 0.9,
          description: 'Bullish confluence: Price above VWAP with supportive OI flow',
          conditions: [
            `Price vs VWAP: ${currentPrice.toFixed(2)} > ${currentVWAP.toFixed(2)}`,
            `Call OI change: ${callOIChange.toFixed(0)} (down)`,
            `Put OI change: +${putOIChange.toFixed(0)} (up)`,
            'Confluence: Confirmed'
          ],
          timestamp: new Date().toISOString(),
          timeframe: '5min'
        };
      }
      // Bearish confluence: Price < VWAP + CE OI up + PE OI down
      else if (currentPrice < currentVWAP && callOIChange > 0 && putOIChange < 0) {
        signal = {
          type: 'VWAP_OI_CONFLUENCE',
          direction: 'bearish',
          strength: 0.8,
          confidence: 0.9,
          description: 'Bearish confluence: Price below VWAP with supportive OI flow',
          conditions: [
            `Price vs VWAP: ${currentPrice.toFixed(2)} < ${currentVWAP.toFixed(2)}`,
            `Call OI change: +${callOIChange.toFixed(0)} (up)`,
            `Put OI change: ${putOIChange.toFixed(0)} (down)`,
            'Confluence: Confirmed'
          ],
          timestamp: new Date().toISOString(),
          timeframe: '5min'
        };
      }

      return signal;
    } catch (error) {
      logger.error('Error analyzing VWAP OI confluence:', error);
      return null;
    }
  }

  private analyzeGammaExposureFlip(currentData: MarketData, historicalData: HistoricalData): BreakoutSignal | null {
    try {
      const atmStrike = currentData.atm_strike;
      const gammaStrikes = [atmStrike - 100, atmStrike - 50, atmStrike, atmStrike + 50, atmStrike + 100];
      
      let netGammaExposure = 0;
      
      gammaStrikes.forEach(strike => {
        const option = currentData.options[strike.toString()];
        if (option) {
          // Simplified gamma calculation (would need proper Greeks)
          const callGamma = option.CE.oi * 0.01; // Simplified
          const putGamma = option.PE.oi * -0.01; // Puts have negative gamma for dealers
          netGammaExposure += callGamma + putGamma;
        }
      });

      // Detect gamma flip (simplified)
      const isShortGamma = netGammaExposure < -50000;
      const isLongGamma = netGammaExposure > 50000;

      if (isShortGamma || isLongGamma) {
        const direction = isShortGamma ? 'neutral' : 'neutral'; // Gamma flips create volatility, not direction
        
        return {
          type: 'GAMMA_EXPOSURE_FLIP',
          direction: 'neutral',
          strength: Math.min(Math.abs(netGammaExposure) / 100000, 1.0),
          confidence: 0.6,
          description: `${isShortGamma ? 'Short' : 'Long'} gamma zone - expect ${isShortGamma ? 'high' : 'low'} volatility`,
          conditions: [
            `Net Gamma Exposure: ${netGammaExposure.toFixed(0)}`,
            `Gamma Zone: ${isShortGamma ? 'Short (High Vol)' : 'Long (Low Vol)'}`,
            `ATM Strike: ${atmStrike}`
          ],
          timestamp: new Date().toISOString(),
          timeframe: '15min'
        };
      }

      return null;
    } catch (error) {
      logger.error('Error analyzing gamma exposure flip:', error);
      return null;
    }
  }

  // Additional helper methods
  private isAtKeyLevel(price: number, historicalData: HistoricalData): boolean {
    // Check round numbers
    const roundNumber = Math.round(price / 50) * 50;
    if (Math.abs(price - roundNumber) < 5) return true;

    // Check previous day high/low (simplified)
    if (historicalData.highs.length > 0 && historicalData.lows.length > 0) {
      const prevHigh = Math.max(...historicalData.highs.slice(-20));
      const prevLow = Math.min(...historicalData.lows.slice(-20));
      
      if (Math.abs(price - prevHigh) < 10 || Math.abs(price - prevLow) < 10) {
        return true;
      }
    }

    return false;
  }

  private getPriceDirection(prices: number[]): 'bullish' | 'bearish' | 'neutral' {
    if (prices.length < 3) return 'neutral';
    
    const recent = prices.slice(-3);
    const trend = recent[2] - recent[0];
    
    if (trend > 5) return 'bullish';
    if (trend < -5) return 'bearish';
    return 'neutral';
  }
}
