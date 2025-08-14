// Core types for the NSE Option Chain Tracker

export interface KiteInstrument {
  instrument_token: number;
  exchange_token: number;
  tradingsymbol: string;
  name: string;
  last_price: number;
  expiry: string;
  strike: number;
  tick_size: number;
  lot_size: number;
  instrument_type: 'CE' | 'PE' | 'FUT';
  segment: string;
  exchange: string;
}

export interface KiteQuote {
  last_price: number;
  volume: number;
  oi: number;
  net_change: number;
  change: number;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

export interface OptionData {
  instrument_token: number;
  tradingsymbol: string;
  exchange: string;
  strike: number;
  expiry: string;
  instrument_type: 'CE' | 'PE';
  lot_size: number;
  last_price: number;
  volume: number;
  oi: number;
  change: number;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  iv: number;
}

export interface NiftyOptionChainData {
  spot_price: number;
  atm_strike: number;
  expiry: string;
  timestamp: string;
  options: Record<number, {
    CE: OptionData | null;
    PE: OptionData | null;
  }>;
}

export interface HistoricalDataRow {
  timestamp: string;
  date: string;
  time: string;
  spot_price: number;
  atm_strike: number;
  expiry: string;
  call_oi: number;
  call_volume: number;
  call_ltp: number;
  call_change: number;
  call_iv: number;
  put_oi: number;
  put_volume: number;
  put_ltp: number;
  put_change: number;
  put_iv: number;
  pcr_volume: number;
  pcr_oi: number;
  total_call_oi: number;
  total_put_oi: number;
}

export interface ChartData {
  timestamps: string[];
  dates: string[];
  times: string[];
  spotPrices: number[];
  atmStrikes: number[];
  expiry: string;
  // ATM-3 Strike
  atmM3Calls: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  atmM3Puts: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  // ATM-2 Strike
  atmM2Calls: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  atmM2Puts: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  // ATM-1 Strike
  atmM1Calls: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  atmM1Puts: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  // ATM Strike (current)
  calls: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  puts: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  // ATM+1 Strike
  atmP1Calls: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  atmP1Puts: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  // ATM+2 Strike
  atmP2Calls: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  atmP2Puts: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  // ATM+3 Strike
  atmP3Calls: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  atmP3Puts: {
    oi: number[];
    volume: number[];
    ltp: number[];
    change: number[];
    iv: number[];
  };
  ratios: {
    pcr_volume: number[];
    pcr_oi: number[];
  };
  totals: {
    call_oi: number[];
    put_oi: number[];
  };
}

export interface HistoricalDataResponse {
  success: boolean;
  data?: ChartData;
  message?: string;
  totalRecords?: number;
  filteredRecords?: number;
  timeframe?: string;
  limit?: string | number;
}

export interface MarketAnalysis {
  trend: {
    direction: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    strength: number;
    confidence: number;
  };
  volatility: {
    current: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  levels: {
    support: number | null;
    resistance: number | null;
    current: number;
  };
  pcr: PCRAnalysis;
  volume: VolumeAnalysis;
  recommendation: Recommendation;
  lastUpdated: string;
}

export interface PCRAnalysis {
  current: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  interpretation: string;
}

export interface VolumeAnalysis {
  call_volume: number;
  put_volume: number;
  total_volume: number;
  call_ratio: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface Recommendation {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

export interface Signal {
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  indicator: string;
  message: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  value: number;
}

export interface SignalSummary {
  total: number;
  bullish: number;
  bearish: number;
  neutral: number;
  strong: number;
  high_priority: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface GoogleSheetsConfig {
  sheetId: string;
  serviceAccountEmail: string;
  privateKey: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  kite: {
    apiKey: string;
    apiSecret: string;
  };
  googleSheets?: GoogleSheetsConfig;
  dataDir: string;
  historyFile: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
  kite_initialized: boolean;
  api_key: string;
  historical_data: {
    available: boolean;
    records: number;
    file_size?: string;
    oldest_record?: string;
    latest_record?: string;
  };
  google_sheets: {
    available: boolean;
    error?: string;
  };
  storage: {
    primary: string;
    fallback: string;
    excel_file_exists: boolean;
  };
  periodic_fetch: {
    status: string;
    interval: string;
    last_data_timestamp: string | null;
    market_open: boolean;
  };
}

export interface ExpiryAnalysis {
  instruments: KiteInstrument[];
  strikes: Set<number>;
  ce_count: number;
  pe_count: number;
}

export interface HistoricalDataFilters {
  timeframe?: '1h' | '4h' | '1d' | '7d' | '30d';
  limit?: number;
  date?: string;
  strikePrice?: number;
}

export interface DataStorageResult {
  savedToGoogleSheets: boolean;
  savedToExcel: boolean;
  success: boolean;
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

// Utility types
export type TimeFrame = '1h' | '4h' | '1d' | '7d' | '30d' | 'all';
export type ExportFormat = 'json' | 'csv' | 'xlsx';
export type FetchAction = 'start' | 'stop' | 'status';
export type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'POST_MARKET';
