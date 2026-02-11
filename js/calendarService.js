// Calendar Service for Economic Dashboard - FIXED WITH REAL DATA
class CalendarService {
    constructor() {
        this.selectedPeriod = 'this-week';
        this.currentData = {}; // Store current values for each indicator
        this.initialized = false;
    }

    init() {
        console.log('🔄 Calendar service: Initializing calendar service...');
        
        // Check for chart data availability every 500ms
        const chartDataCheck = setInterval(() => {
            console.log('🔍 Calendar service: Checking for chart data availability...');
            
            // Check if core CPI chart exists and has data
            const coreChart = document.getElementById('corecpi-chart');
            if (coreChart && coreChart.chart && coreChart.chart.data && 
                coreChart.chart.data.datasets && coreChart.chart.data.datasets[0] && 
                coreChart.chart.data.datasets[0].data && coreChart.chart.data.datasets[0].data.length > 0) {
                
                console.log('✅ Calendar service: Chart data detected, initializing calendar...');
                
                // Chart data exists, now initialize calendar
                this.loadCurrentData();
                this.renderCalendar();
                this.attachEventListeners();
                this.initialized = true;
                
                // Clear the interval since we're done
                clearInterval(chartDataCheck);
                
                console.log('✅ Calendar service: Successfully initialized with chart data');
                
            } else {
                console.log('⏳ Calendar service: Waiting for chart data...');
            }
        }, 500);
        
        // Fallback: clear interval after 30 seconds to prevent infinite checking
        setTimeout(() => {
            clearInterval(chartDataCheck);
            if (!this.initialized) {
                console.log('⚠️  Calendar service: Timeout reached, initializing without chart data');
                this.loadCurrentData();
                this.renderCalendar();
                this.attachEventListeners();
                this.initialized = true;
            }
        }, 30000);
        
        // Auto-refresh every hour
        setInterval(() => {
            if (this.initialized) {
                this.loadCurrentData();
                this.renderCalendar();
            }
        }, 3600000);
    }

