// reliableGoogleSheets.js - Reliable Google Sheets integration using service account with HTTP requests
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

class ReliableGoogleSheetsStorage {
    constructor() {
        this.sheetId = process.env.GOOGLE_SHEET_ID;
        this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        this.privateKey = process.env.GOOGLE_PRIVATE_KEY;
        this.accessToken = null;
        this.tokenExpiry = null;
        
        if (!this.sheetId || !this.serviceAccountEmail || !this.privateKey) {
            console.warn('⚠️  Google Sheets credentials not found. Excel storage will be used as fallback.');
            console.warn('💡 Set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY environment variables');
            return;
        }
        
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}`;
    }

    // Create JWT token for service account authentication
    createJWT() {
        const now = Math.floor(Date.now() / 1000);
        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };
        
        const payload = {
            iss: this.serviceAccountEmail,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600, // 1 hour
            iat: now
        };

        const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        
        const signatureInput = `${headerBase64}.${payloadBase64}`;
        const privateKeyFormatted = this.privateKey.replace(/\\n/g, '\n');
        
        const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), privateKeyFormatted);
        const signatureBase64 = signature.toString('base64url');
        
        return `${signatureInput}.${signatureBase64}`;
    }

    // Get access token using JWT
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const jwt = this.createJWT();
            const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
            
            const response = await this.makeHttpRequest('oauth2.googleapis.com', '/token', 'POST', {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }, postData);

            const tokenData = JSON.parse(response);
            this.accessToken = tokenData.access_token;
            this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // Refresh 1 minute early
            
            console.log('✅ Google Sheets access token obtained');
            return this.accessToken;
        } catch (error) {
            console.error('❌ Failed to get access token:', error.message);
            throw error;
        }
    }

    // Make HTTP request helper
    async makeHttpRequest(hostname, path, method = 'GET', headers = {}, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname,
                path,
                method,
                headers
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data) {
                req.write(data);
            }

            req.end();
        });
    }

    // Make authenticated request to Google Sheets API
    async makeAuthenticatedRequest(path, method = 'GET', data = null) {
        const token = await this.getAccessToken();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        if (data) {
            const jsonData = JSON.stringify(data);
            headers['Content-Length'] = Buffer.byteLength(jsonData);
            return await this.makeHttpRequest('sheets.googleapis.com', path, method, headers, jsonData);
        } else {
            return await this.makeHttpRequest('sheets.googleapis.com', path, method, headers);
        }
    }

    async saveNiftyData(optionChainData) {
        if (!this.sheetId || !this.serviceAccountEmail || !this.privateKey) {
            throw new Error('Google Sheets not configured');
        }

        try {
            const timestamp = new Date();
            const istTimestamp = new Date(timestamp.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
            
            // Process data using the correct structure from fetchNiftyData
            const atmCall = optionChainData.options[optionChainData.atm_strike]?.CE;
            const atmPut = optionChainData.options[optionChainData.atm_strike]?.PE;

            if (!atmCall || !atmPut) {
                console.log('⚠️ Incomplete option data, skipping Google Sheets save');
                console.log('🔍 Available strikes:', Object.keys(optionChainData.options || {}));
                console.log('🔍 ATM Strike:', optionChainData.atm_strike);
                console.log('🔍 ATM Call exists:', !!atmCall);
                console.log('🔍 ATM Put exists:', !!atmPut);
                return false;
            }

            // Calculate additional metrics using the correct field names
            const totalCallOI = Object.values(optionChainData.options).reduce((sum, option) => 
                sum + (option.CE?.oi || 0), 0);
            const totalPutOI = Object.values(optionChainData.options).reduce((sum, option) => 
                sum + (option.PE?.oi || 0), 0);
            
            // Fix PCR calculation - use correct field names
            const pcrVolume = (atmCall.volume && atmCall.volume > 0) ? (atmPut.volume / atmCall.volume) : 0;
            const pcrOI = totalCallOI > 0 ? (totalPutOI / totalCallOI) : 0;

            // Create row data matching Excel format exactly - using correct field names
            const rowData = [
                istTimestamp.toISOString(),
                istTimestamp.toDateString(),
                istTimestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
                optionChainData.spot_price,
                optionChainData.atm_strike,
                optionChainData.expiry,
                atmCall.oi || 0,           // Call OI
                atmCall.volume || 0,       // Call Volume  
                atmCall.last_price || 0,   // Call LTP
                atmCall.change || 0,       // Call Change
                atmCall.iv || 0,           // Call IV
                atmPut.oi || 0,            // Put OI
                atmPut.volume || 0,        // Put Volume
                atmPut.last_price || 0,    // Put LTP
                atmPut.change || 0,        // Put Change
                atmPut.iv || 0,            // Put IV
                pcrVolume,                 // PCR Volume
                pcrOI,                     // PCR OI
                totalCallOI,               // Total Call OI
                totalPutOI                 // Total Put OI
            ];

            console.log('💾 Saving to Google Sheets - Call OI:', atmCall.oi, 'Put OI:', atmPut.oi, 'Call Vol:', atmCall.volume, 'Put Vol:', atmPut.volume);

            // Try different sheet names - start with Sheet1 (default)
            const sheetNames = ['Sheet1', 'NIFTY_Historical_Data', 'Sheet 1'];
            let success = false;
            
            for (const sheetName of sheetNames) {
                try {
                    const path = `/v4/spreadsheets/${this.sheetId}/values/${sheetName}!A:T:append?valueInputOption=RAW`;
                    
                    await this.makeAuthenticatedRequest(path, 'POST', {
                        values: [rowData]
                    });

                    console.log(`✅ Saved 1 record to Google Sheets (${sheetName}) at ${istTimestamp.toLocaleString()}`);
                    success = true;
                    break;
                } catch (error) {
                    if (error.message.includes('Unable to parse range')) {
                        console.log(`⚠️ Sheet "${sheetName}" not found, trying next...`);
                        continue;
                    } else {
                        throw error; // Re-throw other errors
                    }
                }
            }
            
            if (!success) {
                throw new Error('No valid sheet found. Please ensure your Google Sheet has a tab named "Sheet1" or "NIFTY_Historical_Data"');
            }

            return true;

        } catch (error) {
            console.error('❌ Error saving to Google Sheets:', error.message);
            throw error;
        }
    }

    async getSheetInfo() {
        if (!this.sheetId || !this.serviceAccountEmail || !this.privateKey) {
            return { available: false, error: 'Not configured' };
        }

        try {
            const path = `/v4/spreadsheets/${this.sheetId}`;
            const response = await this.makeAuthenticatedRequest(path);
            const sheetData = JSON.parse(response);
            
            return {
                available: true,
                sheetTitle: sheetData.properties?.title || 'Unknown',
                sheetId: this.sheetId,
                lastUpdated: new Date().toISOString(),
                integration: 'Service Account HTTP API'
            };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }

    // Placeholder methods for compatibility
    async getHistoricalData(filters = {}) {
        throw new Error('Historical data retrieval not implemented in reliable mode');
    }

    async getDailySummary(date = null) {
        return { message: 'Daily summary not available in reliable mode' };
    }
}

module.exports = ReliableGoogleSheetsStorage;
