// Economic Insights Service - Generates dynamic summaries based on actual data
class EconomicInsightsService {
    constructor() {
        this.latestData = {};
        this.trends = {};
    }

    // Main method to generate the top economic summary
    generateEconomicSummary(data) {
        const inflationStatus = this.analyzeInflation(data);
        const laborStatus = this.analyzeLaborMarket(data);
        const fedOutlook = this.analyzeFedPolicy(data);
        
        return `${inflationStatus} ${laborStatus}. ${fedOutlook}.`;
    }

    // Analyze inflation metrics
    analyzeInflation(data) {
        const cpi = parseFloat(data.coreCPI?.value) || 0;
        const pce = parseFloat(data.corePCE?.value) || 0;
        const ppi = parseFloat(data.corePPI?.value) || 0;
        const target = 2.0;
        
        const avgInflation = (cpi + pce) / 2;
        const trend = this.getTrend([cpi, pce, ppi]);
        
        if (avgInflation > target + 1) {
            if (trend === 'declining') {
                return "Inflation cooling but remains well above Fed's 2% target";
            }
            return "Inflation remains stubbornly elevated above target";
        } else if (avgInflation > target) {
            if (trend === 'declining') {
                return "Inflation moderating toward Fed's target";
            }
            return "Inflation remains sticky above target";
        } else {
            return "Inflation approaching Fed's 2% target";
        }
    }

    // Analyze labor market conditions
    analyzeLaborMarket(data) {
        const unemployment = parseFloat(data.unemployment?.value) || 0;
        const joblessClaims = parseInt(data.joblessClaims?.value) || 0;
        
        if (unemployment < 4.0 && joblessClaims < 250000) {
            return "while labor market remains robust";
        } else if (unemployment < 4.5 && joblessClaims < 300000) {
            return "with labor market showing resilience";
        } else if (unemployment > 4.5) {
            return "as labor market shows signs of softening";
        } else {
            return "while job market stays balanced";
        }
    }

    // Analyze Fed policy outlook
    analyzeFedPolicy(data) {
        const inflation = (parseFloat(data.coreCPI?.value) + parseFloat(data.corePCE?.value)) / 2 || 0;
        const unemployment = parseFloat(data.unemployment?.value) || 0;
        const gdp = parseFloat(data.gdp?.value) || 0;
        
        if (inflation > 3 && unemployment < 4) {
            return "Fed likely to maintain higher rates through 2025";
        } else if (inflation > 2.5) {
            return "Fed expected to proceed cautiously with gradual rate adjustments";
        } else if (unemployment > 4.5 || gdp < 1) {
            return "Fed may pivot to more accommodative stance if growth slows";
        } else {
            return "Fed poised for measured approach to policy normalization";
        }
    }

    // Generate market summary
    generateMarketSummary(data) {
        const sp500Change = parseFloat(data.sp500?.changePercent) || 0;
        const vixLevel = parseFloat(data.vix?.value) || 20;
        
        let trend = sp500Change > 0 ? "Markets advancing" : "Markets under pressure";
        let volatility = vixLevel < 20 ? "with low volatility" : vixLevel > 30 ? "amid elevated volatility" : "with moderate volatility";
        let driver = this.getMarketDriver(data);
        
        return `${trend} ${volatility}. ${driver}.`;
    }

    // Generate rates summary
    generateRatesSummary(data) {
        const twoYear = parseFloat(data.twoYear?.value) || 0;
        const tenYear = parseFloat(data.tenYear?.value) || 0;
        const spread = tenYear - twoYear;
        
        let curveStatus = spread > 0 ? "Yield curve normalizing" : "Yield curve remains inverted";
        let rateDirection = this.getRatesTrend(data);
        let implication = spread < 0 ? "signaling ongoing recession concerns" : "reflecting improved growth outlook";
        
        return `${curveStatus} as ${rateDirection}, ${implication}.`;
    }

