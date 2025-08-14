import { NiftyOptionChainData } from '@/types';
import { KiteService } from './KiteService';
import { DataService } from './DataService';
import { isMarketOpen, getTimeUntilMarketOpen, formatDuration } from '@/utils/market';
import logger from '@/utils/logger';

export class PeriodicFetchService {
  private kiteService: KiteService;
  private dataService: DataService;
  private fetchInterval: NodeJS.Timeout | null = null;
  private marketMonitorInterval: NodeJS.Timeout | null = null;
  private latestOptionData: NiftyOptionChainData | null = null;
  private readonly FETCH_INTERVAL_MS = 30000; // 30 seconds
  private readonly MARKET_CHECK_INTERVAL_MS = 60000; // 1 minute

  constructor(kiteService: KiteService, dataService: DataService) {
    this.kiteService = kiteService;
    this.dataService = dataService;
  }

  public startPeriodicDataFetch(): void {
    if (this.fetchInterval) {
      logger.warn('Periodic data fetch is already running');
      return;
    }

    logger.info('Starting periodic data fetch (every 30 seconds)...');

    // Initial fetch after 5 seconds
    setTimeout(async () => {
      await this.performDataFetch();
    }, 5000);

    // Set up periodic fetch
    this.fetchInterval = setInterval(async () => {
      try {
        // Check if market is open before fetching
        if (!isMarketOpen()) {
          logger.info('Market closed - Stopping periodic fetch');
          this.stopPeriodicDataFetch();
          return;
        }

        await this.performDataFetch();
      } catch (error) {
        logger.error('Error in periodic data fetch:', error);
      }
    }, this.FETCH_INTERVAL_MS);
  }

  public stopPeriodicDataFetch(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
      logger.info('Stopped periodic data fetch');
    }
  }

  public startMarketHoursMonitoring(): void {
    logger.info('Starting market hours monitoring...');

    this.marketMonitorInterval = setInterval(() => {
      const marketOpen = isMarketOpen();
      const fetchRunning = !!this.fetchInterval;

      if (marketOpen && !fetchRunning) {
        logger.info('Market opened - Starting periodic data fetch');
        this.startPeriodicDataFetch();
      } else if (!marketOpen && fetchRunning) {
        logger.info('Market closed - Stopping periodic data fetch');
        this.stopPeriodicDataFetch();
      }

      // Log time until market opens if closed
      if (!marketOpen) {
        const timeUntilOpen = getTimeUntilMarketOpen();
        if (timeUntilOpen > 0) {
          logger.debug(`Market opens in: ${formatDuration(timeUntilOpen)}`);
        }
      }
    }, this.MARKET_CHECK_INTERVAL_MS);
  }

  public stopMarketHoursMonitoring(): void {
    if (this.marketMonitorInterval) {
      clearInterval(this.marketMonitorInterval);
      this.marketMonitorInterval = null;
      logger.info('Stopped market hours monitoring');
    }
  }

  public async performDataFetch(): Promise<NiftyOptionChainData | null> {
    try {
      logger.info('Fetching NIFTY data in background...');

      const data = await this.kiteService.fetchNiftyData();
      if (data) {
        this.latestOptionData = data;
        const saved = await this.dataService.saveHistoricalData(data);
        
        logger.info(
          `Periodic data update: ${new Date().toLocaleTimeString()} - Saved: ${saved.success}`
        );
        
        return data;
      } else {
        logger.warn('Data fetch returned null');
        return null;
      }
    } catch (error) {
      logger.error('Error in performDataFetch:', error);
      return null;
    }
  }

  public getLatestOptionData(): NiftyOptionChainData | null {
    return this.latestOptionData;
  }

  public setLatestOptionData(data: NiftyOptionChainData): void {
    this.latestOptionData = data;
  }

  public getFetchStatus(): {
    status: string;
    interval: string;
    last_data_timestamp: string | null;
    market_open: boolean;
  } {
    return {
      status: this.fetchInterval ? 'running' : 'stopped',
      interval: this.fetchInterval ? '30 seconds' : 'none',
      last_data_timestamp: this.latestOptionData ? this.latestOptionData.timestamp : null,
      market_open: isMarketOpen()
    };
  }

  public isFetchRunning(): boolean {
    return !!this.fetchInterval;
  }

  public isMonitoringRunning(): boolean {
    return !!this.marketMonitorInterval;
  }

  public shutdown(): void {
    logger.info('Shutting down periodic fetch service...');
    this.stopPeriodicDataFetch();
    this.stopMarketHoursMonitoring();
  }

  // Initialize the service based on market status
  public initialize(): void {
    // Start market hours monitoring
    this.startMarketHoursMonitoring();

    // Start periodic data fetch if market is open
    setTimeout(() => {
      if (isMarketOpen()) {
        logger.info('Market is open - Starting periodic data fetch...');
        this.startPeriodicDataFetch();
      } else {
        logger.info('Market is closed - Waiting for market to open');
        const timeUntilOpen = getTimeUntilMarketOpen();
        if (timeUntilOpen > 0) {
          logger.info(`Market opens in: ${formatDuration(timeUntilOpen)}`);
        }
      }
    }, 2000);
  }
}
