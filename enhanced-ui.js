// Enhanced UI Components for NSE Tracker
class EnhancedUI {
    constructor() {
        this.signalPanel = null;
        this.alertsPanel = null;
        this.isInitialized = false;
        this.notifications = [];
        this.soundEnabled = true;
    }

    // Initialize enhanced UI
    initialize() {
        try {
            this.createSignalPanel();
            this.createAlertsPanel();
            this.createNotificationSystem();
            this.enhanceExistingUI();
            this.setupKeyboardShortcuts();
            this.isInitialized = true;
            console.log('✅ Enhanced UI initialized');
            return true;
        } catch (error) {
            console.error('❌ Enhanced UI initialization failed:', error);
            return false;
        }
    }

    // Create signal analysis panel
    createSignalPanel() {
        const signalPanel = document.createElement('div');
        signalPanel.className = 'signal-panel';
        signalPanel.innerHTML = `
            <div class="signal-header">
                <h3>🎯 Market Signals</h3>
                <div class="signal-controls">
                    <button class="btn btn-sm btn-info" id="refreshSignals">🔄 Refresh</button>
                    <button class="btn btn-sm btn-secondary" id="signalSettings">⚙️ Settings</button>
                </div>
            </div>
            
            <div class="signal-summary">
                <div class="signal-strength-meter">
                    <div class="strength-label">Market Strength</div>
                    <div class="strength-bar">
                        <div class="strength-fill" id="strengthFill"></div>
                        <div class="strength-value" id="strengthValue">0</div>
                    </div>
                </div>
                
                <div class="signal-counts">
                    <div class="signal-count bullish">
                        <span class="count" id="bullishCount">0</span>
                        <span class="label">Bullish</span>
                    </div>
                    <div class="signal-count bearish">
                        <span class="count" id="bearishCount">0</span>
                        <span class="label">Bearish</span>
                    </div>
                    <div class="signal-count neutral">
                        <span class="count" id="neutralCount">0</span>
                        <span class="label">Neutral</span>
                    </div>
                </div>
            </div>

            <div class="recommendation-panel">
                <div class="recommendation-header">
                    <span class="recommendation-label">Recommendation:</span>
                    <span class="recommendation-action" id="recommendationAction">HOLD</span>
                    <span class="recommendation-confidence" id="recommendationConfidence">LOW</span>
                </div>
                <div class="recommendation-reasoning" id="recommendationReasoning">
                    Analyzing market data...
                </div>
            </div>

            <div class="signals-list" id="signalsList">
                <div class="no-signals">No signals detected</div>
            </div>
        `;

        // Insert after controls
        const controlsSection = document.querySelector('.controls');
        if (controlsSection) {
            controlsSection.parentNode.insertBefore(signalPanel, controlsSection.nextSibling);
        }

        this.signalPanel = signalPanel;
        this.setupSignalPanelEvents();
    }

    // Create alerts panel
    createAlertsPanel() {
        const alertsPanel = document.createElement('div');
        alertsPanel.className = 'alerts-panel';
        alertsPanel.innerHTML = `
            <div class="alerts-header">
                <h3>🚨 Live Alerts</h3>
                <div class="alerts-controls">
                    <button class="btn btn-sm btn-success" id="enableAlerts">🔔 Enable</button>
                    <button class="btn btn-sm btn-danger" id="clearAlerts">🗑️ Clear</button>
                </div>
            </div>
            
            <div class="alerts-list" id="alertsList">
                <div class="no-alerts">No alerts</div>
            </div>
        `;

        // Insert before logs section
        const logsSection = document.querySelector('.logs-section');
        if (logsSection) {
            logsSection.parentNode.insertBefore(alertsPanel, logsSection);
        }

        this.alertsPanel = alertsPanel;
        this.setupAlertsPanelEvents();
    }

    // Create notification system
    createNotificationSystem() {
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        notificationContainer.id = 'notificationContainer';
        document.body.appendChild(notificationContainer);
    }

    // Enhance existing UI elements
    enhanceExistingUI() {
        // Add loading states to buttons
        this.enhanceButtons();
        
        // Add tooltips to metrics
        this.addTooltips();
        
        // Enhance chart headers
        this.enhanceChartHeaders();
        
        // Add keyboard navigation
        this.addKeyboardNavigation();
    }

