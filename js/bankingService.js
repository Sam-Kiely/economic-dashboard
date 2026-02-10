// Banking Service - Handles H.8 Federal Reserve Data and Peer Bank Comparisons
class BankingService {
    constructor() {
        this.h8Data = {};
        this.peerData = [];
        this.updateInProgress = false;
        this.initializeInProgress = false;
        this.charts = {};
        this.currentSortColumn = 'change1w';
        this.currentSortDirection = 'desc';
    }

    // Initialize banking tab
    async init() {
        console.log('✅ Banking service: Initializing Banking Service...');

        // Prevent multiple initializations
        if (this.initializeInProgress) {
            console.log('ℹ️ Banking service: Initialization already in progress, skipping...');
            return;
        }
        this.initializeInProgress = true;

        try {
            this.initBankingCharts();
            this.initSortableTable();

            // Ensure apiService is available
            const apiServiceReady = await this.ensureApiService();
            if (apiServiceReady) {
                await this.updateBankingTab();
            } else {
                console.error('❌ Banking service: Could not initialize apiService, banking data will not be available');
                // Show error state in UI
                this.showErrorState();
            }
        } catch (error) {
            console.error('❌ Banking service: Error during initialization:', error);
            this.showErrorState();
        } finally {
            this.initializeInProgress = false;
        }
    }

    // Show error state in all banking cards
    showErrorState() {
        console.log('🚨 Banking service: Showing error state in UI...');

        const cardIds = [
            'ci-loans-card', 'cre-loans-card', 'consumer-loans-card',
            'other-loans-card', 'total-loans-card', 'deposits-card',
            'large-time-deposits-card', 'other-deposits-card', 'borrowings-card'
        ];

        cardIds.forEach(cardId => {
            const card = document.getElementById(cardId);
            if (card) {
                // Update value to show error
                const valueElement = card.querySelector('.card-value');
                if (valueElement) {
                    valueElement.textContent = 'Error';
                    valueElement.style.color = '#F44336';
                }

                // Update change to show error
                const changeElement = card.querySelector('.card-change');
                if (changeElement) {
                    changeElement.className = 'card-change negative';
                    changeElement.innerHTML = '<span>⚠️</span> Data Unavailable';
                }

                // Update period changes
                const periodChanges = card.querySelector('.banking-period-changes');
                if (periodChanges) {
                    periodChanges.innerHTML = `
                        <div class="period-item">
                            <span class="period-label">QTD:</span>
                            <span class="period-value">--</span>
                        </div>
                        <div class="period-item">
                            <span class="period-label">YoY Qtr:</span>
                            <span class="period-value">--</span>
                        </div>
                    `;
                }

                // Update date
                const dateElement = card.querySelector('.card-date');
                if (dateElement) {
                    dateElement.textContent = 'Service Unavailable';
                }
            }
        });

        // Also show error in peer table
        const tbody = document.getElementById('peer-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #F44336;">Banking data service unavailable</td></tr>';
        }
    }

    // Show error state for a specific card
    showCardErrorState(card, dataKey) {
        console.log(`🚨 Showing error state for card: ${dataKey}`);

        // Update value to show error
        const valueElement = card.querySelector('.card-value');
        if (valueElement) {
            valueElement.textContent = 'Error';
            valueElement.style.color = '#F44336';
        }

        // Update change to show error
        const changeElement = card.querySelector('.card-change');
        if (changeElement) {
            changeElement.className = 'card-change negative';
            changeElement.innerHTML = '<span>⚠️</span> Data Error';
        }

        // Update period changes
        const periodChanges = card.querySelector('.banking-period-changes');
        if (periodChanges) {
            periodChanges.innerHTML = `
                <div class="period-item">
                    <span class="period-label">QTD:</span>
                    <span class="period-value">--</span>
                </div>
                <div class="period-item">
                    <span class="period-label">YoY Qtr:</span>
                    <span class="period-value">--</span>
                </div>
            `;
        }

        // Update date
        const dateElement = card.querySelector('.card-date');
        if (dateElement) {
            dateElement.textContent = 'Data Unavailable';
        }
    }

    // Diagnostic function to check banking cards and service status
    diagnoseBankingIssues() {
        console.log('\n🔍 === BANKING SERVICE DIAGNOSTIC ===');

        // Check if we're in the banking tab
        const bankingTab = document.getElementById('banking');
        const isVisible = bankingTab && bankingTab.style.display !== 'none';
        console.log(`📍 Banking tab visible: ${isVisible}`);

        // Check all banking cards
        const cardMappings = {
            'ciLoans': 'ci-loans-card',
            'creLoans': 'cre-loans-card',
            'consumerLoans': 'consumer-loans-card',
            'otherLoans': 'other-loans-card',
            'totalLoans': 'total-loans-card',
            'deposits': 'deposits-card',
            'largeTimeDeposits': 'large-time-deposits-card',
            'otherDeposits': 'other-deposits-card',
            'borrowings': 'borrowings-card'
        };

        let cardStatus = {};
        Object.entries(cardMappings).forEach(([dataKey, cardId]) => {
            const card = document.getElementById(cardId);
            const hasData = this.h8Data[dataKey];
            const hasError = hasData?.hasError;

            cardStatus[dataKey] = {
                cardExists: !!card,
                hasData: !!hasData,
                hasError: hasError,
                errorMessage: hasData?.errorMessage
            };

            console.log(`📊 ${dataKey} (${cardId}):`, cardStatus[dataKey]);
        });

        // Check service status
        console.log(`🏦 Service Status:`, {
            h8DataKeys: Object.keys(this.h8Data),
            peerDataLength: this.peerData.length,
            updateInProgress: this.updateInProgress,
            initializeInProgress: this.initializeInProgress
        });

        // Check API service
        console.log(`🔌 API Service Status:`, {
            windowApiService: !!window.apiService,
            apiServiceType: typeof window.apiService,
            getFREDSeries: typeof window.apiService?.getFREDSeries
        });

        // Check configuration
        console.log(`⚙️ Configuration:`, {
            API_CONFIG_exists: !!API_CONFIG,
            FRED_config: !!API_CONFIG?.FRED,
            h8_config: !!API_CONFIG?.FRED?.series?.h8Data,
            h8_series_count: Object.keys(API_CONFIG?.FRED?.series?.h8Data || {}).length
        });

        return cardStatus;
    }

