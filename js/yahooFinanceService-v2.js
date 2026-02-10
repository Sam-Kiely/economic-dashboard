// Yahoo Finance Service V2 - VERCEL API ONLY - NO CORS PROXY
class YahooFinanceService {
    constructor() {
        this.cache = {};
        this.lastFetch = {};
        this.cacheDuration = 60000; // 1 minute cache
        console.log('✅ YahooFinanceService V2: Using Vercel API endpoints exclusively');

        this.symbols = {
            sp500: 'SPY',
            dow: 'DIA',
            nasdaq: 'QQQ',
            russell2000: 'IWM',
            gold: 'GLD',
            silver: 'SLV',
            oil: 'USO',
            dxy: 'UUP',
            apple: 'AAPL',
            microsoft: 'MSFT',
            google: 'GOOGL',
            amazon: 'AMZN',
            nvidia: 'NVDA',
            meta: 'META',
            tesla: 'TSLA',
            berkshire: 'BRK-B',
            jpmorgan: 'JPM',
            visa: 'V',
            vix: '^VIX',
            sp500Index: '^GSPC',
            dowIndex: '^DJI',
            nasdaqIndex: '^IXIC'
        };
    }

    // Get quote - VERCEL API ONLY
    async getQuote(symbol) {
        const now = Date.now();
        const cacheKey = `quote_${symbol}`;

        // Check cache
        if (this.cache[cacheKey] && this.lastFetch[cacheKey] &&
            (now - this.lastFetch[cacheKey] < this.cacheDuration)) {
            console.log(`Using cached data for ${symbol}`);
            return this.cache[cacheKey];
        }

        try {
            const vercelUrl = `/api/yahoo?symbol=${symbol}`;
            console.log(`Fetching Yahoo Finance data via Vercel API: ${symbol}`);

            const response = await fetch(vercelUrl);
            if (!response.ok) {
                throw new Error(`Vercel API failed: ${response.status}`);
            }

            const data = await response.json();

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
                changePercent: ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose)) /
                               (meta.previousClose || meta.chartPreviousClose)) * 100,
                volume: meta.regularMarketVolume,
                marketCap: meta.marketCap,
                dayHigh: meta.regularMarketDayHigh,
                dayLow: meta.regularMarketDayLow,
                fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
                timestamp: meta.regularMarketTime
            };

            // Cache result
            this.cache[cacheKey] = quote;
            this.lastFetch[cacheKey] = now;

            return quote;
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            if (this.cache[cacheKey]) {
                console.log(`Returning stale cache for ${symbol}`);
                return this.cache[cacheKey];
            }
            return null;
        }
    }

    // Get historical data - VERCEL API ONLY
    async getHistoricalData(symbol, range = '1y', interval = '1d', isMarketData = false) {
        const cacheKey = `history_${symbol}_${range}_${interval}`;
        const now = Date.now();
        const historicalCacheDuration = 300000; // 5 minutes

        // Check cache
        if (this.cache[cacheKey] && this.lastFetch[cacheKey] &&
            (now - this.lastFetch[cacheKey] < historicalCacheDuration)) {
            console.log(`Using cached historical data for ${symbol}`);
            return this.cache[cacheKey];
        }

        try {
            const vercelUrl = `/api/yahoo?symbol=${symbol}&range=${range}&interval=${interval}`;
            console.log(`Fetching historical data via Vercel API for ${symbol} (${range})`);

            const response = await fetch(vercelUrl);
            if (!response.ok) {
                throw new Error(`Vercel API failed: ${response.status}`);
            }

            const data = await response.json();

            if (!data.chart || !data.chart.result || !data.chart.result[0]) {
                throw new Error('Invalid response structure');
            }

            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quotes = result.indicators.quote[0];

            if (!timestamps || !quotes || !quotes.close || quotes.close.length === 0) {
                throw new Error(`No price data available for ${symbol}`);
            }

            // Filter out null values
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

            // Format data
            const dates = validData.map(d => new Date(d.timestamp * 1000).toLocaleDateString());
            const prices = validData.map(d => d.close);

            const historicalData = {
                dates: dates,
                prices: prices,
                volumes: validData.map(d => d.volume),
                highs: validData.map(d => d.high),
                lows: validData.map(d => d.low),
                opens: validData.map(d => d.open)
            };

            // Calculate returns
            const periodReturns = this.calculatePeriodReturns(prices);
            historicalData.returns = periodReturns;

            // Cache result
            this.cache[cacheKey] = historicalData;
            this.lastFetch[cacheKey] = now;

            return historicalData;
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
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

        // YTD
        const firstPrice = prices[0];
        returns['YTD'] = ((current - firstPrice) / firstPrice) * 100;

        // 1 Year (252 trading days)
        if (prices.length >= 252) {
            const yearAgo = prices[prices.length - 252];
            returns['1Y'] = ((current - yearAgo) / yearAgo) * 100;
        }

        return returns;
    }

    // Get extended returns
    async getExtendedReturns(symbol) {
        try {
            const data = await this.getHistoricalData(symbol, '5y', '1d', false);

            if (!data || !data.prices || data.prices.length === 0) {
                return {};
            }

            return this.calculatePeriodReturns(data.prices);
        } catch (error) {
            console.error(`Error calculating extended returns for ${symbol}:`, error);
            return {};
        }
    }

    // Get multiple quotes
    async getMultipleQuotes(symbols) {
        // Try batch endpoint first
        if (symbols.length > 1) {
            try {
                const vercelUrl = `/api/yahoo-batch?symbols=${symbols.join(',')}`;
                console.log(`Fetching batch Yahoo Finance data for ${symbols.length} symbols`);

                const response = await fetch(vercelUrl);
                if (response.ok) {
                    const batchData = await response.json();
                    const quotes = {};

                    for (const symbol of symbols) {
                        if (batchData[symbol] && !batchData[symbol].error) {
                            const data = batchData[symbol];
                            if (data.chart && data.chart.result && data.chart.result[0]) {
                                const result = data.chart.result[0];
                                const meta = result.meta;

                                quotes[symbol] = {
                                    symbol: symbol,
                                    price: meta.regularMarketPrice,
                                    previousClose: meta.previousClose || meta.chartPreviousClose,
                                    change: meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose),
                                    changePercent: ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose)) /
                                                  (meta.previousClose || meta.chartPreviousClose)) * 100,
                                    volume: meta.regularMarketVolume,
                                    marketCap: meta.marketCap,
                                    dayHigh: meta.regularMarketDayHigh,
                                    dayLow: meta.regularMarketDayLow,
                                    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
                                    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
                                    timestamp: meta.regularMarketTime
                                };

                                // Cache individual quotes
                                const cacheKey = `quote_${symbol}`;
                                this.cache[cacheKey] = quotes[symbol];
                                this.lastFetch[cacheKey] = Date.now();
                            } else {
                                quotes[symbol] = null;
                            }
                        } else {
                            quotes[symbol] = null;
                        }
                    }

                    return quotes;
                }
            } catch (error) {
                console.warn('Batch API failed, falling back to individual requests:', error.message);
            }
        }

        // Fall back to individual requests
        const promises = symbols.map(symbol => this.getQuote(symbol));
        const results = await Promise.allSettled(promises);

        const quotes = {};
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                quotes[symbols[index]] = result.value;
            } else {
                quotes[symbols[index]] = null;
            }
        });

        return quotes;
    }

    // Update market data
    async updateMarketData() {
        console.log('Updating all market data...');
        const updates = {};

        const marketSymbols = ['SPY', 'DIA', 'QQQ', 'IWM'];
        const commoditySymbols = ['GLD', 'SLV', 'USO', 'UUP'];

        try {
            const allSymbols = [...marketSymbols, ...commoditySymbols];
            const quotes = await this.getMultipleQuotes(allSymbols);

            for (const symbol of marketSymbols) {
                if (quotes[symbol]) {
                    const historicalData = await this.getHistoricalData(symbol, '1y', '1d', true);
                    updates[this.getUpdateKey(symbol)] = {
                        current: quotes[symbol].price,
                        change: quotes[symbol].changePercent,
                        changeType: quotes[symbol].changePercent >= 0 ? 'positive' : 'negative',
                        changeLabel: 'Day',
                        volume: quotes[symbol].volume,
                        historicalData: historicalData?.prices || [],
                        dates: historicalData?.dates || [],
                        returns: historicalData?.returns || {}
                    };
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            for (const symbol of commoditySymbols) {
                if (quotes[symbol]) {
                    const historicalData = await this.getHistoricalData(symbol, '1y', '1d', true);
                    updates[this.getUpdateKey(symbol)] = {
                        current: quotes[symbol].price,
                        change: quotes[symbol].changePercent,
                        changeType: quotes[symbol].changePercent >= 0 ? 'positive' : 'negative',
                        changeLabel: 'Day',
                        historicalData: historicalData?.prices || [],
                        dates: historicalData?.dates || [],
                        returns: historicalData?.returns || {}
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

    // Get update key
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
window.yahooFinance = yahooFinance;

console.log('✅ YahooFinanceService V2 loaded and ready');

// Test on load
window.addEventListener('load', () => {
    setTimeout(() => {
        yahooFinance.testConnection();
    }, 2000);
});