    // Setup signal panel events
    setupSignalPanelEvents() {
        document.getElementById('refreshSignals')?.addEventListener('click', () => {
            this.refreshSignals();
        });

        document.getElementById('signalSettings')?.addEventListener('click', () => {
            this.showSignalSettings();
        });
    }

    // Setup alerts panel events
    setupAlertsPanelEvents() {
        document.getElementById('enableAlerts')?.addEventListener('click', (e) => {
            this.toggleAlerts(e.target);
        });

        document.getElementById('clearAlerts')?.addEventListener('click', () => {
            this.clearAlerts();
        });
    }

    // Update signal panel with new data
    updateSignalPanel(signalData) {
        if (!this.signalPanel || !signalData) return;

        const { signals, summary, strength, recommendation } = signalData;

        // Update strength meter
        this.updateStrengthMeter(strength);

        // Update signal counts
        document.getElementById('bullishCount').textContent = summary.bullish;
        document.getElementById('bearishCount').textContent = summary.bearish;
        document.getElementById('neutralCount').textContent = summary.neutral;

        // Update recommendation
        this.updateRecommendation(recommendation);

        // Update signals list
        this.updateSignalsList(signals);
    }

    // Update strength meter
    updateStrengthMeter(strength) {
        const strengthFill = document.getElementById('strengthFill');
        const strengthValue = document.getElementById('strengthValue');

        if (!strengthFill || !strengthValue) return;

        const normalizedStrength = Math.max(-100, Math.min(100, strength));
        const percentage = Math.abs(normalizedStrength);
        const isPositive = normalizedStrength >= 0;

        strengthFill.style.width = `${percentage}%`;
        strengthFill.className = `strength-fill ${isPositive ? 'bullish' : 'bearish'}`;
        strengthValue.textContent = normalizedStrength.toFixed(0);
        strengthValue.className = `strength-value ${isPositive ? 'bullish' : 'bearish'}`;
    }

    // Update recommendation display
    updateRecommendation(recommendation) {
        const actionElement = document.getElementById('recommendationAction');
        const confidenceElement = document.getElementById('recommendationConfidence');
        const reasoningElement = document.getElementById('recommendationReasoning');

        if (!actionElement || !confidenceElement || !reasoningElement) return;

        actionElement.textContent = recommendation.action;
        actionElement.className = `recommendation-action ${recommendation.action.toLowerCase()}`;

        confidenceElement.textContent = recommendation.confidence;
        confidenceElement.className = `recommendation-confidence ${recommendation.confidence.toLowerCase()}`;

        reasoningElement.textContent = recommendation.reasoning;
    }

    // Update signals list
    updateSignalsList(signals) {
        const signalsList = document.getElementById('signalsList');
        if (!signalsList) return;

        if (signals.length === 0) {
            signalsList.innerHTML = '<div class="no-signals">No signals detected</div>';
            return;
        }

        // Sort signals by priority and strength
        const sortedSignals = signals.sort((a, b) => {
            const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            const strengthOrder = { 'STRONG': 3, 'MODERATE': 2, 'WEAK': 1 };
            
            return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1) ||
                   (strengthOrder[b.strength] || 1) - (strengthOrder[a.strength] || 1);
        });

