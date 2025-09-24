/**
 * Local Environment Variables for Development
 * 
 * For local development, we use fallback credentials.
 * For Netlify deployments, the actual environment variables are served via Netlify Functions API.
 */

// Simple fallback credentials for local development
// These will be overridden by Netlify Functions API on Netlify deployments
window.GOOGLE_SHEETS_API_KEY = window.GOOGLE_SHEETS_API_KEY || 'AIzaSyBJ6yBohxncBp9f_tevE1TY9lmWvD8rH00';
window.GOOGLE_OAUTH_CLIENT_ID = window.GOOGLE_OAUTH_CLIENT_ID || '322543264011-o6f5egdc6n7htas0739kkfr7cj9vn1op.apps.googleusercontent.com';

// For local development, you can set a specific spreadsheet ID here if needed
// This will be overridden by Netlify environment variables in deployed environments
window.VOLUNTEER_SPREADSHEET_ID = window.VOLUNTEER_SPREADSHEET_ID || '13i5bVltP_-PVu_MhkNlyreCgfPEusvS7HzG5svceq5Y';

// Set defaults
window.GOOGLE_SHEETS_DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
window.GOOGLE_SHEETS_SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// Mark as locally injected
window.ENV_INJECTED = true;
window.ENV_LOCAL = true;
window.ENV_INJECTION_TIME = new Date().toISOString();

// Determine if we're running locally
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.includes('local');

if (isLocal) {
    console.log('🏠 Local environment variables loaded');
    console.log('📋 Local spreadsheet ID:', window.VOLUNTEER_SPREADSHEET_ID ? window.VOLUNTEER_SPREADSHEET_ID.substring(0, 20) + '...' : 'Not set');
    console.log('ℹ️ For Netlify deployments, environment variables are loaded dynamically');
} else {
    console.log('🌐 Environment variables loaded (will be overridden by Netlify Functions API)');
}