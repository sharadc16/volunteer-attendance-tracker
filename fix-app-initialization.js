/**
 * Fix App Initialization
 * Ensures the VolunteerAttendanceApp is properly instantiated
 */

(function() {
    'use strict';
    
    console.log('🔧 App Initialization Fix starting...');
    
    // Check if app already exists
    if (window.app && window.app.isInitialized) {
        console.log('✅ App already initialized');
        return;
    }
    
    // Function to initialize app
    function initializeApp() {
        try {
            console.log('🚀 Attempting to initialize VolunteerAttendanceApp...');
            
            // Check if class exists
            if (typeof VolunteerAttendanceApp === 'undefined') {
                console.error('❌ VolunteerAttendanceApp class not found');
                return false;
            }
            
            // Create app instance
            console.log('📱 Creating VolunteerAttendanceApp instance...');
            window.App = new VolunteerAttendanceApp();
            window.app = window.App; // Ensure lowercase version exists
            
            console.log('✅ App instance created successfully');
            console.log('App initialized:', window.app.isInitialized);
            console.log('Current view:', window.app.currentView);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            console.error('Error stack:', error.stack);
            return false;
        }
    }
    
    // Try to initialize immediately if DOM is ready
    if (document.readyState === 'loading') {
        console.log('⏳ DOM still loading, waiting...');
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        console.log('✅ DOM ready, initializing now...');
        initializeApp();
    }
    
    // Also try after a delay to catch any timing issues
    setTimeout(() => {
        if (!window.app || !window.app.isInitialized) {
            console.log('🔄 Retrying app initialization...');
            initializeApp();
        }
    }, 2000);
    
    // Make initialization function globally available for manual retry
    window.retryAppInitialization = initializeApp;
    
    console.log('🔧 App initialization fix loaded. Use window.retryAppInitialization() to retry manually.');
    
})();