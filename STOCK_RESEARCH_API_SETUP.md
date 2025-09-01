# Stock Research API Setup Guide

## Overview
The stock research feature works with multiple data sources for comprehensive analysis. While the basic functionality works without API keys, adding these APIs will significantly improve news relevance and sentiment analysis.

## API Sources & Setup

### 🆓 **Free Tier APIs (Recommended)**

#### 1. **NewsAPI** (Free: 1000 requests/day)
- **Website**: https://newsapi.org/
- **Setup**:
  1. Sign up for free account
  2. Get API key from dashboard
  3. Add to `.env`: `NEWS_API_KEY=your_key_here`
- **Benefits**: High-quality financial news with better relevance

#### 2. **Financial Modeling Prep** (Free: 250 requests/day)
- **Website**: https://financialmodelingprep.com/
- **Setup**:
  1. Create free account
  2. Get API key from dashboard
  3. Add to `.env`: `FMP_API_KEY=your_key_here`
- **Benefits**: Stock-specific news and financial data

#### 3. **Twitter API v2** (Free tier available)
- **Website**: https://developer.twitter.com/
- **Setup**:
  1. Apply for developer account
  2. Create app and get Bearer Token
  3. Add to `.env`: `TWITTER_BEARER_TOKEN=your_token_here`
- **Benefits**: Real-time social sentiment analysis

#### 4. **Reddit API** (Free)
- **Website**: https://www.reddit.com/prefs/apps
- **Setup**:
  1. Create Reddit app
  2. Get client ID and secret
  3. Add to `.env`: 
     ```
     REDDIT_CLIENT_ID=your_client_id
     REDDIT_CLIENT_SECRET=your_client_secret
     ```
- **Benefits**: Community sentiment from investment subreddits

## 🚀 **Quick Start (No API Keys)**

The stock research feature works immediately without any API keys:
- ✅ **Stock Data**: Real-time prices from Yahoo Finance
- ✅ **Basic News**: Yahoo Finance news (limited relevance)
- ✅ **Basic Sentiment**: Simple keyword-based analysis

## 📈 **Enhanced Setup (With API Keys)**

Add API keys to your `.env` file for enhanced features:

```bash
# Copy example file
cp .env.example .env

# Edit with your API keys
nano .env
```

### **Feature Comparison**

| Feature | Without APIs | With APIs |
|---------|-------------|-----------|
| Stock Data | ✅ Full | ✅ Full |
| News Quality | ⚠️ Basic | ✅ High Quality |
| News Relevance | ⚠️ Limited | ✅ Highly Relevant |
| Sentiment Analysis | ⚠️ Basic | ✅ Multi-source |
| Social Media | ❌ None | ✅ Twitter + Reddit |
| Daily Requests | ∞ Unlimited | 1000+ per day |

## 🔧 **API Key Priority**

If you can only set up a few APIs, prioritize in this order:

1. **NewsAPI** - Biggest improvement in news quality
2. **Financial Modeling Prep** - Stock-specific financial news
3. **Twitter API** - Real-time sentiment
4. **Reddit API** - Community insights

## 🧪 **Testing Your Setup**

Test the enhanced features:

```bash
# Build and start
npm run build
npm start

# Test stock research
curl -X POST http://localhost:3000/api/stock-research \
  -H "Content-Type: application/json" \
  -d '{"query": "Reliance Industries"}'
```

## 📊 **Expected Improvements**

With API keys configured, you'll see:

### **Better News Quality**
- More relevant headlines
- Recent financial news
- Company-specific articles
- Reduced noise and irrelevant content

### **Enhanced Sentiment Analysis**
- Multi-source sentiment scoring
- Social media sentiment
- News sentiment analysis
- Confidence scoring

### **Improved Accuracy**
- Relevance scoring for news articles
- Duplicate removal
- Source attribution
- Fresher content

## 🔒 **Security Notes**

- Keep API keys secure in `.env` file
- Never commit API keys to version control
- Use environment variables in production
- Monitor API usage to avoid rate limits

## 💡 **Cost Optimization**

- All recommended APIs have generous free tiers
- Implement caching to reduce API calls
- Use rate limiting to stay within limits
- Monitor usage through API dashboards

---

**Ready to enhance your stock research experience!** 🚀
