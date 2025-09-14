/**
 * Fix App Initialization
 * Ensures the VolunteerAttendanceApp is properly instantiated
 * This script automatically fixes the missing app object issue
 */

(function() {
    'use strict';
    
    console.log('🔧 App Initialization Fix starting...');
    
    // Function to initialize app
    function initializeApp() {
        try {
            // Check if app already exists and is working
            if (window.app && window.app.isInitialized) {
                console.log('✅ App already initialized');
                return true;
            }
            
            console.log('🚀 Attempting to initialize VolunteerAttendanceApp...');
            
            // Check if class exists
            if (typeof VolunteerAttendanceApp === 'undefined') {
                console.warn('⚠️ VolunteerAttendanceApp class not found, will retry...');
                return false;
            }
            
            // Create app instance if it doesn't exist
            if (!window.App || !window.app) {
                console.log('📱 Creating VolunteerAttendanceApp instance...');
                window.App = new VolunteerAttendanceApp();
                window.app = window.App; // Ensure lowercase version exists
                
                console.log('✅ App instance created successfully');
                console.log('App initialized:', window.app.isInitialized);
                console.log('Current view:', window.app.currentView);
                
                // Verify Add Event functionality
                if (typeof window.app.showAddEventModal === 'function') {
                    console.log('✅ Add Event functionality available');
                } else {
                    console.warn('⚠️ Add Event functionality not found');
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            return false;
        }
    }
    
    // Multiple initialization attempts with different timing
    
    // Attempt 1: Immediate (if DOM is ready)
    if (document.readyState !== 'loading') {
        initializeApp();
    }
    
    // Attempt 2: On DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeApp, 100);
    });
    
    // Attempt 3: After window load
    window.addEventListener('load', () => {
        setTimeout(initializeApp, 500);
    });
    
    // Attempt 4: Delayed retry (for timing issues)
    setTimeout(() => {
        if (!window.app || !window.app.isInitialized) {
            console.log('🔄 Delayed retry of app initialization...');
            initializeApp();
        }
    }, 2000);
    
    // Attempt 5: Final retry
    setTimeout(() => {
        if (!window.app || !window.app.isInitialized) {
            console.log('🔄 Final retry of app initialization...');
            if (initializeApp()) {
                console.log('🎉 App successfully initialized on final retry!');
            } else {
                console.error('❌ App initialization failed after all retries');
            }
        } else {
            console.log('🎉 App initialization confirmed successful!');
        }
    }, 5000);
    
    // Make initialization function globally available
    window.retryAppInitialization = initializeApp;
    
    // Monitor for app object creation
    let checkCount = 0;
    const maxChecks = 50; // 25 seconds
    
    const appMonitor = setInterval(() => {
        checkCount++;
        
        if (window.app && window.app.isInitialized) {
            console.log('🎉 App object detected and initialized!');
            clearInterval(appMonitor);
        } else if (checkCount >= maxChecks) {
            console.warn('⏰ Stopped monitoring - app initialization may have failed');
            clearInterval(appMonitor);
        }
    }, 500);
    
    console.log('🔧 App initialization fix loaded and monitoring started');
    
})();