    // Initialize sortable table headers
    initSortableTable() {
        console.log('🔗 Banking service: Setting up sortable table headers...');
        
        // Find the table headers and add click listeners
        const tableHeaders = document.querySelectorAll('.peer-table th');
        
        const sortableColumns = {
            2: 'price',      // Current Price
            3: 'change1d',   // 1-Day
            4: 'change1w',   // 1-Week (default sort)
            5: 'ytd',        // YTD
            6: 'change1y',   // 1-Year
            7: 'change3y',   // 3-Year
            8: 'change5y'    // 5-Year
        };
        
        tableHeaders.forEach((header, index) => {
            if (sortableColumns[index]) {
                header.style.cursor = 'pointer';
                header.addEventListener('click', () => {
                    this.sortTable(sortableColumns[index]);
                });
                
                // Add initial sort indicator for 1-Week column
                if (index === 4) { // 1-Week column
                    header.innerHTML += ' <span class="sort-indicator">▼</span>';
                    header.classList.add('sorted');
                }
            }
        });
    }

    // Sort table by column
    sortTable(column) {
        console.log(`📊 Sorting peer table by ${column}`);
        
        // Toggle direction if same column, otherwise default to descending
        if (this.currentSortColumn === column) {
            this.currentSortDirection = this.currentSortDirection === 'desc' ? 'asc' : 'desc';
        } else {
            this.currentSortColumn = column;
            this.currentSortDirection = 'desc';
        }
        
        // Sort the data
        this.peerData.sort((a, b) => {
            // Error entries always go last
            if (a.hasError && !b.hasError) return 1;
            if (!a.hasError && b.hasError) return -1;
            if (a.hasError && b.hasError) return a.ticker.localeCompare(b.ticker);
            
            let valueA = a[column];
            let valueB = b[column];
            
            // Handle numeric sorting
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return this.currentSortDirection === 'desc' ? valueB - valueA : valueA - valueB;
            }
            
            // Handle string sorting (for ticker, etc.)
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return this.currentSortDirection === 'desc' 
                    ? valueB.localeCompare(valueA) 
                    : valueA.localeCompare(valueB);
            }
            
            return 0;
        });
        
        // Update table headers with sort indicators
        this.updateSortIndicators();
        
        // Re-render the table
        this.updatePeerTable(this.peerData);
        
        // Update sort note
        this.updateSortNote();
    }

    // Update sort indicators in table headers
    updateSortIndicators() {
        const tableHeaders = document.querySelectorAll('.peer-table th');
        const columnMap = {
            'price': 2,
            'change1d': 3,
            'change1w': 4,
            'ytd': 5,
            'change1y': 6,
            'change3y': 7,
            'change5y': 8
        };
        
        // Clear all indicators and sorted class
        tableHeaders.forEach(header => {
            header.classList.remove('sorted');
            const indicator = header.querySelector('.sort-indicator');
            if (indicator) {
                indicator.remove();
            }
        });
        
        // Add indicator to current sorted column
        const currentHeaderIndex = columnMap[this.currentSortColumn];
        if (currentHeaderIndex && tableHeaders[currentHeaderIndex]) {
            const header = tableHeaders[currentHeaderIndex];
            header.classList.add('sorted');
            const arrow = this.currentSortDirection === 'desc' ? '▼' : '▲';
            header.innerHTML += ` <span class="sort-indicator">${arrow}</span>`;
        }
    }

    // Update sort note
    updateSortNote() {
        const sortNote = document.querySelector('.sort-note');
        if (sortNote) {
            const columnNames = {
                'price': 'current price',
                'change1d': '1-day performance',
                'change1w': '1-week performance',
                'ytd': 'YTD performance',
                'change1y': '1-year performance',
                'change3y': '3-year performance',
                'change5y': '5-year performance'
            };
            
            const columnName = columnNames[this.currentSortColumn] || this.currentSortColumn;
            const direction = this.currentSortDirection === 'desc' ? 'descending' : 'ascending';
            sortNote.textContent = `Table sorted by ${columnName} in ${direction} order`;
        }
    }

    // Enhanced API service initialization - create if missing
    async ensureApiService() {
        console.log('🔄 Banking service ensuring apiService is available...');
        
        // Check if apiService already exists
        if (window.apiService && typeof window.apiService.getFREDSeries === 'function') {
            console.log('✅ Banking service: Found existing apiService');
            return true;
        }
        
        console.log('⚠️  Banking service: apiService not found, creating new instance...');
        
        // Check if we have the APIService class available
        if (typeof APIService !== 'function') {
            console.error('❌ Banking service: APIService class not available globally');
            console.log('   Available globals:', Object.keys(window).filter(k => k.includes('Service')));
            return false;
        }
        
        // Check config
        if (!API_CONFIG?.FRED?.apiKey) {
            console.error('❌ Banking service: FRED API config missing');
            console.log(`   API_CONFIG exists: ${!!API_CONFIG}`);
            console.log(`   API_CONFIG.FRED exists: ${!!API_CONFIG?.FRED}`);
            console.log(`   FRED API key exists: ${!!API_CONFIG?.FRED?.apiKey}`);
            return false;
        }
        
        try {
            // Create new APIService instance
            console.log('🏗️  Banking service: Creating new APIService instance...');
            const newApiService = new APIService();
            window.apiService = newApiService;
            
            // Verify it was created properly
            if (window.apiService && typeof window.apiService.getFREDSeries === 'function') {
                console.log('✅ Banking service: Successfully created and attached APIService to window');
                return true;
            } else {
                console.error('❌ Banking service: Failed to create functional APIService');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Banking service: Error creating APIService:', error.message);
            console.log('   Error details:', error);
            return false;
        }
    }

    // Initialize banking charts with standardized formatting
    initBankingCharts() {
        const chartIds = [
            'ciloans-chart', 'creloans-chart', 'consumerloans-chart', 
            'otherloans-chart', 'totalloans-chart',
            'deposits-chart', 'largetime-chart', 'otherdeposits-chart', 'borrowings-chart'
        ];

        chartIds.forEach(chartId => {
            const canvas = document.getElementById(chartId);
            if (canvas && !canvas.chart) {
                // Use standardized chart configuration if chartUtils is available
                let chartConfig;

                // Map chart IDs to meaningful labels
                const chartLabels = {
                    'ciloans-chart': 'C&I Loans',
                    'creloans-chart': 'CRE Loans',
                    'consumerloans-chart': 'Consumer Loans',
                    'otherloans-chart': 'Other Loans',
                    'totalloans-chart': 'Total Loans',
                    'deposits-chart': 'Total Deposits',
                    'largetime-chart': 'Large Time Deposits',
                    'otherdeposits-chart': 'Other Deposits',
                    'borrowings-chart': 'Borrowings'
                };

                if (window.chartUtils) {
                    chartConfig = {
                        type: 'line',
                        data: {
                            labels: [],
                            originalDates: [], // Store original dates for tooltips
                            datasets: [{
                                label: chartLabels[chartId] || 'Value',
                                data: [],
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                tension: 0.4,
                                pointRadius: 2,
                                pointHoverRadius: 4,
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(context) {
                                            const chart = context[0].chart;
                                            const index = context[0].dataIndex;
                                            const originalDates = chart.data.originalDates;

                                            if (originalDates && originalDates[index]) {
                                                const date = new Date(originalDates[index]);
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const year = date.getFullYear();
                                                return `${month}/${day}/${year}`;
                                            }
                                            return context[0].label;
                                        },
                                        label: function(context) {
                                            const value = context.parsed.y.toFixed(3);
                                            return '$' + value + 'Tr';
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    display: true,
                                    grid: { display: false },
                                    ticks: {
                                        font: { size: 10 },
                                        maxRotation: 45,
                                        minRotation: 45,
                                        autoSkip: false,
                                        maxTicksLimit: false
                                    }
                                },
                                y: {
                                    display: true,
                                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                                    ticks: {
                                        font: { size: 10 },
                                        callback: function(value) {
                                            return '$' + value.toFixed(1) + 'Tr';
                                        }
                                    }
                                }
                            }
                        }
                    };
                } else {
                    // Fallback configuration
                    chartConfig = {
                        type: 'line',
                        data: {
                            labels: [],
                            datasets: [{
                                label: chartLabels[chartId] || 'Value',
                                data: [],
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                tension: 0.4,
                                pointRadius: 2,
                                pointHoverRadius: 4,
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(context) {
                                            const chart = context[0].chart;
                                            const index = context[0].dataIndex;
                                            const originalDates = chart.data.originalDates;

                                            if (originalDates && originalDates[index]) {
                                                const date = new Date(originalDates[index]);
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const year = date.getFullYear();
                                                return `${month}/${day}/${year}`;
                                            }
                                            return context[0].label;
                                        },
                                        label: function(context) {
                                            const value = context.parsed.y.toFixed(3);
                                            return '$' + value + 'Tr';
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    display: true,
                                    grid: { display: false },
                                    ticks: {
                                        font: { size: 10 },
                                        maxRotation: 45,
                                        minRotation: 45,
                                        autoSkip: false,
                                        maxTicksLimit: false,
                                        // Temporarily removed label filtering to debug
                                        // callback: function(value, index, ticks) {
                                        //     const label = this.getLabelForValue(value);
                                        //     // Only show labels that contain month/year (MMM 'YY format)
                                        //     return label && label.includes("'") ? label : '';
                                        // }
                                    }
                                },
                                y: {
                                    display: true,
                                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                                    ticks: {
                                        font: { size: 10 },
                                        callback: function(value) {
                                            return '$' + value.toFixed(1) + 'Tr';
                                        }
                                    }
                                }
                            }
                        }
                    };
                }
                
                canvas.chart = new Chart(canvas, chartConfig);
                this.charts[chartId] = canvas.chart;
            }
        });
    }

    // Fetch H.8 data from FRED - IMPROVED ERROR HANDLING
    async fetchH8Data() {
        // Enhanced API service availability check
        if (!window.apiService) {
            console.error('❌ window.apiService not available for H.8 data fetching');
            console.log('   Available global objects:', Object.keys(window).filter(k => k.includes('service')));
            return {};
        }

        if (typeof window.apiService.getFREDSeries !== 'function') {
            console.error('❌ apiService.getFREDSeries method not available');
            console.log('   Available apiService methods:', Object.getOwnPropertyNames(window.apiService));
            return {};
        }

        const series = API_CONFIG.FRED.series.h8Data;
        const updates = {};
        const failedSeries = [];
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 3; // Stop if we get 3 failures in a row (likely API issue)

        console.log('🏦 Fetching H.8 data from FRED...');
        console.log('📊 Series to fetch:', Object.keys(series));
        console.log('🔗 FRED API Key status:', API_CONFIG.FRED.apiKey ? 'Available' : 'Missing');

        for (const [key, seriesId] of Object.entries(series)) {
            // Check if we should stop due to consecutive failures
            if (consecutiveFailures >= maxConsecutiveFailures) {
                console.error(`❌ Stopping H.8 fetch after ${maxConsecutiveFailures} consecutive failures - likely API issue`);
                failedSeries.push(...Object.keys(series).filter(k => !updates[k] && !failedSeries.includes(k)));
                break;
            }
            
            console.log(`\n🔄 Fetching ${key} (${seriesId})...`);
            try {
                // Get 260 weeks (5 years) of data for long-term calculations
                console.log(`   📞 Calling getFREDSeries('${seriesId}', 260, 'w')...`);
                const startTime = Date.now();
                const data = await window.apiService.getFREDSeries(seriesId, 260, 'w');
                const duration = Date.now() - startTime;
                
                console.log(`   ⏱️  API call completed in ${duration}ms`);
                
                if (data && data.values && data.values.length > 0) {
                    updates[key] = this.processH8Data(data, key);
                    console.log(`✅ ${key}: $${(updates[key].currentBillions / 1000).toFixed(3)}Tr (${data.values.length} data points)`);
                    console.log(`   📊 Changes: WoW ${updates[key].weekChange.toFixed(1)}%, QTD ${updates[key].qtdChange.toFixed(1)}%, YoY Qtr ${updates[key].yoyQtdChange.toFixed(1)}%`);
                    const unit = key === 'borrowings' ? 'M' : 'B';
                    console.log(`   📈 Value range: ${Math.min(...data.values).toFixed(0)}${unit} - ${Math.max(...data.values).toFixed(0)}${unit}`);
                    consecutiveFailures = 0; // Reset on success
                } else if (data) {
                    console.warn(`⚠️  ${key}: No data values returned for series ${seriesId}`);
                    console.log(`   📋 Raw response structure:`, Object.keys(data));
                    if (data.observations) {
                        console.log(`   🔍 Observations length: ${data.observations?.length || 0}`);
                    }
                    failedSeries.push(key);
                    consecutiveFailures++;
                    
                    // Create placeholder data to maintain UI structure
                    updates[key] = {
                        current: 0,
                        currentBillions: 0,
                        weekChange: 0,
                        monthChange: 0,
                        qtdChange: 0,
                        yoyQtdChange: 0,
                        historicalData: [],
                        dates: [],
                        observationDate: new Date().toISOString(),
                        hasError: true
                    };
                } else {
                    console.error(`❌ ${key}: No data returned for series ${seriesId}`);
                    failedSeries.push(key);
                    consecutiveFailures++;
                    
                    // Create placeholder data to maintain UI structure
                    updates[key] = {
                        current: 0,
                        currentBillions: 0,
                        weekChange: 0,
                        monthChange: 0,
                        qtdChange: 0,
                        yoyQtdChange: 0,
                        historicalData: [],
                        dates: [],
                        observationDate: new Date().toISOString(),
                        hasError: true
                    };
                }
                // Small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`❌ Error fetching H.8 ${key} (${seriesId}):`, error.message);
                console.log(`   🔍 Error type: ${error.name}`);
                
                // Try to identify specific issues
                if (error.message.includes('400') || error.message.includes('Bad Request')) {
                    console.error(`   🚫 Likely invalid series ID: ${seriesId}`);
                } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                    console.error(`   🔑 API key authentication issue`);
                } else if (error.message.includes('429') || error.message.includes('rate limit')) {
                    console.error(`   ⏰ Rate limiting detected - will continue with other series`);
                    // Increase delay for rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else if (error.message.includes('fetch')) {
                    console.error(`   🌐 Network/CORS issue`);
                }
                
                failedSeries.push(key);
                consecutiveFailures++;
                
                // Create placeholder data to maintain UI structure even on error
                updates[key] = {
                    current: 0,
                    currentBillions: 0,
                    weekChange: 0,
                    monthChange: 0,
                    qtdChange: 0,
                    yoyQtdChange: 0,
                    historicalData: [],
                    dates: [],
                    observationDate: new Date().toISOString(),
                    hasError: true,
                    errorMessage: error.message
                };
                
                // Continue to next series - don't let one failure stop all processing
                continue;
            }
        }

        console.log(`\n📈 H.8 Data fetch complete. Successfully fetched ${Object.keys(updates).filter(k => !updates[k].hasError).length}/${Object.keys(series).length} series`);

        // Log which series failed
        if (failedSeries.length > 0) {
            console.warn('❌ Failed to fetch these series:', failedSeries.map(key => `${key} (${series[key]})`));
            console.log('💡 The dashboard will continue to work with partial data');
        }

        this.h8Data = updates;
        return updates;
    }

    // Calculate extended returns for H.8 banking data (similar to rates but for banking)
    calculateExtendedReturnsForBanking(values, dates) {
        if (!values || !dates || values.length === 0) {
            return {};
        }

        const currentValue = values[values.length - 1];
        const currentDate = new Date(dates[dates.length - 1]);
        const returns = {};

        // Helper function to find closest week
        const findClosestValue = (targetDate, direction = 'before') => {
            let bestIndex = -1;
            let bestDistance = Infinity;

            for (let i = 0; i < dates.length; i++) {
                const dataDate = new Date(dates[i]);
                const timeDiff = dataDate.getTime() - targetDate.getTime();
                const daysDiff = Math.abs(timeDiff / (1000 * 60 * 60 * 24));

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
            { key: '1W', weeks: 1 },
            { key: '1M', weeks: 4 },
            { key: 'YTD', isYTD: true },
            { key: '1Y', weeks: 52 },
            { key: '3Y', weeks: 52 * 3 },
            { key: '5Y', weeks: 52 * 5 }
        ];

        for (const period of periods) {
            let targetValue = null;

            if (period.isYTD) {
                // For YTD, find the first week of the current year
                const yearStart = new Date(currentDate.getFullYear(), 0, 1);
                targetValue = findClosestValue(yearStart, 'after');
            } else {
                // Calculate target date going back the specified number of weeks
                const targetDate = new Date(currentDate);
                targetDate.setDate(currentDate.getDate() - (period.weeks * 7));
                targetValue = findClosestValue(targetDate, 'before');
            }

            if (targetValue !== null && targetValue !== 0) {
                // For banking data, calculate percentage change
                returns[period.key] = ((currentValue - targetValue) / targetValue) * 100;
            }
        }

        return returns;
    }

    // Process H.8 data for display
    processH8Data(data, seriesName) {
        const values = data.values;
        const dates = data.dates;

        if (!values || values.length === 0) {
            return {
                current: 0,
                currentBillions: 0,
                weekChange: 0,
                monthChange: 0,
                qtdChange: 0,
                yoyQtdChange: 0,
                historicalData: [],
                dates: [],
                rawDates: [],
                observationDate: new Date().toISOString()
            };
        }

        // Get latest value - handle different units
        // Borrowings (H8B3094NDMD) comes in millions, all others in billions
        const current = values[values.length - 1];
        const currentBillions = seriesName === 'borrowings' ? current / 1000 : current;
        
        // Calculate week-over-week change (9/3/2025 vs 8/27/2025)
        const previousWeek = values.length > 1 ? values[values.length - 2] : current;
        const weekChange = ((current - previousWeek) / previousWeek) * 100;

        // Calculate month-over-month change (approximately 4 weeks)
        const monthAgoIndex = Math.max(0, values.length - 5);
        const monthAgoValue = values[monthAgoIndex];
        const monthChange = ((current - monthAgoValue) / monthAgoValue) * 100;

        // Calculate QTD - compare current to previous quarter end
        const qtdIndex = this.findPreviousQuarterEndIndex(dates);
        const qtdValue = qtdIndex >= 0 ? values[qtdIndex] : current;
        const qtdChange = ((current - qtdValue) / qtdValue) * 100;

        // Calculate YoY Quarter - compare current to same quarter end previous year
        const yoyQuarterIndex = this.findPreviousYearQuarterEndIndex(dates);
        const yoyQuarterValue = yoyQuarterIndex >= 0 ? values[yoyQuarterIndex] : current;
        const yoyQtdChange = ((current - yoyQuarterValue) / yoyQuarterValue) * 100;
        
        // Get monthly data points for chart (last week of each month)
        const monthlyData = this.getMonthlyData(values, dates, seriesName);
        const monthlyDates = this.getMonthlyDates(dates);

        // Get raw dates for tooltips (last 53 weeks to match the chart data)
        const startIndex = Math.max(0, dates.length - 53);
        const rawDates = dates.slice(startIndex);

        // Calculate extended returns
        const extendedReturns = this.calculateExtendedReturnsForBanking(values, dates);

        return {
            current: current,
            currentBillions: currentBillions,
            weekChange: weekChange,
            monthChange: monthChange,
            qtdChange: qtdChange,
            yoyQtdChange: yoyQtdChange,
            historicalData: monthlyData,
            dates: monthlyDates,
            rawDates: rawDates,  // Add raw dates for tooltips
            observationDate: dates[dates.length - 1],
            extendedReturns: extendedReturns
        };
    }

    // Find the index of the previous quarter end (e.g., for Sept data, find June quarter end)
    findPreviousQuarterEndIndex(dates) {
        const currentDate = new Date(dates[dates.length - 1]);
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Determine previous quarter end month
        let prevQuarterEndMonth;
        if (currentMonth >= 9) { // Q4 (Oct-Dec) -> Q3 end (Sept)
            prevQuarterEndMonth = 8; // September (0-indexed)
        } else if (currentMonth >= 6) { // Q3 (Jul-Sep) -> Q2 end (June)
            prevQuarterEndMonth = 5; // June
        } else if (currentMonth >= 3) { // Q2 (Apr-Jun) -> Q1 end (March)
            prevQuarterEndMonth = 2; // March
        } else { // Q1 (Jan-Mar) -> Q4 end previous year (December)
            prevQuarterEndMonth = 11; // December
        }

        const targetYear = (currentMonth < 3) ? currentYear - 1 : currentYear;

        // Find the last date of the previous quarter
        for (let i = dates.length - 1; i >= 0; i--) {
            const date = new Date(dates[i]);
            if (date.getFullYear() === targetYear && date.getMonth() === prevQuarterEndMonth) {
                return i;
            }
        }

        return Math.max(0, dates.length - 13); // Fallback to ~3 months ago
    }

    // Find the index of the same quarter end from previous year
    findPreviousYearQuarterEndIndex(dates) {
        const currentDate = new Date(dates[dates.length - 1]);
        const currentMonth = currentDate.getMonth();
        const targetYear = currentDate.getFullYear() - 1;

        // Determine which quarter we're in and find the same quarter end from previous year
        let quarterEndMonth;
        if (currentMonth >= 9) { // Q4 -> find Q4 end (December) of previous year
            quarterEndMonth = 11; // December
        } else if (currentMonth >= 6) { // Q3 -> find Q3 end (September) of previous year
            quarterEndMonth = 8; // September
        } else if (currentMonth >= 3) { // Q2 -> find Q2 end (June) of previous year
            quarterEndMonth = 5; // June
        } else { // Q1 -> find Q1 end (March) of previous year
            quarterEndMonth = 2; // March
        }

        // Find the last date of the same quarter from previous year
        for (let i = dates.length - 1; i >= 0; i--) {
            const date = new Date(dates[i]);
            if (date.getFullYear() === targetYear && date.getMonth() === quarterEndMonth) {
                return i;
            }
        }

        return Math.max(0, dates.length - 52); // Fallback to ~1 year ago
    }

    // Get weekly data points for chart display (53 weeks of data)
    getMonthlyData(weeklyValues, weeklyDates, seriesName) {
        if (!weeklyValues || weeklyValues.length === 0) return [];

        // Return 53 weeks (1 year + 1 week) of weekly data converted to trillions
        const startIndex = Math.max(0, weeklyValues.length - 53);

        // Borrowings comes in millions, others in billions
        // Convert to trillions for chart display
        if (seriesName === 'borrowings') {
            return weeklyValues.slice(startIndex).map(value => value / 1000000); // millions to trillions
        } else {
            return weeklyValues.slice(startIndex).map(value => value / 1000); // billions to trillions
        }
    }

    // Format date using same logic as apiService.formatDate() for consistency
    formatDate(dateString) {
        // Parse date string explicitly to avoid timezone issues
        const parts = dateString.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(parts[2]);
        const date = new Date(year, month, day);
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // For monthly data: same as apiService logic
        const monthName = months[month];
        const yearShort = year.toString().substr(2);
        return `${monthName} '${yearShort}`;
    }

    // Get date labels for weekly data with monthly markers
    getMonthlyDates(weeklyDates) {
        if (!weeklyDates || weeklyDates.length === 0) return [];

        // Get 53 weeks (1 year + 1 week) of dates
        const startIndex = Math.max(0, weeklyDates.length - 53);
        const dates = weeklyDates.slice(startIndex);

        // Initialize array with empty strings
        const labels = new Array(dates.length).fill('');
        let lastLabeledMonth = -1;
        let lastLabeledYear = -1;

        // Work backwards to find the latest date in each month
        for (let i = dates.length - 1; i >= 0; i--) {
            const date = new Date(dates[i]);
            const month = date.getMonth();
            const year = date.getFullYear();

            // Check if this is a new month we haven't labeled yet
            if (month !== lastLabeledMonth || year !== lastLabeledYear) {
                // This is the latest date for this month - mark it for labeling
                labels[i] = this.formatDate(dates[i]);
                lastLabeledMonth = month;
                lastLabeledYear = year;
            }
        }

        return labels;
    }

    // Fetch peer bank data
    async fetchPeerData() {
        const tickers = [...API_CONFIG.PEER_BANKS.tickers, API_CONFIG.PEER_BANKS.indexTicker];
        const peerData = [];

        console.log('🏦 Fetching peer bank data...');
        console.log(`📊 Fetching data for ${tickers.length} tickers:`, tickers);

        // Enhanced Yahoo Finance service validation
        if (!window.yahooFinance) {
            console.error('❌ Yahoo Finance service not available for peer bank data');
            console.log('   Available window services:', Object.keys(window).filter(k => k.includes('service')));
            return this.createFallbackPeerData(tickers);
        }

        if (typeof window.yahooFinance.getQuote !== 'function') {
            console.error('❌ yahooFinance.getQuote method not available');
            console.log('   Available yahooFinance methods:', Object.getOwnPropertyNames(window.yahooFinance));
            return this.createFallbackPeerData(tickers);
        }

        let successCount = 0;
        let failCount = 0;

        // Process tickers with enhanced error handling and continue on individual failures
        for (const ticker of tickers) {
            console.log(`\n🔄 Fetching ${ticker}...`);
            
            let peerInfo = null;
            
            try {
                // Enhanced timeout and error handling with separate try-catch for quote and historical
                let quote = null;
                let historical = null;
                
                // Fetch quote with timeout and individual error handling
                try {
                    console.log(`   📞 Calling yahooFinance.getQuote('${ticker}')...`);
                    const quoteStartTime = Date.now();
                    const quotePromise = window.yahooFinance.getQuote(ticker);
                    
                    quote = await Promise.race([
                        quotePromise,
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Quote fetch timeout (10s)')), 10000)
                        )
                    ]);
                    
                    const quoteDuration = Date.now() - quoteStartTime;
                    console.log(`   ⏱️  Quote fetch completed in ${quoteDuration}ms`);
                    
                } catch (quoteError) {
                    console.warn(`   ⚠️  Quote fetch failed for ${ticker}: ${quoteError.message}`);
                    quote = null;
                }
                
                // Fetch historical data with separate error handling
                try {
                    if (quote && quote.price) { // Only fetch historical if quote succeeded
                        console.log(`   📈 Fetching historical data for ${ticker}...`);
                        const historicalStartTime = Date.now();
                        const historicalPromise = window.yahooFinance.getHistoricalData(ticker, '5y', '1d');
                        
                        historical = await Promise.race([
                            historicalPromise,
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Historical fetch timeout (15s)')), 15000)
                            )
                        ]);
                        
                        const historicalDuration = Date.now() - historicalStartTime;
                        console.log(`   ⏱️  Historical fetch completed in ${historicalDuration}ms`);
                    }
                } catch (historicalError) {
                    console.warn(`   ⚠️  Historical fetch failed for ${ticker}: ${historicalError.message}`);
                    historical = null; // Continue with just quote data
                }
                
                // Process data if quote is valid
                if (quote && quote.price && typeof quote.price === 'number' && !isNaN(quote.price)) {
                    peerInfo = {
                        ticker: ticker,
                        price: quote.price || 0,
                        change1d: (quote.changePercent && !isNaN(quote.changePercent)) ? quote.changePercent : 0,
                        change1w: historical ? this.calculateReturn(historical?.prices, 5) : 0,
                        ytd: historical ? this.calculateYTDReturn(historical?.prices, historical?.dates) : 0,
                        change1y: historical ? this.calculateReturn(historical?.prices, 252) : 0,
                        change3y: historical ? this.calculateReturn(historical?.prices, 756) : 0,
                        change5y: historical ? this.calculateReturn(historical?.prices, 1260) : 0,
                        isTCBI: ticker === 'TCBI',
                        isIndex: ticker === '^KRX',
                        hasPartialData: !historical // Flag if historical data missing
                    };
                    
                    successCount++;
                    console.log(`✅ ${ticker}: $${peerInfo.price.toFixed(2)}, 1D: ${peerInfo.change1d.toFixed(1)}%, 1W: ${peerInfo.change1w.toFixed(1)}%${peerInfo.hasPartialData ? ' (quote only)' : ''}`);
                    
                } else {
                    throw new Error(`Invalid quote data: ${JSON.stringify(quote)}`);
                }
                
            } catch (error) {
                console.error(`❌ Error fetching peer data for ${ticker}:`, error.message);
                failCount++;
                
                // Create fallback entry to maintain table structure
                peerInfo = {
                    ticker: ticker,
                    price: 0,
                    change1d: 0,
                    change1w: 0,
                    ytd: 0,
                    change1y: 0,
                    change3y: 0,
                    change5y: 0,
                    isTCBI: ticker === 'TCBI',
                    isIndex: ticker === '^KRX',
                    hasError: true
                };
                
                console.log(`   🔄 Added fallback entry for ${ticker} to maintain table structure`);
            }
            
            // Always add an entry (either successful or fallback)
            if (peerInfo) {
                peerData.push(peerInfo);
            }
            
            // Add delay between requests to avoid rate limiting
            if (tickers.indexOf(ticker) < tickers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay
            }
        }

        console.log(`\n📈 Peer bank data fetch complete: ${successCount}/${tickers.length} successful, ${failCount} failed`);
        
        if (failCount > 0) {
            console.warn(`❌ Failed tickers: ${peerData.filter(p => p.hasError).map(p => p.ticker).join(', ')}`);
        }
        
        if (peerData.filter(p => p.hasPartialData).length > 0) {
            console.log(`⚠️  Partial data (quote-only) for: ${peerData.filter(p => p.hasPartialData).map(p => p.ticker).join(', ')}`);
        }

        // Store data and apply current sorting
        this.peerData = peerData;
        
        // Apply current sort settings
        this.sortTable(this.currentSortColumn);
        
        return peerData;
    }

    // Create fallback peer data structure when service is unavailable
    createFallbackPeerData(tickers) {
        console.log('🔄 Creating fallback peer data structure...');
        const fallbackData = tickers.map(ticker => ({
            ticker: ticker,
            price: 0,
            change1d: 0,
            change1w: 0,
            ytd: 0,
            change1y: 0,
            change3y: 0,
            change5y: 0,
            isTCBI: ticker === 'TCBI',
            isIndex: ticker === '^KRX',
            hasError: true,
            errorReason: 'Service unavailable'
        }));
        
        this.peerData = fallbackData;
        return fallbackData;
    }

    // Calculate return over specified days
    calculateReturn(prices, days) {
        if (!prices || !Array.isArray(prices) || prices.length < days) return 0;
        const current = prices[prices.length - 1];
        const previous = prices[prices.length - days];
        if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    }

    // Calculate YTD return
    calculateYTDReturn(prices, dates) {
        if (!prices || !dates || !Array.isArray(prices) || !Array.isArray(dates) || prices.length === 0) return 0;
        
        const currentYear = new Date().getFullYear();
        let startIndex = 0;
        
        // Find first trading day of current year
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            if (date.getFullYear() === currentYear) {
                startIndex = i;
                break;
            }
        }
        
        if (startIndex === 0 && new Date(dates[0]).getFullYear() !== currentYear) {
            // If no data for current year, use all available data
            startIndex = 0;
        }
        
        const current = prices[prices.length - 1];
        const yearStart = prices[startIndex];
        if (typeof current !== 'number' || typeof yearStart !== 'number' || yearStart === 0) return 0;
        return ((current - yearStart) / yearStart) * 100;
    }

    // Update banking tab
    async updateBankingTab() {
        if (this.updateInProgress) return;
        this.updateInProgress = true;

        // Show loading state
        if (window.loadingManager) {
            window.loadingManager.showTabLoading('banking', 'Loading banking data...');
        }

        try {
            console.log('Updating banking tab...');
            
            // Ensure apiService is available
            const apiReady = await this.ensureApiService();
            if (!apiReady) {
                console.error('❌ Banking service: Cannot update banking tab - apiService not available');
                return;
            }
            
            // Update loading message
            if (window.loadingManager) {
                window.loadingManager.showTabLoading('banking', 'Fetching H.8 banking data...');
            }
            
            // Update H.8 data
            const h8Data = await this.fetchH8Data();
            this.updateH8Cards(h8Data);
            
            // Update loading message
            if (window.loadingManager) {
                window.loadingManager.showTabLoading('banking', 'Loading peer bank data...');
            }
            
            // Update peer comparison
            const peerData = await this.fetchPeerData();
            this.updatePeerTable(peerData);
            
            console.log('Banking tab update complete');
        } catch (error) {
            console.error('Error updating banking tab:', error);
        } finally {
            // Hide loading state
            if (window.loadingManager) {
                window.loadingManager.hideTabLoading('banking');
            }
            this.updateInProgress = false;
        }
    }

    // Update H.8 cards
    updateH8Cards(data) {
        if (!data) {
            console.error('❌ No H.8 data available for card updates');
            return;
        }

        console.log('📊 Updating H.8 cards with data:', Object.keys(data));

        // Map data keys to card IDs
        const cardMappings = {
            'ciLoans': 'ci-loans-card',
            'creLoans': 'cre-loans-card',
            'consumerLoans': 'consumer-loans-card',
            'otherLoans': 'other-loans-card',
            'totalLoans': 'total-loans-card',
            'deposits': 'deposits-card',
            'largeTimeDeposits': 'large-time-deposits-card',
            'otherDeposits': 'other-deposits-card',
            'borrowings': 'borrowings-card'
        };
        
        Object.entries(cardMappings).forEach(([dataKey, cardId]) => {
            const values = data[dataKey];
            const card = document.getElementById(cardId);

            console.log(`🔄 Processing ${dataKey} -> ${cardId}:`, {
                hasCard: !!card,
                hasValues: !!values,
                hasError: values?.hasError
            });

            if (!card) {
                console.error(`❌ Card element not found: ${cardId}`);
                return;
            }

            if (!values) {
                console.error(`❌ No data for: ${dataKey}`);
                return;
            }

            if (values.hasError) {
                console.warn(`⚠️ Data has error for ${dataKey}:`, values.errorMessage);
                // Show error state for this specific card
                this.showCardErrorState(card, dataKey);
                return;
            }

            if (card && values) {
                // Update value
                const valueElement = card.querySelector('.card-value');
                if (valueElement) {
                    // Convert from billions to trillions for display
                    const trillions = values.currentBillions / 1000;
                    valueElement.textContent = `$${trillions.toFixed(3)}Tr`;
                }
                
                
                // Update week change
                const changeElement = card.querySelector('.card-change');
                if (changeElement) {
                    const changeType = values.weekChange >= 0 ? 'positive' : 'negative';
                    changeElement.className = `card-change ${changeType}`;
                    const arrow = values.weekChange >= 0 ? '▲' : '▼';
                    changeElement.innerHTML = `<span>${arrow}</span> ${Math.abs(values.weekChange).toFixed(1)}% WoW`;
                }
                
                // Update banking period changes - show QTD and YoY Quarter
                const periodChanges = card.querySelector('.banking-period-changes');
                if (periodChanges) {
                    try {
                        // Use calculated values for QTD and YoY Quarter
                        const qtdChange = values.qtdChange || 0;
                        const yoyQuarterChange = values.yoyQtdChange || 0;

                        periodChanges.innerHTML = `
                            <div class="period-item">
                                <span class="period-label">QTD:</span>
                                <span class="period-value ${qtdChange >= 0 ? 'positive' : 'negative'}">
                                    ${qtdChange >= 0 ? '▲' : '▼'} ${Math.abs(qtdChange).toFixed(1)}%
                                </span>
                            </div>
                            <div class="period-item">
                                <span class="period-label">YoY Qtr:</span>
                                <span class="period-value ${yoyQuarterChange >= 0 ? 'positive' : 'negative'}">
                                    ${yoyQuarterChange >= 0 ? '▲' : '▼'} ${Math.abs(yoyQuarterChange).toFixed(1)}%
                                </span>
                            </div>
                        `;
                        console.log(`✅ Updated period changes for ${dataKey}`);
                    } catch (error) {
                        console.error(`❌ Error updating period changes for ${dataKey}:`, error);
                    }
                }
                
                // Update chart with standardized formatting
                // Map data keys to actual chart IDs (handle special cases)
                const chartIdMap = {
                    'ciLoans': 'ciloans-chart',
                    'creLoans': 'creloans-chart',
                    'consumerLoans': 'consumerloans-chart',
                    'otherLoans': 'otherloans-chart',
                    'totalLoans': 'totalloans-chart',
                    'deposits': 'deposits-chart',
                    'largeTimeDeposits': 'largetime-chart',  // Special case: doesn't follow pattern
                    'otherDeposits': 'otherdeposits-chart',
                    'borrowings': 'borrowings-chart'
                };
                const chartId = chartIdMap[dataKey] || (dataKey.toLowerCase().replace(/[A-Z]/g, letter => letter.toLowerCase()) + '-chart');
                if (this.charts[chartId]) {
                    // Debug logging
                    console.log(`🔄 Updating chart ${chartId} for ${dataKey}:`, {
                        hasData: !!values.historicalData,
                        dataLength: values.historicalData?.length,
                        hasLabels: !!values.dates,
                        labelsLength: values.dates?.length,
                        hasRawDates: !!values.rawDates,
                        rawDatesLength: values.rawDates?.length,
                        sampleLabels: values.dates?.slice(-5), // Show last 5 labels
                        sampleRawDates: values.rawDates?.slice(-5) // Show last 5 raw dates
                    });

                    console.log(`📊 Sample data for ${dataKey}:`, {
                        lastFewDataPoints: values.historicalData?.slice(-3),
                        lastFewLabels: values.dates?.slice(-3),
                        chartExists: !!this.charts[chartId]
                    });

                    // Use exact same logic as dataUpdater.js for consistent labeling
                    let displayLabels = values.dates || [];
                    let displayData = values.historicalData || [];
                    let rawDates = values.rawDates || [];

                    // Ensure all arrays have data before proceeding
                    if (displayData.length === 0 || displayLabels.length === 0) {
                        console.warn(`No data available for ${dataKey} chart`);
                        return; // Use return instead of continue in forEach
                    }

                    // Show 53 weeks (1 year + 1 week) of data
                    // Only slice if arrays are longer than 53
                    if (displayData.length > 53) {
                        displayData = displayData.slice(-53);
                        displayLabels = displayLabels.slice(-53);
                        rawDates = rawDates.slice(-53);
                    }

                    // Store raw dates for tooltips to match the displayed data
                    this.charts[chartId].data.originalDates = rawDates;

                    // Labels are already properly formatted by getMonthlyDates - no need to filter
                    
                    try {
                        this.charts[chartId].data.labels = displayLabels;
                        this.charts[chartId].data.datasets[0].data = displayData;

                        // Set color based on trend
                        const isPositiveTrend = values.weekChange >= 0;
                        this.charts[chartId].data.datasets[0].borderColor = isPositiveTrend ? '#4CAF50' : '#F44336';
                        this.charts[chartId].data.datasets[0].backgroundColor = isPositiveTrend ?
                            'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';

                        this.charts[chartId].update();
                        console.log(`✅ Successfully updated chart ${chartId}`);
                    } catch (error) {
                        console.error(`❌ Error updating chart ${chartId}:`, error);
                        console.log(`   Data lengths: labels=${displayLabels.length}, data=${displayData.length}`);
                        console.log(`   Sample labels:`, displayLabels.slice(0, 3));
                        console.log(`   Sample data:`, displayData.slice(0, 3));
                    }
                }
                
                // Update date
                const dateElement = card.querySelector('.card-date');
                if (dateElement && values.observationDate) {
                    const date = new Date(values.observationDate);
                    const formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    });
                    dateElement.textContent = `Week ending ${formattedDate}`;
                }
            }
        });
    }

    // Update peer comparison table
    updatePeerTable(peerData) {
        const tbody = document.getElementById('peer-table-body');
        if (!tbody || !peerData || peerData.length === 0) return;
        
        tbody.innerHTML = peerData.map((peer, index) => {
            // Determine row class
            let rowClass = '';
            if (peer.hasError) rowClass += ' error-row';
            if (peer.isTCBI) rowClass += ' tcbi-row';
            else if (peer.ticker === '^KRX') rowClass += ' krx-row';
            
            // Safely format numbers with null checks and partial data handling
            const formatValue = (value) => {
                if (peer.hasError) return '--';
                if (peer.hasPartialData && (value === 0 || value === null || value === undefined)) return 'N/A';
                if (typeof value !== 'number' || isNaN(value)) return '0.0';
                return value.toFixed(1);
            };
            
            const formatPrice = (value) => {
                if (peer.hasError) return '--';
                if (typeof value !== 'number' || isNaN(value)) return '0.00';
                return value.toFixed(2);
            };
            
            const getCellClass = (value) => {
                if (peer.hasError) return 'error-cell';
                if (peer.hasPartialData && (value === 0 || value === null || value === undefined)) return 'partial-data-cell';
                return value >= 0 ? 'positive' : 'negative';
            };
            
            const formatChange = (value) => {
                if (peer.hasError) return '--';
                if (peer.hasPartialData && (value === 0 || value === null || value === undefined)) return 'N/A';
                const sign = value >= 0 ? '+' : '';
                return `${sign}${formatValue(value)}%`;
            };
            
            return `
                <tr class="${rowClass.trim()}">
                    <td>${index + 1}</td>
                    <td class="ticker-cell">${peer.ticker}</td>
                    <td>$${formatPrice(peer.price)}</td>
                    <td class="${getCellClass(peer.change1d)}">
                        ${formatChange(peer.change1d)}
                    </td>
                    <td class="${getCellClass(peer.change1w)}">
                        ${formatChange(peer.change1w)}
                    </td>
                    <td class="${getCellClass(peer.ytd)}">
                        ${formatChange(peer.ytd)}
                    </td>
                    <td class="${getCellClass(peer.change1y)}">
                        ${formatChange(peer.change1y)}
                    </td>
                    <td class="${getCellClass(peer.change3y)}">
                        ${formatChange(peer.change3y)}
                    </td>
                    <td class="${getCellClass(peer.change5y)}">
                        ${formatChange(peer.change5y)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Start auto-update
    startAutoUpdate() {
        // Initial update
        this.updateBankingTab();
        
        // Update every hour
        setInterval(() => {
            this.updateBankingTab();
        }, API_CONFIG.UPDATE_INTERVALS.banking || 3600000);
    }
}

// Register initialization with dashboard initializer
if (typeof window !== 'undefined') {
    // Function to initialize banking service
    const initializeBankingService = () => {
        window.bankingService = new BankingService();
        window.bankingService.init();
        console.log('🏦 Banking Service initialized via coordinator');

        // Make diagnostic function available globally for testing
        window.diagnoseBanking = () => window.bankingService.diagnoseBankingIssues();
    };

    // Wait for dashboard initializer or use fallback
    setTimeout(() => {
        if (window.dashboardInitializer) {
            window.dashboardInitializer.addInitializationCallback(initializeBankingService, 3);
            console.log('🏦 Banking Service registered with dashboard coordinator');
        } else {
            // Fallback: Initialize when DOM is ready (legacy mode)
            console.log('🏦 Banking Service using fallback initialization');
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initializeBankingService, 2000);
            });
        }
    }, 100);
}