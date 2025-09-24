/**
 * Netlify Credentials Loader
 * Handles loading credentials from Netlify Functions API as fallback
 */
class NetlifyCredentialsLoader {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/credentials';
    this.cache = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastFetch = 0;
  }

  /**
   * Load credentials from Netlify Functions API
   */
  async loadFromAPI() {
    const now = Date.now();
    
    // Return cached credentials if still valid
    if (this.cache && (now - this.lastFetch) < this.cacheExpiry) {
      console.log('🔄 Using cached Netlify credentials');
      return this.cache;
    }

    try {
      console.log('🌐 Fetching credentials from Netlify Functions...');
      
      const response = await fetch(this.apiEndpoint, {
        method: 'GET',
        headers: {
          'X-App-Origin': window.location.origin,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('🔍 Raw API response:', data);
      
      // Transform API response to expected format
      const credentials = {
        apiKey: data.google_sheets_api_key,
        clientId: data.google_oauth_client_id,
        spreadsheetId: data.volunteer_spreadsheet_id
      };

      console.log('🔍 Transformed credentials:', credentials);

      // Filter out undefined values
      const filteredCredentials = Object.fromEntries(
        Object.entries(credentials).filter(([key, value]) => value !== undefined)
      );

      console.log('🔍 Filtered credentials:', filteredCredentials);

      this.cache = filteredCredentials;
      this.lastFetch = now;

      console.log('✅ Netlify credentials loaded from API');
      console.log('📊 Credentials available:', Object.keys(filteredCredentials));

      return filteredCredentials;

    } catch (error) {
      console.warn('⚠️ Failed to load from Netlify Functions:', error.message);
      return {};
    }
  }

  /**
   * Check if Netlify Functions are available
   */
  async isAvailable() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'OPTIONS',
        headers: {
          'X-App-Origin': window.location.origin
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear cached credentials
   */
  clearCache() {
    this.cache = null;
    this.lastFetch = 0;
  }
}

// Global instance
window.NetlifyCredentialsLoader = new NetlifyCredentialsLoader();

console.log('🌐 Netlify Credentials Loader initialized');