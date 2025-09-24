/**
 * Environment Variable Configuration
 * Centralized configuration for all supported environment variable names
 */
class EnvironmentConfig {
  /**
   * Get all supported environment variable names for each credential type
   */
  static getVariableNames() {
    return {
      apiKey: [
        'GOOGLE_SHEETS_API_KEY',
        'REACT_APP_GOOGLE_SHEETS_API_KEY',
        'VITE_GOOGLE_SHEETS_API_KEY',
        'NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY'
      ],
      
      clientId: [
        'GOOGLE_OAUTH_CLIENT_ID',        // Primary Netlify variable
        'GOOGLE_SHEETS_CLIENT_ID',       // Fallback
        'REACT_APP_GOOGLE_OAUTH_CLIENT_ID',
        'REACT_APP_GOOGLE_SHEETS_CLIENT_ID',
        'VITE_GOOGLE_OAUTH_CLIENT_ID',
        'VITE_GOOGLE_SHEETS_CLIENT_ID',
        'NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID',
        'NEXT_PUBLIC_GOOGLE_SHEETS_CLIENT_ID'
      ],
      
      spreadsheetId: [
        'VOLUNTEER_SPREADSHEET_ID',      // Primary Netlify variable
        'GOOGLE_SHEETS_SPREADSHEET_ID',  // Fallback
        'REACT_APP_VOLUNTEER_SPREADSHEET_ID',
        'REACT_APP_GOOGLE_SHEETS_SPREADSHEET_ID',
        'VITE_VOLUNTEER_SPREADSHEET_ID',
        'VITE_GOOGLE_SHEETS_SPREADSHEET_ID',
        'NEXT_PUBLIC_VOLUNTEER_SPREADSHEET_ID',
        'NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID'
      ],
      
      discoveryDoc: [
        'GOOGLE_SHEETS_DISCOVERY_DOC',
        'REACT_APP_GOOGLE_SHEETS_DISCOVERY_DOC',
        'VITE_GOOGLE_SHEETS_DISCOVERY_DOC',
        'NEXT_PUBLIC_GOOGLE_SHEETS_DISCOVERY_DOC'
      ],
      
      scopes: [
        'GOOGLE_SHEETS_SCOPES',
        'REACT_APP_GOOGLE_SHEETS_SCOPES',
        'VITE_GOOGLE_SHEETS_SCOPES',
        'NEXT_PUBLIC_GOOGLE_SHEETS_SCOPES'
      ]
    };
  }

  /**
   * Get meta tag mappings for HTML meta tag loading
   */
  static getMetaTagMappings() {
    return {
      'google-sheets-api-key': 'apiKey',
      'google-oauth-client-id': 'clientId',
      'google-sheets-client-id': 'clientId',
      'volunteer-spreadsheet-id': 'spreadsheetId',
      'google-sheets-spreadsheet-id': 'spreadsheetId',
      'google-sheets-discovery-doc': 'discoveryDoc',
      'google-sheets-scopes': 'scopes'
    };
  }

  /**
   * Get default credential values
   */
  static getDefaults() {
    return {
      apiKey: '',
      clientId: '',
      spreadsheetId: '',
      discoveryDoc: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
      scopes: 'https://www.googleapis.com/auth/spreadsheets'
    };
  }

  /**
   * Get required credential fields
   */
  static getRequiredFields() {
    return ['apiKey', 'clientId'];
  }

  /**
   * Get optional credential fields
   */
  static getOptionalFields() {
    return ['spreadsheetId', 'discoveryDoc', 'scopes'];
  }

  /**
   * Validate credential format
   */
  static validateCredentialFormat(credentials) {
    const warnings = [];
    
    if (credentials.apiKey && !credentials.apiKey.startsWith('AIza')) {
      warnings.push('API Key format may be invalid (should start with "AIza")');
    }

    if (credentials.clientId && !credentials.clientId.includes('.googleusercontent.com')) {
      warnings.push('Client ID format may be invalid (should contain ".googleusercontent.com")');
    }

    if (credentials.spreadsheetId && !/^[a-zA-Z0-9-_]{44}$/.test(credentials.spreadsheetId)) {
      warnings.push('Spreadsheet ID format may be invalid (should be 44 characters)');
    }

    return warnings;
  }

  /**
   * Get primary Netlify environment variable names (for documentation)
   */
  static getPrimaryNetlifyVariables() {
    return {
      apiKey: 'GOOGLE_SHEETS_API_KEY',
      clientId: 'GOOGLE_OAUTH_CLIENT_ID',
      spreadsheetId: 'VOLUNTEER_SPREADSHEET_ID (optional)'
    };
  }
}

// Export for use in other modules
window.EnvironmentConfig = EnvironmentConfig;