// API Service Layer V2 - VERCEL API ONLY - NO CORS PROXY
class APIService {
    constructor() {
        this.cache = {};
        this.lastFetch = {};
        console.log('✅ APIService V2: Using Vercel API endpoints exclusively');
    }

    // Helper method to filter observations by frequency
    filterByFrequency(observations, frequency) {
        if (!frequency || frequency === 'd') {
            return observations;
        }

        const filtered = [];
        let lastDate = null;

        for (const obs of observations) {
            const currentDate = new Date(obs.date);

            if (!lastDate) {
                filtered.push(obs);
                lastDate = currentDate;
                continue;
            }

            let shouldInclude = false;

            switch (frequency) {
                case 'w':
                    shouldInclude = (currentDate - lastDate) >= (7 * 24 * 60 * 60 * 1000);
                    break;
                case 'm':
                    shouldInclude = currentDate.getMonth() !== lastDate.getMonth() ||
                                  currentDate.getFullYear() !== lastDate.getFullYear();
                    break;
                case 'q':
                    const monthDiff = (currentDate.getFullYear() - lastDate.getFullYear()) * 12 +
                                    (currentDate.getMonth() - lastDate.getMonth());
                    shouldInclude = monthDiff >= 3;
                    break;
                case 'a':
                    shouldInclude = currentDate.getFullYear() !== lastDate.getFullYear();
                    break;
            }

            if (shouldInclude) {
                filtered.push(obs);
                lastDate = currentDate;
            }
        }

        return filtered;
    }

    // FRED API Methods - VERCEL ONLY
    async getFREDSeries(seriesId, limit = 13, frequency = null, forceRefresh = false) {
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date();

            // Calculate start date based on limit and frequency
            if (frequency === 'd' || !frequency) {
                startDate.setDate(startDate.getDate() - (limit * 2));
            } else if (frequency === 'w') {
                startDate.setDate(startDate.getDate() - (limit * 7 * 2));
            } else if (frequency === 'm') {
                startDate.setMonth(startDate.getMonth() - (limit * 2));
            } else if (frequency === 'q') {
                startDate.setMonth(startDate.getMonth() - (limit * 3 * 2));
            } else if (frequency === 'a') {
                startDate.setFullYear(startDate.getFullYear() - (limit * 2));
            }

            const startDateStr = startDate.toISOString().split('T')[0];

            // Use Vercel API endpoint
            const vercelUrl = `/api/fred?series=${seriesId}&start_date=${startDateStr}&end_date=${endDate}`;
            console.log(`Fetching FRED data via Vercel API: ${seriesId}`);

            const response = await fetch(vercelUrl);
            if (response.ok) {
                const data = await response.json();

                if (data && data.observations && data.observations.length > 0) {
                    let validObservations = data.observations
                        .filter(obs => obs.value !== '.' && !isNaN(parseFloat(obs.value)));

                    if (frequency) {
                        validObservations = this.filterByFrequency(validObservations, frequency);
                    }

                    validObservations.sort((a, b) => new Date(b.date) - new Date(a.date));
                    validObservations = validObservations.slice(0, limit);
                    validObservations.reverse();

                    if (validObservations.length > 0) {
                        return {
                            values: validObservations.map(obs => parseFloat(obs.value)),
                            dates: validObservations.map(obs => obs.date),
                            seriesId: seriesId
                        };
                    }
                }
            } else {
                console.error(`Vercel API failed for ${seriesId}: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error fetching FRED data for ${seriesId}:`, error.message);
        }
        return null;
    }

    // Format dates for display
    formatDate(dateString, isWeekly = false, isQuarterly = false, seriesId = null) {
        const parts = dateString.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const date = new Date(year, month, day);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (isWeekly) {
            const displayMonth = month + 1;
            const displayDay = day;
            return `${displayMonth}/${displayDay}`;
        } else if (isQuarterly) {
            let quarter;
            if (month <= 2) {
                quarter = 1;
            } else if (month <= 5) {
                quarter = 2;
            } else if (month <= 8) {
                quarter = 3;
            } else {
                quarter = 4;
            }
            const yearShort = year.toString().substr(2);
            return `Q${quarter}'${yearShort}`;
        } else {
            const monthName = months[month];
            const yearShort = year.toString().substr(2);
            return `${monthName} '${yearShort}`;
        }
    }

    // Calculate returns for rates
    calculateExtendedReturnsForRates(values, dates) {
        if (!values || !dates || values.length === 0) {
            return {};
        }

        const currentValue = values[values.length - 1];
        const currentDate = new Date(dates[dates.length - 1]);
        const returns = {};

        const findClosestValue = (targetDate, direction = 'before') => {
            let bestIndex = -1;
            let bestDistance = Infinity;

            for (let i = 0; i < dates.length; i++) {
                const dataDate = new Date(dates[i]);
                const timeDiff = dataDate.getTime() - targetDate.getTime();
                const daysDiff = Math.abs(timeDiff / (1000 * 60 * 60 * 24));

                if (dataDate.getDay() === 0 || dataDate.getDay() === 6) {
                    continue;
                }

                let isValidDirection = false;
                if (direction === 'before') {
                    isValidDirection = timeDiff <= 0;
                } else if (direction === 'after') {
                    isValidDirection = timeDiff >= 0;
                }

                if (isValidDirection && daysDiff < bestDistance) {
                    bestDistance = daysDiff;
                    bestIndex = i;
                }
            }

            return bestIndex !== -1 ? values[bestIndex] : null;
        };

        const periods = [
            { key: '1W', days: 7 },
            { key: '1M', days: 30 },
            { key: 'YTD', isYTD: true },
            { key: '1Y', days: 365 }
        ];

        for (const period of periods) {
            let targetValue = null;

            if (period.isYTD) {
                const yearStart = new Date(currentDate.getFullYear(), 0, 1);
                targetValue = findClosestValue(yearStart, 'after');
            } else {
                const targetDate = new Date(currentDate);
                targetDate.setDate(currentDate.getDate() - period.days);
                targetValue = findClosestValue(targetDate, 'before');
            }

            if (targetValue !== null && targetValue !== 0) {
                returns[period.key] = (currentValue - targetValue) * 100;
            }
        }

        return returns;
    }

