import axios from 'axios';
import logger from '@/utils/logger';
import dotenv from 'dotenv';

dotenv.config();

export interface StockSymbol {
  symbol: string;
  company: string;
  exchange: string;
}

export interface StockData {
  price: number;
  change: number;
  changePercent: string;
  volume: number;
  marketCap?: number;
  dayHigh: number;
  dayLow: number;
  currency: string;
  exchange: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface SentimentData {
  overall: string;
  score: number;
  sources: {
    twitter: string;
    reddit: string;
    news: string;
  };
  confidence: number;
}

export interface StockSummary {
  overview: string;
  keyPoints: string[];
  newsHighlights: string[];
  riskLevel: string;
  recommendation: string;
}

export interface StockResearchResult {
  symbol: string;
  company: string;
  timestamp: string;
  data: StockData | null;
  news: NewsItem[];
  sentiment: SentimentData | null;
  summary: StockSummary;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export class StockResearchService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async researchStock(query: string): Promise<StockResearchResult> {
    try {
      logger.info(`Researching stock: ${query}`);
      
      // 1. Resolve stock symbol
      const symbol = await this.resolveStockSymbol(query);
      if (!symbol) {
        throw new Error('Stock not found');
      }

      // 2. Fetch data from multiple sources in parallel
      const [stockDataResult, newsDataResult, sentimentDataResult] = await Promise.allSettled([
        this.fetchStockData(symbol),
        this.fetchRecentNews(symbol),
        this.fetchSentimentData(symbol)
      ]);

      // 3. Process results
      const result: StockResearchResult = {
        symbol: symbol.symbol,
        company: symbol.company,
        timestamp: new Date().toISOString(),
        data: stockDataResult.status === 'fulfilled' ? stockDataResult.value : null,
        news: newsDataResult.status === 'fulfilled' ? newsDataResult.value : [],
        sentiment: sentimentDataResult.status === 'fulfilled' ? sentimentDataResult.value : null,
        summary: {
          overview: '',
          keyPoints: [],
          newsHighlights: [],
          riskLevel: 'Unknown',
          recommendation: 'N/A'
        }
      };

      // 4. Generate summary
      result.summary = await this.generateSummary(result);

      logger.info(`Research completed for ${symbol.symbol}`);
      return result;

    } catch (error) {
      logger.error('Stock research error:', error);
      throw error;
    }
  }

