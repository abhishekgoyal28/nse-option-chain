// Advanced Signal Analysis for NSE Option Chain
class SignalAnalyzer {
    constructor() {
        this.signals = [];
        this.alertsEnabled = true;
        this.signalHistory = [];
        this.thresholds = {
            pcr: {
                oversold: 0.7,    // Below this is bullish
                overbought: 1.3,  // Above this is bearish
                extreme_oversold: 0.5,
                extreme_overbought: 1.5
            },
            volume: {
                spike_multiplier: 2.0,  // 2x average volume
                unusual_multiplier: 1.5
            },
            oi: {
                buildup_threshold: 0.1,  // 10% increase
                unwinding_threshold: -0.1 // 10% decrease
            },
            price: {
                momentum_periods: [5, 10, 20],
                volatility_threshold: 0.02 // 2%
            }
        };
    }

    // Analyze current market data for signals
    analyzeMarketSignals(data) {
        if (!data || !data.timestamps || data.timestamps.length < 20) {
            return { signals: [], summary: 'Insufficient data for analysis' };
        }

        const signals = [];
        const latest = data.timestamps.length - 1;

        // 1. PCR Analysis
        const pcrSignals = this.analyzePCR(data.ratios, latest);
        signals.push(...pcrSignals);

        // 2. Volume Analysis
        const volumeSignals = this.analyzeVolume(data.calls, data.puts, latest);
        signals.push(...volumeSignals);

        // 3. Open Interest Analysis
        const oiSignals = this.analyzeOpenInterest(data.calls, data.puts, latest);
        signals.push(...oiSignals);

        // 4. Price Action Analysis
        const priceSignals = this.analyzePriceAction(data.spotPrices, latest);
        signals.push(...priceSignals);

        // 5. Options Greeks Analysis (if available)
        const greeksSignals = this.analyzeGreeks(data.calls, data.puts, latest);
        signals.push(...greeksSignals);

        // 6. Market Structure Analysis
        const structureSignals = this.analyzeMarketStructure(data, latest);
        signals.push(...structureSignals);

        // Store signals
        this.signals = signals;
        this.updateSignalHistory(signals);

        return {
            signals: signals,
            summary: this.generateSignalSummary(signals),
            strength: this.calculateOverallStrength(signals),
            recommendation: this.generateRecommendation(signals)
        };
    }

