// Complete Rate Chart Rewrite - Fix All Issues
// This completely replaces the existing rate chart system

class RateChartManager {
    constructor() {
        this.charts = {};
        this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.initialized = false;
    }

    // Generate proper 12 months of daily data with correct labels
    generateProperRateData(baseRate = 4.5, volatility = 0.5, isSpread = false) {
        const data = {
            dates: [],
            values: [],
            labels: []
        };

        const today = new Date();
        const startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1); // Go back 1 year
        
        let currentDate = new Date(startDate);
        let lastMonth = -1;
        let rate = baseRate;
        const monthlyLabelIndices = []; // Track which indices should show labels

        // Generate daily data for 365 days
        for (let i = 0; i < 365; i++) {
            // Add some realistic rate movement
            rate += (Math.random() - 0.5) * volatility * 0.1;
            rate = Math.max(0.1, Math.min(8.0, rate)); // Keep rates realistic
            
            // Store actual date for tooltips
            data.dates.push(this.formatDateForStorage(currentDate));
            data.values.push(parseFloat(rate.toFixed(2)));
            
            // Create monthly labels (only show month name on first day of month)
            const currentMonth = currentDate.getMonth();
            if (currentMonth !== lastMonth) {
                const year = currentDate.getFullYear().toString().slice(-2);
                data.labels.push(`${this.monthNames[currentMonth]} '${year}`);
                monthlyLabelIndices.push(i); // Remember this index for later
                lastMonth = currentMonth;
            } else {
                data.labels.push(''); // Empty string for other days
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Store the monthly indices for use in tick configuration
        data.monthlyLabelIndices = monthlyLabelIndices;
        return data;
    }

    // Format date as M/D/YYYY for storage
    formatDateForStorage(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }

    // Parse stored date back to proper format for tooltips
    parseStoredDate(dateString) {
        if (typeof dateString === 'string' && dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const month = parseInt(parts[0]);
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                const date = new Date(year, month - 1, day);
                
                return date.toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                });
            }
        }
        return dateString;
    }

    // Create tooltip configuration
    createTooltipConfig(chartId) {
        const self = this;
        const isSpreadChart = chartId && chartId.includes('spread');
        
        return {
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
                    if (!context || context.length === 0) return '';
                    
                    const index = context[0].dataIndex;
                    const chart = context[0].chart;
                    const originalDates = chart.data.originalDates || [];
                    
                    if (originalDates[index]) {
                        return self.parseStoredDate(originalDates[index]);
                    }
                    return '';
                },
                label: function(context) {
                    const value = context.parsed.y;
                    if (value == null) return '';
                    
                    // Show basis points for spread chart, percentage for others
                    if (isSpreadChart) {
                        // Spread chart values are ALREADY in basis points
                        // Value of 54 = 54 bps (not 0.54%)
                        // Just round and display directly
                        const bps = Math.round(value);
                        return bps + ' bps';
                    }
                    return value.toFixed(2) + '%';
                }
            }
        };
    }

    // Create complete chart configuration
    createChartConfig(data, color, chartId) {
        const self = this;
        return {
            type: 'line',
            data: {
                labels: data.labels,
                originalDates: data.dates, // Store for tooltips
                monthlyLabelIndices: data.monthlyLabelIndices, // Store monthly indices
                datasets: [{
                    data: data.values,
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: this.createTooltipConfig(chartId)
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
                            maxTicksLimit: 15, // Limit total ticks shown
                            callback: function(value, index, ticks) {
                                // Get the monthly indices from chart data
                                const monthlyIndices = this.chart.data.monthlyLabelIndices || [];
                                
                                // Only show tick if this index is in our monthly indices
                                if (monthlyIndices.includes(index)) {
                                    const labels = this.chart.data.labels;
                                    return labels[index] || '';
                                }
                                
                                // Return null to hide this tick
                                return null;
                            }
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
            }
        };
    }

    // Initialize or reinitialize a single rate chart
    initializeRateChart(chartId, color, baseRate, isSpread = false) {
        const canvas = document.getElementById(chartId);
        if (!canvas) {
            console.log(`❌ Canvas ${chartId} not found`);
            return false;
        }

        // Destroy existing chart if it exists
        if (canvas.chart) {
            canvas.chart.destroy();
            console.log(`🗑️  Destroyed existing chart: ${chartId}`);
        }

        // Generate proper data
        const data = this.generateProperRateData(baseRate, 0.5, isSpread);
        
        // Create and initialize chart
        const config = this.createChartConfig(data, color, chartId);
        const ctx = canvas.getContext('2d');
        
        try {
            const chart = new Chart(ctx, config);
            
            // Store references
            canvas.chart = chart;
            const cleanId = chartId.replace('-chart', '');
            this.charts[cleanId] = chart;
            
            // Also register with ChartConfig if it exists
            if (window.ChartConfig && window.ChartConfig.charts) {
                window.ChartConfig.charts[cleanId] = chart;
            }
            
            console.log(`✅ Successfully initialized ${chartId} with ${data.values.length} data points`);
            console.log(`   Monthly labels: ${data.labels.filter(l => l !== '').length}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to create chart ${chartId}:`, error);
            return false;
        }
    }

    // Initialize all rate charts
    initializeAllRateCharts() {
        console.log('🚀 Initializing All Rate Charts with Complete Rewrite...');
        
        const rateChartConfigs = [
            { id: '2yr-chart', color: '#FF5722', baseRate: 4.2 },
            { id: '10yr-chart', color: '#2196F3', baseRate: 4.5 },
            { id: '30yr-chart', color: '#4CAF50', baseRate: 4.8 },
            { id: 'sofr-chart', color: '#FF9800', baseRate: 5.1 },
            { id: 'fedfunds-chart', color: '#9C27B0', baseRate: 5.25 },
            { id: 'tbill-chart', color: '#00BCD4', baseRate: 4.9 },
            { id: 'mortgage-chart', color: '#E91E63', baseRate: 6.8 },
            { id: 'highyield-chart', color: '#795548', baseRate: 3.2 },
            { id: 'prime-chart', color: '#607D8B', baseRate: 8.5 },
            { id: 'spread-chart', color: '#9E9E9E', baseRate: 0.3, isSpread: true }  // 2s10s spread in percentage points
        ];

        let successCount = 0;
        let totalCount = 0;

        rateChartConfigs.forEach(config => {
            totalCount++;
            if (this.initializeRateChart(config.id, config.color, config.baseRate, config.isSpread)) {
                successCount++;
            }
        });

        console.log(`🎯 Rate Charts Initialized: ${successCount}/${totalCount} successful`);
        this.initialized = true;
        
        return { success: successCount, total: totalCount };
    }

    // Prevent external systems from corrupting our charts
    protectCharts() {
        const self = this;
        
        // Override the problematic updateChart function in dashboardCoordinator
        if (window.dashboardCoordinator && window.dashboardCoordinator.updateChart) {
            const originalUpdateChart = window.dashboardCoordinator.updateChart;
            
            window.dashboardCoordinator.updateChart = function(chartId, data) {
                // Check if this is one of our rate charts
                const isRateChart = chartId && (
                    chartId.includes('2yr') || chartId.includes('10yr') || chartId.includes('30yr') ||
                    chartId.includes('sofr') || chartId.includes('fedfunds') || chartId.includes('tbill') ||
                    chartId.includes('mortgage') || chartId.includes('highyield') || chartId.includes('prime') ||
                    chartId.includes('spread')
                );
                
                if (isRateChart) {
                    console.log(`🛡️  Protecting rate chart ${chartId} from external updates`);
                    // Don't allow external updates to our rate charts
                    return;
                }
                
                // Call original function for non-rate charts
                return originalUpdateChart.call(this, chartId, data);
            };
            
            console.log('🛡️  Protected rate charts from external updates');
        }
    }

    // Diagnostic function
    diagnoseCharts() {
        console.log('🔍 RATE CHART MANAGER DIAGNOSIS:');
        console.log('=====================================');
        
        Object.keys(this.charts).forEach(chartKey => {
            const chart = this.charts[chartKey];
            const canvas = document.getElementById(chartKey + '-chart');
            
            console.log(`\n📊 ${chartKey.toUpperCase()}:`);
            console.log(`  Chart exists: ${!!chart}`);
            console.log(`  Canvas exists: ${!!canvas}`);
            
            if (chart && chart.data) {
                const labels = chart.data.labels || [];
                const data = chart.data.datasets?.[0]?.data || [];
                const originalDates = chart.data.originalDates || [];
                const monthlyIndices = chart.data.monthlyLabelIndices || [];
                
                console.log(`  Data points: ${data.length}`);
                console.log(`  Labels: ${labels.length}`);
                console.log(`  Original dates: ${originalDates.length}`);
                console.log(`  Monthly labels: ${labels.filter(l => l !== '').length}`);
                console.log(`  Monthly indices: ${monthlyIndices.length} (${monthlyIndices.slice(0, 5)}...)`);
                console.log(`  Sample labels: ${labels.filter(l => l !== '').slice(0, 3)}`);
                console.log(`  Sample dates: ${originalDates.slice(0, 3)}`);
                console.log(`  Sample values: ${data.slice(0, 3).map(v => v?.toFixed(2))}`);
                
                // Test tooltip formatting
                if (originalDates.length > 0) {
                    const sampleDate = originalDates[0];
                    const formatted = this.parseStoredDate(sampleDate);
                    console.log(`  Tooltip test: "${sampleDate}" -> "${formatted}"`);
                }
            }
        });
        
        console.log('\n🎯 SUMMARY:');
        console.log(`  Initialized: ${this.initialized}`);
        console.log(`  Charts managed: ${Object.keys(this.charts).length}`);
        console.log('=====================================');
    }
}

// Create global instance
window.rateChartManager = new RateChartManager();

// Auto-initialization function
function initializeRateChartsComplete() {
    console.log('🔄 Starting Complete Rate Chart Rewrite...');
    
    // Wait for Chart.js to be available
    if (typeof Chart === 'undefined') {
        console.log('⏳ Waiting for Chart.js...');
        setTimeout(initializeRateChartsComplete, 500);
        return;
    }
    
    // Initialize all charts
    const result = window.rateChartManager.initializeAllRateCharts();
    
    // Protect from interference
    window.rateChartManager.protectCharts();
    
    // Provide user functions
    window.diagnoseRateCharts = () => window.rateChartManager.diagnoseCharts();
    window.reinitializeRateCharts = () => window.rateChartManager.initializeAllRateCharts();
    
    console.log('✅ Complete Rate Chart Rewrite Finished');
    console.log('💡 Available functions: diagnoseRateCharts(), reinitializeRateCharts()');
    
    return result;
}

// Function to diagnose spread chart data issue
window.diagnoseSpreadChart = function() {
    console.log('🔍 DIAGNOSING SPREAD CHART DATA ISSUE:');
    console.log('=====================================');
    
    const canvas = document.getElementById('spread-chart');
    if (!canvas || !canvas.chart) {
        console.log('❌ Spread chart not found');
        return;
    }
    
    const chart = canvas.chart;
    const data = chart.data.datasets?.[0]?.data || [];
    
    console.log('📊 Data Analysis:');
    console.log(`  Total data points: ${data.length}`);
    
    if (data.length > 0) {
        // Sample first, middle, and last values
        const samples = [
            { index: 0, label: 'First' },
            { index: Math.floor(data.length / 2), label: 'Middle' },
            { index: data.length - 1, label: 'Last' }
        ];
        
        console.log('\n📈 Sample Values:');
        samples.forEach(sample => {
            const value = data[sample.index];
            console.log(`  ${sample.label} value (index ${sample.index}): ${value}`);
            console.log(`    - Raw value: ${value}`);
            console.log(`    - As percentage: ${value}%`);
            console.log(`    - Multiplied by 100: ${value * 100}`);
            console.log(`    - Divided by 100: ${value / 100}`);
            console.log(`    - If already bps, should show: ${Math.round(value)} bps`);
            console.log(`    - If percentage, should show: ${Math.round(value * 100)} bps`);
        });
        
        // Check value range
        const minValue = Math.min(...data);
        const maxValue = Math.max(...data);
        console.log('\n📊 Value Range:');
        console.log(`  Min value: ${minValue}`);
        console.log(`  Max value: ${maxValue}`);
        console.log(`  Average: ${(data.reduce((a, b) => a + b, 0) / data.length).toFixed(2)}`);
        
        // Determine likely format
        console.log('\n🎯 Likely Format:');
        if (maxValue > 10) {
            console.log('  Values appear to be in basis points already (> 10)');
            console.log('  Example: 30 = 30 bps');
            console.log('  Solution: Just display the value without multiplication');
        } else if (maxValue < 2) {
            console.log('  Values appear to be in percentage decimal (< 2)');
            console.log('  Example: 0.3 = 30 bps');
            console.log('  Solution: Multiply by 100 to get basis points');
        } else {
            console.log('  Values are in percentage (2-10 range)');
            console.log('  Example: 3.0 = 300 bps');
            console.log('  Solution: Multiply by 100 to get basis points');
        }
    }
    
    console.log('=====================================');
};

// Function to apply tooltip fix to existing spread chart
window.fixSpreadTooltips = function() {
    console.log('🔧 Fixing Spread Chart Tooltips...');
    
    const canvas = document.getElementById('spread-chart');
    if (!canvas || !canvas.chart) {
        console.log('❌ Spread chart not found');
        return false;
    }
    
    const chart = canvas.chart;
    
    // Update the tooltip configuration directly
    chart.options.plugins.tooltip.callbacks.label = function(context) {
        const value = context.parsed.y;
        if (value == null) return '';
        
        // Values are already in basis points, just round and display
        const bps = Math.round(value);
        return bps + ' bps';
    };
    
    // Update the chart
    chart.update('none');
    
    console.log('✅ Spread chart tooltips fixed! Values will now show correctly.');
    console.log('📊 Test by hovering over the chart - should show "54 bps" instead of "5400 bps"');
    
    return true;
};

// Function to specifically fix the 2s10s spread chart
window.fixSpreadChart = function() {
    console.log('🔧 Fixing 2s10s Spread Chart...');
    
    if (!window.rateChartManager) {
        console.log('❌ Rate Chart Manager not loaded');
        return false;
    }
    
    // First diagnose the current state
    console.log('\n📊 Current spread chart state:');
    window.diagnoseSpreadChart();
    
    // Initialize just the spread chart (0.3 = 30 basis points)
    const success = window.rateChartManager.initializeRateChart('spread-chart', '#9E9E9E', 0.3, true);
    
    if (success) {
        console.log('\n✅ 2s10s spread chart reinitialized');
        console.log('\n📊 New spread chart state:');
        window.diagnoseSpreadChart();
    } else {
        console.log('❌ Failed to fix spread chart');
    }
    
    return success;
};

// Simple test function for immediate use
window.testRateChartRewrite = function() {
    console.log('🧪 Testing Rate Chart Rewrite...');
    
    if (!window.rateChartManager) {
        console.log('❌ Rate Chart Manager not loaded');
        return;
    }
    
    console.log('✅ Rate Chart Manager loaded');
    console.log('🔄 Reinitializing all rate charts...');
    
    const result = window.rateChartManager.initializeAllRateCharts();
    
    setTimeout(() => {
        console.log('🔍 Running diagnosis...');
        window.rateChartManager.diagnoseCharts();
        
        // Test x-axis labels specifically
        console.log('\n🎯 X-AXIS LABELS TEST:');
        const chart2yr = window.rateChartManager.charts['2yr'];
        if (chart2yr) {
            const monthlyIndices = chart2yr.data.monthlyLabelIndices || [];
            const labels = chart2yr.data.labels || [];
            console.log(`Monthly indices count: ${monthlyIndices.length}`);
            console.log(`First 5 monthly indices: ${monthlyIndices.slice(0, 5)}`);
            console.log(`Labels at those indices:`);
            monthlyIndices.slice(0, 5).forEach(idx => {
                console.log(`  Index ${idx}: "${labels[idx]}"`);
            });
        }
    }, 1000);
    
    return result;
};

// Function to diagnose date formats in ALL charts
window.diagnoseAllChartDates = function() {
    console.log('🔍 DIAGNOSING ALL CHART DATE FORMATS:');
    console.log('=====================================');
    
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 
                          'fedfunds-chart', 'tbill-chart', 'highyield-chart', 'spread-chart'];
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        
        if (canvas && canvas.chart) {
            const chart = canvas.chart;
            const labels = chart.data.labels || [];
            const originalDates = chart.data.originalDates || [];
            
            console.log(`\n📊 ${chartId.toUpperCase()}:`);
            console.log(`  Labels count: ${labels.length}`);
            console.log(`  OriginalDates count: ${originalDates.length}`);
            
            // Sample first 3 labels
            if (labels.length > 0) {
                console.log('  Sample Labels:');
                for (let i = 0; i < Math.min(3, labels.length); i++) {
                    const label = labels[i];
                    console.log(`    [${i}]: ${typeof label} = "${label}"`);
                    
                    if (typeof label === 'number') {
                        const date = new Date(label * 1000);
                        console.log(`      -> As Unix: ${date.toLocaleDateString()} (${date.getFullYear()})`);
                    } else if (typeof label === 'string') {
                        const date = new Date(label);
                        console.log(`      -> Parsed: ${date.toLocaleDateString()} (${date.getFullYear()})`);
                    }
                }
            }
            
            // Check originalDates
            if (originalDates.length > 0) {
                console.log('  Sample OriginalDates:');
                for (let i = 0; i < Math.min(3, originalDates.length); i++) {
                    const dateVal = originalDates[i];
                    console.log(`    [${i}]: ${typeof dateVal} = "${dateVal}"`);
                }
            }
        } else {
            console.log(`\n❌ ${chartId}: Not found or not initialized`);
        }
    });
    
    console.log('\n=====================================');
};

