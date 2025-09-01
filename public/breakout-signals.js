/**
 * Breakout Signals Module
 * Handles real-time breakout pattern detection and alerts
 */

class BreakoutSignalsManager {
    constructor() {
        this.signals = [];
        this.isEnabled = true;
        this.refreshInterval = 30000; // 30 seconds
        this.alertSound = null;
        this.lastAlertTime = 0;
        this.alertCooldown = 60000; // 1 minute cooldown between audio alerts
        
        this.init();
    }

    init() {
        this.createBreakoutUI();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.loadAudioAlert();
    }

    createBreakoutUI() {
        // Create breakout signals container
        const breakoutContainer = document.createElement('div');
        breakoutContainer.id = 'breakout-container';
        breakoutContainer.className = 'breakout-container';
        breakoutContainer.innerHTML = `
            <div class="breakout-header">
                <h3>🚨 Breakout Signals</h3>
                <div class="breakout-controls">
                    <button id="refresh-breakouts" class="btn btn-sm">Refresh</button>
                    <button id="toggle-breakouts" class="btn btn-sm">Disable</button>
                    <button id="breakout-config" class="btn btn-sm">Config</button>
                </div>
            </div>
            <div class="breakout-summary" id="breakout-summary">
                <div class="summary-item">
                    <span class="label">Total Signals:</span>
                    <span class="value" id="total-signals">0</span>
                </div>
                <div class="summary-item">
                    <span class="label">Bullish:</span>
                    <span class="value bullish" id="bullish-signals">0</span>
                </div>
                <div class="summary-item">
                    <span class="label">Bearish:</span>
                    <span class="value bearish" id="bearish-signals">0</span>
                </div>
                <div class="summary-item">
                    <span class="label">High Priority:</span>
                    <span class="value high-priority" id="high-priority-signals">0</span>
                </div>
                <div class="summary-item">
                    <span class="label">Overall Bias:</span>
                    <span class="value" id="overall-bias">NEUTRAL</span>
                </div>
            </div>
            <div class="breakout-alerts" id="breakout-alerts">
                <h4>🔥 High Priority Alerts</h4>
                <div id="alert-list" class="alert-list">
                    <div class="no-alerts">No high priority alerts</div>
                </div>
            </div>
            <div class="breakout-signals" id="breakout-signals">
                <h4>📊 All Signals</h4>
                <div id="signals-list" class="signals-list">
                    <div class="no-signals">No signals detected</div>
                </div>
            </div>
        `;

        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .breakout-container {
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                color: #fff;
            }
            
            .breakout-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #333;
                padding-bottom: 10px;
            }
            
            .breakout-header h3 {
                margin: 0;
                color: #ff6b35;
            }
            
            .breakout-controls {
                display: flex;
                gap: 8px;
            }
            
            .breakout-controls .btn {
                padding: 4px 8px;
                font-size: 12px;
                background: #333;
                color: #fff;
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .breakout-controls .btn:hover {
                background: #555;
            }
            
            .breakout-summary {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                margin-bottom: 15px;
                padding: 10px;
                background: #2a2a2a;
                border-radius: 6px;
            }
            
            .summary-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 80px;
            }
            
            .summary-item .label {
                font-size: 11px;
                color: #aaa;
                margin-bottom: 2px;
            }
            
            .summary-item .value {
                font-size: 16px;
                font-weight: bold;
                color: #fff;
            }
            
            .summary-item .value.bullish {
                color: #4caf50;
            }
            
            .summary-item .value.bearish {
                color: #f44336;
            }
            
            .summary-item .value.high-priority {
                color: #ff6b35;
            }
            
            .breakout-alerts, .breakout-signals {
                margin-bottom: 15px;
            }
            