    // Calculate 2s10s spread
    calculate2s10sHistorical(treasury2Data, treasury10Data) {
        if (!treasury2Data || !treasury10Data ||
            !treasury2Data.values || !treasury10Data.values ||
            treasury2Data.values.length === 0 || treasury10Data.values.length === 0) {
            return null;
        }

        const spreadValues = [];
        const alignedDates = [];

        const dates2yr = treasury2Data.dates;
        const dates10yr = treasury10Data.dates;
        const values2yr = treasury2Data.values;
        const values10yr = treasury10Data.values;

        const data10yrMap = new Map();
        dates10yr.forEach((date, index) => {
            data10yrMap.set(date, values10yr[index]);
        });

        dates2yr.forEach((date, index) => {
            const value2yr = values2yr[index];
            const value10yr = data10yrMap.get(date);

            if (value10yr !== undefined && value2yr !== null && value10yr !== null) {
                const spread = (value10yr - value2yr) * 100;
                spreadValues.push(spread);
                alignedDates.push(date);
            }
        });

        if (spreadValues.length < 2) {
            return null;
        }

        const currentSpread = spreadValues[spreadValues.length - 1];
        const previousSpread = spreadValues[spreadValues.length - 2];
        const change = currentSpread - previousSpread;

        return {
            spreadValues: spreadValues,
            dates: alignedDates.map(d => this.formatDate(d)),
            change: change,
            current: currentSpread
        };
    }

    // Test connections
    async testConnections() {
        console.log('Testing API connections...');
        console.log('FRED API: ✓ Using Vercel API routes');

        try {
            const fredTest = await this.getFREDSeries('UNRATE', 1);
            console.log('FRED API Test:', fredTest ? '✓ Connected' : '✗ Failed');
        } catch (e) {
            console.log('FRED API Test: ✗ Failed -', e.message);
        }
    }

    // Main update method
    async updateAllData() {
        const updates = {};
        console.log('Starting data update via Vercel API...');

        let treasury2yr = null;
        let treasury10yr = null;

        try {
            // Core CPI
            const coreCpiData = await this.getFREDSeries(API_CONFIG.FRED.series.coreCPI, 24, 'm');
            if (coreCpiData && coreCpiData.values.length >= 13) {
                const yoyValues = [];
                const yoyDates = [];

                for (let i = 12; i < coreCpiData.values.length; i++) {
                    const current = coreCpiData.values[i];
                    const yearAgo = coreCpiData.values[i - 12];
                    const yoyChange = ((current - yearAgo) / yearAgo) * 100;
                    yoyValues.push(yoyChange);
                    yoyDates.push(coreCpiData.dates[i]);
                }

                if (yoyValues.length > 0) {
                    const currentYoY = yoyValues[yoyValues.length - 1];
                    const previousYoY = yoyValues.length > 1 ? yoyValues[yoyValues.length - 2] : currentYoY;

                    updates['corecpi-chart'] = {
                        current: currentYoY,
                        change: currentYoY - previousYoY,
                        changeType: (currentYoY - previousYoY) > 0 ? 'negative' : 'positive',
                        changeLabel: 'MoM',
                        historicalData: yoyValues.slice(-12),
                        dates: yoyDates.slice(-12).map(d => this.formatDate(d)),
                        observationDate: yoyDates[yoyDates.length - 1],
                        seriesId: 'coreCPI'
                    };
                    console.log('Updated Core CPI YoY:', currentYoY);
                }
            }

            // GDP
            const gdpData = await this.getFREDSeries(API_CONFIG.FRED.series.gdp, 8, 'q');
            if (gdpData && gdpData.values.length > 1) {
                const current = gdpData.values[gdpData.values.length - 1];
                const previous = gdpData.values[gdpData.values.length - 2];

                updates['gdp-card'] = {
                    current: current,
                    change: current - previous,
                    changeType: current > previous ? 'positive' : 'negative',
                    changeLabel: 'QoQ',
                    historicalData: gdpData.values,
                    dates: gdpData.dates.map(d => this.formatDate(d, false, true)),
                    observationDate: gdpData.dates[gdpData.dates.length - 1],
                    seriesId: 'gdp'
                };
                console.log('Updated GDP:', current);
            }

            // Add other indicators as needed...

        } catch (error) {
            console.error('Error updating economic data:', error);
        }

        console.log('Data update complete. Updates:', Object.keys(updates).length);
        return updates;
    }
}

// Create global instance
const apiService = new APIService();
window.apiService = apiService;

console.log('✅ APIService V2 loaded and ready');

// Auto-test on load
window.addEventListener('load', () => {
    setTimeout(() => {
        apiService.testConnections();
    }, 3000);
});