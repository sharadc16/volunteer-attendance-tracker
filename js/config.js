/**
 * Configuration for different environments
 * Now integrated with Environment Manager
 */

// Get environment from Environment Manager if available, otherwise fallback to legacy detection
function getEnvironmentConfig() {
    if (window.EnvironmentManager) {
        return window.EnvironmentManager.getCurrentConfig();
    }
    
    // Legacy fallback detection
    const isDevelopment = window.FORCE_DEV_MODE || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.pathname.includes('/dev/') ||
                         window.location.hostname.includes('dev') ||
                         window.location.search.includes('env=dev');

    const isProduction = window.location.hostname.includes('github.io') && !isDevelopment;
    
    return {
        name: isDevelopment ? 'Development' : isProduction ? 'Production' : 'Unknown',
        shortName: isDevelopment ? 'DEV' : isProduction ? 'PROD' : 'UNK',
        environment: isDevelopment ? 'development' : isProduction ? 'production' : 'unknown',
        isDevelopment,
        isProduction
    };
}

// Get current environment config
const envConfig = getEnvironmentConfig();

// Environment configuration
const Config = {
    // Environment detection
    environment: envConfig.environment || 'development',
    isDevelopment: envConfig.isDevelopment || envConfig.environment === 'development',
    isProduction: envConfig.isProduction || envConfig.environment === 'production',
    
    // Database configuration
    database: {
        name: envConfig.isDevelopment ? 'VolunteerAttendanceDB_Dev' : 'VolunteerAttendanceDB',
        version: 1
    },
    
    // Sync configuration
    sync: {
        interval: envConfig.isDevelopment ? 10000 : 60000, // 10s dev, 60s prod
        batchSize: envConfig.isDevelopment ? 5 : 20,
        retryAttempts: envConfig.isDevelopment ? 2 : 5
    },
    
    // UI configuration
    ui: {
        showDebugInfo: envConfig.isDevelopment,
        enableTestFeatures: envConfig.isDevelopment,
        autoFocusScanner: true,
        scanTimeout: envConfig.isDevelopment ? 1000 : 3000 // Faster in dev
    },
    
    // Sample data
    sampleData: {
        loadOnInit: true,
        volunteerCount: envConfig.isDevelopment ? 5 : 20 // Fewer volunteers in dev
    },
    
    // Logging
    logging: {
        level: envConfig.isDevelopment ? 'debug' : 'info',
        enableConsole: envConfig.isDevelopment,
        enableRemote: envConfig.isProduction
    },
    
    // Google Sheets configuration - now managed by Environment Manager
    googleSheets: {
        // Get environment-specific configuration
        get current() {
            if (window.EnvironmentManager) {
                return window.EnvironmentManager.getGoogleSheetsConfig();
            }
            // Fallback configuration
            return {
                spreadsheetId: '',
                sheetPrefix: Config.isDevelopment ? 'DEV_' : 'PROD_',
                environment: Config.environment
            };
        },
        // Shared API credentials (same for all environments)
        credentials: {
            apiKey: '', // Will be set by user
            clientId: '' // Will be set by user
        },
        // Sheet names (same structure for all environments)
        sheetNames: {
            volunteers: 'Volunteers',
            attendance: 'Attendance', 
            events: 'Events',
            settings: 'Settings'
        }
    },

    // Feature flags
    features: {
        googleSheetsSync: true, // Enable Google Sheets sync
        offlineMode: true,
        exportData: true,
        importData: envConfig.isDevelopment, // Only in dev for now
        adminPanel: envConfig.isDevelopment,
        manualSyncButton: true, // Enable manual sync button in UI
        googleSheetsAuthority: true // Google Sheets data is authoritative in conflicts
    },

    // Data conflict resolution
    conflictResolution: {
        strategy: 'sheets-authority', // 'local-wins', 'sheets-authority', 'merge'
        authoritySource: 'google-sheets', // The authoritative data source
        preserveLocalMetadata: true, // Keep local-only fields during conflict resolution
        logConflicts: true // Log all conflict resolutions for debugging
    },
    
    // API endpoints (for future use)
    api: {
        baseUrl: envConfig.isDevelopment ? 'http://localhost:3000' : 'https://api.example.com',
        timeout: 10000
    }
};

// Environment indicator for UI - now handled by Environment Manager
Config.environmentBadge = {
    get show() {
        return window.EnvironmentManager ? true : Config.isDevelopment;
    },
    get text() {
        return envConfig.shortName || (Config.isDevelopment ? 'DEV' : 'PROD');
    },
    get color() {
        return envConfig.color || (Config.isDevelopment ? '#ff6b35' : '#27ae60');
    }
};

// Function to update config when environment changes
Config.updateFromEnvironment = function() {
    if (window.EnvironmentManager) {
        const newEnvConfig = window.EnvironmentManager.getCurrentConfig();
        Config.environment = window.EnvironmentManager.currentEnvironment;
        Config.isDevelopment = Config.environment === 'development';
        Config.isProduction = Config.environment === 'production';
        
        // Update database name
        Config.database.name = newEnvConfig.database.name;
        
        // Update sync settings
        Config.sync.interval = newEnvConfig.sync.interval;
        Config.sync.batchSize = newEnvConfig.sync.batchSize;
        
        // Update features
        Config.ui.showDebugInfo = newEnvConfig.features.debugMode;
        Config.ui.enableTestFeatures = newEnvConfig.features.testFeatures;
        Config.features.adminPanel = newEnvConfig.features.debugMode;
        
        console.log(`🔄 Config updated for ${Config.environment.toUpperCase()} environment`);
    }
};

// Listen for environment changes
if (typeof window !== 'undefined') {
    window.addEventListener('environmentChanged', () => {
        Config.updateFromEnvironment();
    });
}

// Export configuration
window.Config = Config;

// Log environment info
console.log(`🚀 Volunteer Attendance Tracker - ${Config.environment.toUpperCase()} Environment`);
console.log('Configuration:', Config);