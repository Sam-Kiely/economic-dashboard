// Data Updater - Handles transitioning from mock to real data
class DataUpdater {
    constructor() {
        this.useRealData = false;
        this.updateInProgress = false;
        this.treasuryData = {}; // Store treasury values for spread calculation
    }

    // Check if API keys are configured
    checkAPIKeys() {
        const fredConfigured = API_CONFIG.FRED.apiKey !== 'YOUR_FRED_API_KEY_HERE';

        return {
            fred: fredConfigured,
            anyConfigured: fredConfigured
        };
    }

    // Calculate period changes for different time periods
    calculatePeriodChanges(historicalData, dates) {
        if (!historicalData || !dates || historicalData.length === 0) {
            return null;
        }
        
        const current = historicalData[historicalData.length - 1];
        const changes = {};
        
        // 1 Week - Use percentage calculation for market data
        if (historicalData.length >= 2) {
            const weekAgo = historicalData[Math.max(0, historicalData.length - 2)];
            if (weekAgo !== 0) {
                changes['1W'] = ((current - weekAgo) / weekAgo) * 100;
            }
        }
        
        // 1 Month - Use percentage calculation for market data
        if (historicalData.length >= 5) {
            const monthAgo = historicalData[historicalData.length - 5];
            if (monthAgo !== 0) {
                changes['1M'] = ((current - monthAgo) / monthAgo) * 100;
            }
        }
        
        // Year to Date - Use percentage calculation for market data
        const currentYear = new Date().getFullYear();
        let ytdStartIndex = 0;
        for (let i = 0; i < dates.length; i++) {
            if (new Date(dates[i]).getFullYear() === currentYear) {
                ytdStartIndex = i;
                break;
            }
        }
        if (ytdStartIndex < historicalData.length - 1) {
            const ytdStart = historicalData[ytdStartIndex];
            if (ytdStart !== 0) {
                changes['YTD'] = ((current - ytdStart) / ytdStart) * 100;
            }
        }
        
        // 1 Year - Use percentage calculation for market data
        if (dates && dates.length >= 2) {
            const oneYearAgo = this.findValueAtDate(historicalData, dates, 365);
            if (oneYearAgo !== null && oneYearAgo !== 0) {
                changes['1Y'] = ((current - oneYearAgo) / oneYearAgo) * 100; // Convert to percentage
            }
        } else if (historicalData.length >= 13) {
            // Fallback for monthly data
            const yearAgo = historicalData[0];
            if (yearAgo !== 0) {
                changes['1Y'] = ((current - yearAgo) / yearAgo) * 100;
            }
        }
        
        // 3 Year - Use percentage calculation for market data
        if (dates && dates.length >= 2) {
            const threeYearsAgo = this.findValueAtDate(historicalData, dates, 1095); // 3 * 365
            console.log(`3Y calculation: current=${current}, threeYearsAgo=${threeYearsAgo}, dates.length=${dates.length}`);
            if (threeYearsAgo !== null && threeYearsAgo !== 0) {
                changes['3Y'] = ((current - threeYearsAgo) / threeYearsAgo) * 100; // Convert to percentage
                console.log(`3Y result: ${changes['3Y']}%`);
            }
        }
        
        // 5 Year - Use percentage calculation for market data
        if (dates && dates.length >= 2) {
            const fiveYearsAgo = this.findValueAtDate(historicalData, dates, 1825); // 5 * 365
            console.log(`5Y calculation: current=${current}, fiveYearsAgo=${fiveYearsAgo}, dates.length=${dates.length}`);
            if (fiveYearsAgo !== null && fiveYearsAgo !== 0) {
                changes['5Y'] = ((current - fiveYearsAgo) / fiveYearsAgo) * 100; // Convert to percentage
                console.log(`5Y result: ${changes['5Y']}%`);
            }
        }

        // QTD (Quarter-to-Date) - Change from beginning of current quarter
        const currentDate = new Date();
        const currentQuarter = Math.floor((currentDate.getMonth()) / 3);
        const quarterStartMonth = currentQuarter * 3;
        const quarterStart = new Date(currentDate.getFullYear(), quarterStartMonth, 1);

        let qtdStartIndex = -1;
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            if (date >= quarterStart) {
                qtdStartIndex = i;
                break;
            }
        }
        if (qtdStartIndex >= 0 && qtdStartIndex < historicalData.length - 1) {
            const qtdStart = historicalData[qtdStartIndex];
            if (qtdStart !== 0) {
                changes['QTD'] = ((current - qtdStart) / qtdStart) * 100;
            }
        }

        // YoY Qtr (Year-over-Year Quarter) - Change from same quarter last year
        const lastYearQuarterStart = new Date(currentDate.getFullYear() - 1, quarterStartMonth, 1);
        const lastYearQuarterEnd = new Date(currentDate.getFullYear() - 1, quarterStartMonth + 3, 0);