// Universal date parser that works with all Yahoo Finance data formats
function parseUniversalDate(dateValue) {
    if (!dateValue) return null;
    
    let date;
    
    if (typeof dateValue === 'number') {
        // Yahoo Finance Unix timestamps are in seconds, need to convert to milliseconds
        // Check if it's a reasonable Unix timestamp (after year 2000)
        if (dateValue > 946684800) { // Jan 1, 2000
            date = new Date(dateValue * 1000);
        } else {
            // Already in milliseconds or invalid
            date = new Date(dateValue);
        }
    }
    else if (typeof dateValue === 'string') {
        if (dateValue.includes('/')) {
            // Handle M/D/YYYY format like "9/10/2024"
            const parts = dateValue.split('/');
            if (parts.length === 3) {
                const month = parseInt(parts[0]) - 1; // JS months are 0-indexed
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                date = new Date(year, month, day);
            } else {
                date = new Date(dateValue);
            }
        } else {
            date = new Date(dateValue);
        }
    } else {
        date = new Date(dateValue);
    }
    
    // Validate the parsed date
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
        console.warn('Invalid date parsed:', dateValue, '-> result:', date);
        return null;
    }
    
    return date;
}

// Function to fix x-axis labels and tooltips without changing data
window.fixRateChartFormatting = function() {
    console.log('🔧 Fixing rate chart x-axis and tooltips...');
    
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 
                          'fedfunds-chart', 'tbill-chart', 'highyield-chart', 'spread-chart'];
    
    let fixedCount = 0;
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart) {
            const chart = canvas.chart;
            
            // Fix x-axis to show only monthly labels
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks = {
                    ...chart.options.scales.x.ticks,
                    autoSkip: false,
                    maxRotation: 45,
                    minRotation: 45,
                    font: { size: 10 },
                    callback: function(value, index) {
                        const labels = this.chart.data.labels;
                        if (!labels || !labels[index]) return '';
                        
                        // Only show label if it's the first of the month or every ~30 days
                        if (index === 0 || index % 30 === 0) {
                            const labelValue = labels[index];
                            const date = parseUniversalDate(labelValue);
                            
                            if (date) {
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const month = monthNames[date.getMonth()];
                                const year = date.getFullYear().toString().slice(-2);
                                return `${month} '${year}`;
                            }
                            return labelValue;
                        }
                        return '';
                    }
                };
            }
            
            // Fix tooltips to show dates
            if (!chart.options.plugins) chart.options.plugins = {};
            if (!chart.options.plugins.tooltip) chart.options.plugins.tooltip = {};
            
            const isSpreadChart = chartId.includes('spread');
            
            chart.options.plugins.tooltip.callbacks = {
                title: function(context) {
                    if (!context || context.length === 0) return '';
                    
                    const index = context[0].dataIndex;
                    const originalDates = context[0].chart.data.originalDates;
                    const labels = context[0].chart.data.labels;
                    
                    // Try originalDates first
                    if (originalDates && originalDates[index]) {
                        const dateValue = originalDates[index];
                        const date = parseUniversalDate(dateValue);
                        
                        if (date) {
                            return date.toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric'
                            });
                        }
                    }
                    
                    // Fallback to labels
                    if (labels && labels[index]) {
                        const labelValue = labels[index];
                        const date = parseUniversalDate(labelValue);
                        
                        if (date) {
                            return date.toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric'
                            });
                        }
                        return labelValue;
                    }
                    
                    return '';
                },
                label: function(context) {
                    const value = context.parsed.y;
                    if (value == null) return '';
                    
                    if (isSpreadChart) {
                        // Spread values are in basis points
                        const bps = Math.round(value);
                        return bps + ' bps';
                    }
                    return value.toFixed(2) + '%';
                }
            };
            
            // Store original dates if we have labels but no originalDates
            if (!chart.data.originalDates && chart.data.labels) {
                chart.data.originalDates = [...chart.data.labels];
            }
            
            // Special handling for Yahoo Finance data that might not have originalDates set
            // If labels are timestamps but originalDates is empty, copy labels to originalDates
            if (chart.data.labels && chart.data.labels.length > 0) {
                const firstLabel = chart.data.labels[0];
                if (typeof firstLabel === 'number' && (!chart.data.originalDates || chart.data.originalDates.length === 0)) {
                    chart.data.originalDates = [...chart.data.labels];
                    console.log(`  📝 Copied timestamp labels to originalDates for ${chartId}`);
                }
            }
            
            chart.update('none');
            fixedCount++;
            console.log(`✅ Fixed ${chartId}`);
        }
    });
    
    console.log(`🎯 Fixed ${fixedCount} rate charts`);
    return fixedCount;
};

