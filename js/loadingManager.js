// Loading Manager - Handles loading states across all tabs and services

class LoadingManager {
    constructor() {
        this.loadingStates = {};
        this.initialized = false;
    }

    // Initialize loading manager
    init() {
        if (this.initialized) return;
        
        // Create global loading overlay
        this.createGlobalLoadingOverlay();
        
        // Create tab-specific loading indicators
        this.createTabLoadingIndicators();
        
        this.initialized = true;
        console.log('Loading Manager initialized');
    }

    // Create global loading overlay for initial page load
    createGlobalLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.className = 'loading-overlay global-loading';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3>Loading Economic Dashboard</h3>
                <p id="loading-status">Initializing services...</p>
                <div class="loading-progress">
                    <div class="loading-progress-bar" id="loading-progress-bar"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    // Create loading indicators for each tab
    createTabLoadingIndicators() {
        const tabs = ['economic', 'markets', 'rates', 'banking'];
        
        tabs.forEach(tabId => {
            const tabContainer = document.getElementById(tabId);
            if (tabContainer) {
                // Create tab loading overlay
                const loadingDiv = document.createElement('div');
                loadingDiv.id = `${tabId}-loading`;
                loadingDiv.className = 'loading-overlay tab-loading hidden';
                loadingDiv.innerHTML = `
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <h4>Loading ${this.getTabName(tabId)} Data</h4>
                        <p class="loading-message">Fetching latest data...</p>
                    </div>
                `;
                
                // Insert at beginning of tab container
                tabContainer.insertBefore(loadingDiv, tabContainer.firstChild);
                
                // Create card-level loading states
                this.createCardLoadingStates(tabContainer);
            }
        });
    }

    // Create loading states for individual cards
    createCardLoadingStates(container) {
        const cards = container.querySelectorAll('.card, .market-card');
        
        cards.forEach((card, index) => {
            // Add loading class to card
            card.classList.add('card-loadable');
            
            // Create card loading indicator
            const cardLoading = document.createElement('div');
            cardLoading.className = 'card-loading hidden';
            cardLoading.innerHTML = `
                <div class="card-loading-content">
                    <div class="card-spinner"></div>
                    <span>Loading...</span>
                </div>
            `;
            
            card.appendChild(cardLoading);
        });
    }

    // Get human readable tab name
    getTabName(tabId) {
        const names = {
            'economic': 'Economic Overview',
            'markets': 'Markets Overview', 
            'rates': 'Rates Overview',
            'banking': 'Banking Analysis'
        };
        return names[tabId] || tabId;
    }

    // Show global loading
    showGlobalLoading(message = 'Loading...') {
        const overlay = document.getElementById('global-loading-overlay');
        const status = document.getElementById('loading-status');
        
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('visible');
        }
        
        if (status) {
            status.textContent = message;
        }
        
