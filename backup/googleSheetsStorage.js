// googleSheetsStorage.js - Google Sheets integration for NSE Option Chain data
const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();

class GoogleSheetsStorage {
    constructor() {
        this.doc = null;
        this.isAuthenticated = false;
        this.sheetId = process.env.GOOGLE_SHEET_ID;
        this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        this.privateKey = process.env.GOOGLE_PRIVATE_KEY;
        
        if (!this.sheetId || !this.serviceAccountEmail || !this.privateKey) {
            console.warn('⚠️  Google Sheets credentials not found. Excel storage will be used as fallback.');
            return;
        }
        
        this.doc = new GoogleSpreadsheet(this.sheetId);
    }

    async authenticate() {
        if (this.isAuthenticated || !this.doc) return true;
        
        try {
            const creds = {
                client_email: this.serviceAccountEmail,
                private_key: this.privateKey.replace(/\\n/g, '\n'),
            };

            console.log('🔐 Attempting Google Sheets authentication...');
            
            // Method 1: Try v4.x authentication
            if (typeof this.doc.useServiceAccountAuth === 'function') {
                console.log('📝 Using v4.x authentication method');
                await this.doc.useServiceAccountAuth(creds);
            }
            // Method 2: Try v3.x authentication with JWT
            else {
                console.log('📝 Using v3.x authentication method');
                
                // For v3.x, we need to use the older method
                const { JWT } = require('google-auth-library');
                const serviceAccountAuth = new JWT({
                    email: creds.client_email,
                    key: creds.private_key,
                    scopes: [
                        'https://www.googleapis.com/auth/spreadsheets',
                        'https://www.googleapis.com/auth/drive.file'
                    ],
                });
                
                // Set the auth for the document
                this.doc.useServiceAccountAuth = async () => {
                    this.doc.jwtClient = serviceAccountAuth;
                    return serviceAccountAuth;
                };
                
                await this.doc.useServiceAccountAuth();
            }
            
            await this.doc.loadInfo();
            this.isAuthenticated = true;
            console.log('✅ Google Sheets authenticated successfully');
            console.log(`📊 Connected to sheet: ${this.doc.title}`);
            return true;
            
        } catch (error) {
            console.error('❌ Google Sheets authentication failed:', error.message);
            
            // Try one more fallback method for very old versions
            try {
                console.log('🔄 Trying fallback authentication...');
                
                // Direct credential setting for older versions
                this.doc.useServiceAccountAuth({
                    client_email: this.serviceAccountEmail,
                    private_key: this.privateKey.replace(/\\n/g, '\n')
                }, (err) => {
                    if (err) throw err;
                });
                
                await this.doc.loadInfo();
                this.isAuthenticated = true;
                console.log('✅ Google Sheets authenticated with fallback method');
                return true;
                
            } catch (fallbackError) {
                console.error('❌ All authentication methods failed');
                console.error('🔧 Please try these steps:');
                console.error('   1. Delete node_modules: rm -rf node_modules');
                console.error('   2. Delete package-lock.json: rm package-lock.json');
                console.error('   3. Install fresh: npm install');
                console.error('   4. Install specific version: npm install google-spreadsheet@4.1.5');
                return false;
            }
        }
    }

    async initializeMainSheet() {
        if (!await this.authenticate()) return null;
        
        try {
            // Try to get existing sheet
            let sheet;
            
            // Handle different ways to access sheets in different versions
            if (this.doc.sheetsByTitle) {
                sheet = this.doc.sheetsByTitle['NIFTY_History'];
            } else if (this.doc.sheetsById) {
                // Find sheet by title in older versions
                const sheets = Object.values(this.doc.sheetsById);
                sheet = sheets.find(s => s.title === 'NIFTY_History');
            }
            
            if (!sheet) {
                console.log('📝 Creating new NIFTY_History sheet...');
                sheet = await this.doc.addSheet({
                    title: 'NIFTY_History',
                    headerValues: [
                        'Timestamp',
                        'Date', 
                        'Time',
                        'Strike_Price',
                        'Call_OI',
                        'Put_OI',
                        'Call_Volume',
                        'Put_Volume',
                        'Call_LTP',
                        'Put_LTP',
                        'Call_Change',
                        'Put_Change',
                        'PCR_OI',
                        'PCR_Volume',
                        'Underlying_Price',
                        'Market_Status'
                    ]
                });
                console.log('✅ NIFTY_History sheet created successfully');
            }
            
            return sheet;
        } catch (error) {
            console.error('❌ Error initializing main sheet:', error.message);
            return null;
        }
    }

