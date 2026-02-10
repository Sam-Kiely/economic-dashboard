// Dashboard Coordinator - Main controller for all services
// Place this in a new file: dashboardCoordinator.js

class DashboardCoordinator {
    constructor() {
        this.services = {
            apiService: null,
            yahooFinance: null,
            bankingService: null,
            calendarService: null,
            dataUpdater: null,
            economicInsights: null
        };
        
        this.updateIntervals = {
            economic: 300000,    // 5 minutes
            markets: 60000,      // 1 minute during market hours
            rates: 300000,       // 5 minutes
            banking: 3600000,    // 1 hour
            calendar: 3600000    // 1 hour
        };
        
        this.intervalHandlers = {};
        this.isMarketHours = false;
        this.lastUpdateTime = {};
        this.errorCount = {};
        this.maxRetries = 3;
    }

    async initialize() {
        console.log('🚀 Initializing Dashboard Coordinator...');
        
        try {
            // Phase 1: Core Services
            await this.initializeCoreServices();
            
            // Phase 2: Data Services
            await this.initializeDataServices();
            
            // Phase 3: UI Services
            await this.initializeUIServices();
            
            // Phase 4: Start Updates
            this.startAutoUpdates();
            
            // Phase 5: Monitor Performance
            this.startPerformanceMonitoring();
            
            console.log('✅ Dashboard Coordinator initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.handleInitializationFailure(error);
            return false;
        }
    }

    async initializeCoreServices() {
        console.log('📦 Initializing core services...');
        
        // Initialize API Service
        if (window.apiService) {
            this.services.apiService = window.apiService;
            console.log('✅ API Service ready');
        } else if (typeof APIService !== 'undefined') {
            this.services.apiService = new APIService();
            window.apiService = this.services.apiService;
            console.log('✅ API Service created and attached');
        } else {
            throw new Error('API Service not available');
        }
        
        // Initialize Yahoo Finance
        if (window.yahooFinance) {
            this.services.yahooFinance = window.yahooFinance;
            const connected = await this.services.yahooFinance.testConnection();
            if (connected) {
                console.log('✅ Yahoo Finance connected');
            } else {
                console.warn('⚠️ Yahoo Finance connection failed, will use fallback data');
            }
        }
    }

    async initializeDataServices() {
        console.log('📊 Initializing data services...');
        
        // Initialize Data Updater
        if (window.dataUpdater) {
            this.services.dataUpdater = window.dataUpdater;
        } else if (typeof DataUpdater !== 'undefined') {
            this.services.dataUpdater = new DataUpdater();
            window.dataUpdater = this.services.dataUpdater;
        }
        
        // Initialize Banking Service
        if (window.bankingService) {
            this.services.bankingService = window.bankingService;
        } else if (typeof BankingService !== 'undefined') {
            this.services.bankingService = new BankingService();
            window.bankingService = this.services.bankingService;
            await this.services.bankingService.init();
        }
        
        // Initialize Economic Insights
        if (window.economicInsights) {
            this.services.economicInsights = window.economicInsights;
        } else if (typeof EconomicInsightsService !== 'undefined') {
            this.services.economicInsights = new EconomicInsightsService();
            window.economicInsights = this.services.economicInsights;
        }
        
        console.log('✅ Data services initialized');
    }

    async initializeUIServices() {
        console.log('🎨 Initializing UI services...');
        
        // Initialize Calendar Service
        if (window.calendarService) {
            this.services.calendarService = window.calendarService;
        } else if (typeof CalendarService !== 'undefined') {
            this.services.calendarService = new CalendarService();
            window.calendarService = this.services.calendarService;
            this.services.calendarService.init();
        }
        
        // Initialize Charts
        this.initializeAllCharts();
        
        console.log('✅ UI services initialized');
    }

    initializeAllCharts() {
        console.log('Initializing all charts concurrently...');
        const startTime = Date.now();

        // Define chart configurations
        const chartConfigs = [
            // Economic charts
            ...['corecpi', 'coreppi', 'corepce', 'gdp', 'trade',
                'unemployment', 'jobless', 'retail', 'durablegoods',
                'newhomes', 'existinghomes', 'sentiment'].map(id => ({ id: `${id}-chart`, color: '#667eea' })),

            // Market charts
            ...['sp500', 'dow', 'nasdaq', 'vix', 'gold', 'oil', 'dxy', 'bitcoin'].map(id => ({ id: `${id}-chart`, color: '#2196F3' })),

            // Rate charts
            ...['sofr', '2yr', '5yr', '10yr', '30yr', 'fedfunds',
                'tbill', 'highyield', 'spread'].map(id => ({ id: `${id}-chart`, color: '#4CAF50' }))
        ];

        // Initialize all charts in parallel using requestAnimationFrame for better performance
        let initialized = 0;
        chartConfigs.forEach((config, index) => {
            requestAnimationFrame(() => {
                const canvas = document.getElementById(config.id);
                if (canvas && !canvas.chart) {
                    this.initializeChart(canvas, config.color);
                    initialized++;
                }

                // Log completion when all charts are initialized
                if (index === chartConfigs.length - 1) {
                    console.log(`Initialized ${initialized} charts in ${Date.now() - startTime}ms`);
                }
            });
        });
    }

    initializeChart(canvas, color) {
        canvas.chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: color,
                    backgroundColor: color + '20',
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 },
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: false
                        }
                    },
                    y: {
                        display: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
        
        // Update tooltips with proper formatting (skip for rate charts as they have custom config)
        if (typeof updateChartTooltips === 'function') {
            const chartId = canvas.id;
            const isRateChart = chartId && (chartId.includes('2yr') || chartId.includes('5yr') || 
                                           chartId.includes('10yr') || chartId.includes('30yr') ||
                                           chartId.includes('sofr') || chartId.includes('tbill') ||
                                           chartId.includes('fedfunds') || chartId.includes('highyield') ||
                                           chartId.includes('mortgage') || chartId.includes('prime'));
            
            if (!isRateChart) {
                updateChartTooltips(canvas.chart);
            }
        }
    }

    startAutoUpdates() {
        console.log('⏰ Starting automatic updates...');
        
        // Check market hours
        this.checkMarketHours();
        setInterval(() => this.checkMarketHours(), 60000); // Check every minute
        
        // Economic data updates
        this.scheduleUpdate('economic', async () => {
            await this.updateEconomicData();
        }, this.updateIntervals.economic);
        
        // Market data updates
        this.scheduleUpdate('markets', async () => {
            await this.updateMarketData();
        }, this.getMarketUpdateInterval());
        
        // Rate data updates
        this.scheduleUpdate('rates', async () => {
            await this.updateRatesData();
        }, this.updateIntervals.rates);
        
        // Banking data updates
        this.scheduleUpdate('banking', async () => {
            await this.updateBankingData();
        }, this.updateIntervals.banking);
        
        // Calendar updates
        this.scheduleUpdate('calendar', async () => {
            await this.updateCalendar();
        }, this.updateIntervals.calendar);
        
        // Initial update for all
        this.performInitialUpdate();
    }

    scheduleUpdate(name, updateFunction, interval) {
        // Clear existing interval if any
        if (this.intervalHandlers[name]) {
            clearInterval(this.intervalHandlers[name]);
        }
        
        // Set new interval
        this.intervalHandlers[name] = setInterval(async () => {
            try {
                console.log(`🔄 Updating ${name}...`);
                await updateFunction();
                this.lastUpdateTime[name] = Date.now();
                this.errorCount[name] = 0;
            } catch (error) {
                console.error(`❌ Error updating ${name}:`, error);
                this.handleUpdateError(name, error);
            }
        }, interval);
    }

    async performInitialUpdate() {
        console.log('🚀 Performing initial data load...');

        // Show loading state
        if (window.loadingManager) {
            window.loadingManager.showGlobalLoading('Loading dashboard data...');
        }

        try {
            // Update all data in parallel for faster loading
            const startTime = Date.now();

            // Execute all updates concurrently
            await Promise.all([
                this.updateEconomicData(),
                this.updateMarketData(),
                this.updateRatesData(),
                this.updateBankingData(),
                this.updateCalendar()
            ]);

            const loadTime = Date.now() - startTime;
            console.log(`✅ Initial data load complete in ${loadTime}ms`);

        } catch (error) {
            console.error('❌ Error during initial data load:', error);
            // Continue even if some data fails to load
        } finally {
            // Hide loading state
            if (window.loadingManager) {
                window.loadingManager.hideGlobalLoading();
            }
        }
    }

    async updateEconomicData() {
        if (!this.services.apiService) return;

        const data = await this.services.apiService.updateAllData();

        if (data && this.services.dataUpdater) {
            Object.entries(data).forEach(([key, value]) => {
                this.services.dataUpdater.updateCard(key, value);
            });
        }

        // Update insights
        if (this.services.economicInsights && data) {
            this.services.economicInsights.updateAllSummaries(data);
        }

        // Update rates summary after economic data loads (includes rates data)
        setTimeout(() => {
            if (typeof updateRatesSummary === 'function') {
                updateRatesSummary();
            }
        }, 1000);
    }

    async updateMarketData() {
        if (!this.services.yahooFinance) return;

        // Update market indices
        const symbols = ['SPY', 'DIA', 'QQQ', '^VIX', 'GC=F', 'CL=F', 'DX-Y.NYB', 'BTC-USD'];

        // Fetch all market data in parallel
        const marketPromises = symbols.map(async (symbol) => {
            try {
                // Fetch quote, historical, and extended returns in parallel
                const [quote, historical, extendedReturns] = await Promise.all([
                    this.services.yahooFinance.getQuote(symbol),
                    this.services.yahooFinance.getHistoricalData(symbol, '1y', '1d', true),
                    this.services.yahooFinance.getExtendedReturns(symbol)
                ]);

                // Update the appropriate card
                this.updateMarketCard(symbol, quote, historical, extendedReturns);

                return { symbol, success: true };
            } catch (error) {
                console.error(`Error updating ${symbol}:`, error);
                return { symbol, success: false, error };
            }
        });

        // Wait for all updates to complete
        const results = await Promise.all(marketPromises);

        const successCount = results.filter(r => r.success).length;
        console.log(`Market data updated: ${successCount}/${symbols.length} symbols`);
    }

    async updateRatesData() {
        if (!this.services.apiService) return;

        // Rates tab uses FRED API exclusively
        const fredRateSeries = {
            '2yr': 'DGS2',           // 2-Year Treasury
            '5yr': 'DGS5',           // 5-Year Treasury
            '10yr': 'DGS10',         // 10-Year Treasury
            '30yr': 'DGS30',         // 30-Year Treasury
            'sofr': 'SOFR30DAYAVG',  // 30-Day Average SOFR
            'fedfunds': 'DFEDTARU',  // Fed Funds Target Range Upper
            'tbill': 'DTB3',         // 3-Month Treasury Bill
            'highyield': 'BAMLH0A0HYM2' // High Yield Index
        };

        // Store 2yr and 10yr data for spread calculation
        let treasury2Data = null;
        let treasury10Data = null;

        // Fetch all rate data from FRED in parallel
        const ratePromises = Object.entries(fredRateSeries).map(async ([key, seriesId]) => {
            try {
                // Fetch FRED data with appropriate time ranges
                const isDaily = ['2yr', '5yr', '10yr', '30yr', 'sofr', 'highyield'].includes(key);
                const limit = isDaily ? 365 : 52; // 365 days or 52 weeks
                const frequency = isDaily ? 'd' : (key === 'tbill' ? 'w' : 'd');

                const data = await this.services.apiService.getFREDSeries(seriesId, limit, frequency);

                if (data && data.values && data.values.length > 0) {
                    // Store 2yr and 10yr data for spread calculation
                    if (key === '2yr') treasury2Data = data;
                    if (key === '10yr') treasury10Data = data;

                    // Update the rate card with FRED data
                    if (this.services.dataUpdater) {
                        this.services.dataUpdater.updateRateChartWithFredData(`${key}-chart`, data.values, data.dates);
                    }
                    return { key, success: true, data };
                }

                return { key, success: false, error: 'No data received' };
            } catch (error) {
                console.error(`Error updating FRED series ${seriesId}:`, error);
                return { key, success: false, error };
            }
        });

        // Wait for all updates to complete
        const results = await Promise.all(ratePromises);

        // Calculate 2s10s spread if we have both treasury data
        if (treasury2Data && treasury10Data && this.services.apiService.calculate2s10sHistorical) {
            try {
                const spreadData = this.services.apiService.calculate2s10sHistorical(treasury2Data, treasury10Data);
                if (spreadData && this.services.dataUpdater) {
                    this.services.dataUpdater.updateRateChartWithFredData('spread-chart',
                        spreadData.values, spreadData.dates);
                }
            } catch (error) {
                console.error('Error calculating 2s10s spread:', error);
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`Rates data updated from FRED: ${successCount}/${Object.keys(fredRateSeries).length} rates`);
    }

    async updateBankingData() {
        if (!this.services.bankingService) return;
        
        await this.services.bankingService.updateBankingTab();
    }

    async updateCalendar() {
        if (!this.services.calendarService) return;
        
        this.services.calendarService.refresh();
    }

    updateMarketCard(symbol, quote, historical, extendedReturns) {
        // Map symbols to card IDs
        const symbolMap = {
            'SPY': 'sp500-market-card',
            'DIA': 'dow-market-card',
            'QQQ': 'nasdaq-market-card',
            '^VIX': 'vix-market-card',
            'GC=F': 'gold-market-card',
            'CL=F': 'oil-market-card',
            'DX-Y.NYB': 'dxy-market-card',
            'BTC-USD': 'bitcoin-market-card'
        };
        
        const cardId = symbolMap[symbol];
        if (!cardId) return;
        
        const card = document.getElementById(cardId);
        if (!card) return;
        
        // Update card values
        if (quote) {
            const valueElement = card.querySelector('.card-value');
            if (valueElement) {
                valueElement.textContent = this.formatPrice(symbol, quote.price);
            }
            
            const changeElement = card.querySelector('.card-change');
            if (changeElement && quote.changePercent !== undefined) {
                const changeType = quote.changePercent >= 0 ? 'positive' : 'negative';
                changeElement.className = 'card-change ' + changeType;
                const arrow = quote.changePercent >= 0 ? '▲' : '▼';
                changeElement.innerHTML = `1D: ${arrow} ${Math.abs(quote.changePercent).toFixed(2)}%`;
            }
        }
        
        // Update period returns
        if (extendedReturns) {
            this.updatePeriodReturns(card, extendedReturns);
        }
        
        // Update chart
        if (historical) {
            this.updateChart(cardId.replace('-market-card', '-chart'), historical);
        }
    }

    // REMOVED: Old Yahoo Finance rate card update method
    // Rates are now updated via FRED API using dataUpdater.updateRateChartWithFredData()

    updatePeriodReturns(card, returns) {
        let container = card.querySelector('.period-returns');
        if (!container) {
            container = document.createElement('div');
            container.className = 'period-returns';
            const changeElement = card.querySelector('.card-change');
            if (changeElement) {
                changeElement.insertAdjacentElement('afterend', container);
            }
        }
        
        const periods = ['1W', '1M', 'YTD', '1Y', '3Y', '5Y'];
        let html = '';
        
        periods.forEach(period => {
            if (returns[period] !== undefined) {
                const value = returns[period];
                const colorClass = value >= 0 ? 'positive' : 'negative';
                const sign = value >= 0 ? '+' : '';
                html += `
                    <div class="return-item">
                        <span class="return-label">${period}:</span>
                        <span class="return-value ${colorClass}">${sign}${value.toFixed(1)}%</span>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
    }

    updateChart(chartId, data) {
        const canvas = document.getElementById(chartId);
        if (!canvas || !canvas.chart || !data) return;
        
        // Check if this is a rate chart - preserve existing labels if they're properly formatted
        const isRateChart = chartId && (chartId.includes('2yr') || 
                                       chartId.includes('10yr') || chartId.includes('30yr') ||
                                       chartId.includes('sofr') || chartId.includes('tbill') ||
                                       chartId.includes('fedfunds') || chartId.includes('highyield') ||
                                       chartId.includes('mortgage') || chartId.includes('prime') ||
                                       chartId.includes('spread'));
        
        if (isRateChart) {
            // For rate charts, only update data and originalDates, preserve existing formatted labels
            canvas.chart.data.datasets[0].data = data.prices || [];
            canvas.chart.data.originalDates = data.dates || []; // Store for tooltip formatting
            
            // Only update labels if they're not properly formatted (e.g., empty or same length as data)
            const currentLabels = canvas.chart.data.labels || [];
            const hasProperLabels = currentLabels.length > 0 && currentLabels.length < (data.dates?.length || 0);
            
            if (!hasProperLabels && window.chartUtils && data.dates && data.dates.length > 0) {
                canvas.chart.data.labels = window.chartUtils.formatChartAxis(data.dates, 'monthly');
            }
        } else {
            // For other charts, use the original logic
            if (window.chartUtils && data.dates && data.dates.length > 0) {
                canvas.chart.data.labels = window.chartUtils.formatChartAxis(data.dates, 'monthly');
                canvas.chart.data.originalDates = data.dates; // Store for tooltip formatting
            } else {
                canvas.chart.data.labels = data.dates || [];
                canvas.chart.data.originalDates = data.dates || [];
            }
            canvas.chart.data.datasets[0].data = data.prices || [];
        }
        
        canvas.chart.update();
    }

    formatPrice(symbol, price) {
        if (symbol === 'BTC-USD') {
            return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else if (symbol === '^VIX') {
            return price.toFixed(2);
        } else if (symbol === 'GC=F') {
            return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            return '$' + price.toFixed(2);
        }
    }

    checkMarketHours() {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = hour * 60 + minute;
        
        // Markets closed on weekends
        if (day === 0 || day === 6) {
            this.isMarketHours = false;
            return;
        }
        
        // Market hours: 9:30 AM - 4:00 PM ET
        const marketOpen = 9 * 60 + 30;
        const marketClose = 16 * 60;
        
        this.isMarketHours = currentTime >= marketOpen && currentTime < marketClose;
    }

    getMarketUpdateInterval() {
        return this.isMarketHours ? 60000 : 300000; // 1 min during market hours, 5 min otherwise
    }

    handleUpdateError(name, error) {
        this.errorCount[name] = (this.errorCount[name] || 0) + 1;
        
        if (this.errorCount[name] >= this.maxRetries) {
            console.error(`⚠️ Max retries reached for ${name}, disabling auto-update`);
            if (this.intervalHandlers[name]) {
                clearInterval(this.intervalHandlers[name]);
                delete this.intervalHandlers[name];
            }
            
            // Show user notification
            this.showErrorNotification(`Unable to update ${name} data. Please refresh the page.`);
        }
    }

    handleInitializationFailure(error) {
        console.error('Dashboard initialization failed:', error);
        
        this.showErrorNotification('Dashboard initialization failed. Please refresh the page.');
    }


    showErrorNotification(message) {
        // Create or update error notification
        let notification = document.getElementById('error-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'error-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f44336;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 10000;
                max-width: 300px;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }

    startPerformanceMonitoring() {
        // Monitor performance metrics
        setInterval(() => {
            const metrics = {
                memory: performance.memory ? 
                    (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB' : 
                    'N/A',
                uptime: Math.floor((Date.now() - (window.dashboardStartTime || Date.now())) / 1000) + ' seconds',
                activeIntervals: Object.keys(this.intervalHandlers).length,
                lastUpdates: this.lastUpdateTime
            };
            
            console.log('📊 Performance Metrics:', metrics);
        }, 60000); // Log every minute
    }

    // Public methods for manual control
    pauseUpdates() {
        console.log('⏸️ Pausing all updates...');
        Object.keys(this.intervalHandlers).forEach(key => {
            clearInterval(this.intervalHandlers[key]);
        });
        this.intervalHandlers = {};
    }

    resumeUpdates() {
        console.log('▶️ Resuming updates...');
        this.startAutoUpdates();
    }

    forceUpdate(service) {
        console.log(`🔄 Force updating ${service}...`);
        switch(service) {
            case 'economic':
                return this.updateEconomicData();
            case 'markets':
                return this.updateMarketData();
            case 'rates':
                return this.updateRatesData();
            case 'banking':
                return this.updateBankingData();
            case 'calendar':
                return this.updateCalendar();
            default:
                return this.performInitialUpdate();
        }
    }

    destroy() {
        console.log('🛑 Destroying dashboard coordinator...');
        this.pauseUpdates();
        this.services = {};
    }
}

// Initialize coordinator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardStartTime = Date.now();
    
    // Wait for all scripts to load
    setTimeout(async () => {
        window.dashboardCoordinator = new DashboardCoordinator();
        await window.dashboardCoordinator.initialize();
        
        // Add global control functions
        window.pauseDashboard = () => window.dashboardCoordinator.pauseUpdates();
        window.resumeDashboard = () => window.dashboardCoordinator.resumeUpdates();
        window.forceUpdate = (service) => window.dashboardCoordinator.forceUpdate(service);
        
        console.log('Dashboard ready! Use pauseDashboard(), resumeDashboard(), or forceUpdate(service) for manual control.');
    }, 2000);
});