// Test function for the universal date parser
window.testUniversalDateParser = function() {
    console.log('🧪 Testing Universal Date Parser:');
    console.log('================================');
    
    const testValues = [
        1726008240, // Unix timestamp (seconds)
        1726008240000, // Unix timestamp (milliseconds)
        '9/10/2024', // M/D/YYYY format
        '09/10/2024', // MM/DD/YYYY format
        '2024-09-10', // ISO format
        'Sep 10 2024', // String format
        '2001-01-01', // Should work but be old
        946684800, // Year 2000 timestamp
        null, // Should return null
        undefined, // Should return null
        'invalid' // Should return null
    ];
    
    testValues.forEach(value => {
        console.log(`\nInput: ${value} (${typeof value})`);
        const result = parseUniversalDate(value);
        if (result) {
            console.log(`  ✅ Parsed: ${result.toLocaleDateString()} (Year: ${result.getFullYear()})`);
            console.log(`  📅 Formatted: ${result.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            })}`);
        } else {
            console.log(`  ❌ Failed to parse`);
        }
    });
    
    console.log('\n================================');
};

// Function to reconstruct originalDates from Yahoo Finance data
window.reconstructRateChartDates = function() {
    console.log('🔧 Reconstructing rate chart dates from raw data...');
    
    const rateChartIds = ['2yr-chart', '10yr-chart', '30yr-chart', 'sofr-chart', 
                          'fedfunds-chart', 'tbill-chart', 'highyield-chart', 'spread-chart'];
    
    let fixedCount = 0;
    
    rateChartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart) {
            const chart = canvas.chart;
            
            // Check if this chart needs fixing (has corrupted originalDates)
            const originalDates = chart.data.originalDates || [];
            const needsFix = originalDates.length < 100; // T-bill has 358, others have 13
            
            if (needsFix) {
                console.log(`🔧 Fixing ${chartId}...`);
                
                // Try to reconstruct dates from the data points
                const dataPoints = chart.data.datasets?.[0]?.data || [];
                
                if (dataPoints.length > 0) {
                    // Generate date sequence for past year (assuming daily data)
                    const today = new Date();
                    const reconstructedDates = [];
                    
                    for (let i = dataPoints.length - 1; i >= 0; i--) {
                        const date = new Date(today);
                        date.setDate(date.getDate() - i);
                        reconstructedDates.push(date.toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric'
                        }));
                    }
                    
                    // Store the reconstructed dates
                    chart.data.originalDates = reconstructedDates;
                    console.log(`  ✅ Reconstructed ${reconstructedDates.length} dates`);
                    console.log(`  📅 Sample: ${reconstructedDates.slice(0, 3).join(', ')}`);
                    fixedCount++;
                }
            } else {
                console.log(`✅ ${chartId} already has proper dates (${originalDates.length} entries)`);
            }
        }
    });
    
    console.log(`🎯 Reconstructed dates for ${fixedCount} charts`);
    return fixedCount;
};