    // Analyze Put-Call Ratio signals
    analyzePCR(ratios, latest) {
        const signals = [];
        if (!ratios || !ratios.pcr_volume || !ratios.pcr_oi) return signals;

        const currentPCRVolume = ratios.pcr_volume[latest];
        const currentPCROI = ratios.pcr_oi[latest];

        // PCR Volume Analysis
        if (currentPCRVolume < this.thresholds.pcr.extreme_oversold) {
            signals.push({
                type: 'BULLISH',
                strength: 'STRONG',
                indicator: 'PCR_VOLUME',
                message: `Extreme oversold PCR Volume: ${currentPCRVolume.toFixed(2)}`,
                value: currentPCRVolume,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        } else if (currentPCRVolume < this.thresholds.pcr.oversold) {
            signals.push({
                type: 'BULLISH',
                strength: 'MODERATE',
                indicator: 'PCR_VOLUME',
                message: `Oversold PCR Volume: ${currentPCRVolume.toFixed(2)}`,
                value: currentPCRVolume,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        } else if (currentPCRVolume > this.thresholds.pcr.extreme_overbought) {
            signals.push({
                type: 'BEARISH',
                strength: 'STRONG',
                indicator: 'PCR_VOLUME',
                message: `Extreme overbought PCR Volume: ${currentPCRVolume.toFixed(2)}`,
                value: currentPCRVolume,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        } else if (currentPCRVolume > this.thresholds.pcr.overbought) {
            signals.push({
                type: 'BEARISH',
                strength: 'MODERATE',
                indicator: 'PCR_VOLUME',
                message: `Overbought PCR Volume: ${currentPCRVolume.toFixed(2)}`,
                value: currentPCRVolume,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        }

        // PCR OI Analysis
        if (currentPCROI < this.thresholds.pcr.oversold) {
            signals.push({
                type: 'BULLISH',
                strength: 'MODERATE',
                indicator: 'PCR_OI',
                message: `Bullish PCR OI: ${currentPCROI.toFixed(2)}`,
                value: currentPCROI,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        } else if (currentPCROI > this.thresholds.pcr.overbought) {
            signals.push({
                type: 'BEARISH',
                strength: 'MODERATE',
                indicator: 'PCR_OI',
                message: `Bearish PCR OI: ${currentPCROI.toFixed(2)}`,
                value: currentPCROI,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        }

        return signals;
    }

    // Analyze volume patterns
    analyzeVolume(calls, puts, latest) {
        const signals = [];
        if (!calls.volume || !puts.volume || latest < 10) return signals;

        // Calculate average volumes
        const callVolumeAvg = this.calculateAverage(calls.volume.slice(latest - 10, latest));
        const putVolumeAvg = this.calculateAverage(puts.volume.slice(latest - 10, latest));

        const currentCallVolume = calls.volume[latest];
        const currentPutVolume = puts.volume[latest];

        // Volume spike detection
        if (currentCallVolume > callVolumeAvg * this.thresholds.volume.spike_multiplier) {
            signals.push({
                type: 'BULLISH',
                strength: 'STRONG',
                indicator: 'CALL_VOLUME_SPIKE',
                message: `Call volume spike: ${currentCallVolume.toLocaleString()} (${(currentCallVolume/callVolumeAvg).toFixed(1)}x avg)`,
                value: currentCallVolume,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        }

        if (currentPutVolume > putVolumeAvg * this.thresholds.volume.spike_multiplier) {
            signals.push({
                type: 'BEARISH',
                strength: 'STRONG',
                indicator: 'PUT_VOLUME_SPIKE',
                message: `Put volume spike: ${currentPutVolume.toLocaleString()} (${(currentPutVolume/putVolumeAvg).toFixed(1)}x avg)`,
                value: currentPutVolume,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        }

        // Volume divergence
        const volumeRatio = currentCallVolume / (currentCallVolume + currentPutVolume);
        if (volumeRatio > 0.7) {
            signals.push({
                type: 'BULLISH',
                strength: 'MODERATE',
                indicator: 'VOLUME_DIVERGENCE',
                message: `Strong call volume dominance: ${(volumeRatio * 100).toFixed(1)}%`,
                value: volumeRatio,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        } else if (volumeRatio < 0.3) {
            signals.push({
                type: 'BEARISH',
                strength: 'MODERATE',
                indicator: 'VOLUME_DIVERGENCE',
                message: `Strong put volume dominance: ${((1-volumeRatio) * 100).toFixed(1)}%`,
                value: volumeRatio,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        }

        return signals;
    }

    // Analyze Open Interest patterns
    analyzeOpenInterest(calls, puts, latest) {
        const signals = [];
        if (!calls.oi || !puts.oi || latest < 5) return signals;

        const currentCallOI = calls.oi[latest];
        const previousCallOI = calls.oi[latest - 1];
        const currentPutOI = puts.oi[latest];
        const previousPutOI = puts.oi[latest - 1];

        // OI buildup/unwinding
        const callOIChange = (currentCallOI - previousCallOI) / previousCallOI;
        const putOIChange = (currentPutOI - previousPutOI) / previousPutOI;

        if (callOIChange > this.thresholds.oi.buildup_threshold) {
            signals.push({
                type: 'BULLISH',
                strength: 'MODERATE',
                indicator: 'CALL_OI_BUILDUP',
                message: `Call OI buildup: +${(callOIChange * 100).toFixed(1)}%`,
                value: callOIChange,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        }

        if (putOIChange > this.thresholds.oi.buildup_threshold) {
            signals.push({
                type: 'BEARISH',
                strength: 'MODERATE',
                indicator: 'PUT_OI_BUILDUP',
                message: `Put OI buildup: +${(putOIChange * 100).toFixed(1)}%`,
                value: putOIChange,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        }

        // Max Pain analysis (simplified)
        const totalOI = currentCallOI + currentPutOI;
        const oiRatio = currentCallOI / totalOI;
        
        if (oiRatio > 0.6) {
            signals.push({
                type: 'RESISTANCE',
                strength: 'MODERATE',
                indicator: 'OI_RESISTANCE',
                message: `Strong call OI suggests resistance: ${(oiRatio * 100).toFixed(1)}%`,
                value: oiRatio,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        } else if (oiRatio < 0.4) {
            signals.push({
                type: 'SUPPORT',
                strength: 'MODERATE',
                indicator: 'OI_SUPPORT',
                message: `Strong put OI suggests support: ${((1-oiRatio) * 100).toFixed(1)}%`,
                value: oiRatio,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        }

        return signals;
    }

    // Analyze price action
    analyzePriceAction(prices, latest) {
        const signals = [];
        if (!prices || latest < 20) return signals;

        // Calculate momentum indicators
        const sma5 = this.calculateSMA(prices, 5);
        const sma10 = this.calculateSMA(prices, 10);
        const sma20 = this.calculateSMA(prices, 20);

        const currentPrice = prices[latest];
        const currentSMA5 = sma5[latest];
        const currentSMA10 = sma10[latest];
        const currentSMA20 = sma20[latest];

        // Golden Cross / Death Cross
        if (sma5[latest-1] <= sma20[latest-1] && currentSMA5 > currentSMA20) {
            signals.push({
                type: 'BULLISH',
                strength: 'STRONG',
                indicator: 'GOLDEN_CROSS',
                message: 'Golden Cross: SMA5 crossed above SMA20',
                value: currentPrice,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        } else if (sma5[latest-1] >= sma20[latest-1] && currentSMA5 < currentSMA20) {
            signals.push({
                type: 'BEARISH',
                strength: 'STRONG',
                indicator: 'DEATH_CROSS',
                message: 'Death Cross: SMA5 crossed below SMA20',
                value: currentPrice,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        }

        // Price vs Moving Averages
        if (currentPrice > currentSMA5 && currentSMA5 > currentSMA10 && currentSMA10 > currentSMA20) {
            signals.push({
                type: 'BULLISH',
                strength: 'STRONG',
                indicator: 'BULLISH_ALIGNMENT',
                message: 'Bullish MA alignment: Price > SMA5 > SMA10 > SMA20',
                value: currentPrice,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        } else if (currentPrice < currentSMA5 && currentSMA5 < currentSMA10 && currentSMA10 < currentSMA20) {
            signals.push({
                type: 'BEARISH',
                strength: 'STRONG',
                indicator: 'BEARISH_ALIGNMENT',
                message: 'Bearish MA alignment: Price < SMA5 < SMA10 < SMA20',
                value: currentPrice,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        }

        // Volatility analysis
        const volatility = this.calculateVolatility(prices.slice(latest - 10, latest + 1));
        if (volatility > this.thresholds.price.volatility_threshold) {
            signals.push({
                type: 'NEUTRAL',
                strength: 'MODERATE',
                indicator: 'HIGH_VOLATILITY',
                message: `High volatility detected: ${(volatility * 100).toFixed(2)}%`,
                value: volatility,
                timestamp: Date.now(),
                priority: 'MEDIUM'
            });
        }

        return signals;
    }

    // Analyze Greeks (if available)
    analyzeGreeks(calls, puts, latest) {
        const signals = [];
        
        // This would require IV data from your API
        if (calls.iv && puts.iv) {
            const callIV = calls.iv[latest];
            const putIV = puts.iv[latest];
            
            if (callIV && putIV) {
                const ivSkew = putIV - callIV;
                
                if (ivSkew > 0.05) {
                    signals.push({
                        type: 'BEARISH',
                        strength: 'MODERATE',
                        indicator: 'IV_SKEW',
                        message: `Put IV premium suggests fear: ${(ivSkew * 100).toFixed(1)}%`,
                        value: ivSkew,
                        timestamp: Date.now(),
                        priority: 'MEDIUM'
                    });
                } else if (ivSkew < -0.05) {
                    signals.push({
                        type: 'BULLISH',
                        strength: 'MODERATE',
                        indicator: 'IV_SKEW',
                        message: `Call IV premium suggests optimism: ${(Math.abs(ivSkew) * 100).toFixed(1)}%`,
                        value: ivSkew,
                        timestamp: Date.now(),
                        priority: 'MEDIUM'
                    });
                }
            }
        }

        return signals;
    }

    // Analyze overall market structure
    analyzeMarketStructure(data, latest) {
        const signals = [];
        
        // Trend strength
        const trendStrength = this.calculateTrendStrength(data.spotPrices, latest);
        
        if (trendStrength > 0.7) {
            signals.push({
                type: 'BULLISH',
                strength: 'STRONG',
                indicator: 'STRONG_UPTREND',
                message: `Strong uptrend detected: ${(trendStrength * 100).toFixed(1)}%`,
                value: trendStrength,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        } else if (trendStrength < -0.7) {
            signals.push({
                type: 'BEARISH',
                strength: 'STRONG',
                indicator: 'STRONG_DOWNTREND',
                message: `Strong downtrend detected: ${(Math.abs(trendStrength) * 100).toFixed(1)}%`,
                value: trendStrength,
                timestamp: Date.now(),
                priority: 'HIGH'
            });
        }

        return signals;
    }

    // Helper functions
    calculateAverage(arr) {
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

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

    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const avgReturn = this.calculateAverage(returns);
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    calculateTrendStrength(prices, latest) {
        if (latest < 20) return 0;
        
        const recentPrices = prices.slice(latest - 19, latest + 1);
        const firstPrice = recentPrices[0];
        const lastPrice = recentPrices[recentPrices.length - 1];
        
        const overallChange = (lastPrice - firstPrice) / firstPrice;
        
        // Count periods where price moved in same direction
        let consistentMoves = 0;
        const direction = overallChange > 0 ? 1 : -1;
        
        for (let i = 1; i < recentPrices.length; i++) {
            const move = (recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1];
            if ((move > 0 && direction > 0) || (move < 0 && direction < 0)) {
                consistentMoves++;
            }
        }
        
        const consistency = consistentMoves / (recentPrices.length - 1);
        return overallChange * consistency;
    }

    // Generate signal summary
    generateSignalSummary(signals) {
        const bullishSignals = signals.filter(s => s.type === 'BULLISH').length;
        const bearishSignals = signals.filter(s => s.type === 'BEARISH').length;
        const neutralSignals = signals.filter(s => s.type === 'NEUTRAL').length;
        const strongSignals = signals.filter(s => s.strength === 'STRONG').length;

        return {
            total: signals.length,
            bullish: bullishSignals,
            bearish: bearishSignals,
            neutral: neutralSignals,
            strong: strongSignals,
            bias: bullishSignals > bearishSignals ? 'BULLISH' : 
                  bearishSignals > bullishSignals ? 'BEARISH' : 'NEUTRAL'
        };
    }

    // Calculate overall signal strength
    calculateOverallStrength(signals) {
        if (signals.length === 0) return 0;

        let totalStrength = 0;
        signals.forEach(signal => {
            let weight = 1;
            if (signal.strength === 'STRONG') weight = 2;
            if (signal.priority === 'HIGH') weight *= 1.5;
            
            if (signal.type === 'BULLISH') totalStrength += weight;
            else if (signal.type === 'BEARISH') totalStrength -= weight;
        });

        return Math.max(-100, Math.min(100, totalStrength * 10));
    }

    // Generate trading recommendation
    generateRecommendation(signals) {
        const summary = this.generateSignalSummary(signals);
        const strength = this.calculateOverallStrength(signals);

        let recommendation = 'HOLD';
        let confidence = 'LOW';

        if (Math.abs(strength) > 50) {
            confidence = 'HIGH';
            recommendation = strength > 0 ? 'BUY' : 'SELL';
        } else if (Math.abs(strength) > 25) {
            confidence = 'MEDIUM';
            recommendation = strength > 0 ? 'BUY' : 'SELL';
        }

        return {
            action: recommendation,
            confidence: confidence,
            strength: strength,
            reasoning: this.generateReasoningText(signals, summary)
        };
    }

    // Generate reasoning text
    generateReasoningText(signals, summary) {
        const strongSignals = signals.filter(s => s.strength === 'STRONG');
        const highPrioritySignals = signals.filter(s => s.priority === 'HIGH');

        let reasoning = `Market shows ${summary.bias.toLowerCase()} bias with ${summary.total} total signals. `;
        
        if (strongSignals.length > 0) {
            reasoning += `Strong signals: ${strongSignals.map(s => s.indicator).join(', ')}. `;
        }
        
        if (highPrioritySignals.length > 0) {
            reasoning += `Key alerts: ${highPrioritySignals.map(s => s.message).join('; ')}.`;
        }

        return reasoning;
    }

    // Update signal history
    updateSignalHistory(signals) {
        const timestamp = Date.now();
        this.signalHistory.push({
            timestamp: timestamp,
            signals: signals,
            summary: this.generateSignalSummary(signals)
        });

        // Keep only last 100 signal updates
        if (this.signalHistory.length > 100) {
            this.signalHistory = this.signalHistory.slice(-100);
        }
    }

    // Get current signals
    getCurrentSignals() {
        return this.signals;
    }

    // Get signal history
    getSignalHistory() {
        return this.signalHistory;
    }
}

// Initialize signal analyzer
window.signalAnalyzer = new SignalAnalyzer();
