import express from 'express';
import path from 'path';
import { createRoutes } from '@/routes';
import { 
  corsOptions, 
  helmetConfig, 
  apiLimiter, 
  compressionMiddleware,
  requestLogger,
  securityHeaders,
  bodySizeLimit,
  trustProxy
} from '@/middleware/security';
import { errorHandler, notFound } from '@/middleware/errorHandler';
import config from '@/config';
import logger from '@/utils/logger';
import cors from 'cors';

class Server {
  private app: express.Application;
  private port: number;
  private periodicFetchService: any;

  constructor() {
    this.app = express();
    this.port = config.getPort();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Trust proxy
    this.app.set('trust proxy', trustProxy);

    // Security middleware
    this.app.use(helmetConfig);
    this.app.use(securityHeaders);
    this.app.use(compressionMiddleware);
    this.app.use(cors(corsOptions));

    // Body parsing middleware
    this.app.use(express.json({ limit: bodySizeLimit }));
    this.app.use(express.urlencoded({ extended: true, limit: bodySizeLimit }));

    // Request logging
    if (config.isDevelopment()) {
      this.app.use(requestLogger);
    }

    // Rate limiting for API routes
    this.app.use('/api/', apiLimiter);

    // Serve static files
    this.app.use(express.static(path.join(process.cwd(), 'public')));
  }

  private setupRoutes(): void {
    const { router, services } = createRoutes();
    
    // Store services for graceful shutdown and breakout integration
    this.periodicFetchService = services.periodicFetchService;
    
    // Integrate breakout detection with periodic fetch
    this.setupBreakoutIntegration(services);

    // API routes
    this.app.use('/api', router);

    // Serve the main HTML file
    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
    });

    // Health check at root level
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0.0'
      });
    });
  }

  private setupBreakoutIntegration(services: any): void {
    // Integrate both original and enhanced breakout detection with periodic data fetch
    if (services.periodicFetchService) {
      const originalFetchData = services.periodicFetchService.fetchData;
      
      services.periodicFetchService.fetchData = async () => {
        try {
          // Call original fetch method
          const result = await originalFetchData.call(services.periodicFetchService);
          
          // If data was successfully fetched, analyze breakouts
          if (result && result.success && result.data) {
            
            // Original breakout detection (if available)
            if (services.breakoutService) {
              services.breakoutService.addDataPoint(result.data);
              const analysis = services.breakoutService.analyzeBreakouts();
              const highPrioritySignals = analysis.signals.filter((s: any) => s.priority === 'HIGH');
              
              if (highPrioritySignals.length > 0) {
                logger.info(`🚨 BREAKOUT ALERT: ${highPrioritySignals.length} high priority signals detected!`);
                highPrioritySignals.forEach((signal: any) => {
                  logger.info(`   ${signal.type} ${signal.pattern}: ${signal.message} (Confidence: ${signal.confidence}%)`);
                });
              }
            }
            
            // Enhanced breakout detection
            if (services.enhancedBreakoutService) {
              try {
                // Get historical data for enhanced analysis
                const historicalData = await this.getHistoricalDataForBreakouts();
                
                if (historicalData) {
                  const enhancedSignals = services.enhancedBreakoutService.generateEnhancedBreakoutSignals(
                    result.data,
                    historicalData
                  );
                  
                  if (enhancedSignals.length > 0) {
                    logger.info(`🎯 Enhanced Breakout Analysis: ${enhancedSignals.length} signals generated`);
                    
                    // Log high confidence enhanced signals
                    const highConfidenceSignals = enhancedSignals.filter((s: any) => s.confidence >= 0.8);
                    if (highConfidenceSignals.length > 0) {
                      logger.info(`⚡ HIGH CONFIDENCE ENHANCED SIGNALS:`);
                      highConfidenceSignals.forEach((signal: any) => {
                        logger.info(`   ${signal.type}: ${signal.description} (${(signal.confidence * 100).toFixed(0)}% confidence)`);
                      });
                    }
                    
                    // Store enhanced signals for API access
                    this.latestEnhancedSignals = enhancedSignals;
                    this.lastSignalUpdate = new Date().toISOString();
                  }
                }
              } catch (enhancedError) {
                logger.warn('Enhanced breakout analysis failed:', enhancedError);
              }
            }
          }
          
          return result;
        } catch (error) {
          logger.error('Error in breakout integration:', error);
          // Still call original method to maintain functionality
          return await originalFetchData.call(services.periodicFetchService);
        }
      };
      
      logger.info('✅ Enhanced breakout detection integrated with periodic fetch service');
    }
  }

  private latestEnhancedSignals: any[] = [];
  private lastSignalUpdate: string = '';

  private async getHistoricalDataForBreakouts(): Promise<any> {
    try {
      // This would integrate with your existing historical data service
      // For now, return a basic structure
      return {
        timestamps: [],
        spotPrices: [],
        volumes: [],
        highs: [],
        lows: [],
        opens: [],
        vwaps: [],
        calls: { oi: [], volume: [], iv: [] },
        puts: { oi: [], volume: [], iv: [] }
      };
    } catch (error) {
      logger.error('Error getting historical data for breakouts:', error);
      return null;
    }
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      logger.info(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      if (this.periodicFetchService) {
        this.periodicFetchService.shutdown();
      }
      
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  public start(): void {
    try {
      this.app.listen(this.port, () => {
        logger.info(`
🚀 Enhanced Nifty Option Chain Tracker Server Started (TypeScript Edition)
📍 Port: ${this.port}
🌐 URL: http://localhost:${this.port}
📋 API Health: http://localhost:${this.port}/api/health
📊 Current Data: http://localhost:${this.port}/api/data/nifty
📈 Historical Data: http://localhost:${this.port}/api/data/historical
📊 Historical Summary: http://localhost:${this.port}/api/data/historical/summary
🔄 Manual Fetch: POST http://localhost:${this.port}/api/data/fetch
⚙️  Control Fetch: POST http://localhost:${this.port}/api/data/control-fetch
🔐 Environment: ${config.getConfig().nodeEnv}
💾 Data Storage: ${config.getDataDir()}
✅ Historical data storage enabled
🔄 Periodic data fetch: Ready to start (30s interval)
⏰ Smart market hours monitoring: Enabled
        `);

        // Initialize periodic fetch service
        if (this.periodicFetchService) {
          this.periodicFetchService.initialize();
        }
      });

      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new Server();
server.start();
