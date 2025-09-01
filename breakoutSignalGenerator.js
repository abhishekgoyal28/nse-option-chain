// Enhanced Breakout Signal Generator
class BreakoutSignalGenerator {
    constructor() {
        this.historicalData = [];
        this.signals = [];
    }

    // Main function to generate all breakout signals
    generateBreakoutSignals(currentData, historicalData = []) {
        this.historicalData = historicalData;
        const signals = [];
        const timestamp = new Date();

        try {
            // 1. Call/Put Writing Imbalance
            const oiImbalanceSignal = this.detectOIImbalance(currentData, timestamp);
            if (oiImbalanceSignal) signals.push(oiImbalanceSignal);

            // 2. VWAP & Volume Breakout
            const vwapBreakoutSignal = this.detectVWAPBreakout(currentData, timestamp);
            if (vwapBreakoutSignal) signals.push(vwapBreakoutSignal);

            // 3. OI + Price Divergence
            const divergenceSignal = this.detectOIPriceDivergence(currentData, timestamp);
            if (divergenceSignal) signals.push(divergenceSignal);

            // 4. First Hour Breakout
            const firstHourSignal = this.detectFirstHourBreakout(currentData, timestamp);
            if (firstHourSignal) signals.push(firstHourSignal);

            // 5. Max Pain Shift
            const maxPainSignal = this.detectMaxPainShift(currentData, timestamp);
            if (maxPainSignal) signals.push(maxPainSignal);

            // 6. IV Crush + Price Stability
            const ivCrushSignal = this.detectIVCrush(currentData, timestamp);
            if (ivCrushSignal) signals.push(ivCrushSignal);

            // 7. Volume Spike at Key Levels
            const volumeSpikeSignal = this.detectVolumeSpikeAtKeyLevels(currentData, timestamp);
            if (volumeSpikeSignal) signals.push(volumeSpikeSignal);

            // 8. Candle Range Expansion
            const rangeExpansionSignal = this.detectRangeExpansion(currentData, timestamp);
            if (rangeExpansionSignal) signals.push(rangeExpansionSignal);

            // 9. Delta Neutral Shift
            const deltaNeutralSignal = this.detectDeltaNeutralShift(currentData, timestamp);
            if (deltaNeutralSignal) signals.push(deltaNeutralSignal);

            // 10. VWAP + OI Confluence
            const confluenceSignal = this.detectVWAPOIConfluence(currentData, timestamp);
            if (confluenceSignal) signals.push(confluenceSignal);

            // 11. Gamma Exposure Flip
            const gammaFlipSignal = this.detectGammaExposureFlip(currentData, timestamp);
            if (gammaFlipSignal) signals.push(gammaFlipSignal);

            return this.processSignals(signals, timestamp);
        } catch (error) {
            console.error('Error generating breakout signals:', error);
            return { signals: [], summary: 'Error generating signals' };
        }
    }

    // 1. Call/Put Writing Imbalance Detection
    detectOIImbalance(data, timestamp) {
        if (!this.historicalData.length) return null;
        
        const current = this.getATMData(data);
        const previous = this.getATMData(this.historicalData[this.historicalData.length - 1]);
        
        if (!current || !previous) return null;

        const deltaCallOI = current.callOI - previous.callOI;
        const deltaPutOI = current.putOI - previous.putOI;
        const deltaRatio = Math.abs(deltaCallOI) / Math.abs(deltaPutOI);

        if (deltaRatio > 1.5 && this.isValidTradingTime(timestamp)) {
            return {
                type: 'call_put_writing_imbalance',
                direction: deltaCallOI > deltaPutOI ? 'bearish' : 'bullish',
                strength: Math.min(deltaRatio / 3, 1),
                conditions_met: ['delta_oi_ratio', 'time_filter'],
                timestamp: timestamp.toISOString(),
                details: { deltaRatio, deltaCallOI, deltaPutOI }
            };
        }
        return null;
    }