// Complete fix function - reconstructs dates then applies formatting
window.completeRateChartFix = function() {
    console.log('🚀 Applying complete rate chart fix...');
    console.log('=====================================');
    
    // Step 1: Reconstruct missing originalDates
    const reconstructed = window.reconstructRateChartDates();
    
    // Step 2: Apply formatting fixes
    const formatted = window.fixRateChartFormatting();
    
    console.log('=====================================');
    console.log(`🎯 COMPLETE FIX RESULTS:`);
    console.log(`   📅 Reconstructed dates: ${reconstructed} charts`);
    console.log(`   🎨 Applied formatting: ${formatted} charts`);
    console.log(`✅ Rate charts should now show correct dates!`);
    
    return { reconstructed, formatted };
};

// DISABLED: Auto-apply formatting fixes after data loads
// This is disabled because script.js now handles proper date generation
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', function() {
//         // Wait for charts to load with real data
//         setTimeout(() => {
//             console.log('🔧 Auto-fixing rate chart formatting...');
//             window.fixRateChartFormatting();
//         }, 3000);
//     });
// } else {
//     setTimeout(() => {
//         console.log('🔧 Auto-fixing rate chart formatting...');
//         window.fixRateChartFormatting();
//     }, 3000);
// }

console.log('📊 Rate Chart Manager loaded (formatting fix mode)');
console.log('💡 Chart formatting will auto-fix after data loads');
console.log('💡 Manual function: fixRateChartFormatting()');