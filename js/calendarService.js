// Economic Calendar Service - Shows past and upcoming releases with data
class CalendarService {
    constructor() {
        this.selectedPeriod = 'this-week';
        this.container = null;
        this.initialized = false;
        this.economicData = {};
    }

    // Initialize the calendar
    init(containerId) {
        console.log('Initializing calendar with container:', containerId);

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Calendar container not found:', containerId);
            return false;
        }

        this.initialized = true;
        this.setupPeriodSelector();
        this.fetchLatestData();
        this.render();
        return true;
    }

    // Fetch latest economic data from dashboard
    fetchLatestData() {
        // Get data from existing cards on the page
        const dataMap = {
            'CPI': { selector: '#cpi-chart .metric-value', seriesId: 'coreCPI' },
            'PPI': { selector: '#ppi-chart .metric-value', seriesId: 'corePPI' },
            'PCE': { selector: '#pce-chart .metric-value', seriesId: 'corePCE' },
            'Jobs Report': { selector: '#unemployment-chart .metric-value', seriesId: 'unemployment' },
            'GDP': { selector: '#gdp-chart .metric-value', seriesId: 'gdp' },
            'Retail Sales': { selector: '#retail-chart .metric-value', seriesId: 'retailSales' },
            'Jobless Claims': { selector: '#jobless-chart .metric-value', seriesId: 'joblessClaims' },
            'Durable Goods': { selector: '#durablegoods-chart .metric-value', seriesId: 'durableGoods' },
            'New Home Sales': { selector: '#newhomes-chart .metric-value', seriesId: 'newHomeSales' },
            'Existing Home Sales': { selector: '#existinghomes-chart .metric-value', seriesId: 'existingHomeSales' },
            'Consumer Sentiment': { selector: '#sentiment-chart .metric-value', seriesId: 'consumerSentiment' }
        };

        for (const [name, config] of Object.entries(dataMap)) {
            const element = document.querySelector(config.selector);
            if (element) {
                this.economicData[name] = {
                    current: element.textContent,
                    previous: null // Would need historical data
                };
            }
        }
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
            btn.addEventListener('click', (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedPeriod = e.target.dataset.period;
                console.log('Period changed to:', this.selectedPeriod);
                this.render();
            });
        });
    }

    // Refresh the calendar (alias for render)
    refresh() {
        this.fetchLatestData();
        this.render();
    }

    // Render the calendar
    render() {
        if (!this.container || !this.initialized) {
            console.log('Cannot render - container not initialized');
            return;
        }

        console.log('Rendering calendar for period:', this.selectedPeriod);

        try {
            const events = this.getEventsForPeriod();

            if (!events || events.length === 0) {
                this.container.innerHTML = `
                    <div class="no-events">
                        <p>No economic events scheduled for this period</p>
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
                    <div class="event-date ${isPast ? 'past' : ''}">
                        <div class="date-header">
                            <span>${this.formatDateLabel(date)}</span>
                            ${isToday ? '<span class="today-badge">TODAY</span>' : ''}
                        </div>
                        <div class="date-events">
                `;

                grouped[dateStr].forEach(event => {
                    const dataValue = this.economicData[event.displayName] || {};
                    const hasData = event.isReleased && dataValue.current;

                    html += `
                        <div class="event-item impact-${event.impact} ${event.isReleased ? 'released' : ''}">
                            <span class="event-time">${event.time}</span>
                            <span class="event-name">${event.name}</span>
                            ${hasData ? `<span class="event-data">Actual: ${dataValue.current}</span>` : ''}
                            <span class="event-impact ${event.impact}">${event.impact.toUpperCase()}</span>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            this.container.innerHTML = html;
            console.log('Calendar rendered successfully with', events.length, 'events');

        } catch (error) {
            console.error('Error rendering calendar:', error);
            this.container.innerHTML = `
                <div class="no-events">
                    <p>Error loading calendar events</p>
                </div>
            `;
        }
    }

    // Get events for selected period
    getEventsForPeriod() {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday

        let startDate = new Date(today);
        let endDate = new Date(today);

        // For "today" and "this-week", include past events
        const includePast = this.selectedPeriod === 'today' || this.selectedPeriod === 'this-week';

        // Calculate date ranges
        switch(this.selectedPeriod) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;

            case 'this-week':
                // Start from Sunday of current week
                const daysToSubtract = currentDay;
                startDate.setDate(today.getDate() - daysToSubtract);
                startDate.setHours(0, 0, 0, 0);
                // End on Saturday
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;

            case 'next-week':
                // Start from next Sunday
                const daysToNextSunday = 7 - currentDay;
                startDate.setDate(today.getDate() + daysToNextSunday);
                startDate.setHours(0, 0, 0, 0);
                // End on next Saturday
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;

            case 'month-ahead':
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setDate(today.getDate() + 30);
                endDate.setHours(23, 59, 59, 999);
                break;
        }

        console.log('Date range:', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString());

        // Define all economic events for 2026 with indicator mapping
        const allEvents = [
            // Past releases (for demonstration)
            { date: new Date('2026-02-06T08:30:00'), name: 'Jobs Report (Jan)', displayName: 'Jobs Report', impact: 'high', seriesId: 'unemployment' },
            { date: new Date('2026-02-06T08:30:00'), name: 'Unemployment Rate (Jan)', displayName: 'Jobs Report', impact: 'high', seriesId: 'unemployment' },

            // This week (Feb 8-14, 2026)
            { date: new Date('2026-02-11T08:30:00'), name: 'CPI (Jan)', displayName: 'CPI', impact: 'high', seriesId: 'coreCPI' },
            { date: new Date('2026-02-12T08:30:00'), name: 'Initial Jobless Claims', displayName: 'Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-02-13T08:30:00'), name: 'PPI (Jan)', displayName: 'PPI', impact: 'medium', seriesId: 'corePPI' },
            { date: new Date('2026-02-13T10:00:00'), name: 'Consumer Sentiment (Prelim)', displayName: 'Consumer Sentiment', impact: 'low', seriesId: 'consumerSentiment' },

            // Next week
            { date: new Date('2026-02-17T08:30:00'), name: 'Retail Sales (Jan)', displayName: 'Retail Sales', impact: 'medium', seriesId: 'retailSales' },
            { date: new Date('2026-02-19T08:30:00'), name: 'Initial Jobless Claims', displayName: 'Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-02-20T10:00:00'), name: 'Existing Home Sales (Jan)', displayName: 'Existing Home Sales', impact: 'low', seriesId: 'existingHomeSales' },
            { date: new Date('2026-02-24T10:00:00'), name: 'New Home Sales (Jan)', displayName: 'New Home Sales', impact: 'low', seriesId: 'newHomeSales' },
            { date: new Date('2026-02-26T08:30:00'), name: 'Initial Jobless Claims', displayName: 'Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-02-26T08:30:00'), name: 'GDP Q4 2025 (2nd Est)', displayName: 'GDP', impact: 'high', seriesId: 'gdp' },
            { date: new Date('2026-02-26T08:30:00'), name: 'Durable Goods (Jan)', displayName: 'Durable Goods', impact: 'medium', seriesId: 'durableGoods' },
            { date: new Date('2026-02-27T08:30:00'), name: 'PCE Price Index (Jan)', displayName: 'PCE', impact: 'high', seriesId: 'corePCE' },
            { date: new Date('2026-02-27T10:00:00'), name: 'Consumer Sentiment (Final)', displayName: 'Consumer Sentiment', impact: 'low', seriesId: 'consumerSentiment' },

            // March 2026
            { date: new Date('2026-03-05T08:30:00'), name: 'Initial Jobless Claims', displayName: 'Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-03-06T08:30:00'), name: 'Jobs Report (Feb)', displayName: 'Jobs Report', impact: 'high', seriesId: 'unemployment' },
            { date: new Date('2026-03-10T08:30:00'), name: 'Trade Balance (Jan)', displayName: 'Trade Balance', impact: 'low', seriesId: 'tradeDeficit' },
            { date: new Date('2026-03-12T08:30:00'), name: 'CPI (Feb)', displayName: 'CPI', impact: 'high', seriesId: 'coreCPI' },
            { date: new Date('2026-03-12T08:30:00'), name: 'Initial Jobless Claims', displayName: 'Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-03-13T08:30:00'), name: 'PPI (Feb)', displayName: 'PPI', impact: 'medium', seriesId: 'corePPI' },
            { date: new Date('2026-03-17T08:30:00'), name: 'Retail Sales (Feb)', displayName: 'Retail Sales', impact: 'medium', seriesId: 'retailSales' },
            { date: new Date('2026-03-18T14:00:00'), name: 'FOMC Rate Decision', displayName: 'FOMC', impact: 'high', seriesId: 'fomc' },
            { date: new Date('2026-03-19T08:30:00'), name: 'Initial Jobless Claims', displayName: 'Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-03-20T10:00:00'), name: 'Existing Home Sales (Feb)', displayName: 'Existing Home Sales', impact: 'low', seriesId: 'existingHomeSales' },
            { date: new Date('2026-03-24T10:00:00'), name: 'New Home Sales (Feb)', displayName: 'New Home Sales', impact: 'low', seriesId: 'newHomeSales' },
            { date: new Date('2026-03-26T08:30:00'), name: 'Initial Jobless Claims', displayName: 'Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-03-26T08:30:00'), name: 'GDP Q4 2025 (Final)', displayName: 'GDP', impact: 'medium', seriesId: 'gdp' },
            { date: new Date('2026-03-27T08:30:00'), name: 'PCE Price Index (Feb)', displayName: 'PCE', impact: 'high', seriesId: 'corePCE' }
        ];

        // Filter events for the selected period
        const filteredEvents = allEvents.filter(event =>
            event.date >= startDate && event.date <= endDate
        );

        // Add formatted time and check if released
        const currentTime = new Date();
        return filteredEvents.map(event => ({
            ...event,
            time: this.formatTime(event.date),
            isReleased: event.date < currentTime
        })).sort((a, b) => a.date - b.date);
    }

    // Format date label
    formatDateLabel(date) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    // Format time
    formatTime(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;

        return `${hours}:${minutes} ${ampm} ET`;
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