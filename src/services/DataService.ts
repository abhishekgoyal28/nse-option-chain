import { 
  NiftyOptionChainData, 
  DataStorageResult, 
  HistoricalDataResponse,
  HistoricalDataFilters,
  ChartData
} from '@/types';
import { ExcelStorageService } from './ExcelStorageService';
import { GoogleSheetsService } from './GoogleSheetsService';
import { isMarketOpen } from '@/utils/market';
import logger from '@/utils/logger';
import config from '@/config';

export class DataService {
  private excelStorage: ExcelStorageService;
  private googleSheetsStorage: GoogleSheetsService;

  constructor() {
    this.excelStorage = new ExcelStorageService();
    this.googleSheetsStorage = new GoogleSheetsService();
  }

  public async saveHistoricalData(data: NiftyOptionChainData): Promise<DataStorageResult> {
    try {
      // Check if market is open before saving data
      if (!isMarketOpen()) {
        logger.info('Skipping historical data save - Market is closed');
        return {
          savedToGoogleSheets: false,
          savedToExcel: false,
          success: false
        };
      }

      let savedToGoogleSheets = false;
      let savedToExcel = false;

      // Primary: Try to save to Google Sheets first
      if (this.googleSheetsStorage.isConfigured()) {
        try {
          await this.googleSheetsStorage.saveNiftyData(data);
          savedToGoogleSheets = true;
          logger.info('✅ Multi-strike data saved to Google Sheets successfully');
        } catch (googleError) {
          const errorMessage = (googleError as Error).message;
          logger.warn(`⚠️ Google Sheets save failed: ${errorMessage}`);
          logger.info('🔄 Falling back to Excel storage...');
        }
      } else {
        logger.info('📝 Google Sheets not configured, using Excel storage');
      }

      // Fallback: Always save to Excel (either as fallback or primary if Google Sheets failed)
      try {
        savedToExcel = this.excelStorage.saveData(data);
        if (savedToExcel) {
          if (savedToGoogleSheets) {
            logger.info('✅ Multi-strike data also saved to Excel as backup');
          } else {
            logger.info('✅ Multi-strike data saved to Excel successfully');
          }
        }
      } catch (excelError) {
        logger.error('❌ Failed to save to Excel:', (excelError as Error).message);
      }

      const success = savedToGoogleSheets || savedToExcel;

      // Log storage summary
      if (success) {
        if (savedToGoogleSheets && savedToExcel) {
          logger.info('💾 Data saved to both Google Sheets (primary) and Excel (backup)');
        } else if (savedToGoogleSheets) {
          logger.info('💾 Data saved to Google Sheets only');
        } else if (savedToExcel) {
          logger.info('💾 Data saved to Excel only (Google Sheets failed)');
        }
      } else {
        logger.error('❌ Failed to save data to any storage method');
      }

      return {
        savedToGoogleSheets,
        savedToExcel,
        success
      };
    } catch (error) {
      logger.error('❌ Error in saveHistoricalData:', (error as Error).message);
      return {
        savedToGoogleSheets: false,
        savedToExcel: false,
        success: false
      };
    }
  }

  public async getHistoricalData(filters: HistoricalDataFilters = {}): Promise<HistoricalDataResponse> {
    // Primary: Try Google Sheets first if configured
    if (this.googleSheetsStorage.isConfigured()) {
      try {
        logger.debug('Attempting to read historical data from Google Sheets...');
        const googleSheetsData = await this.googleSheetsStorage.getHistoricalData(filters);
        
        if (googleSheetsData && googleSheetsData.length > 0) {
          logger.info(`✅ Historical data loaded from Google Sheets: ${googleSheetsData.length} records`);
          
          // Transform Google Sheets data to ChartData format
          const chartData = this.transformGoogleSheetsToChartData(googleSheetsData);
          
          return {
            success: true,
            data: chartData,
            totalRecords: googleSheetsData.length,
            filteredRecords: googleSheetsData.length
          } as HistoricalDataResponse & { source: string };
        }
      } catch (error) {
        logger.warn(`⚠️ Failed to read from Google Sheets: ${(error as Error).message}`);
        logger.info('🔄 Falling back to Excel storage...');
      }
    }

    // Fallback: Use Excel storage
    logger.debug('Reading historical data from Excel...');
    const excelResult = this.excelStorage.getHistoricalData(filters);
    
    if (excelResult.success) {
      logger.info(`✅ Historical data loaded from Excel: ${excelResult.filteredRecords || 0} records`);
    }
    
    return excelResult;
  }

  public getHistoricalDataStats(): {
    available: boolean;
    records: number;
    file_size?: string;
    oldest_record?: string;
    latest_record?: string;
    error?: string;
  } {
    return this.excelStorage.getHistoricalDataStats();
  }

  public async getGoogleSheetsStatus(): Promise<{
    available: boolean;
    sheetId?: string;
    title?: string;
    error?: string;
  }> {
    if (!this.googleSheetsStorage.isConfigured()) {
      return {
        available: false,
        error: 'Not configured'
      };
    }

    try {
      return await this.googleSheetsStorage.getSheetInfo();
    } catch (error) {
      return {
        available: false,
        error: (error as Error).message
      };
    }
  }

