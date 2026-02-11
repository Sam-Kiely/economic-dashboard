// Initialize chartUtils globally
if (typeof ChartUtils !== 'undefined') {
    window.chartUtils = new ChartUtils();
    console.log('✅ ChartUtils initialized');
} else {
    console.warn('⚠️ ChartUtils not available');
}

// Update greeting based on time of day
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingElement = document.getElementById('greeting');
    
    if (hour < 12) {
        greetingElement.textContent = 'Good Morning';
    } else if (hour < 18) {
        greetingElement.textContent = 'Good Afternoon';
    } else {
        greetingElement.textContent = 'Good Evening';
    }
}

// Call on page load
updateGreeting();

// Tab switching functionality
function switchTab(tabName, tabElement) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
    });

    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(tabName).style.display = 'block';
    
    // Add active class to clicked tab
    tabElement.classList.add('active');

    // Initialize charts for the active tab
    setTimeout(() => {
        if (tabName === 'economic') {
            initializeEconomicCharts();
        } else if (tabName === 'markets') {
            initializeMarketCharts();
        } else if (tabName === 'rates') {
            initializeRatesCharts();
        }
    }, 100);
}

// Time period selector functionality
document.querySelectorAll('.time-option').forEach(option => {
    option.addEventListener('click', function(e) {
        e.stopPropagation();
        const siblings = this.parentElement.querySelectorAll('.time-option');
        siblings.forEach(sibling => sibling.classList.remove('active'));
        this.classList.add('active');
    });
});

// Chart configuration
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 10
                    }
                }
            },
            y: {
                display: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        size: 10
                    }
                }
            }
        }
    }
};

// Initialize Economic Charts
function initializeEconomicCharts() {
    // Core CPI Chart
    initializeEconomicChart('corecpi-chart', null, '#FF5722');
    
    // Core PPI Chart
    initializeEconomicChart('coreppi-chart', null, '#9C27B0');
    
    // Core PCE Chart
    initializeEconomicChart('corepce-chart', null, '#E91E63');
    
    // GDP Chart
    initializeEconomicChart('gdp-chart', null, '#00BCD4');
    
    // Trade Deficit Chart
    initializeEconomicChart('trade-chart', null, '#795548');
    
    // Unemployment Chart
    initializeEconomicChart('unemployment-chart', null, '#4CAF50');
    
    // Jobless Claims Chart
    initializeEconomicChart('jobless-chart', null, '#FF9800');
    
    // Retail Sales Chart
    initializeEconomicChart('retail-chart', null, '#FFC107');
    
    // Durable Goods Chart
    initializeEconomicChart('durablegoods-chart', null, '#607D8B');
    
    // New Home Sales Chart
    initializeEconomicChart('newhomes-chart', null, '#3F51B5');
    
    // Existing Home Sales Chart
    initializeEconomicChart('existinghomes-chart', null, '#009688');
    
    // Consumer Sentiment Chart
    initializeEconomicChart('sentiment-chart', null, '#2196F3');
}

// Helper function for economic charts
function initializeEconomicChart(chartId, dataKey, color) {
    const ctx = document.getElementById(chartId);
    if (ctx && !ctx.chart) {
        ctx.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: color,
                    backgroundColor: color + '20',
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                // If we have original dates stored, use them
                                if (this.chart.data.originalDates && this.chart.data.originalDates[context[0].dataIndex]) {
                                    const date = new Date(this.chart.data.originalDates[context[0].dataIndex]);
                                    return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
                                }
                                return context[0].label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 9
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 9
                            }
                        }
                    }
                }
            }
        });
    }
}

// Initialize Market Charts
function initializeMarketCharts() {
    initializeMarketChart('sp500-chart', 'sp500', '#2196F3');
    initializeMarketChart('dow-chart', 'dow', '#4CAF50');
    initializeMarketChart('nasdaq-chart', 'nasdaq', '#9C27B0');
    initializeMarketChart('gold-chart', 'gold', '#FFD700');
    initializeMarketChart('oil-chart', 'oil', '#000000');
    initializeMarketChart('dxy-chart', 'dxy', '#2E7D32');
    initializeMarketChart('bitcoin-chart', 'bitcoin', '#F7931A');
}

// UPDATED: Helper function for market charts with proper date formatting
function initializeMarketChart(chartId, dataKey, color) {
    const ctx = document.getElementById(chartId);
    if (ctx && !ctx.chart) {
        let chartData = {
            labels: [],
            originalDates: [], // Store original dates for tooltips
            datasets: [{
                data: [],
                borderColor: color,
                backgroundColor: color + '20',
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 4
            }]
        };
        
        // Use mockData if available, otherwise leave empty for real data
        if (window.mockData && window.mockData.markets && window.mockData.markets[dataKey]) {
            const data = window.mockData.markets[dataKey];
            if (data.dates && data.dates.length > 0) {
                // Use chartUtils for proper formatting
                if (window.chartUtils) {
                    chartData.labels = window.chartUtils.formatChartAxis(data.dates, 'monthly');
                    chartData.originalDates = data.dates;
                } else {
                    chartData.labels = data.dates;
                }
                chartData.datasets[0].data = data.historicalData || [];
            }
        }
        
        // Create chart with enhanced options
        const chartOptions = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: window.chartUtils ? window.chartUtils.getTooltipConfig('currency', 'MMM DD, YY') : {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                const index = context[0].dataIndex;
                                const originalDates = context[0].chart.data.originalDates;
                                return originalDates && originalDates[index] ? new Date(originalDates[index]).toLocaleDateString() : '';
                            },
                            label: function(context) {
                                return '$' + context.parsed.y.toFixed(2);
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
                            autoSkip: false
                        }
                    },
                    y: {
                        display: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            font: { size: 10 },
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        };
        
        ctx.chart = new Chart(ctx, chartOptions);
    }
}

// Initialize Rates Charts
function initializeRatesCharts() {
    // DISABLED: Rates charts are now initialized and populated by apiService-v2.js
    // This prevents conflicts with the unified FRED data loading system
    console.log('📊 Rate charts now handled by apiService-v2, skipping legacy initialization');
    return;

    // Old conflicting logic disabled:
    // initializeRateChart('2yr-chart', 'treasury2yr', '#FF5722');
    // initializeRateChart('5yr-chart', 'treasury5yr', '#673AB7');
    // etc...
}
// Add this function to your existing script.js file after the initializeRatesCharts function

// Initialize Banking Charts
function initializeBankingCharts() {
    const bankingCharts = [
        { id: 'ciloans-chart', color: '#667eea' },
        { id: 'creloans-chart', color: '#764ba2' },
        { id: 'consumerloans-chart', color: '#2196F3' },
        { id: 'otherloans-chart', color: '#FF9800' },
        { id: 'totalloans-chart', color: '#4CAF50' },
        { id: 'deposits-chart', color: '#00BCD4' },
        { id: 'largetime-chart', color: '#E91E63' },
        { id: 'otherdeposits-chart', color: '#9C27B0' },
        { id: 'borrowings-chart', color: '#795548' }
    ];

    bankingCharts.forEach(chartConfig => {
        const ctx = document.getElementById(chartConfig.id);
        if (ctx && !ctx.chart) {
            ctx.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        borderColor: chartConfig.color,
                        backgroundColor: chartConfig.color + '20',
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(context) {
                                    // Use original dates for tooltip if available
                                    if (context[0].chart.data.originalDates && context[0].chart.data.originalDates[context[0].dataIndex]) {
                                        const date = new Date(context[0].chart.data.originalDates[context[0].dataIndex]);
                                        return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
                                    }
                                    return context[0].label;
                                },
                                label: function(context) {
                                    // All H8 data is now stored in trillions for display
                                    return '$' + context.parsed.y.toFixed(3) + 'Tn';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 9
                                },
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            display: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                font: {
                                    size: 9
                                },
                                callback: function(value) {
                                    return '$' + (value / 1000).toFixed(0) + 'T';
                                }
                            }
                        }
                    }
                }
            });
        }
    });
}

