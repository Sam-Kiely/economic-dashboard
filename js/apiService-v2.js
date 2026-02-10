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

            // GDP (Already in QoQ Annualized format)
            console.log('📊 Fetching GDP data for series:', API_CONFIG.FRED.series.gdp);
            const gdpData = await this.getFREDSeries(API_CONFIG.FRED.series.gdp, 8, 'q');
            console.log('📊 GDP raw data:', gdpData ? `${gdpData.values?.length} values, latest: ${gdpData.values?.[gdpData.values.length-1]}` : 'null');

            if (gdpData && gdpData.values.length > 0) {
                const current = gdpData.values[gdpData.values.length - 1];
                const previous = gdpData.values.length > 1 ? gdpData.values[gdpData.values.length - 2] : current;
                const change = gdpData.values.length > 1 ? current - previous : 0;

                const gdpUpdate = {
                    current: current,
                    change: change,
                    changeType: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral',
                    changeLabel: 'QoQ',
                    historicalData: gdpData.values,
                    dates: gdpData.dates.map(d => this.formatDate(d, false, true)),
                    observationDate: gdpData.dates[gdpData.dates.length - 1],
                    seriesId: 'gdp'
                };

                updates['gdp-chart'] = gdpUpdate;
                console.log('📊 GDP update created:', gdpUpdate, `(${gdpData.values.length} values)`);
            } else {
                console.warn('📊 GDP data insufficient:', gdpData);
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

            // Jobless Claims
            const joblessData = await this.getFREDSeries(API_CONFIG.FRED.series.joblessClaims, 13);
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

            // Fed Funds Rate
            const fedFundsData = await this.getFREDSeries(API_CONFIG.FRED.series.fedFunds, 100);
            if (fedFundsData && fedFundsData.values.length > 0) {
                const current = fedFundsData.values[fedFundsData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(fedFundsData.values, fedFundsData.dates);

                updates['fedfunds-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: fedFundsData.values.slice(-30),
                    dates: fedFundsData.dates.slice(-30).map(d => this.formatDate(d)),
                    observationDate: fedFundsData.dates[fedFundsData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'fedFunds'
                };
                console.log('📊 Updated Fed Funds Rate:', current, 'Change:', extendedReturns['1W']);
                console.log('📊 Fed Funds update object:', updates['fedfunds-chart']);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 3-Month T-Bill
            const tbill3mData = await this.getFREDSeries(API_CONFIG.FRED.series.tbill3m, 100);
            if (tbill3mData && tbill3mData.values.length > 0) {
                const current = tbill3mData.values[tbill3mData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(tbill3mData.values, tbill3mData.dates);

                updates['tbill-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: tbill3mData.values.slice(-30),
                    dates: tbill3mData.dates.slice(-30).map(d => this.formatDate(d)),
                    observationDate: tbill3mData.dates[tbill3mData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'tbill3m'
                };
                console.log('Updated 3-Month T-Bill:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 1M SOFR
            const sofrData = await this.getFREDSeries(API_CONFIG.FRED.series.sofr1m, 100);
            if (sofrData && sofrData.values.length > 0) {
                const current = sofrData.values[sofrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(sofrData.values, sofrData.dates);

                updates['sofr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: sofrData.values.slice(-30),
                    dates: sofrData.dates.slice(-30).map(d => this.formatDate(d)),
                    observationDate: sofrData.dates[sofrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'sofr1m'
                };
                console.log('📊 Updated 1M SOFR:', current, 'Change:', extendedReturns['1W']);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Treasury 5yr
            const treasury5yrData = await this.getFREDSeries(API_CONFIG.FRED.series.treasury5yr, 100);
            if (treasury5yrData && treasury5yrData.values.length > 0) {
                const current = treasury5yrData.values[treasury5yrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(treasury5yrData.values, treasury5yrData.dates);

                updates['5yr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: treasury5yrData.values.slice(-30),
                    dates: treasury5yrData.dates.slice(-30).map(d => this.formatDate(d)),
                    observationDate: treasury5yrData.dates[treasury5yrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'treasury5yr'
                };
                console.log('📊 Updated 5-Year Treasury:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Treasury 30yr
            const treasury30yrData = await this.getFREDSeries(API_CONFIG.FRED.series.treasury30yr, 100);
            if (treasury30yrData && treasury30yrData.values.length > 0) {
                const current = treasury30yrData.values[treasury30yrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(treasury30yrData.values, treasury30yrData.dates);

                updates['30yr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: treasury30yrData.values.slice(-30),
                    dates: treasury30yrData.dates.slice(-30).map(d => this.formatDate(d)),
                    observationDate: treasury30yrData.dates[treasury30yrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'treasury30yr'
                };
                console.log('📊 Updated 30-Year Treasury:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // High Yield Index
            const highYieldData = await this.getFREDSeries(API_CONFIG.FRED.series.highYield, 100);
            if (highYieldData && highYieldData.values.length > 0) {
                const current = highYieldData.values[highYieldData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(highYieldData.values, highYieldData.dates);

                updates['highyield-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: highYieldData.values.slice(-30),
                    dates: highYieldData.dates.slice(-30).map(d => this.formatDate(d)),
                    observationDate: highYieldData.dates[highYieldData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'highYield'
                };
                console.log('📊 Updated High Yield Index:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Treasury 2yr
            const treasury2yrData = await this.getFREDSeries(API_CONFIG.FRED.series.treasury2yr, 100);
            if (treasury2yrData && treasury2yrData.values.length > 0) {
                const current = treasury2yrData.values[treasury2yrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(treasury2yrData.values, treasury2yrData.dates);

                updates['2yr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: treasury2yrData.values.slice(-30),
                    dates: treasury2yrData.dates.slice(-30).map(d => this.formatDate(d)),
                    observationDate: treasury2yrData.dates[treasury2yrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'treasury2yr'
                };
                console.log('Updated 2-Year Treasury:', current);
                treasury2yr = treasury2yrData;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Treasury 10yr
            const treasury10yrData = await this.getFREDSeries(API_CONFIG.FRED.series.treasury10yr, 100);
            if (treasury10yrData && treasury10yrData.values.length > 0) {
                const current = treasury10yrData.values[treasury10yrData.values.length - 1];
                const extendedReturns = this.calculateExtendedReturnsForRates(treasury10yrData.values, treasury10yrData.dates);

                updates['10yr-chart'] = {
                    current: current,
                    change: extendedReturns['1W'] || 0,
                    changeType: (extendedReturns['1W'] || 0) >= 0 ? 'positive' : 'negative',
                    changeLabel: '1W',
                    historicalData: treasury10yrData.values.slice(-30),
                    dates: treasury10yrData.dates.slice(-30).map(d => this.formatDate(d)),
                    observationDate: treasury10yrData.dates[treasury10yrData.dates.length - 1],
                    returns: extendedReturns,
                    seriesId: 'treasury10yr'
                };
                console.log('Updated 10-Year Treasury:', current);
                treasury10yr = treasury10yrData;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 2s10s Spread
            if (treasury2yr && treasury10yr) {
                const spreadData = this.calculate2s10sHistorical(treasury2yr, treasury10yr);
                if (spreadData) {
                    updates['spread-chart'] = {
                        current: spreadData.current,
                        change: spreadData.change,
                        changeType: spreadData.change >= 0 ? 'positive' : 'negative',
                        changeLabel: 'Daily',
                        historicalData: spreadData.spreadValues.slice(-30),
                        dates: spreadData.dates.slice(-30),
                        seriesId: '2s10s'
                    };
                    console.log('Updated 2s10s Spread:', spreadData.current);
                }
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
                    // Try weekly first, fallback to daily if no data
                    let h8Data = await this.getFREDSeries(seriesId, 13, 'w');
                    if (!h8Data || h8Data.values.length < 2) {
                        console.log(`📊 H8 ${key} weekly data insufficient, trying daily...`);
                        h8Data = await this.getFREDSeries(seriesId, 30);
                    }
                    console.log(`📊 H8 ${key} data:`, h8Data ? `${h8Data.values?.length} values, latest: ${h8Data.values?.[h8Data.values.length-1]}` : 'null');
                    if (h8Data && h8Data.values.length > 1) {
                        const current = h8Data.values[h8Data.values.length - 1];
                        const previous = h8Data.values[h8Data.values.length - 2];
                        const weeklyChange = ((current - previous) / previous) * 100;

                        const chartId = h8ChartMapping[key];
                        if (chartId) {
                            updates[chartId] = {
                                current: key === 'borrowings' ? current / 1000 : current,
                                change: weeklyChange,
                                changeType: weeklyChange >= 0 ? 'positive' : 'negative',
                                changeLabel: 'WoW',
                                historicalData: h8Data.values.map(v => key === 'borrowings' ? v / 1000 : v),
                                dates: h8Data.dates.map(d => this.formatDate(d, true)),
                                observationDate: h8Data.dates[h8Data.dates.length - 1],
                                seriesId: key
                            };
                            console.log(`Updated H8 ${key}:`, updates[chartId].current);
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

        console.log('📊 Data update complete. Updates:', Object.keys(updates).length);
        console.log('📊 Update keys:', Object.keys(updates));
        console.log('📊 Sample rate updates:', {
            fedfunds: updates['fedfunds-chart']?.current,
            tbill: updates['tbill-chart']?.current,
            treasury2yr: updates['2yr-chart']?.current,
            treasury10yr: updates['10yr-chart']?.current
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