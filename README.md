# NSE Option Chain Tracker

A real-time NIFTY option chain tracker with historical data storage and periodic background data fetching.

## 🚀 Features

- **Real-time Data**: Fetches NIFTY option chain data every 30 seconds during market hours
- **Market Aware**: Automatically starts/stops based on trading hours (9:30 AM - 3:30 PM IST)
- **Persistent Storage**: Google Sheets integration for data that survives deployments
- **Historical Storage**: Saves data to Google Sheets and Excel files for analysis
- **Fast API**: Serves data from memory for instant responses
- **Monitoring**: Built-in health checks and status endpoints
- **Web Interface**: Clean UI for viewing option chain data

## 📊 API Endpoints

### Core Endpoints
- `GET /api/health` - Health check and system status
- `GET /api/nifty-data` - Current NIFTY option chain data
- `GET /api/historical-data` - Historical data with filtering
- `POST /api/fetch-data` - Manual data fetch trigger
- `POST /api/control-fetch` - Control periodic fetch process

### Google Sheets Endpoints
- `GET /api/sheets-status` - Google Sheets connection status
- `GET /api/sheets-historical-data` - Historical data from Google Sheets
- `GET /api/sheets-daily-summary` - Daily summary statistics

## 🔧 Environment Variables

### Required
- `KITE_API_KEY` - Your Kite Connect API Key
- `KITE_API_SECRET` - Your Kite Connect API Secret

### Optional
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 3000)

### Google Sheets (Optional - Excel fallback available)
- `GOOGLE_SHEET_ID` - Your Google Sheet ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key

## 💾 Data Storage

The app uses a **dual storage approach** for maximum reliability:

1. **Primary**: Google Sheets (persistent across deployments, cloud-based)
2. **Fallback**: Excel files (local storage, automatic backup)

**How it works:**
- Data is **always saved to Google Sheets first** (if configured)
- **Excel files serve as automatic backup** in case Google Sheets fails
- If Google Sheets is not configured, Excel becomes the primary storage
- **No data loss** - at least one storage method will always work

## 🚀 Deployment

This app is configured for easy deployment on:
- Heroku (recommended)
- Railway
- Render
- AWS (EC2, App Runner, ECS)
- Google Cloud (Cloud Run, App Engine, Compute Engine)

### Quick Heroku Setup

1. **Deploy the app**:
   ```bash
   git clone <your-repo>
   cd nse_tracking
   heroku create your-app-name
   git push heroku main
   ```

2. **Set required environment variables**:
   ```bash
   heroku config:set KITE_API_KEY=your_api_key
   heroku config:set KITE_API_SECRET=your_api_secret
   ```

3. **Optional: Set up Google Sheets** (see [Google Sheets Setup Guide](GOOGLE_SHEETS_SETUP.md)):
   ```bash
   heroku config:set GOOGLE_SHEET_ID=your_sheet_id
   heroku config:set GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
   heroku config:set GOOGLE_PRIVATE_KEY="your_private_key"
   ```

## 📈 Usage

1. Set up your Kite Connect API credentials
2. Deploy to your preferred platform
3. (Optional) Configure Google Sheets for persistent storage
4. Access the web interface or use API endpoints
5. Monitor real-time option chain data during market hours

## 🔐 Security

- Environment variables for sensitive data
- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization

## 📊 Market Hours

- **Trading Hours**: 9:30 AM - 3:30 PM IST
- **Trading Days**: Monday - Friday
- **Auto-fetch**: Only during market hours
- **Data Persistence**: Historical data saved to Google Sheets and Excel files

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Data Source**: Kite Connect API
- **Storage**: Google Sheets API, Excel files (node-xlsx)
- **Frontend**: Vanilla JavaScript, Chart.js
- **Deployment**: Docker, Heroku, Railway, Cloud platforms

## 📚 Documentation

- [Google Sheets Setup Guide](GOOGLE_SHEETS_SETUP.md) - Complete setup instructions
- [Heroku Deployment Guide](HEROKU_DEPLOYMENT.md) - Heroku-specific deployment steps
- [API Documentation](API_DOCS.md) - Detailed API reference

---

Built for tracking NIFTY option chains with real-time data and historical analysis. Now with persistent Google Sheets storage! 🚀