    processOptionChainData(data, timestamp) {
        if (!data || !data.records || !data.records.data) {
            console.warn('⚠️  Invalid option chain data structure');
            return [];
        }

        const rows = [];
        const underlyingPrice = data.records.underlyingValue || 0;
        const marketStatus = this.getMarketStatus();

        data.records.data.forEach(record => {
            if (record.strikePrice) {
                const callData = record.CE || {};
                const putData = record.PE || {};
                
                rows.push({
                    Timestamp: timestamp.toISOString(),
                    Date: timestamp.toDateString(),
                    Time: timestamp.toTimeString().split(' ')[0],
                    Strike_Price: record.strikePrice,
                    Call_OI: callData.openInterest || 0,
                    Put_OI: putData.openInterest || 0,
                    Call_Volume: callData.totalTradedVolume || 0,
                    Put_Volume: putData.totalTradedVolume || 0,
                    Call_LTP: callData.lastPrice || 0,
                    Put_LTP: putData.lastPrice || 0,
                    Call_Change: callData.change || 0,
                    Put_Change: putData.change || 0,
                    PCR_OI: callData.openInterest ? (putData.openInterest || 0) / callData.openInterest : 0,
                    PCR_Volume: callData.totalTradedVolume ? (putData.totalTradedVolume || 0) / callData.totalTradedVolume : 0,
                    Underlying_Price: underlyingPrice,
                    Market_Status: marketStatus
                });
            }
        });

        return rows;
    }

    getMarketStatus() {
        const now = new Date();
        const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const hour = istTime.getHours();
        const minute = istTime.getMinutes();
        const day = istTime.getDay();
        
        if (day === 0 || day === 6) {
            return 'CLOSED_WEEKEND';
        }
        
        const marketStart = 9 * 60 + 15;
        const marketEnd = 15 * 60 + 30;
        const currentTime = hour * 60 + minute;
        
        if (currentTime >= marketStart && currentTime <= marketEnd) {
            return 'OPEN';
        } else if (currentTime < marketStart) {
            return 'PRE_MARKET';
        } else {
            return 'CLOSED';
        }
    }

    async saveNiftyData(optionChainData) {
        const sheet = await this.initializeMainSheet();
        if (!sheet) {
            throw new Error('Failed to initialize Google Sheets');
        }

        try {
            const timestamp = new Date();
            const processedData = this.processOptionChainData(optionChainData, timestamp);
            
            if (processedData.length === 0) {
                console.warn('⚠️  No data to save to Google Sheets');
                return false;
            }

            // Add rows one by one for better compatibility
            for (const row of processedData.slice(0, 10)) { // Limit to 10 rows to avoid rate limits
                await sheet.addRow(row);
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
            }
            
            console.log(`✅ Saved ${Math.min(processedData.length, 10)} records to Google Sheets at ${timestamp.toLocaleString()}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error saving to Google Sheets:', error.message);
            throw error;
        }
    }

    async getHistoricalData(filters = {}) {
        const sheet = await this.initializeMainSheet();
        if (!sheet) {
            throw new Error('Failed to access Google Sheets');
        }

        try {
            const rows = await sheet.getRows();
            
            let filteredData = rows.map(row => ({
                timestamp: row.Timestamp,
                date: row.Date,
                time: row.Time,
                strikePrice: parseInt(row.Strike_Price) || 0,
                callOI: parseInt(row.Call_OI) || 0,
                putOI: parseInt(row.Put_OI) || 0,
                callVolume: parseInt(row.Call_Volume) || 0,
                putVolume: parseInt(row.Put_Volume) || 0,
                callLTP: parseFloat(row.Call_LTP) || 0,
                putLTP: parseFloat(row.Put_LTP) || 0,
                underlyingPrice: parseFloat(row.Underlying_Price) || 0,
                marketStatus: row.Market_Status
            }));

            if (filters.limit) {
                filteredData = filteredData.slice(-parseInt(filters.limit));
            }

            return filteredData;
        } catch (error) {
            console.error('❌ Error fetching historical data from Google Sheets:', error.message);
            throw error;
        }
    }

    async getSheetInfo() {
        if (!await this.authenticate()) {
            return { available: false, error: 'Authentication failed' };
        }

        try {
            return {
                available: true,
                sheetTitle: this.doc.title,
                sheetId: this.sheetId,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }

    // Simplified methods for compatibility
    async getDailySummary(date = null) {
        return { message: 'Daily summary not available in compatibility mode' };
    }
}

module.exports = GoogleSheetsStorage;
