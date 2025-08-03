// Integration script for enhanced NSE tracker
class NSETrackerIntegration {
    constructor() {
        this.isInitialized = false;
        this.updateInterval = null;
        this.lastUpdateTime = null;
    }

    // Initialize all enhanced components
    async initialize() {
        try {
            console.log('🚀 Initializing Enhanced NSE Tracker...');

            // Wait for Chart.js to be available
            await this.waitForChartJS();

            // Initialize chart manager
            if (window.chartManager) {
                await window.chartManager.initialize();
                console.log('✅ Chart Manager ready');
            }

            // Initialize signal analyzer
            if (window.signalAnalyzer) {
                console.log('✅ Signal Analyzer ready');
            }

            // Initialize enhanced UI
            if (window.enhancedUI) {
                window.enhancedUI.initialize();
                console.log('✅ Enhanced UI ready');
            }

            // Override existing chart update function
            this.overrideChartUpdates();

            // Setup automatic signal analysis
            this.setupSignalAnalysis();

            // Setup data refresh
            this.setupDataRefresh();

            this.isInitialized = true;
            console.log('🎉 Enhanced NSE Tracker initialized successfully!');

            // Show welcome notification
            this.showWelcomeMessage();

            return true;
        } catch (error) {
            console.error('❌ Enhanced NSE Tracker initialization failed:', error);
            return false;
        }
    }

    // Wait for Chart.js to be available
    waitForChartJS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;

            const checkChart = () => {
                if (typeof Chart !== 'undefined') {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkChart, 100);
                } else {
                    reject(new Error('Chart.js not available after waiting'));
                }
            };

            checkChart();
        });
    }

    // Override existing chart update functions
    overrideChartUpdates() {
        // Store original function
        const originalUpdateCharts = window.updateChartsWithHistoricalData;

        // Override with enhanced version
        window.updateChartsWithHistoricalData = () => {
            try {
                // Call original function first
                if (originalUpdateCharts) {
                    originalUpdateCharts();
                }

                // Then update with enhanced features - with better data checking
                this.syncDataToChartManager();

                // Analyze signals
                this.analyzeCurrentSignals();

                this.lastUpdateTime = Date.now();
                console.log('📊 Charts updated with enhanced features');

            } catch (error) {
                console.error('❌ Enhanced chart update failed:', error);
                // Fallback to original function
                if (originalUpdateCharts) {
                    originalUpdateCharts();
                }
            }
        };

        // Also override the data loading function to ensure chart manager gets the data
        const originalLoadHistoricalData = window.loadHistoricalChartData;
        if (originalLoadHistoricalData) {
            window.loadHistoricalChartData = async () => {
                try {
                    await originalLoadHistoricalData();
                    
                    // After data is loaded, sync to chart manager
                    setTimeout(() => {
                        this.syncDataToChartManager();
                    }, 500);
                    
                } catch (error) {
                    console.error('❌ Enhanced historical data loading failed:', error);
                    if (originalLoadHistoricalData) {
                        await originalLoadHistoricalData();
                    }
                }
            };
        }

        // Also hook into the API response handling
        const originalApiCall = window.apiCall;
        if (originalApiCall) {
            window.apiCall = async (endpoint, options = {}) => {
                try {
                    const result = await originalApiCall(endpoint, options);
                    
                    // If this was a historical data call, sync the data
                    if (endpoint.includes('historical') && window.chartManager) {
                        setTimeout(() => {
                            this.syncDataToChartManager();
                        }, 200);
                    }
                    
                    return result;
                } catch (error) {
                    throw error;
                }
            };
        }
    }

    // Improved data synchronization
    syncDataToChartManager() {
        if (!window.chartManager) {
            console.log('⚠️ Chart manager not available');
            return;
        }

        // Try multiple sources for historical data
        let dataSource = null;
        let sourceName = '';

        if (window.historicalData && window.historicalData.timestamps) {
            dataSource = window.historicalData;
            sourceName = 'window.historicalData';
        } else if (window.debugFunctions && window.debugFunctions.historicalData) {
            const debugData = window.debugFunctions.historicalData();
            if (debugData && debugData.timestamps) {
                dataSource = debugData;
                sourceName = 'debugFunctions.historicalData()';
            }
        }

        if (dataSource) {
            console.log(`🔄 Syncing data to chart manager from ${sourceName}:`, {
                timestamps: dataSource.timestamps?.length || 0,
                spotPrices: dataSource.spotPrices?.length || 0,
                calls: dataSource.calls ? Object.keys(dataSource.calls) : 'none',
                puts: dataSource.puts ? Object.keys(dataSource.puts) : 'none',
                ratios: dataSource.ratios ? Object.keys(dataSource.ratios) : 'none'
            });

            window.chartManager.setRawData(dataSource);
            
            // Force update charts with current time range
            setTimeout(() => {
                window.chartManager.updateAllCharts();
                console.log('📊 Enhanced charts updated with time range:', window.chartManager.currentTimeRange);
            }, 100);
        } else {
            console.log('⚠️ No historical data found in any source');
            console.log('Available global variables:', {
                historicalData: !!window.historicalData,
                debugFunctions: !!window.debugFunctions,
                chartsReady: !!window.chartsReady
            });
        }
    }

    // Setup automatic signal analysis
    setupSignalAnalysis() {
        // Analyze signals every 30 seconds when data is available
        setInterval(() => {
            if (this.isInitialized && window.chartManager && window.signalAnalyzer) {
                this.analyzeCurrentSignals();
            }
        }, 30000);
    }

    // Analyze current signals
    analyzeCurrentSignals() {
        try {
            const data = window.chartManager?.getCurrentData();
            if (!data || !window.signalAnalyzer || !window.enhancedUI) return;

            const signalData = window.signalAnalyzer.analyzeMarketSignals(data);
            window.enhancedUI.updateSignalPanel(signalData);

            // Add high priority signals as alerts
            const highPrioritySignals = signalData.signals.filter(s => s.priority === 'HIGH');
            highPrioritySignals.forEach(signal => {
                if (window.enhancedUI.alertsEnabled) {
                    window.enhancedUI.addAlert(signal);
                }
            });

            // Log signal summary
            if (signalData.signals.length > 0) {
                console.log(`📊 Signal Analysis: ${signalData.summary.bias} bias with ${signalData.signals.length} signals`);
            }

        } catch (error) {
            console.error('❌ Signal analysis failed:', error);
        }
    }

    // Setup data refresh
    setupDataRefresh() {
        // Refresh data every 5 minutes
        this.updateInterval = setInterval(() => {
            if (this.isInitialized) {
                this.refreshAllData();
            }
        }, 5 * 60 * 1000);
    }

    // Refresh all data
    async refreshAllData() {
        try {
            console.log('🔄 Refreshing all data...');

            // Trigger historical data reload
            if (window.loadHistoricalData) {
                await window.loadHistoricalData();
            }

            // Update charts
            if (window.updateChartsWithHistoricalData) {
                window.updateChartsWithHistoricalData();
            }

            // Refresh signals
            if (window.enhancedUI) {
                window.enhancedUI.refreshSignals();
            }

            console.log('✅ Data refresh completed');

        } catch (error) {
            console.error('❌ Data refresh failed:', error);
        }
    }

    // Show welcome message
    showWelcomeMessage() {
        if (window.enhancedUI) {
            const welcomeAlert = {
                type: 'NEUTRAL',
                priority: 'MEDIUM',
                message: 'Enhanced NSE Tracker loaded! New features: Time range selection, advanced signals, and improved UI.',
                timestamp: Date.now()
            };
            
            setTimeout(() => {
                window.enhancedUI.addAlert(welcomeAlert);
            }, 2000);
        }
    }

    // Cleanup
    cleanup() {
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            chartManager: !!window.chartManager?.isInitialized,
            signalAnalyzer: !!window.signalAnalyzer,
            enhancedUI: !!window.enhancedUI?.isInitialized,
            lastUpdate: this.lastUpdateTime,
            dataAvailable: !!window.historicalData,
            chartsReady: !!window.chartsReady
        };
    }

    // Manually trigger data loading and sync
    async manualDataSync() {
        console.log('🔄 Manual data sync started...');
        
        try {
            // First, try to load historical data
            if (window.loadHistoricalChartData) {
                console.log('📊 Loading historical chart data...');
                await window.loadHistoricalChartData();
            }
            
            // Wait a bit for data to be processed
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Then sync to chart manager
            this.syncDataToChartManager();
            
            console.log('✅ Manual data sync completed');
            return true;
            
        } catch (error) {
            console.error('❌ Manual data sync failed:', error);
            return false;
        }
    }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isInitialized = false;
        console.log('🧹 Enhanced NSE Tracker cleaned up');
    }
}

