import type {
  StockSymbol,
  StockData,
  NewsItem,
  SentimentData,
  StockSummary,
  StockResearchResult
} from '@/services/StockResearchService';

export interface StockSearchSuggestion {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface StockResearchRequest {
  query: string;
}

export interface StockSearchRequest {
  q: string;
}

export interface StockResearchResponse {
  success: boolean;
  query: string;
  data: StockResearchResult;
  timestamp: string;
}

export interface StockSearchResponse {
  success: boolean;
  query: string;
  suggestions: StockSearchSuggestion[];
}

export interface StockResearchErrorResponse {
  success: false;
  error: string;
  query: string;
}

// Re-export for convenience
export type {
  StockSymbol,
  StockData,
  NewsItem,
  SentimentData,
  StockSummary,
  StockResearchResult
};
