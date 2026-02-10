// Yahoo Finance Service - Free market data without API limits
class YahooFinanceService {
    constructor() {
        this.cache = {};
        this.lastFetch = {};
        this.useVercelAPI = false; // Disable Vercel API, use CORS proxy directly
        // Try multiple CORS proxies for reliability
        this.corsProxies = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/'
        ];
        this.corsProxy = this.corsProxies[0]; // Default to first proxy
        this.cacheDuration = 60000; // 1 minute cache for quotes

        // Symbol mappings
        this.symbols = {
            // Major Indices (using ETFs as proxies)
            sp500: 'SPY',        // S&P 500 ETF
            dow: 'DIA',          // Dow Jones ETF
            nasdaq: 'QQQ',       // Nasdaq 100 ETF
            russell2000: 'IWM',  // Russell 2000 ETF
            
            // Treasury Yields and Rates  
            // (T-Bill now uses FRED DTB3 instead of Yahoo ^IRX)
            
            // Commodities & Forex
            gold: 'GLD',         // Gold ETF
            silver: 'SLV',       // Silver ETF
            oil: 'USO',          // Oil ETF
            dxy: 'UUP',          // Dollar Index ETF
            
            // Individual Stocks (Tech Giants)
            apple: 'AAPL',
            microsoft: 'MSFT',
            google: 'GOOGL',
            amazon: 'AMZN',
            nvidia: 'NVDA',
            meta: 'META',
            tesla: 'TSLA',
            
            // Other popular stocks
            berkshire: 'BRK-B',
            jpmorgan: 'JPM',
            visa: 'V',
            
            // Volatility
            vix: '^VIX',
            
            // Actual Indices (for reference)
            sp500Index: '^GSPC',
            dowIndex: '^DJI',
            nasdaqIndex: '^IXIC'
        };
    }

    // Get quote for a single symbol
    async getQuote(symbol) {
        const now = Date.now();
        const cacheKey = `quote_${symbol}`;
        
        // Check cache
        if (this.cache[cacheKey] && this.lastFetch[cacheKey] && 
            (now - this.lastFetch[cacheKey] < this.cacheDuration)) {
            console.log(`Using cached data for ${symbol}`);
            return this.cache[cacheKey];
        }

        // Check if we should use fallback data in corporate environment
        if (window.networkManager && window.networkManager.shouldUseFallback('yahoo')) {
            console.log(`🎭 Using fallback data for ${symbol} (corporate network)`);
            if (window.corporateFallbackData) {
                const fallbackQuote = window.corporateFallbackData.getQuote(symbol);
                if (fallbackQuote) {
                    this.cache[cacheKey] = fallbackQuote;
                    this.lastFetch[cacheKey] = now;
                    return fallbackQuote;
                }
            }
        }

        // Show loading state
        if (window.loadingManager) {
            window.loadingManager.showServiceLoading('yahooFinance', `Fetching ${symbol} data...`);
        }

        try {
            let data;

            // Try multiple CORS proxies if needed
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
            let lastError = null;

            for (const proxy of this.corsProxies) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(url);
                    console.log(`Fetching Yahoo Finance data for ${symbol} via ${proxy}`);

                    const response = await fetch(proxyUrl, {
                        timeout: 10000 // 10 second timeout
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    data = await response.json();
                    break; // Success, exit loop

                } catch (error) {
                    console.warn(`Proxy ${proxy} failed for ${symbol}:`, error.message);
                    lastError = error;
                    // Try next proxy
                }
            }

            if (!data) {
                throw lastError || new Error('All CORS proxies failed');
            }

            if (!data.chart || !data.chart.result || !data.chart.result[0]) {
                throw new Error('Invalid response structure');
            }
            
            const result = data.chart.result[0];
            const meta = result.meta;
            
            const quote = {
                symbol: symbol,
                price: meta.regularMarketPrice,
                previousClose: meta.previousClose || meta.chartPreviousClose,
                change: meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose),
                changePercent: ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose)) / (meta.previousClose || meta.chartPreviousClose)) * 100,
                volume: meta.regularMarketVolume,
                marketCap: meta.marketCap,
                dayHigh: meta.regularMarketDayHigh,
                dayLow: meta.regularMarketDayLow,
                fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
                timestamp: meta.regularMarketTime
            };
            
            // Cache the result
            this.cache[cacheKey] = quote;
            this.lastFetch[cacheKey] = now;
            
            return quote;
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            // Return cached data if available
            if (this.cache[cacheKey]) {
                console.log(`Returning stale cache for ${symbol}`);
                return this.cache[cacheKey];
            }
            return null;
        } finally {
            // Hide loading state
            if (window.loadingManager) {
                window.loadingManager.hideServiceLoading('yahooFinance');
            }
        }
    }

    // Get historical data for charts - FIXED FOR 1 YEAR DAILY DATA
    async getHistoricalData(symbol, range = '1y', interval = '1d', isMarketData = false) {
        // For chart display, market data needs 1 year to maintain proper monthly x-axis labels
        // For calculations, we fetch 5 years separately in getExtendedReturns
        if (isMarketData && range === '1y') {
            // This is for chart display - keep 1 year with monthly labels
            range = '1y';
            interval = '1d';
        }
        
        // Special handling removed - use full 5y range for all symbols to calculate 3Y/5Y returns
        // All symbols now use the full range parameter for proper period calculations
        const cacheKey = `history_${symbol}_${range}_${interval}`;
        const now = Date.now();
        const historicalCacheDuration = 300000; // 5 minutes for historical data
        
        // Check cache
        if (this.cache[cacheKey] && this.lastFetch[cacheKey] && 
            (now - this.lastFetch[cacheKey] < historicalCacheDuration)) {
            console.log(`Using cached historical data for ${symbol}`);
            return this.cache[cacheKey];
        }

        try {
            let data;

            // Try multiple CORS proxies if needed
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
            let lastError = null;

            for (const proxy of this.corsProxies) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(url);
                    console.log(`Fetching historical data for ${symbol} (${range}) via ${proxy}`);

                    const response = await fetch(proxyUrl, {
                        timeout: 15000 // 15 second timeout for historical data
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    data = await response.json();
                    break; // Success, exit loop

                } catch (error) {
                    console.warn(`Proxy ${proxy} failed for historical ${symbol}:`, error.message);
                    lastError = error;
                    // Try next proxy
                }
            }

            if (!data) {
                throw lastError || new Error('All CORS proxies failed');
            }
            
            if (!data.chart || !data.chart.result || !data.chart.result[0]) {
                throw new Error('Invalid response structure');
            }
            
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quotes = result.indicators.quote[0];
            
            // Additional validation for futures contracts
            if (!timestamps || !quotes || !quotes.close || quotes.close.length === 0) {
                throw new Error(`No price data available for ${symbol} - futures contract may be expired or have limited history`);
            }
            
            // Filter out null values which can occur in futures data
            const validData = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] !== null && quotes.close[i] !== undefined) {
                    validData.push({
                        timestamp: timestamps[i],
                        close: quotes.close[i],
                        high: quotes.high[i] || quotes.close[i],
                        low: quotes.low[i] || quotes.close[i],
                        open: quotes.open[i] || quotes.close[i],
                        volume: quotes.volume[i] || 0
                    });
                }
            }
            
            if (validData.length === 0) {
                throw new Error(`No valid price data found for ${symbol}`);
            }
            
            console.log(`✅ Retrieved ${validData.length} valid data points for ${symbol} out of ${timestamps.length} total`);
            
            // Reconstruct arrays from valid data
            const validTimestamps = validData.map(d => d.timestamp);
            const validQuotes = {
                close: validData.map(d => d.close),
                high: validData.map(d => d.high),
                low: validData.map(d => d.low),
                open: validData.map(d => d.open),
                volume: validData.map(d => d.volume)
            };
            
            // Format data for charts using valid data
            const rawDates = validTimestamps.map(ts => new Date(ts * 1000).toLocaleDateString());
            const rawPrices = validQuotes.close;
            
            // Apply weekend/holiday smoothing
            const smoothedData = this.smoothWeekendData(rawDates, rawPrices);
            
            const historicalData = {
                dates: smoothedData.dates,
                prices: smoothedData.prices,
                volumes: validQuotes.volume, // Keep original volume data
                highs: validQuotes.high,
                lows: validQuotes.low,
                opens: validQuotes.open
            };
            
            // Calculate period returns using smoothed data
            const periodReturns = this.calculatePeriodReturns(smoothedData.prices);
            historicalData.returns = periodReturns;
            
            // Cache the result
            this.cache[cacheKey] = historicalData;
            this.lastFetch[cacheKey] = now;
            
            return historicalData;
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
            // Return cached data if available
            if (this.cache[cacheKey]) {
                console.log(`Returning stale historical cache for ${symbol}`);
                return this.cache[cacheKey];
            }
            return null;
        }
    }

    // Calculate period returns
    calculatePeriodReturns(prices) {
        if (!prices || prices.length === 0) return {};
        
        const current = prices[prices.length - 1];
        const returns = {};
        
        // 1 Week (5 trading days)
        if (prices.length >= 5) {
            const weekAgo = prices[prices.length - 5];
            returns['1W'] = ((current - weekAgo) / weekAgo) * 100;
        }
        
        // 1 Month (21 trading days)
        if (prices.length >= 21) {
            const monthAgo = prices[prices.length - 21];
            returns['1M'] = ((current - monthAgo) / monthAgo) * 100;
        }
        
        // 3 Months (63 trading days)
        if (prices.length >= 63) {
            const threeMonthsAgo = prices[prices.length - 63];
            returns['3M'] = ((current - threeMonthsAgo) / threeMonthsAgo) * 100;
        }
        
        // YTD (calculate from start of year)
        const firstPrice = prices[0];
        returns['YTD'] = ((current - firstPrice) / firstPrice) * 100;
        
        // 1 Year (252 trading days)
        if (prices.length >= 252) {
            const yearAgo = prices[prices.length - 252];
            returns['1Y'] = ((current - yearAgo) / yearAgo) * 100;
        }
        
        return returns;
    }

    // Smooth weekend and holiday data gaps by carrying forward last trading day's value
    smoothWeekendData(dates, prices) {
        if (!dates || !prices || dates.length !== prices.length || dates.length === 0) {
            return { dates, prices };
        }

        console.log(`📊 Smoothing weekend/holiday gaps for ${dates.length} data points`);

        // Create array of all dates from first to last with no gaps
        const firstDate = new Date(dates[0]);
        const lastDate = new Date(dates[dates.length - 1]);
        const smoothedDates = [];
        const smoothedPrices = [];
        
        // Create map of existing data for quick lookup
        const dataMap = new Map();
        for (let i = 0; i < dates.length; i++) {
            const dateKey = new Date(dates[i]).toDateString();
            dataMap.set(dateKey, prices[i]);
        }
        
        let lastValidPrice = prices[0]; // Track the last valid price
        let fillCount = 0;
        
        // Generate complete date series
        const currentDate = new Date(firstDate);
        while (currentDate <= lastDate) {
            const dateKey = currentDate.toDateString();
            const dateStr = currentDate.toLocaleDateString();
            
            if (dataMap.has(dateKey)) {
                // We have real data for this date
                lastValidPrice = dataMap.get(dateKey);
                smoothedDates.push(dateStr);
                smoothedPrices.push(lastValidPrice);
            } else {
                // Gap day - check if it's a weekend or holiday and fill if needed
                const dayOfWeek = currentDate.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
                
                // For weekend days or holidays, carry forward the last price
                if (isWeekend || this.isLikelyHoliday(currentDate)) {
                    smoothedDates.push(dateStr);
                    smoothedPrices.push(lastValidPrice);
                    fillCount++;
                }
                // For missing weekday data, we don't fill to preserve data integrity
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (fillCount > 0) {
            console.log(`✅ Filled ${fillCount} weekend/holiday gaps in data series`);
        }
        
        return {
            dates: smoothedDates,
            prices: smoothedPrices
        };
    }

    // Helper method to identify likely holidays (basic implementation)
    isLikelyHoliday(date) {
        const month = date.getMonth() + 1; // 1-based month
        const day = date.getDate();
        
        // Common US market holidays (basic check)
        const holidays = [
            { month: 1, day: 1 },   // New Year's Day
            { month: 7, day: 4 },   // Independence Day
            { month: 12, day: 25 }, // Christmas Day
        ];
        
        return holidays.some(holiday => holiday.month === month && holiday.day === day);
    }

    // Get extended returns with proper date-based calculations
    async getExtendedReturns(symbol) {
        try {
            // Fetch 5 years of data with daily interval - use false for isMarketData to get full range
            const data = await this.getHistoricalData(symbol, '5y', '1d', false);
            
            if (!data || !data.prices || data.prices.length === 0) {
                console.error(`No historical data available for ${symbol}`);
                return {};
            }

            const prices = data.prices.filter(p => p != null); // Remove null values
            const dates = data.dates;
            
            if (prices.length === 0 || dates.length === 0) {
                return {};
            }
            
            console.log(`${symbol}: Using date-based calculation with ${prices.length} data points`);
            
            const currentPrice = prices[prices.length - 1];
            const currentDate = this.parseDate(dates[dates.length - 1]);
            const returns = {};

            // Helper function to find price at a specific date
            const findPriceNearDate = (targetDate) => {
                let closestIndex = -1;
                let closestDiff = Infinity;
                const targetTime = targetDate.getTime();
                
                for (let i = 0; i < dates.length; i++) {
                    const date = this.parseDate(dates[i]);
                    const diff = Math.abs(date.getTime() - targetTime);
                    if (diff < closestDiff) {
                        closestDiff = diff;
                        closestIndex = i;
                    }
                }
                
                return closestIndex >= 0 ? prices[closestIndex] : null;
            };
            
            // 1 Week
            const oneWeekAgo = new Date(currentDate);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const weekPrice = findPriceNearDate(oneWeekAgo);
            if (weekPrice) {
                returns['1W'] = ((currentPrice - weekPrice) / weekPrice) * 100;
                console.log(`${symbol} 1W: current=${currentPrice.toFixed(2)}, week ago=${weekPrice.toFixed(2)}, return=${returns['1W'].toFixed(2)}%`);
            }
            
            // 1 Month
            const oneMonthAgo = new Date(currentDate);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const monthPrice = findPriceNearDate(oneMonthAgo);
            if (monthPrice) {
                returns['1M'] = ((currentPrice - monthPrice) / monthPrice) * 100;
                console.log(`${symbol} 1M: current=${currentPrice.toFixed(2)}, month ago=${monthPrice.toFixed(2)}, return=${returns['1M'].toFixed(2)}%`);
            }
            
            // YTD (find January 1st of current year)
            const yearStart = new Date(currentDate.getFullYear(), 0, 1);
            const ytdPrice = findPriceNearDate(yearStart);
            if (ytdPrice) {
                returns['YTD'] = ((currentPrice - ytdPrice) / ytdPrice) * 100;
                console.log(`${symbol} YTD: current=${currentPrice.toFixed(2)}, year start=${ytdPrice.toFixed(2)}, return=${returns['YTD'].toFixed(2)}%`);
            }
            
            // 1 Year
            const oneYearAgo = new Date(currentDate);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const yearPrice = findPriceNearDate(oneYearAgo);
            if (yearPrice) {
                returns['1Y'] = ((currentPrice - yearPrice) / yearPrice) * 100;
                console.log(`${symbol} 1Y: current=${currentPrice.toFixed(2)}, year ago=${yearPrice.toFixed(2)}, return=${returns['1Y'].toFixed(2)}%`);
            }
            
            // 3 Year
            const threeYearsAgo = new Date(currentDate);
            threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
            const threeYearPrice = findPriceNearDate(threeYearsAgo);
            if (threeYearPrice) {
                returns['3Y'] = ((currentPrice - threeYearPrice) / threeYearPrice) * 100;
                console.log(`${symbol} 3Y: current=${currentPrice.toFixed(2)}, 3y ago=${threeYearPrice.toFixed(2)}, return=${returns['3Y'].toFixed(2)}%`);
            }
            
            // 5 Year
            const fiveYearsAgo = new Date(currentDate);
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            const fiveYearPrice = findPriceNearDate(fiveYearsAgo);
            if (fiveYearPrice) {
                returns['5Y'] = ((currentPrice - fiveYearPrice) / fiveYearPrice) * 100;
                console.log(`${symbol} 5Y: current=${currentPrice.toFixed(2)}, 5y ago=${fiveYearPrice.toFixed(2)}, return=${returns['5Y'].toFixed(2)}%`);
            }

            return returns;

        } catch (error) {
            console.error(`Error calculating extended returns for ${symbol}:`, error);
            return {};
        }
    }

    // Find the closest trading day price with weekend/holiday handling
    findClosestTradingDayPrice(prices, dates, targetDate, direction = 'before') {
        if (!prices || !dates || prices.length !== dates.length) {
            return null;
        }

        let closestIndex = -1;
        let closestDistance = Infinity;

        for (let i = 0; i < dates.length; i++) {
            const dataDate = new Date(dates[i]);
            const timeDiff = dataDate.getTime() - targetDate.getTime();
            const daysDiff = Math.abs(timeDiff / (1000 * 60 * 60 * 24));

            // Skip weekends (Saturday = 6, Sunday = 0)
            if (dataDate.getDay() === 0 || dataDate.getDay() === 6) {
                continue;
            }

            // Skip null/invalid prices
            if (prices[i] == null || prices[i] <= 0) {
                continue;
            }

            let isValidDirection = false;
            if (direction === 'before') {
                isValidDirection = timeDiff <= 0; // Data date is on or before target date
            } else if (direction === 'after') {
                isValidDirection = timeDiff >= 0; // Data date is on or after target date
            } else {
                isValidDirection = true; // Any direction
            }

            if (isValidDirection && daysDiff < closestDistance) {
                closestDistance = daysDiff;
                closestIndex = i;
            }
        }

        // If no match found in preferred direction, try the opposite direction within a reasonable range
        if (closestIndex === -1 && direction !== 'any') {
            const oppositeDirection = direction === 'before' ? 'after' : 'before';
            return this.findClosestTradingDayPrice(prices, dates, targetDate, oppositeDirection);
        }

        if (closestIndex !== -1) {
            console.log(`findClosestTradingDayPrice: target=${targetDate.toDateString()}, found=${new Date(dates[closestIndex]).toDateString()}, price=${prices[closestIndex]}`);
            return prices[closestIndex];
        }
        return null;
    }

    // Get multiple quotes efficiently
    async getMultipleQuotes(symbols) {
        // Always use individual requests with CORS proxy
        const promises = symbols.map(symbol => this.getQuote(symbol));
        const results = await Promise.allSettled(promises);

        const quotes = {};
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                quotes[symbols[index]] = result.value;
            } else {
                console.error(`Failed to get quote for ${symbols[index]}`);
                quotes[symbols[index]] = null;
            }
        });
        
        return quotes;
    }

    // Update all market data for dashboard
    async updateMarketData() {
        console.log('Updating all market data...');
        const updates = {};
        
        // Define which symbols to fetch for each market section
        const marketSymbols = ['SPY', 'DIA', 'QQQ', 'IWM'];  // Major indices
        const commoditySymbols = ['GLD', 'SLV', 'USO', 'UUP'];  // Commodities & DXY
        const stockSymbols = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'];  // Top stocks
        
        try {
            // Fetch quotes for all symbols
            const allSymbols = [...marketSymbols, ...commoditySymbols, ...stockSymbols];
            const quotes = await this.getMultipleQuotes(allSymbols);
            
            // Process market indices
            for (const symbol of marketSymbols) {
                if (quotes[symbol]) {
                    const historicalData = await this.getHistoricalData(symbol, '5y', '1d', true);
                    const extendedReturns = await this.getExtendedReturns(symbol);
                    updates[this.getUpdateKey(symbol)] = {
                        current: quotes[symbol].price,
                        change: quotes[symbol].changePercent,
                        changeType: quotes[symbol].changePercent >= 0 ? 'positive' : 'negative',
                        changeLabel: 'Day',
                        volume: quotes[symbol].volume,
                        historicalData: historicalData?.prices || [],
                        dates: historicalData?.dates || [],
                        returns: historicalData?.returns || {},
                        extendedReturns: extendedReturns
                    };
                }
                // Add small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Process commodities
            for (const symbol of commoditySymbols) {
                if (quotes[symbol]) {
                    const historicalData = await this.getHistoricalData(symbol, '5y', '1d', true);
                    const extendedReturns = await this.getExtendedReturns(symbol);
                    updates[this.getUpdateKey(symbol)] = {
                        current: quotes[symbol].price,
                        change: quotes[symbol].changePercent,
                        changeType: quotes[symbol].changePercent >= 0 ? 'positive' : 'negative',
                        changeLabel: 'Day',
                        historicalData: historicalData?.prices || [],
                        dates: historicalData?.dates || [],
                        returns: historicalData?.returns || {},
                        extendedReturns: extendedReturns
                    };
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log('Market data update complete:', Object.keys(updates).length, 'symbols updated');
        } catch (error) {
            console.error('Error updating market data:', error);
        }
        
        return updates;
    }

    // Get update key for dashboard
    getUpdateKey(symbol) {
        const keyMap = {
            'SPY': 'sp500-chart',
            'DIA': 'dow-chart',
            'QQQ': 'nasdaq-chart',
            'IWM': 'russell-chart',
            'GLD': 'gold-chart',
            'SLV': 'silver-chart',
            'USO': 'oil-chart',
            'UUP': 'dxy-chart',
            '^VIX': 'vix-chart'
        };
        return keyMap[symbol] || `${symbol.toLowerCase()}-chart`;
    }
    
    // Helper function to parse dates from various formats
    parseDate(dateValue) {
        if (!dateValue) return null;
        
        // If it's already a Date object
        if (dateValue instanceof Date) {
            return dateValue;
        }
        
        // If it's a string
        if (typeof dateValue === 'string') {
            // Handle M/D/YYYY or MM/DD/YYYY format (Yahoo Finance format)
            if (dateValue.includes('/')) {
                const parts = dateValue.split('/');
                if (parts.length === 3) {
                    // Month is 0-indexed in JavaScript Date
                    const month = parseInt(parts[0]) - 1;
                    const day = parseInt(parts[1]);
                    const year = parseInt(parts[2]);
                    return new Date(year, month, day);
                }
            }
            // Handle YYYY-MM-DD format
            else if (dateValue.includes('-')) {
                return new Date(dateValue + 'T00:00:00');
            }
            // Try parsing as-is
            return new Date(dateValue);
        }
        
        // If it's a Unix timestamp (seconds)
        if (typeof dateValue === 'number' && dateValue < 10000000000) {
            return new Date(dateValue * 1000);
        }
        
        // If it's a millisecond timestamp
        if (typeof dateValue === 'number') {
            return new Date(dateValue);
        }
        
        return null;
    }

    // Test connection
    async testConnection() {
        console.log('Testing Yahoo Finance connection...');
        try {
            const testQuote = await this.getQuote('SPY');
            if (testQuote && testQuote.price) {
                console.log('✅ Yahoo Finance connected successfully');
                console.log('SPY Price:', testQuote.price, 'Change:', testQuote.changePercent.toFixed(2) + '%');
                return true;
            } else {
                console.log('❌ Yahoo Finance connection failed');
                return false;
            }
        } catch (error) {
            console.error('❌ Yahoo Finance test failed:', error);
            return false;
        }
    }
}

// Create global instance
const yahooFinance = new YahooFinanceService();

// Test on load
window.addEventListener('load', () => {
    setTimeout(() => {
        yahooFinance.testConnection();
    }, 2000);
});

// Export for use
window.yahooFinance = yahooFinance;