        let yoyQtrValue = null;
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            if (date >= lastYearQuarterStart && date <= lastYearQuarterEnd) {
                // Find the closest date to current day last year quarter
                const dayOfQuarter = Math.floor((currentDate - quarterStart) / (1000 * 60 * 60 * 24));
                const targetDate = new Date(lastYearQuarterStart.getTime() + (dayOfQuarter * 1000 * 60 * 60 * 24));

                // Find closest match
                if (!yoyQtrValue || Math.abs(date - targetDate) < Math.abs(new Date(dates[yoyQtrValue]) - targetDate)) {
                    yoyQtrValue = i;
                }
            }
        }
        if (yoyQtrValue !== null && historicalData[yoyQtrValue] !== 0) {
            changes['YoY Qtr'] = ((current - historicalData[yoyQtrValue]) / historicalData[yoyQtrValue]) * 100;
        }

        return changes;
    }

    // Helper function to find the closest value at a specific number of days ago
    findValueAtDate(historicalData, dates, daysBack) {
        if (!historicalData || !dates || historicalData.length === 0 || dates.length === 0) {
            return null;
        }
        
        // Calculate target date (daysBack days ago from the most recent date)
        const latestDate = new Date(dates[dates.length - 1]);
        const targetDate = new Date(latestDate);
        targetDate.setDate(targetDate.getDate() - daysBack);
        
        // Find the closest date in our data
        let closestIndex = -1;
        let minDifference = Infinity;
        
        for (let i = 0; i < dates.length; i++) {
            const dataDate = new Date(dates[i]);
            const difference = Math.abs(dataDate - targetDate);
            
            if (difference < minDifference) {
                minDifference = difference;
                closestIndex = i;
            }
        }
        
        // Return the value if we found a reasonably close match (within 60 days for flexibility)
        if (closestIndex >= 0 && minDifference <= 60 * 24 * 60 * 60 * 1000) { // 60 days in milliseconds
            return historicalData[closestIndex];
        }
        
        return null;
    }

    // Update 5-Year Treasury period changes using extendedReturns (same as SOFR methodology)
    update5YearTreasuryPeriodChanges(card, extendedReturns) {
        console.log('🔧 update5YearTreasuryPeriodChanges called with:', extendedReturns);
        console.log('🔧 Card element:', card);
        
        let periodElement = card.querySelector('.period-changes');
        if (!periodElement) {
            periodElement = document.createElement('div');
            periodElement.className = 'period-changes';
            
            const changeElement = card.querySelector('.card-change');
            if (changeElement) {
                changeElement.insertAdjacentElement('afterend', periodElement);
            }
        }

        let html = '<div class="period-row">';
        
        // Use the exact same periods as SOFR: 1W, 1M, YTD, 1Y, 3Y, 5Y
        const periods = ['1W', '1M', 'YTD', '1Y', '3Y', '5Y'];
        
        periods.forEach(period => {
            if (extendedReturns[period] !== undefined && extendedReturns[period] !== null) {
                const value = extendedReturns[period]; // Already in basis points from calculateExtendedReturnsForRates
                const isPositive = value > 0;
                const isZero = value === 0;
                
                // Format as basis points with proper sign
                const sign = isPositive ? '+' : '';
                const formattedValue = `${sign}${value.toFixed(0)}bps`;
                
                // Color class based on value
                let colorClass = '';
                if (!isZero) {
                    colorClass = isPositive ? 'positive' : 'negative';
                }
                
                html += `<span class="period-item">${period}: <span class="change-value ${colorClass}">${formattedValue}</span></span> `;
            }
        });
        
        html += '</div>';
        periodElement.innerHTML = html;
        console.log(`✅ Updated 5-Year Treasury period changes:`, extendedReturns);
    }

    // Update Fed Funds period changes using extendedReturns (same as SOFR methodology)
    updateFedFundsPeriodChanges(card, extendedReturns) {
        let periodElement = card.querySelector('.period-changes');
        if (!periodElement) {
            periodElement = document.createElement('div');
            periodElement.className = 'period-changes';
            
            const changeElement = card.querySelector('.card-change');
            if (changeElement) {
                changeElement.insertAdjacentElement('afterend', periodElement);
            }
        }

        let html = '<div class="period-row">';
        
        // Use the exact same periods as SOFR: 1W, 1M, YTD, 1Y, 3Y, 5Y
        const periods = ['1W', '1M', 'YTD', '1Y', '3Y', '5Y'];
        
        periods.forEach(period => {
            if (extendedReturns[period] !== undefined && extendedReturns[period] !== null) {
                const value = extendedReturns[period]; // Already in basis points from calculateExtendedReturnsForRates
                const isPositive = value > 0;
                const isZero = value === 0;
                
                // Format as basis points with proper sign
                let formattedValue;
                if (isZero) {
                    formattedValue = '0bps';
                } else if (isPositive) {
                    formattedValue = '+' + Math.abs(value).toFixed(0) + 'bps';
                } else {
                    formattedValue = '-' + Math.abs(value).toFixed(0) + 'bps';
                }
                
                // For rates: increases are negative for economy, decreases are positive
                let className;
                if (isZero) {
                    className = 'neutral';
                } else if (isPositive) {
                    className = 'negative'; // Rate increases are bad for economy
                } else {
                    className = 'positive'; // Rate decreases are good for economy
                }
                
                html += `
                    <div class="period-item">
                        <span class="period-label">${period}:</span>
                        <span class="period-value ${className}">
                            ${formattedValue}
                        </span>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        periodElement.innerHTML = html;
    }

    // Display period changes on the card
    updatePeriodChanges(card, changes, cardId) {
        let periodElement = card.querySelector('.period-changes');
        if (!periodElement) {
            periodElement = document.createElement('div');
            periodElement.className = 'period-changes';
            
            const changeElement = card.querySelector('.card-change');
            if (changeElement) {
                changeElement.insertAdjacentElement('afterend', periodElement);
            }
        }
        
        let html = '<div class="period-row">';
        
        ['1W', '1M', 'YTD', '1Y', '3Y', '5Y'].forEach(period => {
            if (changes[period] !== undefined && changes[period] !== null) {
                const value = changes[period];
                const isPositive = value > 0;
                
                let formattedValue;
                if (cardId.includes('jobless')) {
                    formattedValue = (Math.abs(value) / 1000).toFixed(0) + 'K';
                } else if (cardId.includes('fedfunds') || cardId.includes('treasury') || cardId.includes('2yr') || cardId.includes('10yr') || 
                          cardId.includes('30yr') || cardId.includes('sofr') || cardId.includes('tbill') || cardId.includes('mortgage') || 
                          cardId.includes('highyield') || cardId.includes('prime')) {
                    formattedValue = Math.abs(value * 100).toFixed(0) + 'bps';
                } else if (cardId.includes('bitcoin') || cardId.includes('sp500') || cardId.includes('dow') || 
                          cardId.includes('nasdaq') || cardId.includes('gold') || cardId.includes('oil') || cardId.includes('dxy')) {
                    formattedValue = Math.abs(value).toFixed(1) + '%';
                } else {
                    formattedValue = Math.abs(value).toFixed(1) + '%';
                }
                
                let className = 'neutral';
                if (cardId.includes('cpi') || cardId.includes('unemployment') || cardId.includes('jobless')) {
                    className = isPositive ? 'negative' : 'positive';
                } else if (cardId.includes('treasury') || cardId.includes('fedfunds') || cardId.includes('mortgage') || 
                          cardId.includes('2yr') || cardId.includes('10yr') || cardId.includes('30yr') || 
                          cardId.includes('sofr') || cardId.includes('tbill') || cardId.includes('highyield') || cardId.includes('prime')) {
                    className = isPositive ? 'negative' : 'positive';
                } else {
                    className = isPositive ? 'positive' : 'negative';
                }
                
                html += `
                    <div class="period-item">
                        <span class="period-label">${period}:</span>
                        <span class="period-value ${className}">
                            ${isPositive ? '+' : '-'}${formattedValue}
                        </span>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        periodElement.innerHTML = html;
    }

    // Check if a card should show period changes
    shouldShowPeriodChanges(cardId) {
        // Only show period changes for Markets tab (not rates, Fed Funds has special handling)
        // Markets: bitcoin, sp500, dow, nasdaq, gold, oil, dxy
        const marketsIndicators = ['bitcoin', 'sp500', 'dow', 'nasdaq', 'gold', 'oil', 'dxy'];
        
        return marketsIndicators.some(indicator => cardId.includes(indicator));
    }

    // Calculate next release date based on schedule
    calculateNextRelease(seriesId, observationDate) {
        const schedule = API_CONFIG.RELEASE_SCHEDULES[seriesId];
        if (!schedule) return null;
        
        const obsDate = new Date(observationDate);
        const today = new Date();
        let nextRelease = new Date();
        
        if (schedule.daily) {
            // Daily data - next business day
            nextRelease = new Date(today);
            nextRelease.setDate(today.getDate() + 1);
            // Skip weekends
            if (nextRelease.getDay() === 6) nextRelease.setDate(nextRelease.getDate() + 2);
            if (nextRelease.getDay() === 0) nextRelease.setDate(nextRelease.getDate() + 1);
        } else if (schedule.weekly) {
            // Weekly releases (jobless claims - every Thursday)
            nextRelease = new Date(today);
            const daysUntilThursday = (4 - today.getDay() + 7) % 7 || 7;
            nextRelease.setDate(today.getDate() + daysUntilThursday);
        } else if (schedule.quarterly) {
            // Quarterly releases (GDP - ~30 days after quarter end)
            const currentQuarter = Math.floor(obsDate.getMonth() / 3);
            const nextQuarterEnd = new Date(obsDate.getFullYear(), (currentQuarter + 1) * 3 + 1, 0);
            nextRelease = new Date(nextQuarterEnd);
            nextRelease.setDate(nextQuarterEnd.getDate() + 30);
        } else if (schedule.fomc) {
            // FOMC meetings (approximately every 6 weeks)
            nextRelease = new Date(obsDate);
            nextRelease.setDate(obsDate.getDate() + 42); // ~6 weeks
        } else if (schedule.day) {
            // Monthly releases
            nextRelease = new Date(obsDate);
            nextRelease.setMonth(obsDate.getMonth() + 2); // Data for month X usually released in month X+2
            
            if (seriesId === 'unemployment') {
                // First Friday of the month
                nextRelease.setDate(1);
                while (nextRelease.getDay() !== 5) {
                    nextRelease.setDate(nextRelease.getDate() + 1);
                }
            } else {
                nextRelease.setDate(schedule.day);
            }
        }
        
        return nextRelease;
    }

    // Format observation date
    formatObservationDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = date.getFullYear().toString().slice(-2);
        return `${months[date.getMonth()]} '${year}`;
    }

    // Format next release date
    formatNextRelease(date) {
        if (!date) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `Next: ${months[date.getMonth()]} ${date.getDate()}`;
    }

    // Update a specific card with new data
    updateCard(cardId, data) {
        // Enhanced debugging for GDP
        if (cardId === 'gdp-chart') {
            console.log('📊 GDP: updateCard called with:', {
                cardId,
                dataKeys: Object.keys(data || {}),
                current: data?.current,
                historicalDataLength: data?.historicalData?.length,
                datesLength: data?.dates?.length
            });
        }

        // Find the chart element first
        const chartElement = document.getElementById(cardId);
        if (!chartElement) {
            console.warn(`Chart element not found: ${cardId}`);
            if (cardId === 'gdp-chart') {
                console.error('📊 GDP: Chart element not found in DOM!');
            }
            return;
        }

        const card = chartElement.closest('.card');
        if (!card) {
            console.warn(`Card not found for chart: ${cardId}`);
            if (cardId === 'gdp-chart') {
                console.error('📊 GDP: Card element not found!');
            }
            return;
        }

        console.log(`Updating card for ${cardId}`, data);

        // Enhanced debugging for GDP
        if (cardId === 'gdp-chart') {
            console.log('📊 GDP: Chart element found, proceeding with update');
        }

        // Update observation date - skip for rate cards (daily market data doesn't need "as of" dates)
        const isRateCard = ['2yr', '10yr', '30yr', '5yr', 'sofr', 'fedfunds', 'tbill', 'highyield', 'spread', 'mortgage', 'prime'].some(rate => cardId.includes(rate));

        // Auto-setup tooltips for rate charts when they update
        if (isRateCard && chartElement && chartElement.chart) {
            console.log(`🔧 Auto-setting up tooltips for rate card ${cardId}`);
            // Use setTimeout to ensure chart is fully updated before setting up tooltips
            setTimeout(() => {
                this.setupChartTooltips(chartElement.chart, cardId);
                console.log(`✅ Auto-setup tooltips completed for ${cardId}`);
            }, 100);
        }

        const dateElement = card.querySelector('.card-date');

        if (dateElement && !isRateCard) {
            // If we have formatted dates array, use the last one
            if (data.dates && data.dates.length > 0) {
                const lastChartDate = data.dates[data.dates.length - 1];
                // The dates are already formatted like "Aug '24" or "Q3'24"
                dateElement.textContent = `As of ${lastChartDate}`;
            } else if (data.observationDate) {
                // Fallback to observation date if no dates array
                const date = new Date(data.observationDate);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                dateElement.textContent = `As of ${months[date.getMonth()]} ${date.getFullYear()}`;
            }
        } else if (dateElement && isRateCard) {
            // Clear any existing date text for rate cards
            dateElement.textContent = '';
        }

        // Update next release date (skip for rate cards)
        
        const nextReleaseElement = card.querySelector('.next-release');
        if (data.seriesId && !isRateCard) {
            const nextRelease = this.calculateNextRelease(data.seriesId, data.observationDate);
            if (nextRelease) {
                if (!nextReleaseElement) {
                    // Create next release element if it doesn't exist
                    const newReleaseElement = document.createElement('div');
                    newReleaseElement.className = 'next-release';
                    newReleaseElement.textContent = this.formatNextRelease(nextRelease);
                    // Insert after card-description if it exists
                    const descElement = card.querySelector('.card-description');
                    if (descElement) {
                        descElement.insertAdjacentElement('afterend', newReleaseElement);
                    }
                } else {
                    nextReleaseElement.textContent = this.formatNextRelease(nextRelease);
                }
            }
        }

        // Update value
        const valueElement = card.querySelector('.card-value');
        if (valueElement && data.current !== undefined) {
            // Debug Large Time Deposits issue
            if (cardId.includes('largetime')) {
                console.log(`🔍 LARGETIME DEBUG: CardId=${cardId}, Current=${data.current}, SeriesId=${data.seriesId}, DataKeys=${Object.keys(data)}`);
            }
            if (typeof data.current === 'number') {
                // Format based on the type of data
                if (cardId.includes('trade')) {
                    // Trade deficit in billions
                    valueElement.textContent = '$' + data.current.toFixed(1) + 'B';
                } else if (cardId.includes('2yr') || cardId.includes('5yr') || cardId.includes('10yr') || cardId.includes('30yr')) {
                    // Treasury yields to 2 decimal places
                    valueElement.textContent = data.current.toFixed(2) + '%';
                } else if (cardId.includes('spread')) {
                    // Format spread in basis points (already converted in apiService-v2)
                    const bpsValue = data.current; // Already in basis points
                    valueElement.textContent = (bpsValue >= 0 ? '+' : '') + bpsValue.toFixed(0) + ' bps';
                } else if (cardId.includes('rate') || cardId.includes('yield') || cardId.includes('fedfunds') || cardId.includes('mortgage') || cardId.includes('prime') || cardId.includes('sofr') || cardId.includes('tbill')) {
                    valueElement.textContent = data.current.toFixed(2) + '%';
                } else if (cardId.includes('unemployment')) {
                    valueElement.textContent = data.current.toFixed(1) + '%';
                } else if (cardId.includes('cpi') || cardId.includes('pce') || cardId.includes('ppi')) {
                    // YoY inflation metrics
                    valueElement.textContent = data.current.toFixed(1) + '%';
                } else if (cardId.includes('gdp') || cardId.includes('retail') || cardId.includes('durablegoods')) {
                    valueElement.textContent = data.current.toFixed(1) + '%';
                } else if (cardId.includes('jobless')) {
                    valueElement.textContent = data.current.toFixed(0) + 'K';
                } else if (cardId.includes('newhomes')) {
                    valueElement.textContent = data.current.toFixed(0) + 'K';
                } else if (cardId.includes('existinghomes')) {
                    // Data is already in thousands, so divide by 1000 to get millions
                    valueElement.textContent = (data.current / 1000).toFixed(2) + 'M';
                } else if (cardId.includes('sentiment')) {
                    valueElement.textContent = data.current.toFixed(1);
                } else if (cardId.includes('bitcoin')) {
                    valueElement.textContent = '$' + data.current.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });
                } else if (cardId.includes('sp500') || cardId.includes('dow') || cardId.includes('nasdaq')) {
                    valueElement.textContent = data.current.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                } else if (cardId.includes('largetime')) {
                    // Large Time Deposits in Trillions
                    valueElement.textContent = '$' + data.current.toFixed(3) + 'Tn';
                } else if (cardId.includes('loans') || cardId.includes('deposits') || cardId.includes('borrowings')) {
                    // H8 banking data already converted to Trillions in apiService-v2
                    valueElement.textContent = '$' + data.current.toFixed(3) + 'Tn';
                } else {
                    valueElement.textContent = data.current.toFixed(1) + '%';
                }
            }
        }

        // Update change indicator with period label
        const changeElement = card.querySelector('.card-change');
        if (changeElement && data.change !== undefined && data.changeType) {
            changeElement.className = 'card-change ' + data.changeType;
            
            let arrow = '';
            let changeText = '';
            let periodLabel = data.changeLabel || ''; // Use the period label from data
            
            // For CPI, inflation, unemployment, and rates: up is bad (negative), down is good (positive)
            if (cardId.includes('cpi') || cardId.includes('pce') || cardId.includes('ppi') || cardId.includes('unemployment') || 
                cardId.includes('jobless') || cardId.includes('trade')) {
                arrow = data.changeType === 'positive' ? '▼' : data.changeType === 'negative' ? '▲' : '—';
            } 
            // For treasury yields and rates: up is negative for borrowers
            else if (cardId.includes('treasury') || cardId.includes('2yr') || cardId.includes('5yr') || cardId.includes('10yr') || cardId.includes('30yr') || 
                     cardId.includes('fedfunds') || cardId.includes('mortgage') || cardId.includes('prime')) {
                arrow = data.changeType === 'positive' ? '▼' : data.changeType === 'negative' ? '▲' : '—';
            }
            // For most other metrics (stocks, GDP), up is positive
            else {
                arrow = data.changeType === 'positive' ? '▲' : data.changeType === 'negative' ? '▼' : '—';
            }
            
            // Format change text based on data type
            if (cardId.includes('bitcoin')) {
                changeText = Math.abs(data.change).toFixed(2) + '%';
            } else if (cardId.includes('unemployment')) {
                changeText = Math.abs(data.change).toFixed(2) + '%';
            } else if (cardId.includes('cpi') || cardId.includes('pce') || cardId.includes('ppi')) {
                changeText = Math.abs(data.change).toFixed(2) + '%';
            } else if (cardId.includes('trade')) {
                changeText = Math.abs(data.change).toFixed(1) + '%';
            } else if (cardId.includes('retail') || cardId.includes('durablegoods') || cardId.includes('gdp')) {
                changeText = Math.abs(data.change).toFixed(2) + '%';
            } else if (cardId.includes('jobless')) {
                changeText = Math.abs(data.change).toFixed(0) + 'K';
            } else if (cardId.includes('newhomes') || cardId.includes('existinghomes')) {
                changeText = Math.abs(data.change).toFixed(1) + '%';
            } else if (cardId.includes('sentiment')) {
                changeText = Math.abs(data.change).toFixed(1) + 'pts';
            } else if (cardId.includes('spread')) {
                changeText = Math.abs(data.change).toFixed(0) + ' bps';
            } else if (cardId.includes('fedfunds') || cardId.includes('treasury') || cardId.includes('2yr') || cardId.includes('5yr') || cardId.includes('10yr') || cardId.includes('30yr') || 
                       cardId.includes('sofr') || cardId.includes('tbill') || cardId.includes('mortgage') || cardId.includes('highyield') || cardId.includes('prime')) {
                changeText = Math.abs(data.change).toFixed(0) + ' bps';
            } else {
                changeText = Math.abs(data.change).toFixed(2) + '%';
            }
            
            // Include period label if provided
            if (periodLabel) {
                changeElement.innerHTML = `<span>${arrow}</span> ${changeText} ${periodLabel}`;
            } else {
                changeElement.innerHTML = `<span>${arrow}</span> ${changeText}`;
            }
        }

        // Update period returns for all rate cards
        if (isRateCard && data.returns) {
            this.updateRatePeriodReturns(card, data.returns);
        }
        // Add H8-specific period changes (QTD and YoY Quarter)
        else if (cardId.includes('loans') || cardId.includes('deposits') || cardId.includes('borrowings') || cardId.includes('largetime')) {
            if (data.h8Changes) {
                this.updateH8PeriodChanges(card, data.h8Changes);
            }
        }
        // Add period changes display ONLY for Markets tab (not rates)
        else if (this.shouldShowPeriodChanges(cardId) && data.historicalData && data.dates) {
            const periodChanges = this.calculatePeriodChanges(data.historicalData, data.dates);
            if (periodChanges) {
                this.updatePeriodChanges(card, periodChanges, cardId);
            }
        } else {
            // Remove period changes if they exist on Economic Overview cards
            const periodElement = card.querySelector('.period-changes');
            if (periodElement) {
                periodElement.remove();
            }
        }

        // Update chart if data available
        if (data.historicalData && data.dates && chartElement) {
            if (cardId === 'gdp-chart') {
                console.log('📊 GDP: Calling updateChart with:', {
                    historicalDataLength: data.historicalData.length,
                    datesLength: data.dates.length,
                    historicalData: data.historicalData,
                    dates: data.dates
                });
            }
            // Pass originalDates if available for proper tooltip formatting
            this.updateChart(cardId, data.historicalData, data.dates, data.originalDates);
        } else if (cardId === 'gdp-chart') {
            console.error('📊 GDP: Chart update skipped - missing data:', {
                hasHistoricalData: !!data.historicalData,
                historicalDataLength: data.historicalData?.length || 0,
                hasDates: !!data.dates,
                datesLength: data.dates?.length || 0,
                hasChartElement: !!chartElement
            });
        }

        // Update period returns for rate cards
        if (isRateCard && data.returns && Object.keys(data.returns).length > 0) {
            this.updateRatePeriodReturns(card, data.returns);
        }

        // Store treasury data for spread calculation
        if (cardId === '2yr-chart') {
            this.treasuryData.twoYear = data.current;
        } else if (cardId === '10yr-chart') {
            this.treasuryData.tenYear = data.current;
        }
        
        // Update 2s10s spread if we have both values
        if (this.treasuryData.twoYear !== undefined && this.treasuryData.tenYear !== undefined) {
            this.update2s10sSpread();
        }
    }

    // Update a chart with new data
    updateChart(chartId, data, labels, originalDates = null) {
        // Rate charts are now handled by the unified apiService-v2 system
        // No special handling needed - all charts use the same update mechanism
        console.log(`📊 Updating chart ${chartId} with data:`, { dataPoints: data?.length, labelCount: labels?.length });

        // Enhanced debugging for GDP
        if (chartId === 'gdp-chart') {
            console.log('📊 GDP: updateChart called with:', {
                chartId,
                dataLength: data?.length,
                labelsLength: labels?.length,
                data: data,
                labels: labels
            });
        }

        const chartElement = document.getElementById(chartId);
        if (!chartElement) {
            console.warn(`Chart element not found: ${chartId}`);
            if (chartId === 'gdp-chart') {
                console.error('📊 GDP: Chart element missing in updateChart');
            }
            return;
        }

        // Enhanced debugging for GDP
        if (chartId === 'gdp-chart') {
            console.log('📊 GDP: Chart element found, checking if chart exists:', {
                hasChart: !!chartElement.chart,
                elementId: chartElement.id,
                elementTagName: chartElement.tagName
            });
        }

        // Initialize chart if it doesn't exist
        if (!chartElement.chart) {
            if (chartId === 'gdp-chart') {
                console.log('📊 GDP: Initializing chart for the first time');
            }
            const chartConfig = {
                type: 'line',
                data: {
                    labels: labels || [],
                    datasets: [{
                        data: data || [],
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(context) {
                                    // Use original dates for tooltip if available
                                    if (context[0].chart.data.originalDates && context[0].chart.data.originalDates[context[0].dataIndex]) {
                                        const date = new Date(context[0].chart.data.originalDates[context[0].dataIndex]);
                                        return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
                                    }
                                    return context[0].label;
                                },
                                label: function(context) {
                                    // Check if this is a rate chart and format appropriately
                                    const chartId = context.chart.canvas.id;
                                    if (chartId && (chartId.includes('yr-chart') || chartId.includes('fedfunds') ||
                                        chartId.includes('sofr') || chartId.includes('tbill') ||
                                        chartId.includes('mortgage') || chartId.includes('highyield') ||
                                        chartId.includes('prime'))) {
                                        // Format rates with 2 decimal places
                                        return context.parsed.y.toFixed(2) + '%';
                                    } else if (chartId && chartId.includes('spread')) {
                                        // Format spread in basis points
                                        return context.parsed.y.toFixed(0) + ' bps';
                                    } else {
                                        // Default formatting for other charts
                                        return context.parsed.y.toFixed(2);
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 9
                                },
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            display: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                font: {
                                    size: 9
                                }
                            }
                        }
                    }
                }
            };
            
            chartElement.chart = new Chart(chartElement, chartConfig);
            console.log(`Initialized chart: ${chartId}`);

            // Auto-setup tooltips for rate charts after initialization
            const isRateChart = ['2yr', '10yr', '30yr', '5yr', 'sofr', 'fedfunds', 'tbill', 'highyield', 'spread', 'mortgage', 'prime'].some(rate => chartId.includes(rate));
            if (isRateChart) {
                setTimeout(() => {
                    this.setupChartTooltips(chartElement.chart, chartId);
                    console.log(`✅ Auto-setup tooltips for newly created ${chartId}`);
                }, 200);
            }
        }

        // Limit to last 13 data points for economic indicators
        let displayData = data;
        let displayLabels = labels;
        let displayOriginalDates = originalDates;

        if (chartId.includes('unemployment') || chartId.includes('corecpi') || chartId.includes('coreppi') ||
            chartId.includes('corepce') || chartId.includes('gdp') || chartId.includes('retail') ||
            chartId.includes('newhomes') || chartId.includes('existinghomes') || chartId.includes('durablegoods') ||
            chartId.includes('sentiment') || chartId.includes('trade')) {
            displayData = data.slice(-13);
            displayLabels = labels.slice(-13);
            if (originalDates) {
                displayOriginalDates = originalDates.slice(-13);
            }
        }

        // Update the chart data
        chartElement.chart.data.labels = displayLabels;
        chartElement.chart.data.datasets[0].data = displayData;

        // Store original dates for tooltips if provided
        if (displayOriginalDates) {
            chartElement.chart.data.originalDates = displayOriginalDates;
        }

        // Enhanced debugging for GDP
        if (chartId === 'gdp-chart') {
            console.log('📊 GDP: About to update chart with:', {
                displayDataLength: displayData.length,
                displayLabelsLength: displayLabels.length,
                displayData: displayData,
                displayLabels: displayLabels
            });
        }

        chartElement.chart.update();

        // Auto-setup tooltips for rate charts after data update
        const isRateChart = ['2yr', '10yr', '30yr', '5yr', 'sofr', 'fedfunds', 'tbill', 'highyield', 'spread', 'mortgage', 'prime'].some(rate => chartId.includes(rate));
        if (isRateChart) {
            setTimeout(() => {
                this.setupChartTooltips(chartElement.chart, chartId);
                console.log(`✅ Auto-setup tooltips after data update for ${chartId}`);
            }, 100);
        }

        if (chartId === 'gdp-chart') {
            console.log('📊 GDP: Chart update completed successfully!');
        }

        console.log(`Updated chart: ${chartId} with ${displayData.length} data points`);
    }

    // Update 2s10s spread display
    update2s10sSpread() {
        const spread = (this.treasuryData.tenYear - this.treasuryData.twoYear) * 100; // Convert to basis points
        
        // Find the 2s10s spread element
        const spreadCards = document.querySelectorAll('.market-card');
        spreadCards.forEach(card => {
            const nameElement = card.querySelector('.market-name');
            if (nameElement && nameElement.textContent.includes('2s10s Spread')) {
                const valueElement = card.querySelector('.market-value');
                const changeElement = card.querySelector('.card-change');
                
                if (valueElement) {
                    valueElement.textContent = spread.toFixed(0) + ' bps';
                }
                
                // Update color based on whether spread is positive or negative
                if (changeElement) {
                    if (spread < 0) {
                        changeElement.className = 'card-change negative';
                    } else {
                        changeElement.className = 'card-change positive';
                    }
                }
                
                console.log('Updated 2s10s spread:', spread.toFixed(0), 'bps');
            }
        });
    }

    // Main update method
    async updateDashboard() {
        if (this.updateInProgress) return;
        
        this.updateInProgress = true;
        const apiStatus = this.checkAPIKeys();

        try {
            if (apiStatus.anyConfigured) {
                console.log('Fetching real data...');
                const realData = await apiService.updateAllData();
                
                // Update cards with real data where available
                for (const [key, data] of Object.entries(realData)) {
                    this.updateCard(key, data);
                }
                
                // Show API status to user
                this.showAPIStatus(apiStatus);
            } else {
                console.log('No API keys configured, using mock data');
                this.showConfigurationMessage();
            }
        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.showErrorMessage(error.message);
        } finally {
            this.updateInProgress = false;
        }
    }

    // Show API configuration status
    showAPIStatus(status) {
        const message = [];
        if (status.fred) message.push('FRED API ✓');
        if (!status.fred) message.push('FRED API ✗');

        console.log('API Status:', message.join(' | '));
    }

    // Show configuration message
    showConfigurationMessage() {
        const banner = document.querySelector('.insights-banner');
        if (banner) {
            banner.style.background = '#fff3cd';
            banner.style.borderColor = '#ffc107';
            banner.innerHTML = `
                <h2>📋 Setup Required</h2>
                <p>To see real-time data, please add your API keys to config.js. Currently showing mock data.</p>
            `;
        }
    }

    // Show error message
    showErrorMessage(error) {
        console.error('Dashboard Error:', error);
        // Could add a user-visible error notification here
    }

    // Update rate charts with Yahoo Finance data while preserving 365-day format and clean x-axis
    async updateRateChartWithYahooData(chartId) {
        const chartElement = document.getElementById(chartId);
        if (!chartElement || !chartElement.chart) {
            console.warn(`Rate chart not found or not initialized: ${chartId}`);
            return;
        }

        const chart = chartElement.chart;

        // Force tooltip configuration for rate charts (always override)
        console.log(`🔧 Setting up tooltips for ${chartId}`);
        this.setupChartTooltips(chart, chartId);

        // Check if Yahoo Finance service is available
        if (!window.yahooFinanceService) {
            console.warn('Yahoo Finance service not available');
            return;
        }

        try {
            // Map chart ID to Yahoo Finance symbol
            const symbolMap = {
                // No rate charts use Yahoo Finance anymore - all moved to FRED
            };

            const symbolKey = symbolMap[chartId];
            if (!symbolKey) {
                console.warn(`No symbol mapping for ${chartId}`);
                return;
            }

            // No rate charts use Yahoo Finance anymore
            console.log(`Skipping ${chartId} - all rate charts now use FRED`);
            return;

            console.log(`🔄 Updating ${chartId} with Yahoo Finance data...`);

            // Get historical data from Yahoo Finance
            const historicalData = await window.yahooFinanceService.getHistoricalData(symbolKey, '5y'); // 5 years for 3Y/5Y calculations
            
            if (historicalData && historicalData.dates && historicalData.prices) {
                // Convert Yahoo Finance data to our 365-day format
                const processedData = this.processYahooDataFor365Days(historicalData, chartId);
                
                if (processedData) {
                    const chart = chartElement.chart;
                    
                    // Update the chart data while preserving structure
                    chart.data.labels = processedData.labels;
                    chart.data.originalDates = processedData.originalDates;
                    chart.data.monthlyLabelIndices = processedData.monthlyLabelIndices;
                    chart.data.datasets[0].data = processedData.data;
                    
                    // Update the chart
                    chart.update('none');
                    console.log(`✅ Updated ${chartId} with Yahoo Finance data (${processedData.data.length} points)`);
                    
                    // Calculate and populate period-returns for Yahoo Finance rate data
                    if (window.apiService && typeof window.apiService.calculateExtendedReturnsForRates === 'function') {
                        const extendedReturns = window.apiService.calculateExtendedReturnsForRates(historicalData.prices, historicalData.dates);
                        // Find the card element for this chart
                        const chartElement = document.getElementById(chartId);
                        const card = chartElement?.closest('.card');
                        if (card) {
                            this.updateRatePeriodReturns(card, extendedReturns);
                        }
                    }
                }
            } else {
                console.log(`⚠️  No Yahoo Finance data available for ${chartId}`);
            }

        } catch (error) {
            console.error(`Error updating ${chartId} with Yahoo Finance data:`, error);
        }
    }

    // Update rate charts with FRED data while preserving 365-day format and clean x-axis
    updateRateChartWithFredData(chartId, historicalData, historicalLabels) {
        const chartElement = document.getElementById(chartId);
        if (!chartElement || !chartElement.chart) {
            console.warn(`Rate chart not found or not initialized: ${chartId}`);
            return;
        }

        const chart = chartElement.chart;

        // Force tooltip configuration for rate charts (always override)
        console.log(`🔧 Setting up tooltips for ${chartId}`);
        this.setupChartTooltips(chart, chartId);
        
        // If we have FRED historical data, process it to fit our 365-day format
        if (historicalData && historicalData.length > 0 && historicalLabels && historicalLabels.length > 0) {
            
            console.log(`🔄 Updating ${chartId} with FRED data...`);
            console.log(`📊 Raw FRED data received:`, {
                dataPoints: historicalData.length,
                labelPoints: historicalLabels.length,
                firstFew: historicalData.slice(0, 10),
                lastFew: historicalData.slice(-10),
                dateRange: `${historicalLabels[0]} to ${historicalLabels[historicalLabels.length - 1]}`
            });
            
            // Convert FRED data to our 365-day format with monthly x-axis labels
            const processedData = this.processFredDataFor365Days(historicalData, historicalLabels, chartId);
            
            if (processedData) {
                // Update the chart data while preserving structure
                chart.data.labels = processedData.labels;
                chart.data.originalDates = processedData.originalDates;
                chart.data.monthlyLabelIndices = processedData.monthlyLabelIndices;
                chart.data.datasets[0].data = processedData.data;
                
                // Update the chart
                chart.update('none');
                console.log(`✅ Updated ${chartId} with FRED data (${processedData.data.length} points)`);

                // Setup tooltips for FRED rate charts
                setTimeout(() => {
                    this.setupChartTooltips(chart, chartId);
                    console.log(`✅ Auto-setup tooltips for FRED ${chartId}`);
                }, 100);

                // Calculate and populate period-returns for FRED rate data
                if (window.apiService && typeof window.apiService.calculateExtendedReturnsForRates === 'function') {
                    const extendedReturns = window.apiService.calculateExtendedReturnsForRates(historicalData, historicalLabels);
                    // Find the card element for this chart
                    const cardElement = chartElement.closest('.card');
                    if (cardElement) {
                        this.updateRatePeriodReturns(cardElement, extendedReturns);
                    }
                }
            }
        } else {
            console.log(`⚠️  No FRED data available for ${chartId}, keeping existing data`);
        }
    }

    // Update H8-specific period changes (QTD and YoY Quarter)
    updateH8PeriodChanges(card, h8Changes) {
        if (!card || !h8Changes) {
            return;
        }

        // Find the existing banking-period-changes container (H8 specific)
        const periodContainer = card.querySelector('.banking-period-changes');
        if (!periodContainer) {
            return;
        }

        // Update QTD if available
        if (h8Changes.QTD !== undefined) {
            const qtdItems = periodContainer.querySelectorAll('.period-item');
            for (const item of qtdItems) {
                const label = item.querySelector('.period-label');
                if (label && label.textContent.trim() === 'QTD:') {
                    const valueElement = item.querySelector('.period-value');
                    if (valueElement) {
                        const qtdValue = h8Changes.QTD;
                        const formattedValue = `${qtdValue >= 0 ? '+' : ''}${qtdValue.toFixed(2)}%`;
                        valueElement.textContent = formattedValue;
                        valueElement.className = `period-value ${qtdValue >= 0 ? 'positive' : 'negative'}`;
                    }
                    break;
                }
            }
        }

        // Update YoY Quarter if available
        if (h8Changes.YoYQtr !== undefined) {
            const yoyItems = periodContainer.querySelectorAll('.period-item');
            for (const item of yoyItems) {
                const label = item.querySelector('.period-label');
                if (label && label.textContent.trim() === 'YoY Qtr:') {
                    const valueElement = item.querySelector('.period-value');
                    if (valueElement) {
                        const yoyValue = h8Changes.YoYQtr;
                        const formattedValue = `${yoyValue >= 0 ? '+' : ''}${yoyValue.toFixed(2)}%`;
                        valueElement.textContent = formattedValue;
                        valueElement.className = `period-value ${yoyValue >= 0 ? 'positive' : 'negative'}`;
                    }
                    break;
                }
            }
        }
    }

    // Update period-returns section for rate cards

    // Process FRED data to fit our 365-day format with monthly labels
    processFredDataFor365Days(historicalData, historicalLabels, chartId) {
        try {
            console.log(`🔧 Processing real data for ${chartId}:`, {
                dataPoints: historicalData?.length,
                labelPoints: historicalLabels?.length,
                sampleData: historicalData?.slice(0, 5),
                sampleLabels: historicalLabels?.slice(0, 5)
            });

            // Create 365-day arrays
            const labels = [];
            const data = [];
            const originalDates = [];
            const monthlyLabelIndices = [];
            
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Calculate the date range (past 365 days)
            const today = new Date();
            const startDate = new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
            
            let lastMonthShown = -1;
            
            // Create sorted array of real data points for interpolation
            const realDataPoints = [];
            if (historicalLabels && historicalData) {
                for (let i = 0; i < Math.min(historicalLabels.length, historicalData.length); i++) {
                    const date = new Date(historicalLabels[i]);
                    const value = parseFloat(historicalData[i]);
                    
                    if (!isNaN(date.getTime()) && !isNaN(value) && value > 0) {
                        realDataPoints.push({
                            date: date.getTime(),
                            value: value
                        });
                    }
                }
            }
            
            // Sort by date
            realDataPoints.sort((a, b) => a.date - b.date);
            
            console.log(`📊 ${chartId} FRED data points: ${realDataPoints.length}`);
            if (realDataPoints.length > 0) {
                console.log(`📅 Date range: ${new Date(realDataPoints[0].date).toLocaleDateString()} to ${new Date(realDataPoints[realDataPoints.length - 1].date).toLocaleDateString()}`);
                console.log(`💰 Value range: ${realDataPoints[0].value}% to ${realDataPoints[realDataPoints.length - 1].value}%`);
                
                // Show sample values to debug flat data
                console.log(`🔍 Sample FRED values:`, realDataPoints.slice(0, 10).map(p => ({
                    date: new Date(p.date).toLocaleDateString(),
                    value: p.value
                })));
            }
            
            // Generate 365 days of data using exact FRED values when available
            for (let i = 0; i < 365; i++) {
                const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
                const currentTime = currentDate.getTime();
                
                // Find exact FRED value for this date, or use last known value
                let value = this.findExactFredValue(realDataPoints, currentTime);
                
                // Store data point
                data.push(value || 0);
                
                // Store original date for tooltips
                const month = currentDate.getMonth() + 1;
                const day = currentDate.getDate();
                const year = currentDate.getFullYear();
                originalDates.push(`${month}/${day}/${year}`);
                
                // Create monthly labels
                const currentMonth = currentDate.getMonth();
                if (currentMonth !== lastMonthShown) {
                    const yearShort = currentDate.getFullYear().toString().slice(-2);
                    labels.push(`${monthNames[currentMonth]} '${yearShort}`);
                    monthlyLabelIndices.push(i);
                    lastMonthShown = currentMonth;
                } else {
                    labels.push('');
                }
            }
            
            // Debug output for processed FRED data
            const avgValue = data.reduce((a,b) => a+b, 0) / data.length;
            const uniqueChartValues = [...new Set(data)];
            
            console.log(`✅ ${chartId} FRED processed: ${data.length} points, avg value: ${avgValue.toFixed(4)}%`);
            console.log(`📈 Chart unique values: ${uniqueChartValues.length}`);
            console.log(`📊 Chart value range: ${Math.min(...data).toFixed(4)}% to ${Math.max(...data).toFixed(4)}%`);
            console.log(`🏷️  Labels array length: ${labels.length}, Monthly indices: ${monthlyLabelIndices.length}`);
            console.log(`📅 Monthly indices: [${monthlyLabelIndices.join(', ')}]`);
            console.log(`🔍 Sample monthly labels:`, monthlyLabelIndices.slice(-3).map(i => `${i}: "${labels[i]}"`));
            
            if (uniqueChartValues.length < 10) {
                console.log(`⚠️  Chart has very few unique values - investigating date matching...`);
                
                // Debug the date matching process
                for (let i = 0; i < Math.min(10, originalDates.length); i++) {
                    const currentTime = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000)).getTime();
                    const value = this.findExactFredValue(realDataPoints, currentTime);
                    console.log(`  Day ${i} (${originalDates[i]}): ${value}%`);
                }
            }
            
            return { labels, data, originalDates, monthlyLabelIndices };
            
        } catch (error) {
            console.error('Error processing FRED data for 365-day format:', error);
            return null;
        }
    }

    // Normalize date key for consistent lookup
    normalizeDateKey(date) {
        try {
            let d;
            if (typeof date === 'string') {
                d = new Date(date);
            } else if (date instanceof Date) {
                d = date;
            } else {
                return null;
            }
            
            if (isNaN(d.getTime())) return null;
            
            // Return YYYY-MM-DD format for consistent lookup
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            return null;
        }
    }

    // Get the last known value before the target date
    getLastKnownValue(dataMap, targetDate) {
        const targetTime = targetDate.getTime();
        let lastValue = null;
        let lastTime = 0;
        
        for (const [dateKey, value] of dataMap) {
            const date = new Date(dateKey);
            const time = date.getTime();
            
            if (time <= targetTime && time > lastTime) {
                lastValue = value;
                lastTime = time;
            }
        }
        
        return lastValue;
    }

    // Process Yahoo Finance data to fit our 365-day format with monthly labels
    processYahooDataFor365Days(yahooData, chartId) {
        try {
            console.log(`🔧 Processing Yahoo Finance data for ${chartId}:`, {
                dates: yahooData.dates?.length,
                prices: yahooData.prices?.length,
                sampleDates: yahooData.dates?.slice(0, 3),
                samplePrices: yahooData.prices?.slice(0, 3)
            });

            // Create 365-day arrays
            const labels = [];
            const data = [];
            const originalDates = [];
            const monthlyLabelIndices = [];
            
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Calculate the date range (past 365 days)
            const today = new Date();
            const startDate = new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
            
            let lastMonthShown = -1;
            
            // Create sorted array of real data points for interpolation
            const realDataPoints = [];
            if (yahooData.dates && yahooData.prices) {
                for (let i = 0; i < Math.min(yahooData.dates.length, yahooData.prices.length); i++) {
                    const date = new Date(yahooData.dates[i]);
                    const price = parseFloat(yahooData.prices[i]);
                    
                    if (!isNaN(date.getTime()) && !isNaN(price) && price > 0) {
                        realDataPoints.push({
                            date: date.getTime(),
                            value: price
                        });
                    }
                }
            }
            
            // Sort by date
            realDataPoints.sort((a, b) => a.date - b.date);
            
            console.log(`📊 ${chartId} Yahoo data points: ${realDataPoints.length}`);
            if (realDataPoints.length > 0) {
                console.log(`📅 Date range: ${new Date(realDataPoints[0].date).toLocaleDateString()} to ${new Date(realDataPoints[realDataPoints.length - 1].date).toLocaleDateString()}`);
                console.log(`💰 Value range: ${realDataPoints[0].value}% to ${realDataPoints[realDataPoints.length - 1].value}%`);
            }
            
            // Generate 365 days of data with proper interpolation
            for (let i = 0; i < 365; i++) {
                const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
                const currentTime = currentDate.getTime();
                
                // Interpolate value from real data points
                let value = this.interpolateValueFromPoints(realDataPoints, currentTime);
                
                // Store data point
                data.push(value || 0);
                
                // Store original date for tooltips
                const month = currentDate.getMonth() + 1;
                const day = currentDate.getDate();
                const year = currentDate.getFullYear();
                originalDates.push(`${month}/${day}/${year}`);
                
                // Create monthly labels
                const currentMonth = currentDate.getMonth();
                if (currentMonth !== lastMonthShown) {
                    const yearShort = currentDate.getFullYear().toString().slice(-2);
                    labels.push(`${monthNames[currentMonth]} '${yearShort}`);
                    monthlyLabelIndices.push(i);
                    lastMonthShown = currentMonth;
                } else {
                    labels.push('');
                }
            }
            
            console.log(`✅ ${chartId} processed: ${data.length} points, avg value: ${(data.reduce((a,b) => a+b, 0) / data.length).toFixed(2)}%`);
            
            return { labels, data, originalDates, monthlyLabelIndices };
            
        } catch (error) {
            console.error('Error processing Yahoo Finance data for 365-day format:', error);
            return null;
        }
    }

    // Interpolate value between data points
    interpolateValueFromPoints(dataPoints, targetTime) {
        if (!dataPoints || dataPoints.length === 0) return null;
        
        // Find the closest data points before and after target time
        let beforePoint = null;
        let afterPoint = null;
        
        for (let i = 0; i < dataPoints.length; i++) {
            const point = dataPoints[i];
            
            if (point.date <= targetTime) {
                beforePoint = point;
            } else if (point.date > targetTime && !afterPoint) {
                afterPoint = point;
                break;
            }
        }
        
        // If we have exact match or only before point, return it
        if (beforePoint && beforePoint.date === targetTime) {
            return beforePoint.value;
        }
        
        if (beforePoint && !afterPoint) {
            return beforePoint.value; // Use last known value
        }
        
        if (!beforePoint && afterPoint) {
            return afterPoint.value; // Use first available value
        }
        
        if (beforePoint && afterPoint) {
            // Linear interpolation
            const timeDiff = afterPoint.date - beforePoint.date;
            const valueDiff = afterPoint.value - beforePoint.value;
            const targetDiff = targetTime - beforePoint.date;
            
            const interpolatedValue = beforePoint.value + (valueDiff * targetDiff / timeDiff);
            return interpolatedValue;
        }
        
        return null;
    }

    // Find exact FRED value for a specific date, or use most recent available value
    findExactFredValue(dataPoints, targetTime) {
        if (!dataPoints || dataPoints.length === 0) return null;
        
        const targetDate = new Date(targetTime);
        const targetDateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // First, try to find exact date match
        for (const point of dataPoints) {
            const pointDate = new Date(point.date);
            const pointDateString = pointDate.toISOString().split('T')[0];
            
            if (pointDateString === targetDateString) {
                return point.value; // Exact match found
            }
        }
        
        // If no exact match, find the most recent value before this date
        let mostRecentValue = null;
        let mostRecentTime = 0;
        
        for (const point of dataPoints) {
            if (point.date <= targetTime && point.date > mostRecentTime) {
                mostRecentValue = point.value;
                mostRecentTime = point.date;
            }
        }
        
        if (mostRecentValue !== null) {
            return mostRecentValue; // Most recent value
        }
        
        // Fallback to first available value
        if (dataPoints.length > 0) {
            return dataPoints[0].value;
        }
        
        return null;
    }

    // Setup chart tooltips for rate charts
    setupChartTooltips(chart, chartId) {
        if (!chart.options.plugins) {
            chart.options.plugins = {};
        }

        chart.options.plugins.tooltip = {
            mode: 'index',
            intersect: false,
            callbacks: {
                title: function(context) {
                    // Use original dates for tooltip if available
                    if (context[0].chart.data.originalDates && context[0].chart.data.originalDates[context[0].dataIndex]) {
                        const date = new Date(context[0].chart.data.originalDates[context[0].dataIndex]);
                        return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
                    }
                    return context[0].label;
                },
                label: function(context) {
                    // Check if this is a rate chart and format appropriately
                    const chartId = context.chart.canvas.id;
                    const value = context.parsed.y;

                    if (chartId && (chartId.includes('yr-chart') || chartId.includes('fedfunds') ||
                        chartId.includes('sofr') || chartId.includes('tbill') ||
                        chartId.includes('mortgage') || chartId.includes('highyield') ||
                        chartId.includes('prime'))) {
                        // For rate charts - value might be in basis points or percentage
                        // If value is > 100, it's likely basis points, convert to percentage
                        if (Math.abs(value) > 100) {
                            return (value / 100).toFixed(2) + '%';
                        } else {
                            return value.toFixed(2) + '%';
                        }
                    } else if (chartId && chartId.includes('spread')) {
                        // Format spread in basis points with 2 decimal places
                        return value.toFixed(2) + ' bps';
                    } else {
                        // Default formatting with 2 decimal places
                        return value.toFixed(2);
                    }
                }
            }
        };

        // Update the chart to apply new tooltip configuration
        chart.update('none');
    }

    // Update period returns for rate cards
    updateRatePeriodReturns(card, returns) {
        // Validate card is a DOM element
        if (!card || typeof card.querySelector !== 'function') {
            console.error('updateRatePeriodReturns: Invalid card element', card);
            return;
        }

        const periodReturnsDiv = card.querySelector('.period-returns');
        if (!periodReturnsDiv) {
            return; // No period returns section in this card
        }

        // Map our return periods to the HTML elements
        const periodMap = {
            '1D': '1D',
            '1W': '1W',
            '1M': '1M',
            'YTD': 'YTD',
            '1Y': '1Y',
            '3Y': '3Y',
            '5Y': '5Y'
        };

        // Update each period return value
        for (const [dataKey, labelKey] of Object.entries(periodMap)) {
            let valueElement = null;

            // Find by label text
            const labels = periodReturnsDiv.querySelectorAll('.return-label');
            for (const label of labels) {
                if (label.textContent.trim() === `${labelKey}:`) {
                    valueElement = label.parentElement.querySelector('.return-value');
                    break;
                }
            }

            if (valueElement && returns[dataKey] !== undefined) {
                const value = returns[dataKey];

                // Better formatting - use 1 decimal for small values, 0 for larger ones
                let formattedValue;
                if (Math.abs(value) < 1) {
                    // For small values, show 1 decimal place
                    formattedValue = value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
                } else {
                    // For larger values, show whole numbers
                    formattedValue = value >= 0 ? `+${value.toFixed(0)}` : value.toFixed(0);
                }

                // Force DOM refresh by clearing and setting
                valueElement.textContent = '';
                valueElement.className = 'return-value';

                // Set new values with slight delay to force redraw
                setTimeout(() => {
                    valueElement.textContent = `${formattedValue} bps`;
                    valueElement.className = 'return-value ' + (value >= 0 ? 'positive' : 'negative');
                }, 1);
            }
        }
    }

    // DEBUG: Add console debugging functions
    setupDebuggingTools() {
        window.debugRateCards = () => {
            console.log('🔧 DEBUG: Inspecting rate cards...');

            const rateCards = document.querySelectorAll('.card');
            rateCards.forEach((card, index) => {
                const chartElement = card.querySelector('canvas');
                const periodReturns = card.querySelector('.period-returns');

                if (chartElement && periodReturns) {
                    const chartId = chartElement.id;
                    if (chartId && (chartId.includes('yr') || chartId.includes('bill') || chartId.includes('sofr') || chartId.includes('fedfunds') || chartId.includes('highyield'))) {
                        console.log(`🔍 Rate Card ${index}: ${chartId}`, {
                            cardElement: card,
                            chartId: chartId,
                            hasPeriodReturns: !!periodReturns,
                            periodReturnsHTML: periodReturns.innerHTML,
                            returnItems: Array.from(periodReturns.querySelectorAll('.return-item')).map(item => ({
                                label: item.querySelector('.return-label')?.textContent,
                                value: item.querySelector('.return-value')?.textContent,
                                className: item.querySelector('.return-value')?.className
                            }))
                        });
                    }
                }
            });
        };

        window.updateSingleRateCard = (cardId = '2yr-chart') => {
            console.log(`🔧 DEBUG: Force updating ${cardId}...`);
            const chartElement = document.getElementById(cardId);
            if (!chartElement) {
                console.error('Chart element not found:', cardId);
                return;
            }

            const card = chartElement.closest('.card');
            if (!card) {
                console.error('Card element not found for:', cardId);
                return;
            }

            // Create test data
            const testData = {
                '1D': 5,
                '1W': -10,
                '1M': 25,
                'YTD': -15,
                '1Y': 50
            };

            console.log('🔧 Forcing update with test data:', testData);
            window.dataUpdater.updateRatePeriodReturns(card, testData);
        };

        window.inspectPeriodElements = (cardId = '2yr-chart') => {
            console.log(`🔧 DEBUG: Inspecting period elements for ${cardId}...`);
            const chartElement = document.getElementById(cardId);
            if (!chartElement) {
                console.error('Chart element not found:', cardId);
                return;
            }

            const card = chartElement.closest('.card');
            const periodReturns = card.querySelector('.period-returns');

            if (!periodReturns) {
                console.error('No .period-returns found');
                return;
            }

            const items = periodReturns.querySelectorAll('.return-item');
            console.log(`Found ${items.length} return items:`);

            items.forEach((item, i) => {
                const label = item.querySelector('.return-label');
                const value = item.querySelector('.return-value');
                console.log(`Item ${i}:`, {
                    element: item,
                    label: label?.textContent,
                    value: value?.textContent,
                    valueClassName: value?.className,
                    labelElement: label,
                    valueElement: value
                });
            });
        };

        window.fixTooltips = (chartId = '2yr-chart') => {
            console.log(`🔧 DEBUG: Manually fixing tooltips for ${chartId}...`);
            const chartElement = document.getElementById(chartId);
            if (!chartElement || !chartElement.chart) {
                console.error('Chart not found:', chartId);
                return;
            }

            console.log(`🔧 Forcing tooltip setup for ${chartId}`);
            window.dataUpdater.setupChartTooltips(chartElement.chart, chartId);
            console.log(`✅ Tooltips fixed for ${chartId} - try hovering now`);
        };

        console.log('🔧 DEBUG TOOLS LOADED:');
        console.log('• debugRateCards() - Inspect all rate cards');
        console.log('• updateSingleRateCard("2yr-chart") - Test update single card');
        console.log('• inspectPeriodElements("2yr-chart") - Inspect DOM elements');
        console.log('• fixTooltips("2yr-chart") - Manually fix tooltips for a chart');
    }

    // Initialize auto-update
    startAutoUpdate() {
        // Initial update
        this.updateDashboard();
        
        // Set up periodic updates
        setInterval(() => this.updateDashboard(), 300000); // Update every 5 minutes
    }
}

// Create global instance
const dataUpdater = new DataUpdater();
window.dataUpdater = dataUpdater;

// Setup debugging tools
dataUpdater.setupDebuggingTools();

// Start updates when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        dataUpdater.startAutoUpdate();
    }, 1000);
});