// UPDATE your existing switchTab function to include the banking tab:
function switchTab(tabName, tabElement) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
    });

    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(tabName).style.display = 'block';
    
    // Add active class to clicked tab
    tabElement.classList.add('active');

    // Initialize charts for the active tab
    setTimeout(() => {
        if (tabName === 'economic') {
            initializeEconomicCharts();
        } else if (tabName === 'markets') {
            initializeMarketCharts();
        } else if (tabName === 'rates') {
            initializeRatesCharts();
        } else if (tabName === 'banking') {
            // Initialize banking charts
            initializeBankingCharts();

            // H8 data is now handled by apiService-v2 during initial load
            // Banking tab only needs charts initialized, not data reload
            console.log('🏦 Banking tab - charts initialized, data loaded by apiService-v2');
        }
    }, 100);
}
// Add this to your window.addEventListener('load') section to initialize banking service:
window.addEventListener('load', () => {
    // Your existing initialization code...
    
    // Initialize banking service after a delay
    setTimeout(() => {
        // Check if BankingService class exists
        if (typeof BankingService !== 'undefined') {
            if (!window.bankingService) {
                window.bankingService = new BankingService();
                console.log('Banking Service initialized from script.js');
                
                // Start auto-update for banking data
                window.bankingService.startAutoUpdate();
            }
        } else {
            console.log('Banking Service not yet loaded, will initialize from bankingService.js');
        }
    }, 3000);
});

// Create empty 365-day chart structure for rate charts (to be populated with real data)
function createEmptyRateChartData() {
    const today = new Date();
    const startDate = new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Create arrays for ALL daily data (365 points)
    const labels = [];
    const data = [];
    const originalDates = [];
    const monthlyLabelIndices = [];
    
    let lastMonthShown = -1;
    
    // Generate daily structure for 365 days (no mock data, just structure)
    for (let i = 0; i < 365; i++) {
        const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
        
        // Create MM/DD/YYYY date string for tooltips
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const year = currentDate.getFullYear();
        originalDates.push(`${month}/${day}/${year}`);
        
        data.push(0); // Placeholder value, will be replaced by real data
        
        // Show label only on the first day of each month
        const currentMonth = currentDate.getMonth();
        if (currentMonth !== lastMonthShown) {
            const yearShort = currentDate.getFullYear().toString().slice(-2);
            const label = `${monthNames[currentMonth]} '${yearShort}`;
            labels.push(label);
            monthlyLabelIndices.push(i);
            lastMonthShown = currentMonth;
        } else {
            labels.push(''); // Empty string for non-month-start days
        }
    }
    
    return {
        labels,
        data,
        originalDates,
        monthlyLabelIndices
    };
}

// FIXED: Helper function for rate charts with safety check
function initializeRateChart(chartId, dataKey, color) {
    const ctx = document.getElementById(chartId);
    if (ctx && !ctx.chart) {
        // Create empty 365-day structure (will be populated with real data)
        const { labels, data, originalDates, monthlyLabelIndices } = createEmptyRateChartData();
        
        let chartData = {
            labels: labels,                      // 365 labels (mostly empty, some monthly)
            originalDates: originalDates,        // 365 daily dates for tooltips
            monthlyLabelIndices: monthlyLabelIndices,  // Indices of monthly labels
            datasets: [{
                data: data,                      // 365 daily data points
                borderColor: color,
                backgroundColor: color + '20',
                tension: 0.4,
                pointRadius: 0,               // Hide points by default
                pointHoverRadius: 4,          // Show on hover
                borderWidth: 2,
                fill: true
            }]
        };
        
        // Create chart with enhanced options
        const chartOptions = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        cornerRadius: 4,
                        padding: 10,
                        callbacks: {
                            title: function(context) {
                                const index = context[0].dataIndex;
                                const originalDates = context[0].chart.data.originalDates;
                                if (originalDates && originalDates[index]) {
                                    // originalDates are already in M/D/YYYY format
                                    const dateStr = originalDates[index];
                                    const parts = dateStr.split('/');
                                    if (parts.length === 3) {
                                        const month = parts[0].padStart(2, '0');
                                        const day = parts[1].padStart(2, '0');
                                        const year = parts[2];
                                        return `${month}/${day}/${year}`;
                                    }
                                    return dateStr;
                                }
                                return '';
                            },
                            label: function(context) {
                                const value = context.parsed.y;
                                if (chartId.includes('spread')) {
                                    return (value * 100).toFixed(0) + ' bps';
                                }
                                return value.toFixed(2) + '%';
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
                            callback: function(value, index) {
                                // Only show ticks at monthly label indices
                                const monthlyIndices = this.chart.data.monthlyLabelIndices || [];
                                if (monthlyIndices.includes(index)) {
                                    const labels = this.chart.data.labels;
                                    return labels[index] || '';
                                }
                                return null; // Hide this tick
                            }
                        }
                    },
                    y: {
                        display: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            font: { size: 10 },
                            callback: function(value) {
                                if (chartId.includes('spread')) {
                                    return (value * 100).toFixed(0) + ' bps';
                                }
                                return value.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        };
        
        ctx.chart = new Chart(ctx, chartOptions);
        
        // Add debug info
        console.log(`📊 Initialized ${chartId} with ${chartData.datasets[0].data.length} data points`);
        console.log(`📅 Date range: ${originalDates[0]} to ${originalDates[originalDates.length - 1]}`);
        console.log(`📊 Monthly labels: ${labels.filter(l => l !== '').length} months`);
        
        // Special handling for FRED charts - load FRED data immediately after chart creation
        if (chartId === 'sofr-chart' || chartId === '2yr-chart' || chartId === '5yr-chart' || chartId === '10yr-chart' || chartId === '30yr-chart' || chartId === 'spread-chart' || chartId === 'fedfunds-chart' || chartId === 'highyield-chart' || chartId === 'tbill-chart') {
            // Map chart to FRED series ID
            const fredSeriesMap = {
                'sofr-chart': 'SOFR30DAYAVG',
                '2yr-chart': 'DGS2',
                '5yr-chart': 'DGS5',
                '10yr-chart': 'DGS10',
                '30yr-chart': 'DGS30',
                'spread-chart': 'T10Y2Y',
                'fedfunds-chart': 'DFEDTARU',
                'highyield-chart': 'BAMLH0A0HYM2',
                'tbill-chart': 'DTB3'
            };
            
            const seriesId = fredSeriesMap[chartId];
            console.log(`🎯 ${chartId} detected - setting up FRED data loading for ${seriesId}...`);
            
            // Function to try loading FRED data
            const loadFREDData = async (attempt = 1) => {
                console.log(`🔄 ${chartId} attempt ${attempt}:`, {
                    apiService: !!window.apiService,
                    dataUpdater: !!window.dataUpdater,
                    chart: !!ctx.chart
                });
                
                if (window.apiService && window.dataUpdater && ctx.chart) {
                    try {
                        // Clear cache and get fresh FRED data
                        const cacheKey = `fred_${seriesId}_d`;
                        if (window.apiService.cache) {
                            delete window.apiService.cache[cacheKey];
                            console.log(`🗑️ Cleared FRED cache for ${seriesId}`);
                        }
                        
                        console.log(`🌐 Fetching FRED data for ${seriesId}...`);
                        const fredData = await window.apiService.getFREDSeries(seriesId, 2000, 'd'); // ~5.5 years of data for 3Y/5Y calculations
                        
                        if (fredData && fredData.values && fredData.dates) {
                            console.log(`✅ ${chartId}: Got FRED data!`);
                            console.log('  - Values:', fredData.values.slice(0, 5), '...');
                            console.log('  - Dates:', fredData.dates.slice(0, 5), '...');
                            window.dataUpdater.updateRateChartWithFredData(chartId, fredData.values, fredData.dates);
                        } else {
                            console.log(`❌ ${chartId}: No FRED data received`);
                        }
                    } catch (error) {
                        console.error(`❌ ${chartId} FRED loading error:`, error);
                    }
                } else if (attempt < 5) {
                    console.log(`⏳ ${chartId}: Services not ready, retrying in ${attempt}s...`);
                    setTimeout(() => loadFREDData(attempt + 1), attempt * 1000);
                } else {
                    console.error(`❌ ${chartId}: Gave up after 5 attempts`);
                }
            };
            
            // Start loading attempts
            setTimeout(() => loadFREDData(), 500);
        }
    }
}

// Function to test rate chart formatting
window.testRateChartFormatting = function() {
    console.log('🧪 Testing Rate Chart Data Generation...');
    console.log('=====================================');
    
    const today = new Date();
    console.log(`📅 Today's date: ${today.toLocaleDateString()}`);
    console.log(`📅 Today's year: ${today.getFullYear()}`);
    
    const testData = createEmptyRateChartData();
    
    console.log(`📊 Generated data points: ${testData.data.length}`);
    console.log(`📅 Date range: ${testData.originalDates[0]} to ${testData.originalDates[testData.originalDates.length - 1]}`);
    console.log(`📊 Monthly labels: ${testData.labels.filter(l => l !== '').length} months`);
    
    console.log('\n📅 First 5 tooltip dates:');
    testData.originalDates.slice(0, 5).forEach((date, i) => {
        const parts = date.split('/');
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        console.log(`  ${i}: ${date} → ${month}/${day}/${year} (Year: ${year})`);
    });
    
    console.log('\n📅 Last 5 tooltip dates:');
    testData.originalDates.slice(-5).forEach((date, i) => {
        const parts = date.split('/');
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        console.log(`  ${testData.originalDates.length - 5 + i}: ${date} → ${month}/${day}/${year} (Year: ${year})`);
    });
    
    console.log('\n📊 Monthly labels:');
    testData.labels.filter(l => l !== '').slice(0, 13).forEach((label, i) => {
        console.log(`  ${i}: "${label}"`);
    });
    
    console.log('\n💰 Sample values:');
    testData.data.slice(0, 5).forEach((value, i) => {
        console.log(`  ${i}: ${value}%`);
    });
    
    console.log('=====================================');
    return testData;
};

// Function to refresh charts with corrected data
window.refreshRateCharts = function() {
    console.log('🔄 Refreshing rate charts with corrected dates...');
    
    // Get all rate chart canvases
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 
                          'fedfunds-chart', 'tbill-chart', 'highyield-chart', 'spread-chart'];
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart) {
            canvas.chart.destroy();
            canvas.chart = null;
            console.log(`🗑️  Destroyed ${chartId}`);
        }
    });
    
    // Reinitialize charts
    setTimeout(() => {
        initializeRatesCharts();
        console.log('✅ Rate charts reinitialized with corrected dates');
    }, 100);
};

