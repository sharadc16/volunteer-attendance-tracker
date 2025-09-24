/**
 * Google OAuth2 Authentication Manager
 * Handles Google authentication flow, token management, and validation
 */
class AuthManager {
  constructor() {
    this.isInitialized = false;
    this.isAuthenticated = false;
    this.tokenClient = null;
    this.accessToken = null;
    this.credentials = null;
    this.authStateListeners = [];
    this.refreshTimeout = null;
    
    // Bind methods
    this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
  }

  /**
   * Initialize the authentication manager
   */
  async init() {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Load credentials using the centralized CredentialManager
      this.credentials = await window.CredentialManager.loadCredentials();
      
      // Check if credentials are ready for use
      if (!window.CredentialManager.areCredentialsReady()) {
        const diagnostics = window.CredentialManager.getDiagnostics();
        console.warn('Google Sheets credentials not ready - sync will be disabled');
        console.warn('Credential status:', diagnostics.validation);
        console.warn('To set up credentials, see GOOGLE_API_SETUP.md');
        return false;
      }

      // Wait for Google APIs to load
      await this.waitForGoogleAPIs();
      
      // Initialize Google APIs
      await this.initializeGoogleAPIs();
      
      // Initialize Google Identity Services
      await this.initializeGoogleIdentity();
      
      // Try to restore authentication from stored token
      await this.restoreAuthenticationFromStorage();
      
      this.isInitialized = true;
      console.log('AuthManager initialized successfully');
      
      return true;
      
    } catch (error) {
      console.error('Failed to initialize AuthManager:', error);
      this.handleAuthError(error);
      return false;
    }
  }

  /**
   * Wait for Google APIs to load
   */
  async waitForGoogleAPIs() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Google APIs failed to load within timeout'));
      }, 10000);

      const checkAPIs = () => {
        if (window.gapiLoadError || window.gisLoadError) {
          clearTimeout(timeout);
          reject(new Error('Google APIs failed to load'));
          return;
        }

        if (window.gapiLoaded && window.gisLoaded) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        // Check again in 100ms
        setTimeout(checkAPIs, 100);
      };

      checkAPIs();
    });
  }

  /**
   * Initialize Google APIs
   */
  async initializeGoogleAPIs() {
    return new Promise((resolve, reject) => {
      gapi.load('client', {
        callback: async () => {
          try {
            // Validate credentials before initializing
            if (!this.credentials.apiKey || this.credentials.apiKey === 'YOUR_API_KEY_HERE') {
              throw new Error('Invalid or missing API key. Please set up your Google API credentials.');
            }

            await gapi.client.init({
              apiKey: this.credentials.apiKey,
              discoveryDocs: [this.credentials.discoveryDoc]
            });
            
            console.log('Google API client initialized');
            resolve();
            
          } catch (error) {
            console.error('Failed to initialize Google API client:', error);
            if (error.message.includes('Missing required parameters')) {
              error.message = 'Missing Google API credentials. Please set up your API key and client ID. See GOOGLE_API_SETUP.md for instructions.';
            }
            reject(error);
          }
        },
        onerror: (error) => {
          console.error('Failed to load Google API client:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Initialize Google Identity Services
   */
  async initializeGoogleIdentity() {
    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.credentials.clientId,
        scope: this.credentials.scopes,
        callback: this.handleAuthStateChange
      });
      
      console.log('Google Identity Services initialized');
      
    } catch (error) {
      console.error('Failed to initialize Google Identity Services:', error);
      throw error;
    }
  }

  /**
   * Authenticate with Google
   */
  async authenticate() {
    if (!this.isInitialized) {
      const error = new Error('AuthManager not initialized');
      this.handleAuthError(error, { operation: 'authenticate', stage: 'initialization_check' });
      throw error;
    }

    if (!this.tokenClient) {
      const error = new Error('Token client not available');
      this.handleAuthError(error, { operation: 'authenticate', stage: 'token_client_check' });
      throw error;
    }

    return new Promise((resolve, reject) => {
      // Set up one-time callback for this authentication attempt
      const originalCallback = this.tokenClient.callback;
      
      this.tokenClient.callback = (response) => {
        // Restore original callback
        this.tokenClient.callback = originalCallback;
        
        if (response.error) {
          const error = new Error(response.error);
          const errorResult = this.handleAuthError(error, { 
            operation: 'authenticate', 
            stage: 'oauth_callback',
            response: response 
          });
          
          // Check if we should retry automatically
          if (errorResult.recoveryStrategy.shouldRetry) {
            console.log('Authentication will be retried automatically');
          }
          
          reject(error);
          return;
        }

        this.accessToken = response.access_token;
        this.isAuthenticated = true;
        
        // Configure gapi client with the new token
        if (window.gapi && window.gapi.client) {
          gapi.client.setToken({
            access_token: response.access_token
          });
        }
        
        // Store token securely
        try {
          this.storeAccessToken(response);
        } catch (storageError) {
          console.warn('Failed to store access token:', storageError);
          // Continue anyway as authentication was successful
        }
        
        console.log('Authentication successful');
        this.notifyAuthStateChange(true);
        resolve(response);
      };

      try {
        // Request access token
        this.tokenClient.requestAccessToken({
          prompt: 'consent'
        });
      } catch (error) {
        this.handleAuthError(error, { operation: 'authenticate', stage: 'request_token' });
        reject(error);
      }
    });
  }

  /**
   * Handle authentication state changes
   */
  handleAuthStateChange(response) {
    if (response.error) {
      console.error('Auth state change error:', response.error);
      this.handleAuthError(response.error);
      return;
    }

    if (response.access_token) {
      this.accessToken = response.access_token;
      this.isAuthenticated = true;
      
      // Configure gapi client with the token
      if (window.gapi && window.gapi.client) {
        gapi.client.setToken({
          access_token: response.access_token
        });
      }
      
      this.storeAccessToken(response);
      this.notifyAuthStateChange(true);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    if (!this.isInitialized || !this.tokenClient) {
      const error = new Error('AuthManager not properly initialized');
      this.handleAuthError(error, { operation: 'refresh_token', stage: 'initialization_check' });
      throw error;
    }

    try {
      // Check if we have a stored refresh token or need to re-authenticate
      const storedToken = this.getStoredToken();
      
      if (!storedToken || this.isTokenExpired(storedToken)) {
        console.log('Token expired or not available, re-authenticating...');
        return await window.ErrorHandler.retryWithBackoff(
          () => this.authenticate(),
          { operationId: 'auth_refresh', operation: 'refresh_token' }
        );
      }

      // Token is still valid
      this.accessToken = storedToken.access_token;
      this.isAuthenticated = true;
      this.notifyAuthStateChange(true);
      
      return storedToken;
      
    } catch (error) {
      this.handleAuthError(error, { operation: 'refresh_token' });
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      // Clear any pending refresh timeout
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = null;
      }
      
      if (this.accessToken) {
        // Revoke the token
        google.accounts.oauth2.revoke(this.accessToken);
      }
      
      this.accessToken = null;
      this.isAuthenticated = false;
      
      // Clear gapi client token
      if (window.gapi && window.gapi.client) {
        gapi.client.setToken(null);
      }
      
      // Clear stored token
      this.clearStoredToken();
      
      console.log('Signed out successfully');
      this.notifyAuthStateChange(false);
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Still clear local state even if revocation fails
      this.accessToken = null;
      this.isAuthenticated = false;
      
      // Clear gapi client token
      if (window.gapi && window.gapi.client) {
        gapi.client.setToken(null);
      }
      
      this.clearStoredToken();
      this.notifyAuthStateChange(false);
      
      // Clear timeout even on error
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = null;
      }
    }
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticatedUser() {
    return this.isAuthenticated && !!this.accessToken;
  }

  /**
   * Get current access token
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Validate current authentication state
   */
  async validateAuthentication() {
    if (!this.isAuthenticated || !this.accessToken) {
      return false;
    }

    try {
      // Test the token by making a simple API call with retry logic
      const response = await window.ErrorHandler.retryWithBackoff(
        () => gapi.client.sheets.spreadsheets.get({
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Public test sheet
          ranges: ['A1:A1']
        }),
        { operationId: 'auth_validation', operation: 'validate_authentication' }
      );
      
      return response.status === 200;
      
    } catch (error) {
      const errorResult = this.handleAuthError(error, { 
        operation: 'validate_authentication',
        tokenPresent: !!this.accessToken 
      });
      
      // If it's an authentication error, clear state
      if (error.status === 401 || error.status === 403) {
        this.isAuthenticated = false;
        this.accessToken = null;
        this.clearStoredToken();
        this.notifyAuthStateChange(false);
      }
      
      return false;
    }
  }

  /**
   * Store access token securely
   */
  storeAccessToken(tokenResponse) {
    try {
      const tokenData = {
        access_token: tokenResponse.access_token,
        expires_at: Date.now() + (tokenResponse.expires_in * 1000),
        scope: tokenResponse.scope,
        stored_at: Date.now()
      };
      
      const encrypted = this.encryptToken(JSON.stringify(tokenData));
      localStorage.setItem('vat_google_token', encrypted);
      
    } catch (error) {
      console.error('Failed to store access token:', error);
    }
  }

  /**
   * Get stored token
   */
  getStoredToken() {
    try {
      const encrypted = localStorage.getItem('vat_google_token');
      if (!encrypted) {
        return null;
      }
      
      const decrypted = this.decryptToken(encrypted);
      return JSON.parse(decrypted);
      
    } catch (error) {
      console.error('Failed to retrieve stored token:', error);
      this.clearStoredToken();
      return null;
    }
  }

  /**
   * Clear stored token
   */
  clearStoredToken() {
    try {
      localStorage.removeItem('vat_google_token');
    } catch (error) {
      console.error('Failed to clear stored token:', error);
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(tokenData) {
    if (!tokenData || !tokenData.expires_at) {
      return true;
    }
    
    // Add 5 minute buffer
    const buffer = 5 * 60 * 1000;
    return Date.now() > (tokenData.expires_at - buffer);
  }

  /**
   * Restore authentication from stored token
   */
  async restoreAuthenticationFromStorage() {
    try {
      const storedToken = this.getStoredToken();
      
      if (!storedToken) {
        console.log('No stored authentication token found');
        return false;
      }
      
      if (this.isTokenExpired(storedToken)) {
        console.log('Stored token is expired, clearing...');
        this.clearStoredToken();
        return false;
      }
      
      // Restore authentication state
      this.accessToken = storedToken.access_token;
      this.isAuthenticated = true;
      
      // Configure gapi client with the restored token
      if (window.gapi && window.gapi.client) {
        gapi.client.setToken({
          access_token: storedToken.access_token
        });
      }
      
      console.log('Authentication restored from stored token');
      this.notifyAuthStateChange(true);
      
      return true;
      
    } catch (error) {
      console.error('Failed to restore authentication from storage:', error);
      this.clearStoredToken();
      return false;
    }
  }

  /**
   * Simple token encryption
   */
  encryptToken(token) {
    // Simple XOR encryption with a key derived from browser fingerprint
    const key = this.getEncryptionKey();
    let result = '';
    
    for (let i = 0; i < token.length; i++) {
      result += String.fromCharCode(
        token.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(result);
  }

  /**
   * Simple token decryption
   */
  decryptToken(encryptedToken) {
    const key = this.getEncryptionKey();
    const token = atob(encryptedToken);
    let result = '';
    
    for (let i = 0; i < token.length; i++) {
      result += String.fromCharCode(
        token.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return result;
  }

  /**
   * Get encryption key based on browser fingerprint
   */
  getEncryptionKey() {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|');
    
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Handle authentication errors using ErrorHandler
   */
  handleAuthError(error, context = {}) {
    // Clear authentication state
    this.isAuthenticated = false;
    this.accessToken = null;
    this.clearStoredToken();
    this.notifyAuthStateChange(false);
    
    // Use ErrorHandler for comprehensive error handling
    const errorResult = window.ErrorHandler.handleError(error, {
      ...context,
      component: 'AuthManager',
      operation: context.operation || 'authentication'
    });
    
    // Handle automatic token refresh if suggested
    if (errorResult.recoveryStrategy.actions.includes('reauthenticate') && 
        errorResult.recoveryStrategy.shouldRetry) {
      this.scheduleTokenRefresh(errorResult.recoveryStrategy.retryDelay);
    }
    
    // Emit auth error event with recovery strategy
    window.dispatchEvent(new CustomEvent('authError', {
      detail: { 
        error, 
        errorInfo: errorResult.errorInfo,
        recoveryStrategy: errorResult.recoveryStrategy
      }
    }));
    
    return errorResult;
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(delay = 5000) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    this.refreshTimeout = setTimeout(async () => {
      try {
        console.log('Attempting automatic token refresh...');
        await this.refreshToken();
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        this.handleAuthError(error, { operation: 'token_refresh', automatic: true });
      }
    }, delay);
  }

  /**
   * Add authentication state listener
   */
  addAuthStateListener(callback) {
    this.authStateListeners.push(callback);
  }

  /**
   * Remove authentication state listener
   */
  removeAuthStateListener(callback) {
    const index = this.authStateListeners.indexOf(callback);
    if (index > -1) {
      this.authStateListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of authentication state change
   */
  notifyAuthStateChange(isAuthenticated) {
    this.authStateListeners.forEach(callback => {
      try {
        callback(isAuthenticated);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Update credentials (for settings override)
   */
  async updateCredentials(newCredentials) {
    try {
      // Store new credentials
      await window.EnvironmentManager.storeCredentials(newCredentials);
      
      // Update current credentials
      this.credentials = {
        ...this.credentials,
        ...newCredentials
      };
      
      // Re-initialize if already initialized
      if (this.isInitialized) {
        this.isInitialized = false;
        this.isAuthenticated = false;
        this.accessToken = null;
        this.tokenClient = null;
        
        // Clear stored token since credentials changed
        this.clearStoredToken();
        
        // Re-initialize with new credentials
        await this.init();
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to update credentials:', error);
      throw error;
    }
  }

  /**
   * Get current credentials
   */
  getCredentials() {
    return this.credentials;
  }

  /**
   * Check if using environment credentials
   */
  isUsingEnvironmentCredentials() {
    return window.EnvironmentManager.isUsingEnvironmentCredentials();
  }
}

// Global instance
window.AuthManager = new AuthManager();