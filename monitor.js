#!/usr/bin/env node

// Simple monitoring script for NSE Tracker
const axios = require('axios');
const fs = require('fs');

const BASE_URL = process.env.MONITOR_URL || 'http://localhost:3000';
const LOG_FILE = 'monitor.log';

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(LOG_FILE, logMessage);
}

async function checkHealth() {
    try {
        const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 10000 });
        const data = response.data;
        
        log(`✅ Health Check: ${data.status}`);
        log(`📊 Periodic Fetch: ${data.periodic_fetch.status}`);
        log(`🏪 Market Open: ${data.periodic_fetch.market_open}`);
        log(`📈 Historical Records: ${data.historical_data.records || 0}`);
        
        if (data.periodic_fetch.last_data_timestamp) {
            const lastUpdate = new Date(data.periodic_fetch.last_data_timestamp);
            const now = new Date();
            const minutesAgo = Math.floor((now - lastUpdate) / (1000 * 60));
            log(`⏰ Last Data Update: ${minutesAgo} minutes ago`);
            
            // Alert if data is too old during market hours
            if (data.periodic_fetch.market_open && minutesAgo > 5) {
                log(`⚠️  WARNING: Data is ${minutesAgo} minutes old during market hours!`);
            }
        }
        
        return true;
    } catch (error) {
        log(`❌ Health Check Failed: ${error.message}`);
        return false;
    }
}

async function checkDataEndpoint() {
    try {
        const response = await axios.get(`${BASE_URL}/api/nifty-data`, { timeout: 10000 });
        const data = response.data;
        
        if (data.success) {
            log(`✅ Data Endpoint: Working (Source: ${data.source})`);
            log(`💰 Spot Price: ${data.data.spot_price}`);
            log(`🎯 ATM Strike: ${data.data.atm_strike}`);
            return true;
        } else {
            log(`❌ Data Endpoint: Failed - ${data.error}`);
            return false;
        }
    } catch (error) {
        log(`❌ Data Endpoint Failed: ${error.message}`);
        return false;
    }
}

async function checkFetchStatus() {
    try {
        const response = await axios.post(`${BASE_URL}/api/control-fetch`, {
            action: 'status'
        }, { timeout: 10000 });
        
        const data = response.data;
        log(`🔄 Fetch Status: ${data.status}`);
        log(`⏱️  Interval: ${data.interval}`);
        
        return true;
    } catch (error) {
        log(`❌ Fetch Status Check Failed: ${error.message}`);
        return false;
    }
}

async function runMonitoring() {
    log('🔍 Starting monitoring check...');
    
    const checks = [
        { name: 'Health', fn: checkHealth },
        { name: 'Data Endpoint', fn: checkDataEndpoint },
        { name: 'Fetch Status', fn: checkFetchStatus }
    ];
    
    let passedChecks = 0;
    
    for (const check of checks) {
        try {
            const result = await check.fn();
            if (result) passedChecks++;
        } catch (error) {
            log(`❌ ${check.name} check error: ${error.message}`);
        }
    }
    
    const healthScore = Math.round((passedChecks / checks.length) * 100);
    log(`📊 Overall Health Score: ${healthScore}%`);
    
    if (healthScore < 70) {
        log(`🚨 ALERT: System health is below 70%! Consider investigating.`);
    }
    
    log('✅ Monitoring check completed\n');
    
    return healthScore;
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--continuous')) {
        log('🔄 Starting continuous monitoring (every 5 minutes)...');
        
        // Run immediately
        runMonitoring();
        
        // Then run every 5 minutes
        setInterval(runMonitoring, 5 * 60 * 1000);
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            log('🛑 Monitoring stopped by user');
            process.exit(0);
        });
        
    } else if (args.includes('--help')) {
        console.log(`
NSE Tracker Monitoring Script

Usage:
  node monitor.js                 # Run single check
  node monitor.js --continuous    # Run continuous monitoring
  node monitor.js --help          # Show this help

Environment Variables:
  MONITOR_URL                     # Base URL to monitor (default: http://localhost:3000)

Examples:
  node monitor.js
  MONITOR_URL=https://your-domain.com node monitor.js
  node monitor.js --continuous
        `);
    } else {
        // Single run
        runMonitoring().then(score => {
            process.exit(score >= 70 ? 0 : 1);
        });
    }
}

module.exports = { runMonitoring, checkHealth, checkDataEndpoint, checkFetchStatus };
