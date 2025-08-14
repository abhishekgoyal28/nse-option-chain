/**
 * Utility functions for financial calculations and data analysis
 */

/**
 * Calculate implied volatility (simplified Black-Scholes approximation)
 */
export function calculateImpliedVolatility(
  optionPrice: number,
  spotPrice: number,
  strike: number,
  expiry: string,
  optionType: 'CE' | 'PE'
): number {
  try {
    const timeToExpiry = (new Date(expiry).getTime() - new Date().getTime()) / (365 * 24 * 60 * 60 * 1000);
    const intrinsicValue = optionType === 'CE' 
      ? Math.max(0, spotPrice - strike)
      : Math.max(0, strike - spotPrice);
    const timeValue = Math.max(0, optionPrice - intrinsicValue);
    const iv = (timeValue / spotPrice) * Math.sqrt(365 / Math.max(timeToExpiry * 365, 1)) * 100;
    return Math.min(Math.max(iv, 1), 100);
  } catch (error) {
    console.error('Error calculating IV:', error);
    return 0;
  }
}

/**
 * Calculate trend from price array
 */
export function calculateTrend(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  
  if (!firstPrice || !lastPrice || firstPrice === 0) return 0;
  
  return (lastPrice - firstPrice) / firstPrice;
}

/**
 * Calculate volatility from price returns
 */
export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const current = prices[i];
    const previous = prices[i - 1];
    if (current !== undefined && previous !== undefined && previous !== 0) {
      returns.push((current - previous) / previous);
    }
  }
  
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate support and resistance levels
 */
export function calculateSupportResistance(prices: number[]): {
  support: number | null;
  resistance: number | null;
  current: number;
} {
  if (prices.length < 20) {
    return { 
      support: null, 
      resistance: null, 
      current: prices[prices.length - 1] || 0 
    };
  }
  
  const recentPrices = prices.slice(-20);
  const sorted = [...recentPrices].sort((a, b) => a - b);
  
  return {
    support: sorted[Math.floor(sorted.length * 0.1)] || null,
    resistance: sorted[Math.floor(sorted.length * 0.9)] || null,
    current: prices[prices.length - 1] || 0
  };
}

/**
 * Calculate average of an array
 */
export function calculateAverage(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(data: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const average = calculateAverage(slice);
    result.push(average);
  }
  
  return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [];
  
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate gains and losses
  for (let i = 1; i < prices.length; i++) {
    const current = prices[i];
    const previous = prices[i - 1];
    if (current !== undefined && previous !== undefined) {
      const change = current - previous;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
  }
  
  const rsi: number[] = [];
  
  // Calculate initial average gain and loss
  let avgGain = calculateAverage(gains.slice(0, period));
  let avgLoss = calculateAverage(losses.slice(0, period));
  
  // Calculate first RSI value
  const rs = avgGain / avgLoss;
  rsi.push(100 - (100 / (1 + rs)));
  
  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < gains.length; i++) {
    const currentGain = gains[i];
    const currentLoss = losses[i];
    if (currentGain !== undefined && currentLoss !== undefined) {
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
      
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  const macd: number[] = [];
  const startIndex = Math.max(fastEMA.length - slowEMA.length, 0);
  
  for (let i = 0; i < slowEMA.length; i++) {
    const fastValue = fastEMA[startIndex + i];
    const slowValue = slowEMA[i];
    if (fastValue !== undefined && slowValue !== undefined) {
      macd.push(fastValue - slowValue);
    }
  }
  
  const signal = calculateEMA(macd, signalPeriod);
  const histogram: number[] = [];
  
  const signalStartIndex = macd.length - signal.length;
  for (let i = 0; i < signal.length; i++) {
    const macdValue = macd[signalStartIndex + i];
    const signalValue = signal[i];
    if (macdValue !== undefined && signalValue !== undefined) {
      histogram.push(macdValue - signalValue);
    }
  }
  
  return { macd, signal, histogram };
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i] || 0;
  }
  ema.push(sum / period);
  
  // Calculate subsequent EMA values
  for (let i = period; i < prices.length; i++) {
    const currentPrice = prices[i];
    const previousEMA = ema[ema.length - 1];
    if (currentPrice !== undefined && previousEMA !== undefined) {
      const emaValue = (currentPrice - previousEMA) * multiplier + previousEMA;
      ema.push(emaValue);
    }
  }
  
  return ema;
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateMovingAverage(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const avg = calculateAverage(slice);
    const variance = slice.reduce((sum, price) => {
      if (price !== undefined) {
        return sum + Math.pow(price - avg, 2);
      }
      return sum;
    }, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    upper.push(avg + (standardDeviation * stdDev));
    lower.push(avg - (standardDeviation * stdDev));
  }
  
  return { upper, middle, lower };
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Round to specified decimal places
 */
export function roundToDecimals(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
