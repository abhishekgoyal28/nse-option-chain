#!/usr/bin/env node

// Test script for rate limiting functionality
const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testRateLimiting() {
    console.log('🧪 Testing Rate Limiting Functionality\n');
    
    try {
        console.log('1. Testing manual data fetch (this will trigger rate-limited API calls)...');
        const startTime = Date.now();
        
        const response = await axios.post(`${BASE_URL}/api/fetch-data`, {}, {
            timeout: 60000 // 60 second timeout for rate-limited requests
        });
        
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;
        
        if (response.data.success) {
            console.log('✅ Manual fetch successful');
            console.log(`⏱️  Total fetch time: ${totalTime.toFixed(1)}s`);
            
            if (response.data.data.fetch_stats) {
                const stats = response.data.data.fetch_stats;
                console.log(`📊 Fetch Statistics:`);
                console.log(`   - Total instruments: ${stats.total_instruments}`);
                console.log(`   - Successful quotes: ${stats.successful_quotes}`);
                console.log(`   - Failed quotes: ${stats.failed_quotes}`);
                console.log(`   - Success rate: ${((stats.successful_quotes / stats.total_instruments) * 100).toFixed(1)}%`);
            }
            
            // Verify rate limiting worked (should take at least instruments/2 seconds)
            const minExpectedTime = response.data.data.fetch_stats ? 
                (response.data.data.fetch_stats.total_instruments / 2) : 5;
            
            if (totalTime >= minExpectedTime * 0.8) { // Allow 20% tolerance
                console.log('✅ Rate limiting appears to be working correctly');
            } else {
                console.log('⚠️  Rate limiting might not be working - fetch was too fast');
            }
            
        } else {
            console.log('❌ Manual fetch failed:', response.data.error);
        }
        
        console.log('\n2. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/api/health`);
        
        if (healthResponse.data.periodic_fetch) {
            console.log('✅ Periodic fetch status:', healthResponse.data.periodic_fetch.status);
        }
        
        console.log('\n3. Rate limiting test completed!');
        console.log('\n💡 What to look for in logs:');
        console.log('   - "⏳ Rate limit: waiting Xms before next request"');
        console.log('   - "📊 Fetching quote X/Y: TOKEN"');
        console.log('   - "✅ Got quote for TOKEN: LTP=X"');
        console.log('   - Individual quote fetches taking ~500ms each');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure the server is running on port 3000');
        } else if (error.code === 'ECONNABORTED') {
            console.log('💡 Request timed out - this might be normal for rate-limited requests');
        }
    }
}

// Run the test
if (require.main === module) {
    console.log('🔧 Rate Limiting Test for NSE Tracker\n');
    console.log('This test will:');
    console.log('1. Trigger a manual data fetch');
    console.log('2. Measure the time taken');
    console.log('3. Verify rate limiting is working');
    console.log('4. Show fetch statistics\n');
    
    testRateLimiting();
}

module.exports = { testRateLimiting };