            .breakout-alerts h4, .breakout-signals h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #ccc;
            }
            
            .alert-list, .signals-list {
                max-height: 200px;
                overflow-y: auto;
            }
            
            .alert-item, .signal-item {
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 8px;
                transition: all 0.2s;
            }
            
            .alert-item {
                border-left: 4px solid #ff6b35;
                animation: pulse 2s infinite;
            }
            
            .alert-item.bullish {
                border-left-color: #4caf50;
            }
            
            .alert-item.bearish {
                border-left-color: #f44336;
            }
            
            .signal-item.bullish {
                border-left: 3px solid #4caf50;
            }
            
            .signal-item.bearish {
                border-left: 3px solid #f44336;
            }
            
            .signal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }
            
            .signal-type {
                font-weight: bold;
                font-size: 12px;
                padding: 2px 6px;
                border-radius: 3px;
                text-transform: uppercase;
            }
            
            .signal-type.bullish {
                background: #4caf50;
                color: white;
            }
            
            .signal-type.bearish {
                background: #f44336;
                color: white;
            }
            
            .signal-confidence {
                font-size: 11px;
                color: #aaa;
            }
            
            .signal-pattern {
                font-size: 11px;
                color: #888;
                margin-bottom: 3px;
            }
            
            .signal-message {
                font-size: 13px;
                color: #fff;
                margin-bottom: 5px;
            }
            
            .signal-details {
                font-size: 11px;
                color: #aaa;
                display: flex;
                justify-content: space-between;
            }
            
            .no-alerts, .no-signals {
                text-align: center;
                color: #666;
                padding: 20px;
                font-style: italic;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            .breakout-disabled {
                opacity: 0.5;
                pointer-events: none;
            }
        `;
        
        document.head.appendChild(style);

        // Insert after the main container
        const mainContainer = document.querySelector('.container') || document.body;
        mainContainer.appendChild(breakoutContainer);
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-breakouts')?.addEventListener('click', () => {
            this.fetchBreakoutData();
        });

        // Toggle button
        document.getElementById('toggle-breakouts')?.addEventListener('click', (e) => {
            this.isEnabled = !this.isEnabled;
            e.target.textContent = this.isEnabled ? 'Disable' : 'Enable';
            
            const container = document.getElementById('breakout-container');
            if (this.isEnabled) {
                container.classList.remove('breakout-disabled');
                this.startAutoRefresh();
            } else {
                container.classList.add('breakout-disabled');
                this.stopAutoRefresh();
            }
        });

        // Config button
        document.getElementById('breakout-config')?.addEventListener('click', () => {
            this.showConfigModal();
        });
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        if (this.isEnabled) {
            this.fetchBreakoutData(); // Initial fetch
            this.refreshTimer = setInterval(() => {
                if (this.isEnabled) {
                    this.fetchBreakoutData();
                }
            }, this.refreshInterval);
        }
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async fetchBreakoutData() {
        try {
            // Fetch current data with breakout signals
            const response = await fetch('/api/nifty-data');
            const data = await response.json();
            
            if (data.success && data.breakout_signals) {
                this.signals = data.breakout_signals.signals || [];
                this.updateUI(data.breakout_signals);
                
                // Check for high priority alerts
                const highPrioritySignals = this.signals.filter(s => s.strength > 0.7);
                if (highPrioritySignals.length > 0) {
                    this.triggerAlert(highPrioritySignals);
                }
            }
        } catch (error) {
            console.error('Error fetching breakout data:', error);
        }
    }

    updateUI(analysisData) {
        // Update summary
        document.getElementById('total-signals').textContent = analysisData.summary.totalSignals;
        document.getElementById('bullish-signals').textContent = analysisData.summary.bullishSignals;
        document.getElementById('bearish-signals').textContent = analysisData.summary.bearishSignals;
        document.getElementById('high-priority-signals').textContent = analysisData.summary.highPrioritySignals;
        
        const overallBias = document.getElementById('overall-bias');
        overallBias.textContent = analysisData.summary.overallBias;
        overallBias.className = `value ${analysisData.summary.overallBias.toLowerCase()}`;

        // Update alerts
        this.updateAlerts(analysisData.signals.filter(s => s.priority === 'HIGH'));
        
        // Update all signals
        this.updateSignals(analysisData.signals);
    }

    updateAlerts(highPrioritySignals) {
        const alertList = document.getElementById('alert-list');
        
        if (highPrioritySignals.length === 0) {
            alertList.innerHTML = '<div class="no-alerts">No high priority alerts</div>';
            return;
        }

        alertList.innerHTML = highPrioritySignals.map(signal => `
            <div class="alert-item ${signal.type.toLowerCase()}">
                <div class="signal-header">
                    <span class="signal-type ${signal.type.toLowerCase()}">${signal.type}</span>
                    <span class="signal-confidence">${signal.confidence}% confidence</span>
                </div>
                <div class="signal-pattern">${this.formatPatternName(signal.pattern)}</div>
                <div class="signal-message">${signal.message}</div>
                <div class="signal-details">
                    <span>Price: ₹${signal.spotPrice.toFixed(2)}</span>
                    <span>${this.formatTime(signal.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    updateSignals(signals) {
        const signalsList = document.getElementById('signals-list');
        
        if (signals.length === 0) {
            signalsList.innerHTML = '<div class="no-signals">No signals detected</div>';
            return;
        }

        // Sort signals by confidence and timestamp
        const sortedSignals = signals.sort((a, b) => {
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence;
            }
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        signalsList.innerHTML = sortedSignals.map(signal => `
            <div class="signal-item ${signal.type.toLowerCase()}">
                <div class="signal-header">
                    <span class="signal-type ${signal.type.toLowerCase()}">${signal.type}</span>
                    <span class="signal-confidence">${signal.confidence}% confidence</span>
                </div>
                <div class="signal-pattern">${this.formatPatternName(signal.pattern)}</div>
                <div class="signal-message">${signal.message}</div>
                <div class="signal-details">
                    <span>Price: ₹${signal.spotPrice.toFixed(2)}</span>
                    <span>${this.formatTime(signal.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    formatPatternName(pattern) {
        return pattern.replace(/_/g, ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }

    triggerAlert(highPrioritySignals) {
        const now = Date.now();
        
        // Check cooldown
        if (now - this.lastAlertTime < this.alertCooldown) {
            return;
        }

        // Play sound alert
        if (this.alertSound) {
            this.alertSound.play().catch(e => console.log('Audio play failed:', e));
        }

        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const signal = highPrioritySignals[0];
            new Notification('🚨 Breakout Alert!', {
                body: `${signal.type} ${this.formatPatternName(signal.pattern)}: ${signal.message}`,
                icon: '/favicon.ico',
                tag: 'breakout-alert'
            });
        }

        // Flash the alerts section
        const alertsSection = document.getElementById('breakout-alerts');
        alertsSection.style.background = '#ff6b35';
        setTimeout(() => {
            alertsSection.style.background = '';
        }, 1000);

        this.lastAlertTime = now;
    }

    loadAudioAlert() {
        // Create a simple beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            const createBeep = () => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            };

            this.alertSound = { play: createBeep };
        } catch (error) {
            console.log('Audio context not available:', error);
        }
    }

    showConfigModal() {
        // Simple config modal - could be enhanced
        const config = prompt(`
Breakout Detection Configuration:

Current settings:
- Volume Multiplier: 2.5x
- OI Change Threshold: 15%
- VWAP Distance: 0.1%
- Min Confidence: 60%

Enter new min confidence threshold (30-90):
        `);

        if (config && !isNaN(config)) {
            const confidence = Math.max(30, Math.min(90, parseInt(config)));
            this.updateConfig({ minConfidenceThreshold: confidence });
        }
    }

    async updateConfig(configUpdate) {
        try {
            const response = await fetch('/api/breakouts/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configUpdate)
            });

            const data = await response.json();
            if (data.success) {
                alert('Configuration updated successfully!');
                this.fetchBreakoutData(); // Refresh with new config
            } else {
                alert('Failed to update configuration: ' + data.message);
            }
        } catch (error) {
            console.error('Error updating config:', error);
            alert('Error updating configuration');
        }
    }

    // Request notification permission
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// Initialize breakout signals manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.breakoutSignals = new BreakoutSignalsManager();
    
    // Request notification permission
    window.breakoutSignals.requestNotificationPermission();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreakoutSignalsManager;
}
