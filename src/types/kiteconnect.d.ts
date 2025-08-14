declare module 'kiteconnect' {
  export class KiteConnect {
    constructor(options: { api_key: string; debug?: boolean });
    
    getLoginURL(): string;
    generateSession(requestToken: string, apiSecret: string): Promise<any>;
    setAccessToken(accessToken: string): void;
    getProfile(): Promise<any>;
    getQuote(instruments: string[]): Promise<Record<string, any>>;
    getInstruments(exchange: string): Promise<any[]>;
  }
}
