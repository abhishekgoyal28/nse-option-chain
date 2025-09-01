// Test script for breakout signal generation
const BreakoutSignalGenerator = require('./breakoutSignalGenerator');

// Mock data for testing
const mockCurrentData = {
    records: {
        underlyingValue: 24500,
        data: [
            {
                strikePrice: 24500,
                CE: {
                    openInterest: 50000,
                    totalTradedVolume: 10000,
                    lastPrice: 150,
                    change: 10
                },
                PE: {
                    openInterest: 75000,
                    totalTradedVolume: 15000,
                    lastPrice: 120,
                    change: -5
                }
            }
        ]
    }
};

const mockHistoricalData = [
    {
        records: {
            underlyingValue: 24450,
            data: [{
                strikePrice: 24500,
                CE: { openInterest: 45000, totalTradedVolume: 8000, lastPrice: 140, change: 5 },
                PE: { openInterest: 70000, totalTradedVolume: 12000, lastPrice: 125, change: -2 }
            }]
        }
    },
    {
        records: {
            underlyingValue: 24480,
            data: [{
                strikePrice: 24500,
                CE: { openInterest: 48000, totalTradedVolume: 9000, lastPrice: 145, change: 8 },
                PE: { openInterest: 72000, totalTradedVolume: 13000, lastPrice: 122, change: -3 }
            }]
        }
    }
];

// Test the signal generator
const signalGenerator = new BreakoutSignalGenerator();

console.log('🧪 Testing Breakout Signal Generator...\n');

try {
    const signals = signalGenerator.generateBreakoutSignals(mockCurrentData, mockHistoricalData);
    
    console.log('📊 Generated Signals:');
    console.log('Signal Count:', signals.signalCount);
    console.log('Primary Signal Type:', signals.primarySignalType);
    console.log('Signal Direction:', signals.signalDirection);
    console.log('Signal Strength:', signals.signalStrength);
    console.log('Summary:', signals.summary);
    
    if (signals.signals.length > 0) {
        console.log('\n🚨 Individual Signals:');
        signals.signals.forEach((signal, index) => {
            console.log(`${index + 1}. ${signal.type}`);
            console.log(`   Direction: ${signal.direction}`);
            console.log(`   Strength: ${signal.strength}`);
            console.log(`   Conditions: ${signal.conditions_met.join(', ')}`);
            console.log(`   Details:`, signal.details);
            console.log('');
        });
    }
    
    console.log('✅ Test completed successfully!');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
}
