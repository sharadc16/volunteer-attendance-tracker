/**
 * Server-side Credential Manager
 * Fetches API keys and OAuth credentials from a secure backend
 */

class ServerCredentialManager {
  constructor() {
    this.credentialEndpoint = this.getCredentialEndpoint();
    this.cache = new Map();
    this.isInitialized = false;
  }

  /**
   * Get the credential endpoint based on environment
   */
  getCredentialEndpoint() {
    // Production: Use Netlify Functions
    if (window.location.hostname.includes('netlify.app') || 
        window.location.hostname.includes('github.io') ||
        window.location.hostname.includes('gurukul-attendance.netlify.app')) {
      return '/.netlify/functions/credentials';
    }
    
    // Development: Use local backend or mock
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/credentials';
    }
    
    // Default to Netlify Functions
    return '/.netlify/functions/credentials';
  }

  /**
   * Initialize and fetch all credentials from server
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🔐 Fetching credentials from server...');
      
      const response = await fetch(this.credentialEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const credentials = await response.json();
      
      // Cache all credentials
      Object.entries(credentials).forEach(([key, value]) => {
        this.cache.set(key, value);
      });

      this.isInitialized = true;
      console.log('✅ Credentials loaded successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load credentials from server:', error);
      
      // Fallback to environment variables injected during build
      this.loadFromEnvironment();
      
      return false;
    }
  }

  /**
   * Load credentials from environment variables (build-time injection)
   */
  loadFromEnvironment() {
    const envCredentials = {
      'google_sheets_api_key': window.GOOGLE_SHEETS_API_KEY,
      'google_oauth_client_id': window.GOOGLE_OAUTH_CLIENT_ID,
      'volunteer_spreadsheet_id': window.VOLUNTEER_SPREADSHEET_ID,
      'backup_spreadsheet_id': window.BACKUP_SPREADSHEET_ID
    };

    Object.entries(envCredentials).forEach(([key, value]) => {
      if (value) {
        this.cache.set(key, value);
        console.log(`✅ Loaded ${key} from environment`);
      }
    });

    this.isInitialized = true;
  }

  /**
   * Get a specific credential
   */
  async getCredential(key) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.cache.get(key) || null;
  }

  /**
   * Get all credentials
   */
  async getAllCredentials() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return Object.fromEntries(this.cache);
  }

  /**
   * Check if credentials are available
   */
  hasCredentials() {
    return this.cache.size > 0;
  }

  /**
   * Refresh credentials from server
   */
  async refresh() {
    this.isInitialized = false;
    this.cache.clear();
    return await this.initialize();
  }
}

// Global instance
window.serverCredentialManager = new ServerCredentialManager();