        signalsList.innerHTML = sortedSignals.map(signal => `
            <div class="signal-item ${signal.type.toLowerCase()} ${signal.strength.toLowerCase()}">
                <div class="signal-header">
                    <span class="signal-type">${signal.type}</span>
                    <span class="signal-strength">${signal.strength}</span>
                    <span class="signal-time">${new Date(signal.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="signal-message">${signal.message}</div>
                <div class="signal-indicator">${signal.indicator}</div>
            </div>
        `).join('');
    }

    // Add new alert
    addAlert(alert) {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        // Remove "no alerts" message
        const noAlerts = alertsList.querySelector('.no-alerts');
        if (noAlerts) {
            noAlerts.remove();
        }

        const alertElement = document.createElement('div');
        alertElement.className = `alert-item ${alert.type.toLowerCase()} ${alert.priority.toLowerCase()}`;
        alertElement.innerHTML = `
            <div class="alert-header">
                <span class="alert-type">${alert.type}</span>
                <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="alert-message">${alert.message}</div>
        `;

        // Add to top of list
        alertsList.insertBefore(alertElement, alertsList.firstChild);

        // Limit to 20 alerts
        const alerts = alertsList.querySelectorAll('.alert-item');
        if (alerts.length > 20) {
            alerts[alerts.length - 1].remove();
        }

        // Show notification
        this.showNotification(alert);

        // Play sound if enabled
        if (this.soundEnabled && alert.priority === 'HIGH') {
            this.playAlertSound();
        }
    }

    // Show notification
    showNotification(alert) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${alert.type.toLowerCase()}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${alert.type} Signal</div>
                <div class="notification-message">${alert.message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);

        // Add to notifications array
        this.notifications.push({
            ...alert,
            id: Date.now()
        });
    }

    // Play alert sound
    playAlertSound() {
        try {
            // Create audio context for beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        } catch (error) {
            console.log('Audio not available');
        }
    }

    // Toggle alerts
    toggleAlerts(button) {
        this.alertsEnabled = !this.alertsEnabled;
        button.textContent = this.alertsEnabled ? '🔔 Enabled' : '🔕 Disabled';
        button.className = this.alertsEnabled ? 'btn btn-sm btn-success' : 'btn btn-sm btn-secondary';
    }

    // Clear all alerts
    clearAlerts() {
        const alertsList = document.getElementById('alertsList');
        if (alertsList) {
            alertsList.innerHTML = '<div class="no-alerts">No alerts</div>';
        }
        this.notifications = [];
    }

    // Refresh signals
    refreshSignals() {
        if (window.signalAnalyzer && window.chartManager) {
            const data = window.chartManager.getCurrentData();
            if (data) {
                const signalData = window.signalAnalyzer.analyzeMarketSignals(data);
                this.updateSignalPanel(signalData);
                
                // Add high priority signals as alerts
                signalData.signals.filter(s => s.priority === 'HIGH').forEach(signal => {
                    this.addAlert(signal);
                });
            }
        }
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + R: Refresh signals
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshSignals();
            }
            
            // Ctrl/Cmd + A: Toggle alerts
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                const alertButton = document.getElementById('enableAlerts');
                if (alertButton) {
                    this.toggleAlerts(alertButton);
                }
            }
            
            // Escape: Clear notifications
            if (e.key === 'Escape') {
                const notifications = document.querySelectorAll('.notification');
                notifications.forEach(n => n.remove());
            }
        });
    }

    // Enhance buttons with loading states
    enhanceButtons() {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                if (!this.disabled) {
                    this.classList.add('loading');
                    setTimeout(() => {
                        this.classList.remove('loading');
                    }, 1000);
                }
            });
        });
    }

    // Add tooltips to metrics
    addTooltips() {
        const metrics = document.querySelectorAll('.metric');
        metrics.forEach(metric => {
            const label = metric.querySelector('span:first-child')?.textContent;
            if (label) {
                metric.title = this.getTooltipText(label);
            }
        });
    }

    // Get tooltip text for metrics
    getTooltipText(label) {
        const tooltips = {
            'Spot Price': 'Current NIFTY index price',
            'ATM Strike': 'At-the-money strike price',
            'Call OI': 'Total Call Open Interest',
            'Put OI': 'Total Put Open Interest',
            'Call Volume': 'Total Call trading volume',
            'Put Volume': 'Total Put trading volume',
            'PCR (Volume)': 'Put-Call Ratio based on volume',
            'PCR (OI)': 'Put-Call Ratio based on Open Interest',
            'Max Pain': 'Strike price with maximum pain for option writers'
        };
        return tooltips[label] || label;
    }

    // Enhance chart headers
    enhanceChartHeaders() {
        const chartContainers = document.querySelectorAll('.card');
        chartContainers.forEach(container => {
            const header = container.querySelector('h3');
            if (header && header.textContent.includes('Chart')) {
                const controls = document.createElement('div');
                controls.className = 'chart-mini-controls';
                controls.innerHTML = `
                    <button class="btn-mini" title="Fullscreen">⛶</button>
                    <button class="btn-mini" title="Download">⬇</button>
                `;
                header.appendChild(controls);
            }
        });
    }

    // Add keyboard navigation
    addKeyboardNavigation() {
        let focusIndex = 0;
        const focusableElements = document.querySelectorAll('button, input, select');

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                focusIndex = Math.max(0, focusIndex - 1);
                focusableElements[focusIndex]?.focus();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                focusIndex = Math.min(focusableElements.length - 1, focusIndex + 1);
                focusableElements[focusIndex]?.focus();
            }
        });
    }

    // Show signal settings modal
    showSignalSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Signal Settings</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group">
                        <label>PCR Oversold Threshold</label>
                        <input type="number" value="0.7" step="0.1" min="0.1" max="2.0">
                    </div>
                    <div class="setting-group">
                        <label>PCR Overbought Threshold</label>
                        <input type="number" value="1.3" step="0.1" min="0.1" max="2.0">
                    </div>
                    <div class="setting-group">
                        <label>Volume Spike Multiplier</label>
                        <input type="number" value="2.0" step="0.1" min="1.0" max="5.0">
                    </div>
                    <div class="setting-group">
                        <label>Enable Sound Alerts</label>
                        <input type="checkbox" ${this.soundEnabled ? 'checked' : ''}>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Save</button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Add enhanced CSS styles
