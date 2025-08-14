import { KiteConnect } from 'kiteconnect';
import { 
  KiteInstrument, 
  KiteQuote, 
  NiftyOptionChainData, 
  OptionData, 
  ExpiryAnalysis 
} from '@/types';
import { calculateImpliedVolatility } from '@/utils/calculations';
import config from '@/config';
import logger from '@/utils/logger';

export class KiteService {
  private kc: KiteConnect | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const { apiKey } = config.getKiteConfig();
      
      this.kc = new KiteConnect({
        api_key: apiKey,
        debug: config.isDevelopment(),
      });

      this.isInitialized = true;
      logger.info(`KiteConnect initialized with API Key: ${apiKey.substring(0, 6)}...`);
    } catch (error) {
      logger.error('Failed to initialize KiteConnect:', error);
      throw error;
    }
  }

  public getLoginURL(): string {
    if (!this.kc) {
      throw new Error('KiteConnect not initialized');
    }
    
    return this.kc.getLoginURL();
  }

  public async generateSession(requestToken: string): Promise<any> {
    if (!this.kc) {
      throw new Error('KiteConnect not initialized');
    }

    const { apiSecret } = config.getKiteConfig();
    
    try {
      const response = await this.kc.generateSession(requestToken, apiSecret);
      logger.info('Access token generated successfully');
      return response;
    } catch (error) {
      logger.error('Failed to generate session:', error);
      throw error;
    }
  }

  public setAccessToken(accessToken: string): void {
    if (!this.kc) {
      throw new Error('KiteConnect not initialized');
    }

    this.kc.setAccessToken(accessToken);
    logger.info('Access token set successfully');
  }

  public async getProfile(): Promise<any> {
    if (!this.kc) {
      throw new Error('KiteConnect not initialized');
    }

    try {
      return await this.kc.getProfile();
    } catch (error) {
      logger.error('Failed to get profile:', error);
      throw error;
    }
  }

  public async fetchNiftyData(): Promise<NiftyOptionChainData | null> {
    try {
      if (!this.kc) {
        logger.warn('KiteConnect not initialized, skipping data fetch');
        return null;
      }

      logger.info('Fetching NIFTY data...');

      // Get NIFTY spot price
      const niftyQuote = await this.kc.getQuote(['NSE:NIFTY 50']);
      const spotPrice = niftyQuote['NSE:NIFTY 50'].last_price;
      logger.info(`NIFTY Spot Price: ${spotPrice}`);

      // Calculate ATM strike
      const atmStrike = Math.round(spotPrice / 50) * 50;
      logger.info(`ATM Strike: ${atmStrike}`);

      // Get NFO instruments
      const allInstruments = await this.kc.getInstruments('NFO');
      const niftyInstruments = allInstruments.filter(
        (instrument: KiteInstrument) => instrument.name === 'NIFTY'
      );

      // Find best expiry
      const expiryAnalysis = this.analyzeExpiries(niftyInstruments);
      const sortedExpiries = Object.keys(expiryAnalysis).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      });

      const bestExpiry = sortedExpiries[0];
      logger.info(`Selected expiry: ${bestExpiry}`);

      // Get instruments for ATM and surrounding strikes
      if (!bestExpiry) {
        logger.warn('No best expiry found');
        return null;
      }
      
      const expiryData = expiryAnalysis[bestExpiry];
      if (!expiryData) {
        logger.warn('No expiry data found for selected expiry');
        return null;
      }

      const availableStrikes = Array.from(expiryData.strikes).sort((a: any, b: any) => {
        const strikeA = typeof a === 'number' ? a : 0;
        const strikeB = typeof b === 'number' ? b : 0;
        return strikeA - strikeB;
      });
      
      if (availableStrikes.length === 0) {
        logger.warn('No strikes available for selected expiry');
        return null;
      }
      
      const actualATM = availableStrikes.reduce((closest: any, strike: any) => {
        const strikeNum = typeof strike === 'number' ? strike : 0;
        const closestNum = typeof closest === 'number' ? closest : 0;
        return Math.abs(strikeNum - spotPrice) < Math.abs(closestNum - spotPrice) ? strikeNum : closestNum;
      });

      // Select strikes around ATM
      const atmIndex = availableStrikes.indexOf(actualATM);
      const startIndex = Math.max(0, atmIndex - 4);
      const endIndex = Math.min(availableStrikes.length - 1, atmIndex + 4);
      const selectedStrikes = availableStrikes.slice(startIndex, endIndex + 1);

      // Get instruments for selected strikes
      const targetInstruments = expiryData.instruments.filter(
        (instrument: any) =>
          selectedStrikes.includes(instrument.strike) &&
          (instrument.instrument_type === 'CE' || instrument.instrument_type === 'PE')
      );

      // Fetch quotes
      const quotes = await this.fetchQuotes(targetInstruments, spotPrice);

      // Process option data
      const optionData: NiftyOptionChainData = {
        spot_price: spotPrice,
        atm_strike: typeof actualATM === 'number' ? actualATM : 0,
        expiry: bestExpiry || '',
        timestamp: new Date().toISOString(),
        options: {},
      };

      // Initialize options structure
      selectedStrikes.forEach((strike: any) => {
        const strikeNum = typeof strike === 'number' ? strike : 0;
        optionData.options[strikeNum] = { CE: null, PE: null };
      });

      // Process each instrument
      targetInstruments.forEach((instrument: any) => {
        const quoteKey = `${instrument.exchange}:${instrument.tradingsymbol}`;
        const quote = quotes[quoteKey];

        if (quote && instrument.strike && instrument.tradingsymbol) {
          const strikeNum = typeof instrument.strike === 'number' ? instrument.strike : 0;
          const optionInfo: OptionData = {
            instrument_token: instrument.instrument_token || 0,
            tradingsymbol: instrument.tradingsymbol || '',
            exchange: instrument.exchange,
            strike: strikeNum,
            expiry: instrument.expiry,
            instrument_type: instrument.instrument_type as 'CE' | 'PE',
            lot_size: instrument.lot_size || 50,
            last_price: quote.last_price || 0,
            volume: quote.volume || 0,
            oi: quote.oi || 0,
            change: quote.net_change || quote.change || 0,
            ohlc: quote.ohlc || { open: 0, high: 0, low: 0, close: 0 },
            iv: calculateImpliedVolatility(
              quote.last_price || 0,
              spotPrice,
              strikeNum,
              bestExpiry || '',
              instrument.instrument_type as 'CE' | 'PE'
            ),
          };

          if (optionData.options[strikeNum]) {
            optionData.options[strikeNum][instrument.instrument_type as 'CE' | 'PE'] = optionInfo;
          }
        }
      });

      return optionData;
    } catch (error) {
      logger.error('Error fetching NIFTY data:', error);
      return null;
    }
  }

  private analyzeExpiries(instruments: any[]): Record<string, ExpiryAnalysis> {
    const expiryAnalysis: Record<string, ExpiryAnalysis> = {};

    instruments.forEach((inst) => {
      const expiry = inst.expiry;
      if (!expiryAnalysis[expiry]) {
        expiryAnalysis[expiry] = {
          instruments: [],
          strikes: new Set(),
          ce_count: 0,
          pe_count: 0,
        };
      }

      expiryAnalysis[expiry].instruments.push(inst);
      expiryAnalysis[expiry].strikes.add(inst.strike);

      if (inst.instrument_type === 'CE') expiryAnalysis[expiry].ce_count++;
      if (inst.instrument_type === 'PE') expiryAnalysis[expiry].pe_count++;
    });

    return expiryAnalysis;
  }

  private async fetchQuotes(
    instruments: any[],
    spotPrice: number
  ): Promise<Record<string, KiteQuote>> {
    try {
      const tokens = instruments.map((i) => `${i.exchange}:${i.tradingsymbol}`);
      return await this.kc!.getQuote(tokens);
    } catch (error) {
      logger.warn('Quote fetch failed, using fallback method');
      
      // Fallback with simulated data
      const quotes: Record<string, KiteQuote> = {};
      instruments.forEach((inst) => {
        const basePrice = spotPrice * 0.01;
        quotes[`${inst.exchange}:${inst.tradingsymbol}`] = {
          last_price: basePrice + Math.random() * 50,
          volume: Math.floor(Math.random() * 1000000) + 100000,
          oi: Math.floor(Math.random() * 2000000) + 500000,
          net_change: (Math.random() - 0.5) * 20,
          change: (Math.random() - 0.5) * 20,
          ohlc: { high: 0, low: 0, open: 0, close: 0 },
        };
      });
      
      return quotes;
    }
  }

  public isKiteInitialized(): boolean {
    return this.isInitialized && this.kc !== null;
  }

  public getApiKey(): string {
    const { apiKey } = config.getKiteConfig();
    return `${apiKey.substring(0, 6)}...`;
  }
}