    // Individual metric summaries (8-10 words each)
    generateMetricSummary(metricId, currentValue, previousValue, consensus) {
        const current = parseFloat(currentValue) || 0;
        const previous = parseFloat(previousValue) || 0;
        const expected = parseFloat(consensus) || current;
        
        const summaries = {
            'coreCPI': () => {
                if (current > previous && current > expected) {
                    return "Inflation accelerates beyond expectations, challenging Fed policy";
                } else if (current < previous) {
                    return "Core inflation cools, supporting potential Fed pause";
                } else {
                    return "Inflation remains sticky at elevated levels";
                }
            },
            'corePPI': () => {
                if (current > previous) {
                    return "Producer prices rise, signaling pipeline inflation pressure";
                } else if (current < previous) {
                    return "Producer inflation eases, relieving cost pressures";
                } else {
                    return "Producer prices stable, minimal inflation pass-through";
                }
            },
            'corePCE': () => {
                if (current > 2.5) {
                    return "Fed's preferred gauge remains above comfort zone";
                } else if (current < previous) {
                    return "PCE inflation moderates toward Fed target";
                } else {
                    return "Core PCE holds steady near target levels";
                }
            },
            'gdp': () => {
                if (current > 2.5) {
                    return "Economy expands robustly above trend growth";
                } else if (current < 1) {
                    return "Growth stalls, raising recession concerns";
                } else {
                    return "Moderate expansion continues at sustainable pace";
                }
            },
            'unemployment': () => {
                if (current < 3.8) {
                    return "Job market remains historically tight";
                } else if (current > previous + 0.2) {
                    return "Unemployment rises, labor market softening";
                } else {
                    return "Employment conditions remain stable and balanced";
                }
            },
            'joblessClaims': () => {
                const claims = parseInt(currentValue);
                if (claims > 250000) {
                    return "Claims elevated, suggesting rising layoff activity";
                } else if (claims < 200000) {
                    return "Minimal layoffs reflect strong labor demand";
                } else {
                    return "Claims normal, job market remains healthy";
                }
            },
            'retailSales': () => {
                if (current > 0.5) {
                    return "Consumer spending surges, economy resilient";
                } else if (current < 0) {
                    return "Retail sales contract, consumer pullback evident";
                } else {
                    return "Modest spending growth maintains economic momentum";
                }
            },
            'durableGoods': () => {
                if (current > 1) {
                    return "Strong orders signal business investment confidence";
                } else if (current < -0.5) {
                    return "Orders decline sharply, manufacturing weakness persists";
                } else {
                    return "Factory orders steady, manufacturing stabilizing";
                }
            },
            'newHomeSales': () => {
                if (current > previous * 1.05) {
                    return "New home sales jump despite mortgage rates";
                } else if (current < previous * 0.95) {
                    return "Housing demand weakens amid affordability challenges";
                } else {
                    return "Home sales steady as market finds balance";
                }
            },
            'existingHomeSales': () => {
                if (current > previous * 1.03) {
                    return "Existing sales rebound, housing market thaws";
                } else if (current < previous * 0.97) {
                    return "Sales slump continues, inventory remains tight";
                } else {
                    return "Housing market stable despite rate headwinds";
                }
            },
            'consumerSentiment': () => {
                if (current > 75) {
                    return "Consumer confidence strong, supporting spending outlook";
                } else if (current < 60) {
                    return "Sentiment depressed, recession fears weigh";
                } else {
                    return "Confidence improving but remains below average";
                }
            }
        };
        
        return summaries[metricId] ? summaries[metricId]() : "Data released, analyzing market implications";
    }

    // Helper methods
    getTrend(values) {
        if (values.length < 2) return 'stable';
        const recent = values[values.length - 1];
        const previous = values[values.length - 2];
        if (recent > previous * 1.02) return 'rising';
        if (recent < previous * 0.98) return 'declining';
        return 'stable';
    }

    getMarketDriver(data) {
        // Analyze what's driving markets
        const fedMeetingNear = this.isFedMeetingNear();
        const earningsSeason = this.isEarningsSeason();
        
        if (fedMeetingNear) {
            return "Fed decision looms as key market catalyst";
        } else if (earningsSeason) {
            return "Corporate earnings drive sentiment";
        } else {
            return "Technical factors and macro data guide trading";
        }
    }

    getRatesTrend(data) {
        const twoYear = parseFloat(data.twoYear?.value) || 0;
        const previousTwoYear = parseFloat(data.twoYear?.previousValue) || 0;
        
        if (twoYear > previousTwoYear) {
            return "rates drift higher";
        } else if (twoYear < previousTwoYear) {
            return "yields decline";
        } else {
            return "rates hold steady";
        }
    }

    isFedMeetingNear() {
        const today = new Date();
        const fomcDates = [
            new Date('2025-01-29'), new Date('2025-03-19'),
            new Date('2025-05-07'), new Date('2025-06-18'),
            new Date('2025-07-30'), new Date('2025-09-17'),
            new Date('2025-11-05'), new Date('2025-12-17')
        ];
        
        return fomcDates.some(date => {
            const daysUntil = (date - today) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 7;
        });
    }

    isEarningsSeason() {
        const month = new Date().getMonth();
        // Earnings seasons are typically Jan, Apr, Jul, Oct
        return [0, 3, 6, 9].includes(month);
    }

    // Update all summaries - DISABLED: Now using static descriptive text instead of dynamic analysis
    updateAllSummaries(data) {
        // Static descriptive summaries are now used instead of dynamic analysis
        // The banner text is set in HTML and no longer updated by JavaScript

        // // Update main banner summaries
        // const economicSummary = this.generateEconomicSummary(data);
        // const marketSummary = this.generateMarketSummary(data);
        // const ratesSummary = this.generateRatesSummary(data);
        //
        // // Update banner text
        // const economicBanner = document.querySelector('#economic .insights-banner p');
        // const marketBanner = document.querySelector('#markets .insights-banner p');
        // const ratesBanner = document.querySelector('#rates .insights-banner p');
        //
        // if (economicBanner) economicBanner.textContent = economicSummary;
        // if (marketBanner) marketBanner.textContent = marketSummary;
        // if (ratesBanner) ratesBanner.textContent = ratesSummary;
        
        // Update individual metric summaries
        this.updateMetricCards(data);
    }

    updateMetricCards(data) {
        const metrics = [
            'coreCPI', 'corePPI', 'corePCE', 'gdp', 'unemployment',
            'joblessClaims', 'retailSales', 'durableGoods',
            'newHomeSales', 'existingHomeSales', 'consumerSentiment'
        ];
        
        // Metric summaries removed - no longer displaying analysis text
        // metrics.forEach(metricId => {
        //     const card = document.querySelector(`#${metricId}-card`);
        //     if (card && data[metricId]) {
        //         const summaryElement = card.querySelector('.metric-summary');
        //         if (summaryElement) {
        //             const summary = this.generateMetricSummary(
        //                 metricId,
        //                 data[metricId].value,
        //                 data[metricId].previousValue,
        //                 data[metricId].consensus
        //             );
        //             summaryElement.textContent = summary;
        //         }
        //     }
        // });
    }
}

// Initialize the service
const economicInsights = new EconomicInsightsService();

// Export for use in other modules
window.EconomicInsightsService = EconomicInsightsService;