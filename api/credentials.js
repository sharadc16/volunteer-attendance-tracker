/**
 * Vercel Serverless Function to serve credentials securely
 * Deploy this to Vercel to serve your API keys without exposing them
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify request origin (optional security)
    const origin = req.headers['x-app-origin'] || req.headers['origin'];
    const allowedOrigins = [
      'https://gurukul-attendance.netlify.app',
      'https://sharadc16.github.io',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ];

    if (origin && !allowedOrigins.some(allowed => origin.includes(allowed))) {
      console.warn('Unauthorized origin:', origin);
      // Uncomment to enforce origin checking:
      // return res.status(403).json({ error: 'Unauthorized origin' });
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

    // Add timestamp for cache busting
    filteredCredentials._timestamp = Date.now();

    return res.status(200).json(filteredCredentials);

  } catch (error) {
    console.error('Error serving credentials:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve credentials'
    });
  }
}