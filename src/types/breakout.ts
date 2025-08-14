// Breakout Pattern Detection Types

export interface BreakoutSignal {
  id: string;
  type: 'BULLISH' | 'BEARISH';
  pattern: BreakoutPatternType;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  confidence: number; // 0-100
  timestamp: string;
  spotPrice: number;
  message: string;
  details: BreakoutDetails;
  actionable: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export type BreakoutPatternType = 
  | 'CALL_PUT_WRITING_IMBALANCE'
  | 'VWAP_VOLUME_BREAKOUT'
  | 'OI_PRICE_DIVERGENCE'
  | 'FIRST_HOUR_BREAKOUT'
  | 'MAX_PAIN_SHIFT'
  | 'IV_CRUSH_BREAKOUT'
  | 'VOLUME_SPIKE_KEY_LEVELS';

export interface BreakoutDetails {
  // Common fields
  currentPrice: number;
  volume?: number;
  volumeRatio?: number; // Current volume vs average
  
  // OI specific
  callOI?: number;
  putOI?: number;
  oiChange?: {
    call: number;
    put: number;
  };
  
  // VWAP specific
  vwap?: number;
  vwapDistance?: number;
  vwapBreakoutConfirmed?: boolean;
  
  // IV specific
  atmCallIV?: number;
  atmPutIV?: number;
  ivChange?: {
    call: number;
    put: number;
  };
  
  // Max Pain specific
  maxPain?: number;
  maxPainShift?: number;
  
  // Key levels specific
  keyLevel?: number;
  levelType?: 'ROUND_NUMBER' | 'PREVIOUS_HIGH' | 'PREVIOUS_LOW' | 'SUPPORT' | 'RESISTANCE';
  
  // First hour breakout specific
  firstHourHigh?: number;
  firstHourLow?: number;
  breakoutLevel?: number;
}

export interface VWAPData {
  value: number;
  timestamp: string;
  volume: number;
  price: number;
}

export interface MarketDataPoint {
  timestamp: string;
  spotPrice: number;
  volume: number;
  atmCallOI: number;
  atmPutOI: number;
  atmCallIV: number;
  atmPutIV: number;
  atmCallVolume: number;
  atmPutVolume: number;
  totalCallOI: number;
  totalPutOI: number;
}

export interface BreakoutConfig {
  // Volume thresholds
  volumeMultiplier: number; // 2x-3x for volume breakout
  highVolumeMultiplier: number; // 5x for key level spikes
  
  // OI thresholds
  oiChangeThreshold: number; // % change in OI
  oiImbalanceRatio: number; // Call/Put OI ratio threshold
  
  // VWAP thresholds
  vwapDistanceThreshold: number; // Distance from VWAP for breakout
  vwapConsolidationMinutes: number; // Min consolidation time
  
  // IV thresholds
  ivDropThreshold: number; // % drop in IV for crush detection
  ivStabilityThreshold: number; // Max IV change for stability
  
  // Max Pain thresholds
  maxPainShiftThreshold: number; // Strike difference for significant shift
  
  // Key level detection
  roundNumberLevels: number[]; // Round numbers to watch
  levelProximityThreshold: number; // Distance to consider "at level"
  
  // Time windows
  firstHourMinutes: number; // First hour duration
  lookbackPeriods: number; // Periods to look back for analysis
  
  // Confidence scoring
  minConfidenceThreshold: number; // Minimum confidence to trigger signal
}

export interface BreakoutAnalysisResult {
  signals: BreakoutSignal[];
  summary: {
    totalSignals: number;
    bullishSignals: number;
    bearishSignals: number;
    strongSignals: number;
    highPrioritySignals: number;
    overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidenceScore: number;
  };
  marketState: {
    currentTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    volatilityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    volumeProfile: 'HIGH' | 'NORMAL' | 'LOW';
    keyLevels: {
      support: number | null;
      resistance: number | null;
      vwap: number | null;
      maxPain: number | null;
    };
  };
  lastAnalyzed: string;
}

export interface HistoricalBreakoutData {
  timestamp: string;
  signals: BreakoutSignal[];
  marketData: MarketDataPoint;
}
