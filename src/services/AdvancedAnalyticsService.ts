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
  expiry: string;
}

export interface IVSkewMetrics {
  atmIV: number;
  callSkew: {
    atm_plus_1: number;
    atm_plus_2: number;
    atm_plus_3: number;
  };
  putSkew: {
    atm_minus_1: number;
    atm_minus_2: number;
    atm_minus_3: number;
  };
  overallSkew: number;
  skewVelocity: number;
  timestamp: string;
}

export interface GreeksData {
  strike: number;
  callGamma: number;
  putGamma: number;
  callDelta: number;
  putDelta: number;
  netGamma: number;
  gammaExposure: number;
}

export interface GEXMetrics {
  totalGEX: number;
  zeroGammaLevel: number;
  maxPainLevel: number;
  gammaByStrike: GreeksData[];
  dominantGammaZone: 'long' | 'short' | 'neutral';
  timestamp: string;
}

export interface OICluster {
  centerStrike: number;
  totalOI: number;
  strikes: number[];
  strength: number;
  type: 'call_heavy' | 'put_heavy' | 'balanced';
}

export interface OIClusterMetrics {
  clusters: OICluster[];
  clusterMigration: {
    previousCenter: number;
    currentCenter: number;
    migrationDistance: number;
    migrationStrength: number;
  } | null;
  clusterBreakAlert: boolean;
  timestamp: string;
}

export interface PatternMetrics {
  motifDetected: boolean;
  discordDetected: boolean;
  patternType: string;
  confidence: number;
  timestamp: string;
}

export interface AdvancedMetrics {
  ivSkew: IVSkewMetrics;
  gex: GEXMetrics;
  oiClusters: OIClusterMetrics;
  patterns: PatternMetrics;
  timestamp: string;
}

export class AdvancedAnalyticsService {
  private historicalSkew: number[] = [];
  private historicalOIClusters: OICluster[][] = [];
  private historicalSpotPrices: number[] = [];
  private readonly MAX_HISTORY = 100; // Keep last 100 data points