// Function to apply x-axis fix to existing charts without recreating them
window.applyXAxisFix = function() {
    console.log('🔧 Applying x-axis label fix to existing rate charts...');
    
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 
                          'fedfunds-chart', 'tbill-chart', 'highyield-chart', 'spread-chart'];
    
    let fixedCount = 0;
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart) {
            const chart = canvas.chart;
            
            // Update the x-axis tick callback
            if (chart.options.scales && chart.options.scales.x && chart.options.scales.x.ticks) {
                chart.options.scales.x.ticks.callback = function(value, index) {
                    // Access the labels array from the chart data
                    const labels = this.chart.data.labels;
                    if (!labels || index >= labels.length) return null;
                    
                    // Only show labels that aren't empty strings
                    const label = labels[index];
                    return label === '' ? null : label;
                };
                
                // Update the chart
                chart.update('none');
                fixedCount++;
                console.log(`  ✅ Fixed x-axis for ${chartId}`);
            }
        }
    });
    
    console.log(`🎯 Applied x-axis fix to ${fixedCount} charts`);
    return fixedCount;
};

// Function to test FRED API for SOFR directly
window.testSOFRFredAPI = function() {
    console.log('🧪 Testing FRED API for SOFR30DAYAVG directly...');
    console.log('=====================================');
    
    if (window.apiService && window.apiService.getFREDSeries) {
        console.log('📡 Calling FRED API for SOFR30DAYAVG...');
        
        window.apiService.getFREDSeries('SOFR30DAYAVG', 365, 'd')
            .then(data => {
                console.log('✅ FRED API Response:', data);
                
                if (data && data.values) {
                    console.log(`📊 FRED Data Summary:`);
                    console.log(`  Total values: ${data.values.length}`);
                    console.log(`  Date range: ${data.dates?.[0]} to ${data.dates?.[data.dates.length - 1]}`);
                    console.log(`  First 10 values:`, data.values.slice(0, 10));
                    console.log(`  Last 10 values:`, data.values.slice(-10));
                    
                    // Check for variation
                    const uniqueValues = [...new Set(data.values)];
                    console.log(`  Unique values: ${uniqueValues.length}`);
                    console.log(`  Sample unique values:`, uniqueValues.slice(0, 10));
                    
                    if (uniqueValues.length === 1) {
                        console.log('⚠️  All FRED values are identical - this explains the flat chart');
                    } else {
                        console.log('✅ FRED values vary - chart should show variation');
                    }
                } else {
                    console.log('❌ No FRED data received');
                }
            })
            .catch(error => {
                console.error('❌ FRED API Error:', error);
            });
    } else {
        console.log('❌ FRED API Service not available');
    }
    
    console.log('=====================================');
};

// Function to test SOFR chart specifically  
window.testSOFRChart = function() {
    console.log('🧪 Testing 1M Term SOFR Chart (SOFR30DAYAVG)...');
    console.log('=====================================');
    
    // Check SOFR chart specifically
    const canvas = document.getElementById('sofr-chart');
    if (canvas && canvas.chart) {
        const chart = canvas.chart;
        console.log('📊 SOFR Chart Status:');
        console.log('  Data points:', chart.data.datasets[0].data.length);
        console.log('  Labels count:', chart.data.labels.length);
        console.log('  Monthly indices:', chart.data.monthlyLabelIndices?.length || 'Not set');
        console.log('  First 5 values:', chart.data.datasets[0].data.slice(0, 5));
        console.log('  Last 5 values:', chart.data.datasets[0].data.slice(-5));
        console.log('  Date range:', chart.data.originalDates?.[0], 'to', chart.data.originalDates?.[chart.data.originalDates.length - 1]);
        
        // Check if it looks like real data
        const avgValue = chart.data.datasets[0].data.reduce((a, b) => a + b, 0) / chart.data.datasets[0].data.length;
        const variance = chart.data.datasets[0].data.reduce((acc, val) => acc + Math.pow(val - avgValue, 2), 0) / chart.data.datasets[0].data.length;
        
        console.log('  Average yield:', avgValue.toFixed(3) + '%');
        console.log('  Variance:', variance.toFixed(6));
        console.log('  Data type:', variance > 0.001 ? 'Likely real data (varying)' : 'Likely mock data (flat)');
    } else {
        console.log('❌ SOFR chart not found');
    }
    
    // Test FRED API and dataUpdater
    if (window.apiService) {
        console.log('\n📡 Testing FRED API Service...');
        console.log('  Service available: ✅');
        console.log('  SOFR series ID: SOFR30DAYAVG');
        
        // Trigger manual update with fresh data (clear cache first)
        if (window.dataUpdater) {
            console.log('\n🔄 Triggering SOFR data update with fresh processing...');
            
            // Clear API cache to get fresh data
            if (window.apiService && window.apiService.cache) {
                delete window.apiService.cache['fred_SOFR30DAYAVG_d'];
                console.log('🗑️ Cleared FRED cache for fresh data');
            }
            
            setTimeout(async () => {
                // Get fresh FRED data and process it
                try {
                    const fredData = await window.apiService.getFREDSeries('SOFR30DAYAVG', 365, 'd');
                    if (fredData && fredData.values && fredData.dates) {
                        console.log('✅ Got fresh FRED data, processing...');
                        window.dataUpdater.updateRateChartWithFredData('sofr-chart', fredData.values, fredData.dates);
                    } else {
                        console.log('❌ No FRED data received');
                    }
                } catch (error) {
                    console.error('❌ Error getting FRED data:', error);
                }
            }, 500);
        }
    } else {
        console.log('\n📡 FRED API Service: ❌ Not available');
    }
    
    console.log('=====================================');
};