  public async getGoogleSheetsHistoricalData(filters: {
    date?: string;
    strikePrice?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    if (!this.googleSheetsStorage.isConfigured()) {
      throw new Error('Google Sheets service not configured');
    }

    return await this.googleSheetsStorage.getHistoricalData(filters);
  }

  public async getGoogleSheetsDailySummary(date?: string): Promise<any> {
    if (!this.googleSheetsStorage.isConfigured()) {
      throw new Error('Google Sheets service not configured');
    }

    return await this.googleSheetsStorage.getDailySummary(date);
  }

  private transformGoogleSheetsToChartData(rawData: any[][]): ChartData {
    // Google Sheets returns raw array data, transform it to ChartData format
    const filteredData = rawData;
    
    // Check if we have old format data (20 columns) vs new format (80 columns)
    const isOldFormat = filteredData.length > 0 && filteredData[0].length <= 20;
    
    if (isOldFormat) {
      logger.warn('Detected old Google Sheets data format (20 columns). Multi-strike charts will be empty until new data is saved.');
      
      // Return data with old format for basic charts and empty arrays for multi-strike charts
      return {
        timestamps: filteredData.map(row => row[0]),
        dates: filteredData.map(row => row[1]),
        times: filteredData.map(row => row[2]),
        spotPrices: filteredData.map(row => parseFloat(row[3]) || 0),
        atmStrikes: filteredData.map(row => parseFloat(row[4]) || 0),
        expiry: filteredData.length > 0 ? filteredData[filteredData.length - 1]?.[5] || '' : '',
        // Old format data (columns 6-15)
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
        // Empty arrays for multi-strike data (will be populated when new data comes in)
        atmM3Calls: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmM3Puts: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmM2Calls: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmM2Puts: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmM1Calls: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmM1Puts: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmP1Calls: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmP1Puts: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmP2Calls: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmP2Puts: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmP3Calls: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        atmP3Puts: { oi: [], volume: [], ltp: [], change: [], iv: [] },
        ratios: {
          pcr_volume: filteredData.map(row => parseFloat(row[16]) || 0),
          pcr_oi: filteredData.map(row => parseFloat(row[17]) || 0)
        },
        totals: {
          call_oi: filteredData.map(row => parseFloat(row[18]) || 0),
          put_oi: filteredData.map(row => parseFloat(row[19]) || 0)
        }
      };
    }

    // New format data (80 columns) - same structure as Excel
    return {
      timestamps: filteredData.map(row => row[0]),
      dates: filteredData.map(row => row[1]),
      times: filteredData.map(row => row[2]),
      spotPrices: filteredData.map(row => parseFloat(row[3]) || 0),
      atmStrikes: filteredData.map(row => parseFloat(row[4]) || 0),
      expiry: filteredData.length > 0 ? filteredData[filteredData.length - 1]?.[5] || '' : '',
      // ATM-3 Strike (columns 6-15)
      atmM3Calls: {
        oi: filteredData.map(row => parseFloat(row[6]) || 0),
        volume: filteredData.map(row => parseFloat(row[7]) || 0),
        ltp: filteredData.map(row => parseFloat(row[8]) || 0),
        change: filteredData.map(row => parseFloat(row[9]) || 0),
        iv: filteredData.map(row => parseFloat(row[10]) || 0)
      },
      atmM3Puts: {
        oi: filteredData.map(row => parseFloat(row[11]) || 0),
        volume: filteredData.map(row => parseFloat(row[12]) || 0),
        ltp: filteredData.map(row => parseFloat(row[13]) || 0),
        change: filteredData.map(row => parseFloat(row[14]) || 0),
        iv: filteredData.map(row => parseFloat(row[15]) || 0)
      },
      // ATM-2 Strike (columns 16-25)
      atmM2Calls: {
        oi: filteredData.map(row => parseFloat(row[16]) || 0),
        volume: filteredData.map(row => parseFloat(row[17]) || 0),
        ltp: filteredData.map(row => parseFloat(row[18]) || 0),
        change: filteredData.map(row => parseFloat(row[19]) || 0),
        iv: filteredData.map(row => parseFloat(row[20]) || 0)
      },
      atmM2Puts: {
        oi: filteredData.map(row => parseFloat(row[21]) || 0),
        volume: filteredData.map(row => parseFloat(row[22]) || 0),
        ltp: filteredData.map(row => parseFloat(row[23]) || 0),
        change: filteredData.map(row => parseFloat(row[24]) || 0),
        iv: filteredData.map(row => parseFloat(row[25]) || 0)
      },
      // ATM-1 Strike (columns 26-35)
      atmM1Calls: {
        oi: filteredData.map(row => parseFloat(row[26]) || 0),
        volume: filteredData.map(row => parseFloat(row[27]) || 0),
        ltp: filteredData.map(row => parseFloat(row[28]) || 0),
        change: filteredData.map(row => parseFloat(row[29]) || 0),
        iv: filteredData.map(row => parseFloat(row[30]) || 0)
      },
      atmM1Puts: {
        oi: filteredData.map(row => parseFloat(row[31]) || 0),
        volume: filteredData.map(row => parseFloat(row[32]) || 0),
        ltp: filteredData.map(row => parseFloat(row[33]) || 0),
        change: filteredData.map(row => parseFloat(row[34]) || 0),
        iv: filteredData.map(row => parseFloat(row[35]) || 0)
      },
      // ATM Strike (columns 36-45)
      calls: {
        oi: filteredData.map(row => parseFloat(row[36]) || 0),
        volume: filteredData.map(row => parseFloat(row[37]) || 0),
        ltp: filteredData.map(row => parseFloat(row[38]) || 0),
        change: filteredData.map(row => parseFloat(row[39]) || 0),
        iv: filteredData.map(row => parseFloat(row[40]) || 0)
      },
      puts: {
        oi: filteredData.map(row => parseFloat(row[41]) || 0),
        volume: filteredData.map(row => parseFloat(row[42]) || 0),
        ltp: filteredData.map(row => parseFloat(row[43]) || 0),
        change: filteredData.map(row => parseFloat(row[44]) || 0),
        iv: filteredData.map(row => parseFloat(row[45]) || 0)
      },
      // ATM+1 Strike (columns 46-55)
      atmP1Calls: {
        oi: filteredData.map(row => parseFloat(row[46]) || 0),
        volume: filteredData.map(row => parseFloat(row[47]) || 0),
        ltp: filteredData.map(row => parseFloat(row[48]) || 0),
        change: filteredData.map(row => parseFloat(row[49]) || 0),
        iv: filteredData.map(row => parseFloat(row[50]) || 0)
      },
      atmP1Puts: {
        oi: filteredData.map(row => parseFloat(row[51]) || 0),
        volume: filteredData.map(row => parseFloat(row[52]) || 0),
        ltp: filteredData.map(row => parseFloat(row[53]) || 0),
        change: filteredData.map(row => parseFloat(row[54]) || 0),
        iv: filteredData.map(row => parseFloat(row[55]) || 0)
      },
      // ATM+2 Strike (columns 56-65)
      atmP2Calls: {
        oi: filteredData.map(row => parseFloat(row[56]) || 0),
        volume: filteredData.map(row => parseFloat(row[57]) || 0),
        ltp: filteredData.map(row => parseFloat(row[58]) || 0),
        change: filteredData.map(row => parseFloat(row[59]) || 0),
        iv: filteredData.map(row => parseFloat(row[60]) || 0)
      },
      atmP2Puts: {
        oi: filteredData.map(row => parseFloat(row[61]) || 0),
        volume: filteredData.map(row => parseFloat(row[62]) || 0),
        ltp: filteredData.map(row => parseFloat(row[63]) || 0),
        change: filteredData.map(row => parseFloat(row[64]) || 0),
        iv: filteredData.map(row => parseFloat(row[65]) || 0)
      },
      // ATM+3 Strike (columns 66-75)
      atmP3Calls: {
        oi: filteredData.map(row => parseFloat(row[66]) || 0),
        volume: filteredData.map(row => parseFloat(row[67]) || 0),
        ltp: filteredData.map(row => parseFloat(row[68]) || 0),
        change: filteredData.map(row => parseFloat(row[69]) || 0),
        iv: filteredData.map(row => parseFloat(row[70]) || 0)
      },
      atmP3Puts: {
        oi: filteredData.map(row => parseFloat(row[71]) || 0),
        volume: filteredData.map(row => parseFloat(row[72]) || 0),
        ltp: filteredData.map(row => parseFloat(row[73]) || 0),
        change: filteredData.map(row => parseFloat(row[74]) || 0),
        iv: filteredData.map(row => parseFloat(row[75]) || 0)
      },
      // Summary metrics (columns 76-79)
      ratios: {
        pcr_volume: filteredData.map(row => parseFloat(row[76]) || 0),
        pcr_oi: filteredData.map(row => parseFloat(row[77]) || 0)
      },
      totals: {
        call_oi: filteredData.map(row => parseFloat(row[78]) || 0),
        put_oi: filteredData.map(row => parseFloat(row[79]) || 0)
      }
    };
  }

  public clearHistoricalData(): void {
    this.excelStorage.clearHistoricalData();
  }

  public getExcelFilePath(): string {
    return this.excelStorage.getHistoryFilePath();
  }

  public excelFileExists(): boolean {
    return this.excelStorage.fileExists();
  }

  public isGoogleSheetsConfigured(): boolean {
    return this.googleSheetsStorage.isConfigured();
  }

  public getStorageInfo(): {
    primary: string;
    fallback: string;
    excel_file_exists: boolean;
    google_sheets_configured: boolean;
  } {
    const configInfo = config.getStorageInfo();
    
    return {
      primary: configInfo.primary,
      fallback: configInfo.fallback,
      excel_file_exists: this.excelStorage.fileExists(),
      google_sheets_configured: configInfo.google_sheets_configured
    };
  }
}
