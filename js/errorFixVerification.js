// Error Fix Verification - Console diagnostic tool
console.log('🔧 Loading error fix verification...');

window.verifyErrorFixes = function() {
    console.log('\n=== ERROR FIX VERIFICATION ===');
    
    // Fix 1: Check FRED API series IDs
    console.log('\n1️⃣ CHECKING FRED API SERIES IDS:');
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.FRED && API_CONFIG.FRED.series) {
        const fredSeries = API_CONFIG.FRED.series;
        console.log('✅ API_CONFIG.FRED.series exists');
        
        // Check for removed undefined series
        const removedSeries = ['mortgage30yr', 'primeRate'];
        let foundUndefined = false;
        
        removedSeries.forEach(series => {
            if (fredSeries[series]) {
                console.log(`❌ Found undefined series still present: ${series}`);
                foundUndefined = true;
            }
        });
        
        if (!foundUndefined) {
            console.log('✅ All undefined series removed from config');
        }
        
        // Check valid series
        const validSeries = [
            'fedFunds', 'treasury10yr', 'treasury2yr', 'treasury30yr',
            'sofr1m', 'tbill3m', 'highYield'
        ];
        
        validSeries.forEach(series => {
            if (fredSeries[series]) {
                console.log(`✅ Valid series present: ${series} = ${fredSeries[series]}`);
            } else {
                console.log(`❌ Missing valid series: ${series}`);
            }
        });
        
    } else {
        console.log('❌ API_CONFIG.FRED.series not found');
    }
    
    // Fix 2: Check window.apiService availability
    console.log('\n2️⃣ CHECKING WINDOW.APISERVICE:');
    if (typeof window.apiService !== 'undefined') {
        console.log('✅ window.apiService exists');
        console.log(`   Type: ${typeof window.apiService}`);
        
        if (typeof window.apiService.getFREDSeries === 'function') {
            console.log('✅ window.apiService.getFREDSeries method available');
        } else {
            console.log('❌ window.apiService.getFREDSeries method missing');
        }
        
        // Test basic functionality
        if (window.apiService.cache) {
            console.log('✅ window.apiService.cache exists');
        }
        
    } else {
        console.log('❌ window.apiService is undefined');
        console.log('   Available window services:', Object.keys(window).filter(k => k.includes('service')));
    }
    
    // Fix 3: Check banking service initialization
    console.log('\n3️⃣ CHECKING BANKING SERVICE:');
    if (typeof window.bankingService !== 'undefined') {
        console.log('✅ window.bankingService exists');
        
        if (typeof window.bankingService.ensureApiService === 'function') {
            console.log('✅ bankingService.ensureApiService method available');
        } else {
            console.log('❌ bankingService.ensureApiService method missing');
        }
        
        // Check if it has waitForApiService (should be replaced)
        if (typeof window.bankingService.waitForApiService === 'function') {
            console.log('⚠️  bankingService.waitForApiService still present (should be removed)');
        } else {
            console.log('✅ bankingService.waitForApiService properly removed');
        }
        
    } else {
        console.log('❌ window.bankingService not found');
    }
    
    // Check APIService class availability
    console.log('\n4️⃣ CHECKING APISERVICE CLASS:');
    if (typeof APIService === 'function') {
        console.log('✅ APIService class available globally');
        
        try {
            const testInstance = new APIService();
            console.log('✅ Can create new APIService instance');
            
            if (typeof testInstance.getFREDSeries === 'function') {
                console.log('✅ New instance has getFREDSeries method');
            }
        } catch (error) {
            console.log('❌ Error creating APIService instance:', error.message);
        }
        
    } else {
        console.log('❌ APIService class not available globally');
    }
    
    console.log('\n=== VERIFICATION COMPLETE ===\n');
    
    // Summary
    const checks = {
        fredSeriesFixed: typeof API_CONFIG !== 'undefined' && API_CONFIG.FRED && !API_CONFIG.FRED.series?.mortgage30yr,
        windowApiService: typeof window.apiService !== 'undefined' && typeof window.apiService.getFREDSeries === 'function',
        bankingService: typeof window.bankingService !== 'undefined' && typeof window.bankingService.ensureApiService === 'function',
        apiServiceClass: typeof APIService === 'function'
    };
    
    const totalChecks = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(Boolean).length;
    
    console.log(`📊 SUMMARY: ${passedChecks}/${totalChecks} checks passed`);
    
    if (passedChecks === totalChecks) {
        console.log('🎉 ALL ERROR FIXES VERIFIED SUCCESSFULLY!');
    } else {
        console.log('⚠️  Some checks failed - review the details above');
    }
    
    return {
        passed: passedChecks === totalChecks,
        checks: checks,
        score: `${passedChecks}/${totalChecks}`
    };
};

// Auto-run verification after page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('🔍 Running automatic error fix verification...');
        window.verifyErrorFixes();
        console.log('\n💡 Run verifyErrorFixes() anytime to re-check');
    }, 3000);
});