/**
 * Local Development Configuration
 * 
 * Customize these values for your local development environment.
 * This file is separate so you can easily change local settings without affecting deployment logic.
 */

window.LOCAL_DEV_CONFIG = {
  // Spreadsheet ID for local development
  // Change this to use a different spreadsheet for local testing
  spreadsheetId: '13i5bVltP_-PVu_MhkNlyreCgfPEusvS7HzG5svceq5Y', // Current: same as dev/preview
  
  // You can set this to a different spreadsheet for local testing:
  // spreadsheetId: 'YOUR_LOCAL_TEST_SPREADSHEET_ID_HERE',
  
  // Other local development settings
  enableDebugLogging: true,
  autoSetupSpreadsheet: true,
  
  // Local development context name
  contextName: 'Local Development (Custom)'
};

console.log('🔧 Local development configuration loaded');
console.log('📋 Local spreadsheet ID:', window.LOCAL_DEV_CONFIG.spreadsheetId.substring(0, 20) + '...');