# NSE Option Chain Tracker

A real-time NIFTY option chain tracker with historical data storage and periodic background data fetching.

## 🚀 Features

- **Real-time Data**: Fetches NIFTY option chain data every 30 seconds during market hours
- **Market Aware**: Automatically starts/stops based on trading hours (9:30 AM - 3:30 PM IST)
- **Historical Storage**: Saves data to Excel files for analysis
- **Fast API**: Serves data from memory for instant responses
- **Monitoring**: Built-in health checks and status endpoints
- **Web Interface**: Clean UI for viewing option chain data

## 📊 API Endpoints

- `GET /api/health` - Health check and system status
- `GET /api/nifty-data` - Current NIFTY option chain data
- `GET /api/historical-data` - Historical data with filtering
- `POST /api/fetch-data` - Manual data fetch trigger
- `POST /api/control-fetch` - Control periodic fetch process

## 🔧 Environment Variables

- `KITE_API_KEY` - Your Kite Connect API Key
- `KITE_API_SECRET` - Your Kite Connect API Secret
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 3000)

## 🚀 Deployment

This app is configured for easy deployment on:
- Heroku (recommended)
- Railway
- Render
- AWS (EC2, App Runner, ECS)
- Google Cloud (Cloud Run, App Engine, Compute Engine)

## 📈 Usage

1. Set up your Kite Connect API credentials
2. Deploy to your preferred platform
3. Access the web interface or use API endpoints
4. Monitor real-time option chain data during market hours

## 🔐 Security

- Environment variables for sensitive data
- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization

## 📊 Market Hours

- **Trading Hours**: 9:30 AM - 3:30 PM IST
- **Trading Days**: Monday - Friday
- **Auto-fetch**: Only during market hours
- **Data Persistence**: Historical data saved to Excel files

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Data Source**: Kite Connect API
- **Storage**: Excel files (node-xlsx)
- **Frontend**: Vanilla JavaScript, Chart.js
- **Deployment**: Docker, Heroku, Railway, Cloud platforms

---

Built for tracking NIFTY option chains with real-time data and historical analysis.