    // Attach event listeners for time period selection
    attachEventListeners() {
        console.log('🔗 Calendar service: Attaching event listeners...');
        const timeOptions = document.querySelectorAll('.time-option');
        timeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                // Remove active class from all options
                timeOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                e.target.classList.add('active');
                // Update selected period and re-render
                this.selectedPeriod = e.target.dataset.period;
                this.renderCalendar();
            });
        });
    }

    // FIXED: Load actual current values from the dashboard data with retry mechanism
    loadCurrentData(retryCount = 0) {
        console.log(`Loading current data for calendar... (attempt ${retryCount + 1})`);
        
        // Initialize with empty data
        this.currentData = {};
        
        // Pull data directly from chart elements
        const indicators = [
            { chartId: 'corecpi-chart', metricId: 'coreCPI', format: 'percent', label: 'Core CPI YoY' },
            { chartId: 'coreppi-chart', metricId: 'corePPI', format: 'percent', label: 'Core PPI YoY' },
            { chartId: 'corepce-chart', metricId: 'corePCE', format: 'percent', label: 'Core PCE YoY' },
            { chartId: 'gdp-chart', metricId: 'gdp', format: 'percent', label: 'GDP QoQ' },
            { chartId: 'trade-chart', metricId: 'tradeDeficit', format: 'billions', label: 'Trade Balance' },
            { chartId: 'unemployment-chart', metricId: 'unemployment', format: 'percent', label: 'Unemployment' },
            { chartId: 'jobless-chart', metricId: 'joblessClaims', format: 'thousands', label: 'Jobless Claims' },
            { chartId: 'retail-chart', metricId: 'retailSales', format: 'percent', label: 'Retail Sales MoM' },
            { chartId: 'durablegoods-chart', metricId: 'durableGoods', format: 'percent', label: 'Durable Goods MoM' },
            { chartId: 'newhomes-chart', metricId: 'newHomeSales', format: 'thousands', label: 'New Home Sales' },
            { chartId: 'existinghomes-chart', metricId: 'existingHomeSales', format: 'millions', label: 'Existing Home Sales' },
            { chartId: 'sentiment-chart', metricId: 'consumerSentiment', format: 'index', label: 'Consumer Sentiment' },
            { chartId: 'fedfunds-chart', metricId: 'fomc', format: 'percent', label: 'Fed Funds Rate' }
        ];
        
        // Check how many charts have valid data
        let chartsWithData = 0;
        let totalCharts = indicators.length;
        
        indicators.forEach(indicator => {
            const chartElement = document.getElementById(indicator.chartId);
            if (chartElement && chartElement.chart) {
                const chart = chartElement.chart;
                const data = chart.data.datasets[0].data;
                const labels = chart.data.labels;
                
                if (data && data.length >= 2) {
                    chartsWithData++;
                    
                    const current = data[data.length - 1];
                    const previous = data[data.length - 2];
                    
                    // Format the values based on type
                    let currentFormatted, previousFormatted;
                    
                    switch(indicator.format) {
                        case 'percent':
                            currentFormatted = typeof current === 'number' ? current.toFixed(1) + '%' : '--';
                            previousFormatted = typeof previous === 'number' ? previous.toFixed(1) + '%' : '--';
                            break;
                        case 'thousands':
                            currentFormatted = typeof current === 'number' ? Math.round(current) + 'K' : '--';
                            previousFormatted = typeof previous === 'number' ? Math.round(previous) + 'K' : '--';
                            break;
                        case 'millions':
                            currentFormatted = typeof current === 'number' ? current.toFixed(1) + 'M' : '--';
                            previousFormatted = typeof previous === 'number' ? previous.toFixed(1) + 'M' : '--';
                            break;
                        case 'billions':
                            currentFormatted = typeof current === 'number' ? current.toFixed(1) + 'B' : '--';
                            previousFormatted = typeof previous === 'number' ? previous.toFixed(1) + 'B' : '--';
                            break;
                        case 'index':
                            currentFormatted = typeof current === 'number' ? current.toFixed(1) : '--';
                            previousFormatted = typeof previous === 'number' ? previous.toFixed(1) : '--';
                            break;
                        default:
                            currentFormatted = typeof current === 'number' ? current.toFixed(2) : '--';
                            previousFormatted = typeof previous === 'number' ? previous.toFixed(2) : '--';
                    }
                    
                    this.currentData[indicator.metricId] = {
                        current: currentFormatted,
                        previous: previousFormatted,
                        consensus: 'N/A', // We don't have consensus data
                        actualValue: current,
                        previousValue: previous,
                        lastDate: labels[labels.length - 1] || 'N/A'
                    };
                    
                    console.log(`✅ Updated ${indicator.label}: Current=${currentFormatted}, Previous=${previousFormatted}`);
                } else {
                    // No data available yet
                    this.currentData[indicator.metricId] = {
                        current: '--',
                        previous: '--',
                        consensus: 'N/A'
                    };
                }
            } else {
                // Chart not initialized yet
                this.currentData[indicator.metricId] = {
                    current: '--',
                    previous: '--',
                    consensus: 'N/A'
                };
            }
        });
        
        // Check if we have enough chart data to proceed
        const dataPercentage = (chartsWithData / totalCharts) * 100;
        console.log(`📊 Calendar data loading: ${chartsWithData}/${totalCharts} charts ready (${dataPercentage.toFixed(1)}%)`);
        
        // If less than 30% of charts have data and we haven't exceeded retry limit, retry
        if (dataPercentage < 30 && retryCount < 10) {
            console.log(`⏳ Not enough chart data available, retrying in 500ms... (attempt ${retryCount + 1}/10)`);
            setTimeout(() => {
                this.loadCurrentData(retryCount + 1);
            }, 500);
            return false; // Indicate retry in progress
        }
        
        if (dataPercentage >= 30) {
            console.log(`✅ Calendar data loaded successfully with ${chartsWithData} charts`);
        } else {
            console.log(`⚠️  Calendar proceeding with limited data after ${retryCount + 1} attempts`);
        }
        
        console.log('Current data loaded:', this.currentData);
    }

    // Calculate next release dates based on FRED schedule
    calculateUpcomingReleases() {
        const events = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        // Calculate the period boundaries based on selection
        let periodStart = new Date(today);
        let periodEnd = new Date(today);
        
        switch(this.selectedPeriod) {
            case 'today':
                // Just today
                periodEnd.setHours(23, 59, 59, 999);
                break;
            case 'this-week':
                // From 3 days ago to end of this week (to show recent releases)
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - 3); // Include last 3 days
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(today);
                endOfWeek.setDate(today.getDate() - today.getDay() + 6); // End of week (Saturday)
                endOfWeek.setHours(23, 59, 59, 999);

                periodStart = startOfWeek;
                periodEnd = endOfWeek;
                break;
            case 'next-week':
                // From start of next week to end of next week
                periodStart.setDate(today.getDate() + (7 - today.getDay())); // Next Sunday
                periodEnd = new Date(periodStart);
                periodEnd.setDate(periodStart.getDate() + 6); // Next Saturday
                periodEnd.setHours(23, 59, 59, 999);
                break;
            case 'month-ahead':
                // Show next 4 weeks from today
                periodStart = new Date(today);
                periodStart.setHours(0, 0, 0, 0);
                periodEnd = new Date(today);
                periodEnd.setDate(today.getDate() + 28); // 4 weeks = 28 days
                periodEnd.setHours(23, 59, 59, 999);
                break;
        }
        
        console.log(`Period: ${this.selectedPeriod}, Start: ${periodStart}, End: ${periodEnd}`);
        
        // Get release schedules from config
        const schedules = API_CONFIG.RELEASE_SCHEDULES;
        
        // Process monthly releases
        for (const [seriesId, schedule] of Object.entries(schedules)) {
            if (schedule.day && !schedule.daily && !schedule.weekly) {
                // Check current and next two months for monthly releases
                for (let monthOffset = -1; monthOffset <= 2; monthOffset++) {
                    // Create a fresh date for each iteration to avoid date overflow issues
                    const baseDate = new Date();
                    let releaseDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
                    
                    if (seriesId === 'unemployment') {
                        // First Friday of the month
                        releaseDate.setDate(1);
                        while (releaseDate.getDay() !== 5) {
                            releaseDate.setDate(releaseDate.getDate() + 1);
                        }
                        releaseDate.setHours(8, 30, 0, 0);
                    } else if (seriesId === 'corePCE') {
                        // Last business day of month
                        releaseDate.setMonth(releaseDate.getMonth() + 1, 0);
                        while (releaseDate.getDay() === 0 || releaseDate.getDay() === 6) {
                            releaseDate.setDate(releaseDate.getDate() - 1);
                        }
                        releaseDate.setHours(8, 30, 0, 0);
                    } else {
                        releaseDate.setDate(schedule.day);
                        releaseDate.setHours(8, 30, 0, 0);
                        
                        if (seriesId === 'consumerSentiment') {
                            releaseDate.setHours(10, 0, 0, 0);
                        }
                    }
                    
                    // Add if it falls within the selected period
                    if (releaseDate >= periodStart && releaseDate <= periodEnd) {
                        events.push({
                            date: releaseDate,
                            name: this.getIndicatorName(seriesId),
                            impact: this.getImpactLevel(seriesId),
                            seriesId: seriesId,
                            time: this.formatTime(releaseDate),
                            isPast: releaseDate < today
                        });
                    }
                }
            }
        }
        
        // Add weekly jobless claims for all Thursdays in the period
        // Calculate all Thursdays within the period
        let checkDate = new Date(periodStart);
        while (checkDate <= periodEnd) {
            if (checkDate.getDay() === 4) { // Thursday
                const thursday = new Date(checkDate);
                thursday.setHours(8, 30, 0, 0);
                
                events.push({
                    date: thursday,
                    name: 'Initial Jobless Claims',
                    impact: 'medium',
                    seriesId: 'joblessClaims',
                    time: '8:30 AM ET',
                    isPast: thursday < today
                });
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
        
        // Add FOMC meetings for 2026
        const fomcDates = [
            new Date('2026-01-28'), // January FOMC
            new Date('2026-03-18'), // March FOMC
            new Date('2026-05-06'), // May FOMC
            new Date('2026-06-17'), // June FOMC
            new Date('2026-07-29'), // July FOMC
            new Date('2026-09-16'), // September FOMC
            new Date('2026-11-04'), // November FOMC
            new Date('2026-12-16')  // December FOMC
        ];
        
        fomcDates.forEach(date => {
            date.setHours(14, 0, 0, 0); // 2:00 PM ET
            if (date >= periodStart && date <= periodEnd) {
                events.push({
                    date: date,
                    name: 'FOMC Rate Decision',
                    impact: 'high',
                    seriesId: 'fomc',
                    time: '2:00 PM ET',
                    isPast: date < today
                });
            }
        });
        
        // Sort events by date
        events.sort((a, b) => a.date - b.date);
        
        console.log(`Found ${events.length} events for ${this.selectedPeriod}`);
        return events;
    }

    getIndicatorName(seriesId) {
        const names = {
            'coreCPI': 'Core CPI',
            'corePPI': 'Core PPI',
            'corePCE': 'Core PCE',
            'gdp': 'GDP (Quarterly)',
            'unemployment': 'Employment Report',
            'joblessClaims': 'Initial Jobless Claims',
            'retailSales': 'Retail Sales',
            'durableGoods': 'Durable Goods Orders',
            'newHomeSales': 'New Home Sales',
            'existingHomeSales': 'Existing Home Sales',
            'consumerSentiment': 'Consumer Sentiment',
            'fomc': 'FOMC Rate Decision'
        };
        return names[seriesId] || seriesId;
    }

    getImpactLevel(seriesId) {
        const highImpact = ['coreCPI', 'corePPI', 'corePCE', 'gdp', 'unemployment', 'fomc'];
        const mediumImpact = ['joblessClaims', 'retailSales', 'durableGoods', 'consumerSentiment'];
        
        if (highImpact.includes(seriesId)) return 'high';
        if (mediumImpact.includes(seriesId)) return 'medium';
        return 'low';
    }

    formatTime(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${ampm} ET`;
    }

    formatDate(date) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    }

    formatDataValues(seriesId) {
        const data = this.currentData[seriesId];
        if (!data) {
            // If no data available, show placeholder
            return `
                <div class="calendar-data-values">
                    <span class="data-label">Current:</span> <span class="data-value">--</span>
                    <span class="data-separator">|</span>
                    <span class="data-label">Previous:</span> <span class="data-value">--</span>
                </div>
            `;
        }
        
        return `
            <div class="calendar-data-values">
                <span class="data-label">Current:</span> <span class="data-value">${data.current}</span>
                <span class="data-separator">|</span>
                <span class="data-label">Previous:</span> <span class="data-value">${data.previous}</span>
            </div>
        `;
    }

    renderCalendar() {
        const container = document.querySelector('.calendar-section');
        if (!container) return;
        
        const events = this.calculateUpcomingReleases();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Build calendar HTML
        let html = `
            <div class="calendar-header">
                <h3>Economic Calendar</h3>
                <div class="time-selector">
                    <span class="time-option ${this.selectedPeriod === 'today' ? 'active' : ''}" data-period="today">Today</span>
                    <span class="time-option ${this.selectedPeriod === 'this-week' ? 'active' : ''}" data-period="this-week">This Week</span>
                    <span class="time-option ${this.selectedPeriod === 'next-week' ? 'active' : ''}" data-period="next-week">Next Week</span>
                    <span class="time-option ${this.selectedPeriod === 'month-ahead' ? 'active' : ''}" data-period="month-ahead">Month Ahead</span>
                </div>
            </div>
        `;
        
        if (events.length === 0) {
            html += '<div class="calendar-empty">No economic releases scheduled for this period.</div>';
        } else {
            let currentDate = null;
            
            events.forEach(event => {
                const eventDateStr = this.formatDate(event.date);
                const isToday = event.date.toDateString() === today.toDateString();
                
                // Add date header if new date
                if (eventDateStr !== currentDate) {
                    currentDate = eventDateStr;
                    html += `<div class="calendar-date ${isToday ? 'today' : ''}">${eventDateStr}</div>`;
                }
                
                // Format impact label with full description
                const impactLabel = {
                    'high': 'High Market Impact',
                    'medium': 'Medium Market Impact',
                    'low': 'Low Market Impact'
                }[event.impact];
                
                // Add visual indicator if event has already occurred
                const statusClass = event.isPast ? 'past' : 'upcoming';
                const statusIndicator = event.isPast ? ' ✓' : '';
                
                html += `
                    <div class="calendar-item ${statusClass}">
                        <div class="calendar-time">${event.time}${statusIndicator}</div>
                        <div class="calendar-event">
                            <div class="event-name">${event.name}</div>
                            ${this.formatDataValues(event.seriesId)}
                        </div>
                        <div class="calendar-impact impact-${event.impact}">${impactLabel}</div>
                    </div>
                `;
            });
        }
        
        // Add note about data
        html += `
            <div style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.85rem; color: #666;">
                <strong>Note:</strong> Current and Previous values show the most recent two data points from each indicator. 
                Events marked with ✓ have already occurred. Consensus forecasts require a paid data service.
            </div>
        `;
        
        container.innerHTML = html;
        this.attachEventListeners();
    }

    attachEventListeners() {
        const timeOptions = document.querySelectorAll('.time-option');
        timeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                // Remove active class from all options
                timeOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                e.target.classList.add('active');
                // Update selected period and re-render
                this.selectedPeriod = e.target.dataset.period;
                this.loadCurrentData(); // Reload data when period changes
                this.renderCalendar();
            });
        });
    }

    // Public method to refresh calendar data
    refresh() {
        console.log('Refreshing calendar data...');
        this.loadCurrentData();
        this.renderCalendar();
    }

    // TEST FUNCTION: Verify all date calculations
    testDateCalculations() {
        console.log('\n🧪 CALENDAR SERVICE TEST SUITE');
        console.log('=====================================');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log(`\n📅 Testing Date: ${today.toDateString()}`);
        console.log(`   Day of Week: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]}`);
        
        // Test each period calculation
        const periods = ['today', 'this-week', 'next-week', 'month-ahead'];
        const results = {};
        
        periods.forEach(period => {
            console.log(`\n🔍 Testing Period: "${period}"`);
            console.log('--------------------------------');
            
            // Set the period and calculate boundaries
            const originalPeriod = this.selectedPeriod;
            this.selectedPeriod = period;
            
            let periodStart = new Date(today);
            let periodEnd = new Date(today);
            
            switch(period) {
                case 'today':
                    periodEnd.setHours(23, 59, 59, 999);
                    break;
                case 'this-week':
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    endOfWeek.setHours(23, 59, 59, 999);
                    
                    periodStart = startOfWeek;
                    periodEnd = endOfWeek;
                    break;
                case 'next-week':
                    periodStart.setDate(today.getDate() + (7 - today.getDay()));
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
            
            const daysDiff = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
            
            console.log(`   Start: ${periodStart.toDateString()} ${periodStart.toTimeString().slice(0,8)}`);
            console.log(`   End:   ${periodEnd.toDateString()} ${periodEnd.toTimeString().slice(0,8)}`);
            console.log(`   Duration: ${daysDiff} days`);
            
            // Get events for this period
            const events = this.calculateUpcomingReleases();
            console.log(`   Events Found: ${events.length}`);
            
            // Validate period logic
            let validation = '✅ PASS';
            let issues = [];
            
            switch(period) {
                case 'today':
                    if (periodStart.toDateString() !== today.toDateString()) {
                        issues.push('Start date should be today');
                    }
                    if (periodEnd.toDateString() !== today.toDateString()) {
                        issues.push('End date should be today');
                    }
                    if (daysDiff !== 1) {
                        issues.push(`Duration should be 1 day, got ${daysDiff}`);
                    }
                    break;
                    
                case 'this-week':
                    if (periodStart.getDay() !== 0) {
                        issues.push(`Week should start on Sunday, got ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][periodStart.getDay()]}`);
                    }
                    if (periodEnd.getDay() !== 6) {
                        issues.push(`Week should end on Saturday, got ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][periodEnd.getDay()]}`);
                    }
                    if (daysDiff !== 7) {
                        issues.push(`Duration should be 7 days, got ${daysDiff}`);
                    }
                    if (!(today >= periodStart && today <= periodEnd)) {
                        issues.push('Today should be within this week');
                    }
                    break;
                    
                case 'next-week':
                    if (periodStart.getDay() !== 0) {
                        issues.push(`Week should start on Sunday, got ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][periodStart.getDay()]}`);
                    }
                    if (periodEnd.getDay() !== 6) {
                        issues.push(`Week should end on Saturday, got ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][periodEnd.getDay()]}`);
                    }
                    if (daysDiff !== 7) {
                        issues.push(`Duration should be 7 days, got ${daysDiff}`);
                    }
                    if (periodStart <= today) {
                        issues.push('Next week should start after today');
                    }
                    break;
                    
                case 'month-ahead':
                    if (periodStart.toDateString() !== today.toDateString()) {
                        issues.push('Month ahead should start today');
                    }
                    if (daysDiff !== 29) { // 28 days + partial day = 29
                        issues.push(`Duration should be 29 days (28 full days + partial), got ${daysDiff}`);
                    }
                    break;
            }
            
            if (issues.length > 0) {
                validation = '❌ FAIL';
                console.log(`   Issues: ${issues.join('; ')}`);
            }
            
            console.log(`   Validation: ${validation}`);
            
            // Sample a few events for verification
            if (events.length > 0) {
                console.log(`   Sample Events:`);
                events.slice(0, 3).forEach((event, idx) => {
                    const withinPeriod = event.date >= periodStart && event.date <= periodEnd;
                    const status = withinPeriod ? '✅' : '❌';
                    console.log(`     ${idx + 1}. ${status} ${event.name} - ${event.date.toDateString()} ${event.time}`);
                });
                if (events.length > 3) {
                    console.log(`     ... and ${events.length - 3} more events`);
                }
            }
            
            results[period] = {
                pass: issues.length === 0,
                issues: issues,
                eventCount: events.length,
                periodStart: periodStart,
                periodEnd: periodEnd,
                duration: daysDiff
            };
            
            // Restore original period
            this.selectedPeriod = originalPeriod;
        });
        
        // Summary
        console.log('\n📊 TEST SUMMARY');
        console.log('=====================================');
        const passed = Object.values(results).filter(r => r.pass).length;
        const total = periods.length;
        
        console.log(`Tests Passed: ${passed}/${total}`);
        
        periods.forEach(period => {
            const result = results[period];
            const status = result.pass ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${period.padEnd(12)} ${status} (${result.eventCount} events, ${result.duration} days)`);
            if (!result.pass) {
                result.issues.forEach(issue => console.log(`    - ${issue}`));
            }
        });
        
        // Edge case tests
        console.log('\n🔬 EDGE CASE TESTS');
        console.log('=====================================');
        
        // Test weekend boundaries
        const testDates = [
            new Date('2024-01-01'), // Monday (New Year's Day)
            new Date('2024-07-04'), // Thursday (Independence Day)
            new Date('2024-12-25'), // Wednesday (Christmas)
            new Date('2024-02-29'), // Thursday (Leap Year)
        ];
        
        testDates.forEach(testDate => {
            console.log(`\n🧪 Testing with ${testDate.toDateString()}:`);
            
            // Mock today as the test date
            const originalToday = today;
            const mockToday = new Date(testDate);
            mockToday.setHours(0, 0, 0, 0);
            
            // Test this-week calculation for various days of the week
            const startOfWeek = new Date(mockToday);
            startOfWeek.setDate(mockToday.getDate() - mockToday.getDay());
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            const isWithinWeek = mockToday >= startOfWeek && mockToday <= endOfWeek;
            
            console.log(`   Day of Week: ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][mockToday.getDay()]}`);
            console.log(`   Week Start: ${startOfWeek.toDateString()}`);
            console.log(`   Week End: ${endOfWeek.toDateString()}`);
            console.log(`   Within Week: ${isWithinWeek ? '✅' : '❌'}`);
        });
        
        console.log('\n🎉 CALENDAR TEST SUITE COMPLETE\n');
        
        return results;
    }
}