// Create global integration instance
window.nseIntegration = new NSETrackerIntegration();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for existing scripts to load
    setTimeout(() => {
        window.nseIntegration.initialize();
    }, 1000);
});

// Add global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + D: Show debug info
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        console.log('🔍 System Status:', window.nseIntegration.getSystemStatus());
        
        if (window.showDebugInfo) {
            window.showDebugInfo();
        }
    }
    
    // Ctrl/Cmd + Shift + R: Force refresh
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        window.nseIntegration.refreshAllData();
    }
});

// Export for debugging
window.debugNSE = {
    integration: window.nseIntegration,
    chartManager: () => window.chartManager,
    signalAnalyzer: () => window.signalAnalyzer,
    enhancedUI: () => window.enhancedUI,
    status: () => window.nseIntegration.getSystemStatus(),
    debugCharts: () => window.chartManager?.debugDataStatus(),
    forceSync: () => {
        if (window.nseIntegration) {
            console.log('🔄 Force syncing via integration');
            window.nseIntegration.syncDataToChartManager();
            return window.chartManager?.debugDataStatus();
        }
        return 'Integration not available';
    },
    manualSync: async () => {
        if (window.nseIntegration) {
            console.log('🔄 Manual data sync triggered');
            const result = await window.nseIntegration.manualDataSync();
            return { success: result, status: window.chartManager?.debugDataStatus() };
        }
        return 'Integration not available';
    },
    testTimeRange: (range) => {
        if (window.chartManager) {
            console.log(`🧪 Testing time range: ${range}`);
            window.chartManager.changeTimeRange(range);
            return window.chartManager.debugDataStatus();
        }
        return 'Chart manager not available';
    },
    checkGlobalData: () => {
        return {
            historicalData: {
                available: !!window.historicalData,
                hasTimestamps: !!(window.historicalData?.timestamps),
                timestampCount: window.historicalData?.timestamps?.length || 0,
                structure: window.historicalData ? Object.keys(window.historicalData) : []
            },
            debugFunctions: {
                available: !!window.debugFunctions,
                historicalDataFunc: !!(window.debugFunctions?.historicalData)
            },
            charts: {
                spotChart: !!window.spotChart,
                callChart: !!window.callChart,
                putChart: !!window.putChart,
                volumeChart: !!window.volumeChart,
                oiChart: !!window.oiChart,
                pcrChart: !!window.pcrChart
            }
        };
    }
};
