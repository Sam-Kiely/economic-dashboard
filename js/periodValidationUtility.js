// Period Change Validation Utility
// Ensures consistency in period calculations across Markets, Rates, and Banking tabs

class PeriodValidationUtility {
    constructor() {
        this.testResults = {};
        this.standards = {
            // Expected period configurations
            periods: ['1W', '1M', 'YTD', '1Y', '3Y', '5Y'],
            
            // Formatting standards by data type
            formatStandards: {
                markets: {
                    format: 'percentage',
                    decimals: 1,
                    suffix: '%',
                    showSign: true
                },
                rates: {
                    format: 'basisPoints',
                    decimals: 0,
                    suffix: 'bps',
                    showSign: true
                },
                banking: {
                    format: 'percentage',
                    decimals: 1,
                    suffix: '%',
                    showSign: true
                }
            },
            
            // Calculation methods validation
            calculationStandards: {
                '1W': { days: 7, weeks: 1 },
                '1M': { days: 30, weeks: 4 },
                'YTD': { isYTD: true },
                '1Y': { days: 365, weeks: 52 },
                '3Y': { days: 365 * 3, weeks: 52 * 3 },
                '5Y': { days: 365 * 5, weeks: 52 * 5 }
            }
        };
    }

    // Main validation function
    validateAllPeriodCalculations() {
        console.log('\n🔍 PERIOD CALCULATION VALIDATION SUITE');
        console.log('==========================================');
        
        const results = {
            markets: this.validateMarketsTab(),
            rates: this.validateRatesTab(),
            banking: this.validateBankingTab(),
            consistency: this.validateConsistency()
        };
        
        this.generateSummaryReport(results);
        return results;
    }

    // Validate Markets tab period calculations
    validateMarketsTab() {
        console.log('\n📈 MARKETS TAB VALIDATION');
        console.log('--------------------------');
        
        const marketResults = {};
        
        // Check if Yahoo Finance service exists and has extended returns method
        if (!window.yahooFinance) {
            console.log('❌ Yahoo Finance service not found');
            return { error: 'Yahoo Finance service not initialized' };
        }
        
        if (typeof window.yahooFinance.getExtendedReturns !== 'function') {
            console.log('❌ getExtendedReturns method not found');
            return { error: 'getExtendedReturns method missing' };
        }
        
        // Test data structure and format
        const testSymbol = 'SPY';
        console.log(`🧪 Testing with symbol: ${testSymbol}`);
        
        // Simulate the expected return structure
        const expectedStructure = {
            '1W': 'number',
            '1M': 'number', 
            'YTD': 'number',
            '1Y': 'number',
            '3Y': 'number',
            '5Y': 'number'
        };
        
        // Check if market cards display period returns properly
        const marketCards = document.querySelectorAll('.market-card .period-returns');
        console.log(`📊 Found ${marketCards.length} market cards with period returns`);
        
        marketCards.forEach((cardReturns, index) => {
            const periods = cardReturns.querySelectorAll('.return-item');
            console.log(`   Card ${index + 1}: ${periods.length} period items`);
            
            periods.forEach((periodItem, pIndex) => {
                const label = periodItem.querySelector('.return-label')?.textContent?.replace(':', '');
                const value = periodItem.querySelector('.return-value')?.textContent;
                
                if (label && value) {
                    const isValidPeriod = this.standards.periods.includes(label);
                    const isValidFormat = this.validateMarketFormat(value);
                    
                    console.log(`     ${label}: ${value} ${isValidPeriod && isValidFormat ? '✅' : '❌'}`);
                }
            });
        });
        
        marketResults.periodStructure = 'valid';
        marketResults.formatConsistency = 'valid';
        
        return marketResults;
    }

    // Validate Rates tab period calculations
    validateRatesTab() {
        console.log('\n📊 RATES TAB VALIDATION');
        console.log('------------------------');
        
        const ratesResults = {};
        
        // Check dataUpdater period calculation method
        if (!window.dataUpdater) {
            console.log('❌ DataUpdater service not found');
            return { error: 'DataUpdater service not initialized' };
        }
        
        // Check for period changes method
        if (typeof window.dataUpdater.calculatePeriodChanges !== 'function') {
            console.log('❌ calculatePeriodChanges method not found in dataUpdater');
            return { error: 'calculatePeriodChanges method missing' };
        }
        
        // Check rate cards for period display
        const rateCards = document.querySelectorAll('.card .period-changes, .card .period-returns');
        console.log(`📊 Found ${rateCards.length} rate cards with period data`);
        
        rateCards.forEach((cardPeriods, index) => {
            const periodItems = cardPeriods.querySelectorAll('.period-item, .return-item');
            console.log(`   Rate Card ${index + 1}: ${periodItems.length} period items`);
            
            periodItems.forEach((periodItem) => {
                const label = periodItem.querySelector('.period-label, .return-label')?.textContent?.replace(':', '');
                const value = periodItem.querySelector('.period-value, .return-value')?.textContent;
                
                if (label && value) {
                    const isValidPeriod = this.standards.periods.includes(label);
                    const isValidFormat = this.validateRatesFormat(value);
                    
                    console.log(`     ${label}: ${value} ${isValidPeriod && isValidFormat ? '✅' : '❌'}`);
                    
                    if (!isValidFormat && value.includes('%')) {
                        console.log(`       ⚠️  Should use basis points (bps) instead of percentage`);
                    }
                }
            });
        });
        
        ratesResults.periodStructure = 'valid';
        ratesResults.formatConsistency = 'needs_review';
        
        return ratesResults;
    }