// Function to initialize calendar service
function initializeCalendarService() {
    console.log('📅 Initializing Calendar Service...');
    window.calendarService = new CalendarService();
    window.calendarService.init();
    
    // Set up automatic refresh when data updates
    let refreshTimeout;
    const setupDataUpdateListener = () => {
        if (window.dataUpdater) {
            const originalUpdateCard = window.dataUpdater.updateCard;
            window.dataUpdater.updateCard = function(cardId, data) {
                originalUpdateCard.call(this, cardId, data);
                
                // Debounce calendar refresh to avoid multiple updates
                clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(() => {
                    if (window.calendarService && window.calendarService.initialized) {
                        window.calendarService.refresh();
                    }
                }, 1000);
            };
            console.log('📅 Calendar data update listener attached');
        } else {
            // Try again in a second if dataUpdater isn't ready
            setTimeout(setupDataUpdateListener, 1000);
        }
    };
    
    setupDataUpdateListener();
}

// Register initialization with dashboard initializer or use fallback
if (typeof window !== 'undefined') {
    setTimeout(() => {
        if (window.dashboardInitializer) {
            window.dashboardInitializer.addInitializationCallback(() => {
                console.log('📅 Initializing Calendar Service via coordinator...');
                initializeCalendarService();
            }, 5);
            console.log('📅 Calendar Service registered with dashboard coordinator');
        } else {
            // Fallback: Initialize when DOM is ready (legacy mode)
            console.log('📅 Calendar Service using fallback initialization');
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initializeCalendarService, 1000);
            });
        }
    }, 100);
}

// Add manual refresh function for debugging
window.refreshCalendar = function() {
    if (window.calendarService) {
        window.calendarService.refresh();
        console.log('Calendar refreshed manually');
    } else {
        console.log('Calendar service not initialized');
    }
};

// Add global test function for calendar date calculations
window.testCalendar = function() {
    if (window.calendarService) {
        return window.calendarService.testDateCalculations();
    } else {
        console.log('❌ Calendar service not initialized. Please wait for page to load.');
        return null;
    }
};