// Economic Calendar Service - Real FRED Release Dates API
class CalendarService {
    constructor() {
        this.selectedPeriod = 'this-week';
        this.container = null;
        this.initialized = false;
        this.fredReleaseCache = null;
        this.cacheTimestamp = 0;
        this.cacheTimeout = 3600000; // 1 hour
    }

    // FRED Release ID to Series Mapping
    RELEASE_ID_TO_SERIES = {
        10:  { seriesId: 'coreCPI',           name: 'Consumer Price Index',     impact: 'high',   time: '8:30 AM ET' },
        31:  { seriesId: 'corePPI',           name: 'Producer Price Index',     impact: 'high',   time: '8:30 AM ET' },
        54:  { seriesId: 'corePCE',           name: 'PCE Price Index',          impact: 'high',   time: '8:30 AM ET' },
        53:  { seriesId: 'gdp',              name: 'GDP (Quarterly)',          impact: 'high',   time: '8:30 AM ET' },
        127: { seriesId: 'tradeDeficit',     name: 'Trade Balance',            impact: 'low',    time: '8:30 AM ET' },
        50:  { seriesId: 'unemployment',     name: 'Employment Situation',     impact: 'high',   time: '8:30 AM ET' },
        176: { seriesId: 'joblessClaims',    name: 'Initial Jobless Claims',   impact: 'medium', time: '8:30 AM ET' },
        9:   { seriesId: 'retailSales',      name: 'Retail Sales',             impact: 'medium', time: '8:30 AM ET' },
        94:  { seriesId: 'durableGoods',     name: 'Durable Goods Orders',     impact: 'medium', time: '8:30 AM ET' },
        55:  { seriesId: 'newHomeSales',     name: 'New Home Sales',           impact: 'low',    time: '10:00 AM ET' },
        253: { seriesId: 'existingHomeSales',name: 'Existing Home Sales',      impact: 'low',    time: '10:00 AM ET' },
        29:  { seriesId: 'consumerSentiment',name: 'Consumer Sentiment',       impact: 'medium', time: '10:00 AM ET' },
        22:  { seriesId: 'h8Data',           name: 'H.8 Banking Data',         impact: 'medium', time: '4:15 PM ET' },
        398: { seriesId: 'fomc',             name: 'FOMC Rate Decision',       impact: 'high',   time: '2:00 PM ET' }
    };

    // Initialize the calendar
    async init(containerId) {
        console.log('Initializing FRED calendar with container:', containerId);

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Calendar container not found:', containerId);
            return false;
        }

        this.initialized = true;
        this.setupPeriodSelector();

        // Wait for charts to load, then render
        const maxWait = 30000; // 30 seconds max
        const checkInterval = 500; // Check every 500ms
        let elapsed = 0;

        const waitForCharts = async () => {
            while (elapsed < maxWait) {
                const chartExists = document.querySelector('.chart-container canvas');
                if (chartExists) {
                    console.log('✅ Charts detected, rendering calendar');
                    await this.renderCalendar();
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                elapsed += checkInterval;
            }
            console.warn('⚠️ Charts not detected after 30s, rendering calendar anyway');
            await this.renderCalendar();
        };

        waitForCharts();

        // Set up refresh interval
        setInterval(() => this.refresh(), 300000); // Refresh every 5 minutes

        return true;
    }

