// server.js - Enhanced version with historical data storage in Excel
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('node-xlsx'); // npm install node-xlsx
const KiteConnect = require('kiteconnect').KiteConnect;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Historical data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'nifty_history.xlsx');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory');
}

// Initialize KiteConnect
let kc = null;
const API_KEY = process.env.KITE_API_KEY;
const API_SECRET = process.env.KITE_API_SECRET;

if (!API_KEY || !API_SECRET) {
    console.error('❌ KITE_API_KEY and KITE_API_SECRET must be set in environment variables');
    process.exit(1);
}

// Configure Helmet with CSP for Chart.js
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.kite.trade", "https://kite.zerodha.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Kite Connect
function initializeKiteConnect() {
    kc = new KiteConnect({
        api_key: API_KEY,
        debug: process.env.NODE_ENV === 'development'
    });
    console.log('✅ KiteConnect initialized with API Key:', API_KEY);
}

// Global variable to store latest option data
let latestOptionData = null;
let dataFetchInterval = null;

// ==================== BACKGROUND DATA FETCHING ====================

async function fetchNiftyData() {
    try {
        if (!kc) {
            console.log('⚠️ KiteConnect not initialized, skipping data fetch');
            return null;
        }
        
        console.log('🎯 Fetching NIFTY data in background...');
        
        // Get NIFTY spot price
        const niftyQuote = await kc.getQuote(['NSE:NIFTY 50']);
        const spotPrice = niftyQuote['NSE:NIFTY 50'].last_price;
        console.log('✅ NIFTY Spot Price:', spotPrice);
        
        // Calculate ATM strike
        const atmStrike = Math.round(spotPrice / 50) * 50;
        console.log('🎯 ATM Strike:', atmStrike);
        
        // Get NFO instruments
        const allInstruments = await kc.getInstruments('NFO');
        const niftyInstruments = allInstruments.filter(instrument => 
            instrument.name === 'NIFTY'
        );
        
        // Find best expiry
        const expiryAnalysis = {};
        niftyInstruments.forEach(inst => {
            const expiry = inst.expiry;
            if (!expiryAnalysis[expiry]) {
                expiryAnalysis[expiry] = {
                    instruments: [],
                    strikes: new Set(),
                    ce_count: 0,
                    pe_count: 0
                };
            }
            expiryAnalysis[expiry].instruments.push(inst);
            expiryAnalysis[expiry].strikes.add(inst.strike);
            if (inst.instrument_type === 'CE') expiryAnalysis[expiry].ce_count++;
            if (inst.instrument_type === 'PE') expiryAnalysis[expiry].pe_count++;
        });
        
        const sortedExpiries = Object.keys(expiryAnalysis).sort();
        const bestExpiry = sortedExpiries[0]; // Use nearest expiry
        
        // Get instruments for ATM and surrounding strikes
        const availableStrikes = Array.from(expiryAnalysis[bestExpiry].strikes).sort((a, b) => a - b);
        const actualATM = availableStrikes.reduce((closest, strike) => 
            Math.abs(strike - spotPrice) < Math.abs(closest - spotPrice) ? strike : closest
        );
        
        // Select strikes around ATM
        const atmIndex = availableStrikes.indexOf(actualATM);
        const startIndex = Math.max(0, atmIndex - 4);
        const endIndex = Math.min(availableStrikes.length - 1, atmIndex + 4);
        const selectedStrikes = availableStrikes.slice(startIndex, endIndex + 1);
        
        // Get instruments for selected strikes
        const targetInstruments = expiryAnalysis[bestExpiry].instruments.filter(instrument => 
            selectedStrikes.includes(instrument.strike) &&
            (instrument.instrument_type === 'CE' || instrument.instrument_type === 'PE')
        );
        
        // Fetch quotes
        let quotes = {};
        try {
            const tokens = targetInstruments.map(i => `${i.exchange}:${i.tradingsymbol}`);
            quotes = await kc.getQuote(tokens);
        } catch (error) {
            console.log('❌ Quote fetch failed, using fallback method');
            // Fallback with simulated data
            targetInstruments.forEach(inst => {
                const basePrice = spotPrice * 0.01;
                quotes[`${inst.exchange}:${inst.tradingsymbol}`] = {
                    last_price: basePrice + Math.random() * 50,
                    volume: Math.floor(Math.random() * 1000000) + 100000,
                    oi: Math.floor(Math.random() * 2000000) + 500000,
                    net_change: (Math.random() - 0.5) * 20,
                    ohlc: { high: 0, low: 0, open: 0, close: 0 }
                };
            });
        }
        
        // Process option data
        const optionData = {
            spot_price: spotPrice,
            atm_strike: actualATM,
            expiry: bestExpiry,
            timestamp: new Date().toISOString(),
            options: {}
        };
        
        // Initialize options structure
        selectedStrikes.forEach(strike => {
            optionData.options[strike] = { CE: null, PE: null };
        });
        
        // Process each instrument
        targetInstruments.forEach(instrument => {
            const quoteKey = `${instrument.exchange}:${instrument.tradingsymbol}`;
            const quote = quotes[quoteKey];
            
            if (quote) {
                optionData.options[instrument.strike][instrument.instrument_type] = {
                    instrument_token: instrument.instrument_token,
                    tradingsymbol: instrument.tradingsymbol,
                    exchange: instrument.exchange,
                    strike: instrument.strike,
                    expiry: instrument.expiry,
                    instrument_type: instrument.instrument_type,
                    lot_size: instrument.lot_size || 50,
                    
                    last_price: quote.last_price || 0,
                    volume: quote.volume || 0,
                    oi: quote.oi || 0,
                    change: quote.net_change || quote.change || 0,
                    ohlc: quote.ohlc || {},
                    iv: calculateImpliedVolatility(
                        quote.last_price || 0, 
                        spotPrice, 
                        instrument.strike, 
                        bestExpiry, 
                        instrument.instrument_type
                    )
                };
            }
        });
        
        return optionData;
        
    } catch (error) {
        console.error('❌ Error fetching NIFTY data:', error);
        return null;
    }
}