const enhancedStyles = `
    .signal-panel, .alerts-panel {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .signal-header, .alerts-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }

    .signal-summary {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 20px;
        margin-bottom: 20px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
    }

    .strength-bar {
        position: relative;
        width: 200px;
        height: 20px;
        background: #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
    }

    .strength-fill {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 10px;
    }

    .strength-fill.bullish {
        background: linear-gradient(90deg, #10b981, #059669);
    }

    .strength-fill.bearish {
        background: linear-gradient(90deg, #ef4444, #dc2626);
    }

    .strength-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: 600;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }

    .signal-counts {
        display: flex;
        gap: 16px;
    }

    .signal-count {
        text-align: center;
        padding: 8px 12px;
        border-radius: 6px;
        min-width: 60px;
    }

    .signal-count.bullish {
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
    }

    .signal-count.bearish {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
    }

    .signal-count.neutral {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
    }

    .signal-count .count {
        display: block;
        font-size: 18px;
        font-weight: 600;
    }

    .signal-count .label {
        font-size: 11px;
        text-transform: uppercase;
    }

    .recommendation-panel {
        background: #f0f9ff;
        border: 1px solid #0284c7;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
    }

    .recommendation-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
    }

    .recommendation-action {
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
    }

    .recommendation-action.buy {
        background: #10b981;
        color: white;
    }

    .recommendation-action.sell {
        background: #ef4444;
        color: white;
    }

    .recommendation-action.hold {
        background: #6b7280;
        color: white;
    }

    .recommendation-confidence {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 500;
    }

    .recommendation-confidence.high {
        background: #059669;
        color: white;
    }

    .recommendation-confidence.medium {
        background: #f59e0b;
        color: white;
    }

    .recommendation-confidence.low {
        background: #9ca3af;
        color: white;
    }

    .signals-list, .alerts-list {
        max-height: 300px;
        overflow-y: auto;
    }

    .signal-item, .alert-item {
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 8px;
        border-left: 4px solid;
    }

    .signal-item.bullish, .alert-item.bullish {
        background: rgba(16, 185, 129, 0.05);
        border-left-color: #10b981;
    }

    .signal-item.bearish, .alert-item.bearish {
        background: rgba(239, 68, 68, 0.05);
        border-left-color: #ef4444;
    }

    .signal-item.neutral, .alert-item.neutral {
        background: rgba(107, 114, 128, 0.05);
        border-left-color: #6b7280;
    }

    .signal-header, .alert-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
    }

    .signal-type, .alert-type {
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
    }

    .signal-time, .alert-time {
        font-size: 10px;
        color: #6b7280;
    }

    .signal-message, .alert-message {
        font-size: 13px;
        margin-bottom: 4px;
    }

    .signal-indicator {
        font-size: 10px;
        color: #9ca3af;
        text-transform: uppercase;
    }

    .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 300px;
    }

    .notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 10px;
        padding: 16px;
        border-left: 4px solid;
        animation: slideIn 0.3s ease;
    }

    .notification.bullish {
        border-left-color: #10b981;
    }

    .notification.bearish {
        border-left-color: #ef4444;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .btn.loading {
        opacity: 0.6;
        pointer-events: none;
    }

    .btn.loading::after {
        content: '';
        width: 12px;
        height: 12px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
        margin-left: 8px;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    }

    .setting-group {
        margin-bottom: 16px;
    }

    .setting-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
    }

    .setting-group input {
        width: 100%;
        padding: 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = enhancedStyles;
document.head.appendChild(styleSheet);

// Initialize enhanced UI
window.enhancedUI = new EnhancedUI();
