// Corporate Fallback Data - Realistic mock data for blocked APIs
class CorporateFallbackData {
    constructor() {
        this.lastUpdated = new Date();
        this.generateRealisticData();
    }

    generateRealisticData() {
        // Generate realistic market data based on typical ranges
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

        this.marketData = {
            'SPY': {
                price: this.generatePrice(425, 465, 445), // S&P 500 range
                change: this.generateChange(-2, 2),
                volume: this.generateVolume(50000000, 150000000),
                lastUpdate: today.toISOString()
            },
            'QQQ': {
                price: this.generatePrice(350, 380, 365),
                change: this.generateChange(-3, 3),
                volume: this.generateVolume(30000000, 80000000),
                lastUpdate: today.toISOString()
            },
            'DIA': {
                price: this.generatePrice(340, 360, 350),
                change: this.generateChange(-1.5, 1.5),
                volume: this.generateVolume(3000000, 8000000),
                lastUpdate: today.toISOString()
            },
            '^VIX': {
                price: this.generatePrice(12, 25, 18),
                change: this.generateChange(-3, 3),
                volume: 0,
                lastUpdate: today.toISOString()
            },
            'GC=F': {
                price: this.generatePrice(1900, 2100, 2000),
                change: this.generateChange(-2, 2),
                volume: this.generateVolume(100000, 500000),
                lastUpdate: today.toISOString()
            },
            'CL=F': {
                price: this.generatePrice(70, 90, 80),
                change: this.generateChange(-3, 3),
                volume: this.generateVolume(200000, 800000),
                lastUpdate: today.toISOString()
            },
            'BTC-USD': {
                price: this.generatePrice(25000, 45000, 35000),
                change: this.generateChange(-5, 5),
                volume: this.generateVolume(10000000000, 30000000000),
                lastUpdate: today.toISOString()
            }
        };

        // Generate treasury rates (more stable)
        this.treasuryRates = {
            '3M': this.generateRate(4.5, 5.5, 5.0),
            '2Y': this.generateRate(4.2, 5.2, 4.7),
            '5Y': this.generateRate(4.0, 5.0, 4.5),
            '10Y': this.generateRate(4.1, 5.1, 4.6),
            '30Y': this.generateRate(4.3, 5.3, 4.8)
        };

        // Calculate spread
        this.treasuryRates['10Y-2Y'] = this.treasuryRates['10Y'] - this.treasuryRates['2Y'];

        // Generate historical data (30 days)
        this.generateHistoricalData(thirtyDaysAgo, today);
    }

    generatePrice(min, max, center) {
        // Generate price with slight bias toward center
        const range = max - min;
        const random = Math.random();
        const biased = Math.pow(random, 1.2); // Slight bias toward lower values
        return Number((min + (biased * range)).toFixed(2));
    }

    generateChange(min, max) {
        const range = max - min;
        return Number(((Math.random() * range) + min).toFixed(2));
    }

    generateVolume(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    generateRate(min, max, center) {
        // Generate rate with normal distribution around center
        const stdDev = (max - min) / 6;
        let rate = this.normalRandom() * stdDev + center;
        rate = Math.max(min, Math.min(max, rate)); // Clamp to range
        return Number(rate.toFixed(3));
    }

    normalRandom() {
        // Box-Muller transform for normal distribution
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    generateHistoricalData(startDate, endDate) {
        const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
        this.historicalData = {};

        Object.keys(this.marketData).forEach(symbol => {
            this.historicalData[symbol] = {
                dates: [],
                prices: [],
                volumes: []
            };

            let currentPrice = this.marketData[symbol].price;

            for (let i = 0; i < days; i++) {
                const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
                this.historicalData[symbol].dates.push(date.toISOString().split('T')[0]);

                // Generate price with random walk
                const changePercent = this.generateChange(-2, 2) / 100;
                currentPrice = currentPrice * (1 + changePercent);
                this.historicalData[symbol].prices.push(Number(currentPrice.toFixed(2)));

                // Generate volume
                const baseVolume = this.marketData[symbol].volume;
                const volumeVariation = this.generateChange(0.7, 1.3);
                this.historicalData[symbol].volumes.push(Math.floor(baseVolume * volumeVariation));
            }
        });
    }

    // Get current quote for a symbol
    getQuote(symbol) {
        if (!this.marketData[symbol]) {
            return null;
        }

        const data = this.marketData[symbol];
        return {
            symbol: symbol,
            regularMarketPrice: data.price,
            regularMarketChange: data.change,
            regularMarketChangePercent: (data.change / data.price * 100).toFixed(2),
            regularMarketVolume: data.volume,
            marketState: this.getMarketState(),
            regularMarketTime: Math.floor(Date.now() / 1000)
        };
    }

    // Get historical data for a symbol
    getHistoricalData(symbol, period = '1mo', interval = '1d') {
        if (!this.historicalData[symbol]) {
            return null;
        }

        const data = this.historicalData[symbol];
        return {
            chart: {
                result: [{
                    meta: {
                        symbol: symbol,
                        regularMarketPrice: this.marketData[symbol].price
                    },
                    timestamp: data.dates.map(date => Math.floor(new Date(date).getTime() / 1000)),
                    indicators: {
                        quote: [{
                            close: data.prices,
                            volume: data.volumes
                        }]
                    }
                }]
            }
        };
    }

    // Get treasury rate
    getTreasuryRate(maturity) {
        return this.treasuryRates[maturity] || null;
    }

    getMarketState() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        // Weekend
        if (day === 0 || day === 6) {
            return 'CLOSED';
        }

        // Market hours (9:30 AM - 4:00 PM ET, simplified to local time)
        if (hour >= 9 && hour < 16) {
            return 'REGULAR';
        } else if (hour >= 16 && hour < 20) {
            return 'POST';
        } else if (hour >= 4 && hour < 9) {
            return 'PRE';
        } else {
            return 'CLOSED';
        }
    }

    // Refresh data (simulate real-time updates)
    refresh() {
        console.log('🎭 Refreshing fallback data...');
        this.generateRealisticData();
        this.lastUpdated = new Date();
    }

    // Check if data is stale (update every 5 minutes in fallback mode)
    isStale() {
        const fiveMinutes = 5 * 60 * 1000;
        return (Date.now() - this.lastUpdated.getTime()) > fiveMinutes;
    }
}

// Initialize fallback data
window.corporateFallbackData = new CorporateFallbackData();