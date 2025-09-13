/**
 * API Integration with Secure Credential Management
 * Handles API calls using stored credentials
 */

class APIManager {
  constructor() {
    this.baseConfig = {
      timeout: 30000,
      retries: 3
    };
  }

  /**
   * Get API credential with server-side fallback
   * @param {string} credentialName - Name of the credential
   * @param {string} fallbackEnvVar - Environment variable name as fallback
   */
  async getAPICredential(credentialName, fallbackEnvVar = null) {
    // Try server credential manager first (no user input required)
    if (window.serverCredentialManager) {
      const credential = await window.serverCredentialManager.getCredential(credentialName);
      if (credential) {
        return credential;
      }
    }

    // Try local secure storage (user-managed)
    if (window.credentialManager && window.credentialManager.isUnlocked) {
      const credential = window.credentialManager.getCredential(credentialName);
      if (credential) {
        return credential;
      }
    }

    // Fallback to environment variable (for development)
    if (fallbackEnvVar && window[fallbackEnvVar]) {
      return window[fallbackEnvVar];
    }

    // Only prompt as last resort
    console.warn(`Missing credential: ${credentialName}`);
    return null;
  }

  /**
   * Prompt user to set up missing credential
   */
  promptForCredential(credentialName) {
    const message = `Missing API credential: ${credentialName}\n\nPlease set it up in the Credential Manager (🔐 button).`;
    
    if (confirm(message + '\n\nOpen Credential Manager now?')) {
      if (window.credentialManager) {
        window.credentialManager.openModal();
      }
    }
  }

  /**
   * Google Sheets API integration
   */
  async callGoogleSheetsAPI(spreadsheetId, range, method = 'GET', data = null) {
    const apiKey = await this.getAPICredential('google_sheets_api_key', 'GOOGLE_SHEETS_API_KEY');
    if (!apiKey) return null;

    const url = method === 'GET' 
      ? `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`
      : `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW&key=${apiKey}`;

    try {
      const response = await this.makeRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify({ values: data }) : null
      });

      return response;
    } catch (error) {
      console.error('Google Sheets API error:', error);
      throw error;
    }
  }

  /**
   * Generic API call with credential management
   */
  async callAPI(endpoint, options = {}) {
    const {
      credentialName,
      credentialType = 'bearer', // 'bearer', 'apikey', 'basic'
      method = 'GET',
      headers = {},
      body = null,
      timeout = this.baseConfig.timeout
    } = options;

    if (credentialName) {
      const credential = await this.getAPICredential(credentialName);
      if (!credential) return null;

      // Add credential to headers based on type
      switch (credentialType) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${credential}`;
          break;
        case 'apikey':
          headers['X-API-Key'] = credential;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${btoa(credential)}`;
          break;
      }
    }

    try {
      return await this.makeRequest(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : null,
        timeout
      });
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(url, options, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.baseConfig.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Retry on network errors
      if (retryCount < this.baseConfig.retries && 
          (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.warn(`Request failed, retrying... (${retryCount + 1}/${this.baseConfig.retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.makeRequest(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(credentialName, testEndpoint) {
    try {
      const result = await this.callAPI(testEndpoint, {
        credentialName,
        method: 'GET'
      });
      
      return {
        success: true,
        message: 'Connection successful',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error
      };
    }
  }
}

// Global instance
window.apiManager = new APIManager();

// Example usage functions for your volunteer tracker
window.volunteerAPI = {
  /**
   * Save attendance data to Google Sheets
   */
  async saveAttendance(attendanceData) {
    const spreadsheetId = await window.apiManager.getAPICredential('volunteer_spreadsheet_id');
    if (!spreadsheetId) return false;

    try {
      const result = await window.apiManager.callGoogleSheetsAPI(
        spreadsheetId,
        'Attendance!A:Z',
        'POST',
        [attendanceData]
      );
      
      console.log('Attendance saved:', result);
      return true;
    } catch (error) {
      console.error('Failed to save attendance:', error);
      return false;
    }
  },

  /**
   * Load volunteer data from Google Sheets
   */
  async loadVolunteers() {
    const spreadsheetId = await window.apiManager.getAPICredential('volunteer_spreadsheet_id');
    if (!spreadsheetId) return [];

    try {
      const result = await window.apiManager.callGoogleSheetsAPI(
        spreadsheetId,
        'Volunteers!A:Z',
        'GET'
      );
      
      return result.values || [];
    } catch (error) {
      console.error('Failed to load volunteers:', error);
      return [];
    }
  },

  /**
   * Test Google Sheets connection
   */
  async testGoogleSheetsConnection() {
    const spreadsheetId = await window.apiManager.getAPICredential('volunteer_spreadsheet_id');
    if (!spreadsheetId) return { success: false, message: 'No spreadsheet ID configured' };

    return await window.apiManager.testConnection(
      'google_sheets_api_key',
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${await window.apiManager.getAPICredential('google_sheets_api_key')}`
    );
  }
};