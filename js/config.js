/**
 * Configuration for different environments
 */

// Detect environment based on URL
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.pathname.includes('/dev/') ||
                     window.location.hostname.includes('dev') ||
                     window.location.search.includes('env=dev');

const isProduction = window.location.hostname.includes('github.io') && !isDevelopment;

// Environment configuration
const Config = {
    // Environment detection
    environment: isDevelopment ? 'development' : isProduction ? 'production' : 'unknown',
    isDevelopment,
    isProduction,
    
    // Database configuration
    database: {
        name: isDevelopment ? 'VolunteerAttendanceDB_Dev' : 'VolunteerAttendanceDB',
        version: 1
    },
    
    // Sync configuration
    sync: {
        interval: isDevelopment ? 10000 : 60000, // 10s dev, 60s prod
        batchSize: isDevelopment ? 5 : 20,
        retryAttempts: isDevelopment ? 2 : 5
    },
    
    // UI configuration
    ui: {
        showDebugInfo: isDevelopment,
        enableTestFeatures: isDevelopment,
        autoFocusScanner: true,
        scanTimeout: isDevelopment ? 1000 : 3000 // Faster in dev
    },
    
    // Sample data
    sampleData: {
        loadOnInit: true,
        volunteerCount: isDevelopment ? 5 : 20 // Fewer volunteers in dev
    },
    
    // Logging
    logging: {
        level: isDevelopment ? 'debug' : 'info',
        enableConsole: isDevelopment,
        enableRemote: isProduction
    },
    
    // Feature flags
    features: {
        googleSheetsSync: false, // Will enable later
        offlineMode: true,
        exportData: true,
        importData: isDevelopment, // Only in dev for now
        adminPanel: isDevelopment
    },
    
    // API endpoints (for future use)
    api: {
        baseUrl: isDevelopment ? 'http://localhost:3000' : 'https://api.example.com',
        timeout: 10000
    }
};

// Environment indicator for UI
Config.environmentBadge = {
    show: isDevelopment,
    text: isDevelopment ? 'DEV' : 'PROD',
    color: isDevelopment ? '#ff6b35' : '#27ae60'
};

// Export configuration
window.Config = Config;

// Log environment info
console.log(`🚀 Volunteer Attendance Tracker - ${Config.environment.toUpperCase()} Environment`);
console.log('Configuration:', Config);

// Add environment badge to UI if in development
if (Config.environmentBadge.show) {
    document.addEventListener('DOMContentLoaded', () => {
        const badge = document.createElement('div');
        badge.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: ${Config.environmentBadge.color};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            font-family: monospace;
        `;
        badge.textContent = Config.environmentBadge.text;
        document.body.appendChild(badge);
    });
}