  calculateAdvancedMetrics(currentData: MarketData, historicalData?: any[]): AdvancedMetrics {
    try {
      logger.info('Calculating advanced analytics metrics');

      // 1. IV Skew Analysis
      const ivSkew = this.calculateIVSkew(currentData);

      // 2. Gamma Exposure (GEX) Analysis
      const gex = this.calculateGEX(currentData);

      // 3. OI Clustering Analysis
      const oiClusters = this.analyzeOIClusters(currentData);

      // 4. Simple Pattern Recognition
      const patterns = this.detectPatterns(currentData);

      // Update historical data
      this.updateHistoricalData(currentData, ivSkew, oiClusters);

      return {
        ivSkew,
        gex,
        oiClusters,
        patterns,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating advanced metrics:', error);
      throw error;
    }
  }

  private calculateIVSkew(data: MarketData): IVSkewMetrics {
    try {
      const atmStrike = data.atm_strike;
      const options = data.options;

      // Get ATM IV
      const atmOption = options[atmStrike.toString()];
      const atmIV = atmOption ? (atmOption.CE.iv + atmOption.PE.iv) / 2 : 0;

      // Calculate call skew (OTM calls)
      const callSkew = {
        atm_plus_1: this.getIVDifference(options, atmStrike + 50, atmStrike, 'CE'),
        atm_plus_2: this.getIVDifference(options, atmStrike + 100, atmStrike, 'CE'),
        atm_plus_3: this.getIVDifference(options, atmStrike + 150, atmStrike, 'CE')
      };

      // Calculate put skew (OTM puts)
      const putSkew = {
        atm_minus_1: this.getIVDifference(options, atmStrike - 50, atmStrike, 'PE'),
        atm_minus_2: this.getIVDifference(options, atmStrike - 100, atmStrike, 'PE'),
        atm_minus_3: this.getIVDifference(options, atmStrike - 150, atmStrike, 'PE')
      };

      // Overall skew (put skew - call skew)
      const overallSkew = (putSkew.atm_minus_2 - callSkew.atm_plus_2);

      // Calculate skew velocity (change in skew)
      const skewVelocity = this.calculateSkewVelocity(overallSkew);

      return {
        atmIV,
        callSkew,
        putSkew,
        overallSkew,
        skewVelocity,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating IV skew:', error);
      throw error;
    }
  }

  private calculateGEX(data: MarketData): GEXMetrics {
    try {
      const spotPrice = data.spot_price;
      const options = data.options;
      const gammaByStrike: GreeksData[] = [];
      let totalGEX = 0;

      // Calculate gamma for each strike
      Object.keys(options).forEach(strikeStr => {
        const strike = parseFloat(strikeStr);
        const option = options[strikeStr];

        // Simplified gamma calculation (would need proper Black-Scholes)
        const callGamma = this.calculateSimpleGamma(spotPrice, strike, option.CE.iv, 'call');
        const putGamma = this.calculateSimpleGamma(spotPrice, strike, option.PE.iv, 'put');
        
        // Gamma exposure = OI × Gamma × 100 (contract multiplier)
        const callGEX = option.CE.oi * callGamma * 100;
        const putGEX = option.PE.oi * putGamma * 100 * -1; // Puts have negative gamma for dealers

        const netGamma = callGamma + putGamma;
        const gammaExposure = callGEX + putGEX;

        gammaByStrike.push({
          strike,
          callGamma,
          putGamma,
          callDelta: this.calculateSimpleDelta(spotPrice, strike, 'call'),
          putDelta: this.calculateSimpleDelta(spotPrice, strike, 'put'),
          netGamma,
          gammaExposure
        });

        totalGEX += gammaExposure;
      });

      // Find zero gamma level (where total GEX crosses zero)
      const zeroGammaLevel = this.findZeroGammaLevel(gammaByStrike, spotPrice);

      // Calculate max pain
      const maxPainLevel = this.calculateMaxPain(options);

      // Determine dominant gamma zone
      const dominantGammaZone = totalGEX > 50000 ? 'long' : totalGEX < -50000 ? 'short' : 'neutral';

      return {
        totalGEX,
        zeroGammaLevel,
        maxPainLevel,
        gammaByStrike,
        dominantGammaZone,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating GEX:', error);
      throw error;
    }
  }

  private analyzeOIClusters(data: MarketData): OIClusterMetrics {
    try {
      const options = data.options;
      const clusters: OICluster[] = [];

      // Simple clustering: group strikes by OI concentration
      const strikes = Object.keys(options).map(s => parseFloat(s)).sort((a, b) => a - b);
      const oiData = strikes.map(strike => ({
        strike,
        totalOI: options[strike.toString()].CE.oi + options[strike.toString()].PE.oi,
        callOI: options[strike.toString()].CE.oi,
        putOI: options[strike.toString()].PE.oi
      }));

      // Find OI clusters using simple threshold method
      const avgOI = oiData.reduce((sum, d) => sum + d.totalOI, 0) / oiData.length;
      const threshold = avgOI * 1.5; // 50% above average

      let currentCluster: typeof oiData = [];
      
      oiData.forEach((point, index) => {
        if (point.totalOI > threshold) {
          currentCluster.push(point);
        } else {
          if (currentCluster.length > 0) {
            // Create cluster
            const totalOI = currentCluster.reduce((sum, p) => sum + p.totalOI, 0);
            const centerStrike = currentCluster.reduce((sum, p) => sum + p.strike * p.totalOI, 0) / totalOI;
            const callOI = currentCluster.reduce((sum, p) => sum + p.callOI, 0);
            const putOI = currentCluster.reduce((sum, p) => sum + p.putOI, 0);

            clusters.push({
              centerStrike: Math.round(centerStrike),
              totalOI,
              strikes: currentCluster.map(p => p.strike),
              strength: totalOI / avgOI,
              type: callOI > putOI * 1.2 ? 'call_heavy' : putOI > callOI * 1.2 ? 'put_heavy' : 'balanced'
            });

            currentCluster = [];
          }
        }
      });

      // Detect cluster migration
      const clusterMigration = this.detectClusterMigration(clusters);

      // Check for cluster break alert
      const clusterBreakAlert = this.checkClusterBreak(clusters);

      return {
        clusters,
        clusterMigration,
        clusterBreakAlert,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error analyzing OI clusters:', error);
      throw error;
    }
  }

  private detectPatterns(data: MarketData): PatternMetrics {
    try {
      // Simple pattern detection based on price movement and OI changes
      const spotPrice = data.spot_price;
      
      // Add current price to historical data
      this.historicalSpotPrices.push(spotPrice);
      if (this.historicalSpotPrices.length > this.MAX_HISTORY) {
        this.historicalSpotPrices.shift();
      }

      // Simple motif detection: look for recurring patterns in last 20 periods
      const motifDetected = this.detectSimpleMotif();
      
      // Discord detection: unusual price movements
      const discordDetected = this.detectDiscord(spotPrice);

      return {
        motifDetected,
        discordDetected,
        patternType: motifDetected ? 'recurring_pattern' : discordDetected ? 'anomaly' : 'normal',
        confidence: motifDetected || discordDetected ? 0.7 : 0.3,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error detecting patterns:', error);
      return {
        motifDetected: false,
        discordDetected: false,
        patternType: 'error',
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Helper methods
  private getIVDifference(options: { [strike: string]: OptionData }, strike1: number, strike2: number, type: 'CE' | 'PE'): number {
    const option1 = options[strike1.toString()];
    const option2 = options[strike2.toString()];
    
    if (!option1 || !option2) return 0;
    
    return option1[type].iv - option2[type].iv;
  }

  private calculateSkewVelocity(currentSkew: number): number {
    this.historicalSkew.push(currentSkew);
    if (this.historicalSkew.length > this.MAX_HISTORY) {
      this.historicalSkew.shift();
    }

    if (this.historicalSkew.length < 2) return 0;

    // Simple velocity: current - previous
    return currentSkew - this.historicalSkew[this.historicalSkew.length - 2];
  }

  private calculateSimpleGamma(spot: number, strike: number, iv: number, type: 'call' | 'put'): number {
    // Simplified gamma calculation (proper implementation would use Black-Scholes)
    const moneyness = spot / strike;
    const timeToExpiry = 0.02; // Assume ~7 days to expiry
    
    // Simplified gamma approximation
    const d1 = (Math.log(moneyness) + (0.05 + 0.5 * iv * iv) * timeToExpiry) / (iv * Math.sqrt(timeToExpiry));
    const gamma = Math.exp(-0.5 * d1 * d1) / (spot * iv * Math.sqrt(2 * Math.PI * timeToExpiry));
    
    return gamma * 0.01; // Scale down
  }

  private calculateSimpleDelta(spot: number, strike: number, type: 'call' | 'put'): number {
    // Simplified delta calculation
    const moneyness = spot / strike;
    if (type === 'call') {
      return moneyness > 1 ? 0.6 : moneyness > 0.95 ? 0.5 : 0.3;
    } else {
      return moneyness < 1 ? -0.6 : moneyness < 1.05 ? -0.5 : -0.3;
    }
  }

  private findZeroGammaLevel(gammaData: GreeksData[], spotPrice: number): number {
    // Find the strike where gamma exposure crosses zero
    let zeroLevel = spotPrice;
    
    for (let i = 0; i < gammaData.length - 1; i++) {
      const current = gammaData[i];
      const next = gammaData[i + 1];
      
      if ((current.gammaExposure > 0 && next.gammaExposure < 0) || 
          (current.gammaExposure < 0 && next.gammaExposure > 0)) {
        zeroLevel = (current.strike + next.strike) / 2;
        break;
      }
    }
    
    return zeroLevel;
  }

  private calculateMaxPain(options: { [strike: string]: OptionData }): number {
    let maxPain = 0;
    let minPain = Infinity;

    Object.keys(options).forEach(strikeStr => {
      const strike = parseFloat(strikeStr);
      let totalPain = 0;
      
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

  private detectClusterMigration(currentClusters: OICluster[]): OIClusterMetrics['clusterMigration'] {
    if (this.historicalOIClusters.length === 0 || currentClusters.length === 0) {
      return null;
    }

    const previousClusters = this.historicalOIClusters[this.historicalOIClusters.length - 1];
    if (!previousClusters || previousClusters.length === 0) {
      return null;
    }

    // Find the strongest clusters
    const currentStrongest = currentClusters.reduce((max, cluster) => 
      cluster.strength > max.strength ? cluster : max
    );
    const previousStrongest = previousClusters.reduce((max, cluster) => 
      cluster.strength > max.strength ? cluster : max
    );

    const migrationDistance = Math.abs(currentStrongest.centerStrike - previousStrongest.centerStrike);
    
    if (migrationDistance > 50) { // Significant migration
      return {
        previousCenter: previousStrongest.centerStrike,
        currentCenter: currentStrongest.centerStrike,
        migrationDistance,
        migrationStrength: currentStrongest.strength / previousStrongest.strength
      };
    }

    return null;
  }

  private checkClusterBreak(clusters: OICluster[]): boolean {
    // Simple cluster break detection: if no strong clusters exist
    return clusters.length === 0 || clusters.every(c => c.strength < 2);
  }

  private detectSimpleMotif(): boolean {
    if (this.historicalSpotPrices.length < 20) return false;
    
    // Simple pattern: look for similar sequences in recent history
    const recent = this.historicalSpotPrices.slice(-10);
    const earlier = this.historicalSpotPrices.slice(-20, -10);
    
    // Calculate correlation between recent and earlier patterns
    const correlation = this.calculateCorrelation(recent, earlier);
    return correlation > 0.8;
  }

  private detectDiscord(currentPrice: number): boolean {
    if (this.historicalSpotPrices.length < 10) return false;
    
    const recentPrices = this.historicalSpotPrices.slice(-10);
    const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const stdDev = Math.sqrt(recentPrices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / recentPrices.length);
    
    // Discord if current price is more than 2 standard deviations away
    return Math.abs(currentPrice - avgPrice) > 2 * stdDev;
  }

  private calculateCorrelation(arr1: number[], arr2: number[]): number {
    if (arr1.length !== arr2.length) return 0;
    
    const n = arr1.length;
    const sum1 = arr1.reduce((sum, x) => sum + x, 0);
    const sum2 = arr2.reduce((sum, x) => sum + x, 0);
    const sum1Sq = arr1.reduce((sum, x) => sum + x * x, 0);
    const sum2Sq = arr2.reduce((sum, x) => sum + x * x, 0);
    const pSum = arr1.reduce((sum, x, i) => sum + x * arr2[i], 0);
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : num / den;
  }

  private updateHistoricalData(currentData: MarketData, ivSkew: IVSkewMetrics, oiClusters: OIClusterMetrics): void {
    // Update historical OI clusters
    this.historicalOIClusters.push(oiClusters.clusters);
    if (this.historicalOIClusters.length > this.MAX_HISTORY) {
      this.historicalOIClusters.shift();
    }
  }
}
