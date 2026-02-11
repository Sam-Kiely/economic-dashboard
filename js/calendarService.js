// Economic Calendar Service - Handles economic event scheduling
class CalendarService {
    constructor() {
        this.selectedPeriod = 'this-week';
        this.container = null;
    }

    // Initialize the calendar
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Calendar container not found:', containerId);
            return;
        }

        this.setupPeriodSelector();
        this.render();
    }

    // Setup period selector
    setupPeriodSelector() {
        const selector = document.querySelector('.period-selector');
        if (!selector) return;

        // Add click handlers to period buttons
        const buttons = selector.querySelectorAll('.period-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                buttons.forEach(b => b.classList.remove('active'));
                // Add active to clicked button
                e.target.classList.add('active');
                // Update selected period and re-render
                this.selectedPeriod = e.target.dataset.period;
                this.render();
            });
        });
    }

    // Render the calendar
    render() {
        if (!this.container) return;

        const events = this.generateEvents();

        if (events.length === 0) {
            this.container.innerHTML = `
                <div class="no-events">
                    <p>No economic events scheduled for this period</p>
                </div>
            `;
            return;
        }

        // Group events by date
        const groupedEvents = this.groupEventsByDate(events);

        // Generate HTML
        let html = '<div class="calendar-events">';

        for (const [dateStr, dateEvents] of Object.entries(groupedEvents)) {
            const date = new Date(dateStr);
            const isToday = this.isToday(date);
            const isPast = date < new Date();

            html += `
                <div class="event-date ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
                    <div class="date-header">
                        <span class="date-label">${this.formatDateLabel(date)}</span>
                        ${isToday ? '<span class="today-badge">TODAY</span>' : ''}
                    </div>
                    <div class="date-events">
            `;

            dateEvents.forEach(event => {
                html += `
                    <div class="event-item impact-${event.impact}">
                        <span class="event-time">${event.time}</span>
                        <span class="event-name">${event.name}</span>
                        <span class="event-impact ${event.impact}">${event.impact.toUpperCase()}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        html += '</div>';
        this.container.innerHTML = html;
    }

    // Generate economic events for the selected period
    generateEvents() {
        const events = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate period boundaries
        let periodStart = new Date(today);
        let periodEnd = new Date(today);

        switch(this.selectedPeriod) {
            case 'today':
                periodEnd.setHours(23, 59, 59, 999);
                break;
            case 'this-week':
                // Current week Sunday to Saturday
                periodStart.setDate(today.getDate() - today.getDay());
                periodStart.setHours(0, 0, 0, 0);
                periodEnd.setDate(periodStart.getDate() + 6);
                periodEnd.setHours(23, 59, 59, 999);
                break;
            case 'next-week':
                // Next week Sunday to Saturday
                periodStart.setDate(today.getDate() - today.getDay() + 7);
                periodStart.setHours(0, 0, 0, 0);
                periodEnd.setDate(periodStart.getDate() + 6);
                periodEnd.setHours(23, 59, 59, 999);
                break;
            case 'month-ahead':
                // Next 30 days
                periodEnd.setDate(today.getDate() + 30);
                periodEnd.setHours(23, 59, 59, 999);
                break;
        }

        console.log(`Calendar Period: ${this.selectedPeriod}`, {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString()
        });

        // Define 2026 economic releases with accurate dates
        const economicReleases = [
            // February 2026
            { date: new Date('2026-02-05T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-02-06T08:30:00'), name: 'Jobs Report (Jan)', impact: 'high', seriesId: 'unemployment' },
            { date: new Date('2026-02-06T08:30:00'), name: 'Unemployment Rate (Jan)', impact: 'high', seriesId: 'unemployment' },
            { date: new Date('2026-02-11T08:30:00'), name: 'CPI (Jan)', impact: 'high', seriesId: 'coreCPI' },
            { date: new Date('2026-02-12T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-02-13T08:30:00'), name: 'PPI (Jan)', impact: 'medium', seriesId: 'corePPI' },
            { date: new Date('2026-02-13T10:00:00'), name: 'Consumer Sentiment (Prelim)', impact: 'low', seriesId: 'consumerSentiment' },
            { date: new Date('2026-02-17T08:30:00'), name: 'Retail Sales (Jan)', impact: 'medium', seriesId: 'retailSales' },
            { date: new Date('2026-02-19T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-02-20T10:00:00'), name: 'Existing Home Sales (Jan)', impact: 'low', seriesId: 'existingHomeSales' },
            { date: new Date('2026-02-24T10:00:00'), name: 'New Home Sales (Jan)', impact: 'low', seriesId: 'newHomeSales' },
            { date: new Date('2026-02-26T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-02-26T08:30:00'), name: 'GDP Q4 2025 (2nd Est)', impact: 'high', seriesId: 'gdp' },
            { date: new Date('2026-02-26T08:30:00'), name: 'Durable Goods (Jan)', impact: 'medium', seriesId: 'durableGoods' },
            { date: new Date('2026-02-27T08:30:00'), name: 'PCE Price Index (Jan)', impact: 'high', seriesId: 'corePCE' },
            { date: new Date('2026-02-27T10:00:00'), name: 'Consumer Sentiment (Final)', impact: 'low', seriesId: 'consumerSentiment' },

            // March 2026
            { date: new Date('2026-03-05T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-03-06T08:30:00'), name: 'Jobs Report (Feb)', impact: 'high', seriesId: 'unemployment' },
            { date: new Date('2026-03-06T08:30:00'), name: 'Unemployment Rate (Feb)', impact: 'high', seriesId: 'unemployment' },
            { date: new Date('2026-03-10T08:30:00'), name: 'Trade Balance (Jan)', impact: 'low', seriesId: 'tradeDeficit' },
            { date: new Date('2026-03-12T08:30:00'), name: 'CPI (Feb)', impact: 'high', seriesId: 'coreCPI' },
            { date: new Date('2026-03-12T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-03-13T08:30:00'), name: 'PPI (Feb)', impact: 'medium', seriesId: 'corePPI' },
            { date: new Date('2026-03-13T10:00:00'), name: 'Consumer Sentiment (Prelim)', impact: 'low', seriesId: 'consumerSentiment' },
            { date: new Date('2026-03-17T08:30:00'), name: 'Retail Sales (Feb)', impact: 'medium', seriesId: 'retailSales' },
            { date: new Date('2026-03-18T14:00:00'), name: 'FOMC Rate Decision', impact: 'high', seriesId: 'fomc' },
            { date: new Date('2026-03-19T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-03-20T10:00:00'), name: 'Existing Home Sales (Feb)', impact: 'low', seriesId: 'existingHomeSales' },
            { date: new Date('2026-03-24T10:00:00'), name: 'New Home Sales (Feb)', impact: 'low', seriesId: 'newHomeSales' },
            { date: new Date('2026-03-26T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-03-26T08:30:00'), name: 'GDP Q4 2025 (Final)', impact: 'medium', seriesId: 'gdp' },
            { date: new Date('2026-03-26T08:30:00'), name: 'Durable Goods (Feb)', impact: 'medium', seriesId: 'durableGoods' },
            { date: new Date('2026-03-27T08:30:00'), name: 'PCE Price Index (Feb)', impact: 'high', seriesId: 'corePCE' },
            { date: new Date('2026-03-27T10:00:00'), name: 'Consumer Sentiment (Final)', impact: 'low', seriesId: 'consumerSentiment' },

            // April 2026 (preview)
            { date: new Date('2026-04-02T08:30:00'), name: 'Initial Jobless Claims', impact: 'medium', seriesId: 'joblessClaims' },
            { date: new Date('2026-04-03T08:30:00'), name: 'Jobs Report (Mar)', impact: 'high', seriesId: 'unemployment' }
        ];

        // FOMC Meetings for 2026 (8 meetings per year)
        const fomcMeetings = [
            { date: new Date('2026-01-28T14:00:00'), name: 'FOMC Rate Decision' },
            { date: new Date('2026-03-18T14:00:00'), name: 'FOMC Rate Decision' },
            { date: new Date('2026-05-06T14:00:00'), name: 'FOMC Rate Decision' },
            { date: new Date('2026-06-17T14:00:00'), name: 'FOMC Rate Decision' },
            { date: new Date('2026-07-29T14:00:00'), name: 'FOMC Rate Decision' },
            { date: new Date('2026-09-16T14:00:00'), name: 'FOMC Rate Decision' },
            { date: new Date('2026-11-04T14:00:00'), name: 'FOMC Rate Decision' },
            { date: new Date('2026-12-16T14:00:00'), name: 'FOMC Rate Decision' }
        ];

        // Filter events within the period
        economicReleases.forEach(release => {
            if (release.date >= periodStart && release.date <= periodEnd) {
                events.push({
                    date: release.date,
                    name: release.name,
                    impact: release.impact,
                    seriesId: release.seriesId,
                    time: this.formatTime(release.date),
                    isPast: release.date < today
                });
            }
        });

        // Add FOMC meetings that aren't already in economic releases
        fomcMeetings.forEach(meeting => {
            if (meeting.date >= periodStart && meeting.date <= periodEnd) {
                // Check if not already added
                const exists = events.some(e =>
                    e.date.getTime() === meeting.date.getTime() &&
                    e.name.includes('FOMC')
                );

                if (!exists) {
                    events.push({
                        date: meeting.date,
                        name: meeting.name,
                        impact: 'high',
                        seriesId: 'fomc',
                        time: this.formatTime(meeting.date),
                        isPast: meeting.date < today
                    });
                }
            }
        });

        // Sort by date
        events.sort((a, b) => a.date - b.date);

        console.log(`Generated ${events.length} events for ${this.selectedPeriod}`);
        return events;
    }

    // Group events by date
    groupEventsByDate(events) {
        const grouped = {};

        events.forEach(event => {
            const dateKey = event.date.toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(event);
        });

        return grouped;
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

    // Check if date is today
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    // Get indicator name
    getIndicatorName(seriesId) {
        const names = {
            coreCPI: 'CPI',
            corePPI: 'PPI',
            corePCE: 'PCE Price Index',
            gdp: 'GDP',
            tradeDeficit: 'Trade Balance',
            unemployment: 'Jobs Report',
            joblessClaims: 'Initial Jobless Claims',
            retailSales: 'Retail Sales',
            durableGoods: 'Durable Goods',
            newHomeSales: 'New Home Sales',
            existingHomeSales: 'Existing Home Sales',
            consumerSentiment: 'Consumer Sentiment',
            fomc: 'FOMC Meeting'
        };
        return names[seriesId] || seriesId;
    }

    // Get impact level
    getImpactLevel(seriesId) {
        const highImpact = ['coreCPI', 'corePCE', 'gdp', 'unemployment', 'fomc'];
        const mediumImpact = ['corePPI', 'retailSales', 'durableGoods', 'joblessClaims'];

        if (highImpact.includes(seriesId)) return 'high';
        if (mediumImpact.includes(seriesId)) return 'medium';
        return 'low';
    }
}

// Initialize calendar service
const calendarService = new CalendarService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarService;
}