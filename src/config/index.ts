import dotenv from 'dotenv';
import path from 'path';
import { AppConfig, GoogleSheetsConfig } from '@/types';

// Load environment variables
dotenv.config();

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    const dataDir = path.join(process.cwd(), 'data');
    const historyFile = path.join(dataDir, 'nifty_history.xlsx'); // Excel fallback storage

    const config: AppConfig = {
      port: parseInt(process.env['PORT'] || '3001', 10),
      nodeEnv: process.env['NODE_ENV'] || 'development',
      kite: {
        apiKey: process.env['KITE_API_KEY'] || '',
        apiSecret: process.env['KITE_API_SECRET'] || '',
      },
      dataDir,
      historyFile, // Excel fallback file path
    };

    // Add Google Sheets config if available (primary storage)
    if (this.hasGoogleSheetsConfig()) {
      config.googleSheets = {
        sheetId: process.env['GOOGLE_SHEET_ID']!,
        serviceAccountEmail: process.env['GOOGLE_SERVICE_ACCOUNT_EMAIL']!,
        privateKey: process.env['GOOGLE_PRIVATE_KEY']!,
      };
    }

    return config;
  }

  private hasGoogleSheetsConfig(): boolean {
    return !!(
      process.env['GOOGLE_SHEET_ID'] &&
      process.env['GOOGLE_SERVICE_ACCOUNT_EMAIL'] &&
      process.env['GOOGLE_PRIVATE_KEY']
    );
  }

  private validateConfig(): void {
    const { kite } = this.config;

    if (!kite.apiKey || !kite.apiSecret) {
      throw new Error(
        'KITE_API_KEY and KITE_API_SECRET must be set in environment variables'
      );
    }

    if (this.config.port < 1 || this.config.port > 65535) {
      throw new Error('PORT must be a valid port number between 1 and 65535');
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public getKiteConfig(): { apiKey: string; apiSecret: string } {
    return { ...this.config.kite };
  }

  public getGoogleSheetsConfig(): GoogleSheetsConfig | undefined {
    return this.config.googleSheets ? { ...this.config.googleSheets } : undefined;
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  public getPort(): number {
    return this.config.port;
  }

  public getDataDir(): string {
    return this.config.dataDir;
  }

  public getHistoryFile(): string {
    return this.config.historyFile;
  }

  public getPrimaryStorageType(): 'google_sheets' | 'excel' {
    return this.config.googleSheets ? 'google_sheets' : 'excel';
  }

  public getStorageInfo(): {
    primary: string;
    fallback: string;
    google_sheets_configured: boolean;
  } {
    return {
      primary: this.config.googleSheets ? 'Google Sheets' : 'Excel',
      fallback: 'Excel',
      google_sheets_configured: !!this.config.googleSheets
    };
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();
export default config;