    // 2. VWAP & Volume Breakout
    detectVWAPBreakout(data, timestamp) {
        if (this.historicalData.length < 3) return null;

        const vwap = this.calculateVWAP();
        const currentPrice = data.records?.underlyingValue || 0;
        const atr = this.calculateATR();
        
        if (!vwap || !atr) return null;

        const breakoutSize = Math.abs(currentPrice - vwap);
        if (breakoutSize > 0.5 * atr) {
            return {
                type: 'vwap_volume_breakout',
                direction: currentPrice > vwap ? 'bullish' : 'bearish',
                strength: Math.min(breakoutSize / atr, 1),
                conditions_met: ['vwap_breakout', 'atr_filter'],
                timestamp: timestamp.toISOString(),
                details: { currentPrice, vwap, breakoutSize, atr }
            };
        }
        return null;
    }

    // 3. OI + Price Divergence
    detectOIPriceDivergence(data, timestamp) {
        if (this.historicalData.length < 5) return null;

        const priceDirection = this.getPriceDirection();
        const oiDirection = this.getOIDirection(data);
        
        if (priceDirection && oiDirection && priceDirection !== oiDirection) {
            return {
                type: 'oi_price_divergence',
                direction: oiDirection === 'up' ? 'bullish' : 'bearish',
                strength: 0.7,
                conditions_met: ['price_oi_divergence'],
                timestamp: timestamp.toISOString(),
                details: { priceDirection, oiDirection }
            };
        }
        return null;
    }

    // 4. First Hour Breakout
    detectFirstHourBreakout(data, timestamp) {
        const hour = new Date(timestamp.getTime() + (5.5 * 60 * 60 * 1000)).getHours();
        if (hour < 9 || hour > 11) return null;

        const gapPercent = this.calculateGapPercent();
        if (Math.abs(gapPercent) > 0.8) return null; // Exclude large gaps

        const currentPrice = data.records?.underlyingValue || 0;
        const firstHourRange = this.getFirstHourRange();
        
        if (firstHourRange && (currentPrice > firstHourRange.high || currentPrice < firstHourRange.low)) {
            return {
                type: 'first_hour_breakout',
                direction: currentPrice > firstHourRange.high ? 'bullish' : 'bearish',
                strength: 0.8,
                conditions_met: ['first_hour_range', 'gap_filter'],
                timestamp: timestamp.toISOString(),
                details: { currentPrice, firstHourRange, gapPercent }
            };
        }
        return null;
    }

    // 5. Max Pain Shift
    detectMaxPainShift(data, timestamp) {
        const currentMaxPain = this.calculateMaxPain(data);
        const previousMaxPain = this.historicalData.length > 0 ? 
            this.calculateMaxPain(this.historicalData[this.historicalData.length - 1]) : null;

        if (currentMaxPain && previousMaxPain && Math.abs(currentMaxPain - previousMaxPain) > 50) {
            return {
                type: 'max_pain_shift',
                direction: currentMaxPain > previousMaxPain ? 'bullish' : 'bearish',
                strength: 0.6,
                conditions_met: ['max_pain_shift'],
                timestamp: timestamp.toISOString(),
                details: { currentMaxPain, previousMaxPain }
            };
        }
        return null;
    }

    // 6. IV Crush + Price Stability
    detectIVCrush(data, timestamp) {
        const bbWidth = this.calculateBollingerBandWidth();
        if (!bbWidth || bbWidth > 1.5) return null;

        return {
            type: 'iv_crush_stability',
            direction: 'neutral',
            strength: 0.5,
            conditions_met: ['bb_compression'],
            timestamp: timestamp.toISOString(),
            details: { bbWidth }
        };
    }

    // 7. Volume Spike at Key Levels
    detectVolumeSpikeAtKeyLevels(data, timestamp) {
        const currentVolume = this.getTotalVolume(data);
        const avgVolume = this.getAverageVolume();
        
        if (currentVolume > 2.5 * avgVolume) {
            return {
                type: 'volume_spike_key_levels',
                direction: 'neutral',
                strength: Math.min(currentVolume / avgVolume / 5, 1),
                conditions_met: ['volume_spike'],
                timestamp: timestamp.toISOString(),
                details: { currentVolume, avgVolume }
            };
        }
        return null;
    }