    // Fetch release dates from FRED API
    async fetchFREDReleaseDates() {
        const now = Date.now();

        // Return cached data if still valid
        if (this.fredReleaseCache && (now - this.cacheTimestamp) < this.cacheTimeout) {
            console.log('Using cached FRED release data');
            return this.fredReleaseCache;
        }

        console.log('Fetching FRED release dates from API...');

        try {
            const today = new Date();
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            const formatDate = (d) => d.toISOString().split('T')[0];

            const url = `https://api.stlouisfed.org/fred/releases/dates?` +
                `api_key=${API_CONFIG.FRED.apiKey}` +
                `&file_type=json` +
                `&include_release_dates_with_no_data=true` +
                `&realtime_start=${formatDate(monthAgo)}` +
                `&realtime_end=9999-12-31` +
                `&sort_order=asc` +
                `&limit=1000`;

            console.log('FRED releases URL:', url);

            // FRED supports CORS natively - no proxy needed
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`FRED API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('FRED releases response:', data);

            this.fredReleaseCache = data.release_dates || [];
            this.cacheTimestamp = now;

            console.log(`✅ Cached ${this.fredReleaseCache.length} FRED release dates`);
            return this.fredReleaseCache;

        } catch (error) {
            console.error('Error fetching FRED release dates:', error);

            // Don't fall back to estimates - show error instead
            this.fredReleaseCache = null;
            throw error;
        }
    }

    // Calculate upcoming releases using real FRED data
    async calculateUpcomingReleases() {
        try {
            const releaseDates = await this.fetchFREDReleaseDates();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Calculate period boundaries
            const { periodStart, periodEnd } = this.getPeriodBoundaries(today);

            const events = [];

            releaseDates.forEach(release => {
                const mapping = this.RELEASE_ID_TO_SERIES[release.release_id];
                if (!mapping) return; // Skip releases we don't track

                const releaseDate = new Date(release.date + 'T00:00:00');

                if (releaseDate >= periodStart && releaseDate <= periodEnd) {
                    events.push({
                        date: releaseDate,
                        name: mapping.name,
                        impact: mapping.impact,
                        seriesId: mapping.seriesId,
                        time: mapping.time,
                        isPast: releaseDate < today,
                        releaseName: release.release_name, // Keep FRED's official name
                        releaseId: release.release_id
                    });
                }
            });

            events.sort((a, b) => a.date - b.date);
            console.log(`📅 Found ${events.length} releases for ${this.selectedPeriod}:`, events);
            return events;

        } catch (error) {
            console.error('Error calculating upcoming releases:', error);
            return [];
        }
    }

    // Get period boundaries for filtering
    getPeriodBoundaries(today) {
        const currentDay = today.getDay(); // 0 = Sunday
        let periodStart = new Date(today);
        let periodEnd = new Date(today);

        switch(this.selectedPeriod) {
            case 'today':
                periodStart.setHours(0, 0, 0, 0);
                periodEnd.setHours(23, 59, 59, 999);
                break;

            case 'this-week':
                // Start from Sunday of current week
                const daysToSubtract = currentDay;
                periodStart.setDate(today.getDate() - daysToSubtract);
                periodStart.setHours(0, 0, 0, 0);
                // End on Saturday
                periodEnd = new Date(periodStart);
                periodEnd.setDate(periodStart.getDate() + 6);
                periodEnd.setHours(23, 59, 59, 999);
                break;

            case 'next-week':
                // Start from next Sunday
                const daysToNextSunday = 7 - currentDay;
                periodStart.setDate(today.getDate() + daysToNextSunday);
                periodStart.setHours(0, 0, 0, 0);
                // End on next Saturday
                periodEnd = new Date(periodStart);
                periodEnd.setDate(periodStart.getDate() + 6);
                periodEnd.setHours(23, 59, 59, 999);
                break;

            case 'month-ahead':
                periodStart = new Date(today);
                periodStart.setHours(0, 0, 0, 0);
                periodEnd = new Date(today);
                periodEnd.setDate(today.getDate() + 28);
                periodEnd.setHours(23, 59, 59, 999);
                break;
        }

        return { periodStart, periodEnd };
    }

    // Load current data from dashboard charts
    loadCurrentData() {
        const data = {};

        const seriesMap = {
            'coreCPI': '#cpi-chart',
            'corePPI': '#ppi-chart',
            'corePCE': '#pce-chart',
            'gdp': '#gdp-chart',
            'tradeDeficit': '#tradedeficit-chart',
            'unemployment': '#unemployment-chart',
            'joblessClaims': '#jobless-chart',
            'retailSales': '#retail-chart',
            'durableGoods': '#durablegoods-chart',
            'newHomeSales': '#newhomes-chart',
            'existingHomeSales': '#existinghomes-chart',
            'consumerSentiment': '#sentiment-chart'
        };

        for (const [seriesId, selector] of Object.entries(seriesMap)) {
            const card = document.querySelector(selector);
            if (card) {
                // Get current value
                const currentElement = card.querySelector('.metric-value');
                const current = currentElement ? currentElement.textContent.trim() : null;

                // Get previous value from chart data
                let previous = null;
                const chartCanvas = card.querySelector('canvas');
                if (chartCanvas && window.Chart && window.Chart.getChart) {
                    const chart = window.Chart.getChart(chartCanvas);
                    if (chart && chart.data && chart.data.datasets[0]) {
                        const chartData = chart.data.datasets[0].data;
                        if (chartData && chartData.length >= 2) {
                            const prevValue = chartData[chartData.length - 2];
                            previous = this.formatValue(prevValue, seriesId);
                        }
                    }
                }

                if (current || previous) {
                    data[seriesId] = { current, previous };
                }
            }
        }

        console.log('Loaded dashboard data:', data);
        return data;
    }

    // Format value based on series type
    formatValue(value, seriesId) {
        if (typeof value !== 'number') return value;

        switch(seriesId) {
            case 'unemployment':
            case 'coreCPI':
            case 'corePPI':
            case 'corePCE':
            case 'gdp':
            case 'retailSales':
                return value.toFixed(1) + '%';
            case 'joblessClaims':
                return Math.round(value) + 'K';
            case 'newHomeSales':
                return Math.round(value) + 'K';
            case 'existingHomeSales':
                return value.toFixed(2) + 'M';
            case 'consumerSentiment':
                return value.toFixed(1);
            case 'durableGoods':
                return value.toFixed(1) + '%';
            case 'tradeDeficit':
                return '$' + Math.abs(value).toFixed(1) + 'B';
            default:
                return value.toString();
        }
    }

    // Format data values for display
    formatDataValues(seriesId, dashboardData) {
        const data = dashboardData[seriesId];
        if (!data) return '';

        let html = '<div class="calendar-data-values">';

        if (data.current) {
            html += `<span class="data-label">Current:</span> <span class="data-value">${data.current}</span>`;
        }

        if (data.previous) {
            if (data.current) html += '<span class="data-separator"> | </span>';
            html += `<span class="data-label">Previous:</span> <span class="data-value">${data.previous}</span>`;
        }

        html += '</div>';
        return html;
    }

    // Setup period selector
    setupPeriodSelector() {
        const selector = document.querySelector('.period-selector');
        if (!selector) {
            console.log('Period selector not found');
            return;
        }

        const buttons = selector.querySelectorAll('.period-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedPeriod = e.target.dataset.period;
                console.log('Period changed to:', this.selectedPeriod);
                await this.renderCalendar();
            });
        });
    }

    // Refresh the calendar
    async refresh() {
        console.log('Refreshing calendar...');
        await this.renderCalendar();
    }

    // Render the calendar
    async renderCalendar() {
        if (!this.container || !this.initialized) {
            console.log('Cannot render - container not initialized');
            return;
        }

        console.log('Rendering calendar for period:', this.selectedPeriod);

        try {
            // Show loading state
            this.container.innerHTML = '<div class="calendar-loading">Loading release dates...</div>';

            const events = await this.calculateUpcomingReleases();
            const dashboardData = this.loadCurrentData();

            if (!events || events.length === 0) {
                this.container.innerHTML = `
                    <div class="no-events">
                        <p>No confirmed economic releases for this period</p>
                        <small>Dates sourced directly from Federal Reserve</small>
                    </div>
                `;
                return;
            }

            // Group events by date
            const grouped = {};
            events.forEach(event => {
                const dateKey = event.date.toDateString();
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(event);
            });

            // Build HTML
            let html = '<div class="calendar-events">';

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            Object.keys(grouped).forEach(dateStr => {
                const date = new Date(dateStr);
                const isToday = date.toDateString() === today.toDateString();
                const isPast = date < today;

                html += `
                    <div class="calendar-date ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
                        <div class="date-header">
                            <span class="date-label">${this.formatDateLabel(date)}</span>
                            ${isToday ? '<span class="today-badge">TODAY</span>' : ''}
                        </div>
                `;

                grouped[dateStr].forEach(event => {
                    const dataValues = this.formatDataValues(event.seriesId, dashboardData);

                    html += `
                        <div class="calendar-item impact-${event.impact} ${event.isPast ? 'past' : ''}">
                            ${event.isPast ? '<span class="calendar-checkmark">✓</span>' : ''}
                            <div class="calendar-event">
                                <span class="calendar-time">${event.time}</span>
                                <span class="event-name">${event.name}</span>
                                <span class="calendar-impact ${event.impact}">${event.impact.toUpperCase()}</span>
                            </div>
                            ${dataValues}
                        </div>
                    `;
                });

                html += '</div>';
            });

            html += '</div>';

            // Add disclaimer
            html += `
                <div class="calendar-disclaimer">
                    <small>📅 Release dates from Federal Reserve Economic Data (FRED) API</small>
                </div>
            `;

            this.container.innerHTML = html;
            console.log('✅ Calendar rendered successfully with', events.length, 'events');

        } catch (error) {
            console.error('Error rendering calendar:', error);
            this.container.innerHTML = `
                <div class="calendar-error">
                    <p>Unable to load release calendar</p>
                    <small>Please check your connection and try again</small>
                </div>
            `;
        }
    }

    // Format date label
    formatDateLabel(date) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.CalendarService = CalendarService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarService;
}