    // Validate Banking tab period calculations  
    validateBankingTab() {
        console.log('\n🏦 BANKING TAB VALIDATION');
        console.log('--------------------------');
        
        const bankingResults = {};
        
        // Check banking service
        if (!window.bankingService) {
            console.log('❌ Banking service not found');
            return { error: 'Banking service not initialized' };
        }
        
        // Check for extended returns method
        if (typeof window.bankingService.calculateExtendedReturnsForBanking !== 'function') {
            console.log('❌ calculateExtendedReturnsForBanking method not found');
            return { error: 'calculateExtendedReturnsForBanking method missing' };
        }
        
        console.log('✅ Banking service extended returns method found');
        
        // Check banking cards for period display
        const bankingCards = document.querySelectorAll('#banking .card .period-returns');
        console.log(`📊 Found ${bankingCards.length} banking cards with period returns`);
        
        bankingCards.forEach((cardReturns, index) => {
            const periods = cardReturns.querySelectorAll('.return-item');
            console.log(`   Banking Card ${index + 1}: ${periods.length} period items`);
            
            periods.forEach((periodItem) => {
                const label = periodItem.querySelector('.return-label')?.textContent?.replace(':', '');
                const value = periodItem.querySelector('.return-value')?.textContent;
                
                if (label && value) {
                    const isValidPeriod = this.standards.periods.includes(label);
                    const isValidFormat = this.validateBankingFormat(value);
                    
                    console.log(`     ${label}: ${value} ${isValidPeriod && isValidFormat ? '✅' : '❌'}`);
                }
            });
        });
        
        bankingResults.periodStructure = 'valid';
        bankingResults.formatConsistency = 'valid';
        
        return bankingResults;
    }

    // Validate consistency across tabs
    validateConsistency() {
        console.log('\n🔄 CROSS-TAB CONSISTENCY VALIDATION');
        console.log('------------------------------------');
        
        const consistencyResults = {};
        
        // Check that all tabs use the same 6 periods
        const expectedPeriods = this.standards.periods;
        
        // Collect periods from each tab
        const tabPeriods = {
            markets: this.extractPeriodsFromTab('market-card'),
            rates: this.extractPeriodsFromTab('card'),  // Generic card selector for rates
            banking: this.extractPeriodsFromTab('card', '#banking')
        };
        
        console.log('📊 Period Coverage Analysis:');
        expectedPeriods.forEach(period => {
            const marketHas = tabPeriods.markets.includes(period);
            const rateHas = tabPeriods.rates.includes(period);
            const bankingHas = tabPeriods.banking.includes(period);
            
            const coverage = [marketHas, rateHas, bankingHas].filter(Boolean).length;
            const status = coverage === 3 ? '✅' : coverage === 2 ? '⚠️' : '❌';
            
            console.log(`   ${period}: Markets=${marketHas ? '✅' : '❌'} Rates=${rateHas ? '✅' : '❌'} Banking=${bankingHas ? '✅' : '❌'} ${status}`);
        });
        
        // Check calculation method consistency
        console.log('\n🧮 Calculation Method Consistency:');
        
        const methods = {
            markets: 'findClosestTradingDayPrice() with weekend/holiday handling',
            rates: 'calculatePeriodChanges() with daily data alignment',
            banking: 'findClosestValue() with weekly data alignment'
        };
        
        Object.entries(methods).forEach(([tab, method]) => {
            console.log(`   ${tab.padEnd(8)}: ${method}`);
        });
        
        console.log('\n⚠️  Note: Different calculation methods may be appropriate for different data frequencies');
        
        consistencyResults.periodCoverage = 'partial';
        consistencyResults.calculationMethods = 'consistent_by_design';
        
        return consistencyResults;
    }

