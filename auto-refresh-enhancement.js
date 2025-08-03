/**
 * Auto-Refresh Enhancement for NIFTY Option Chain Tracker
 * 
 * This file contains enhancements for the client-side auto-refresh functionality:
 * - Updates data every 30 seconds (as per README specification)
 * - Real-time countdown timer showing next update
 * - Visual loading indicators
 * - Auto-start tracking after authentication
 * - Enhanced error handling and recovery
 * - Market hours awareness
 */

// Enhanced Auto-Refresh Configuration
const AUTO_REFRESH_CONFIG = {
    UPDATE_INTERVAL: 30000, // 30 seconds
    COUNTDOWN_UPDATE_INTERVAL: 1000, // 1 second
    AUTO_START_ON_AUTH: true,
    MARKET_HOURS_ONLY: false, // Set to true to only track during market hours
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000 // 5 seconds
};

// Enhanced tracking variables
let enhancedTrackingState = {
    isTracking: false,
    trackingInterval: null,
    countdownInterval: null,
    nextUpdateTime: null,
    retryCount: 0,
    lastSuccessfulUpdate: null,
    consecutiveErrors: 0
};

/**
 * Enhanced countdown timer with visual feedback
 */
function startEnhancedCountdown() {
    if (!enhancedTrackingState.isTracking) return;
    
    enhancedTrackingState.nextUpdateTime = Date.now() + AUTO_REFRESH_CONFIG.UPDATE_INTERVAL;
    const nextUpdateEl = document.getElementById('nextUpdate');
    
    if (nextUpdateEl) {
        nextUpdateEl.classList.remove('hidden');
        
        enhancedTrackingState.countdownInterval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((enhancedTrackingState.nextUpdateTime - Date.now()) / 1000));
            
            if (remaining <= 0) {
                nextUpdateEl.textContent = 'Updating...';
                nextUpdateEl.classList.add('urgent');
            } else {
                nextUpdateEl.textContent = `Next Update: ${remaining}s`;
                nextUpdateEl.classList.toggle('urgent', remaining <= 5);
            }
        }, AUTO_REFRESH_CONFIG.COUNTDOWN_UPDATE_INTERVAL);
    }
}

/**
 * Stop countdown timer
 */
function stopEnhancedCountdown() {
    if (enhancedTrackingState.countdownInterval) {
        clearInterval(enhancedTrackingState.countdownInterval);
        enhancedTrackingState.countdownInterval = null;
    }
    
    const nextUpdateEl = document.getElementById('nextUpdate');
    if (nextUpdateEl) {
        nextUpdateEl.classList.add('hidden');
        nextUpdateEl.classList.remove('urgent');
    }
}

/**
 * Reset countdown timer
 */
function resetEnhancedCountdown() {
    if (enhancedTrackingState.isTracking) {
        stopEnhancedCountdown();
        startEnhancedCountdown();
    }
}

/**
 * Enhanced fetch with retry logic
 */
async function enhancedFetchData() {
    try {
        // Show loading state
        const nextUpdateEl = document.getElementById('nextUpdate');
        if (nextUpdateEl && enhancedTrackingState.isTracking) {
            nextUpdateEl.textContent = 'Updating...';
            nextUpdateEl.classList.add('urgent');
        }
        
        // Call the original fetchData function
        await window.fetchData();
        
        // Reset error counters on success
        enhancedTrackingState.retryCount = 0;
        enhancedTrackingState.consecutiveErrors = 0;
        enhancedTrackingState.lastSuccessfulUpdate = new Date();
        
        // Reset countdown
        resetEnhancedCountdown();
        
        return true;
    } catch (error) {
        enhancedTrackingState.consecutiveErrors++;
        
        console.error('Enhanced fetch error:', error);
        
        // Implement retry logic
        if (enhancedTrackingState.retryCount < AUTO_REFRESH_CONFIG.MAX_RETRY_ATTEMPTS) {
            enhancedTrackingState.retryCount++;
            
            console.log(`Retrying fetch (${enhancedTrackingState.retryCount}/${AUTO_REFRESH_CONFIG.MAX_RETRY_ATTEMPTS}) in ${AUTO_REFRESH_CONFIG.RETRY_DELAY}ms`);
            
            setTimeout(() => {
                enhancedFetchData();
            }, AUTO_REFRESH_CONFIG.RETRY_DELAY);
        } else {
            // Max retries reached, log error and continue
            console.error('Max retry attempts reached. Will try again on next interval.');
            enhancedTrackingState.retryCount = 0;
            
            // Still reset countdown to show when next attempt will be
            resetEnhancedCountdown();
        }
        
        throw error;
    }
}

