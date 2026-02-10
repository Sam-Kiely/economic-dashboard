// Network Manager - Corporate Environment Detection and Fallbacks
class NetworkManager {
    constructor() {
        this.isCorporateNetwork = false;
        this.blockedDomains = new Set();
        this.workingProxies = [];
        this.fallbackData = {};

        // Corporate network indicators
        this.corporateIndicators = [
            'corsproxy.io',
            'api.allorigins.win',
            'finance.yahoo.com'
        ];

        this.detectNetworkEnvironment();
    }

    // Detect if we're in a corporate/restricted environment
    async detectNetworkEnvironment() {
        console.log('🔍 Detecting network environment...');

        // Skip network detection if we're using Vercel APIs
        const isVercelEnvironment = window.location.hostname.includes('vercel.app') ||
                                   window.location.hostname === 'localhost' ||
                                   window.location.hostname === '127.0.0.1';

        if (isVercelEnvironment) {
            console.log('✅ Running in Vercel environment - skipping CORS proxy detection');
            this.isCorporateNetwork = false;
            return;
        }

        // Test basic connectivity to known external services
        const testUrls = [
            'https://corsproxy.io/?https://httpbin.org/status/200',
            'https://api.allorigins.win/raw?url=https://httpbin.org/status/200'
        ];

        let blockedCount = 0;

        for (const url of testUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    mode: 'no-cors' // Avoid CORS issues for detection
                });

                clearTimeout(timeoutId);
                console.log(`✅ ${url} - accessible`);

            } catch (error) {
                blockedCount++;
                this.blockedDomains.add(this.extractDomain(url));
                console.log(`❌ ${url} - blocked/timeout`);
            }
        }

        // If 2+ services are blocked, assume corporate environment
        this.isCorporateNetwork = blockedCount >= 2;

        if (this.isCorporateNetwork) {
            console.warn('🏢 Corporate network detected - enabling fallback mode');
            this.enableCorporateMode();
        } else {
            console.log('🌐 Open network detected - using standard mode');
        }
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    }

    enableCorporateMode() {
        // Enable aggressive caching
        this.setCacheMode('aggressive');

        // Disable external API calls that are likely blocked
        this.disableBlockedServices();

        // Show user notification
        this.showCorporateNetworkNotification();

        // Enable mock data fallbacks
        this.enableMockDataFallbacks();
    }

    setCacheMode(mode) {
        if (mode === 'aggressive') {
            // Cache data for 24 hours instead of 5 minutes
            window.CORPORATE_CACHE_DURATION = 24 * 60 * 60 * 1000;
            console.log('📦 Enabled aggressive caching (24 hours)');
        }
    }

    disableBlockedServices() {
        // Flag services as unavailable
        window.YAHOO_FINANCE_BLOCKED = this.blockedDomains.has('finance.yahoo.com') ||
                                       this.blockedDomains.has('corsproxy.io');
        window.FRED_API_BLOCKED = this.blockedDomains.has('fred.stlouisfed.org');

        console.log('🚫 Service availability:', {
            yahooFinance: !window.YAHOO_FINANCE_BLOCKED,
            fredApi: !window.FRED_API_BLOCKED
        });
    }

    showCorporateNetworkNotification() {
        // Add a discrete notification to the UI
        const notification = document.createElement('div');
        notification.className = 'corporate-network-notice';
        notification.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px 12px; margin: 10px; border-radius: 4px; font-size: 12px; color: #856404;">
                <strong>Corporate Network Detected:</strong> Some real-time data may be unavailable due to network restrictions. Historical data and cached information will be displayed.
            </div>
        `;

        // Insert at the top of the main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(notification, mainContent.firstChild);
        }
    }

    enableMockDataFallbacks() {
        // Enable enhanced mock data when real APIs are blocked
        window.USE_ENHANCED_MOCK_DATA = true;
        console.log('🎭 Enabled enhanced mock data fallbacks');
    }

    // Test if a specific URL/domain is accessible
    async isAccessible(url, timeout = 3000) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                mode: 'no-cors'
            });

            clearTimeout(timeoutId);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get cache duration based on network environment
    getCacheDuration(defaultDuration) {
        if (this.isCorporateNetwork) {
            return window.CORPORATE_CACHE_DURATION || (24 * 60 * 60 * 1000); // 24 hours
        }
        return defaultDuration; // 5 minutes default
    }

    // Check if we should use fallback data
    shouldUseFallback(serviceType) {
        switch (serviceType) {
            case 'yahoo':
                return window.YAHOO_FINANCE_BLOCKED || this.isCorporateNetwork;
            case 'fred':
                return window.FRED_API_BLOCKED;
            default:
                return this.isCorporateNetwork;
        }
    }
}

// Initialize network manager
window.networkManager = new NetworkManager();