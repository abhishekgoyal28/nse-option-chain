#!/usr/bin/env node

// Test script for the new periodic fetch functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('🧪 Testing Periodic Fetch Functionality\n');
    
    try {
        // 1. Check server health
        console.log('1. Checking server health...');
        const healthResponse = await axios.get(`${BASE_URL}/api/health`);
        console.log('✅ Server Status:', healthResponse.data.status);
        console.log('📊 Periodic Fetch Status:', healthResponse.data.periodic_fetch.status);
        console.log('⏰ Market Open:', healthResponse.data.periodic_fetch.market_open);
        console.log('📅 Last Data:', healthResponse.data.periodic_fetch.last_data_timestamp || 'None');
        console.log('');
        
        // 2. Check fetch control status
        console.log('2. Checking fetch control status...');
        const statusResponse = await axios.post(`${BASE_URL}/api/control-fetch`, {
            action: 'status'
        });
        console.log('✅ Fetch Status:', statusResponse.data.status);
        console.log('⏱️  Interval:', statusResponse.data.interval);
        console.log('');
        
        // 3. Get current data
        console.log('3. Getting current NIFTY data...');
        const dataResponse = await axios.get(`${BASE_URL}/api/nifty-data`);
        console.log('✅ Data Source:', dataResponse.data.source);
        console.log('📊 Spot Price:', dataResponse.data.data.spot_price);
        console.log('🎯 ATM Strike:', dataResponse.data.data.atm_strike);
        console.log('📅 Last Updated:', dataResponse.data.last_updated);
        console.log('🏪 Market Status:', dataResponse.data.market_status.message);
        console.log('');
        
        // 4. Check historical data
        console.log('4. Checking historical data...');
        const historyResponse = await axios.get(`${BASE_URL}/api/historical-summary`);
        if (historyResponse.data.data.available) {
            console.log('✅ Historical Records:', historyResponse.data.data.records);
            console.log('📁 File Size:', historyResponse.data.data.file_size);
            console.log('📅 Latest Record:', historyResponse.data.data.latest_record);
        } else {
            console.log('❌ No historical data available');
        }
        console.log('');
        
        // 5. Manual fetch test (if needed)
        console.log('5. Testing manual fetch...');
        try {
            const manualFetchResponse = await axios.post(`${BASE_URL}/api/fetch-data`);
            console.log('✅ Manual fetch successful');
            console.log('💾 Data saved:', manualFetchResponse.data.historical_saved);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('⚠️  Manual fetch requires KiteConnect authentication');
            } else {
                console.log('❌ Manual fetch failed:', error.message);
            }
        }
        console.log('');
        
        // 6. Control commands demo
        console.log('6. Available control commands:');
        console.log('   • Start periodic fetch: POST /api/control-fetch {"action": "start"}');
        console.log('   • Stop periodic fetch:  POST /api/control-fetch {"action": "stop"}');
        console.log('   • Check status:         POST /api/control-fetch {"action": "status"}');
        console.log('   • Manual fetch:         POST /api/fetch-data');
        console.log('   • Get current data:     GET  /api/nifty-data');
        console.log('');
        
        console.log('🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure the server is running on port 3000');
        }
    }
}

// Run the test
testAPI();