        console.log('🔄 Global Loading:', message);
    }

    // Hide global loading
    hideGlobalLoading() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            overlay.classList.add('hidden');
            
            // Remove after animation
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
        
        console.log('✅ Global Loading Complete');
    }

    // Update global loading progress
    updateGlobalProgress(percentage, message) {
        const progressBar = document.getElementById('loading-progress-bar');
        const status = document.getElementById('loading-status');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        if (status && message) {
            status.textContent = message;
        }
    }

    // Show tab loading
    showTabLoading(tabId, message = 'Loading data...') {
        const loadingElement = document.getElementById(`${tabId}-loading`);
        const messageElement = loadingElement?.querySelector('.loading-message');
        
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
            loadingElement.classList.add('visible');
        }
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        this.loadingStates[tabId] = true;
        console.log(`🔄 ${this.getTabName(tabId)} Loading:`, message);
    }

    // Hide tab loading
    hideTabLoading(tabId) {
        const loadingElement = document.getElementById(`${tabId}-loading`);
        
        if (loadingElement) {
            loadingElement.classList.remove('visible');
            loadingElement.classList.add('hidden');
        }
        
        this.loadingStates[tabId] = false;
        console.log(`✅ ${this.getTabName(tabId)} Loading Complete`);
    }

    // Show card loading
    showCardLoading(cardElement) {
        if (!cardElement) return;
        
        const cardLoading = cardElement.querySelector('.card-loading');
        if (cardLoading) {
            cardLoading.classList.remove('hidden');
            cardLoading.classList.add('visible');
        }
        
        cardElement.classList.add('loading');
    }

    // Hide card loading  
    hideCardLoading(cardElement) {
        if (!cardElement) return;
        
        const cardLoading = cardElement.querySelector('.card-loading');
        if (cardLoading) {
            cardLoading.classList.remove('visible');
            cardLoading.classList.add('hidden');
        }
        
        cardElement.classList.remove('loading');
    }

    // Show loading for specific service
    showServiceLoading(serviceName, message) {
        console.log(`🔄 ${serviceName} Service:`, message);
        
        // Map service to tab if applicable
        const serviceTabMap = {
            'yahooFinance': 'markets',
            'apiService': 'economic',
            'bankingService': 'banking',
            'calendarService': 'economic'
        };
        
        const tabId = serviceTabMap[serviceName];
        if (tabId) {
            this.showTabLoading(tabId, message);
        }
    }

    // Hide loading for specific service
    hideServiceLoading(serviceName) {
        console.log(`✅ ${serviceName} Service Complete`);
        
        const serviceTabMap = {
            'yahooFinance': 'markets',
            'apiService': 'economic', 
            'bankingService': 'banking',
            'calendarService': 'economic'
        };
        
        const tabId = serviceTabMap[serviceName];
        if (tabId) {
            this.hideTabLoading(tabId);
        }
    }

    // Set loading state for entire card grid
    setCardGridLoading(containerId, isLoading) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const cards = container.querySelectorAll('.card, .market-card');
        
        cards.forEach(card => {
            if (isLoading) {
                this.showCardLoading(card);
            } else {
                this.hideCardLoading(card);
            }
        });
    }

    // Check if any loading is active
    isLoading() {
        return Object.values(this.loadingStates).some(state => state === true);
    }

    // Get loading status for specific tab
    isTabLoading(tabId) {
        return this.loadingStates[tabId] === true;
    }

    // Create loading sequence for dashboard initialization
    async runInitializationSequence() {
        this.showGlobalLoading('Initializing Dashboard...');
        
        const steps = [
            { name: 'Loading Configuration', percentage: 10 },
            { name: 'Initializing Charts', percentage: 25 },
            { name: 'Starting API Services', percentage: 40 },
            { name: 'Loading Economic Data', percentage: 60 },
            { name: 'Loading Market Data', percentage: 80 },
            { name: 'Finalizing Setup', percentage: 95 },
            { name: 'Ready!', percentage: 100 }
        ];
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            this.updateGlobalProgress(step.percentage, step.name);
            
            // Simulate async operations
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Hide global loading after completion
        setTimeout(() => {
            this.hideGlobalLoading();
        }, 500);
    }

    // Utility method to wrap async operations with loading
    async withLoading(operation, context = 'global') {
        if (context === 'global') {
            this.showGlobalLoading('Processing...');
        } else {
            this.showTabLoading(context, 'Processing...');
        }
        
        try {
            const result = await operation();
            return result;
        } finally {
            if (context === 'global') {
                this.hideGlobalLoading();
            } else {
                this.hideTabLoading(context);
            }
        }
    }

    // Clean up loading states
    cleanup() {
        // Hide all loading states
        Object.keys(this.loadingStates).forEach(tabId => {
            this.hideTabLoading(tabId);
        });
        
        this.hideGlobalLoading();
        
        // Remove global overlay
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// Create global instance
window.loadingManager = new LoadingManager();

// Function to initialize loading manager
function initializeLoadingManager() {
    console.log('⏳ Initializing Loading Manager...');
    window.loadingManager.init();
    
    // Run initialization sequence
    setTimeout(() => {
        window.loadingManager.runInitializationSequence();
    }, 100);
}

// Register initialization with dashboard initializer or use fallback
if (typeof window !== 'undefined') {
    setTimeout(() => {
        if (window.dashboardInitializer) {
            window.dashboardInitializer.addInitializationCallback(() => {
                console.log('⏳ Initializing Loading Manager via coordinator...');
                initializeLoadingManager();
            }, 1);
            console.log('⏳ Loading Manager registered with dashboard coordinator');
        } else {
            // Fallback: Initialize when DOM is ready (legacy mode)
            console.log('⏳ Loading Manager using fallback initialization');
            document.addEventListener('DOMContentLoaded', initializeLoadingManager);
        }
    }, 100);
}

// Global helper functions
window.showLoading = function(context, message) {
    if (context === 'global') {
        window.loadingManager.showGlobalLoading(message);
    } else {
        window.loadingManager.showTabLoading(context, message);
    }
};

window.hideLoading = function(context) {
    if (context === 'global') {
        window.loadingManager.hideGlobalLoading();
    } else {
        window.loadingManager.hideTabLoading(context);
    }
};