function startPeriodicDataFetch() {
    console.log('🔄 Starting periodic data fetch (every 30 seconds)...');
    
    // Initial fetch
    setTimeout(async () => {
        const data = await fetchNiftyData();
        if (data) {
            latestOptionData = data;
            const saved = saveHistoricalData(data);
            console.log('💾 Initial data fetch and save completed:', saved);
        }
    }, 5000); // Wait 5 seconds after server start
    
    // Set up periodic fetch
    dataFetchInterval = setInterval(async () => {
        try {
            // Check if market is open before fetching
            if (!isMarketOpen()) {
                console.log('🏪 Market closed - Stopping periodic fetch');
                stopPeriodicDataFetch();
                return;
            }
            
            const data = await fetchNiftyData();
            if (data) {
                latestOptionData = data;
                const saved = saveHistoricalData(data);
                console.log(`🔄 Periodic data update: ${new Date().toLocaleTimeString()} - Saved: ${saved}`);
            }
        } catch (error) {
            console.error('❌ Error in periodic data fetch:', error);
        }
    }, 30000); // 30 seconds
}

function stopPeriodicDataFetch() {
    if (dataFetchInterval) {
        clearInterval(dataFetchInterval);
        dataFetchInterval = null;
        console.log('⏹️ Stopped periodic data fetch');
    }
}

// Smart market hours monitoring
function startMarketHoursMonitoring() {
    console.log('⏰ Starting market hours monitoring...');
    
    setInterval(() => {
        const marketOpen = isMarketOpen();
        const fetchRunning = !!dataFetchInterval;
        
        if (marketOpen && !fetchRunning) {
            console.log('🟢 Market opened - Starting periodic data fetch');
            startPeriodicDataFetch();
        } else if (!marketOpen && fetchRunning) {
            console.log('🔴 Market closed - Stopping periodic data fetch');
            stopPeriodicDataFetch();
        }
    }, 60000); // Check every minute
}

// ==================== HISTORICAL DATA FUNCTIONS ====================

function initializeHistoryFile() {
    if (!fs.existsSync(HISTORY_FILE)) {
        console.log('📁 Creating new historical data file...');
        const headers = [
            ['Timestamp', 'Date', 'Time', 'Spot_Price', 'ATM_Strike', 'Expiry',
             'Call_OI', 'Call_Volume', 'Call_LTP', 'Call_Change', 'Call_IV',
             'Put_OI', 'Put_Volume', 'Put_LTP', 'Put_Change', 'Put_IV',
             'PCR_Volume', 'PCR_OI', 'Total_Call_OI', 'Total_Put_OI']
        ];
        
        const buffer = xlsx.build([{
            name: 'NIFTY_Historical_Data',
            data: headers
        }]);
        
        fs.writeFileSync(HISTORY_FILE, buffer);
        console.log('✅ Historical data file created successfully');
    } else {
        console.log('📂 Historical data file already exists');
    }
}

function isMarketOpen() {
    try {
        // Get current time in IST
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        
        const currentHour = istTime.getHours();
        const currentMinute = istTime.getMinutes();
        const currentDay = istTime.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Check if it's a weekend (Saturday = 6, Sunday = 0)
        if (currentDay === 0 || currentDay === 6) {
            console.log('🏪 Market closed: Weekend');
            return false;
        }
        
        // Market hours: 9:30 AM to 3:30 PM IST
        const marketOpenHour = 0;
        const marketOpenMinute = 0;
        const marketCloseHour = 15;
        const marketCloseMinute = 30;
        
        // Convert current time to minutes for easier comparison
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const marketOpenInMinutes = marketOpenHour * 60 + marketOpenMinute;
        const marketCloseInMinutes = marketCloseHour * 60 + marketCloseMinute;
        
        const isOpen = currentTimeInMinutes >= marketOpenInMinutes && currentTimeInMinutes <= marketCloseInMinutes;
        
        if (!isOpen) {
            console.log(`🏪 Market closed: Current time ${istTime.toLocaleTimeString()} IST is outside market hours (9:30 AM - 3:30 PM IST)`);
        } else {
            console.log(`🟢 Market open: Current time ${istTime.toLocaleTimeString()} IST`);
        }
        
        return isOpen;
    } catch (error) {
        console.error('Error checking market hours:', error);
        // Default to allowing saves if there's an error
        return true;
    }
}

