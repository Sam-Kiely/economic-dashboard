// Chart Configuration for Economic Dashboard - Fixed Version
// This prevents chart initialization conflicts

const ChartConfig = {
    // Store chart instances
    charts: {},
    
    // Default chart options
    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#ddd',
                borderWidth: 1,
                cornerRadius: 4,
                padding: 10
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 11
                    },
                    maxRotation: 45,
                    minRotation: 0
                }
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        size: 11
                    }
                }
            }
        }
    },

    // Chart colors
    colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        positive: '#27ae60',
        negative: '#e74c3c',
        neutral: '#95a5a6',
        gradient: {
            start: 'rgba(102, 126, 234, 0.5)',
            end: 'rgba(118, 75, 162, 0.5)'
        }
    },

    // Initialize all charts
    initCharts: function() {
        console.log('Initializing charts...');
        
        // Initialize economic indicator charts
        this.initEconomicCharts();
        
        // Initialize market charts
        this.initMarketCharts();
        
        // Initialize rate charts
        this.initRateCharts();
    },

    // Initialize economic indicator charts - with correct IDs
    initEconomicCharts: function() {
        const economicCharts = [
            'corecpi', 'coreppi', 'corepce', 'gdp', 'trade',
            'unemployment', 'jobless', 'retail', 'durablegoods',
            'newhomes', 'existinghomes', 'sentiment'
        ];

        economicCharts.forEach(chartId => {
            const canvasId = `${chartId}-chart`;
            const canvas = document.getElementById(canvasId);
            
            if (canvas) {
                // Check if chart already exists
                if (canvas.chart) {
                    console.log(`Chart already exists for ${canvasId}, skipping...`);
                    this.charts[chartId] = canvas.chart;
                    return;
                }
                
                const ctx = canvas.getContext('2d');
                const chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            borderColor: this.colors.primary,
                            backgroundColor: this.colors.gradient.start,
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 5
                        }]
                    },
                    options: this.defaultOptions
                });
                
                // Store reference on canvas and in our charts object
                canvas.chart = chart;
                this.charts[chartId] = chart;
                console.log(`Initialized economic chart: ${canvasId}`);
            }
        });
    },

    // Initialize market charts
    initMarketCharts: function() {
        const marketCharts = [
            'sp500', 'dow', 'nasdaq', 'gold', 'oil', 'dxy', 'bitcoin'
        ];

        marketCharts.forEach(chartId => {
            const canvasId = `${chartId}-chart`;
            const canvas = document.getElementById(canvasId);
            
            if (canvas) {
                // Check if chart already exists
                if (canvas.chart) {
                    console.log(`Chart already exists for ${canvasId}, skipping...`);
                    this.charts[chartId] = canvas.chart;
                    return;
                }
                
                const ctx = canvas.getContext('2d');
                const chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            borderColor: this.colors.secondary,
                            backgroundColor: 'rgba(118, 75, 162, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 5
                        }]
                    },
                    options: this.defaultOptions
                });
                
                // Store reference
                canvas.chart = chart;
                this.charts[chartId] = chart;
                console.log(`Initialized market chart: ${canvasId}`);
            }
        });
    },

    // Initialize rate charts - with correct IDs
    initRateCharts: function() {
        const rateCharts = [
            'sofr', '2yr', '10yr', '30yr',
            'fedfunds', 'tbill', 'mortgage', 'highyield', 'prime', 'spread'
        ];

        rateCharts.forEach(chartId => {
            const canvasId = `${chartId}-chart`;
            const canvas = document.getElementById(canvasId);
            
            if (canvas) {
                // Check if chart already exists
                if (canvas.chart) {
                    console.log(`Chart already exists for ${canvasId}, skipping...`);
                    this.charts[chartId] = canvas.chart;
                    return;
                }
                
                const ctx = canvas.getContext('2d');
                const chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 5
                        }]
                    },
                    options: this.defaultOptions
                });
                
                // Store reference
                canvas.chart = chart;
                this.charts[chartId] = chart;
                console.log(`Initialized rate chart: ${canvasId}`);
            }
        });
    },

    // Update chart data
    updateChart: function(chartId, labels, data) {
        // Remove '-chart' suffix if present
        const cleanId = chartId.replace('-chart', '');
        
        if (this.charts[cleanId]) {
            this.charts[cleanId].data.labels = labels;
            this.charts[cleanId].data.datasets[0].data = data;
            
            // Set color based on trend
            if (data.length > 1) {
                const isPositive = data[data.length - 1] > data[0];
                this.charts[cleanId].data.datasets[0].borderColor = 
                    isPositive ? this.colors.positive : this.colors.negative;
            }
            
            this.charts[cleanId].update();
        }
    },

    // Generate mock data for testing
    generateMockData: function(points = 30) {
        const labels = [];
        const data = [];
        const baseValue = Math.random() * 100 + 50;
        
        for (let i = points - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.push(baseValue + (Math.random() - 0.5) * 10);
        }
        
        return { labels, data };
    },

    // Initialize with mock data
    initWithMockData: function() {
        Object.keys(this.charts).forEach(chartId => {
            const mockData = this.generateMockData();
            this.updateChart(chartId, mockData.labels, mockData.data);
        });
    }
};

// Function to initialize charts
function initializeCharts() {
    console.log('📊 Initializing Charts...');
    if (typeof Chart !== 'undefined') {
        // Only initialize if charts haven't been initialized yet
        const existingChart = document.querySelector('canvas[id$="-chart"]');
        if (existingChart && !existingChart.chart) {
            ChartConfig.initCharts();
            console.log('📊 Charts initialized successfully via coordinator');
        } else {
            console.log('📊 Charts already initialized or being initialized by another script');
        }
    } else {
        console.error('❌ Chart.js not loaded');
    }
}

// Register initialization with dashboard initializer or use fallback
if (typeof window !== 'undefined') {
    setTimeout(() => {
        if (window.dashboardInitializer) {
            window.dashboardInitializer.addInitializationCallback(() => {
                console.log('📊 Initializing Charts via coordinator...');
                initializeCharts();
            }, 2);
            console.log('📊 Charts registered with dashboard coordinator');
        } else {
            // Fallback: Initialize when DOM is ready (legacy mode)
            console.log('📊 Charts using fallback initialization');
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(initializeCharts, 500);
            });
        }
    }, 100);
}

// Export for use in other modules
window.ChartConfig = ChartConfig;// Function to format tooltip dates
function formatTooltipDate(dateString) {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Update chart configuration for proper tooltips
function updateChartTooltips(chart) {
    if (!chart.options.plugins) chart.options.plugins = {};
    if (!chart.options.plugins.tooltip) chart.options.plugins.tooltip = {};
    
    chart.options.plugins.tooltip.callbacks = {
        title: function(context) {
            if (context[0].chart.data.originalDates) {
                const index = context[0].dataIndex;
                const dateStr = context[0].chart.data.originalDates[index];
                return formatTooltipDate(dateStr);
            }
            // Fallback: if no originalDates, try to parse the label
            const label = context[0].label;
            if (label && label !== '') {
                // If label is in 'Apr '24' format, try to convert to full date
                // This is a fallback - prefer originalDates
                return label;
            }
            return '';
        },
        label: function(context) {
            const value = context.parsed.y;
            const chartId = context.chart.canvas.id;
            
            if (chartId.includes('2yr') || 
                chartId.includes('10yr') || chartId.includes('30yr') ||
                chartId.includes('sofr') || chartId.includes('tbill') ||
                chartId.includes('fedfunds') || chartId.includes('highyield')) {
                return value.toFixed(2) + '%';
            }
            return value.toFixed(2);
        }
    };
}
