// Enhanced Chart Management with Time Range Selection
class ChartManager {
    constructor() {
        this.charts = {};
        this.currentTimeRange = '1d';
        this.rawData = null;
        this.filteredData = null;
        this.isInitialized = false;
        
        // Time range configurations
        this.timeRanges = {
            '1h': { label: '1 Hour', minutes: 60 },
            '3h': { label: '3 Hours', minutes: 180 },
            '6h': { label: '6 Hours', minutes: 360 },
            '1d': { label: '1 Day', minutes: 1440 },
            '3d': { label: '3 Days', minutes: 4320 },
            '1w': { label: '1 Week', minutes: 10080 },
            'all': { label: 'All Data', minutes: null }
        };
        
        // Enhanced color schemes
        this.colorSchemes = {
            spot: {
                primary: '#2563eb',
                secondary: 'rgba(37, 99, 235, 0.1)',
                gradient: ['#2563eb', '#3b82f6']
            },
            calls: {
                primary: '#059669',
                secondary: 'rgba(5, 150, 105, 0.1)',
                volume: '#10b981',
                gradient: ['#059669', '#10b981']
            },
            puts: {
                primary: '#dc2626',
                secondary: 'rgba(220, 38, 38, 0.1)',
                volume: '#ef4444',
                gradient: ['#dc2626', '#ef4444']
            },
            volume: {
                calls: '#10b981',
                puts: '#ef4444',
                gradient: ['#10b981', '#ef4444']
            },
            oi: {
                calls: '#0891b2',
                puts: '#c2410c',
                gradient: ['#0891b2', '#c2410c']
            },
            pcr: {
                volume: '#7c3aed',
                oi: '#db2777',
                gradient: ['#7c3aed', '#db2777']
            }
        };
    }

    // Initialize chart manager
    async initialize() {
        try {
            this.createTimeRangeControls();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ Chart Manager initialized');
            return true;
        } catch (error) {
            console.error('❌ Chart Manager initialization failed:', error);
            return false;
        }
    }

    // Create time range control buttons
    createTimeRangeControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'time-range-controls';
        controlsContainer.innerHTML = `
            <div class="time-range-header">
                <h4>📊 Chart Time Range</h4>
                <div class="range-info">
                    <span id="dataPointsCount">0 points</span>
                    <span id="timeRangeInfo">Last updated: --</span>
                </div>
            </div>
            <div class="time-range-buttons">
                ${Object.entries(this.timeRanges).map(([key, config]) => `
                    <button class="btn btn-time-range ${key === this.currentTimeRange ? 'active' : ''}" 
                            data-range="${key}">
                        ${config.label}
                    </button>
                `).join('')}
            </div>
            <div class="chart-controls">
                <button class="btn btn-secondary" id="refreshCharts">🔄 Refresh</button>
                <button class="btn btn-success" id="syncData">🔗 Sync Data</button>
                <button class="btn btn-info" id="exportChartData">📊 Export</button>
                <button class="btn btn-warning" id="resetZoom">🔍 Reset Zoom</button>
                <button class="btn btn-primary" id="debugCharts">🐛 Debug</button>
            </div>
        `;

        // Insert before existing charts
        const chartsContainer = document.querySelector('.grid-charts');
        if (chartsContainer) {
            chartsContainer.parentNode.insertBefore(controlsContainer, chartsContainer);
        }

