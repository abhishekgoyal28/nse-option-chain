import fs from 'fs';
import xlsx from 'node-xlsx';
import { 
  NiftyOptionChainData, 
  ChartData, 
  HistoricalDataResponse,
  HistoricalDataFilters 
} from '@/types';
import config from '@/config';
import logger from '@/utils/logger';

export class ExcelStorageService {
  private historyFile: string;
  private dataDir: string;

  constructor() {
    this.dataDir = config.getDataDir();
    this.historyFile = config.getHistoryFile();
    this.ensureDataDirectory();
    this.initializeHistoryFile();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      logger.info('Created data directory');
    }
  }

  private initializeHistoryFile(): void {
    if (!fs.existsSync(this.historyFile)) {
      logger.info('Creating new historical data file...');
      
      const headers = [
        [
          'Timestamp', 'Date', 'Time', 'Spot_Price', 'ATM_Strike', 'Expiry',
          // ATM-3 Strike
          'ATM_M3_Call_OI', 'ATM_M3_Call_Volume', 'ATM_M3_Call_LTP', 'ATM_M3_Call_Change', 'ATM_M3_Call_IV',
          'ATM_M3_Put_OI', 'ATM_M3_Put_Volume', 'ATM_M3_Put_LTP', 'ATM_M3_Put_Change', 'ATM_M3_Put_IV',
          // ATM-2 Strike
          'ATM_M2_Call_OI', 'ATM_M2_Call_Volume', 'ATM_M2_Call_LTP', 'ATM_M2_Call_Change', 'ATM_M2_Call_IV',
          'ATM_M2_Put_OI', 'ATM_M2_Put_Volume', 'ATM_M2_Put_LTP', 'ATM_M2_Put_Change', 'ATM_M2_Put_IV',
          // ATM-1 Strike
          'ATM_M1_Call_OI', 'ATM_M1_Call_Volume', 'ATM_M1_Call_LTP', 'ATM_M1_Call_Change', 'ATM_M1_Call_IV',
          'ATM_M1_Put_OI', 'ATM_M1_Put_Volume', 'ATM_M1_Put_LTP', 'ATM_M1_Put_Change', 'ATM_M1_Put_IV',
          // ATM Strike (current)
          'ATM_Call_OI', 'ATM_Call_Volume', 'ATM_Call_LTP', 'ATM_Call_Change', 'ATM_Call_IV',
          'ATM_Put_OI', 'ATM_Put_Volume', 'ATM_Put_LTP', 'ATM_Put_Change', 'ATM_Put_IV',
          // ATM+1 Strike
          'ATM_P1_Call_OI', 'ATM_P1_Call_Volume', 'ATM_P1_Call_LTP', 'ATM_P1_Call_Change', 'ATM_P1_Call_IV',
          'ATM_P1_Put_OI', 'ATM_P1_Put_Volume', 'ATM_P1_Put_LTP', 'ATM_P1_Put_Change', 'ATM_P1_Put_IV',
          // ATM+2 Strike
          'ATM_P2_Call_OI', 'ATM_P2_Call_Volume', 'ATM_P2_Call_LTP', 'ATM_P2_Call_Change', 'ATM_P2_Call_IV',
          'ATM_P2_Put_OI', 'ATM_P2_Put_Volume', 'ATM_P2_Put_LTP', 'ATM_P2_Put_Change', 'ATM_P2_Put_IV',
          // ATM+3 Strike
          'ATM_P3_Call_OI', 'ATM_P3_Call_Volume', 'ATM_P3_Call_LTP', 'ATM_P3_Call_Change', 'ATM_P3_Call_IV',
          'ATM_P3_Put_OI', 'ATM_P3_Put_Volume', 'ATM_P3_Put_LTP', 'ATM_P3_Put_Change', 'ATM_P3_Put_IV',
          // Summary metrics
          'PCR_Volume', 'PCR_OI', 'Total_Call_OI', 'Total_Put_OI'
        ]
      ];

      const buffer = xlsx.build([{
        name: 'NIFTY_Historical_Data_v1',
        data: headers,
        options: {}
      }]);

      fs.writeFileSync(this.historyFile, buffer);
      logger.info('Historical data file created successfully');
    } else {
      logger.info('Historical data file already exists');
    }
  }

  public saveData(data: NiftyOptionChainData): boolean {
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
        logger.warn('Incomplete ATM option data, skipping Excel save');
        return false;
      }

      // Read existing data
      let existingData: any[][] = [];
      if (fs.existsSync(this.historyFile)) {
        const workbook = xlsx.parse(this.historyFile);
        if (workbook[0] && workbook[0].data && Array.isArray(workbook[0].data)) {
          existingData = workbook[0].data;
        }
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

      // Create new row with all strike data
      const newRow = [
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

      // Add new row to existing data
      existingData.push(newRow);

      // Keep only last 2000 records to manage file size
      if (existingData.length > 2001 && existingData[0]) { // +1 for header
        existingData = [existingData[0], ...existingData.slice(-2000)];
      }

      // Write back to file
      const buffer = xlsx.build([{
        name: 'NIFTY_Historical_Data_v1',
        data: existingData,
        options: {}
      }]);

      fs.writeFileSync(this.historyFile, buffer);
      
      logger.info(
        `Historical data saved to Excel: ${existingData.length - 1} total records (IST: ${istTimestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })})`
      );
      
      return true;
    } catch (error) {
      logger.error('Error saving to Excel:', error);
      return false;
    }
  }

  public getHistoricalData(filters: HistoricalDataFilters = {}): HistoricalDataResponse {
    try {
      if (!fs.existsSync(this.historyFile)) {
        return { 
          success: false, 
          message: 'No historical data available' 
        };
      }

      const workbook = xlsx.parse(this.historyFile);
      const rawData = workbook[0]?.data || [];

      if (rawData.length <= 1) {
        return { 
          success: false, 
          message: 'No historical data records found' 
        };
      }

      // Skip header row
      const dataRows = rawData.slice(1);
      if (!Array.isArray(dataRows)) {
        return { 
          success: false, 
          message: 'Invalid data format' 
        };
      }
      
      // Apply filters
      let filteredData = this.applyFilters(dataRows, filters);

      // Transform data for charts
      const chartData = this.transformToChartData(filteredData);

      return {
        success: true,
        data: chartData,
        totalRecords: dataRows.length,
        filteredRecords: filteredData.length,
        timeframe: filters.timeframe || 'all',
        limit: filters.limit || 'none'
      };
    } catch (error) {
      logger.error('Error reading historical data:', error);
      return { 
        success: false, 
        message: (error as Error).message 
      };
    }
  }

  private applyFilters(dataRows: any[][], filters: HistoricalDataFilters): any[][] {
    let filteredData = dataRows;

    // Filter by timeframe
    if (filters.timeframe) {
      const now = new Date();
      let cutoffTime: Date | null = null;

      switch (filters.timeframe) {
        case '1h':
          cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '4h':
          cutoffTime = new Date(now.getTime() - 4 * 60 * 60 * 1000);
          break;
        case '1d':
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (cutoffTime) {
        filteredData = filteredData.filter(row => {
          const rowTime = new Date(row[0]);
          return rowTime >= cutoffTime!;
        });
      }
    }

    // Apply limit
    if (filters.limit) {
      filteredData = filteredData.slice(-filters.limit);
    }

    return filteredData;
  }

  private transformToChartData(filteredData: any[][]): ChartData {
    // Check if we have old format data (20 columns) vs new format (80 columns)
    const isOldFormat = filteredData.length > 0 && filteredData[0].length <= 20;
    
    if (isOldFormat) {
      logger.warn('Detected old Excel data format (20 columns). Multi-strike charts will be empty until new data is saved.');
      
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

    // New format data (80 columns)
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

  public getHistoricalDataStats(): {
    available: boolean;
    records: number;
    file_size?: string;
    oldest_record?: string;
    latest_record?: string;
    error?: string;
  } {
    try {
      if (!fs.existsSync(this.historyFile)) {
        return { available: false, records: 0 };
      }

      const workbook = xlsx.parse(this.historyFile);
      const rawData = workbook[0]?.data;
      if (!rawData || !Array.isArray(rawData)) {
        return {
          available: false,
          records: 0,
          error: 'No data found in Excel file'
        };
      }
      
      const dataRows = rawData.slice(1); // Skip header
      const stats = fs.statSync(this.historyFile);

      return {
        available: true,
        records: dataRows.length,
        file_size: Math.round(stats.size / 1024) + ' KB',
        oldest_record: dataRows.length > 0 ? dataRows[0]?.[0] : undefined,
        latest_record: dataRows.length > 0 ? dataRows[dataRows.length - 1]?.[0] : undefined
      };
    } catch (error) {
      return { 
        available: false, 
        records: 0,
        error: (error as Error).message 
      };
    }
  }

  public clearHistoricalData(): void {
    if (fs.existsSync(this.historyFile)) {
      fs.unlinkSync(this.historyFile);
      logger.info('Historical data file deleted');
    }

    // Recreate empty file
    this.initializeHistoryFile();
  }

  public getHistoryFilePath(): string {
    return this.historyFile;
  }

  public fileExists(): boolean {
    return fs.existsSync(this.historyFile);
  }
}