/**
 * Enhanced start tracking with better error handling
 */
function startEnhancedTracking() {
    if (enhancedTrackingState.isTracking) {
        console.log('Tracking already active');
        return;
    }
    
    console.log('🚀 Starting enhanced real-time tracking (30-second intervals)');
    
    enhancedTrackingState.isTracking = true;
    enhancedTrackingState.retryCount = 0;
    enhancedTrackingState.consecutiveErrors = 0;
    
    // Initial fetch
    enhancedFetchData().catch(error => {
        console.error('Initial fetch failed:', error);
    });
    
    // Set up interval
    enhancedTrackingState.trackingInterval = setInterval(() => {
        enhancedFetchData().catch(error => {
            console.error('Scheduled fetch failed:', error);
        });
    }, AUTO_REFRESH_CONFIG.UPDATE_INTERVAL);
    
    // Start countdown
    startEnhancedCountdown();
    
    console.log('✅ Enhanced tracking started - Updates every 30 seconds');
}

/**
 * Enhanced stop tracking
 */
function stopEnhancedTracking() {
    console.log('⏹ Stopping enhanced real-time tracking');
    
    enhancedTrackingState.isTracking = false;
    
    if (enhancedTrackingState.trackingInterval) {
        clearInterval(enhancedTrackingState.trackingInterval);
        enhancedTrackingState.trackingInterval = null;
    }
    
    stopEnhancedCountdown();
    
    console.log('✅ Enhanced tracking stopped');
}

/**
 * Check if currently in market hours (9:30 AM - 3:30 PM IST)
 */
function isMarketHours() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const marketStart = 9 * 60 + 30; // 9:30 AM
    const marketEnd = 15 * 60 + 30;  // 3:30 PM
    
    // Check if it's a weekday (Monday = 1, Sunday = 0)
    const dayOfWeek = istTime.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    return isWeekday && currentTime >= marketStart && currentTime <= marketEnd;
}

/**
 * Auto-start tracking after authentication (if enabled)
 */
function autoStartTrackingAfterAuth() {
    if (AUTO_REFRESH_CONFIG.AUTO_START_ON_AUTH) {
        if (AUTO_REFRESH_CONFIG.MARKET_HOURS_ONLY && !isMarketHours()) {
            console.log('📅 Market is closed. Auto-tracking disabled until market hours.');
            return;
        }
        
        setTimeout(() => {
            if (window.isAuthenticated && !enhancedTrackingState.isTracking) {
                console.log('🔄 Auto-starting tracking after authentication');
                startEnhancedTracking();
            }
        }, 2000); // Wait 2 seconds after auth to ensure everything is ready
    }
}

/**
 * Enhanced cleanup on page unload
 */
function enhancedPageUnloadHandler() {
    stopEnhancedTracking();
}

/**
 * Initialize enhanced auto-refresh functionality
 */
function initializeEnhancedAutoRefresh() {
    console.log('🔧 Initializing Enhanced Auto-Refresh System');
    console.log(`📊 Update Interval: ${AUTO_REFRESH_CONFIG.UPDATE_INTERVAL / 1000} seconds`);
    console.log(`🔄 Auto-start on auth: ${AUTO_REFRESH_CONFIG.AUTO_START_ON_AUTH}`);
    console.log(`🕒 Market hours only: ${AUTO_REFRESH_CONFIG.MARKET_HOURS_ONLY}`);
    
    // Add event listeners
    window.addEventListener('beforeunload', enhancedPageUnloadHandler);
    
    // Override original tracking functions if they exist
    if (typeof window.startTracking === 'function') {
        window.originalStartTracking = window.startTracking;
        window.startTracking = startEnhancedTracking;
    }
    
    if (typeof window.stopTracking === 'function') {
        window.originalStopTracking = window.stopTracking;
        window.stopTracking = stopEnhancedTracking;
    }
    
    // Expose enhanced functions globally
    window.enhancedAutoRefresh = {
        start: startEnhancedTracking,
        stop: stopEnhancedTracking,
        getState: () => ({ ...enhancedTrackingState }),
        getConfig: () => ({ ...AUTO_REFRESH_CONFIG }),
        isMarketHours: isMarketHours,
        forceUpdate: enhancedFetchData
    };
    
    console.log('✅ Enhanced Auto-Refresh System initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedAutoRefresh);
} else {
    initializeEnhancedAutoRefresh();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeEnhancedAutoRefresh,
        startEnhancedTracking,
        stopEnhancedTracking,
        enhancedFetchData,
        isMarketHours,
        AUTO_REFRESH_CONFIG
    };
}
