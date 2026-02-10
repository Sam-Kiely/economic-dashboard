// Chart Utilities - Standardized formatting across all tabs
class ChartUtils {
    constructor() {
        this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }

    // Format chart x-axis to show 13 monthly labels for a year of daily data
    formatChartAxis(dates, type = 'monthly') {
        if (!dates || dates.length === 0) return [];

        if (type === 'monthly') {
            return this.generateMonthlyLabels(dates);
        } else if (type === 'weekly') {
            return this.generateWeeklyLabels(dates);
        }
        
        return dates; // Return original if no specific formatting
    }

    // Generate monthly labels - show only first occurrence of each month
    generateMonthlyLabels(dates) {
        const labels = [];
        let lastMonth = -1;
        
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            const month = date.getMonth();
            
            if (month !== lastMonth || i === 0) {
                // Add month label for first occurrence of the month
                const year = date.getFullYear().toString().slice(-2);
                labels.push(`${this.monthNames[month]} '${year}`);
                lastMonth = month;
            } else {
                // Empty label to maintain spacing
                labels.push('');
            }
        }
        
        return labels;
    }

    // Generate weekly labels with monthly markers
    generateWeeklyLabels(dates) {
        const labels = [];
        let lastMonth = -1;
        
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            const month = date.getMonth();
            
            if (month !== lastMonth) {
                // Add month label for first week of the month
                const year = date.getFullYear().toString().slice(-2);
                labels.push(`${this.monthNames[month]} '${year}`);
                lastMonth = month;
            } else {
                // Empty label for other weeks to keep spacing consistent
                labels.push('');
            }
        }
        
        return labels;
    }

    // Standard x-axis configuration
    getXAxisConfig(dates, type = 'monthly') {
        const formattedLabels = this.formatChartAxis(dates, type);
        
        return {
            display: true,
            grid: { display: false },
            ticks: {
                font: { size: 10 },
                maxRotation: 45,
                minRotation: 45,
                autoSkip: false,
                callback: function(value, index) {
                    return formattedLabels[index] || '';
                }
            }
        };
    }

    // Standard tooltip configuration with proper date and value formatting
    getTooltipConfig(valueType = 'currency', dateFormat = 'MM/DD/YY') {
        const self = this;
        
        return {
            mode: 'index',
            intersect: false,
            callbacks: {
                title: function(context) {
                    if (!context || context.length === 0) return '';
                    
                    const index = context[0].dataIndex;
                    const chart = context[0].chart;
                    const originalDates = chart.data.originalDates || chart.data.labels;
                    
                    if (!originalDates || !originalDates[index]) return '';
                    
                    return self.formatTooltipDate(originalDates[index], dateFormat);
                },
                label: function(context) {
                    const value = context.parsed.y;
                    if (value == null) return '';
                    
                    return self.formatTooltipValue(value, valueType);
                }
            }
        };
    }

    // Format date for tooltips with reliable parsing
    formatTooltipDate(dateString, format = 'MM/DD/YY') {
        let date;
        
        if (typeof dateString === 'string') {
            // Handle M/D/YYYY format (e.g., '9/10/2024')
            if (dateString.includes('/') && dateString.split('/').length === 3) {
                const parts = dateString.split('/');
                const month = parseInt(parts[0]) - 1; // JavaScript months are 0-indexed
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                date = new Date(year, month, day);
            }
            // Handle abbreviated month formats like 'Jul 24', 'Aug', etc.
            else if (dateString.match(/^[A-Za-z]{3}\s?\d{2}?$/)) {
                // For formats like 'Jul 24' or just 'Aug'
                const currentYear = new Date().getFullYear();
                if (dateString.includes(' ')) {
                    // Format: 'Jul 24' - assume current year
                    const [monthStr, day] = dateString.split(' ');
                    const monthMap = {
                        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                    };
                    const month = monthMap[monthStr];
                    if (month !== undefined) {
                        date = new Date(currentYear, month, parseInt(day) || 1);
                    } else {
                        date = new Date(dateString);
                    }
                } else {
                    // Format: just 'Aug' - assume 1st of month, current year
                    const monthMap = {
                        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                    };
                    const month = monthMap[dateString];
                    if (month !== undefined) {
                        date = new Date(currentYear, month, 1);
                    } else {
                        date = new Date(dateString);
                    }
                }
            }
            // Fallback to standard Date parsing
            else {
                date = new Date(dateString);
            }
        } else {
            date = new Date(dateString);
        }
        
        if (isNaN(date.getTime())) return dateString; // Return original if invalid date
        
        // Use built-in toLocaleDateString for reliable formatting
        switch (format) {
            case 'MM/DD/YY':
                return date.toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                });
            case 'MM/DD/YYYY':
                return date.toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                });
            case 'MMM DD, YY':
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: '2-digit'
                }).replace(',', ", '");
            default:
                return date.toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                });
        }
    }

    // Format value for tooltips based on type
    formatTooltipValue(value, type = 'currency') {
        if (typeof value !== 'number' || isNaN(value)) return 'N/A';
        
        switch (type) {
            case 'currency':
                return '$' + value.toFixed(2);
            case 'currencyBillions':
                return '$' + value.toFixed(1) + 'B';
            case 'currencyTrillions':
                return '$' + (value / 1000).toFixed(1) + 'T';
            case 'percentage':
                return value.toFixed(2) + '%';
            case 'basisPoints':
                return value.toFixed(0) + ' bps';
            case 'rate':
                return value.toFixed(3) + '%';
            case 'index':
                return value.toFixed(0);
            case 'volume':
                if (value >= 1e9) {
                    return (value / 1e9).toFixed(1) + 'B';
                } else if (value >= 1e6) {
                    return (value / 1e6).toFixed(1) + 'M';
                } else if (value >= 1e3) {
                    return (value / 1e3).toFixed(1) + 'K';
                }
                return value.toFixed(0);
            case 'decimal':
                return value.toFixed(2);
            default:
                return value.toFixed(2);
        }
    }

    // Standard y-axis configuration based on value type
    getYAxisConfig(valueType = 'currency', values = []) {
        let callback, minValue, maxValue;
        
        // Calculate reasonable bounds if values provided
        if (values && values.length > 0) {
            const validValues = values.filter(v => typeof v === 'number' && !isNaN(v));
            if (validValues.length > 0) {
                minValue = Math.min(...validValues);
                maxValue = Math.max(...validValues);
            }
        }
        
        switch (valueType) {
            case 'currency':
                callback = function(value) {
                    return '$' + value.toFixed(2);
                };
                break;
            case 'currencyBillions':
                callback = function(value) {
                    return '$' + value.toFixed(0) + 'B';
                };
                break;
            case 'currencyTrillions':
                callback = function(value) {
                    return '$' + (value / 1000).toFixed(0) + 'T';
                };
                break;
            case 'percentage':
                callback = function(value) {
                    return value.toFixed(1) + '%';
                };
                break;
            case 'rate':
                callback = function(value) {
                    return value.toFixed(2) + '%';
                };
                break;
            case 'basisPoints':
                callback = function(value) {
                    return value.toFixed(0) + ' bps';
                };
                break;
            case 'index':
                callback = function(value) {
                    return value.toFixed(0);
                };
                break;
            default:
                callback = function(value) {
                    return value.toFixed(2);
                };
        }
        
        return {
            display: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
                font: { size: 10 },
                callback: callback
            }
        };
    }

    // Complete chart configuration helper
    getStandardChartConfig(data, valueType = 'currency', dateFormat = 'MM/DD/YY', axisType = 'monthly') {
        if (!data || !data.dates || !data.values) {
            return {
                data: { labels: [], datasets: [] },
                options: {}
            };
        }

        // Store original dates for tooltip
        const originalDates = [...data.dates];
        const formattedLabels = this.formatChartAxis(data.dates, axisType);
        
        const config = {
            type: 'line',
            data: {
                labels: formattedLabels,
                originalDates: originalDates,
                datasets: [{
                    data: data.values,
                    borderColor: data.borderColor || '#667eea',
                    backgroundColor: data.backgroundColor || 'rgba(102, 126, 234, 0.1)',
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
                    tooltip: this.getTooltipConfig(valueType, dateFormat)
                },
                scales: {
                    x: this.getXAxisConfig(data.dates, axisType),
                    y: this.getYAxisConfig(valueType, data.values)
                }
            }
        };
        
        return config;
    }
}

// Create global instance
window.chartUtils = new ChartUtils();

console.log('📊 Chart utilities initialized');