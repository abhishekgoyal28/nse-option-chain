import https from 'https';
import crypto from 'crypto';
import { NiftyOptionChainData } from '@/types';
import config from '@/config';
import logger from '@/utils/logger';

export class GoogleSheetsService {
  private sheetId?: string;
  private serviceAccountEmail?: string;
  private privateKey?: string;
  private accessToken?: string;
  private tokenExpiry?: number;
  private configured = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const sheetsConfig = config.getGoogleSheetsConfig();
    
    if (!sheetsConfig) {
      logger.info('📊 Storage Configuration: Excel-only mode (Google Sheets credentials not found)');
      logger.info('💡 To enable Google Sheets: Set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY');
      return;
    }

    this.sheetId = sheetsConfig.sheetId;
    this.serviceAccountEmail = sheetsConfig.serviceAccountEmail;
    this.privateKey = sheetsConfig.privateKey;
    this.configured = true;

    logger.info('📊 Storage Configuration: Google Sheets (primary) + Excel (fallback)');
    logger.info('🔗 Google Sheets service initialized successfully');
  }

  private createJWT(): string {
    if (!this.serviceAccountEmail || !this.privateKey) {
      throw new Error('Google Sheets credentials not configured');
    }

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
    const privateKeyFormatted = this.privateKey!.replace(/\\n/g, '\n');

    const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), privateKeyFormatted);
    const signatureBase64 = signature.toString('base64url');

    return `${signatureInput}.${signatureBase64}`;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.privateKey) {
      throw new Error('Private key not configured');
    }

    try {
      const jwt = this.createJWT();
      const postData = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }).toString();

      return new Promise<string>((resolve, reject) => {
        const options = {
          hostname: 'oauth2.googleapis.com',
          port: 443,
          path: '/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        logger.debug('Requesting Google OAuth2 access token...');

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            logger.debug(`OAuth2 token response status: ${res.statusCode}`);
            
            try {
              const response = JSON.parse(data);
              if (response.access_token) {
                this.accessToken = response.access_token;
                this.tokenExpiry = Date.now() + (response.expires_in * 1000) - 60000; // 1 minute buffer
                logger.info('Google OAuth2 access token obtained successfully');
                resolve(this.accessToken!);
              } else {
                logger.error(`Token request failed: ${data}`);
                reject(new Error(`Token request failed: ${response.error_description || data}`));
              }
            } catch (error) {
              logger.error(`Failed to parse token response: ${data}`);
              reject(new Error(`Failed to parse token response: ${error}`));
            }
          });
        });

        req.on('error', (error) => {
          logger.error(`Token request error: ${error.message}`);
          reject(new Error(`Token request error: ${error.message}`));
        });

        req.write(postData);
        req.end();
      });
    } catch (error) {
      logger.error(`Error creating JWT or requesting token: ${error}`);
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  private async makeRequest(path: string, method: string = 'GET', data?: any): Promise<any> {
    if (!this.configured) {
      throw new Error('Google Sheets service not configured');
    }

    const accessToken = await this.getAccessToken();
    
    // Construct the full URL properly
    const fullUrl = `https://sheets.googleapis.com${path}`;
    const url = new URL(fullUrl);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      logger.debug(`Making Google Sheets API request: ${method} ${fullUrl}`);

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          logger.debug(`Google Sheets API response status: ${res.statusCode}`);
          logger.debug(`Google Sheets API response headers: ${JSON.stringify(res.headers)}`);
          
          // Check if response is HTML (error page)
          if (responseData.trim().startsWith('<!DOCTYPE') || responseData.trim().startsWith('<html')) {
            logger.error(`Google Sheets API returned HTML instead of JSON. Status: ${res.statusCode}`);
            logger.error(`Response preview: ${responseData.substring(0, 200)}...`);
            reject(new Error(`Google Sheets API returned HTML error page. Status: ${res.statusCode}. This usually indicates authentication or permission issues.`));
            return;
          }

          try {
            const response = JSON.parse(responseData);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              logger.error(`Google Sheets API error response: ${responseData}`);
              reject(new Error(`API request failed: ${res.statusCode} - ${response.error?.message || responseData}`));
            }
          } catch (error) {
            logger.error(`Failed to parse Google Sheets API response: ${responseData.substring(0, 500)}`);
            reject(new Error(`Failed to parse response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        logger.error(`Google Sheets API request error: ${error.message}`);
        reject(new Error(`Request error: ${error.message}`));
      });

      if (data) {
        const jsonData = JSON.stringify(data);
        logger.debug(`Request body: ${jsonData}`);
        req.write(jsonData);
      }

      req.end();
    });
  }

  public async saveNiftyData(
    data: NiftyOptionChainData, 
    breakoutSignals?: any, 
    enhancedBreakoutSignals?: any, 
    advancedAnalytics?: any
  ): Promise<void> {
    if (!this.configured) {
      throw new Error('Google Sheets service not configured');
    }

    try {
      const timestamp = new Date();
      const istTimestamp = new Date(timestamp.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

      // Get ATM and surrounding strikes
      const atmStrike = data.atm_strike;
      const strikeInterval = 50; // NIFTY strike interval
      
      // Helper function to get option data safely
      const getOptionData = (strike: number, type: 'CE' | 'PE') => {
        const option = data.options[strike]?.[type];
        return {
          oi: option?.oi || 0,
          volume: option?.volume || 0,
          last_price: option?.last_price || 0,
          change: option?.change || 0,
          iv: option?.iv || 0
        };
      };

      // Get data for all strikes (ATM-3 to ATM+3)
      const strikes = {
        atmM3: getOptionData(atmStrike - (3 * strikeInterval), 'CE'),
        atmM3Put: getOptionData(atmStrike - (3 * strikeInterval), 'PE'),
        atmM2: getOptionData(atmStrike - (2 * strikeInterval), 'CE'),
        atmM2Put: getOptionData(atmStrike - (2 * strikeInterval), 'PE'),
        atmM1: getOptionData(atmStrike - (1 * strikeInterval), 'CE'),
        atmM1Put: getOptionData(atmStrike - (1 * strikeInterval), 'PE'),
        atm: getOptionData(atmStrike, 'CE'),
        atmPut: getOptionData(atmStrike, 'PE'),
        atmP1: getOptionData(atmStrike + (1 * strikeInterval), 'CE'),
        atmP1Put: getOptionData(atmStrike + (1 * strikeInterval), 'PE'),
        atmP2: getOptionData(atmStrike + (2 * strikeInterval), 'CE'),
        atmP2Put: getOptionData(atmStrike + (2 * strikeInterval), 'PE'),
        atmP3: getOptionData(atmStrike + (3 * strikeInterval), 'CE'),
        atmP3Put: getOptionData(atmStrike + (3 * strikeInterval), 'PE')
      };

      // Check if we have at least ATM data
      if (!data.options[atmStrike]?.CE || !data.options[atmStrike]?.PE) {
        throw new Error('Incomplete ATM option data for Google Sheets save');
      }

      // Calculate additional metrics
      const totalCallOI = Object.values(data.options).reduce(
        (sum, option) => sum + (option.CE?.oi || 0), 0
      );
      const totalPutOI = Object.values(data.options).reduce(
        (sum, option) => sum + (option.PE?.oi || 0), 0
      );
      const pcrVolume = strikes.atm.volume > 0 ? (strikes.atmPut.volume / strikes.atm.volume) : 0;
      const pcrOI = totalCallOI > 0 ? (totalPutOI / totalCallOI) : 0;

      // Prepare row data with all strike data
      const rowData = [
        istTimestamp.toISOString(),
        istTimestamp.toDateString(),
        istTimestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        data.spot_price,
        data.atm_strike,
        data.expiry,
        // ATM-3 Strike
        strikes.atmM3.oi, strikes.atmM3.volume, strikes.atmM3.last_price, strikes.atmM3.change, strikes.atmM3.iv,
        strikes.atmM3Put.oi, strikes.atmM3Put.volume, strikes.atmM3Put.last_price, strikes.atmM3Put.change, strikes.atmM3Put.iv,
        // ATM-2 Strike
        strikes.atmM2.oi, strikes.atmM2.volume, strikes.atmM2.last_price, strikes.atmM2.change, strikes.atmM2.iv,
        strikes.atmM2Put.oi, strikes.atmM2Put.volume, strikes.atmM2Put.last_price, strikes.atmM2Put.change, strikes.atmM2Put.iv,
        // ATM-1 Strike
        strikes.atmM1.oi, strikes.atmM1.volume, strikes.atmM1.last_price, strikes.atmM1.change, strikes.atmM1.iv,
        strikes.atmM1Put.oi, strikes.atmM1Put.volume, strikes.atmM1Put.last_price, strikes.atmM1Put.change, strikes.atmM1Put.iv,
        // ATM Strike
        strikes.atm.oi, strikes.atm.volume, strikes.atm.last_price, strikes.atm.change, strikes.atm.iv,
        strikes.atmPut.oi, strikes.atmPut.volume, strikes.atmPut.last_price, strikes.atmPut.change, strikes.atmPut.iv,
        // ATM+1 Strike
        strikes.atmP1.oi, strikes.atmP1.volume, strikes.atmP1.last_price, strikes.atmP1.change, strikes.atmP1.iv,
        strikes.atmP1Put.oi, strikes.atmP1Put.volume, strikes.atmP1Put.last_price, strikes.atmP1Put.change, strikes.atmP1Put.iv,
        // ATM+2 Strike
        strikes.atmP2.oi, strikes.atmP2.volume, strikes.atmP2.last_price, strikes.atmP2.change, strikes.atmP2.iv,
        strikes.atmP2Put.oi, strikes.atmP2Put.volume, strikes.atmP2Put.last_price, strikes.atmP2Put.change, strikes.atmP2Put.iv,
        // ATM+3 Strike
        strikes.atmP3.oi, strikes.atmP3.volume, strikes.atmP3.last_price, strikes.atmP3.change, strikes.atmP3.iv,
        strikes.atmP3Put.oi, strikes.atmP3Put.volume, strikes.atmP3Put.last_price, strikes.atmP3Put.change, strikes.atmP3Put.iv,
        // Summary metrics
        pcrVolume,
        pcrOI,
        totalCallOI,
        totalPutOI
      ];

      // Add breakout signals data
      if (breakoutSignals) {
        rowData.push(
          JSON.stringify(breakoutSignals.signals || []),
          breakoutSignals.signals?.length || 0,
          breakoutSignals.primarySignalType || '',
          breakoutSignals.signalStrength || 0,
          breakoutSignals.signalDirection || '',
          breakoutSignals.timestamp || '',
          JSON.stringify(breakoutSignals.conditionsMet || [])
        );
      } else {
        rowData.push('', 0, '', 0, '', '', '');
      }

      // Add enhanced breakout signals data
      if (enhancedBreakoutSignals && enhancedBreakoutSignals.length > 0) {
        const topSignal = enhancedBreakoutSignals[0];
        const avgConfidence = enhancedBreakoutSignals.reduce((sum: number, s: any) => sum + s.confidence, 0) / enhancedBreakoutSignals.length;
        const highConfidenceCount = enhancedBreakoutSignals.filter((s: any) => s.confidence >= 0.8).length;
        
        rowData.push(
          topSignal.type || '',
          topSignal.direction || '',
          avgConfidence.toFixed(2),
          enhancedBreakoutSignals.length,
          highConfidenceCount
        );
      } else {
        rowData.push('', '', '0.00', 0, 0);
      }

      // Add advanced analytics data
      if (advancedAnalytics) {
        rowData.push(
          advancedAnalytics.ivSkew?.overallSkew?.toFixed(2) || '',
          advancedAnalytics.ivSkew?.skewVelocity?.toFixed(2) || '',
          advancedAnalytics.gex?.totalGEX?.toFixed(0) || '',
          advancedAnalytics.gex?.zeroGammaLevel?.toFixed(0) || '',
          advancedAnalytics.gex?.maxPainLevel?.toFixed(0) || '',
          advancedAnalytics.oiClusters?.clusters?.length || 0,
          advancedAnalytics.oiClusters?.clusterBreakAlert ? 'YES' : 'NO',
          advancedAnalytics.patterns?.patternType || '',
          advancedAnalytics.patterns?.confidence?.toFixed(2) || ''
        );
      } else {
        rowData.push('', '', '', '', '', 0, 'NO', '', '');
      }

      // Log signal data being saved
      logger.info(`📊 Google Sheets save with signals:`);
      logger.info(`   Breakout signals: ${breakoutSignals?.signals?.length || 0} detected`);
      logger.info(`   Enhanced signals: ${enhancedBreakoutSignals?.length || 0} detected`);
      logger.info(`   Advanced analytics: ${advancedAnalytics ? 'Available' : 'Not available'}`);
      logger.info(`   Total row data columns: ${rowData.length}`);

      // Try different sheet names like the original implementation
      const sheetNames = ['NIFTY_Historical_Data_v1'];
      let success = false;

      for (const sheetName of sheetNames) {
        try {
          // Append data to sheet
          const appendData = {
            values: [rowData]
          };

          await this.makeRequest(`/v4/spreadsheets/${this.sheetId}/values/${sheetName}:append?valueInputOption=RAW`, 'POST', appendData);
          
          logger.info(`✅ Multi-strike data saved to Google Sheets (${sheetName}) successfully (IST: ${istTimestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
          success = true;
          break;
        } catch (error) {
          const errorMessage = (error as Error).message;
          if (errorMessage.includes('Unable to parse range') || errorMessage.includes('404')) {
            logger.warn(`⚠️ Sheet "${sheetName}" not found, trying next...`);
            continue;
          } else {
            throw error; // Re-throw other errors
          }
        }
      }

      if (!success) {
        throw new Error('No valid sheet found. Please ensure your Google Sheet has a tab named "NIFTY_Historical_Data_v1"');
      }

    } catch (error) {
      logger.error('Failed to save data to Google Sheets:', error);
      throw error;
    }
  }

  public async getSheetInfo(): Promise<{
    available: boolean;
    sheetId?: string;
    title?: string;
    error?: string;
  }> {
    if (!this.configured) {
      return {
        available: false,
        error: 'Not configured'
      };
    }

    try {
      const response = await this.makeRequest(`/v4/spreadsheets/${this.sheetId}`);
      return {
        available: true,
        ...(this.sheetId && { sheetId: this.sheetId }),
        title: response.properties?.title || 'Unknown'
      };
    } catch (error) {
      return {
        available: false,
        error: (error as Error).message
      };
    }
  }

  public async getHistoricalData(filters: {
    date?: string;
    strikePrice?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    if (!this.configured) {
      throw new Error('Google Sheets service not configured');
    }

    try {
      // Try different sheet names
      const sheetNames = ['NIFTY_Historical_Data_v1'];
      let response: any = null;

      for (const sheetName of sheetNames) {
        try {
          response = await this.makeRequest(`/v4/spreadsheets/${this.sheetId}/values/${sheetName}`);
          break;
        } catch (error) {
          const errorMessage = (error as Error).message;
          if (errorMessage.includes('Unable to parse range') || errorMessage.includes('404')) {
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('No valid sheet found for historical data');
      }

      const rows = response.values || [];
      
      if (rows.length <= 1) {
        return [];
      }

      // Skip header row
      let data = rows.slice(1);

      // Apply filters
      if (filters.date) {
        data = data.filter((row: any[]) => {
          const rowDate = new Date(row[0]).toDateString();
          return rowDate === new Date(filters.date!).toDateString();
        });
      }

      if (filters.strikePrice) {
        data = data.filter((row: any[]) => {
          return parseFloat(row[4]) === filters.strikePrice;
        });
      }

      if (filters.limit) {
        data = data.slice(-filters.limit);
      }

      return data;
    } catch (error) {
      logger.error('Failed to fetch historical data from Google Sheets:', error);
      throw error;
    }
  }

  public async getDailySummary(date?: string): Promise<any> {
    if (!this.configured) {
      throw new Error('Google Sheets service not configured');
    }

    try {
      const targetDate = date ? new Date(date) : new Date();
      const dateString = targetDate.toDateString();

      const historicalData = await this.getHistoricalData({ date: dateString });

      if (historicalData.length === 0) {
        return {
          date: dateString,
          records: 0,
          summary: 'No data available for this date'
        };
      }

      // Calculate summary statistics
      const spotPrices = historicalData.map((row: any[]) => parseFloat(row[3]));
      const callVolumes = historicalData.map((row: any[]) => parseFloat(row[7]));
      const putVolumes = historicalData.map((row: any[]) => parseFloat(row[12]));

      return {
        date: dateString,
        records: historicalData.length,
        summary: {
          spot_price_range: {
            min: Math.min(...spotPrices),
            max: Math.max(...spotPrices),
            open: spotPrices[0],
            close: spotPrices[spotPrices.length - 1]
          },
          total_call_volume: callVolumes.reduce((sum, vol) => sum + vol, 0),
          total_put_volume: putVolumes.reduce((sum, vol) => sum + vol, 0),
          avg_pcr: historicalData.reduce((sum: number, row: any[]) => sum + parseFloat(row[16]), 0) / historicalData.length
        }
      };
    } catch (error) {
      logger.error('Failed to fetch daily summary from Google Sheets:', error);
      throw error;
    }
  }

  public isConfigured(): boolean {
    return this.configured;
  }

  public async validateConfiguration(): Promise<{
    valid: boolean;
    issues: string[];
    sheetInfo?: any;
  }> {
    const issues: string[] = [];

    if (!this.configured) {
      issues.push('Google Sheets service not configured');
      return { valid: false, issues };
    }

    if (!this.sheetId) {
      issues.push('Sheet ID not provided');
    }

    if (!this.serviceAccountEmail) {
      issues.push('Service account email not provided');
    }

    if (!this.privateKey) {
      issues.push('Private key not provided');
    }

    if (issues.length > 0) {
      return { valid: false, issues };
    }

    try {
      // Test authentication by getting sheet info
      const sheetInfo = await this.getSheetInfo();
      if (!sheetInfo.available) {
        issues.push(`Cannot access sheet: ${sheetInfo.error}`);
        return { valid: false, issues };
      }

      logger.info(`Google Sheets validation successful. Sheet: "${sheetInfo.title}"`);
      return { 
        valid: true, 
        issues: [], 
        sheetInfo 
      };
    } catch (error) {
      issues.push(`Sheet access test failed: ${(error as Error).message}`);
      return { valid: false, issues };
    }
  }
}
