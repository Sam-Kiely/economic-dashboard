// Economic Calendar Service - Uses real FRED data and release dates
class CalendarService {
    constructor() {
        this.selectedPeriod = 'this-week';
        this.container = null;
        this.initialized = false;
        this.economicData = {};
        this.releaseSchedule = [];
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
        await this.fetchReleaseSchedule();
        this.render();
        return true;
    }

    // Fetch release schedule and data from FRED
    async fetchReleaseSchedule() {
        console.log('Fetching release schedule from dashboard data...');

        // Map of indicators to their FRED series and display info
        const indicators = [
            { seriesId: 'coreCPI', name: 'CPI', fullName: 'Consumer Price Index', impact: 'high', selector: '#cpi-chart' },
            { seriesId: 'corePPI', name: 'PPI', fullName: 'Producer Price Index', impact: 'medium', selector: '#ppi-chart' },
            { seriesId: 'corePCE', name: 'PCE', fullName: 'PCE Price Index', impact: 'high', selector: '#pce-chart' },
            { seriesId: 'unemployment', name: 'Jobs Report', fullName: 'Unemployment Rate', impact: 'high', selector: '#unemployment-chart' },
            { seriesId: 'gdp', name: 'GDP', fullName: 'GDP Growth Rate', impact: 'high', selector: '#gdp-chart' },
            { seriesId: 'retailSales', name: 'Retail Sales', fullName: 'Retail Sales', impact: 'medium', selector: '#retail-chart' },
            { seriesId: 'joblessClaims', name: 'Jobless Claims', fullName: 'Initial Jobless Claims', impact: 'medium', selector: '#jobless-chart' },
            { seriesId: 'durableGoods', name: 'Durable Goods', fullName: 'Durable Goods Orders', impact: 'medium', selector: '#durablegoods-chart' },
            { seriesId: 'newHomeSales', name: 'New Home Sales', fullName: 'New Home Sales', impact: 'low', selector: '#newhomes-chart' },
            { seriesId: 'existingHomeSales', name: 'Existing Home Sales', fullName: 'Existing Home Sales', impact: 'low', selector: '#existinghomes-chart' },
            { seriesId: 'consumerSentiment', name: 'Consumer Sentiment', fullName: 'Consumer Sentiment', impact: 'low', selector: '#sentiment-chart' },
            { seriesId: 'tradeDeficit', name: 'Trade Balance', fullName: 'Trade Balance', impact: 'low', selector: '#tradedeficit-chart' }
        ];

        this.releaseSchedule = [];

        // Fetch data from existing dashboard cards
        for (const indicator of indicators) {
            try {
                // Get current and previous values from chart card
                const card = document.querySelector(indicator.selector);
                if (card) {
                    // Get current value
                    const currentElement = card.querySelector('.metric-value');
                    const current = currentElement ? currentElement.textContent.trim() : null;

                    // Get observation date from card data
                    const dateElement = card.querySelector('.observation-date');
                    let lastDate = null;
                    if (dateElement) {
                        lastDate = new Date(dateElement.textContent);
                    }

                    // Try to get chart data for previous value
                    let previous = null;
                    const chartCanvas = card.querySelector('canvas');
                    if (chartCanvas && window.Chart && window.Chart.getChart) {
                        const chart = window.Chart.getChart(chartCanvas);
                        if (chart && chart.data && chart.data.datasets[0]) {
                            const data = chart.data.datasets[0].data;
                            if (data && data.length >= 2) {
                                // Get second to last value as previous
                                const prevValue = data[data.length - 2];
                                if (indicator.name === 'Jobs Report') {
                                    previous = prevValue + '%';
                                } else if (indicator.name.includes('Sales')) {
                                    previous = prevValue + (indicator.name === 'New Home Sales' ? 'K' : 'M');
                                } else if (indicator.name === 'GDP' || indicator.name.includes('CPI') || indicator.name.includes('PCE') || indicator.name.includes('PPI')) {
                                    previous = prevValue.toFixed(1) + '%';
                                } else if (indicator.name === 'Jobless Claims') {
                                    previous = prevValue + 'K';
                                } else {
                                    previous = prevValue.toString();
                                }
                            }
                        }
                    }

                    // Estimate next release date based on typical patterns
                    const nextRelease = this.estimateNextRelease(indicator.seriesId, lastDate);

                    if (nextRelease) {
                        this.releaseSchedule.push({
                            seriesId: indicator.seriesId,
                            name: indicator.fullName,
                            shortName: indicator.name,
                            impact: indicator.impact,
                            current: current,
                            previous: previous,
                            nextRelease: nextRelease,
                            lastUpdate: lastDate
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching data for ${indicator.name}:`, error);
            }
        }

        // Add weekly jobless claims (every Thursday)
        const today = new Date();
        for (let i = 0; i < 5; i++) {
            const thursday = new Date(today);
            thursday.setDate(today.getDate() + ((4 - today.getDay() + 7) % 7) + (i * 7));
            thursday.setHours(8, 30, 0, 0);

            const existingClaim = this.releaseSchedule.find(r =>
                r.seriesId === 'joblessClaims' &&
                r.nextRelease.toDateString() === thursday.toDateString()
            );

            if (!existingClaim && thursday > today) {
                const joblessCard = document.querySelector('#jobless-chart');
                const current = joblessCard?.querySelector('.metric-value')?.textContent || null;

                this.releaseSchedule.push({
                    seriesId: 'joblessClaims',
                    name: 'Initial Jobless Claims',
                    shortName: 'Jobless Claims',
                    impact: 'medium',
                    current: current,
                    previous: null,
                    nextRelease: thursday,
                    lastUpdate: null
                });
            }
        }

        console.log('Release schedule:', this.releaseSchedule);
    }

    // Estimate next release date based on series and last date
    estimateNextRelease(seriesId, lastDate) {
        const today = new Date();
        const schedules = {
            'coreCPI': { day: 10, hour: 8, minute: 30 }, // Around 10th of month
            'corePPI': { day: 13, hour: 8, minute: 30 }, // Around 13th of month
            'corePCE': { day: -1, hour: 8, minute: 30 }, // Last business day of month
            'unemployment': { dayOfWeek: 5, week: 1, hour: 8, minute: 30 }, // First Friday
            'gdp': { quarter: true, delay: 30, hour: 8, minute: 30 }, // ~30 days after quarter end
            'retailSales': { day: 15, hour: 8, minute: 30 }, // Around 15th
            'durableGoods': { day: 26, hour: 8, minute: 30 }, // Around 26th
            'newHomeSales': { day: 25, hour: 10, minute: 0 }, // Around 25th
            'existingHomeSales': { day: 20, hour: 10, minute: 0 }, // Around 20th
            'consumerSentiment': { day: 10, hour: 10, minute: 0 }, // Prelim 10th
            'tradeDeficit': { day: 7, hour: 8, minute: 30 } // Around 7th
        };

        const schedule = schedules[seriesId];
        if (!schedule) return null;

        let nextDate = new Date(today);

        if (schedule.quarter) {
            // Quarterly data - next release ~30 days after quarter end
            const currentQuarter = Math.floor(today.getMonth() / 3);
            const quarterEndMonth = (currentQuarter + 1) * 3 - 1;
            nextDate = new Date(today.getFullYear(), quarterEndMonth + 1, schedule.delay);
        } else if (schedule.dayOfWeek !== undefined) {
            // Weekly pattern (e.g., first Friday for jobs)
            const targetMonth = lastDate ? new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1) : today;
            nextDate = this.getNthWeekday(targetMonth, schedule.week, schedule.dayOfWeek);
        } else if (schedule.day === -1) {
            // Last business day of month
            const targetMonth = lastDate ? lastDate.getMonth() + 1 : today.getMonth() + 1;
            const targetYear = lastDate ? lastDate.getFullYear() : today.getFullYear();
            nextDate = new Date(targetYear, targetMonth + 1, 0); // Last day of month
            while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
                nextDate.setDate(nextDate.getDate() - 1);
            }
        } else {
            // Monthly on specific day
            const targetMonth = lastDate ? lastDate.getMonth() + 1 : today.getMonth() + 1;
            const targetYear = lastDate ? lastDate.getFullYear() : today.getFullYear();
            nextDate = new Date(targetYear, targetMonth, schedule.day);
        }

        nextDate.setHours(schedule.hour || 8, schedule.minute || 30, 0, 0);

        // If the estimated date is in the past, move to next month
        if (nextDate <= today) {
            if (schedule.quarter) {
                nextDate.setMonth(nextDate.getMonth() + 3);
            } else if (schedule.dayOfWeek !== undefined) {
                const nextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 1);
                nextDate = this.getNthWeekday(nextMonth, schedule.week, schedule.dayOfWeek);
            } else {
                nextDate.setMonth(nextDate.getMonth() + 1);
            }
        }

        return nextDate;
    }

    // Get nth weekday of month (e.g., first Friday)
    getNthWeekday(date, n, dayOfWeek) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstWeekday = firstDay.getDay();
        const offset = (dayOfWeek - firstWeekday + 7) % 7;
        const targetDate = new Date(firstDay);
        targetDate.setDate(1 + offset + (n - 1) * 7);
        return targetDate;
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
        await this.fetchReleaseSchedule();
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
                    const hasData = event.current || event.previous;

                    html += `
                        <div class="event-item impact-${event.impact} ${event.isReleased ? 'released' : ''}">
                            <span class="event-time">${event.time}</span>
                            <span class="event-name">${event.name}</span>
                            ${hasData ? `
                                <span class="event-data">
                                    ${event.previous ? `Prev: ${event.previous}` : ''}
                                    ${event.current && event.isReleased ? ` | Actual: ${event.current}` : ''}
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

        // Filter release schedule for the selected period
        const events = this.releaseSchedule
            .filter(release => {
                if (!release.nextRelease) return false;
                return release.nextRelease >= startDate && release.nextRelease <= endDate;
            })
            .map(release => ({
                date: release.nextRelease,
                name: release.name,
                shortName: release.shortName,
                impact: release.impact,
                current: release.current,
                previous: release.previous,
                time: this.formatTime(release.nextRelease),
                isReleased: release.lastUpdate && release.lastUpdate >= startDate
            }));

        // Sort by date
        return events.sort((a, b) => a.date - b.date);
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