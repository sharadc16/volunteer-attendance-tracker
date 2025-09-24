/**
 * Application Configuration
 */
window.Config = {
  // App Info
  name: 'Gurukul Volunteer Attendance Tracker',
  version: '2.0.0',
  
  // Database
  database: {
    name: 'volunteer_attendance',
    version: 3, // Incremented to make email non-unique
    stores: {
      volunteers: 'id',
      events: 'id', 
      attendance: 'id',
      config: 'key'
    }
  },
  
  // Scanner Settings
  scanner: {
    enabled: true,
    timeout: 5000,
    prefix: '',
    suffix: '',
    autoFocus: true
  },
  
  // Sync Settings
  sync: {
    enabled: true,  // Enable sync by default
    interval: 300000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 5000,
    timeout: 120000 // 2 minutes for sync operations
  },
  
  // UI Settings
  ui: {
    recentAttendanceLimit: 10,
    autoRefreshInterval: 30000, // 30 seconds
    animationDuration: 200
  },
  
  // Google Sheets Integration
  googleSheets: {
    enabled: false,
    spreadsheetId: '',
    apiKey: '',
    clientId: '',
    discoveryDoc: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
    // syncInterval removed - using Config.sync.interval for all sync operations
    retryAttempts: 3,
    retryDelay: 5000,
    batchSize: 100
  },
  
  // Event Settings
  events: {
    scanningWindowDays: 7, // 7-day scanning window
    defaultDuration: 120, // 2 hours in minutes
    autoCreateSundays: false
  },
  
  // Storage Keys
  storageKeys: {
    settings: 'vat_settings',
    syncToken: 'vat_sync_token',
    lastSync: 'vat_last_sync'
  }
};