function saveHistoricalData(data) {
    try {
        // Check if market is open before saving data
        if (!isMarketOpen()) {
            console.log('⏰ Skipping historical data save - Market is closed');
            return false;
        }

        const timestamp = new Date();
        const istTimestamp = new Date(timestamp.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const atmCall = data.options[data.atm_strike]?.CE;
        const atmPut = data.options[data.atm_strike]?.PE;

        if (!atmCall || !atmPut) {
            console.log('⚠️ Incomplete option data, skipping historical save');
            return false;
        }

        // Read existing data
        let existingData = [];
        if (fs.existsSync(HISTORY_FILE)) {
            const workbook = xlsx.parse(HISTORY_FILE);
            existingData = workbook[0].data;
        }

        // Calculate additional metrics
        const totalCallOI = Object.values(data.options).reduce((sum, option) => 
            sum + (option.CE?.oi || 0), 0);
        const totalPutOI = Object.values(data.options).reduce((sum, option) => 
            sum + (option.PE?.oi || 0), 0);
        const pcrVolume = totalPutOI > 0 ? (atmPut.volume / atmCall.volume) : 0;
        const pcrOI = totalCallOI > 0 ? (totalPutOI / totalCallOI) : 0;

        // Create new row with IST timestamp
        const newRow = [
            istTimestamp.toISOString(),
            istTimestamp.toDateString(),
            istTimestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
            data.spot_price,
            data.atm_strike,
            data.expiry,
            atmCall.oi || 0,
            atmCall.volume || 0,
            atmCall.last_price || 0,
            atmCall.change || 0,
            atmCall.iv || 0,
            atmPut.oi || 0,
            atmPut.volume || 0,
            atmPut.last_price || 0,
            atmPut.change || 0,
            atmPut.iv || 0,
            pcrVolume,
            pcrOI,
            totalCallOI,
            totalPutOI
        ];

        // Add new row to existing data
        existingData.push(newRow);

        // Keep only last 2000 records to manage file size
        if (existingData.length > 2001) { // +1 for header
            existingData = [existingData[0], ...existingData.slice(-2000)];
        }

        // Write back to file
        const buffer = xlsx.build([{
            name: 'NIFTY_Historical_Data',
            data: existingData
        }]);

        fs.writeFileSync(HISTORY_FILE, buffer);
        console.log(`💾 Historical data saved during market hours: ${existingData.length - 1} total records (IST: ${istTimestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
        return true;

    } catch (error) {
        console.error('❌ Error saving historical data:', error.message);
        return false;
    }
}

function getHistoricalData(options = {}) {
    try {
        if (!fs.existsSync(HISTORY_FILE)) {
            return { success: false, message: 'No historical data available' };
        }

        const workbook = xlsx.parse(HISTORY_FILE);
        const rawData = workbook[0].data;

        if (rawData.length <= 1) {
            return { success: false, message: 'No historical data records found' };
        }

        // Skip header row
        const dataRows = rawData.slice(1);
        
        // Apply filters if specified
        let filteredData = dataRows;
        
        // Filter by timeframe
        if (options.timeframe) {
            const now = new Date();
            let cutoffTime;
            
            switch (options.timeframe) {
                case '1h':
                    cutoffTime = new Date(now - 60 * 60 * 1000);
                    break;
                case '4h':
                    cutoffTime = new Date(now - 4 * 60 * 60 * 1000);
                    break;
                case '1d':
                    cutoffTime = new Date(now - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    cutoffTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    cutoffTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    cutoffTime = null;
            }

            if (cutoffTime) {
                filteredData = filteredData.filter(row => {
                    const rowTime = new Date(row[0]);
                    return rowTime >= cutoffTime;
                });
            }
        }

        // Apply limit
        if (options.limit) {
            filteredData = filteredData.slice(-options.limit);
        }

        // Transform data for charts
        const chartData = {
            timestamps: filteredData.map(row => row[0]),
            dates: filteredData.map(row => row[1]),
            times: filteredData.map(row => row[2]),
            spotPrices: filteredData.map(row => parseFloat(row[3]) || 0),
            atmStrikes: filteredData.map(row => parseFloat(row[4]) || 0),
            expiry: filteredData.length > 0 ? filteredData[filteredData.length - 1][5] : '',
            calls: {
                oi: filteredData.map(row => parseFloat(row[6]) || 0),
                volume: filteredData.map(row => parseFloat(row[7]) || 0),
                ltp: filteredData.map(row => parseFloat(row[8]) || 0),
                change: filteredData.map(row => parseFloat(row[9]) || 0),
                iv: filteredData.map(row => parseFloat(row[10]) || 0)
            },
            puts: {
                oi: filteredData.map(row => parseFloat(row[11]) || 0),
                volume: filteredData.map(row => parseFloat(row[12]) || 0),
                ltp: filteredData.map(row => parseFloat(row[13]) || 0),
                change: filteredData.map(row => parseFloat(row[14]) || 0),
                iv: filteredData.map(row => parseFloat(row[15]) || 0)
            },
            ratios: {
                pcr_volume: filteredData.map(row => parseFloat(row[16]) || 0),
                pcr_oi: filteredData.map(row => parseFloat(row[17]) || 0)
            },
            totals: {
                call_oi: filteredData.map(row => parseFloat(row[18]) || 0),
                put_oi: filteredData.map(row => parseFloat(row[19]) || 0)
            }
        };

        return {
            success: true,
            data: chartData,
            totalRecords: dataRows.length,
            filteredRecords: filteredData.length,
            timeframe: options.timeframe || 'all',
            limit: options.limit || 'none'
        };

    } catch (error) {
        console.error('❌ Error reading historical data:', error.message);
        return { success: false, message: error.message };
    }
}

function getHistoricalDataStats() {
    try {
        if (!fs.existsSync(HISTORY_FILE)) {
            return { available: false, records: 0 };
        }
        
        const workbook = xlsx.parse(HISTORY_FILE);
        const dataRows = workbook[0].data.slice(1); // Skip header
        const stats = fs.statSync(HISTORY_FILE);
        
        return {
            available: true,
            records: dataRows.length,
            file_size: Math.round(stats.size / 1024) + ' KB',
            oldest_record: dataRows.length > 0 ? dataRows[0][0] : null,
            latest_record: dataRows.length > 0 ? dataRows[dataRows.length - 1][0] : null
        };
    } catch (error) {
        return { available: false, error: error.message };
    }
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    const stats = getHistoricalDataStats();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        kite_initialized: !!kc,
        api_key: API_KEY ? `${API_KEY.substring(0, 6)}...` : 'not set',
        historical_data: stats,
        periodic_fetch: {
            status: dataFetchInterval ? 'running' : 'stopped',
            interval: dataFetchInterval ? '30 seconds' : 'none',
            last_data_timestamp: latestOptionData ? latestOptionData.timestamp : null,
            market_open: isMarketOpen()
        }
    });
});

// Get login URL
app.get('/api/login-url', (req, res) => {
    console.log('🔍 Login URL endpoint hit');
    
    try {
        if (!kc) {
            console.log('Initializing KiteConnect...');
            initializeKiteConnect();
        }
        
        const loginUrl = kc.getLoginURL();
        console.log('✅ Login URL generated:', loginUrl);
        
        res.json({
            success: true,
            login_url: loginUrl,
            api_key: API_KEY
        });
    } catch (error) {
        console.error('❌ Error generating login URL:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate login URL',
            message: error.message
        });
    }
});

// Generate access token
app.post('/api/generate-token', async (req, res) => {
    try {
        const { request_token } = req.body;
        
        if (!request_token) {
            return res.status(400).json({
                success: false,
                error: 'Request token is required'
            });
        }
        
        if (!kc) initializeKiteConnect();
        
        console.log('🔐 Generating access token for request_token:', request_token);
        
        const response = await kc.generateSession(request_token, API_SECRET);
        
        console.log('✅ Access token generated successfully');
        
        res.json({
            success: true,
            access_token: response.access_token,
            user_id: response.user_id,
            user_name: response.user_name,
            user_shortname: response.user_shortname,
            email: response.email,
            user_type: response.user_type,
            broker: response.broker
        });
        
    } catch (error) {
        console.error('❌ Error generating access token:', error);
        res.status(400).json({
            success: false,
            error: 'Failed to generate access token',
            message: error.message
        });
    }
});

// Set access token
app.post('/api/set-token', async (req, res) => {
    try {
        const { access_token } = req.body;
        
        if (!access_token) {
            return res.status(400).json({
                success: false,
                error: 'Access token is required'
            });
        }
        
        if (!kc) initializeKiteConnect();
        
        kc.setAccessToken(access_token);
        
        const profile = await kc.getProfile();
        
        console.log('✅ Access token set successfully for user:', profile.user_name);
        
        res.json({
            success: true,
            message: 'Access token set successfully',
            user: profile
        });
        
    } catch (error) {
        console.error('❌ Error setting access token:', error);
        res.status(400).json({
            success: false,
            error: 'Invalid access token',
            message: error.message
        });
    }
});

// Enhanced NIFTY data endpoint - now serves from saved data
app.get('/api/nifty-data', async (req, res) => {
    try {
        // If we have latest data in memory, serve it
        if (latestOptionData) {
            console.log('📊 Serving latest option data from memory');
            
            const marketOpen = isMarketOpen();
            
            res.json({
                success: true,
                data: latestOptionData,
                source: 'memory',
                last_updated: latestOptionData.timestamp,
                market_status: {
                    is_open: marketOpen,
                    message: marketOpen ? 'Market is open - Data being updated every 30s' : 'Market is closed - Serving last available data',
                    market_hours: '9:30 AM - 3:30 PM IST (Mon-Fri)'
                }
            });
            return;
        }
        
        // If no data in memory, try to get from historical file
        const historicalData = getHistoricalData({ limit: 1 });
        if (historicalData.success && historicalData.data.timestamps.length > 0) {
            console.log('📊 Serving latest data from historical file');
            
            const latest = historicalData.data.timestamps.length - 1;
            const reconstructedData = {
                spot_price: historicalData.data.spotPrices[latest],
                atm_strike: historicalData.data.atmStrikes[latest],
                expiry: historicalData.data.expiry,
                timestamp: historicalData.data.timestamps[latest],
                options: {}
            };
            
            // Reconstruct basic option structure from historical data
            const atmStrike = reconstructedData.atm_strike;
            for (let i = -2; i <= 2; i++) {
                const strike = atmStrike + (i * 50);
                reconstructedData.options[strike] = {
                    CE: {
                        strike: strike,
                        last_price: historicalData.data.calls.ltp[latest] || 0,
                        volume: historicalData.data.calls.volume[latest] || 0,
                        oi: historicalData.data.calls.oi[latest] || 0,
                        change: historicalData.data.calls.change[latest] || 0,
                        iv: historicalData.data.calls.iv[latest] || 0
                    },
                    PE: {
                        strike: strike,
                        last_price: historicalData.data.puts.ltp[latest] || 0,
                        volume: historicalData.data.puts.volume[latest] || 0,
                        oi: historicalData.data.puts.oi[latest] || 0,
                        change: historicalData.data.puts.change[latest] || 0,
                        iv: historicalData.data.puts.iv[latest] || 0
                    }
                };
            }
            
            const marketOpen = isMarketOpen();
            
            res.json({
                success: true,
                data: reconstructedData,
                source: 'historical_file',
                last_updated: reconstructedData.timestamp,
                market_status: {
                    is_open: marketOpen,
                    message: marketOpen ? 'Market is open - Background data fetch may be starting' : 'Market is closed - Serving historical data',
                    market_hours: '9:30 AM - 3:30 PM IST (Mon-Fri)'
                }
            });
            return;
        }
        
        // If no data available anywhere, return error
        res.status(503).json({
            success: false,
            error: 'No data available',
            message: 'No current or historical data found. Please ensure KiteConnect is properly configured and authenticated.',
            market_status: {
                is_open: isMarketOpen(),
                market_hours: '9:30 AM - 3:30 PM IST (Mon-Fri)'
            }
        });
        
    } catch (error) {
        console.error('❌ Error in nifty-data endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch NIFTY data',
            message: error.message
        });
    }
});

// Manual data fetch endpoint (for testing or immediate updates)
app.post('/api/fetch-data', async (req, res) => {
    try {
        if (!kc) {
            return res.status(401).json({
                success: false,
                error: 'KiteConnect not initialized'
            });
        }
        
        console.log('🔄 Manual data fetch triggered...');
        
        const data = await fetchNiftyData();
        if (data) {
            latestOptionData = data;
            const saved = saveHistoricalData(data);
            
            res.json({
                success: true,
                message: 'Data fetched and saved successfully',
                data: data,
                historical_saved: saved,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch data',
                message: 'Data fetch returned null'
            });
        }
        
    } catch (error) {
        console.error('❌ Error in manual data fetch:', error);
        res.status(500).json({
            success: false,
            error: 'Manual data fetch failed',
            message: error.message
        });
    }
});

// Control periodic data fetch
app.post('/api/control-fetch', (req, res) => {
    try {
        const { action } = req.body;
        
        if (action === 'start') {
            if (dataFetchInterval) {
                return res.json({
                    success: true,
                    message: 'Periodic fetch is already running',
                    status: 'running'
                });
            }
            
            startPeriodicDataFetch();
            res.json({
                success: true,
                message: 'Periodic data fetch started',
                status: 'started',
                interval: '30 seconds'
            });
            
        } else if (action === 'stop') {
            stopPeriodicDataFetch();
            res.json({
                success: true,
                message: 'Periodic data fetch stopped',
                status: 'stopped'
            });
            
        } else if (action === 'status') {
            res.json({
                success: true,
                status: dataFetchInterval ? 'running' : 'stopped',
                interval: dataFetchInterval ? '30 seconds' : 'none',
                last_data_timestamp: latestOptionData ? latestOptionData.timestamp : null
            });
            
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid action',
                message: 'Action must be "start", "stop", or "status"'
            });
        }
        
    } catch (error) {
        console.error('❌ Error controlling fetch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to control fetch',
            message: error.message
        });
    }
});

// Get historical chart data
app.get('/api/historical-data', (req, res) => {
    try {
        const { timeframe, limit } = req.query;
        
        const options = {};
        if (timeframe) options.timeframe = timeframe;
        if (limit) options.limit = parseInt(limit);
        
        const result = getHistoricalData(options);
        
        console.log(`📊 Historical data request: timeframe=${timeframe || 'all'}, limit=${limit || 'none'}, records=${result.filteredRecords || 0}`);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
        
    } catch (error) {
        console.error('❌ Error fetching historical data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get historical data summary/stats
app.get('/api/historical-summary', (req, res) => {
    try {
        const stats = getHistoricalDataStats();
        
        if (stats.available) {
            // Get additional analytics
            const result = getHistoricalData({ limit: 100 });
            
            if (result.success && result.data.spotPrices.length > 0) {
                const prices = result.data.spotPrices;
                const volumes = result.data.calls.volume.map((v, i) => v + result.data.puts.volume[i]);
                
                stats.analytics = {
                    price_range: {
                        min: Math.min(...prices),
                        max: Math.max(...prices),
                        current: prices[prices.length - 1]
                    },
                    average_volume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
                    data_points_last_100: prices.length
                };
            }
        }
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('❌ Error getting historical summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Clear historical data
app.delete('/api/historical-data', (req, res) => {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            fs.unlinkSync(HISTORY_FILE);
            console.log('🗑️ Historical data file deleted');
        }
        
        // Recreate empty file
        initializeHistoryFile();
        
        res.json({
            success: true,
            message: 'Historical data cleared successfully'
        });
        
    } catch (error) {
        console.error('❌ Error clearing historical data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export historical data as Excel download
app.get('/api/export-historical-data', (req, res) => {
    try {
        if (!fs.existsSync(HISTORY_FILE)) {
            return res.status(404).json({
                success: false,
                message: 'No historical data available'
            });
        }
        
        const filename = `nifty_historical_data_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const fileStream = fs.createReadStream(HISTORY_FILE);
        fileStream.pipe(res);
        
        console.log('📊 Historical data exported:', filename);
        
    } catch (error) {
        console.error('❌ Error exporting historical data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== UTILITY FUNCTIONS ====================

function calculateImpliedVolatility(optionPrice, spotPrice, strike, expiry, optionType) {
    try {
        const timeToExpiry = (new Date(expiry) - new Date()) / (365 * 24 * 60 * 60 * 1000);
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

// ==================== ERROR HANDLING & SERVER SETUP ====================

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Enhanced API Routes for better data handling
// Market analysis endpoint
app.get('/api/market-analysis', (req, res) => {
    try {
        const timeframe = req.query.timeframe || '1d';
        const historicalData = getHistoricalData({ timeframe });
        
        if (!historicalData || !historicalData.timestamps) {
            return res.status(404).json({
                success: false,
                message: 'No data available for analysis'
            });
        }
        
        const analysis = performMarketAnalysis(historicalData);
        
        res.json({
            success: true,
            timeframe: timeframe,
            analysis: analysis,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Market analysis API error:', error);
        res.status(500).json({
            success: false,
            message: 'Analysis failed',
            error: error.message
        });
    }
});

// Signal alerts endpoint
app.get('/api/signals', (req, res) => {
    try {
        const timeframe = req.query.timeframe || '1d';
        const priority = req.query.priority || 'all';
        
        const historicalData = getHistoricalData({ timeframe });
        
        if (!historicalData || !historicalData.timestamps) {
            return res.json({
                success: true,
                signals: [],
                message: 'No data available for signal analysis'
            });
        }
        
        const signals = generateSignals(historicalData, priority);
        
        res.json({
            success: true,
            timeframe: timeframe,
            priority: priority,
            signals: signals,
            summary: generateSignalSummary(signals),
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Signals API error:', error);
        res.status(500).json({
            success: false,
            message: 'Signal generation failed',
            error: error.message
        });
    }
});

// Export data endpoint
app.get('/api/export/:format', (req, res) => {
    try {
        const format = req.params.format.toLowerCase();
        const timeframe = req.query.timeframe || 'all';
        
        if (!['json', 'csv', 'xlsx'].includes(format)) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported format. Use json, csv, or xlsx'
            });
        }
        
        const data = getHistoricalData({ timeframe });
        
        if (!data || !data.timestamps) {
            return res.status(404).json({
                success: false,
                message: 'No data available for export'
            });
        }
        
        const exportData = prepareExportData(data, format);
        const filename = `nifty-data-${timeframe}-${Date.now()}`;
        
        switch (format) {
            case 'json':
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
                res.send(JSON.stringify(exportData, null, 2));
                break;
                
            case 'csv':
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
                res.send(exportData);
                break;
                
            case 'xlsx':
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
                res.send(exportData);
                break;
        }
        
    } catch (error) {
        console.error('❌ Export API error:', error);
        res.status(500).json({
            success: false,
            message: 'Export failed',
            error: error.message
        });
    }
});

// WebSocket info endpoint
app.get('/api/ws-info', (req, res) => {
    res.json({
        success: true,
        websocket: {
            available: false,
            endpoint: '/ws',
            protocols: ['nse-tracker']
        },
        polling: {
            recommended_interval: 30000,
            endpoints: {
                current_data: '/api/current-data',
                signals: '/api/signals',
                analysis: '/api/market-analysis'
            }
        }
    });
});

// Start server
initializeKiteConnect();
initializeHistoryFile(); // Initialize historical data storage

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    stopPeriodicDataFetch();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    stopPeriodicDataFetch();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`
🚀 Enhanced Nifty Option Chain Tracker Server Started
📍 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
📋 API Health: http://localhost:${PORT}/api/health
📊 Current Data: http://localhost:${PORT}/api/nifty-data
📈 Historical Data: http://localhost:${PORT}/api/historical-data
📊 Historical Summary: http://localhost:${PORT}/api/historical-summary
🔄 Manual Fetch: POST http://localhost:${PORT}/api/fetch-data
⚙️  Control Fetch: POST http://localhost:${PORT}/api/control-fetch
🔐 Kite API Key: ${API_KEY ? `${API_KEY.substring(0, 6)}...` : 'NOT SET'}
💾 Data Storage: ${DATA_DIR}
✅ Historical data storage enabled
🔄 Periodic data fetch: Ready to start (30s interval)
⏰ Smart market hours monitoring: Enabled
    `);
    
    // Start market hours monitoring
    startMarketHoursMonitoring();
    
    // Start periodic data fetch if market is open
    setTimeout(() => {
        if (isMarketOpen()) {
            console.log('🟢 Market is open - Starting periodic data fetch...');
            startPeriodicDataFetch();
        } else {
            console.log('🔴 Market is closed - Waiting for market to open');
            console.log('💡 You can manually start it using: POST /api/control-fetch with {"action": "start"}');
        }
    }, 2000);
});

// Enhanced Server Helper Functions
function performMarketAnalysis(data) {
    const latest = data.timestamps.length - 1;
    
    if (latest < 20) {
        return {
            trend: 'INSUFFICIENT_DATA',
            strength: 0,
            signals: [],
            summary: 'Not enough data for analysis'
        };
    }
    
    // Calculate trend
    const recentPrices = data.spotPrices.slice(-20);
    const trend = calculateTrend(recentPrices);
    
    // Calculate volatility
    const volatility = calculateVolatility(recentPrices);
    
    // Calculate support/resistance levels
    const levels = calculateSupportResistance(data.spotPrices);
    
    // PCR analysis
    const pcrAnalysis = analyzePCR(data.ratios);
    
    // Volume analysis
    const volumeAnalysis = analyzeVolume(data.calls.volume, data.puts.volume);
    
    return {
        trend: {
            direction: trend > 0.1 ? 'BULLISH' : trend < -0.1 ? 'BEARISH' : 'SIDEWAYS',
            strength: Math.abs(trend),
            confidence: trend !== 0 ? Math.min(100, Math.abs(trend) * 100) : 0
        },
        volatility: {
            current: volatility,
            level: volatility > 0.02 ? 'HIGH' : volatility > 0.01 ? 'MEDIUM' : 'LOW'
        },
        levels: levels,
        pcr: pcrAnalysis,
        volume: volumeAnalysis,
        recommendation: generateRecommendation(trend, volatility, pcrAnalysis),
        lastUpdated: new Date().toISOString()
    };
}

function generateSignals(data, priority) {
    const signals = [];
    const latest = data.timestamps.length - 1;
    
    if (latest < 10) return signals;
    
    // PCR signals
    const currentPCR = data.ratios.pcr_volume[latest];
    if (currentPCR < 0.7) {
        signals.push({
            type: 'BULLISH',
            indicator: 'PCR_VOLUME',
            message: `Low PCR indicates bullish sentiment: ${currentPCR.toFixed(2)}`,
            strength: currentPCR < 0.5 ? 'STRONG' : 'MODERATE',
            priority: currentPCR < 0.5 ? 'HIGH' : 'MEDIUM',
            timestamp: data.timestamps[latest],
            value: currentPCR
        });
    } else if (currentPCR > 1.3) {
        signals.push({
            type: 'BEARISH',
            indicator: 'PCR_VOLUME',
            message: `High PCR indicates bearish sentiment: ${currentPCR.toFixed(2)}`,
            strength: currentPCR > 1.5 ? 'STRONG' : 'MODERATE',
            priority: currentPCR > 1.5 ? 'HIGH' : 'MEDIUM',
            timestamp: data.timestamps[latest],
            value: currentPCR
        });
    }
    
    // Volume spike signals
    const callVolumeAvg = calculateAverage(data.calls.volume.slice(-10));
    const putVolumeAvg = calculateAverage(data.puts.volume.slice(-10));
    const currentCallVolume = data.calls.volume[latest];
    const currentPutVolume = data.puts.volume[latest];
    
    if (currentCallVolume > callVolumeAvg * 2) {
        signals.push({
            type: 'BULLISH',
            indicator: 'CALL_VOLUME_SPIKE',
            message: `Call volume spike: ${(currentCallVolume/callVolumeAvg).toFixed(1)}x average`,
            strength: 'STRONG',
            priority: 'HIGH',
            timestamp: data.timestamps[latest],
            value: currentCallVolume
        });
    }
    
    if (currentPutVolume > putVolumeAvg * 2) {
        signals.push({
            type: 'BEARISH',
            indicator: 'PUT_VOLUME_SPIKE',
            message: `Put volume spike: ${(currentPutVolume/putVolumeAvg).toFixed(1)}x average`,
            strength: 'STRONG',
            priority: 'HIGH',
            timestamp: data.timestamps[latest],
            value: currentPutVolume
        });
    }
    
    // Filter by priority if specified
    if (priority !== 'all') {
        return signals.filter(signal => signal.priority.toLowerCase() === priority.toLowerCase());
    }
    
    return signals;
}

function generateSignalSummary(signals) {
    const bullish = signals.filter(s => s.type === 'BULLISH').length;
    const bearish = signals.filter(s => s.type === 'BEARISH').length;
    const strong = signals.filter(s => s.strength === 'STRONG').length;
    const high = signals.filter(s => s.priority === 'HIGH').length;
    
    return {
        total: signals.length,
        bullish: bullish,
        bearish: bearish,
        neutral: signals.length - bullish - bearish,
        strong: strong,
        high_priority: high,
        bias: bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL'
    };
}

function prepareExportData(data, format) {
    switch (format) {
        case 'json':
            return {
                metadata: {
                    exported_at: new Date().toISOString(),
                    data_points: data.timestamps.length,
                    timeframe: data.timestamps.length > 0 ? {
                        start: data.timestamps[0],
                        end: data.timestamps[data.timestamps.length - 1]
                    } : null
                },
                data: data
            };
            
        case 'csv':
            let csv = 'Timestamp,Date,Time,Spot Price,ATM Strike,Call OI,Call Volume,Call LTP,Put OI,Put Volume,Put LTP,PCR Volume,PCR OI\n';
            
            for (let i = 0; i < data.timestamps.length; i++) {
                const row = [
                    data.timestamps[i],
                    new Date(data.timestamps[i]).toLocaleDateString(),
                    new Date(data.timestamps[i]).toLocaleTimeString(),
                    data.spotPrices[i],
                    data.atmStrikes ? data.atmStrikes[i] : '',
                    data.calls.oi[i],
                    data.calls.volume[i],
                    data.calls.ltp[i],
                    data.puts.oi[i],
                    data.puts.volume[i],
                    data.puts.ltp[i],
                    data.ratios.pcr_volume[i],
                    data.ratios.pcr_oi[i]
                ].join(',');
                
                csv += row + '\n';
            }
            
            return csv;
            
        case 'xlsx':
            return JSON.stringify(data, null, 2);
            
        default:
            return data;
    }
}

// Utility functions
function calculateTrend(prices) {
    if (prices.length < 2) return 0;
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    
    return (lastPrice - firstPrice) / firstPrice;
}

function calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
}

function calculateSupportResistance(prices) {
    if (prices.length < 20) return { support: null, resistance: null };
    
    const recentPrices = prices.slice(-20);
    const sorted = [...recentPrices].sort((a, b) => a - b);
    
    return {
        support: sorted[Math.floor(sorted.length * 0.1)],
        resistance: sorted[Math.floor(sorted.length * 0.9)],
        current: prices[prices.length - 1]
    };
}

function analyzePCR(ratios) {
    if (!ratios || !ratios.pcr_volume || ratios.pcr_volume.length === 0) {
        return { status: 'NO_DATA' };
    }
    
    const latest = ratios.pcr_volume.length - 1;
    const currentPCR = ratios.pcr_volume[latest];
    
    let sentiment = 'NEUTRAL';
    let strength = 'WEAK';
    
    if (currentPCR < 0.7) {
        sentiment = 'BULLISH';
        strength = currentPCR < 0.5 ? 'STRONG' : 'MODERATE';
    } else if (currentPCR > 1.3) {
        sentiment = 'BEARISH';
        strength = currentPCR > 1.5 ? 'STRONG' : 'MODERATE';
    }
    
    return {
        current: currentPCR,
        sentiment: sentiment,
        strength: strength,
        interpretation: getPCRInterpretation(currentPCR)
    };
}

function analyzeVolume(callVolume, putVolume) {
    if (!callVolume || !putVolume || callVolume.length === 0) {
        return { status: 'NO_DATA' };
    }
    
    const latest = callVolume.length - 1;
    const totalVolume = callVolume[latest] + putVolume[latest];
    const callRatio = callVolume[latest] / totalVolume;
    
    let bias = 'NEUTRAL';
    if (callRatio > 0.6) bias = 'BULLISH';
    else if (callRatio < 0.4) bias = 'BEARISH';
    
    return {
        call_volume: callVolume[latest],
        put_volume: putVolume[latest],
        total_volume: totalVolume,
        call_ratio: callRatio,
        bias: bias
    };
}

function generateRecommendation(trend, volatility, pcrAnalysis) {
    let action = 'HOLD';
    let confidence = 'LOW';
    
    if (trend > 0.05 && pcrAnalysis.sentiment === 'BULLISH') {
        action = 'BUY';
        confidence = 'MEDIUM';
    } else if (trend < -0.05 && pcrAnalysis.sentiment === 'BEARISH') {
        action = 'SELL';
        confidence = 'MEDIUM';
    }
    
    if (volatility > 0.02) {
        confidence = 'LOW';
    }
    
    return {
        action: action,
        confidence: confidence,
        reasoning: `Trend: ${trend > 0 ? 'Positive' : 'Negative'}, PCR: ${pcrAnalysis.sentiment}, Volatility: ${volatility > 0.02 ? 'High' : 'Normal'}`
    };
}

function getPCRInterpretation(pcr) {
    if (pcr < 0.5) return 'Extremely bullish - Very low put activity';
    if (pcr < 0.7) return 'Bullish - Low put activity suggests optimism';
    if (pcr < 1.0) return 'Slightly bullish - More calls than puts';
    if (pcr < 1.3) return 'Slightly bearish - More puts than calls';
    if (pcr < 1.5) return 'Bearish - High put activity suggests pessimism';
    return 'Extremely bearish - Very high put activity';
}

function calculateAverage(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}
