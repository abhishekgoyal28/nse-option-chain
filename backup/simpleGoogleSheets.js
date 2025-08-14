// simpleGoogleSheets.js - Simplified Google Sheets integration using HTTP requests
const https = require('https');
require('dotenv').config();

class SimpleGoogleSheetsStorage {
    constructor() {
        this.sheetId = process.env.GOOGLE_SHEET_ID;
        this.apiKey = process.env.GOOGLE_API_KEY; // We'll use API key instead of service account
        
        if (!this.sheetId || !this.apiKey) {
            console.warn('⚠️  Google Sheets credentials not found. Excel storage will be used as fallback.');
            console.warn('💡 Set GOOGLE_SHEET_ID and GOOGLE_API_KEY environment variables');
            return;
        }
        
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}`;
    }

    async makeRequest(url, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            const req = https.request(url, options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async saveNiftyData(optionChainData) {
        if (!this.sheetId || !this.apiKey) {
            throw new Error('Google Sheets not configured');
        }

        try {
            const timestamp = new Date();
            const istTimestamp = new Date(timestamp.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
            
            // Process data to match the Excel format exactly
            const atmCall = optionChainData.options[optionChainData.atm_strike]?.CE;
            const atmPut = optionChainData.options[optionChainData.atm_strike]?.PE;

            if (!atmCall || !atmPut) {
                console.log('⚠️ Incomplete option data, skipping Google Sheets save');
                return false;
            }

            // Calculate additional metrics (same as Excel version)
            const totalCallOI = Object.values(optionChainData.options).reduce((sum, option) => 
                sum + (option.CE?.oi || 0), 0);
            const totalPutOI = Object.values(optionChainData.options).reduce((sum, option) => 
                sum + (option.PE?.oi || 0), 0);
            const pcrVolume = totalPutOI > 0 ? (atmPut.volume / atmCall.volume) : 0;
            const pcrOI = totalCallOI > 0 ? (totalPutOI / totalCallOI) : 0;

            // Create row data matching Excel format exactly
            const rowData = [
                istTimestamp.toISOString(),
                istTimestamp.toDateString(),
                istTimestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
                optionChainData.spot_price,
                optionChainData.atm_strike,
                optionChainData.expiry,
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

            const url = `${this.baseUrl}/values/NIFTY_Historical_Data_v1!A:T:append?valueInputOption=RAW&key=${this.apiKey}`;
            
            await this.makeRequest(url, 'POST', {
                values: [rowData]
            });

            console.log(`✅ Saved 1 record to Google Sheets at ${istTimestamp.toLocaleString()}`);
            return true;

        } catch (error) {
            console.error('❌ Error saving to Google Sheets:', error.message);
            throw error;
        }
    }

    async getSheetInfo() {
        if (!this.sheetId || !this.apiKey) {
            return { available: false, error: 'Not configured' };
        }

        try {
            const url = `${this.baseUrl}?key=${this.apiKey}`;
            const response = await this.makeRequest(url);
            
            return {
                available: true,
                sheetTitle: response.properties?.title || 'Unknown',
                sheetId: this.sheetId,
                lastUpdated: new Date().toISOString(),
                integration: 'Simple HTTP API'
            };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }

    // Placeholder methods for compatibility
    async getHistoricalData(filters = {}) {
        throw new Error('Historical data retrieval not implemented in simple mode');
    }

    async getDailySummary(date = null) {
        return { message: 'Daily summary not available in simple mode' };
    }
}

module.exports = SimpleGoogleSheetsStorage;