    // 8. Candle Range Expansion
    detectRangeExpansion(data, timestamp) {
        if (this.historicalData.length < 10) return null;

        const currentRange = this.getCurrentRange(data);
        const avgRange = this.getAverageRange(10);
        const currentVolume = this.getTotalVolume(data);
        const avgVolume = this.getAverageVolume();

        if (currentRange > 1.5 * avgRange && currentVolume > 2.5 * avgVolume) {
            return {
                type: 'range_expansion_volume',
                direction: 'neutral',
                strength: 0.8,
                conditions_met: ['range_expansion', 'volume_spike'],
                timestamp: timestamp.toISOString(),
                details: { currentRange, avgRange, currentVolume, avgVolume }
            };
        }
        return null;
    }

    // 9. Delta Neutral Shift
    detectDeltaNeutralShift(data, timestamp) {
        const atmData = this.getATMData(data);
        const prevAtmData = this.historicalData.length > 0 ? 
            this.getATMData(this.historicalData[this.historicalData.length - 1]) : null;

        if (!atmData || !prevAtmData) return null;

        const currentRatio = atmData.putOI / atmData.callOI;
        const prevRatio = prevAtmData.putOI / prevAtmData.callOI;
        const ratioChange = Math.abs(currentRatio - prevRatio) / prevRatio;

        if (ratioChange > 0.2) {
            return {
                type: 'delta_neutral_shift',
                direction: currentRatio > prevRatio ? 'bearish' : 'bullish',
                strength: Math.min(ratioChange * 2, 1),
                conditions_met: ['delta_shift'],
                timestamp: timestamp.toISOString(),
                details: { currentRatio, prevRatio, ratioChange }
            };
        }
        return null;
    }

    // 10. VWAP + OI Confluence
    detectVWAPOIConfluence(data, timestamp) {
        const vwap = this.calculateVWAP();
        const currentPrice = data.records?.underlyingValue || 0;
        const atmData = this.getATMData(data);
        const prevAtmData = this.historicalData.length > 0 ? 
            this.getATMData(this.historicalData[this.historicalData.length - 1]) : null;

        if (!vwap || !atmData || !prevAtmData) return null;

        const priceAboveVWAP = currentPrice > vwap;
        const callOIDown = atmData.callOI < prevAtmData.callOI;
        const putOIUp = atmData.putOI > prevAtmData.putOI;

        if ((priceAboveVWAP && callOIDown && putOIUp) || (!priceAboveVWAP && !callOIDown && !putOIUp)) {
            return {
                type: 'vwap_oi_confluence',
                direction: priceAboveVWAP ? 'bullish' : 'bearish',
                strength: 0.9,
                conditions_met: ['vwap_alignment', 'oi_alignment'],
                timestamp: timestamp.toISOString(),
                details: { currentPrice, vwap, priceAboveVWAP, callOIDown, putOIUp }
            };
        }
        return null;
    }

    // 11. Gamma Exposure Flip
    detectGammaExposureFlip(data, timestamp) {
        const gammaExposure = this.calculateGammaExposure(data);
        const prevGammaExposure = this.historicalData.length > 0 ? 
            this.calculateGammaExposure(this.historicalData[this.historicalData.length - 1]) : null;

        if (gammaExposure && prevGammaExposure && 
            Math.sign(gammaExposure) !== Math.sign(prevGammaExposure)) {
            return {
                type: 'gamma_exposure_flip',
                direction: gammaExposure > 0 ? 'bullish' : 'bearish',
                strength: 0.7,
                conditions_met: ['gamma_flip'],
                timestamp: timestamp.toISOString(),
                details: { gammaExposure, prevGammaExposure }
            };
        }
        return null;
    }

    // Helper Methods
    getATMData(data) {
        if (!data?.records?.data) return null;
        const underlyingPrice = data.records.underlyingValue || 0;
        const atmStrike = Math.round(underlyingPrice / 50) * 50;
        const atmRecord = data.records.data.find(record => record.strikePrice === atmStrike);
        
        if (!atmRecord) return null;
        
        return {
            callOI: atmRecord.CE?.openInterest || 0,
            putOI: atmRecord.PE?.openInterest || 0,
            callVolume: atmRecord.CE?.totalTradedVolume || 0,
            putVolume: atmRecord.PE?.totalTradedVolume || 0
        };
    }

