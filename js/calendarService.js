// Economic Calendar Service - 30-day forward calendar with confirmed dates only
class CalendarService {
    constructor() {
        this.selectedPeriod = 'this-week';
        this.container = null;
        this.initialized = false;
        this.economicData = {};
        this.calendarEvents = [];
    }

    // Initialize the calendar
    async init(containerId) {
        console.log('Initializing calendar with container:', containerId);

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Calendar container not found:', containerId);
            return false;
        }

        this.initialized = true;
        this.setupPeriodSelector();
        await this.fetchCalendarData();
        this.render();
        return true;
    }

    // Fetch 30-day economic calendar from API
    async fetchCalendarData() {
        console.log('Fetching 30-day economic calendar...');

        try {
            // Fetch from our economic calendar API
            const response = await fetch('/api/economic-calendar');
            if (response.ok) {
                const data = await response.json();
                this.calendarEvents = data.events || [];
            } else {
                console.error('Failed to fetch calendar data:', response.status);
                // Fallback to manual calendar
                this.calendarEvents = this.generateFallbackCalendar();
            }
        } catch (error) {
            console.error('Error fetching calendar:', error);
            // Fallback to manual calendar
            this.calendarEvents = this.generateFallbackCalendar();
        }

        // Enhance with dashboard data
        await this.enhanceWithDashboardData();
        console.log('Calendar events loaded:', this.calendarEvents);
    }

    // Generate fallback calendar for next 30 days
    generateFallbackCalendar() {
        const events = [];
        const today = new Date();

        // Add confirmed FOMC dates for 2026
        const fomcDates = [
            '2026-01-28', '2026-03-17', '2026-05-05', '2026-06-16',
            '2026-07-28', '2026-09-15', '2026-11-03', '2026-12-15'
        ];

        fomcDates.forEach(dateStr => {
            const date = new Date(dateStr + 'T14:00:00');
            if (date > today && date <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
                events.push({
                    date: dateStr,
                    name: 'FOMC Rate Decision',
                    impact: 'high',
                    source: 'Federal Reserve',
                    confirmed: true,
                    time: '14:00'
                });
            }
        });

        // Add weekly jobless claims (confirmed pattern)
        for (let i = 1; i <= 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);

            if (checkDate.getDay() === 4) { // Thursday
                events.push({
                    date: checkDate.toISOString().split('T')[0],
                    name: 'Initial Jobless Claims',
                    impact: 'medium',
                    source: 'DOL',
                    confirmed: true,
                    time: '08:30'
                });
            }
        }

        return events;
    }

    // Enhance calendar events with dashboard data
    async enhanceWithDashboardData() {
        // Map of indicator names to dashboard selectors
        const indicatorMap = {
            'Consumer Price Index': { selector: '#cpi-chart', name: 'CPI' },
            'Producer Price Index': { selector: '#ppi-chart', name: 'PPI' },
            'Employment Situation': { selector: '#unemployment-chart', name: 'Jobs Report' },
            'Retail Sales': { selector: '#retail-chart', name: 'Retail Sales' },
            'Initial Jobless Claims': { selector: '#jobless-chart', name: 'Jobless Claims' },
            'GDP': { selector: '#gdp-chart', name: 'GDP' },
            'PCE Price Index': { selector: '#pce-chart', name: 'PCE' },
            'Durable Goods': { selector: '#durablegoods-chart', name: 'Durable Goods' },
            'New Home Sales': { selector: '#newhomes-chart', name: 'New Home Sales' },
            'Existing Home Sales': { selector: '#existinghomes-chart', name: 'Existing Home Sales' },
            'Consumer Sentiment': { selector: '#sentiment-chart', name: 'Consumer Sentiment' }
        };

        // Enhance each event with dashboard data
        this.calendarEvents.forEach(event => {
            const mapping = indicatorMap[event.name];
            if (mapping) {
                const card = document.querySelector(mapping.selector);
                if (card) {
                    // Get current value
                    const currentElement = card.querySelector('.metric-value');
                    if (currentElement) {
                        event.current = currentElement.textContent.trim();
                    }

                    // Get previous value from chart data
                    const chartCanvas = card.querySelector('canvas');
                    if (chartCanvas && window.Chart && window.Chart.getChart) {
                        const chart = window.Chart.getChart(chartCanvas);
                        if (chart && chart.data && chart.data.datasets[0]) {
                            const data = chart.data.datasets[0].data;
                            if (data && data.length >= 2) {
                                const prevValue = data[data.length - 2];
                                event.previous = this.formatValue(prevValue, mapping.name);
                            }
                        }
                    }

                    // Get observation date
                    const dateElement = card.querySelector('.observation-date');
                    if (dateElement) {
                        event.lastUpdate = new Date(dateElement.textContent);
                    }
                }
            }
        });
    }

    // Format value based on indicator type
    formatValue(value, indicatorName) {
        if (indicatorName === 'Jobs Report') {
            return value.toFixed(1) + '%';
        } else if (indicatorName.includes('Sales')) {
            return indicatorName === 'New Home Sales' ? value + 'K' : value + 'M';
        } else if (indicatorName === 'GDP' || indicatorName.includes('CPI') || indicatorName.includes('PCE') || indicatorName.includes('PPI')) {
            return value.toFixed(1) + '%';
        } else if (indicatorName === 'Jobless Claims') {
            return value + 'K';
        }
        return value.toString();
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

    // Refresh the calendar
    async refresh() {
        await this.fetchCalendarData();
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
                        <p>No confirmed economic events for this period</p>
                        <small>Showing only confirmed release dates within next 30 days</small>
                    </div>
                `;
                return;
            }

            // Group events by date
            const grouped = {};
            events.forEach(event => {
                const dateKey = event.date;
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
                    const hasData = event.current || event.previous;
                    const isConfirmed = event.confirmed;
                    const isReleased = event.lastUpdate && new Date(event.lastUpdate) >= date;

                    html += `
                        <div class="event-item impact-${event.impact} ${isReleased ? 'released' : ''} ${!isConfirmed ? 'estimated' : ''}">
                            <span class="event-time">${this.formatTime(event.time || '08:30')}</span>
                            <span class="event-name">
                                ${event.name}
                                ${!isConfirmed ? '<span class="est-badge">EST</span>' : ''}
                            </span>
                            ${hasData ? `
                                <span class="event-data">
                                    ${event.previous ? `Prev: ${event.previous}` : ''}
                                    ${event.current && isReleased ? ` | Actual: ${event.current}` : ''}
                                </span>
                            ` : ''}
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

            // Add disclaimer
            html += `
                <div class="calendar-disclaimer">
                    <small>📅 Confirmed dates from official sources. EST = Estimated based on patterns.</small>
                </div>
            `;

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

        // Calculate date ranges - limited to 30 days max
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

        // Filter calendar events for the selected period
        return this.calendarEvents
            .filter(event => {
                const eventDate = new Date(event.date);
                return eventDate >= startDate && eventDate <= endDate;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Format date label
    formatDateLabel(date) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    // Format time
    formatTime(timeStr) {
        if (!timeStr) return '8:30 AM ET';

        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

        return `${displayHour}:${minutes} ${ampm} ET`;
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