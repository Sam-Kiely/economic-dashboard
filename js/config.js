// API Configuration with Banking Data Added
// IMPORTANT: Replace 'YOUR_API_KEY_HERE' with your actual API keys

const API_CONFIG = {
    // FRED API - Federal Reserve Economic Data
    FRED: {
        baseURL: 'https://api.stlouisfed.org/fred/series/observations',
        apiKey: '7b2b5891d1e72a3dff72e1806e851d20', // Your FRED API key
        series: {
            // Economic indicators (in order for display)
            coreCPI: 'CPILFESL',          // Core CPI (All Items Less Food and Energy) - Index
            corePPI: 'WPSFD4131',         // Core PPI (Final Demand Less Foods and Energy) - Index
            corePCE: 'PCEPILFE',          // Core PCE (Personal Consumption Expenditures Less Food and Energy) - Index
            gdp: 'A191RL1Q225SBEA',       // Real GDP Growth Rate (QoQ Annualized %)
            tradeDeficit: 'BOPGSTB',      // U.S. Trade Balance: Goods and Services (Billions)
            unemployment: 'UNRATE',        // Unemployment Rate (%)
            joblessClaims: 'ICSA',        // Initial Jobless Claims (Thousands)
            retailSales: 'MRTSMPCSM44000USS', // Retail Sales (Monthly % Change - Already MoM%)
            durableGoods: 'DGORDER',      // Durable Goods Orders (Millions)
            newHomeSales: 'HSN1F',        // New One Family Houses Sold (Thousands)
            existingHomeSales: 'EXHOSLUSM495S',  // Existing Home Sales (Millions)
            consumerSentiment: 'UMCSENT', // University of Michigan Consumer Sentiment (Index)
            
            // Rates indicators - VALID FRED SERIES IDs VERIFIED
            fedFunds: 'DFEDTARU',         // Federal Funds Target Range - Upper
            treasury2yr: 'DGS2',          // 2-Year Treasury
            treasury5yr: 'DGS5',          // 5-Year Treasury
            treasury10yr: 'DGS10',        // 10-Year Treasury
            treasury30yr: 'DGS30',        // 30-Year Treasury
            sofr1m: 'SOFR30DAYAVG',      // 30-Day Average Secured Overnight Financing Rate
            tbill3m: 'DTB3',             // 3-Month Treasury Bill
            highYield: 'BAMLH0A0HYM2',   // ICE BofA US High Yield Index
            // NOTE: Removed mortgage30yr and primeRate - these are now handled by Yahoo Finance
            
            // NEW: H.8 Banking Data Series (Weekly, Not Seasonally Adjusted)
            h8Data: {
                totalLoans: 'LLBDCBW027NBOG',
                ciLoans: 'CILDCBW027NBOG',
                consumerLoans: 'CLSDCBW027SBOG',
                creLoans: 'CREDCBW027NBOG',
                otherLoans: 'AOLDCBW027NBOG',
                deposits: 'DPSDCBW027NBOG',
                largeTimeDeposits: 'LTDDCBW027NBOG',
                otherDeposits: 'ODSDCBW027NBOG',
                borrowings: 'H8B3094NDMD'
                // NOTE: borrowings series H8B3094NDMD is in millions, others are in billions
            }
        }
    },
    
    // NEW: Peer Banks for Comparison
    PEER_BANKS: {
        // Regional bank tickers for comparison
        tickers: [
            'TCBI',  // Texas Capital Bancshares (highlighted)
            'PNC',   // PNC Financial Services
            'USB',   // U.S. Bancorp
            'TFC',   // Truist Financial
            'RF',    // Regions Financial
            'CFR',   // Cullen/Frost Bankers
            'HBAN',  // Huntington Bancshares
            'ZION',  // Zions Bancorporation
            'PB',    // Prosperity Bancshares
            'BOKF'   // BOK Financial
        ],
        indexTicker: '^KRX'  // SPDR S&P Regional Banking ETF (benchmark)
    },
    
    // Release schedules for economic indicators (approximate)
    RELEASE_SCHEDULES: {
        coreCPI: { day: 10, name: 'CPI' },           // Around 10th of month
        corePPI: { day: 13, name: 'PPI' },           // Around 13th of month
        corePCE: { day: 31, name: 'PCE' },           // Last business day of month
        gdp: { quarterly: true, name: 'GDP' },       // ~30 days after quarter end
        tradeDeficit: { day: 7, name: 'Trade Balance' }, // Around 7th of month
        unemployment: { day: 3, name: 'Jobs Report' },   // First Friday of month
        joblessClaims: { weekly: true, name: 'Jobless Claims' }, // Every Thursday
        retailSales: { day: 15, name: 'Retail Sales' },  // Around 15th of month
        durableGoods: { day: 26, name: 'Durable Goods' }, // Around 26th of month
        newHomeSales: { day: 25, name: 'New Home Sales' }, // Around 25th of month
        existingHomeSales: { day: 20, name: 'Existing Home Sales' }, // Around 20th of month
        consumerSentiment: { day: 10, preliminary: true, day2: 25, name: 'Consumer Sentiment' }, // Prelim 10th, Final 25th
        treasury2yr: { daily: true, name: '2-Year Treasury' },
        treasury5yr: { daily: true, name: '5-Year Treasury' },
        treasury10yr: { daily: true, name: '10-Year Treasury' },
        treasury30yr: { daily: true, name: '30-Year Treasury' },
        sofr1m: { daily: true, name: '1-Month SOFR' },
        fedFunds: { fomc: true, name: 'Fed Funds' }, // FOMC meetings
        tbill3m: { weekly: true, name: '3-Month T-Bill' },
        highYield: { daily: true, name: 'High Yield Index' },
        
        // NEW: H.8 Data Release Schedule
        h8Data: { weekly: true, day: 5, name: 'H.8 Banking Data' } // Released Fridays at 4:15 PM ET
    },
    
    // Update intervals (in milliseconds)
    UPDATE_INTERVALS: {
        economic: 3600000,    // 1 hour (economic data doesn't change frequently)
        banking: 3600000      // 1 hour (H.8 data is weekly)
    }
};