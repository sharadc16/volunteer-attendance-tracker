/**
 * Local Environment Variables for Testing
 * 
 * IMPORTANT: Replace these with your actual Google API credentials!
 * 
 * To get your credentials:
 * 1. Go to https://console.developers.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Sheets API
 * 4. Create credentials (API Key and OAuth 2.0 Client ID)
 * 5. Replace the values below
 */

// REPLACE WITH YOUR ACTUAL CREDENTIALS
window.GOOGLE_SHEETS_API_KEY = 'YOUR_API_KEY_HERE'; // Get from Google Cloud Console
window.GOOGLE_OAUTH_CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; // Get from Google Cloud Console

// Optional - if you have a specific spreadsheet to use
// window.VOLUNTEER_SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

// Set defaults
window.GOOGLE_SHEETS_DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
window.GOOGLE_SHEETS_SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// Mark as locally injected
window.ENV_INJECTED = true;
window.ENV_LOCAL = true;
window.ENV_INJECTION_TIME = new Date().toISOString();

console.log('🏠 Local environment variables loaded (TEST CREDENTIALS)');
console.log('⚠️  Replace with your actual Google API credentials!');