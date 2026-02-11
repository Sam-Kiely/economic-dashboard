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

    // FRED API Methods - VERCEL ONLY with retry logic
    async getFREDSeries(seriesId, limit = 13, frequency = null, forceRefresh = false, retryCount = 3) {
        const maxRetries = retryCount;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date();

                // Calculate start date to fetch exactly the data we need (no extra buffer)
                if (frequency === 'd' || !frequency) {
                    startDate.setDate(startDate.getDate() - limit);
                } else if (frequency === 'w') {
                    startDate.setDate(startDate.getDate() - (limit * 7));
                } else if (frequency === 'm') {
                    startDate.setMonth(startDate.getMonth() - limit);
                } else if (frequency === 'q') {
                    startDate.setMonth(startDate.getMonth() - (limit * 3));
                } else if (frequency === 'a') {
                    startDate.setFullYear(startDate.getFullYear() - limit);
                }

                const startDateStr = startDate.toISOString().split('T')[0];

                // Use Vercel API endpoint
                const vercelUrl = `/api/fred?series=${seriesId}&start_date=${startDateStr}&end_date=${endDate}`;
                if (attempt === 1) {
                    console.log(`Fetching FRED data via Vercel API: ${seriesId}, start: ${startDateStr}, end: ${endDate}, limit: ${limit}, freq: ${frequency}`);
                } else {
                    console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for ${seriesId}`);
                }

                // Add timeout for fetch
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

                const response = await fetch(vercelUrl, {
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                const data = await response.json();

                if (data && data.observations && data.observations.length > 0) {
                    let validObservations = data.observations
                        .filter(obs => obs.value !== '.' && !isNaN(parseFloat(obs.value)));

                    // Debug logging for GDP
                    if (seriesId.includes('A191RL1Q225SBEA')) {
                        console.log(`📊 GDP: Raw observations from FRED: ${data.observations.length} total, ${validObservations.length} valid`);
                        console.log(`📊 GDP: First few valid obs:`, validObservations.slice(0, 3));
                        console.log(`📊 GDP: Last few valid obs:`, validObservations.slice(-3));
                    }

                    // Skip frequency filtering for GDP - it's already quarterly data
                    if (frequency && !seriesId.includes('A191RL1Q225SBEA')) {
                        validObservations = this.filterByFrequency(validObservations, frequency);
                    } else if (seriesId.includes('A191RL1Q225SBEA')) {
                        console.log(`📊 GDP: Skipping frequency filter - data is already quarterly`);
                    }

                    // Sort by date (oldest first) and limit to requested observations
                    validObservations.sort((a, b) => new Date(a.date) - new Date(b.date));

                    // Take only the most recent observations up to the limit
                    if (validObservations.length > limit) {
                        validObservations = validObservations.slice(-limit);
                    }

                    if (seriesId.includes('A191RL1Q225SBEA')) {
                        console.log(`📊 GDP: Final observations after processing: ${validObservations.length}`);
                    }

                    if (validObservations.length > 0) {
                        return {
                            values: validObservations.map(obs => parseFloat(obs.value)),
                            dates: validObservations.map(obs => obs.date),
                            seriesId: seriesId
                        };
                    }
                }
                } else {
                    const errorMsg = `Vercel API failed for ${seriesId}: ${response.status}`;
                    console.error(errorMsg);
                    lastError = new Error(errorMsg);
                }
            } catch (error) {
                lastError = error;
                const isNetworkError = error.message.includes('ERR_NETWORK') ||
                                      error.message.includes('ERR_INTERNET') ||
                                      error.message.includes('Failed to fetch') ||
                                      error.name === 'AbortError';

                if (isNetworkError) {
                    console.warn(`⚠️ Network error for ${seriesId} (attempt ${attempt}/${maxRetries}): ${error.message}`);
                    if (attempt < maxRetries) {
                        // Wait before retry with exponential backoff
                        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                        console.log(`⏳ Waiting ${delay}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                } else {
                    console.error(`Error fetching FRED data for ${seriesId}:`, error.message);
                    break; // Non-network errors don't retry
                }
            }
        }

        // All retries exhausted
        if (lastError) {
            console.error(`❌ All retries exhausted for ${seriesId}. Last error:`, lastError.message);
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

    // Generate monthly labels for rate/H8 charts (13 months, last data point of each month)
    generateMonthlyLabels(dates, values, maxLabels = 13) {
        console.log(`🔍 generateMonthlyLabels: Input ${dates?.length || 0} dates, ${values?.length || 0} values, maxLabels=${maxLabels}`);
        if (!dates || !values || dates.length === 0) {
            console.log(`❌ generateMonthlyLabels: No data provided`);
            return [];
        }

        const monthlyData = new Map();

        // Group data by year-month and keep the last value of each month
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

            // Always use the latest data point for each month
            monthlyData.set(monthKey, {
                date: dates[i],
                value: values[i],
                index: i
            });
        }

        // Convert to array and sort by date - ensure we get exactly maxLabels months
        let sortedMonths = Array.from(monthlyData.values())
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // If we have fewer months than requested, pad with earlier months by duplicating
        if (sortedMonths.length < maxLabels) {
            console.log(`⚠️ Only ${sortedMonths.length} months available, padding to ${maxLabels}`);
            // Take all available months
        } else {
            // Take last N months
            sortedMonths = sortedMonths.slice(-maxLabels);
        }

        console.log(`🔍 generateMonthlyLabels: Found ${monthlyData.size} unique months, using ${sortedMonths.length} for labels`);
        console.log(`🔍 generateMonthlyLabels: Month dates:`, sortedMonths.map(m => m.date));

        // Generate labels array with empty strings for non-month-end points
        const labels = new Array(dates.length).fill('');

        for (const monthData of sortedMonths) {
            // Format as "Mon 'yy" for rates charts
            const date = new Date(monthData.date);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthStr = months[date.getMonth()];
            const yearStr = String(date.getFullYear()).slice(-2);
            labels[monthData.index] = `${monthStr} '${yearStr}`;
        }

        console.log(`🔍 generateMonthlyLabels: Generated ${labels.filter(l => l).length} non-empty labels out of ${labels.length} total`);
        return labels;
    }

    // Calculate H8 banking data changes (WoW, QTD, YoY Quarter)
    calculateH8Changes(values, dates) {
        if (!values || !dates || values.length === 0) {
            console.log('❌ H8 calculateH8Changes: No data provided');
            return {};
        }

        const currentValue = values[values.length - 1];
        const currentDate = new Date(dates[dates.length - 1]);
        const changes = {};

        console.log(`🔍 H8 calculateH8Changes: Processing ${values.length} values from ${dates[0]} to ${dates[dates.length-1]}`);
        console.log(`🔍 H8 calculateH8Changes: Current value=${currentValue}, Current date=${currentDate.toISOString().split('T')[0]}`);

        // Helper to find value at or before a specific date
        const findValueAtOrBefore = (targetDate) => {
            let closestIndex = -1;
            let closestDate = null;

            for (let i = dates.length - 1; i >= 0; i--) {
                const dataDate = new Date(dates[i]);
                if (dataDate <= targetDate) {
                    closestIndex = i;
                    closestDate = dataDate;
                    break;
                }
            }

            return closestIndex !== -1 ? { value: values[closestIndex], date: closestDate } : null;
        };

        // WoW (Week over Week) - compare to previous data point
        if (values.length > 1) {
            const previousValue = values[values.length - 2];
            changes.WoW = ((currentValue - previousValue) / previousValue) * 100;
        }

        // QTD (Quarter to Date) - compare to most recent quarter end
        const currentQuarter = Math.floor(currentDate.getMonth() / 3);
        const currentYear = currentDate.getFullYear();

        // Get the most recent quarter end date
        let quarterEndDate;
        if (currentQuarter === 0) {
            // Q1 2026, so previous quarter end is 12/31/2025
            quarterEndDate = new Date(currentYear - 1, 11, 31); // December 31 of previous year
        } else {
            // Get the end date of the previous quarter
            const endMonth = currentQuarter * 3 - 1; // March=2, June=5, Sept=8, Dec=11
            const endDay = [31, 30, 30, 31][currentQuarter - 1]; // Days in Mar, Jun, Sep, Dec
            quarterEndDate = new Date(currentYear, endMonth, endDay);
        }

        console.log(`🔍 H8 QTD: Looking for data at or before ${quarterEndDate.toISOString().split('T')[0]}`);
        const quarterEndData = findValueAtOrBefore(quarterEndDate);
        if (quarterEndData) {
            changes.QTD = ((currentValue - quarterEndData.value) / quarterEndData.value) * 100;
            console.log(`✅ H8 QTD calc: Current=${currentValue}, QuarterEnd=${quarterEndData.value} (${quarterEndData.date.toISOString().split('T')[0]}), Change=${changes.QTD}%`);
        } else {
            console.log(`❌ H8 QTD: No data found at or before ${quarterEndDate.toISOString().split('T')[0]}`);
        }

        // YoY Quarter - compare to same quarter end from previous year
        const previousYearQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const previousYearForQuarter = currentQuarter === 0 ? currentYear - 1 : currentYear;

        // Get the end date of the same quarter last year
        let yoyQuarterEndDate;
        if (currentQuarter === 0) {
            // Q1 2026, compare to Q1 2025 end (March 31, 2025)
            yoyQuarterEndDate = new Date(currentYear - 1, 2, 31); // March 31 of previous year
        } else {
            // Get the end date of the same quarter last year
            const endMonth = currentQuarter * 3 - 1;
            const endDay = [31, 30, 30, 31][currentQuarter - 1];
            yoyQuarterEndDate = new Date(currentYear - 1, endMonth, endDay);
        }

        console.log(`🔍 H8 YoY Qtr: Looking for data at or before ${yoyQuarterEndDate.toISOString().split('T')[0]}`);
        const yoyQuarterData = findValueAtOrBefore(yoyQuarterEndDate);
        if (yoyQuarterData) {
            changes.YoYQtr = ((currentValue - yoyQuarterData.value) / yoyQuarterData.value) * 100;
            console.log(`✅ H8 YoY Qtr calc: Current=${currentValue}, YearAgoQuarter=${yoyQuarterData.value} (${yoyQuarterData.date.toISOString().split('T')[0]}), Change=${changes.YoYQtr}%`);
        } else {
            console.log(`❌ H8 YoY Qtr: No data found at or before ${yoyQuarterEndDate.toISOString().split('T')[0]}`);
        }

        console.log(`🔍 H8 Final changes object:`, changes);
        return changes;
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
            { key: '1D', days: 1 },
            { key: '1W', days: 7 },
            { key: '1M', days: 30 },
            { key: 'YTD', isYTD: true },
            { key: '1Y', days: 365 },
            { key: '3Y', days: 365 * 3 },
            { key: '5Y', days: 365 * 5 }
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

            console.log(`🔍 Period ${period.key}: targetValue=${targetValue}, currentValue=${currentValue}`);

            // Allow targetValue of 0 for rate calculations, only skip if truly null/undefined
            if (targetValue !== null && targetValue !== undefined) {
                returns[period.key] = (currentValue - targetValue) * 100;
                console.log(`✅ Added ${period.key}: ${returns[period.key]} bps`);
            } else {
                console.log(`❌ Skipped ${period.key}: targetValue is null/undefined`);
            }
        }

        console.log(`🔍 calculateExtendedReturnsForRates: Final returns:`, {
            keys: Object.keys(returns),
            values: returns,
            count: Object.keys(returns).length
        });
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
            dates: alignedDates, // Keep original date strings for processing
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
            // Core CPI (YoY calculation)
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

            await new Promise(resolve => setTimeout(resolve, 500));

            // Core PPI (YoY calculation)
            const corePpiData = await this.getFREDSeries(API_CONFIG.FRED.series.corePPI, 24, 'm');
            if (corePpiData && corePpiData.values.length >= 13) {
                const yoyValues = [];
                const yoyDates = [];

                for (let i = 12; i < corePpiData.values.length; i++) {
                    const current = corePpiData.values[i];
                    const yearAgo = corePpiData.values[i - 12];
                    const yoyChange = ((current - yearAgo) / yearAgo) * 100;
                    yoyValues.push(yoyChange);
                    yoyDates.push(corePpiData.dates[i]);
                }

                if (yoyValues.length > 0) {
                    const currentYoY = yoyValues[yoyValues.length - 1];
                    const previousYoY = yoyValues.length > 1 ? yoyValues[yoyValues.length - 2] : currentYoY;

                    updates['coreppi-chart'] = {
                        current: currentYoY,
                        change: currentYoY - previousYoY,
                        changeType: (currentYoY - previousYoY) > 0 ? 'negative' : 'positive',
                        changeLabel: 'MoM',
                        historicalData: yoyValues.slice(-12),
                        dates: yoyDates.slice(-12).map(d => this.formatDate(d)),
                        observationDate: yoyDates[yoyDates.length - 1],
                        seriesId: 'corePPI'
                    };
                    console.log('Updated Core PPI YoY:', currentYoY);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Core PCE (YoY calculation)
            const corePceData = await this.getFREDSeries(API_CONFIG.FRED.series.corePCE, 24, 'm');
            if (corePceData && corePceData.values.length >= 13) {
                const yoyValues = [];
                const yoyDates = [];

                for (let i = 12; i < corePceData.values.length; i++) {
                    const current = corePceData.values[i];
                    const yearAgo = corePceData.values[i - 12];
                    const yoyChange = ((current - yearAgo) / yearAgo) * 100;
                    yoyValues.push(yoyChange);
                    yoyDates.push(corePceData.dates[i]);
                }

                if (yoyValues.length > 0) {
                    const currentYoY = yoyValues[yoyValues.length - 1];
                    const previousYoY = yoyValues.length > 1 ? yoyValues[yoyValues.length - 2] : currentYoY;

                    updates['corepce-chart'] = {
                        current: currentYoY,
                        change: currentYoY - previousYoY,
                        changeType: (currentYoY - previousYoY) > 0 ? 'negative' : 'positive',
                        changeLabel: 'MoM',
                        historicalData: yoyValues.slice(-12),
                        dates: yoyDates.slice(-12).map(d => this.formatDate(d)),
                        observationDate: yoyDates[yoyDates.length - 1],
                        seriesId: 'corePCE'
                    };
                    console.log('Updated Core PCE YoY:', currentYoY);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // GDP (Already in QoQ Annualized format) - Get 2 years (8 quarters) for chart
            console.log('📊 GDP: Fetching data for series:', API_CONFIG.FRED.series.gdp);
            const gdpData = await this.getFREDSeries(API_CONFIG.FRED.series.gdp, 8, 'q');
            console.log('📊 GDP: Raw data received:', gdpData ? {
                valuesCount: gdpData.values?.length,
                datesCount: gdpData.dates?.length,
                latestValue: gdpData.values?.[gdpData.values.length-1],
                latestDate: gdpData.dates?.[gdpData.dates.length-1],
                firstFewValues: gdpData.values?.slice(0, 3),
                lastFewValues: gdpData.values?.slice(-3)
            } : 'null');

            if (gdpData && gdpData.values.length > 0) {
                const current = gdpData.values[gdpData.values.length - 1];
                const previous = gdpData.values.length > 1 ? gdpData.values[gdpData.values.length - 2] : current;
                const change = gdpData.values.length > 1 ? current - previous : 0;

                console.log('📊 GDP: Calculation details:', {
                    current,
                    previous,
                    change,
                    changeType: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
                });

                const formattedDates = gdpData.dates.map(d => this.formatDate(d, false, true));
                console.log('📊 GDP: Date formatting:', {
                    originalDates: gdpData.dates,
                    formattedDates: formattedDates
                });

                const gdpUpdate = {
                    current: current,
                    change: change,
                    changeType: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral',
                    changeLabel: 'QoQ',
                    historicalData: gdpData.values,
                    dates: formattedDates,
                    observationDate: gdpData.dates[gdpData.dates.length - 1],
                    seriesId: 'gdp'
                };

                updates['gdp-chart'] = gdpUpdate;
                console.log('📊 GDP: Update object created successfully:', {
                    key: 'gdp-chart',
                    updateKeys: Object.keys(gdpUpdate),
                    historicalDataLength: gdpUpdate.historicalData.length,
                    datesLength: gdpUpdate.dates.length,
                    current: gdpUpdate.current,
                    change: gdpUpdate.change,
                    changeType: gdpUpdate.changeType
                });
            } else {
                console.error('📊 GDP: Data insufficient or missing:', {
                    gdpData: gdpData,
                    hasValues: gdpData?.values ? 'yes' : 'no',
                    valuesLength: gdpData?.values?.length || 0,
                    hasDates: gdpData?.dates ? 'yes' : 'no',
                    datesLength: gdpData?.dates?.length || 0
                });
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Trade Deficit
            const tradeData = await this.getFREDSeries(API_CONFIG.FRED.series.tradeDeficit, 13, 'm');
            if (tradeData && tradeData.values.length > 1) {
                const current = Math.abs(tradeData.values[tradeData.values.length - 1]);
                const previous = Math.abs(tradeData.values[tradeData.values.length - 2]);
                const momChange = ((current - previous) / previous) * 100;

                updates['trade-chart'] = {
                    current: current / 1000,
                    change: momChange,
                    changeType: momChange > 0 ? 'negative' : 'positive',
                    changeLabel: 'MoM',
                    historicalData: tradeData.values.slice(-12).map(v => Math.abs(v) / 1000),
                    dates: tradeData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: tradeData.dates[tradeData.dates.length - 1],
                    seriesId: 'tradeDeficit'
                };
                console.log('Updated Trade Deficit:', current / 1000, 'billion');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Unemployment Rate
            const unemploymentData = await this.getFREDSeries(API_CONFIG.FRED.series.unemployment, 13, 'm');
            if (unemploymentData && unemploymentData.values.length > 1) {
                const current = unemploymentData.values[unemploymentData.values.length - 1];
                const previous = unemploymentData.values[unemploymentData.values.length - 2];

                updates['unemployment-chart'] = {
                    current: current,
                    change: current - previous,
                    changeType: current < previous ? 'positive' : 'negative',
                    changeLabel: 'MoM',
                    historicalData: unemploymentData.values.slice(-12),
                    dates: unemploymentData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: unemploymentData.dates[unemploymentData.dates.length - 1],
                    seriesId: 'unemployment'
                };
                console.log('Updated unemployment data:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Jobless Claims - Get 1 year (52 weeks) for chart
            const joblessData = await this.getFREDSeries(API_CONFIG.FRED.series.joblessClaims, 52);
            if (joblessData && joblessData.values.length > 1) {
                const current = joblessData.values[joblessData.values.length - 1];
                const previous = joblessData.values[joblessData.values.length - 2];

                updates['jobless-chart'] = {
                    current: current / 1000,
                    change: (current - previous) / 1000,
                    changeType: current < previous ? 'positive' : 'negative',
                    changeLabel: 'WoW',
                    historicalData: joblessData.values.map(v => v / 1000),
                    dates: joblessData.dates.map(d => this.formatDate(d, true, false)),
                    observationDate: joblessData.dates[joblessData.dates.length - 1],
                    seriesId: 'joblessClaims'
                };
                console.log('Updated jobless claims (thousands):', current / 1000);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Retail Sales
            const retailData = await this.getFREDSeries(API_CONFIG.FRED.series.retailSales, 13, 'm');
            if (retailData && retailData.values.length > 1) {
                const current = retailData.values[retailData.values.length - 1];
                const previous = retailData.values[retailData.values.length - 2];

                updates['retail-chart'] = {
                    current: current,
                    change: current - previous,
                    changeType: current > 0 ? 'positive' : 'negative',
                    changeLabel: 'MoM',
                    historicalData: retailData.values.slice(-12),
                    dates: retailData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: retailData.dates[retailData.dates.length - 1],
                    seriesId: 'retailSales'
                };
                console.log('Updated Retail Sales MoM:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Durable Goods Orders
            const durableGoodsData = await this.getFREDSeries(API_CONFIG.FRED.series.durableGoods, 14, 'm');
            if (durableGoodsData && durableGoodsData.values.length > 2) {
                const momChanges = [];
                const momDates = [];

                for (let i = 1; i < durableGoodsData.values.length; i++) {
                    const current = durableGoodsData.values[i];
                    const previous = durableGoodsData.values[i - 1];
                    const momChange = ((current - previous) / previous) * 100;
                    momChanges.push(momChange);
                    momDates.push(durableGoodsData.dates[i]);
                }

                if (momChanges.length > 0) {
                    const currentMoM = momChanges[momChanges.length - 1];
                    const previousMoM = momChanges.length > 1 ? momChanges[momChanges.length - 2] : 0;

                    updates['durablegoods-chart'] = {
                        current: currentMoM,
                        change: currentMoM - previousMoM,
                        changeType: currentMoM > 0 ? 'positive' : 'negative',
                        changeLabel: 'MoM',
                        historicalData: momChanges.slice(-12),
                        dates: momDates.slice(-12).map(d => this.formatDate(d)),
                        observationDate: momDates[momDates.length - 1],
                        seriesId: 'durableGoods'
                    };
                    console.log('Updated Durable Goods MoM:', currentMoM);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // New Home Sales
            const homeSalesData = await this.getFREDSeries(API_CONFIG.FRED.series.newHomeSales, 13, 'm');
            if (homeSalesData && homeSalesData.values.length > 1) {
                const current = homeSalesData.values[homeSalesData.values.length - 1];
                const previous = homeSalesData.values[homeSalesData.values.length - 2];
                const momChange = ((current - previous) / previous) * 100;

                updates['newhomes-chart'] = {
                    current: current,
                    change: momChange,
                    changeType: momChange > 0 ? 'positive' : 'negative',
                    changeLabel: 'MoM',
                    historicalData: homeSalesData.values.slice(-12),
                    dates: homeSalesData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: homeSalesData.dates[homeSalesData.dates.length - 1],
                    seriesId: 'newHomeSales'
                };
                console.log('Updated New Home Sales:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Existing Home Sales
            const existingHomeSalesData = await this.getFREDSeries(API_CONFIG.FRED.series.existingHomeSales, 13, 'm');
            if (existingHomeSalesData && existingHomeSalesData.values.length > 1) {
                const current = existingHomeSalesData.values[existingHomeSalesData.values.length - 1];
                const previous = existingHomeSalesData.values[existingHomeSalesData.values.length - 2];
                const momChange = ((current - previous) / previous) * 100;

                updates['existinghomes-chart'] = {
                    current: current,
                    change: momChange,
                    changeType: momChange > 0 ? 'positive' : 'negative',
                    changeLabel: 'MoM',
                    historicalData: existingHomeSalesData.values.slice(-12),
                    dates: existingHomeSalesData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: existingHomeSalesData.dates[existingHomeSalesData.dates.length - 1],
                    seriesId: 'existingHomeSales'
                };
                console.log('Updated Existing Home Sales:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Consumer Sentiment
            const sentimentData = await this.getFREDSeries(API_CONFIG.FRED.series.consumerSentiment, 13, 'm');
            if (sentimentData && sentimentData.values.length > 1) {
                const current = sentimentData.values[sentimentData.values.length - 1];
                const previous = sentimentData.values[sentimentData.values.length - 2];

                updates['sentiment-chart'] = {
                    current: current,
                    change: current - previous,
                    changeType: current > previous ? 'positive' : 'negative',
                    changeLabel: 'MoM',
                    historicalData: sentimentData.values.slice(-12),
                    dates: sentimentData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: sentimentData.dates[sentimentData.dates.length - 1],
                    seriesId: 'consumerSentiment'
                };
                console.log('Updated Consumer Sentiment:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Fed Funds Rate - fetch 5+ years of data for long-term returns
            const fedFundsData = await this.getFREDSeries(API_CONFIG.FRED.series.fedFunds, 1900);
            if (fedFundsData && fedFundsData.values.length > 0) {
                const current = fedFundsData.values[fedFundsData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(fedFundsData.values, fedFundsData.dates);

                updates['fedfunds-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: fedFundsData.values,
                    dates: this.generateMonthlyLabels(fedFundsData.dates, fedFundsData.values),
                    originalDates: fedFundsData.dates,  // Preserve original dates for tooltips
                    observationDate: fedFundsData.dates[fedFundsData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'fedFunds'
                };
                console.log('📊 Updated Fed Funds Rate:', current, 'Change:', extendedReturns['1W']);
                console.log('📊 Fed Funds update object:', updates['fedfunds-chart']);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 3-Month T-Bill - fetch 5+ years of data for long-term returns
            const tbill3mData = await this.getFREDSeries(API_CONFIG.FRED.series.tbill3m, 1900);
            if (tbill3mData && tbill3mData.values.length > 0) {
                const current = tbill3mData.values[tbill3mData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(tbill3mData.values, tbill3mData.dates);

                updates['tbill-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: tbill3mData.values,
                    dates: this.generateMonthlyLabels(tbill3mData.dates, tbill3mData.values),
                    originalDates: tbill3mData.dates,  // Preserve original dates for tooltips
                    observationDate: tbill3mData.dates[tbill3mData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'tbill3m'
                };
                console.log('Updated 3-Month T-Bill:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 1M SOFR - fetch 5+ years of data for long-term returns
            const sofrData = await this.getFREDSeries(API_CONFIG.FRED.series.sofr1m, 1900);
            if (sofrData && sofrData.values.length > 0) {
                const current = sofrData.values[sofrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(sofrData.values, sofrData.dates);

                updates['sofr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: sofrData.values,
                    dates: this.generateMonthlyLabels(sofrData.dates, sofrData.values),
                    originalDates: sofrData.dates,  // Preserve original dates for tooltips
                    observationDate: sofrData.dates[sofrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'sofr1m'
                };
                console.log('📊 Updated 1M SOFR:', current, 'Change:', extendedReturns['1W']);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Treasury 5yr - fetch 5+ years of data for long-term returns
            const treasury5yrData = await this.getFREDSeries(API_CONFIG.FRED.series.treasury5yr, 1900);
            if (treasury5yrData && treasury5yrData.values.length > 0) {
                const current = treasury5yrData.values[treasury5yrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(treasury5yrData.values, treasury5yrData.dates);

                updates['5yr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: treasury5yrData.values,
                    dates: this.generateMonthlyLabels(treasury5yrData.dates, treasury5yrData.values),
                    originalDates: treasury5yrData.dates,  // Preserve original dates for tooltips
                    observationDate: treasury5yrData.dates[treasury5yrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'treasury5yr'
                };
                console.log('📊 Updated 5-Year Treasury:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Treasury 30yr - fetch 5+ years of data for long-term returns
            const treasury30yrData = await this.getFREDSeries(API_CONFIG.FRED.series.treasury30yr, 1900);
            if (treasury30yrData && treasury30yrData.values.length > 0) {
                const current = treasury30yrData.values[treasury30yrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(treasury30yrData.values, treasury30yrData.dates);

                updates['30yr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: treasury30yrData.values,
                    dates: this.generateMonthlyLabels(treasury30yrData.dates, treasury30yrData.values),
                    originalDates: treasury30yrData.dates,  // Preserve original dates for tooltips
                    observationDate: treasury30yrData.dates[treasury30yrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'treasury30yr'
                };
                console.log('📊 Updated 30-Year Treasury:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // High Yield Index - fetch 5+ years of data for long-term returns
            const highYieldData = await this.getFREDSeries(API_CONFIG.FRED.series.highYield, 1900);
            if (highYieldData && highYieldData.values.length > 0) {
                const current = highYieldData.values[highYieldData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(highYieldData.values, highYieldData.dates);

                updates['highyield-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: highYieldData.values,
                    dates: this.generateMonthlyLabels(highYieldData.dates, highYieldData.values),
                    originalDates: highYieldData.dates,  // Preserve original dates for tooltips
                    observationDate: highYieldData.dates[highYieldData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'highYield'
                };
                console.log('📊 Updated High Yield Index:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Treasury 2yr - fetch 5+ years of data for long-term returns
            const treasury2yrData = await this.getFREDSeries(API_CONFIG.FRED.series.treasury2yr, 1900);
            if (treasury2yrData && treasury2yrData.values.length > 0) {
                const current = treasury2yrData.values[treasury2yrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(treasury2yrData.values, treasury2yrData.dates);

                updates['2yr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: treasury2yrData.values,
                    dates: this.generateMonthlyLabels(treasury2yrData.dates, treasury2yrData.values),
                    originalDates: treasury2yrData.dates,  // Preserve original dates for tooltips
                    observationDate: treasury2yrData.dates[treasury2yrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'treasury2yr'
                };
                console.log('Updated 2-Year Treasury:', current);
                treasury2yr = treasury2yrData;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Treasury 10yr - fetch 5+ years of data for long-term returns
            const treasury10yrData = await this.getFREDSeries(API_CONFIG.FRED.series.treasury10yr, 1900);
            if (treasury10yrData && treasury10yrData.values.length > 0) {
                const current = treasury10yrData.values[treasury10yrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(treasury10yrData.values, treasury10yrData.dates);

                updates['10yr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: treasury10yrData.values,
                    dates: this.generateMonthlyLabels(treasury10yrData.dates, treasury10yrData.values),
                    originalDates: treasury10yrData.dates,  // Preserve original dates for tooltips
                    observationDate: treasury10yrData.dates[treasury10yrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'treasury10yr'
                };
                console.log('Updated 10-Year Treasury:', current);
                treasury10yr = treasury10yrData;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // H8 Data
            const h8ChartMapping = {
                totalLoans: 'totalloans-chart',
                ciLoans: 'ciloans-chart',
                consumerLoans: 'consumerloans-chart',
                creLoans: 'creloans-chart',
                otherLoans: 'otherloans-chart',
                deposits: 'deposits-chart',
                largeTimeDeposits: 'largetime-chart',
                otherDeposits: 'otherdeposits-chart',
                borrowings: 'borrowings-chart'
            };

            for (const [key, seriesId] of Object.entries(API_CONFIG.FRED.series.h8Data)) {
                try {
                    console.log(`📊 Fetching H8 data for ${key} (${seriesId})`);
                    // Fetch 2 years of weekly data to ensure we have enough for YoY Quarter calculations
                    let h8Data = await this.getFREDSeries(seriesId, 104, 'w');  // 104 weeks = 2 years
                    if (!h8Data || h8Data.values.length < 2) {
                        console.log(`📊 H8 ${key} weekly data insufficient, trying daily...`);
                        h8Data = await this.getFREDSeries(seriesId, 730);  // 730 days = 2 years
                    }
                    console.log(`📊 H8 ${key} data:`, h8Data ? `${h8Data.values?.length} values, latest: ${h8Data.values?.[h8Data.values.length-1]}` : 'null');
                    if (h8Data && h8Data.values.length > 1) {
                        const current = h8Data.values[h8Data.values.length - 1];

                        // Calculate all H8 changes (WoW, QTD, YoY Quarter)
                        const h8Changes = this.calculateH8Changes(h8Data.values, h8Data.dates);

                        // For display, limit chart to 1 year but keep full data for calculations
                        const oneYearValues = h8Data.values.slice(-52);  // Last 52 weeks
                        const oneYearDates = h8Data.dates.slice(-52);

                        const chartId = h8ChartMapping[key];
                        if (chartId) {
                            // Borrowings is in millions, others are in billions
                            const divisor = key === 'borrowings' ? 1000000 : 1000;

                            updates[chartId] = {
                                current: current / divisor,  // Convert H8 values to trillions (borrowings: millions->trillions, others: billions->trillions)
                                change: h8Changes.WoW || 0,
                                changeType: (h8Changes.WoW || 0) >= 0 ? 'positive' : 'negative',
                                changeLabel: 'WoW',
                                historicalData: oneYearValues.map(v => v / divisor),  // Convert all H8 data to trillions for display
                                dates: this.generateMonthlyLabels(oneYearDates, oneYearValues),
                                originalDates: oneYearDates,  // Preserve original dates for tooltips
                                observationDate: h8Data.dates[h8Data.dates.length - 1],
                                seriesId: key,
                                // Add H8-specific changes
                                h8Changes: h8Changes
                            };
                            // Debug Large Time Deposits specifically
                            if (key === 'largeTimeDeposits') {
                                console.log(`🔍 LARGETIME H8 DEBUG: Key=${key}, ChartId=${chartId}, Raw Current=${current}, Divisor=${divisor}, Final Current=${updates[chartId].current}`, updates[chartId]);
                            }
                            console.log(`Updated H8 ${key}:`, updates[chartId].current, 'Changes:', h8Changes);
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (error) {
                    console.error(`Error fetching H8 ${key}:`, error);
                }
            }

        } catch (error) {
            console.error('Error updating economic data:', error);
        }

        // FINAL: Calculate 2s10s Spread AFTER all other data is processed
        try {
            if (treasury2yr && treasury10yr) {
                console.log('📊 Processing 2s10s spread as final step...');
                const spreadData = this.calculate2s10sHistorical(treasury2yr, treasury10yr);
                if (spreadData && spreadData.spreadValues.length > 0) {
                    // Calculate period returns for spread (in basis points)
                    const spreadReturns = this.calculateExtendedReturnsForRates(spreadData.spreadValues, spreadData.dates);

                    updates['spread-chart'] = {
                        current: spreadData.current,
                        change: spreadReturns['1W'] || 0,
                        changeType: (spreadReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                        changeLabel: '1W',
                        historicalData: spreadData.spreadValues,
                        dates: this.generateMonthlyLabels(spreadData.dates, spreadData.spreadValues),
                        originalDates: spreadData.dates,  // Preserve original dates for tooltips
                        observationDate: spreadData.dates[spreadData.dates.length - 1],
                        returns: spreadReturns,
                        seriesId: '2s10s'
                    };
                    console.log('✅ Updated 2s10s Spread:', spreadData.current, 'bps, Returns:', spreadReturns);
                }
            }
        } catch (error) {
            console.error('Error calculating 2s10s spread:', error);
        }

        console.log('📊 Data update complete. Updates:', Object.keys(updates).length);
        console.log('📊 Update keys:', Object.keys(updates));
        console.log('📊 Sample rate updates:', {
            fedfunds: updates['fedfunds-chart']?.current,
            tbill: updates['tbill-chart']?.current,
            treasury2yr: updates['2yr-chart']?.current,
            treasury10yr: updates['10yr-chart']?.current,
            spread: updates['spread-chart']?.current
        });
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