        // Add CSS styles
        this.addTimeRangeStyles();
    }

    // Add CSS styles for time range controls
    addTimeRangeStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .time-range-controls {
                background: white;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .time-range-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .time-range-header h4 {
                margin: 0;
                color: #1f2937;
                font-size: 16px;
                font-weight: 600;
            }
            
            .range-info {
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: #6b7280;
            }
            
            .time-range-buttons {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
                flex-wrap: wrap;
            }
            
            .btn-time-range {
                padding: 8px 16px;
                border: 1px solid #d1d5db;
                background: white;
                color: #374151;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s;
            }
            
            .btn-time-range:hover {
                background: #f3f4f6;
                border-color: #9ca3af;
            }
            
            .btn-time-range.active {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            
            .chart-controls {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .chart-controls .btn {
                padding: 8px 12px;
                font-size: 12px;
            }
            
            .bullish-signal {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                animation: pulse-green 2s infinite;
            }
            
            .bearish-signal {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                animation: pulse-red 2s infinite;
            }
            
            @keyframes pulse-green {
                0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            }
            
            @keyframes pulse-red {
                0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            }
        `;
        document.head.appendChild(style);
    }

    // Setup event listeners
    setupEventListeners() {
        // Time range button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-time-range')) {
                const newRange = e.target.dataset.range;
                this.changeTimeRange(newRange);
            }
        });

        // Control button clicks
        document.getElementById('refreshCharts')?.addEventListener('click', () => {
            this.refreshAllCharts();
        });

        document.getElementById('syncData')?.addEventListener('click', () => {
            console.log('🔗 Manual data sync triggered');
            if (window.nseIntegration) {
                window.nseIntegration.syncDataToChartManager();
            }
        });

        document.getElementById('exportChartData')?.addEventListener('click', () => {
            this.exportCurrentData();
        });

        document.getElementById('resetZoom')?.addEventListener('click', () => {
            this.resetAllZoom();
        });

        document.getElementById('debugCharts')?.addEventListener('click', () => {
            this.debugDataStatus();
            // Also force a data sync
            if (window.nseIntegration) {
                console.log('🔄 Force syncing data via integration');
                window.nseIntegration.syncDataToChartManager();
            }
        });
    }

    // Change time range and update charts
    async changeTimeRange(newRange) {
        if (newRange === this.currentTimeRange) return;

        try {
            console.log(`🔄 Changing time range from ${this.currentTimeRange} to ${newRange}`);
            
            // Update active button
            document.querySelectorAll('.btn-time-range').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-range="${newRange}"]`)?.classList.add('active');

            this.currentTimeRange = newRange;
            
            // Filter data based on new range
            this.filterDataByTimeRange();
            
            // Update all charts
            await this.updateAllCharts();
            
            // Update info display
            this.updateRangeInfo();
            
            console.log(`✅ Time range changed to: ${this.timeRanges[newRange].label}, filtered data points: ${this.filteredData?.timestamps?.length || 0}`);
            
        } catch (error) {
            console.error('❌ Error changing time range:', error);
        }
    }

    // Filter data based on current time range
    filterDataByTimeRange() {
        if (!this.rawData || !this.rawData.timestamps) {
            console.log('⚠️ No raw data available for filtering');
            this.filteredData = null;
            return;
        }

        const range = this.timeRanges[this.currentTimeRange];
        console.log(`🔍 Filtering data for range: ${range.label}, minutes: ${range.minutes}`);
        
        if (range.minutes === null) {
            // Show all data
            this.filteredData = { ...this.rawData };
            console.log(`📊 Showing all data: ${this.filteredData.timestamps.length} points`);
            return;
        }

        const now = new Date();
        const cutoffTime = new Date(now.getTime() - (range.minutes * 60 * 1000));
        console.log(`⏰ Cutoff time: ${cutoffTime.toISOString()}`);

        // Filter all data arrays based on timestamps
        const filteredIndices = [];
        this.rawData.timestamps.forEach((timestamp, index) => {
            const dataTime = new Date(timestamp);
            if (dataTime >= cutoffTime) {
                filteredIndices.push(index);
            }
        });

        console.log(`🔍 Found ${filteredIndices.length} data points within time range`);

        if (filteredIndices.length === 0) {
            console.log('⚠️ No data points found within selected time range');
            this.filteredData = {
                timestamps: [],
                spotPrices: [],
                calls: { oi: [], volume: [], ltp: [], change: [], iv: [] },
                puts: { oi: [], volume: [], ltp: [], change: [], iv: [] },
                ratios: { pcr_volume: [], pcr_oi: [] }
            };
            return;
        }

        // Create filtered data object
        this.filteredData = {
            timestamps: filteredIndices.map(i => this.rawData.timestamps[i]),
            spotPrices: filteredIndices.map(i => this.rawData.spotPrices[i]),
            calls: {
                oi: filteredIndices.map(i => this.rawData.calls?.oi?.[i] || 0),
                volume: filteredIndices.map(i => this.rawData.calls?.volume?.[i] || 0),
                ltp: filteredIndices.map(i => this.rawData.calls?.ltp?.[i] || 0),
                change: filteredIndices.map(i => this.rawData.calls?.change?.[i] || 0),
                iv: filteredIndices.map(i => this.rawData.calls?.iv?.[i] || 0)
            },
            puts: {
                oi: filteredIndices.map(i => this.rawData.puts?.oi?.[i] || 0),
                volume: filteredIndices.map(i => this.rawData.puts?.volume?.[i] || 0),
                ltp: filteredIndices.map(i => this.rawData.puts?.ltp?.[i] || 0),
                change: filteredIndices.map(i => this.rawData.puts?.change?.[i] || 0),
                iv: filteredIndices.map(i => this.rawData.puts?.iv?.[i] || 0)
            },
            ratios: {
                pcr_volume: filteredIndices.map(i => this.rawData.ratios?.pcr_volume?.[i] || 0),
                pcr_oi: filteredIndices.map(i => this.rawData.ratios?.pcr_oi?.[i] || 0)
            }
        };

        console.log(`✅ Data filtered successfully: ${this.filteredData.timestamps.length} points`);
    }

    // Update range info display
    updateRangeInfo() {
        const dataPoints = this.filteredData ? this.filteredData.timestamps.length : 0;
        const lastUpdate = dataPoints > 0 ? 
            new Date(this.filteredData.timestamps[dataPoints - 1]).toLocaleTimeString('en-IN') : 
            '--';

        document.getElementById('dataPointsCount').textContent = `${dataPoints} points`;
        document.getElementById('timeRangeInfo').textContent = `Last: ${lastUpdate}`;
    }

    // Set raw data from API
    setRawData(data) {
        console.log('📥 Setting raw data in chart manager:', data);
        
        if (!data) {
            console.log('⚠️ No data provided to setRawData');
            this.rawData = null;
            this.filteredData = null;
            return;
        }

        // Validate data structure
        if (!data.timestamps || !Array.isArray(data.timestamps) || data.timestamps.length === 0) {
            console.log('⚠️ Invalid data structure - missing or empty timestamps');
            console.log('Data structure:', Object.keys(data));
            this.rawData = null;
            this.filteredData = null;
            return;
        }

        console.log(`✅ Valid data received with ${data.timestamps.length} timestamps`);
        
        // Ensure all required data arrays exist
        this.rawData = {
            timestamps: data.timestamps || [],
            spotPrices: data.spotPrices || [],
            calls: {
                oi: data.calls?.oi || [],
                volume: data.calls?.volume || [],
                ltp: data.calls?.ltp || [],
                change: data.calls?.change || [],
                iv: data.calls?.iv || []
            },
            puts: {
                oi: data.puts?.oi || [],
                volume: data.puts?.volume || [],
                ltp: data.puts?.ltp || [],
                change: data.puts?.change || [],
                iv: data.puts?.iv || []
            },
            ratios: {
                pcr_volume: data.ratios?.pcr_volume || [],
                pcr_oi: data.ratios?.pcr_oi || []
            }
        };

        console.log('📊 Raw data structure validated:', {
            timestamps: this.rawData.timestamps.length,
            spotPrices: this.rawData.spotPrices.length,
            callsOI: this.rawData.calls.oi.length,
            putsOI: this.rawData.puts.oi.length,
            pcrVolume: this.rawData.ratios.pcr_volume.length
        });

        // Apply current time range filter
        this.filterDataByTimeRange();
        this.updateRangeInfo();
        
        console.log(`✅ Data set successfully, filtered to ${this.filteredData?.timestamps?.length || 0} points for range ${this.currentTimeRange}`);
    }

    // Get current filtered data
    getCurrentData() {
        const data = this.filteredData || this.rawData;
        if (data) {
            console.log(`📊 getCurrentData: returning ${data.timestamps?.length || 0} data points for range ${this.currentTimeRange}`);
        }
        return data;
    }

    // Debug function to check data status
    debugDataStatus() {
        console.log('=== CHART MANAGER DEBUG ===');
        console.log('Current Time Range:', this.currentTimeRange);
        console.log('Raw Data Available:', !!this.rawData);
        console.log('Raw Data Points:', this.rawData?.timestamps?.length || 0);
        console.log('Filtered Data Available:', !!this.filteredData);
        console.log('Filtered Data Points:', this.filteredData?.timestamps?.length || 0);
        console.log('Charts Available:', Object.keys(this.charts));
        console.log('Global historicalData:', !!window.historicalData);
        console.log('Global historicalData Points:', window.historicalData?.timestamps?.length || 0);
        
        if (this.rawData && this.rawData.timestamps && this.rawData.timestamps.length > 0) {
            const firstTime = new Date(this.rawData.timestamps[0]);
            const lastTime = new Date(this.rawData.timestamps[this.rawData.timestamps.length - 1]);
            console.log('Data Time Range:', firstTime.toISOString(), 'to', lastTime.toISOString());
        }
        
        return {
            currentTimeRange: this.currentTimeRange,
            rawDataPoints: this.rawData?.timestamps?.length || 0,
            filteredDataPoints: this.filteredData?.timestamps?.length || 0,
            chartsCount: Object.keys(this.charts).length
        };
    }

    // Create enhanced chart with improved styling
    createEnhancedChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas ${canvasId} not found`);
        }

        const ctx = canvas.getContext('2d');
        
        // Enhanced chart configuration
        const enhancedConfig = {
            ...config,
            options: {
                ...config.options,
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    ...config.options.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: (context) => {
                                const timestamp = this.getCurrentData()?.timestamps[context[0].dataIndex];
                                return timestamp ? new Date(timestamp).toLocaleString('en-IN') : '';
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x'
                        },
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    ...config.options.scales,
                    x: {
                        ...config.options.scales?.x,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            color: '#6b7280',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        ...config.options.scales?.y,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, enhancedConfig);
        this.charts[canvasId] = chart;
        return chart;
    }

    // Update all charts with current filtered data
    async updateAllCharts() {
        const data = this.getCurrentData();
        if (!data || !data.timestamps || data.timestamps.length === 0) {
            console.log('⚠️ No data available for chart update');
            return;
        }

        console.log(`📊 Updating charts with ${data.timestamps.length} data points`);

        const timeLabels = data.timestamps.map(timestamp => {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'Asia/Kolkata'
            });
        });

        // Update existing charts from your original code
        const chartUpdates = [
            { chart: window.spotChart, dataKey: 'spotPrices', name: 'Spot Chart' },
            { chart: window.callChart, dataKeys: ['calls.ltp', 'calls.volume'], name: 'Call Chart' },
            { chart: window.putChart, dataKeys: ['puts.ltp', 'puts.volume'], name: 'Put Chart' },
            { chart: window.volumeChart, dataKeys: ['calls.volume', 'puts.volume'], name: 'Volume Chart' },
            { chart: window.oiChart, dataKeys: ['calls.oi', 'puts.oi'], name: 'OI Chart' },
            { chart: window.pcrChart, dataKeys: ['ratios.pcr_volume', 'ratios.pcr_oi'], name: 'PCR Chart' }
        ];

        chartUpdates.forEach(({ chart, dataKey, dataKeys, name }) => {
            if (!chart) {
                console.log(`⚠️ ${name} not found, skipping`);
                return;
            }

            try {
                // Update labels
                chart.data.labels = timeLabels;

                // Update data
                if (dataKey) {
                    // Single dataset
                    const value = this.getNestedValue(data, dataKey);
                    if (chart.data.datasets[0] && value) {
                        chart.data.datasets[0].data = value;
                        console.log(`✅ Updated ${name} with ${value.length} points`);
                    }
                } else if (dataKeys) {
                    // Multiple datasets
                    dataKeys.forEach((key, index) => {
                        const value = this.getNestedValue(data, key);
                        if (chart.data.datasets[index] && value) {
                            chart.data.datasets[index].data = value;
                        }
                    });
                    console.log(`✅ Updated ${name} with multiple datasets`);
                }

                // Update the chart
                chart.update('none'); // Fast update without animation

            } catch (error) {
                console.error(`❌ Error updating ${name}:`, error);
            }
        });

        console.log('✅ All charts updated successfully');
    }

    // Helper function to get nested object values
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // Update individual chart data
    updateChartData(chartId, chart, data, timeLabels) {
        chart.data.labels = timeLabels;

        switch (chartId) {
            case 'spotChart':
                chart.data.datasets[0].data = data.spotPrices;
                this.addTechnicalSignals(chart, data.spotPrices, 'spot');
                break;
            case 'callChart':
                chart.data.datasets[0].data = data.calls.ltp;
                if (chart.data.datasets[1]) chart.data.datasets[1].data = data.calls.volume;
                break;
            case 'putChart':
                chart.data.datasets[0].data = data.puts.ltp;
                if (chart.data.datasets[1]) chart.data.datasets[1].data = data.puts.volume;
                break;
            case 'volumeChart':
                chart.data.datasets[0].data = data.calls.volume;
                chart.data.datasets[1].data = data.puts.volume;
                break;
            case 'oiChart':
                chart.data.datasets[0].data = data.calls.oi;
                chart.data.datasets[1].data = data.puts.oi;
                break;
            case 'pcrChart':
                chart.data.datasets[0].data = data.ratios.pcr_volume;
                chart.data.datasets[1].data = data.ratios.pcr_oi;
                this.addTechnicalSignals(chart, data.ratios.pcr_volume, 'pcr');
                break;
        }

        chart.update('none'); // Fast update without animation
    }

    // Add technical signals to charts
    addTechnicalSignals(chart, data, type) {
        if (!data || data.length < 20) return;

        const signals = this.calculateTechnicalSignals(data, type);
        
        // Add signal annotations
        if (signals.length > 0) {
            chart.options.plugins.annotation = {
                annotations: signals.reduce((acc, signal, index) => {
                    acc[`signal_${index}`] = {
                        type: 'point',
                        xValue: signal.index,
                        yValue: signal.value,
                        backgroundColor: signal.type === 'bullish' ? '#10b981' : '#ef4444',
                        borderColor: signal.type === 'bullish' ? '#059669' : '#dc2626',
                        borderWidth: 2,
                        radius: 6,
                        display: true
                    };
                    return acc;
                }, {})
            };
        }
    }

    // Calculate technical signals
    calculateTechnicalSignals(data, type) {
        const signals = [];
        const length = data.length;
        
        if (length < 20) return signals;

        // Simple moving averages
        const sma5 = this.calculateSMA(data, 5);
        const sma20 = this.calculateSMA(data, 20);

        // Find crossovers
        for (let i = 1; i < length - 1; i++) {
            if (sma5[i-1] <= sma20[i-1] && sma5[i] > sma20[i]) {
                signals.push({
                    index: i,
                    value: data[i],
                    type: 'bullish',
                    message: 'Golden Cross'
                });
            } else if (sma5[i-1] >= sma20[i-1] && sma5[i] < sma20[i]) {
                signals.push({
                    index: i,
                    value: data[i],
                    type: 'bearish',
                    message: 'Death Cross'
                });
            }
        }

        return signals;
    }

    // Calculate Simple Moving Average
    calculateSMA(data, period) {
        const sma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma.push(null);
            } else {
                const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                sma.push(sum / period);
            }
        }
        return sma;
    }

    // Refresh all charts
    refreshAllCharts() {
        console.log('🔄 Refreshing all charts...');
        this.updateAllCharts();
    }

    // Reset zoom on all charts
    resetAllZoom() {
        Object.values(this.charts).forEach(chart => {
            if (chart.resetZoom) {
                chart.resetZoom();
            }
        });
        console.log('🔍 Zoom reset on all charts');
    }

    // Export current chart data
    exportCurrentData() {
        const data = this.getCurrentData();
        if (!data) {
            alert('No data available to export');
            return;
        }

        const exportData = {
            timeRange: this.currentTimeRange,
            dataPoints: data.timestamps.length,
            exportTime: new Date().toISOString(),
            data: data
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nifty-chart-data-${this.currentTimeRange}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('📊 Chart data exported');
    }
}

// Initialize enhanced chart manager
window.chartManager = new ChartManager();