// Function to test T-Bill chart specifically
window.testTBillChart = function() {
    console.log('🧪 Testing 3-Month T-Bill Chart (^IRX)...');
    console.log('=====================================');
    
    // Check T-Bill chart specifically
    const canvas = document.getElementById('tbill-chart');
    if (canvas && canvas.chart) {
        const chart = canvas.chart;
        console.log('📊 T-Bill Chart Status:');
        console.log('  Data points:', chart.data.datasets[0].data.length);
        console.log('  Labels count:', chart.data.labels.length);
        console.log('  Monthly indices:', chart.data.monthlyLabelIndices?.length || 'Not set');
        console.log('  First 5 values:', chart.data.datasets[0].data.slice(0, 5));
        console.log('  Last 5 values:', chart.data.datasets[0].data.slice(-5));
        console.log('  Date range:', chart.data.originalDates?.[0], 'to', chart.data.originalDates?.[chart.data.originalDates.length - 1]);
        
        // Check if it looks like real data
        const avgValue = chart.data.datasets[0].data.reduce((a, b) => a + b, 0) / chart.data.datasets[0].data.length;
        const variance = chart.data.datasets[0].data.reduce((acc, val) => acc + Math.pow(val - avgValue, 2), 0) / chart.data.datasets[0].data.length;
        
        console.log('  Average yield:', avgValue.toFixed(3) + '%');
        console.log('  Variance:', variance.toFixed(6));
        console.log('  Data type:', variance > 0.001 ? 'Likely real data (varying)' : 'Likely mock data (flat)');
    } else {
        console.log('❌ T-Bill chart not found');
    }
    
    // Test Yahoo Finance service
    if (window.yahooFinanceService) {
        console.log('\n📡 Testing Yahoo Finance Service...');
        console.log('  Service available: ✅');
        console.log('  T-Bill symbol (tbill3m):', window.yahooFinanceService.symbols?.tbill3m);
        
        // Trigger manual update
        if (window.dataUpdater) {
            console.log('\n🔄 Triggering T-Bill data update...');
            window.dataUpdater.updateRateChartWithYahooData('tbill-chart');
        }
    } else {
        console.log('\n📡 Yahoo Finance Service: ❌ Not available');
    }
    
    console.log('=====================================');
};

// Function to test real data integration
window.testRealDataIntegration = function() {
    console.log('🧪 Testing Real Data Integration...');
    console.log('=====================================');
    
    // Check if API services are available
    console.log('📡 API Service Status:');
    console.log('  apiService:', typeof window.apiService !== 'undefined' ? '✅ Available' : '❌ Not loaded');
    console.log('  dataUpdater:', typeof window.dataUpdater !== 'undefined' ? '✅ Available' : '❌ Not loaded');
    
    // Check current chart state
    const canvas = document.getElementById('2yr-chart');
    if (canvas && canvas.chart) {
        const chart = canvas.chart;
        console.log('\n📊 Current Chart State:');
        console.log('  Data points:', chart.data.datasets[0].data.length);
        console.log('  First value:', chart.data.datasets[0].data[0]);
        console.log('  Last value:', chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1]);
        console.log('  Date range:', chart.data.originalDates[0], 'to', chart.data.originalDates[chart.data.originalDates.length - 1]);
        
        // Check if values look like real data (not our mock base rates)
        const avgValue = chart.data.datasets[0].data.reduce((a, b) => a + b, 0) / chart.data.datasets[0].data.length;
        console.log('  Average value:', avgValue.toFixed(2) + '%');
        console.log('  Looks like:', avgValue > 4.0 && avgValue < 5.0 ? 'Mock data' : 'Potentially real data');
    }
    
    // Trigger a manual update if possible
    if (window.dataUpdater) {
        console.log('\n🔄 Triggering manual data update...');
        setTimeout(() => {
            window.dataUpdater.updateDashboard();
        }, 1000);
    }
    
    console.log('=====================================');
};

// Function to test daily chart structure with monthly labels
window.testDailyChartStructure = function() {
    console.log('🧪 Testing Daily Chart Structure with Monthly Labels...');
    console.log('=====================================');
    
    const testData = createEmptyRateChartData();
    
    console.log(`📊 Total labels: ${testData.labels.length}`);
    console.log(`📊 Total data points: ${testData.data.length}`);
    console.log(`📅 Original dates: ${testData.originalDates.length}`);
    console.log(`📊 Monthly label indices: ${testData.monthlyLabelIndices.length}`);
    
    console.log('\n📊 Monthly Label Indices:');
    testData.monthlyLabelIndices.forEach((index, i) => {
        const label = testData.labels[index];
        console.log(`  Index ${index}: "${label}"`);
    });
    
    console.log('\n📅 First 10 labels (showing empties):');
    testData.labels.slice(0, 10).forEach((label, i) => {
        const display = label === '' ? 'EMPTY' : label;
        console.log(`  [${i}]: "${display}"`);
    });
    
    console.log('\n📅 Sample dates and data:');
    for (let i = 0; i < 5; i++) {
        console.log(`  [${i}]: ${testData.originalDates[i]} = ${testData.data[i]}%`);
    }
    
    console.log('=====================================');
    return testData;
};

// Update dashboard data (this will be used when connecting to real APIs)
function updateDashboardData() {
    // Update Economic Indicators
    updateEconomicIndicators();
    
    // Update Markets
    updateMarkets();
    
    // Update Rates
    updateRates();
    
    // Update Calendar
    updateCalendar();
}

// Update Economic Indicators
function updateEconomicIndicators() {
    // This function will update the DOM with data from mockData
    // In the future, this will fetch from real APIs
}

// Update Markets
function updateMarkets() {
    // This function will update market data
}

// Update Rates
function updateRates() {
    // This function will update rate data
}

// Update Calendar
function updateCalendar() {
    // This function will update the economic calendar
}

