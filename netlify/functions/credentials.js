/**
 * Netlify Function to serve credentials securely
 * Deploy this to Netlify to serve your API keys without exposing them
 */

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify request origin (optional security)
    const origin = event.headers['x-app-origin'] || event.headers['origin'];
    const allowedOrigins = [
      'https://yourusername.github.io',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ];

    if (origin && !allowedOrigins.some(allowed => origin.includes(allowed))) {
      console.warn('Unauthorized origin:', origin);
      // Uncomment to enforce origin checking:
      // return {
      //   statusCode: 403,
      //   headers,
      //   body: JSON.stringify({ error: 'Unauthorized origin' })
      // };
    }

    // Return credentials from environment variables
    const credentials = {
      google_sheets_api_key: process.env.GOOGLE_SHEETS_API_KEY,
      google_oauth_client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      volunteer_spreadsheet_id: process.env.VOLUNTEER_SPREADSHEET_ID,
      backup_spreadsheet_id: process.env.BACKUP_SPREADSHEET_ID
    };

    // Filter out undefined values
    const filteredCredentials = Object.fromEntries(
      Object.entries(credentials).filter(([key, value]) => value !== undefined)
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(filteredCredentials)
    };

  } catch (error) {
    console.error('Error serving credentials:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to retrieve credentials'
      })
    };
  }
};