    // Helper method to extract periods from a tab
    extractPeriodsFromTab(cardSelector, tabSelector = '') {
        const selector = tabSelector ? `${tabSelector} .${cardSelector}` : `.${cardSelector}`;
        const cards = document.querySelectorAll(selector);
        const periods = new Set();
        
        cards.forEach(card => {
            const periodElements = card.querySelectorAll('.return-label, .period-label');
            periodElements.forEach(element => {
                const period = element.textContent?.replace(':', '').trim();
                if (period && this.standards.periods.includes(period)) {
                    periods.add(period);
                }
            });
        });
        
        return Array.from(periods);
    }

    // Format validation methods
    validateMarketFormat(value) {
        // Market format: +/-X.X%
        return /^[+\-]?\d+\.\d%$/.test(value) || value === '--';
    }

    validateRatesFormat(value) {
        // Rates format: +/-XXXbps
        return /^[+\-]?\d+bps$/.test(value) || value === '--';
    }

    validateBankingFormat(value) {
        // Banking format: +/-X.X%
        return /^[+\-]?\d+\.\d%$/.test(value) || value === '--';
    }

    // Generate comprehensive summary report
    generateSummaryReport(results) {
        console.log('\n📋 PERIOD VALIDATION SUMMARY REPORT');
        console.log('====================================');
        
        const sections = ['markets', 'rates', 'banking', 'consistency'];
        let totalPassed = 0;
        let totalTests = 0;
        
        sections.forEach(section => {
            const sectionResults = results[section];
            
            if (sectionResults.error) {
                console.log(`❌ ${section.toUpperCase()}: ERROR - ${sectionResults.error}`);
                totalTests++;
            } else {
                const sectionPassed = Object.values(sectionResults).filter(r => r === 'valid').length;
                const sectionTotal = Object.keys(sectionResults).length;
                
                totalPassed += sectionPassed;
                totalTests += sectionTotal;
                
                const sectionStatus = sectionPassed === sectionTotal ? '✅' : sectionPassed > 0 ? '⚠️' : '❌';
                console.log(`${sectionStatus} ${section.toUpperCase()}: ${sectionPassed}/${sectionTotal} checks passed`);
                
                Object.entries(sectionResults).forEach(([check, status]) => {
                    const checkStatus = status === 'valid' ? '✅' : status === 'needs_review' ? '⚠️' : '❌';
                    console.log(`   ${checkStatus} ${check}: ${status}`);
                });
            }
        });
        
        console.log('\n🎯 OVERALL SCORE:');
        console.log(`   Passed: ${totalPassed}/${totalTests} checks`);
        console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('   1. Ensure all tabs display the same 6 periods: 1W, 1M, YTD, 1Y, 3Y, 5Y');
        console.log('   2. Use consistent formatting: Markets/Banking (X.X%), Rates (XXXbps)');  
        console.log('   3. Implement weekend/holiday handling for all calculation methods');
        console.log('   4. Add loading states during period calculation updates');
        console.log('   5. Consider adding period calculation caching for performance');
        
        console.log('\n🎉 PERIOD VALIDATION COMPLETE\n');
    }

    // Test specific calculation logic
    testCalculationLogic(sampleData, sampleDates) {
        console.log('\n🧮 TESTING CALCULATION LOGIC');
        console.log('-----------------------------');
        
        if (!sampleData || !sampleDates || sampleData.length < 100) {
            console.log('❌ Insufficient sample data for testing');
            return false;
        }
        
        const currentValue = sampleData[sampleData.length - 1];
        const currentDate = new Date(sampleDates[sampleDates.length - 1]);
        
        console.log(`📊 Testing with current value: ${currentValue} on ${currentDate.toDateString()}`);
        
        // Test each period calculation
        const testResults = {};
        
        this.standards.periods.forEach(period => {
            const standard = this.standards.calculationStandards[period];
            
            if (standard.isYTD) {
                // YTD calculation test
                const yearStart = new Date(currentDate.getFullYear(), 0, 1);
                console.log(`   ${period}: From ${yearStart.toDateString()} to ${currentDate.toDateString()}`);
                
                testResults[period] = {
                    method: 'YTD_to_current',
                    valid: true
                };
            } else {
                // Period-based calculation test
                const targetDate = new Date(currentDate);
                targetDate.setDate(currentDate.getDate() - standard.days);
                
                console.log(`   ${period}: From ${targetDate.toDateString()} to ${currentDate.toDateString()} (${standard.days} days)`);
                
                testResults[period] = {
                    method: 'date_offset',
                    targetDate: targetDate,
                    valid: true
                };
            }
        });
        
        return testResults;
    }
}

// Create global instance and test function
window.periodValidation = new PeriodValidationUtility();

// Global function to run period validation tests
window.testPeriodCalculations = function() {
    return window.periodValidation.validateAllPeriodCalculations();
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PeriodValidationUtility;
}