// Initialize charts on page load
window.addEventListener('load', () => {
    // Initialize economic charts (default tab)
    setTimeout(() => {
        initializeEconomicCharts();
    }, 100);

    // Initialize rate charts in background for proper tooltip setup
    setTimeout(() => {
        initializeRatesCharts();
        console.log('✅ Rate charts initialized with new monthly-only x-axis structure');
        console.log('📅 Charts now show 13 monthly labels with proper years');
        
    }, 500);

    // Animate cards on load
    const cards = document.querySelectorAll('.card, .market-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
});

// Function to debug and fix rate chart tooltips
window.debugRateCharts = function debugRateCharts() {
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 'fedfunds-chart', 
                         'tbill-chart', 'mortgage-chart', 'highyield-chart', 'prime-chart'];
    
    console.log('🔍 Debugging Rate Charts:');
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        console.log(`\n📊 ${chartId}:`);
        console.log(`  Element found: ${!!canvas}`);
        console.log(`  Chart object exists: ${!!(canvas && canvas.chart)}`);
        
        if (canvas && canvas.chart) {
            console.log(`  Chart type: ${canvas.chart.config.type}`);
            console.log(`  Data points: ${canvas.chart.data.datasets[0].data.length}`);
            console.log(`  Labels count: ${canvas.chart.data.labels.length}`);
            console.log(`  Original dates exist: ${!!(canvas.chart.data.originalDates)}`);
            if (canvas.chart.data.originalDates) {
                console.log(`  Original dates count: ${canvas.chart.data.originalDates.length}`);
                console.log(`  First original date: ${canvas.chart.data.originalDates[0]}`);
            }
            console.log(`  First label: ${canvas.chart.data.labels[0]}`);
            
            // Check current tooltip config
            if (canvas.chart.options.plugins && canvas.chart.options.plugins.tooltip) {
                console.log(`  Has tooltip config: true`);
                console.log(`  Has title callback: ${!!(canvas.chart.options.plugins.tooltip.callbacks && canvas.chart.options.plugins.tooltip.callbacks.title)}`);
            } else {
                console.log(`  Has tooltip config: false`);
            }
        }
    });
};

// Function to reinitialize rate charts with Markets-style tooltip logic
window.reinitializeRateCharts = function reinitializeRateCharts() {
    const rateChartConfigs = [
        { id: '2yr-chart', color: '#FF5722' },
        { id: '10yr-chart', color: '#2196F3' },
        { id: '30yr-chart', color: '#4CAF50' },
        { id: 'sofr-chart', color: '#FF9800' },
        { id: 'fedfunds-chart', color: '#9C27B0' },
        { id: 'tbill-chart', color: '#00BCD4' },
        { id: 'mortgage-chart', color: '#E91E63' },
        { id: 'highyield-chart', color: '#795548' },
        { id: 'prime-chart', color: '#607D8B' }
    ];
    
    let reinitializedCount = 0;
    console.log('🔄 Reinitializing rate charts with Markets-style tooltip logic...');
    
    rateChartConfigs.forEach(config => {
        const canvas = document.getElementById(config.id);
        console.log(`\n🔍 Processing ${config.id}:`);
        
        if (canvas) {
            // Destroy existing chart if it exists
            if (canvas.chart) {
                canvas.chart.destroy();
                console.log(`  Destroyed existing chart`);
            }
            
            // Create new chart with Markets-style configuration
            const chartData = {
                labels: [],
                originalDates: [], // Store original dates for tooltips
                datasets: [{
                    data: [],
                    borderColor: config.color,
                    backgroundColor: config.color + '20',
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 4
                }]
            };
            
            // Use same tooltip logic as Markets tab but with MM/DD/YYYY format
            const chartOptions = {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: window.chartUtils ? window.chartUtils.getTooltipConfig('percentage', 'MM/DD/YYYY') : {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(context) {
                                    const index = context[0].dataIndex;
                                    const originalDates = context[0].chart.data.originalDates;
                                    if (originalDates && originalDates[index]) {
                                        const date = new Date(originalDates[index]);
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const year = date.getFullYear();
                                        return `${month}/${day}/${year}`;
                                    }
                                    return '';
                                },
                                label: function(context) {
                                    return context.parsed.y.toFixed(2) + '%';
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
                                autoSkip: false
                            }
                        },
                        y: {
                            display: true,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' },
                            ticks: {
                                font: { size: 10 },
                                callback: function(value) {
                                    return value.toFixed(1) + '%';
                                }
                            }
                        }
                    }
                }
            };
            
            canvas.chart = new Chart(canvas, chartOptions);
            reinitializedCount++;
            console.log(`  ✅ Reinitialized with Markets-style tooltip logic`);
        } else {
            console.log(`  ❌ Canvas element not found`);
        }
    });
    
    console.log(`\n🎯 Reinitialized ${reinitializedCount} rate charts`);
    
    // Auto-populate with sample data for testing
    setTimeout(() => {
        window.populateRateChartsWithSampleData();
    }, 100);
    
    return `Reinitialized ${reinitializedCount} charts`;
};

// Function to populate rate charts with sample data for testing
window.populateRateChartsWithSampleData = function populateRateChartsWithSampleData() {
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 'fedfunds-chart', 
                         'tbill-chart', 'mortgage-chart', 'highyield-chart', 'prime-chart'];
    
    // Generate sample dates (last 13 months)
    const dates = [];
    const originalDates = [];
    const today = new Date();
    
    for (let i = 12; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        originalDates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
        
        // Format for display using chartUtils
        if (window.chartUtils) {
            const formatted = window.chartUtils.formatChartAxis([date.toISOString().split('T')[0]], 'monthly');
            dates.push(formatted[0]);
        } else {
            dates.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        }
    }
    
    let populatedCount = 0;
    console.log('📊 Populating rate charts with sample data...');
    
    rateChartIds.forEach((chartId, index) => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart) {
            // Generate sample rate data (different base rates for different charts)
            const baseRate = 2 + (index * 0.5); // 2%, 2.5%, 3%, etc.
            const sampleData = dates.map((_, i) => {
                return baseRate + Math.random() * 2 - 1; // +/- 1% variation
            });
            
            canvas.chart.data.labels = dates;
            canvas.chart.data.originalDates = originalDates;
            canvas.chart.data.datasets[0].data = sampleData;
            canvas.chart.update();
            
            populatedCount++;
            console.log(`  ✅ Populated ${chartId} with ${sampleData.length} data points`);
        }
    });
    
    console.log(`\n🎯 Populated ${populatedCount} rate charts with sample data`);
    return `Populated ${populatedCount} charts`;
};

