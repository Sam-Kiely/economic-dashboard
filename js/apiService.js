// API Service Layer with CORS proxy - WITH DATE ALIGNMENT FIXES
class APIService {
    constructor() {
        this.cache = {};
        this.lastFetch = {};
        // Use Vercel API routes instead of CORS proxy
        this.useVercelAPI = true;
        // Fallback to CORS proxy if Vercel API fails
        this.corsProxy = 'https://corsproxy.io/?';
    }

    // Helper method to filter observations by frequency
    filterByFrequency(observations, frequency) {
        if (!frequency || frequency === 'd') {
            return observations; // Return all for daily
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
                case 'w': // Weekly - at least 7 days apart
                    shouldInclude = (currentDate - lastDate) >= (7 * 24 * 60 * 60 * 1000);
                    break;
                case 'm': // Monthly - different month
                    shouldInclude = currentDate.getMonth() !== lastDate.getMonth() ||
                                  currentDate.getFullYear() !== lastDate.getFullYear();
                    break;
                case 'q': // Quarterly - at least 3 months apart
                    const monthDiff = (currentDate.getFullYear() - lastDate.getFullYear()) * 12 +
                                    (currentDate.getMonth() - lastDate.getMonth());
                    shouldInclude = monthDiff >= 3;
                    break;
                case 'a': // Annual - different year
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

    // Generic fetch with caching and CORS handling - WITH CORPORATE ENVIRONMENT SUPPORT
    async fetchWithCache(url, cacheKey, cacheDuration = 300000, forceRefresh = false) {
        const now = Date.now();

        // Use longer cache duration in corporate environments
        if (window.networkManager && window.networkManager.isCorporateNetwork) {
            cacheDuration = window.networkManager.getCacheDuration(cacheDuration);
        }

        // Check cache (unless force refresh)
        if (!forceRefresh && this.cache[cacheKey] && this.lastFetch[cacheKey] &&
            (now - this.lastFetch[cacheKey] < cacheDuration)) {
            console.log(`Using cached data for ${cacheKey} (corporate cache: ${cacheDuration}ms)`);
            return this.cache[cacheKey];
        }

        // Show loading state
        if (window.loadingManager) {
            window.loadingManager.showServiceLoading('apiService', `Fetching ${cacheKey}...`);
        }

        // Skip CORS proxy for Vercel API calls
        if (this.useVercelAPI) {
            // This method should not be used with Vercel API
            // Return error to trigger fallback to direct API calls
            throw new Error('Use Vercel API routes instead of fetchWithCache');
        }

        // Define CORS proxies (primary and fallback)
        const proxies = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url='
        ];

        let lastError = null;

        // Try each proxy
        for (let proxyIndex = 0; proxyIndex < proxies.length; proxyIndex++) {
            const currentProxy = proxies[proxyIndex];
            
            // Retry logic with exponential backoff for current proxy
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    // Add CORS proxy
                    const fetchUrl = this.useProxy ? currentProxy + encodeURIComponent(url) : url;
                    console.log(`Fetching: ${cacheKey} (proxy ${proxyIndex + 1}/${proxies.length}, attempt ${attempt + 1}/3)`);

                    const response = await fetch(fetchUrl);
                    
                    // Check for server errors that should trigger retry
                    if (response.status === 500 || response.status === 502 || response.status === 503) {
                        throw new Error(`Server error! status: ${response.status}`);
                    }
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    this.cache[cacheKey] = data;
                    this.lastFetch[cacheKey] = now;
                    console.log(`Successfully fetched ${cacheKey}`);
                    
                    // Hide loading state on success
                    if (window.loadingManager) {
                        window.loadingManager.hideServiceLoading('apiService');
                    }
                    
                    return data;
                    
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} failed for ${cacheKey}: ${error.message}`);

                    // If it's a 500/502/503 error and not the last attempt, wait and retry
                    if ((error.message.includes('500') || error.message.includes('502') || error.message.includes('503'))
                        && attempt < 2) {
                        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
                        console.log(`Waiting ${waitTime/1000} seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    } else if (attempt === 2 && proxyIndex < proxies.length - 1) {
                        // Failed all attempts with this proxy, try next proxy
                        console.log(`All attempts failed with ${currentProxy}, trying fallback proxy...`);
                        break;
                    } else if (!error.message.includes('500') && !error.message.includes('502') && !error.message.includes('503')) {
                        // Non-retryable error, break out of retry loop
                        break;
                    }
                }
            }
        }
        
        // All proxies and retries failed
        console.error(`Error fetching ${cacheKey} after all retries:`, lastError.message);
        // Return cached data if available, even if expired
        if (this.cache[cacheKey]) {
            console.log(`Using expired cache for ${cacheKey}`);
            return this.cache[cacheKey];
        }

        // Hide loading state before returning
        if (window.loadingManager) {
            window.loadingManager.hideServiceLoading('apiService');
        }

        throw lastError;
    }

    // FRED API Methods
    async getFREDSeries(seriesId, limit = 13, frequency = null, forceRefresh = false) {
        try {
            // Check if we're in production/preview (has vercel domain or localhost for testing)
            const isVercelEnvironment = window.location.hostname.includes('vercel.app') ||
                                       window.location.hostname === 'localhost' ||
                                       window.location.hostname === '127.0.0.1';

            // Try using Vercel API route first
            if (this.useVercelAPI && isVercelEnvironment) {
                // Calculate date range for limit
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date();

                // Calculate start date based on limit and frequency
                if (frequency === 'd' || !frequency) {
                    startDate.setDate(startDate.getDate() - (limit * 2)); // Extra buffer for daily data
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
                        // Filter out any "." values (missing data) and apply frequency filter
                        let validObservations = data.observations
                            .filter(obs => obs.value !== '.' && !isNaN(parseFloat(obs.value)));

                        // Apply frequency filtering if specified
                        if (frequency) {
                            validObservations = this.filterByFrequency(validObservations, frequency);
                        }

                        // Sort by date descending and limit
                        validObservations.sort((a, b) => new Date(b.date) - new Date(a.date));
                        validObservations = validObservations.slice(0, limit);

                        // Reverse to get chronological order
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
                    console.warn(`Vercel API failed for ${seriesId}, falling back to direct FRED API with CORS proxy`);
                }
            }
        } catch (vercelError) {
            console.warn(`Vercel API error for ${seriesId}:`, vercelError.message, 'Falling back to CORS proxy');
        }

        // Fallback to original CORS proxy method
        // Build URL with optional frequency parameter
        let url = `${API_CONFIG.FRED.baseURL}?series_id=${seriesId}&api_key=${API_CONFIG.FRED.apiKey}&file_type=json&limit=${limit}&sort_order=desc`;

        // Add frequency parameter if specified
        if (frequency) {
            url += `&frequency=${frequency}`;
        }

        try {
            const cacheKey = `fred_${seriesId}_${frequency || 'default'}`;
            const data = await this.fetchWithCache(url, cacheKey, API_CONFIG.UPDATE_INTERVALS.economic, forceRefresh);
            
            if (data && data.observations && data.observations.length > 0) {
                // Filter out any "." values (missing data)
                const validObservations = data.observations
                    .filter(obs => obs.value !== '.' && !isNaN(parseFloat(obs.value)))
                    .reverse(); // Reverse to get chronological order
                
                if (validObservations.length > 0) {
                    return {
                        values: validObservations.map(obs => parseFloat(obs.value)),
                        dates: validObservations.map(obs => obs.date),
                        seriesId: seriesId  // Include seriesId for date adjustment
                    };
                }
            }
        } catch (error) {
            console.error(`FRED API error for ${seriesId}:`, error);
        }
        return null;
    }

    // FIXED: Helper method to format dates properly based on FRED's convention
    // FRED uses the FIRST day of the period as the observation date
    formatDate(dateString, isWeekly = false, isQuarterly = false, seriesId = null) {
        // Parse date string explicitly to avoid timezone issues
        // FRED dates are in YYYY-MM-DD format
        const parts = dateString.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(parts[2]);
        const date = new Date(year, month, day);
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Debug logging to verify date parsing
        if (seriesId === 'gdp' || isQuarterly) {
            console.log(`Formatting quarterly date: ${dateString} -> Parsed month: ${month} (${months[month]})`);
        }
        
        if (isWeekly) {
            // For weekly data (jobless claims), show the week ending date
            const displayMonth = month + 1; // Convert back to 1-indexed for display
            const displayDay = day;
            return `${displayMonth}/${displayDay}`;
        } else if (isQuarterly) {
            // For quarterly data: FRED uses the FIRST day of the quarter
            // Month 0-2 (Jan-Mar) = Q1
            // Month 3-5 (Apr-Jun) = Q2  
            // Month 6-8 (Jul-Sep) = Q3
            // Month 9-11 (Oct-Dec) = Q4
            let quarter;
            
            if (month <= 2) {
                quarter = 1; // Jan-Mar = Q1
            } else if (month <= 5) {
                quarter = 2; // Apr-Jun = Q2
            } else if (month <= 8) {
                quarter = 3; // Jul-Sep = Q3
            } else {
                quarter = 4; // Oct-Dec = Q4
            }
            
            const yearShort = year.toString().substr(2);
            const formattedQuarter = `Q${quarter}'${yearShort}`;
            
            // Debug log for quarterly formatting
            console.log(`  -> Month ${month} (${months[month]}) = Q${quarter} -> Formatted as: ${formattedQuarter}`);
            
            return formattedQuarter;
        } else {
            // For monthly data: FRED uses the FIRST day of the month
            // The observation date directly represents the month being measured
            const monthName = months[month];
            const yearShort = year.toString().substr(2);
            return `${monthName} '${yearShort}`;
        }
    }



    // Calculate extended returns for rates data (similar to Yahoo Finance but for FRED)
    calculateExtendedReturnsForRates(values, dates) {
        if (!values || !dates || values.length === 0) {
            return {};
        }

        const currentValue = values[values.length - 1];
        const currentDate = new Date(dates[dates.length - 1]);
        const returns = {};

        // Helper function to find closest trading day
        const findClosestValue = (targetDate, direction = 'before') => {
            let bestIndex = -1;
            let bestDistance = Infinity;

            for (let i = 0; i < dates.length; i++) {
                const dataDate = new Date(dates[i]);
                const timeDiff = dataDate.getTime() - targetDate.getTime();
                const daysDiff = Math.abs(timeDiff / (1000 * 60 * 60 * 24));

                // Skip weekends for daily data
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

        // Calculate returns for each period
        const periods = [
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
                // For YTD, find the first trading day of the current year
                const yearStart = new Date(currentDate.getFullYear(), 0, 1);
                targetValue = findClosestValue(yearStart, 'after');
            } else {
                // Calculate target date going back the specified number of days
                const targetDate = new Date(currentDate);
                targetDate.setDate(currentDate.getDate() - period.days);
                targetValue = findClosestValue(targetDate, 'before');
            }

            if (targetValue !== null && targetValue !== 0) {
                // For rates, calculate the basis point change (current - historical)
                returns[period.key] = (currentValue - targetValue) * 100; // Convert to basis points
            }
        }

        return returns;
    }

    // Calculate historical 2s10s spread from individual treasury series
    calculate2s10sHistorical(treasury2Data, treasury10Data) {
        if (!treasury2Data || !treasury10Data || 
            !treasury2Data.values || !treasury10Data.values ||
            treasury2Data.values.length === 0 || treasury10Data.values.length === 0) {
            return null;
        }

        const spreadValues = [];
        const alignedDates = [];

        // Find common dates between 2yr and 10yr data
        const dates2yr = treasury2Data.dates;
        const dates10yr = treasury10Data.dates;
        const values2yr = treasury2Data.values;
        const values10yr = treasury10Data.values;

        // Create a map for faster lookup
        const data10yrMap = new Map();
        dates10yr.forEach((date, index) => {
            data10yrMap.set(date, values10yr[index]);
        });

        // Calculate spread for each 2yr date that has matching 10yr data
        dates2yr.forEach((date, index) => {
            const value2yr = values2yr[index];
            const value10yr = data10yrMap.get(date);
            
            if (value10yr !== undefined && value2yr !== null && value10yr !== null) {
                const spread = (value10yr - value2yr) * 100; // Convert to basis points
                spreadValues.push(spread);
                alignedDates.push(date);
            }
        });

        if (spreadValues.length < 2) {
            return null;
        }

        // Calculate daily change
        const currentSpread = spreadValues[spreadValues.length - 1];
        const previousSpread = spreadValues[spreadValues.length - 2];
        const change = currentSpread - previousSpread;

        return {
            spreadValues: spreadValues,
            dates: alignedDates.map(d => this.formatDate(d)), // Format for display
            change: change,
            current: currentSpread
        };
    }

    // Test API connections
    async testConnections() {
        console.log('Testing API connections...');

        // Check if we're in Vercel environment
        const isVercelEnvironment = window.location.hostname.includes('vercel.app') ||
                                   window.location.hostname === 'localhost' ||
                                   window.location.hostname === '127.0.0.1';

        if (isVercelEnvironment) {
            console.log('FRED API: ✓ Using Vercel API routes');
            console.log('Yahoo Finance API: ✓ Using Vercel API routes');
        } else {
            // Test FRED with direct API
            try {
                const fredTest = await this.getFREDSeries('UNRATE', 1);
                console.log('FRED API:', fredTest ? '✓ Connected' : '✗ Failed');
            } catch (e) {
                console.log('FRED API: ✗ Failed -', e.message);
            }
        }
    }

    // Main update method - expanded to include all indicators with more historical data
    async updateAllData() {
        const updates = {};
        console.log('Starting data update...');

        // Store treasury values for 2s10s calculation
        let treasury2yr = null;
        let treasury10yr = null;

        // Update Economic Data (FRED)
        try {
            // FIXED: Core CPI (YoY calculation) - Get 24 months for YoY
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
                    
                    // Debug log to verify CPI data alignment
                    console.log(`Core CPI - Last observation date: ${yoyDates[yoyDates.length - 1]}, YoY Value: ${currentYoY.toFixed(2)}%`);
                    
                    updates['corecpi-chart'] = {
                        current: currentYoY,
                        change: currentYoY - previousYoY,  // MoM change in YoY
                        changeType: (currentYoY - previousYoY) > 0 ? 'negative' : 'positive',
                        changeLabel: 'MoM',
                        historicalData: yoyValues.slice(-12),
                        dates: yoyDates.slice(-12).map(d => this.formatDate(d, false, false, 'coreCPI')),
                        observationDate: yoyDates[yoyDates.length - 1],  // Use YoY date, not raw date
                        seriesId: 'coreCPI'
                    };
                    console.log('Updated Core CPI YoY:', currentYoY);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // FIXED: Core PPI (YoY calculation) - Get 24 months for YoY
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
                        change: currentYoY - previousYoY,  // MoM change in YoY
                        changeType: (currentYoY - previousYoY) > 0 ? 'negative' : 'positive',
                        changeLabel: 'MoM',
                        historicalData: yoyValues.slice(-12),
                        dates: yoyDates.slice(-12).map(d => this.formatDate(d, false, false, 'corePPI')),
                        observationDate: yoyDates[yoyDates.length - 1],  // Use YoY date, not raw date
                        seriesId: 'corePPI'
                    };
                    console.log('Updated Core PPI YoY:', currentYoY);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // FIXED: Core PCE (YoY calculation) - Get 24 months for YoY
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
                        change: currentYoY - previousYoY,  // MoM change in YoY
                        changeType: (currentYoY - previousYoY) > 0 ? 'negative' : 'positive',
                        changeLabel: 'MoM',
                        historicalData: yoyValues.slice(-12),
                        dates: yoyDates.slice(-12).map(d => this.formatDate(d, false, false, 'corePCE')),
                        observationDate: yoyDates[yoyDates.length - 1],  // Use YoY date, not raw date
                        seriesId: 'corePCE'
                    };
                    console.log('Updated Core PCE YoY:', currentYoY);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // FIXED: GDP (Already in QoQ Annualized format from FRED!)
            const gdpData = await this.getFREDSeries(API_CONFIG.FRED.series.gdp, 8, 'q');
            if (gdpData && gdpData.values.length > 1) {
                // A191RL1Q225SBEA already gives us the QoQ annualized growth rate
                const current = gdpData.values[gdpData.values.length - 1];
                const previous = gdpData.values[gdpData.values.length - 2];
                
                // Debug log to verify GDP data alignment
                console.log(`GDP Data - Last observation date: ${gdpData.dates[gdpData.dates.length - 1]}, Value: ${current}%`);
                
                updates['gdp-chart'] = {
                    current: current,  // Already a percentage
                    change: current - previous,
                    changeType: current > previous ? 'positive' : 'negative',
                    changeLabel: 'QoQ',
                    historicalData: gdpData.values,
                    dates: gdpData.dates.map(d => this.formatDate(d, false, true, 'gdp')), // isQuarterly = true
                    observationDate: gdpData.dates[gdpData.dates.length - 1],
                    seriesId: 'gdp'
                };
                console.log('Updated GDP QoQ:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Trade Deficit (MoM) - Note: negative values mean deficit
            const tradeData = await this.getFREDSeries(API_CONFIG.FRED.series.tradeDeficit, 13, 'm');
            if (tradeData && tradeData.values.length > 1) {
                const current = Math.abs(tradeData.values[tradeData.values.length - 1]); // Show as positive number
                const previous = Math.abs(tradeData.values[tradeData.values.length - 2]);
                const momChange = ((current - previous) / previous) * 100;
                
                updates['trade-chart'] = {
                    current: current / 1000, // Convert to billions
                    change: momChange,
                    changeType: momChange > 0 ? 'negative' : 'positive', // Increasing deficit is negative
                    changeLabel: 'MoM',
                    historicalData: tradeData.values.slice(-12).map(v => Math.abs(v) / 1000),
                    dates: tradeData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: tradeData.dates[tradeData.dates.length - 1],
                    seriesId: 'tradeDeficit'
                };
                console.log('Updated Trade Deficit:', current / 1000, 'billion');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // FIXED: Unemployment Rate (MoM) - Get 13 months
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

            // FIXED: Initial Jobless Claims (WoW) - Get 13 weeks
            const joblessData = await this.getFREDSeries(API_CONFIG.FRED.series.joblessClaims, 13);
            if (joblessData && joblessData.values.length > 1) {
                const current = joblessData.values[joblessData.values.length - 1];
                const previous = joblessData.values[joblessData.values.length - 2];
                
                updates['jobless-chart'] = {
                    current: current / 1000, // Convert to thousands
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

            // FIXED: Retail Sales (Already in MoM% format from FRED)
            const retailData = await this.getFREDSeries(API_CONFIG.FRED.series.retailSales, 13, 'm');
            if (retailData && retailData.values.length > 1) {
                // MRTSMPCSM44000USS already provides MoM% change values
                const current = retailData.values[retailData.values.length - 1];
                const previous = retailData.values[retailData.values.length - 2];
                
                updates['retail-chart'] = {
                    current: current,  // Already a MoM percentage
                    change: current - previous,  // Arithmetic difference between MoM percentages
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

            // FIXED: Durable Goods Orders (MoM)
            const durableGoodsData = await this.getFREDSeries(API_CONFIG.FRED.series.durableGoods, 14, 'm');
            if (durableGoodsData && durableGoodsData.values.length > 2) {
                // Calculate MoM % changes for all periods
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
                        change: currentMoM - previousMoM,  // Arithmetic difference
                        changeType: currentMoM > 0 ? 'positive' : 'negative',
                        changeLabel: 'MoM',
                        historicalData: momChanges.slice(-12),
                        dates: momDates.slice(-12).map(d => this.formatDate(d)),
                        observationDate: momDates[momDates.length - 1],  // Use MoM date, not raw date
                        seriesId: 'durableGoods'
                    };
                    console.log('Updated Durable Goods MoM:', currentMoM);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // FIXED: New Home Sales (MoM)
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

            // FIXED: Existing Home Sales (MoM) - Data comes as raw number, needs conversion to millions
            const existingHomeSalesData = await this.getFREDSeries(API_CONFIG.FRED.series.existingHomeSales, 13, 'm');
            if (existingHomeSalesData && existingHomeSalesData.values.length > 1) {
                // Data comes as raw number (e.g., 3930000), convert to millions
                const current = existingHomeSalesData.values[existingHomeSalesData.values.length - 1] / 1000000;
                const previous = existingHomeSalesData.values[existingHomeSalesData.values.length - 2] / 1000000;
                const momChange = ((current - previous) / previous) * 100;
                
                updates['existinghomes-chart'] = {
                    current: current,  // Now in millions (3.93 instead of 3930000)
                    change: momChange,
                    changeType: momChange > 0 ? 'positive' : 'negative',
                    changeLabel: 'MoM',
                    historicalData: existingHomeSalesData.values.slice(-12).map(v => v / 1000000),
                    dates: existingHomeSalesData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: existingHomeSalesData.dates[existingHomeSalesData.dates.length - 1],
                    seriesId: 'existingHomeSales'
                };
                console.log('Updated Existing Home Sales:', current.toFixed(1), 'million');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // FIXED: Consumer Sentiment (MoM)
            const sentimentData = await this.getFREDSeries(API_CONFIG.FRED.series.consumerSentiment, 13, 'm');
            if (sentimentData && sentimentData.values.length > 1) {
                const current = sentimentData.values[sentimentData.values.length - 1];
                const previous = sentimentData.values[sentimentData.values.length - 2];
                const momChange = current - previous;
                
                updates['sentiment-chart'] = {
                    current: current,
                    change: momChange,
                    changeType: momChange > 0 ? 'positive' : 'negative',
                    changeLabel: 'MoM',
                    historicalData: sentimentData.values.slice(-12),
                    dates: sentimentData.dates.slice(-12).map(d => this.formatDate(d)),
                    observationDate: sentimentData.dates[sentimentData.dates.length - 1],
                    seriesId: 'consumerSentiment'
                };
                console.log('Updated Consumer Sentiment:', current);
            }

            // RATES SECTION - Get all rates data

            // 2-Year Treasury - Get 2000 days of daily data for 3Y/5Y calculations
            const treasury2Data = await this.getFREDSeries(API_CONFIG.FRED.series.treasury2yr, 2000, 'd');
            if (treasury2Data && treasury2Data.values.length > 1) {
                const current = treasury2Data.values[treasury2Data.values.length - 1];
                const previous = treasury2Data.values[treasury2Data.values.length - 2];
                treasury2yr = current;
                
                const extendedReturns2yr = this.calculateExtendedReturnsForRates(treasury2Data.values, treasury2Data.dates);
                updates['2yr-chart'] = {
                    current: current,
                    change: (current - previous) * 100,
                    changeType: current > previous ? 'negative' : 'positive',
                    historicalData: treasury2Data.values,
                    dates: treasury2Data.dates.map(d => this.formatDate(d)),
                    observationDate: treasury2Data.dates[treasury2Data.dates.length - 1],
                    seriesId: 'treasury2yr',
                    extendedReturns: extendedReturns2yr
                };
                console.log('Updated 2-year treasury:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 5-Year Treasury - Get 2000 days of daily data for 3Y/5Y calculations
            const treasury5Data = await this.getFREDSeries(API_CONFIG.FRED.series.treasury5yr, 2000, 'd');
            if (treasury5Data && treasury5Data.values.length > 1) {
                const current = treasury5Data.values[treasury5Data.values.length - 1];
                const previous = treasury5Data.values[treasury5Data.values.length - 2];
                
                const extendedReturns5yr = this.calculateExtendedReturnsForRates(treasury5Data.values, treasury5Data.dates);
                updates['5yr-chart'] = {
                    current: current,
                    change: (current - previous) * 100,
                    changeType: current > previous ? 'negative' : 'positive',
                    historicalData: treasury5Data.values,
                    dates: treasury5Data.dates.map(d => this.formatDate(d)),
                    observationDate: treasury5Data.dates[treasury5Data.dates.length - 1],
                    seriesId: 'treasury5yr',
                    extendedReturns: extendedReturns5yr
                };
                console.log('Updated 5-year treasury:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 10-Year Treasury - Get 365 days of daily data
            const treasury10Data = await this.getFREDSeries(API_CONFIG.FRED.series.treasury10yr, 365, 'd');
            if (treasury10Data && treasury10Data.values.length > 1) {
                const current = treasury10Data.values[treasury10Data.values.length - 1];
                const previous = treasury10Data.values[treasury10Data.values.length - 2];
                treasury10yr = current;
                
                const extendedReturns10yr = this.calculateExtendedReturnsForRates(treasury10Data.values, treasury10Data.dates);
                updates['10yr-chart'] = {
                    current: current,
                    change: (current - previous) * 100,
                    changeType: current > previous ? 'negative' : 'positive',
                    historicalData: treasury10Data.values,
                    dates: treasury10Data.dates.map(d => this.formatDate(d)),
                    observationDate: treasury10Data.dates[treasury10Data.dates.length - 1],
                    seriesId: 'treasury10yr',
                    extendedReturns: extendedReturns10yr
                };
                console.log('Updated 10-year treasury:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 30-Year Treasury - Get 365 days of daily data
            const treasury30Data = await this.getFREDSeries(API_CONFIG.FRED.series.treasury30yr, 365, 'd');
            if (treasury30Data && treasury30Data.values.length > 1) {
                const current = treasury30Data.values[treasury30Data.values.length - 1];
                const previous = treasury30Data.values[treasury30Data.values.length - 2];
                
                const extendedReturns30yr = this.calculateExtendedReturnsForRates(treasury30Data.values, treasury30Data.dates);
                updates['30yr-chart'] = {
                    current: current,
                    change: (current - previous) * 100,
                    changeType: current > previous ? 'negative' : 'positive',
                    historicalData: treasury30Data.values,
                    dates: treasury30Data.dates.map(d => this.formatDate(d)),
                    observationDate: treasury30Data.dates[treasury30Data.dates.length - 1],
                    seriesId: 'treasury30yr',
                    extendedReturns: extendedReturns30yr
                };
                console.log('Updated 30-year treasury:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 1-Month Term SOFR - Get 365 days of daily data
            const sofrData = await this.getFREDSeries(API_CONFIG.FRED.series.sofr1m, 365, 'd');
            if (sofrData && sofrData.values.length > 1) {
                const current = sofrData.values[sofrData.values.length - 1];
                const previous = sofrData.values[sofrData.values.length - 2];
                
                const extendedReturnsSofr = this.calculateExtendedReturnsForRates(sofrData.values, sofrData.dates);
                updates['sofr-chart'] = {
                    current: current,
                    change: (current - previous) * 100,
                    changeType: current > previous ? 'negative' : 'positive',
                    historicalData: sofrData.values,
                    dates: sofrData.dates.map(d => this.formatDate(d)),
                    observationDate: sofrData.dates[sofrData.dates.length - 1],
                    seriesId: 'sofr1m',
                    extendedReturns: extendedReturnsSofr
                };
                console.log('Updated 1-month SOFR proxy:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // Federal Funds Upper Target - Get 2000 days of daily data for 3Y/5Y calculations
            const fedFundsData = await this.getFREDSeries(API_CONFIG.FRED.series.fedFunds, 2000, 'd', true);
            if (fedFundsData && fedFundsData.values.length > 1) {
                const current = fedFundsData.values[fedFundsData.values.length - 1];
                const previous = fedFundsData.values[fedFundsData.values.length - 2];
                
                const extendedReturnsFedFunds = this.calculateExtendedReturnsForRates(fedFundsData.values, fedFundsData.dates);
                updates['fedfunds-chart'] = {
                    current: current,
                    change: (current - previous) * 100,
                    changeType: current > previous ? 'negative' : 'positive',
                    historicalData: fedFundsData.values,
                    dates: fedFundsData.dates.map(d => this.formatDate(d)),
                    observationDate: fedFundsData.dates[fedFundsData.dates.length - 1],
                    seriesId: 'fedFunds',
                    extendedReturns: extendedReturnsFedFunds
                };
                console.log('Updated fed funds upper target:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // 3-Month Treasury Bill - Get 365 days of daily data
            const tbillData = await this.getFREDSeries(API_CONFIG.FRED.series.tbill3m, 365, 'd');
            if (tbillData && tbillData.values.length > 1) {
                const current = tbillData.values[tbillData.values.length - 1];
                const previous = tbillData.values[tbillData.values.length - 2];
                
                const extendedReturnsTbill = this.calculateExtendedReturnsForRates(tbillData.values, tbillData.dates);
                updates['tbill-chart'] = {
                    current: current,
                    change: (current - previous) * 100,
                    changeType: current > previous ? 'negative' : 'positive',
                    historicalData: tbillData.values,
                    dates: tbillData.dates.map(d => this.formatDate(d)),
                    observationDate: tbillData.dates[tbillData.dates.length - 1],
                    seriesId: 'tbill3m',
                    extendedReturns: extendedReturnsTbill
                };
                console.log('Updated 3-month T-bill:', current);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            // ICE BofA US High Yield Index - Get 365 days of daily data
            const highYieldData = await this.getFREDSeries(API_CONFIG.FRED.series.highYield, 365, 'd');
            if (highYieldData && highYieldData.values.length > 1) {
                const current = highYieldData.values[highYieldData.values.length - 1];
                const previous = highYieldData.values[highYieldData.values.length - 2];
                
                const extendedReturnsHighYield = this.calculateExtendedReturnsForRates(highYieldData.values, highYieldData.dates);
                updates['highyield-chart'] = {
                    current: current,
                    change: (current - previous) * 100,
                    changeType: current > previous ? 'negative' : 'positive',
                    historicalData: highYieldData.values,
                    dates: highYieldData.dates.map(d => this.formatDate(d)),
                    observationDate: highYieldData.dates[highYieldData.dates.length - 1],
                    seriesId: 'highYield',
                    extendedReturns: extendedReturnsHighYield
                };
                console.log('Updated high yield index:', current);
            }
            
            console.log('✅ APIService: Removed references to undefined mortgage30yr and primeRate series');

            // Calculate 2s10s spread if we have both values
            if (treasury2yr !== null && treasury10yr !== null) {
                const spread = (treasury10yr - treasury2yr) * 100;
                console.log('2s10s spread:', spread.toFixed(0), 'bps');
                
                // Calculate historical 2s10s spread
                const historicalSpread = this.calculate2s10sHistorical(treasury2Data, treasury10Data);
                if (historicalSpread) {
                    updates['spread-chart'] = {
                        current: spread / 100, // Convert back to percentage points for consistency
                        change: historicalSpread.change,
                        changeType: historicalSpread.change > 0 ? 'positive' : 'negative',
                        changeLabel: '1D',
                        historicalData: historicalSpread.spreadValues,
                        dates: historicalSpread.dates,
                        observationDate: treasury10Data.dates[treasury10Data.dates.length - 1],
                        seriesId: '2s10sSpread'
                    };
                }
            }

        } catch (error) {
            console.error('Error updating economic data:', error);
        }

        // Bitcoin data now comes from Yahoo Finance service via market updater

        console.log('Data update complete. Updates:', Object.keys(updates).length);
        return updates;
    }
}

// Create global instance and attach to window
const apiService = new APIService();
window.apiService = apiService;

console.log('✅ APIService: Created and attached to window.apiService');

// Quick diagnostic function to check current GDP data
window.checkGDPDates = function() {
    console.log("=== GDP Date Diagnostic ===");
    
    // Check if we have cached GDP data
    const cacheKey = 'fred_A191RL1Q225SBEA_q';
    if (apiService.cache && apiService.cache[cacheKey]) {
        const gdpData = apiService.cache[cacheKey];
        console.log("Found cached GDP data");
        
        if (gdpData.observations && gdpData.observations.length > 0) {
            // Take last 5 observations
            const recent = gdpData.observations.slice(-5).reverse();
            console.log("\nLast 5 GDP observations:");
            console.log("Raw Date -> Expected Quarter -> Actual Formatted");
            console.log("-------------------------------------------------");
            
            recent.forEach(obs => {
                const rawDate = obs.date;
                const value = obs.value;
                
                // Parse the date manually
                const parts = rawDate.split('-');
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // 0-indexed
                
                // Determine expected quarter
                let expectedQuarter;
                if (month <= 2) expectedQuarter = 1;
                else if (month <= 5) expectedQuarter = 2;
                else if (month <= 8) expectedQuarter = 3;
                else expectedQuarter = 4;
                
                // Format using our function
                const formatted = apiService.formatDate(rawDate, false, true, 'gdp');
                
                console.log(`${rawDate} -> Q${expectedQuarter}'${year.toString().substr(2)} -> ${formatted} | Value: ${value}%`);
            });
        }
    } else {
        console.log("No cached GDP data found. Try refreshing the dashboard first.");
    }
    
    console.log("\n=== End Diagnostic ===");
};

// Test function to debug date formatting
window.testDateFormatting = function() {
    console.log("=== Testing Date Formatting Logic ===");
    
    // Test quarterly dates (GDP)
    const quarterlyTests = [
        { date: "2025-01-01", expected: "Q1'25", description: "Q1 2025" },
        { date: "2025-04-01", expected: "Q2'25", description: "Q2 2025" },
        { date: "2025-07-01", expected: "Q3'25", description: "Q3 2025" },
        { date: "2025-10-01", expected: "Q4'25", description: "Q4 2025" }
    ];
    
    console.log("\nQuarterly Date Tests (GDP):");
    console.log("----------------------------");
    quarterlyTests.forEach(test => {
        const result = apiService.formatDate(test.date, false, true, 'gdp');
        const passed = result === test.expected;
        console.log(`${test.description}: ${test.date} -> ${result} ${passed ? '✓' : '✗ (expected ' + test.expected + ')'}`);
    });
    
    // Test monthly dates
    const monthlyTests = [
        { date: "2025-07-01", expected: "Jul '25", description: "July 2025" },
        { date: "2025-06-01", expected: "Jun '25", description: "June 2025" },
        { date: "2025-05-01", expected: "May '25", description: "May 2025" }
    ];
    
    console.log("\nMonthly Date Tests:");
    console.log("--------------------");
    monthlyTests.forEach(test => {
        const result = apiService.formatDate(test.date, false, false, 'coreCPI');
        const passed = result === test.expected;
        console.log(`${test.description}: ${test.date} -> ${result} ${passed ? '✓' : '✗ (expected ' + test.expected + ')'}`);
    });
    
    // Check actual cached GDP data
    console.log("\n=== Checking Actual Cached GDP Data ===");
    checkGDPDates();
};

// Test connections after a delay
window.addEventListener('load', () => {
    setTimeout(() => {
        apiService.testConnections();
        console.log("Diagnostic functions available:");
        console.log("  - testDateFormatting() : Test date formatting logic");
        console.log("  - checkGDPDates()      : Check actual GDP date alignment");
    }, 3000);
});