  private async resolveStockSymbol(query: string): Promise<StockSymbol | null> {
    try {
      const cacheKey = `symbol_${query.toLowerCase()}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const quotes = response.data?.quotes || [];
      
      // Prefer Indian stocks (.NS, .BO)
      let stock = quotes.find((q: any) => q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'));
      if (!stock) {
        stock = quotes[0];
      }

      if (!stock) {
        return null;
      }

      const result: StockSymbol = {
        symbol: stock.symbol,
        company: stock.longname || stock.shortname || stock.symbol,
        exchange: stock.exchDisp || 'NSE'
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      logger.error('Error resolving stock symbol:', error);
      return null;
    }
  }

  private async fetchStockData(symbol: StockSymbol): Promise<StockData> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.symbol}`;
      const response = await axios.get(url, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const chart = response.data?.chart?.result?.[0];
      if (!chart) {
        throw new Error('No stock data found');
      }

      const meta = chart.meta;
      const quote = chart.indicators?.quote?.[0];
      const latest = quote ? {
        open: quote.open[quote.open.length - 1],
        high: quote.high[quote.high.length - 1],
        low: quote.low[quote.low.length - 1],
        close: quote.close[quote.close.length - 1],
        volume: quote.volume[quote.volume.length - 1]
      } : {};

      return {
        price: meta.regularMarketPrice || latest.close,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
        volume: latest.volume || 0,
        marketCap: meta.marketCap,
        dayHigh: latest.high || meta.regularMarketDayHigh,
        dayLow: latest.low || meta.regularMarketDayLow,
        currency: meta.currency || 'INR',
        exchange: meta.exchangeName || symbol.exchange
      };

    } catch (error) {
      logger.error('Error fetching stock data:', error);
      throw error;
    }
  }

  private async fetchRecentNews(symbol: StockSymbol): Promise<NewsItem[]> {
    try {
      const news: NewsItem[] = [];
      
      // 1. Yahoo Finance News (most relevant)
      try {
        const yahooNews = await this.fetchYahooFinanceNews(symbol);
        news.push(...yahooNews);
      } catch (error) {
        logger.warn('Yahoo Finance news failed:', error);
      }

      // 2. NewsAPI (if API key available)
      if (process.env['NEWS_API_KEY']) {
        try {
          const newsApiResults = await this.fetchNewsAPI(symbol);
          news.push(...newsApiResults);
        } catch (error) {
          logger.warn('NewsAPI failed:', error);
        }
      }

      // 3. Financial Modeling Prep (if API key available)
      if (process.env['FMP_API_KEY']) {
        try {
          const fmpNews = await this.fetchFMPNews(symbol);
          news.push(...fmpNews);
        } catch (error) {
          logger.warn('FMP news failed, likely invalid API key. Skipping FMP for future requests.');
          // Disable FMP for this session to avoid repeated 403 errors
          delete process.env['FMP_API_KEY'];
        }
      }

      // Remove duplicates and sort by date
      const uniqueNews = this.deduplicateNews(news);
      return uniqueNews.slice(0, 8); // Return top 8 most recent

    } catch (error) {
      logger.error('Error fetching news:', error);
      return [];
    }
  }

  private async fetchYahooFinanceNews(symbol: StockSymbol): Promise<NewsItem[]> {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol.symbol}&newsCount=15`;
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const news = response.data?.news || [];
    
    return news
      .filter((item: any) => item.title && item.link && item.providerPublishTime)
      .map((item: any) => ({
        title: item.title,
        summary: item.summary || '',
        url: item.link,
        source: item.publisher || 'Yahoo Finance',
        publishedAt: new Date(item.providerPublishTime * 1000).toISOString(),
        relevanceScore: this.calculateRelevanceScore(item.title, symbol)
      }))
      .filter((item: NewsItem & { relevanceScore: number }) => item.relevanceScore > 0.3)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
  }

  private async fetchNewsAPI(symbol: StockSymbol): Promise<NewsItem[]> {
    const companyName = symbol.company.replace(/Limited|Ltd|Inc|Corp/gi, '').trim();
    const query = `"${companyName}" OR "${symbol.symbol.replace('.NS', '').replace('.BO', '')}"`;
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10`;
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'X-API-Key': process.env['NEWS_API_KEY'] }
    });

    const articles = response.data?.articles || [];
    
    return articles
      .filter((article: any) => article.title && article.url && article.publishedAt)
      .map((article: any) => ({
        title: article.title,
        summary: article.description || '',
        url: article.url,
        source: article.source?.name || 'NewsAPI',
        publishedAt: article.publishedAt,
        relevanceScore: this.calculateRelevanceScore(article.title + ' ' + (article.description || ''), symbol)
      }))
      .filter((item: NewsItem & { relevanceScore: number }) => item.relevanceScore > 0.4);
  }

  private async fetchFMPNews(symbol: StockSymbol): Promise<NewsItem[]> {
    try {
      // Skip FMP if API key is not properly configured
      if (!process.env['FMP_API_KEY'] || process.env['FMP_API_KEY'].length < 10) {
        logger.warn('FMP API key not configured properly, skipping FMP news');
        return [];
      }

      const stockSymbol = symbol.symbol.replace('.NS', '').replace('.BO', '');
      
      // Try different FMP endpoints as they have multiple news APIs
      const endpoints = [
        `https://financialmodelingprep.com/api/v4/general_news?page=0&apikey=${process.env['FMP_API_KEY']}`,
        `https://financialmodelingprep.com/api/v3/stock_news?tickers=${stockSymbol}&limit=10&apikey=${process.env['FMP_API_KEY']}`
      ];

      for (const url of endpoints) {
        try {
          logger.info(`Trying FMP endpoint: ${url.split('?')[0]}`);
          
          const response = await axios.get(url, {
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          const news = response.data || [];
          
          if (Array.isArray(news) && news.length > 0) {
            logger.info(`FMP returned ${news.length} articles`);
            
            return news
              .filter((item: any) => item.title && (item.url || item.link))
              .slice(0, 10)
              .map((item: any) => ({
                title: item.title,
                summary: item.text?.substring(0, 200) || item.summary || '',
                url: item.url || item.link,
                source: item.site || item.source || 'Financial Modeling Prep',
                publishedAt: item.publishedDate || item.date || new Date().toISOString(),
                relevanceScore: this.calculateRelevanceScore(item.title + ' ' + (item.text || item.summary || ''), symbol)
              }))
              .filter((item: NewsItem & { relevanceScore: number }) => item.relevanceScore > 0.2);
          }
        } catch (endpointError: any) {
          logger.warn(`FMP endpoint failed: ${endpointError.response?.status} ${endpointError.message}`);
          continue;
        }
      }

      logger.warn('All FMP endpoints failed');
      return [];
      
    } catch (error) {
      logger.error('Error fetching FMP news:', error);
      return [];
    }
  }

  private calculateRelevanceScore(text: string, symbol: StockSymbol): number {
    const lowerText = text.toLowerCase();
    const companyName = symbol.company.toLowerCase();
    const stockSymbol = symbol.symbol.replace('.NS', '').replace('.BO', '').toLowerCase();
    
    let score = 0;
    
    // Exact company name match
    if (lowerText.includes(companyName)) score += 1.0;
    
    // Stock symbol match
    if (lowerText.includes(stockSymbol)) score += 0.8;
    
    // Company name parts
    const nameParts = companyName.split(' ').filter(part => part.length > 3);
    nameParts.forEach(part => {
      if (lowerText.includes(part)) score += 0.3;
    });
    
    // Financial keywords
    const financialKeywords = ['earnings', 'revenue', 'profit', 'loss', 'quarterly', 'results', 'stock', 'shares', 'dividend', 'merger', 'acquisition'];
    financialKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) score += 0.2;
    });
    
    // Negative keywords (reduce relevance)
    const negativeKeywords = ['cricket', 'bollywood', 'politics', 'weather', 'sports'];
    negativeKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) score -= 0.5;
    });
    
    return Math.max(0, Math.min(1, score));
  }

  private deduplicateNews(news: (NewsItem & { relevanceScore?: number })[]): NewsItem[] {
    const seen = new Set<string>();
    const unique: NewsItem[] = [];
    
    // Sort by relevance score first, then by date
    news.sort((a, b) => {
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    
    for (const item of news) {
      const titleKey = item.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (!seen.has(titleKey) && titleKey.length > 10) {
        seen.add(titleKey);
        // Remove relevanceScore from final result
        const { relevanceScore, ...cleanItem } = item as any;
        unique.push(cleanItem);
      }
    }
    
    return unique;
  }

  private async fetchSentimentData(symbol: StockSymbol): Promise<SentimentData | null> {
    try {
      const sentiments: any[] = [];
      
      // 1. News sentiment analysis
      const newsSentiment = await this.analyzeNewsSentiment(symbol);
      if (newsSentiment) sentiments.push({ source: 'news', ...newsSentiment });
      
      // 2. Twitter sentiment (if API available)
      if (process.env['TWITTER_BEARER_TOKEN']) {
        const twitterSentiment = await this.analyzeTwitterSentiment(symbol);
        if (twitterSentiment) sentiments.push({ source: 'twitter', ...twitterSentiment });
      }
      
      // 3. Reddit sentiment (if API available)
      if (process.env['REDDIT_CLIENT_ID']) {
        const redditSentiment = await this.analyzeRedditSentiment(symbol);
        if (redditSentiment) sentiments.push({ source: 'reddit', ...redditSentiment });
      }
      
      if (sentiments.length === 0) {
        return {
          overall: 'neutral',
          score: 0.5,
          sources: { twitter: 'neutral', reddit: 'neutral', news: 'neutral' },
          confidence: 0.3
        };
      }
      
      // Aggregate sentiments
      const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
      const overall = avgScore > 0.6 ? 'bullish' : avgScore < 0.4 ? 'bearish' : 'neutral';
      
      const sources = {
        twitter: sentiments.find(s => s.source === 'twitter')?.sentiment || 'neutral',
        reddit: sentiments.find(s => s.source === 'reddit')?.sentiment || 'neutral',
        news: sentiments.find(s => s.source === 'news')?.sentiment || 'neutral'
      };
      
      return {
        overall,
        score: avgScore,
        sources,
        confidence: Math.min(0.9, sentiments.length * 0.3)
      };
      
    } catch (error) {
      logger.error('Error fetching sentiment:', error);
      return null;
    }
  }

  private async analyzeNewsSentiment(symbol: StockSymbol): Promise<{ sentiment: string; score: number } | null> {
    try {
      // Get recent news for sentiment analysis
      const news = await this.fetchYahooFinanceNews(symbol);
      if (news.length === 0) return null;
      
      let totalScore = 0;
      let count = 0;
      
      for (const item of news.slice(0, 5)) {
        const sentiment = this.analyzeSentimentFromText(item.title + ' ' + item.summary);
        totalScore += sentiment;
        count++;
      }
      
      const avgScore = totalScore / count;
      const sentiment = avgScore > 0.6 ? 'bullish' : avgScore < 0.4 ? 'bearish' : 'neutral';
      
      return { sentiment, score: avgScore };
      
    } catch (error) {
      logger.error('Error analyzing news sentiment:', error);
      return null;
    }
  }

  private async analyzeTwitterSentiment(symbol: StockSymbol): Promise<{ sentiment: string; score: number } | null> {
    try {
      if (!process.env['TWITTER_BEARER_TOKEN'] || process.env['TWITTER_BEARER_TOKEN'].length < 10) {
        logger.warn('Twitter Bearer Token not configured properly, skipping Twitter sentiment');
        return null;
      }

      const rateLimitKey = 'twitter_rate_limit';
      const lastCall = this.cache.get(rateLimitKey);
      if (lastCall && Date.now() - lastCall.timestamp < 15 * 60 * 1000) {
        logger.warn('Twitter rate limit cooldown active, skipping Twitter sentiment');
        return null;
      }

      const stockSymbol = symbol.symbol.replace('.NS', '').replace('.BO', '');
      const companyName = symbol.company.replace(/Limited|Ltd|Inc|Corp/gi, '').trim();
      
      // Build targeted queries for financial discussions
      const queries = [
        `${stockSymbol} (stock OR price OR target OR buy OR sell OR analysis) lang:en -is:retweet`,
        `"${companyName}" (bullish OR bearish OR earnings OR results) lang:en -is:retweet`,
        `#${stockSymbol} (breakout OR support OR resistance) lang:en -is:retweet`
      ];
      
      let allTweets: any[] = [];
      
      for (const query of queries) {
        try {
          logger.info(`Twitter query: ${query.substring(0, 50)}...`);

          const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
            params: {
              query,
              max_results: 5,
              'tweet.fields': 'created_at,public_metrics'
            },
            headers: {
              'Authorization': `Bearer ${process.env['TWITTER_BEARER_TOKEN']}`,
              'User-Agent': 'StockResearch/1.0'
            },
            timeout: 10000
          });
          
          const tweets = response.data?.data || [];
          const relevantTweets = tweets.filter((tweet: any) => 
            this.isFinanciallyRelevantTweet(tweet.text, stockSymbol, companyName)
          );
          
          allTweets.push(...relevantTweets);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit protection
          
        } catch (queryError: any) {
          logger.warn(`Twitter query failed: ${queryError.message}`);
          continue;
        }
      }
      
      if (allTweets.length === 0) {
        logger.info('No relevant financial tweets found');
        return null;
      }
      
      // Remove duplicates and calculate weighted sentiment
      const uniqueTweets = this.deduplicateAndRankTweets(allTweets);
      
      let totalScore = 0;
      let totalWeight = 0;
      
      for (const tweet of uniqueTweets.slice(0, 15)) {
        const sentiment = this.analyzeSentimentFromText(tweet.text);
        const weight = this.calculateTweetWeight(tweet);
        totalScore += sentiment * weight;
        totalWeight += weight;
      }
      
      const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0.5;
      const sentiment = avgScore > 0.6 ? 'bullish' : avgScore < 0.4 ? 'bearish' : 'neutral';
      
      logger.info(`Twitter sentiment: ${sentiment} (${avgScore.toFixed(2)}) from ${uniqueTweets.length} tweets`);
      return { sentiment, score: avgScore };
      
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('Twitter rate limit hit, setting cooldown');
        // Set rate limit cooldown
        this.cache.set('twitter_rate_limit', {
          data: true,
          timestamp: Date.now()
        });
      } else if (error.response?.status === 401) {
        logger.error('Twitter API authentication failed - check Bearer Token');
      } else {
        logger.error('Error analyzing Twitter sentiment:', error.message);
      }
      return null;
    }
  }

  private async analyzeRedditSentiment(symbol: StockSymbol): Promise<{ sentiment: string; score: number } | null> {
    try {
      const stockSymbol = symbol.symbol.replace('.NS', '').replace('.BO', '');
      const subreddits = ['IndiaInvestments', 'investing', 'stocks', 'SecurityAnalysis'];
      
      let allPosts: any[] = [];
      
      for (const subreddit of subreddits) {
        try {
          const response = await axios.get(`https://www.reddit.com/r/${subreddit}/search.json`, {
            params: {
              q: stockSymbol,
              sort: 'new',
              limit: 10,
              t: 'week'
            },
            headers: {
              'User-Agent': 'StockResearch/1.0'
            },
            timeout: 8000
          });
          
          const posts = response.data?.data?.children || [];
          allPosts.push(...posts);
        } catch (error) {
          logger.warn(`Error fetching from r/${subreddit}:`, error);
        }
      }
      
      if (allPosts.length === 0) return null;
      
      let totalScore = 0;
      let count = 0;
      
      for (const post of allPosts.slice(0, 15)) {
        const text = post.data.title + ' ' + (post.data.selftext || '');
        const sentiment = this.analyzeSentimentFromText(text);
        totalScore += sentiment;
        count++;
      }
      
      const avgScore = totalScore / count;
      const sentiment = avgScore > 0.6 ? 'bullish' : avgScore < 0.4 ? 'bearish' : 'neutral';
      
      return { sentiment, score: avgScore };
      
    } catch (error) {
      logger.error('Error analyzing Reddit sentiment:', error);
      return null;
    }
  }

  private analyzeSentimentFromText(text: string): number {
    const lowerText = text.toLowerCase();
    
    // Positive keywords
    const positiveWords = [
      'bullish', 'buy', 'strong', 'growth', 'profit', 'gain', 'up', 'rise', 'increase',
      'good', 'great', 'excellent', 'positive', 'optimistic', 'outperform', 'beat',
      'revenue growth', 'earnings beat', 'dividend', 'expansion', 'partnership'
    ];
    
    // Negative keywords
    const negativeWords = [
      'bearish', 'sell', 'weak', 'loss', 'decline', 'down', 'fall', 'decrease',
      'bad', 'poor', 'negative', 'pessimistic', 'underperform', 'miss',
      'revenue decline', 'earnings miss', 'layoffs', 'bankruptcy', 'scandal'
    ];
    
    let score = 0.5; // Neutral baseline
    
    positiveWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      score += matches * 0.1;
    });
    
    negativeWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      score -= matches * 0.1;
    });
    
    return Math.max(0, Math.min(1, score));
  }

  private async generateSummary(data: StockResearchResult): Promise<StockSummary> {
    try {
      const { symbol, company, data: stockData, news } = data;
      
      const priceDirection = stockData?.change && stockData.change > 0 ? 'up' : 
                           stockData?.change && stockData.change < 0 ? 'down' : 'flat';
      const newsCount = news?.length || 0;
      
      return {
        overview: `${company} (${symbol}) is trading ${priceDirection} at ₹${stockData?.price?.toFixed(2) || 'N/A'} with ${newsCount} recent news items.`,
        keyPoints: [
          `Current Price: ₹${stockData?.price?.toFixed(2) || 'N/A'}`,
          `Change: ${stockData?.changePercent || 'N/A'}%`,
          `Volume: ${this.formatNumber(stockData?.volume || 0)}`,
          `Market Cap: ${this.formatNumber(stockData?.marketCap || 0)}`
        ],
        newsHighlights: news?.slice(0, 3).map(n => n.title) || [],
        riskLevel: 'Medium',
        recommendation: 'Hold'
      };

    } catch (error) {
      logger.error('Error generating summary:', error);
      return {
        overview: 'Unable to generate summary',
        keyPoints: [],
        newsHighlights: [],
        riskLevel: 'Unknown',
        recommendation: 'N/A'
      };
    }
  }

  private formatNumber(num: number): string {
    if (!num) return '0';
    
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    
    return num.toString();
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Stock research cache cleared');
  }

  private isFinanciallyRelevantTweet(text: string, stockSymbol: string, companyName: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerSymbol = stockSymbol.toLowerCase();
    const lowerCompany = companyName.toLowerCase();
    
    // Must contain stock symbol or company name
    const hasStockReference = lowerText.includes(lowerSymbol) || lowerText.includes(lowerCompany);
    if (!hasStockReference) return false;
    
    // Must contain financial keywords
    const financialKeywords = [
      'stock', 'share', 'price', 'target', 'buy', 'sell', 'hold',
      'bullish', 'bearish', 'earnings', 'revenue', 'profit', 'loss',
      'analysis', 'forecast', 'recommendation', 'upgrade', 'downgrade',
      'breakout', 'support', 'resistance', 'chart', 'technical',
      'fundamental', 'valuation', 'pe ratio', 'dividend', 'results',
      'rally', 'dip', 'surge', 'crash', 'moon', 'dump'
    ];
    
    const hasFinancialContext = financialKeywords.some(keyword => 
      lowerText.includes(keyword)
    );
    
    // Exclude customer service, job postings, general company news
    const excludeKeywords = [
      'hiring', 'job', 'career', 'customer service', 'support ticket',
      'complaint', 'refund', 'delivery', 'order', 'product launch',
      'congratulations', 'birthday', 'anniversary'
    ];
    
    const hasExcludedContent = excludeKeywords.some(keyword => 
      lowerText.includes(keyword)
    );
    
    return hasFinancialContext && !hasExcludedContent;
  }

  private deduplicateAndRankTweets(tweets: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];
    
    // Sort by engagement metrics first
    tweets.sort((a, b) => {
      const engagementA = (a.public_metrics?.like_count || 0) + (a.public_metrics?.retweet_count || 0);
      const engagementB = (b.public_metrics?.like_count || 0) + (b.public_metrics?.retweet_count || 0);
      return engagementB - engagementA;
    });
    
    for (const tweet of tweets) {
      const tweetKey = tweet.text.toLowerCase().replace(/[^\w\s]/g, '').trim().substring(0, 50);
      if (!seen.has(tweetKey) && tweetKey.length > 20) {
        seen.add(tweetKey);
        unique.push(tweet);
      }
    }
    
    return unique;
  }

  private calculateTweetWeight(tweet: any): number {
    let weight = 1.0;
    
    // Higher weight for tweets with more engagement
    const likes = tweet.public_metrics?.like_count || 0;
    const retweets = tweet.public_metrics?.retweet_count || 0;
    const engagement = likes + (retweets * 2); // Retweets are more valuable
    
    if (engagement > 50) weight += 0.5;
    else if (engagement > 10) weight += 0.3;
    else if (engagement > 5) weight += 0.1;
    
    return Math.min(weight, 2.0); // Cap at 2x weight
  }
}