// Function to apply Markets-style tooltip formatting while preserving existing data
window.applyTooltipFormattingToExistingCharts = function applyTooltipFormattingToExistingCharts() {
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 'fedfunds-chart', 
                         'tbill-chart', 'mortgage-chart', 'highyield-chart', 'prime-chart'];
    
    let updatedCount = 0;
    console.log('🔧 Applying Markets-style tooltip formatting to existing rate charts...');
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        console.log(`\n🔍 Processing ${chartId}:`);
        
        if (canvas && canvas.chart) {
            const chart = canvas.chart;
            console.log(`  Chart exists with ${chart.data.datasets[0].data.length} data points`);
            
            // Preserve existing data
            const existingLabels = [...chart.data.labels];
            const existingData = [...chart.data.datasets[0].data];
            const existingOriginalDates = chart.data.originalDates ? [...chart.data.originalDates] : null;
            
            console.log(`  Existing originalDates: ${!!existingOriginalDates}, Labels: ${existingLabels.length}`);
            
            // Apply new tooltip configuration (Markets-style but with MM/DD/YYYY)
            if (!chart.options.plugins) chart.options.plugins = {};
            if (!chart.options.plugins.tooltip) chart.options.plugins.tooltip = {};
            
            chart.options.plugins.tooltip = window.chartUtils ? 
                window.chartUtils.getTooltipConfig('percentage', 'MM/DD/YYYY') : {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const originalDates = context[0].chart.data.originalDates;
                            if (originalDates && originalDates[index]) {
                                const dateStr = originalDates[index];
                                // Handle multiple date formats
                                let date;
                                
                                // Try different parsing approaches
                                if (dateStr.includes('/')) {
                                    // Format: MM/DD/YY or MM/DD/YYYY
                                    const parts = dateStr.split('/');
                                    if (parts.length === 3) {
                                        const month = parseInt(parts[0]) - 1; // months are 0-indexed
                                        const day = parseInt(parts[1]);
                                        let year = parseInt(parts[2]);
                                        // Handle 2-digit years
                                        if (year < 50) year += 2000;
                                        else if (year < 100) year += 1900;
                                        date = new Date(year, month, day);
                                    }
                                } else if (dateStr.includes('-')) {
                                    // Format: YYYY-MM-DD
                                    date = new Date(dateStr + 'T00:00:00');
                                } else {
                                    // Fallback to standard parsing
                                    date = new Date(dateStr);
                                }
                                
                                if (date && !isNaN(date.getTime())) {
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const year = date.getFullYear();
                                    return `${month}/${day}/${year}`;
                                }
                                
                                // Debug output if parsing fails
                                console.warn(`Failed to parse date: "${dateStr}"`);
                                return dateStr;
                            }
                            return '';
                        },
                        label: function(context) {
                            return context.parsed.y.toFixed(2) + '%';
                        }
                    }
                };
            
            // Update chart with preserved data
            chart.update('none');
            updatedCount++;
            console.log(`  ✅ Applied new tooltip formatting, preserved ${existingData.length} data points`);
            
        } else {
            console.log(`  ❌ Chart not found or not initialized`);
        }
    });
    
    console.log(`\n🎯 Updated tooltip formatting for ${updatedCount} charts while preserving data`);
    return `Updated ${updatedCount} charts`;
};

// Function to debug date formats in rate charts
window.debugDateFormats = function debugDateFormats() {
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 'fedfunds-chart', 
                         'tbill-chart', 'mortgage-chart', 'highyield-chart', 'prime-chart'];
    
    console.log('🔍 Debugging date formats in rate charts:');
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart && canvas.chart.data.originalDates) {
            const originalDates = canvas.chart.data.originalDates;
            console.log(`\n📊 ${chartId}:`);
            console.log(`  Original dates count: ${originalDates.length}`);
            console.log(`  First 3 original dates:`, originalDates.slice(0, 3));
            console.log(`  Last 3 original dates:`, originalDates.slice(-3));
            
            // Test date parsing
            if (originalDates.length > 0) {
                const testDate = originalDates[0];
                console.log(`  Testing date parsing for: "${testDate}"`);
                console.log(`  new Date("${testDate}"):`, new Date(testDate));
                console.log(`  Date object year:`, new Date(testDate).getFullYear());
                console.log(`  Date object month:`, new Date(testDate).getMonth() + 1);
                console.log(`  Date object day:`, new Date(testDate).getDate());
            }
        } else {
            console.log(`\n📊 ${chartId}: No chart or originalDates found`);
        }
    });
};

// SIMPLE DIAGNOSTIC - This will definitely work
window.simpleTest = function simpleTest() {
    console.log('=== SIMPLE CHART TEST ===');
    
    // Test if any rate chart exists
    const testChart = document.getElementById('tbill-chart');
    console.log('tbill-chart element exists:', !!testChart);
    
    if (testChart) {
        console.log('tbill-chart has .chart property:', !!testChart.chart);
        
        if (testChart.chart) {
            const chart = testChart.chart;
            console.log('Chart type:', typeof chart);
            console.log('Has data:', !!chart.data);
            
            if (chart.data) {
                console.log('Labels exist:', !!chart.data.labels);
                console.log('Labels length:', chart.data.labels ? chart.data.labels.length : 0);
                console.log('First 3 labels:', chart.data.labels ? chart.data.labels.slice(0, 3) : 'none');
                
                console.log('OriginalDates exist:', !!chart.data.originalDates);
                if (chart.data.originalDates) {
                    console.log('OriginalDates length:', chart.data.originalDates.length);
                    console.log('First 3 original dates:', chart.data.originalDates.slice(0, 3));
                }
                
                console.log('Dataset exists:', !!(chart.data.datasets && chart.data.datasets[0]));
                if (chart.data.datasets && chart.data.datasets[0]) {
                    console.log('Data points:', chart.data.datasets[0].data.length);
                    console.log('First 3 values:', chart.data.datasets[0].data.slice(0, 3));
                }
            }
        }
    }
    
    return 'Test complete - check console output above';
};

// BACKUP DIAGNOSTIC FUNCTION - Run this and share the output  
window.diagnoseRateChartData = function diagnoseRateChartData() {
    console.log('\n🔍 COMPREHENSIVE RATE CHART DIAGNOSIS:');
    console.log('=====================================');
    
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 'fedfunds-chart', 
                         'tbill-chart', 'mortgage-chart', 'highyield-chart', 'prime-chart'];
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        console.log(`\n📊 ${chartId.toUpperCase()}:`);
        console.log('─'.repeat(50));
        
        if (!canvas) {
            console.log('❌ Canvas element NOT FOUND');
            return;
        }
        
        if (!canvas.chart) {
            console.log('❌ Chart object NOT FOUND');
            return;
        }
        
        const chart = canvas.chart;
        console.log('✅ Chart exists');
        
        // Chart data structure
        console.log(`📈 Data Points: ${chart.data.datasets[0].data.length}`);
        console.log(`🏷️  Labels: ${chart.data.labels.length}`);
        console.log(`📅 Original Dates: ${chart.data.originalDates ? chart.data.originalDates.length : 'NOT FOUND'}`);
        
        // Sample data
        console.log('\n📋 SAMPLE DATA:');
        console.log(`First 5 labels:`, chart.data.labels.slice(0, 5));
        console.log(`Last 5 labels:`, chart.data.labels.slice(-5));
        console.log(`First 5 data values:`, chart.data.datasets[0].data.slice(0, 5));
        console.log(`Last 5 data values:`, chart.data.datasets[0].data.slice(-5));
        
        if (chart.data.originalDates) {
            console.log(`First 5 original dates:`, chart.data.originalDates.slice(0, 5));
            console.log(`Last 5 original dates:`, chart.data.originalDates.slice(-5));
            
            // Test date parsing
            const testDate = chart.data.originalDates[0];
            console.log(`\n🧪 DATE PARSING TEST for "${testDate}":`);
            const parsedDate = new Date(testDate);
            console.log(`new Date("${testDate}") =`, parsedDate);
            console.log(`Year: ${parsedDate.getFullYear()}`);
            console.log(`Month: ${parsedDate.getMonth() + 1}`);
            console.log(`Day: ${parsedDate.getDate()}`);
            console.log(`isValid: ${!isNaN(parsedDate.getTime())}`);
            
            if (!isNaN(parsedDate.getTime())) {
                console.log(`toLocaleDateString: ${parsedDate.toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit', 
                    year: 'numeric'
                })}`);
            }
        } else {
            console.log('❌ NO ORIGINAL DATES - This is the problem!');
        }
        
        // Tooltip configuration
        console.log(`\n⚙️  TOOLTIP CONFIG:`);
        const hasTooltip = !!(chart.options.plugins && chart.options.plugins.tooltip);
        console.log(`Has tooltip config: ${hasTooltip}`);
        
        if (hasTooltip && chart.options.plugins.tooltip.callbacks) {
            console.log(`Has title callback: ${!!chart.options.plugins.tooltip.callbacks.title}`);
            console.log(`Has label callback: ${!!chart.options.plugins.tooltip.callbacks.label}`);
        }
    });
    
    console.log('\n🎯 SUMMARY NEEDED:');
    console.log('Please share this output so I can see:');
    console.log('1. What format your original dates are in');
    console.log('2. What your labels look like'); 
    console.log('3. Whether originalDates exist');
    console.log('4. What the date parsing results are');
    console.log('=====================================\n');
};