    isValidTradingTime(timestamp) {
        const istTime = new Date(timestamp.getTime() + (5.5 * 60 * 60 * 1000));
        const hour = istTime.getHours();
        const minute = istTime.getMinutes();
        const currentTime = hour * 60 + minute;
        
        // Avoid lunch hours (12:00-14:00)
        const lunchStart = 12 * 60;
        const lunchEnd = 14 * 60;
        
        return !(currentTime >= lunchStart && currentTime <= lunchEnd);
    }

    calculateVWAP() {
        if (this.historicalData.length < 5) return null;
        
        let totalPriceVolume = 0;
        let totalVolume = 0;
        
        this.historicalData.slice(-20).forEach(data => {
            const price = data.records?.underlyingValue || 0;
            const volume = this.getTotalVolume(data);
            totalPriceVolume += price * volume;
            totalVolume += volume;
        });
        
        return totalVolume > 0 ? totalPriceVolume / totalVolume : null;
    }

    calculateATR(periods = 14) {
        if (this.historicalData.length < periods) return null;
        
        let atrSum = 0;
        for (let i = this.historicalData.length - periods; i < this.historicalData.length - 1; i++) {
            const current = this.historicalData[i].records?.underlyingValue || 0;
            const previous = this.historicalData[i - 1]?.records?.underlyingValue || current;
            atrSum += Math.abs(current - previous);
        }
        
        return atrSum / periods;
    }

    getTotalVolume(data) {
        if (!data?.records?.data) return 0;
        
        return data.records.data.reduce((total, record) => {
            const callVol = record.CE?.totalTradedVolume || 0;
            const putVol = record.PE?.totalTradedVolume || 0;
            return total + callVol + putVol;
        }, 0);
    }

    getAverageVolume() {
        if (this.historicalData.length < 5) return 0;
        
        const volumes = this.historicalData.slice(-10).map(data => this.getTotalVolume(data));
        return volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    }

    calculateMaxPain(data) {
        if (!data?.records?.data) return null;
        
        let minPain = Infinity;
        let maxPainStrike = null;
        
        data.records.data.forEach(record => {
            const strike = record.strikePrice;
            const callOI = record.CE?.openInterest || 0;
            const putOI = record.PE?.openInterest || 0;
            
            let pain = 0;
            data.records.data.forEach(otherRecord => {
                const otherStrike = otherRecord.strikePrice;
                const otherCallOI = otherRecord.CE?.openInterest || 0;
                const otherPutOI = otherRecord.PE?.openInterest || 0;
                
                if (otherStrike > strike) {
                    pain += (otherStrike - strike) * otherCallOI;
                }
                if (otherStrike < strike) {
                    pain += (strike - otherStrike) * otherPutOI;
                }
            });
            
            if (pain < minPain) {
                minPain = pain;
                maxPainStrike = strike;
            }
        });
        
        return maxPainStrike;
    }

    processSignals(signals, timestamp) {
        if (signals.length === 0) {
            return {
                signals: [],
                summary: 'No breakout signals detected',
                signalCount: 0,
                primarySignalType: null,
                signalStrength: 0,
                signalDirection: 'neutral'
            };
        }

        // Sort by strength
        signals.sort((a, b) => b.strength - a.strength);
        
        const primarySignal = signals[0];
        const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
        
        return {
            signals,
            summary: `${signals.length} breakout signals detected`,
            signalCount: signals.length,
            primarySignalType: primarySignal.type,
            signalStrength: avgStrength,
            signalDirection: primarySignal.direction,
            timestamp: timestamp.toISOString()
        };
    }

    // Placeholder methods for additional calculations
    getPriceDirection() { return 'up'; }
    getOIDirection() { return 'down'; }
    calculateGapPercent() { return 0; }
    getFirstHourRange() { return { high: 0, low: 0 }; }
    calculateBollingerBandWidth() { return 1.0; }
    getCurrentRange() { return 0; }
    getAverageRange() { return 0; }
    calculateGammaExposure() { return 0; }
}

module.exports = BreakoutSignalGenerator;