// Function to force update rate chart tooltips
window.forceUpdateRateTooltips = function forceUpdateRateTooltips() {
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 'fedfunds-chart', 
                         'tbill-chart', 'mortgage-chart', 'highyield-chart', 'prime-chart'];
    
    let updatedCount = 0;
    console.log('🔧 Starting rate chart tooltip update...');
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        console.log(`\n🔍 Processing ${chartId}:`);
        console.log(`  Element found: ${!!canvas}`);
        
        if (canvas) {
            console.log(`  Chart object exists: ${!!canvas.chart}`);
            
            if (canvas.chart) {
                // Ensure plugins structure exists
                if (!canvas.chart.options.plugins) {
                    canvas.chart.options.plugins = {};
                    console.log(`  Created plugins object`);
                }
                if (!canvas.chart.options.plugins.tooltip) {
                    canvas.chart.options.plugins.tooltip = {};
                    console.log(`  Created tooltip object`);
                }
                
                // Set up the tooltip callbacks
                canvas.chart.options.plugins.tooltip.callbacks = {
                    title: function(context) {
                        console.log(`🎯 Tooltip title called for ${chartId}`);
                        const index = context[0].dataIndex;
                        const originalDates = context[0].chart.data.originalDates;
                        console.log(`  Index: ${index}, OriginalDates exist: ${!!originalDates}`);
                        
                        if (originalDates && originalDates[index]) {
                            const dateStr = originalDates[index];
                            console.log(`  Raw date: ${dateStr}`);
                            const date = new Date(dateStr);
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const year = date.getFullYear();
                            const formatted = `${month}/${day}/${year}`;
                            console.log(`  Formatted date: ${formatted}`);
                            return formatted;
                        }
                        console.log(`  No originalDates or index not found`);
                        return context[0].label || '';
                    },
                    label: function(context) {
                        return context.parsed.y.toFixed(2) + '%';
                    }
                };
                
                canvas.chart.update('none'); // Use 'none' mode for faster update
                updatedCount++;
                console.log(`  ✅ Updated tooltip configuration`);
            } else {
                console.log(`  ❌ No chart object found`);
            }
        } else {
            console.log(`  ❌ Canvas element not found`);
        }
    });
    
    console.log(`\n🎯 Updated ${updatedCount} rate charts`);
    return `Updated ${updatedCount} charts`;
}

// Test the tooltip date formatting fix
function testTooltipFix() {
    if (window.chartUtils) {
        console.log('Testing tooltip date formatting:');
        console.log('9/10/2024 -> MM/DD/YYYY:', window.chartUtils.formatTooltipDate('9/10/2024', 'MM/DD/YYYY'));
        console.log('9/11/2024 -> MM/DD/YYYY:', window.chartUtils.formatTooltipDate('9/11/2024', 'MM/DD/YYYY'));
        console.log('12/1/2024 -> MM/DD/YYYY:', window.chartUtils.formatTooltipDate('12/1/2024', 'MM/DD/YYYY'));
        console.log('1/15/2024 -> MM/DD/YYYY:', window.chartUtils.formatTooltipDate('1/15/2024', 'MM/DD/YYYY'));
        
        // Test rate chart tooltip
        const rateChart = window.ChartConfig?.charts?.['2yr'];
        if (rateChart && rateChart.data.originalDates) {
            console.log('Rate chart original dates sample:', rateChart.data.originalDates.slice(0, 5));
            console.log('Formatted samples:');
            rateChart.data.originalDates.slice(0, 5).forEach(date => {
                console.log(`${date} -> ${window.chartUtils.formatTooltipDate(date, 'MM/DD/YYYY')}`);
            });
        }
    } else {
        console.log('chartUtils not available');
    }
}

// Debug rate chart status
function debugRateCharts() {
    console.log('🔍 Debugging Rate Charts Status:');
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 'fedfunds-chart', 'tbill-chart', 'mortgage-chart', 'highyield-chart', 'prime-chart'];
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        const cleanId = chartId.replace('-chart', '');
        const configChart = window.ChartConfig?.charts?.[cleanId];
        
        console.log(`\n📊 ${chartId}:`);
        console.log(`  Canvas exists: ${!!canvas}`);
        console.log(`  Canvas.chart exists: ${!!(canvas?.chart)}`);
        console.log(`  ChartConfig.charts['${cleanId}'] exists: ${!!configChart}`);
        
        if (canvas?.chart) {
            console.log(`  Labels count: ${canvas.chart.data.labels?.length || 0}`);
            console.log(`  Data count: ${canvas.chart.data.datasets?.[0]?.data?.length || 0}`);
            console.log(`  OriginalDates count: ${canvas.chart.data.originalDates?.length || 0}`);
            console.log(`  Sample labels: ${(canvas.chart.data.labels || []).slice(0, 3)}`);
        }
    });
}

// Test the updated tooltip date formatting
function testUpdatedTooltipFix() {
    if (window.chartUtils) {
        console.log('🧪 Testing Updated Tooltip Date Formatting:');
        
        // Test the problematic formats from the diagnostic
        console.log('Jul 24 -> MM/DD/YYYY:', window.chartUtils.formatTooltipDate('Jul 24', 'MM/DD/YYYY'));
        console.log('Aug -> MM/DD/YYYY:', window.chartUtils.formatTooltipDate('Aug', 'MM/DD/YYYY'));
        console.log('Sep -> MM/DD/YYYY:', window.chartUtils.formatTooltipDate('Sep', 'MM/DD/YYYY'));
        
        // Test the working format
        console.log('9/10/2024 -> MM/DD/YYYY:', window.chartUtils.formatTooltipDate('9/10/2024', 'MM/DD/YYYY'));
        
        console.log('\n🔧 Testing on actual chart data:');
        const chart2yr = document.getElementById('2yr-chart')?.chart;
        if (chart2yr && chart2yr.data.originalDates) {
            console.log('2yr originalDates sample:', chart2yr.data.originalDates.slice(0, 3));
            chart2yr.data.originalDates.slice(0, 3).forEach((date, i) => {
                console.log(`  ${i}: "${date}" -> ${window.chartUtils.formatTooltipDate(date, 'MM/DD/YYYY')}`);
            });
        }
    } else {
        console.log('chartUtils not available');
    }
}

// Fix the repeated labels issue by regenerating proper monthly labels
function fixRateChartLabels() {
    console.log('🔧 Fixing Rate Chart Labels...');
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 'fedfunds-chart', 'tbill-chart', 'highyield-chart'];
    
    let fixedCount = 0;
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart) {
            const chart = canvas.chart;
            const dataCount = chart.data.datasets[0].data.length;
            
            console.log(`\n📊 ${chartId}: ${dataCount} data points`);
            
            if (dataCount > 0) {
                // Generate proper monthly labels based on data count
                // Assuming 12+ months of daily data, create ~13 monthly labels
                const labels = [];
                const monthsToShow = Math.min(13, Math.ceil(dataCount / 30)); // Rough estimate
                
                // Start from current date and go back
                const endDate = new Date();
                const startDate = new Date();
                startDate.setMonth(endDate.getMonth() - monthsToShow + 1);
                
                // Generate monthly labels
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                for (let i = 0; i < dataCount; i++) {
                    // Calculate which month this data point represents
                    const pointDate = new Date(startDate);
                    pointDate.setDate(startDate.getDate() + i);
                    
                    // Only add label for first occurrence of each month
                    if (i === 0 || pointDate.getMonth() !== new Date(startDate.getTime() + (i-1) * 24*60*60*1000).getMonth()) {
                        const year = pointDate.getFullYear().toString().slice(-2);
                        labels.push(`${monthNames[pointDate.getMonth()]} '${year}`);
                    } else {
                        labels.push('');
                    }
                }
                
                // Update the chart
                chart.data.labels = labels;
                chart.update('none');
                
                fixedCount++;
                console.log(`  ✅ Updated with ${labels.filter(l => l !== '').length} monthly labels`);
            }
        }
    });
    
    console.log(`\n🎯 Fixed labels for ${fixedCount} rate charts`);
    return `Fixed ${fixedCount} charts`;
}

// Fix rate charts formatting and ensure they all load properly
function fixRateChartsFormatting() {
    console.log('🔧 Fixing Rate Charts Formatting...');
    const rateChartConfigs = [
        { id: '2yr-chart', dataKey: 'treasury2yr', color: '#FF5722' },
        { id: '5yr-chart', dataKey: 'treasury5yr', color: '#673AB7' },
        { id: '10yr-chart', dataKey: 'treasury10yr', color: '#2196F3' },
        { id: '30yr-chart', dataKey: 'treasury30yr', color: '#4CAF50' },
        { id: 'sofr-chart', dataKey: 'sofr1m', color: '#FF9800' },
        { id: 'fedfunds-chart', dataKey: 'fedFunds', color: '#9C27B0' },
        { id: 'tbill-chart', dataKey: 'tbill3m', color: '#00BCD4' },
        { id: 'mortgage-chart', dataKey: 'mortgage30yr', color: '#E91E63' },
        { id: 'highyield-chart', dataKey: 'highYield', color: '#795548' },
        { id: 'prime-chart', dataKey: 'primeRate', color: '#607D8B' }
    ];
    
    let fixedCount = 0;
    
    rateChartConfigs.forEach(config => {
        const canvas = document.getElementById(config.id);
        console.log(`\n🔧 Processing ${config.id}:`);
        
        if (canvas) {
            let chart = canvas.chart;
            let needsInitialization = false;
            
            // Check if chart exists and is properly configured
            if (!chart) {
                console.log(`  Creating new chart instance...`);
                needsInitialization = true;
            } else {
                console.log(`  Chart exists, checking configuration...`);
            }
            
            // Initialize or reinitialize chart if needed
            if (needsInitialization) {
                const chartData = {
                    labels: [],
                    originalDates: [],
                    datasets: [{
                        data: [],
                        borderColor: config.color,
                        backgroundColor: config.color + '20',
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    }]
                };
                
                // Use mock data if available
                if (window.mockData && window.mockData.rates && window.mockData.rates[config.dataKey]) {
                    const data = window.mockData.rates[config.dataKey];
                    if (data.dates && data.dates.length > 0) {
                        if (window.chartUtils) {
                            chartData.labels = window.chartUtils.formatChartAxis(data.dates, 'monthly');
                            chartData.originalDates = data.dates;
                        } else {
                            chartData.labels = data.dates;
                        }
                        chartData.datasets[0].data = data.historicalData || [];
                    }
                }
                
                const chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: window.chartUtils ? window.chartUtils.getTooltipConfig('percentage', 'MM/DD/YYYY') : {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(context) {
                                    const index = context[0].dataIndex;
                                    const originalDates = context[0].chart.data.originalDates;
                                    if (originalDates && originalDates[index]) {
                                        const date = new Date(originalDates[index]);
                                        if (!isNaN(date.getTime())) {
                                            return date.toLocaleDateString('en-US', {
                                                month: '2-digit',
                                                day: '2-digit',
                                                year: 'numeric'
                                            });
                                        }
                                    }
                                    return '';
                                },
                                label: function(context) {
                                    return context.parsed.y.toFixed(2) + '%';
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
                                autoSkip: false
                            }
                        },
                        y: {
                            display: true,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' },
                            ticks: {
                                font: { size: 10 },
                                callback: function(value) {
                                    return value.toFixed(2) + '%';
                                }
                            }
                        }
                    }
                };
                
                const ctx = canvas.getContext('2d');
                chart = new Chart(ctx, {
                    type: 'line',
                    data: chartData,
                    options: chartOptions
                });
                
                canvas.chart = chart;
                
                // Also register with ChartConfig if available
                if (window.ChartConfig) {
                    const cleanId = config.id.replace('-chart', '');
                    window.ChartConfig.charts[cleanId] = chart;
                }
                
                fixedCount++;
                console.log(`  ✅ Chart created successfully`);
            }
        } else {
            console.log(`  ❌ Canvas not found`);
        }
    });
    
    console.log(`\n🎯 Fixed ${fixedCount} rate charts`);
    return `Fixed ${fixedCount} charts`;
}

// Refresh data every 5 minutes (when connected to real APIs)
// setInterval(updateDashboardData, 300000);

// Function to add period returns to rate cards
function addPeriodReturnsToRates() {
    const rateCards = ['sofr', '2yr', '10yr', '30yr', 'fedfunds', 'tbill', 'highyield', 'spread'];
    
    rateCards.forEach(cardId => {
        const chartElement = document.getElementById(cardId + '-chart');
        if (chartElement) {
            const card = chartElement.closest('.card');
            if (card && !card.querySelector('.period-returns')) {
                const changeElement = card.querySelector('.card-change');
                if (changeElement) {
                    const periodReturns = document.createElement('div');
                    periodReturns.className = 'period-returns';
                    periodReturns.innerHTML = `
                        <div class="return-item"><span class="return-label">1W:</span><span class="return-value">--</span></div>
                        <div class="return-item"><span class="return-label">1M:</span><span class="return-value">--</span></div>
                        <div class="return-item"><span class="return-label">YTD:</span><span class="return-value">--</span></div>
                        <div class="return-item"><span class="return-label">1Y:</span><span class="return-value">--</span></div>
                        <div class="return-item"><span class="return-label">3Y:</span><span class="return-value">--</span></div>
                        <div class="return-item"><span class="return-label">5Y:</span><span class="return-value">--</span></div>
                    `;
                    changeElement.insertAdjacentElement('afterend', periodReturns);
                }
            }
        }
    });
}

// Call this function after DOM loads
document.addEventListener('DOMContentLoaded', addPeriodReturnsToRates);

// Fix Fed Funds period returns formatting to match other rate charts
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const fedFundsChart = document.getElementById('fedfunds-chart');
        if (fedFundsChart) {
            const card = fedFundsChart.closest('.card');
            if (card) {
                const periodReturns = card.querySelector('.period-returns');
                if (periodReturns) {
                    const returnValues = periodReturns.querySelectorAll('.return-value');
                    returnValues.forEach(rv => {
                        const text = rv.textContent.trim();
                        // Check if it needs reformatting (doesn't have 'bps' and has a value)
                        if (text !== '--' && !text.includes('bps')) {
                            // Parse the value
                            let value = parseFloat(text.replace(/[^-\d.]/g, ''));
                            if (!isNaN(value)) {
                                // Convert to basis points if needed
                                const bpsValue = Math.abs(value * 100).toFixed(0);
                                rv.textContent = (value >= 0 ? '+' : '-') + bpsValue + 'bps';
                                // Add color classes (for rates, positive = red/negative, negative = green/positive)
                                rv.className = 'return-value ' + (value >= 0 ? 'negative' : 'positive');
                            }
                        }
                    });
                }
            }
        }
    }, 3000); // Wait for data to load
});
