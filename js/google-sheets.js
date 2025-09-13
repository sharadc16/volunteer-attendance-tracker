/**
 * Google Sheets API integration for the Volunteer Attendance Tracker
 * Handles authentication, data sync, and batch operations
 */

class GoogleSheetsService {
    constructor() {
        this.isInitialized = false;
        this.isAuthenticated = false;
        this.authenticationCancelled = false;
        this.lastAuthAttempt = null;
        this.authCooldownPeriod = 5 * 60 * 1000; // 5 minutes cooldown
        this.cancelCount = 0;
        this.maxCancelCount = 3; // Disable after 3 cancellations
        this.syncDisabled = false;
        this.authenticationInProgress = false; // Prevent concurrent auth attempts
        this.authenticationPromise = null; // Store ongoing auth promise
        this.gapi = null;
        this.spreadsheetId = null;
        this.apiKey = null;
        this.clientId = null;
        this.discoveryDoc = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
        this.scopes = 'https://www.googleapis.com/auth/spreadsheets';

        // Environment-aware sheet configuration
        this.updateEnvironmentConfig();

        // Listen for environment changes
        window.addEventListener('environmentChanged', () => {
            this.handleEnvironmentChange();
        });

        this.init();
    }

    /**
     * Update environment configuration
     */
    updateEnvironmentConfig() {
        // Get environment from Environment Manager or fallback to Config
        if (window.EnvironmentManager) {
            const envConfig = window.EnvironmentManager.getCurrentConfig();
            const sheetsConfig = window.EnvironmentManager.getGoogleSheetsConfig();
            
            this.environment = window.EnvironmentManager.currentEnvironment;
            this.spreadsheetId = sheetsConfig.spreadsheetId;
            
            // Sheet names with environment prefix
            const prefix = sheetsConfig.sheetPrefix || '';
            this.sheets = {
                volunteers: prefix + 'Volunteers',
                attendance: prefix + 'Attendance',
                events: prefix + 'Events',
                settings: prefix + 'Settings'
            };
        } else {
            // Fallback to legacy config
            this.environment = window.Config?.environment || 'development';
            this.googleSheetsConfig = window.Config?.googleSheets || {};
            
            const prefix = this.googleSheetsConfig.useEnvironmentPrefix ?
                this.googleSheetsConfig.environmentPrefix : '';

            this.sheets = {
                volunteers: prefix + (this.googleSheetsConfig.sheetNames?.volunteers || 'Volunteers'),
                attendance: prefix + (this.googleSheetsConfig.sheetNames?.attendance || 'Attendance'),
                events: prefix + (this.googleSheetsConfig.sheetNames?.events || 'Events'),
                settings: prefix + (this.googleSheetsConfig.sheetNames?.settings || 'Settings')
            };
        }

        console.log(`📊 Google Sheets configured for ${this.environment} environment`);
        console.log('Sheet names:', this.sheets);
        console.log('Spreadsheet ID:', this.spreadsheetId);
    }

    /**
     * Handle environment change
     */
    async handleEnvironmentChange() {
        console.log('🔄 Google Sheets service handling environment change...');
        
        try {
            // Update configuration
            this.updateEnvironmentConfig();
            
            // Reset authentication state
            this.isAuthenticated = false;
            this.authenticationCancelled = false;
            this.cancelCount = 0;
            
            // Clear any cached data
            this.clearCache();
            
            // Reload credentials for new environment
            await this.loadStoredCredentials();
            
            console.log(`✅ Google Sheets service updated for ${this.environment} environment`);
            
        } catch (error) {
            console.error('Failed to handle environment change:', error);
        }
    }

    /**
     * Clear cached data
     */
    clearCache() {
        // Clear any cached API responses or authentication tokens
        // This ensures fresh data for the new environment
        console.log('🧹 Clearing Google Sheets cache for environment switch');
    }

    /**
     * Check for environment mismatch before data operations
     */
    checkEnvironmentMismatch() {
        if (window.EnvironmentManager && window.EnvironmentManager.checkEnvironmentMismatch()) {
            throw new Error('Environment mismatch detected - Google Sheets operations prevented');
        }
    }

    /**
     * Initialize Google Sheets API
     */
    async init() {
        try {
            console.log('Initializing Google Sheets service...');

            // Check if feature is enabled
            if (!window.Config || !window.Config.features.googleSheetsSync) {
                console.log('Google Sheets sync is disabled in configuration');
                return;
            }

            // Try to load stored credentials
            await this.loadStoredCredentials();

            // Mark as initialized
            this.isInitialized = true;
            console.log('Google Sheets service initialized (ready for setup)');

        } catch (error) {
            console.error('Failed to initialize Google Sheets service:', error);
            this.showError('Failed to initialize Google Sheets integration');
        }
    }

    /**
     * Check if we have valid authentication without triggering new auth
     */
    isCurrentlyAuthenticated() {
        console.log('🔍 Checking current authentication status...');
        
        if (!this.isAuthenticated || !this.accessToken) {
            console.log('❌ Not authenticated in memory');
            return false;
        }
        
        const tokenStored = localStorage.getItem('googleSheetsToken');
        if (!tokenStored) {
            console.log('❌ No stored token found');
            this.isAuthenticated = false;
            this.accessToken = null;
            return false;
        }
        
        try {
            const tokenData = JSON.parse(tokenStored);
            
            if (!tokenData.expires_at || Date.now() >= tokenData.expires_at) {
                console.log('⏰ Access token has expired');
                
                // Check if we can refresh
                if (tokenData.refresh_token && tokenData.refresh_expires_at && Date.now() < tokenData.refresh_expires_at) {
                    console.log('🔄 Refresh token is available for renewal');
                    return 'needs_refresh';
                } else {
                    console.log('❌ No valid refresh token available');
                    this.isAuthenticated = false;
                    this.accessToken = null;
                    return false;
                }
            }
            
            const minutesUntilExpiry = Math.round((tokenData.expires_at - Date.now()) / 1000 / 60);
            console.log(`✅ Authentication valid for ${minutesUntilExpiry} more minutes`);
            return true;
            
        } catch (error) {
            console.warn('❌ Invalid token data:', error);
            localStorage.removeItem('googleSheetsToken');
            this.isAuthenticated = false;
            this.accessToken = null;
            return false;
        }
    }

    /**
     * Load stored credentials from localStorage
     */
    async loadStoredCredentials() {
        try {
            // Get spreadsheet ID from Environment Manager if available
            if (window.EnvironmentManager) {
                const sheetsConfig = window.EnvironmentManager.getGoogleSheetsConfig();
                this.spreadsheetId = sheetsConfig.spreadsheetId;
                
                if (this.spreadsheetId) {
                    console.log(`✅ Using spreadsheet ID from Environment Manager: ${this.spreadsheetId}`);
                }
            }
            
            // Load environment-specific credentials
            const credentialsKey = `googleSheetsCredentials_${this.environment}`;
            const stored = localStorage.getItem(credentialsKey);

            if (stored) {
                const credentials = JSON.parse(stored);

                // Update instance variables
                this.apiKey = credentials.apiKey;
                this.clientId = credentials.clientId;
                
                // Use spreadsheet ID from credentials if not set by Environment Manager
                if (!this.spreadsheetId) {
                    this.spreadsheetId = credentials.spreadsheetId;
                }

                console.log(`✅ Loaded stored Google Sheets credentials for ${this.environment} environment`);
                console.log(`📊 Using spreadsheet: ${this.spreadsheetId}`);
            } else {
                // Try to load legacy credentials (for backward compatibility)
                const legacyStored = localStorage.getItem('googleSheetsCredentials');
                if (legacyStored) {
                    console.log('🔄 Found legacy credentials, migrating to environment-specific storage...');
                    const credentials = JSON.parse(legacyStored);

                    // Save as environment-specific
                    localStorage.setItem(credentialsKey, legacyStored);

                    // Update instance variables
                    this.apiKey = credentials.apiKey;
                    this.clientId = credentials.clientId;
                    this.spreadsheetId = credentials.spreadsheetId;

                    console.log(`✅ Migrated credentials to ${this.environment} environment`);
                }
            }

            // Also try to load stored token
            const tokenStored = localStorage.getItem('googleSheetsToken');
            if (tokenStored) {
                const tokenData = JSON.parse(tokenStored);

                // Check if access token is still valid
                if (tokenData.expires_at && Date.now() < tokenData.expires_at) {
                    this.accessToken = tokenData.access_token;
                    this.isAuthenticated = true;
                    const minutesUntilExpiry = Math.round((tokenData.expires_at - Date.now()) / 1000 / 60);
                    console.log(`✅ Loaded valid stored access token (expires in ${minutesUntilExpiry} minutes)`);

                    // Check if token will expire soon and try to refresh
                    const timeUntilExpiry = tokenData.expires_at - Date.now();
                    if (timeUntilExpiry < (15 * 60 * 1000) && tokenData.refresh_token) {
                        console.log('🔄 Access token expires soon, will attempt refresh');
                        // Don't await this - let it happen in background
                        this.refreshAccessToken(tokenData.refresh_token).catch(console.warn);
                    }
                } else if (tokenData.refresh_token && tokenData.refresh_expires_at && Date.now() < tokenData.refresh_expires_at) {
                    // Access token expired but refresh token is still valid
                    console.log('⏰ Access token expired, but refresh token is still valid');
                    console.log('🔄 Attempting automatic token refresh...');
                    try {
                        await this.refreshAccessToken(tokenData.refresh_token);
                        console.log('✅ Automatic token refresh successful');
                    } catch (error) {
                        console.error('❌ Failed to refresh token:', error);
                        console.log('🧹 Removing invalid token data');
                        localStorage.removeItem('googleSheetsToken');
                    }
                } else {
                    // Both tokens expired, remove stored data
                    console.log('⏰ All stored tokens have expired');
                    console.log('🧹 Removing expired token data');
                    localStorage.removeItem('googleSheetsToken');
                    console.log('💡 User will need to re-authenticate on next request');
                }
            }
        } catch (error) {
            console.warn('Failed to load stored credentials:', error);
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        try {
            console.log('🔄 Starting access token refresh process...');
            console.log('🔑 Using stored refresh token to get new access token');

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            const tokenData = await response.json();

            if (tokenData.access_token) {
                console.log('✅ New access token received from refresh');
                this.accessToken = tokenData.access_token;
                this.isAuthenticated = true;

                // Update stored token data
                const storedToken = JSON.parse(localStorage.getItem('googleSheetsToken') || '{}');
                const updatedTokenData = {
                    ...storedToken,
                    access_token: tokenData.access_token,
                    expires_at: Date.now() + (tokenData.expires_in * 1000) - (10 * 60 * 1000),
                    expires_in: tokenData.expires_in,
                    received_at: Date.now()
                };

                // Keep the original refresh token if new one not provided
                if (tokenData.refresh_token) {
                    console.log('🔄 New refresh token also received');
                    updatedTokenData.refresh_token = tokenData.refresh_token;
                }

                console.log('💾 Updating stored token data...');
                localStorage.setItem('googleSheetsToken', JSON.stringify(updatedTokenData));
                console.log('✅ Token data updated successfully');

                console.log('🎉 Access token refresh completed successfully');
                console.log(`⏰ New token expires in: ${Math.round(tokenData.expires_in / 60)} minutes`);

                return true;
            } else {
                throw new Error('No access token in refresh response');
            }
        } catch (error) {
            console.error('❌ Failed to refresh access token:', error);
            this.isAuthenticated = false;
            this.accessToken = null;
            throw error;
        }
    }

    /**
     * Load Google API and Identity Services scripts dynamically
     */
    async loadGoogleAPI() {
        // Load both GAPI and Google Identity Services
        await Promise.all([
            this.loadScript('https://apis.google.com/js/api.js'),
            this.loadScript('https://accounts.google.com/gsi/client')
        ]);
    }

    /**
     * Load a script dynamically
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (src.includes('api.js') && window.gapi) {
                resolve();
                return;
            }
            if (src.includes('gsi/client') && window.google?.accounts) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize Google API client (can be called multiple times safely)
     */
    async initializeGoogleAPI() {
        if (this.gapi && this.gapi.client && this.isInitialized) {
            console.log('🔧 Google API client already initialized');
            return;
        }
        
        console.log('🔧 Initializing Google API client...');
        
        try {
            await this.initializeGAPI();
            this.isInitialized = true;
            console.log('✅ Google API client initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Google API client:', error);
            throw error;
        }
    }

    /**
     * Wait for Google APIs to be available
     */
    async waitForGoogleAPIs() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkAPIs = () => {
                attempts++;
                
                const gapiReady = typeof window.gapi !== 'undefined' && window.gapi.load;
                const googleReady = typeof window.google !== 'undefined' && 
                                  window.google.accounts && 
                                  window.google.accounts.id && 
                                  window.google.accounts.oauth2;
                
                if (gapiReady && googleReady) {
                    console.log('✅ Both Google API and Google Identity Services are available');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    const missing = [];
                    if (!gapiReady) missing.push('Google API (gapi)');
                    if (!googleReady) missing.push('Google Identity Services');
                    reject(new Error(`Google APIs failed to load after 5 seconds. Missing: ${missing.join(', ')}`));
                } else {
                    const status = [];
                    if (gapiReady) status.push('gapi ✅'); else status.push('gapi ❌');
                    if (googleReady) status.push('google ✅'); else status.push('google ❌');
                    console.log(`⏳ Waiting for Google APIs... (attempt ${attempts}/${maxAttempts}) [${status.join(', ')}]`);
                    setTimeout(checkAPIs, 100);
                }
            };
            
            checkAPIs();
        });
    }

    /**
     * Initialize Google API client with new Identity Services
     */
    async initializeGAPI() {
        // First, wait for both Google APIs to be available
        await this.waitForGoogleAPIs();
        
        return new Promise((resolve, reject) => {
            window.gapi.load('client', async () => {
                try {
                    // Get API credentials from configuration or prompt user
                    const credentials = await this.getCredentialsInternal();

                    // Initialize GAPI client
                    await window.gapi.client.init({
                        apiKey: credentials.apiKey,
                        discoveryDocs: [this.discoveryDoc]
                    });

                    // Initialize Google Identity Services
                    window.google.accounts.id.initialize({
                        client_id: credentials.clientId,
                        callback: this.handleCredentialResponse.bind(this)
                    });

                    // Initialize OAuth2 for Sheets access with maximum persistence
                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: credentials.clientId,
                        scope: this.scopes,
                        callback: this.handleTokenResponse.bind(this),
                        // Enable offline access for refresh tokens
                        hint: 'offline_access_requested',
                        // Include granted scopes for better token management
                        include_granted_scopes: true,
                        // Enable auto-select for better UX
                        auto_select: false,
                        // State parameter for security
                        state: 'volunteer_attendance_tracker'
                    });

                    this.gapi = window.gapi;
                    this.apiKey = credentials.apiKey;
                    this.clientId = credentials.clientId;
                    this.spreadsheetId = credentials.spreadsheetId;

                    console.log('Google API and Identity Services initialized');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Handle credential response from Google Identity Services
     */
    handleCredentialResponse(response) {
        console.log('Credential response received:', response);
        // This is for ID token, we mainly need the OAuth token for Sheets access
    }

    /**
     * Handle token response from OAuth2
     */
    handleTokenResponse(response) {
        console.log('🔐 OAuth2 token response received:', response);
        
        if (response.access_token) {
            console.log('✅ Access token received successfully');
            console.log(`📅 Token expires in: ${Math.round(response.expires_in / 60)} minutes`);
            console.log('🔑 Access token preview:', response.access_token.substring(0, 20) + '...');
            
            this.accessToken = response.access_token;
            this.isAuthenticated = true;

            // Store token with maximum expiration for persistent authentication
            const tokenData = {
                access_token: response.access_token,
                // Use maximum allowed expiration (typically 1 hour for access tokens)
                // Add 10-minute buffer instead of 1-minute for better persistence
                expires_at: Date.now() + (response.expires_in * 1000) - (10 * 60 * 1000),
                // Store refresh token if available (for long-term persistence)
                refresh_token: response.refresh_token,
                // Store the original expires_in for reference
                expires_in: response.expires_in,
                // Store timestamp when token was received
                received_at: Date.now()
            };

            // If we have a refresh token, we can persist much longer
            if (response.refresh_token) {
                console.log('🔄 Refresh token received - enabling long-term persistence');
                console.log('📅 Refresh token valid for up to 6 months');
                // Refresh tokens can last up to 6 months - set maximum expiration
                tokenData.refresh_expires_at = Date.now() + (6 * 30 * 24 * 60 * 60 * 1000); // 6 months (180 days)
            } else {
                console.warn('⚠️ No refresh token received - authentication will expire in 1 hour');
                console.log('💡 To get refresh tokens, you may need to revoke access and re-authenticate');
                console.log('💡 Visit https://myaccount.google.com/permissions to manage app permissions');
            }

            console.log('💾 Saving access token to localStorage...');
            console.log('📄 Token data to save:', {
                hasAccessToken: !!tokenData.access_token,
                hasRefreshToken: !!tokenData.refresh_token,
                expiresAt: new Date(tokenData.expires_at).toLocaleString(),
                expiresIn: tokenData.expires_in + ' seconds'
            });
            
            localStorage.setItem('googleSheetsToken', JSON.stringify(tokenData));
            
            // Verify it was saved
            const savedToken = localStorage.getItem('googleSheetsToken');
            if (savedToken) {
                console.log('✅ Token saved successfully to localStorage');
                console.log('🔍 Saved token size:', savedToken.length + ' characters');
            } else {
                console.error('❌ Failed to save token to localStorage');
            }

            console.log('🎉 OAuth2 authentication completed successfully');
            console.log(`⏰ Access token expires in: ${Math.round(response.expires_in / 60)} minutes`);
            if (response.refresh_token) {
                console.log('🔄 Refresh token available for automatic renewal');
            }
        } else {
            console.error('No access token received');
        }
    }

    /**
     * Public method to get credentials (for external calls)
     */
    async getCredentials() {
        return await this.getCredentialsInternal();
    }

    /**
     * Get API credentials from user or storage
     */
    async getCredentialsInternal() {
        // First try server credential manager (secure method)
        if (window.serverCredentialManager) {
            try {
                console.log('🔐 Attempting to load credentials from server...');
                
                // Initialize if not already done
                if (!window.serverCredentialManager.isInitialized) {
                    await window.serverCredentialManager.initialize();
                }

                const apiKey = await window.serverCredentialManager.getCredential('google_sheets_api_key');
                const clientId = await window.serverCredentialManager.getCredential('google_oauth_client_id');
                const spreadsheetId = await window.serverCredentialManager.getCredential('volunteer_spreadsheet_id');

                if (apiKey && clientId && spreadsheetId) {
                    const credentials = {
                        apiKey: apiKey,
                        clientId: clientId,
                        spreadsheetId: spreadsheetId
                    };

                    // Update instance variables
                    this.apiKey = credentials.apiKey;
                    this.clientId = credentials.clientId;
                    this.spreadsheetId = credentials.spreadsheetId;

                    console.log('✅ Loaded credentials from secure server');
                    return credentials;
                }
            } catch (error) {
                console.warn('❌ Failed to load server credentials:', error);
            }
        }

        // Fallback to localStorage (legacy method)
        const stored = localStorage.getItem('googleSheetsCredentials');
        if (stored) {
            try {
                const credentials = JSON.parse(stored);

                // Update instance variables
                this.apiKey = credentials.apiKey;
                this.clientId = credentials.clientId;
                this.spreadsheetId = credentials.spreadsheetId;

                console.log('✅ Loaded stored credentials from localStorage');
                return credentials;
            } catch (error) {
                console.warn('❌ Invalid stored credentials, will prompt user');
            }
        }

        // Last resort: Prompt user for credentials
        console.log('⚠️ No credentials found, prompting user...');
        const credentials = await this.promptForCredentials();

        // Update instance variables
        this.apiKey = credentials.apiKey;
        this.clientId = credentials.clientId;
        this.spreadsheetId = credentials.spreadsheetId;

        return credentials;
    }

    /**
     * Prompt user for Google Sheets credentials
     */
    async promptForCredentials() {
        return new Promise((resolve, reject) => {
            console.log('Creating credentials modal...');

            const modal = this.createCredentialsModal();
            document.body.appendChild(modal);

            const form = modal.querySelector('#credentialsForm');
            const cancelBtn = modal.querySelector('#cancelCredentials');

            if (!form || !cancelBtn) {
                console.error('Modal elements not found');
                reject(new Error('Modal setup failed'));
                return;
            }

            console.log('Modal created and added to DOM');

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Form submitted');

                const credentials = {
                    apiKey: form.apiKey.value.trim(),
                    clientId: form.clientId.value.trim(),
                    spreadsheetId: form.spreadsheetId.value.trim()
                };

                console.log('Credentials entered:', {
                    apiKey: credentials.apiKey ? 'Present' : 'Missing',
                    clientId: credentials.clientId ? 'Present' : 'Missing',
                    spreadsheetId: credentials.spreadsheetId ? 'Present' : 'Missing'
                });

                // Validate credentials
                if (!credentials.apiKey || !credentials.clientId || !credentials.spreadsheetId) {
                    alert('Please fill in all fields');
                    return;
                }

                // Store credentials with environment-specific key
                const credentialsKey = `googleSheetsCredentials_${this.environment}`;
                localStorage.setItem(credentialsKey, JSON.stringify(credentials));
                console.log(`✅ Credentials stored successfully for ${this.environment} environment`);

                // Remove modal
                document.body.removeChild(modal);

                resolve(credentials);
            });

            cancelBtn.addEventListener('click', () => {
                console.log('User clicked cancel');
                document.body.removeChild(modal);
                reject(new Error('User cancelled credential setup'));
            });

            // Handle modal overlay clicks (clicking outside modal)
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('User clicked outside modal');
                    document.body.removeChild(modal);
                    reject(new Error('User cancelled credential setup'));
                }
            });

            // Focus the first input when modal opens
            setTimeout(() => {
                const firstInput = modal.querySelector('input[type="text"]');
                if (firstInput) {
                    firstInput.focus();
                    console.log('Focused first input');
                }
            }, 100);
        });
    }

    /**
     * Create credentials input modal
     */
    createCredentialsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Google Sheets Integration Setup</h3>
                    <div style="background: ${this.environment === 'development' ? '#fff3cd' : '#d4edda'}; 
                                color: ${this.environment === 'development' ? '#856404' : '#155724'}; 
                                padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.875rem;">
                        <strong>Environment:</strong> ${this.environment.toUpperCase()}
                        ${this.environment === 'development' ?
                '<br><small>⚠️ Use a separate test spreadsheet for development</small>' :
                '<br><small>✅ This will connect to your production spreadsheet</small>'}
                    </div>
                </div>
                <div class="modal-body">
                    <p>To enable Google Sheets integration, you need to set up a Google Cloud project and get API credentials.</p>
                    
                    <div style="background: #e3f2fd; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                        <h4>📊 Environment-Specific Setup:</h4>
                        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            <li><strong>Development/Testing:</strong> Use a separate test spreadsheet</li>
                            <li><strong>Production:</strong> Use your main data spreadsheet</li>
                            <li><strong>API Credentials:</strong> Same credentials work for both environments</li>
                        </ul>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                        <h4>Quick Setup Guide:</h4>
                        <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            <li>Go to <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a></li>
                            <li>Create a new project or select existing one</li>
                            <li>Enable the Google Sheets API</li>
                            <li>Create credentials (API Key and OAuth 2.0 Client ID)</li>
                            <li>Create a Google Sheet and copy its ID from the URL</li>
                        </ol>
                    </div>

                    <form id="credentialsForm">
                        <div style="margin-bottom: 1rem;">
                            <label for="apiKey">API Key:</label>
                            <input type="text" id="apiKey" name="apiKey" required 
                                   placeholder="AIza..." autocomplete="off">
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label for="clientId">OAuth Client ID:</label>
                            <input type="text" id="clientId" name="clientId" required 
                                   placeholder="123456789-...googleusercontent.com" autocomplete="off">
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label for="spreadsheetId">Google Sheet ID (${this.environment.toUpperCase()}):</label>
                            <input type="text" id="spreadsheetId" name="spreadsheetId" required 
                                   placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" autocomplete="off">
                            <small style="color: #666; font-size: 0.8rem; display: block; margin-top: 0.25rem;">
                                Copy from the Google Sheet URL between /d/ and /edit<br>
                                <strong>${this.environment === 'development' ?
                '⚠️ Use a TEST spreadsheet for development' :
                '✅ Use your PRODUCTION spreadsheet'}</strong>
                            </small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" id="cancelCredentials" class="btn btn-secondary">Cancel</button>
                    <button type="submit" form="credentialsForm" class="btn btn-primary">Save & Connect</button>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * Authenticate user with Google using new Identity Services
     */
    async authenticate() {
        if (!this.isInitialized) {
            throw new Error('Google Sheets service not initialized');
        }

        // Prevent concurrent authentication attempts
        if (this.authenticationInProgress) {
            console.log('🔄 Authentication already in progress, waiting for completion...');
            if (this.authenticationPromise) {
                return await this.authenticationPromise;
            }
        }

        // First, try to load and validate stored token
        console.log('🔍 Checking for stored authentication token...');
        const tokenStored = localStorage.getItem('googleSheetsToken');
        console.log('📄 Token storage check:', tokenStored ? `Found (${tokenStored.length} chars)` : 'Not found');
        
        if (tokenStored) {
            try {
                const tokenData = JSON.parse(tokenStored);
                console.log('📄 Found stored token data');
                
                // Check if access token is still valid
                if (tokenData.expires_at && Date.now() < tokenData.expires_at) {
                    console.log('✅ Stored access token is still valid');
                    this.accessToken = tokenData.access_token;
                    this.isAuthenticated = true;
                    
                    const minutesUntilExpiry = Math.round((tokenData.expires_at - Date.now()) / 1000 / 60);
                    console.log(`⏰ Token expires in ${minutesUntilExpiry} minutes`);
                    
                    // If token expires soon, try to refresh in background
                    if (minutesUntilExpiry < 15 && tokenData.refresh_token) {
                        console.log('🔄 Token expires soon, refreshing in background...');
                        this.refreshAccessToken(tokenData.refresh_token).catch(console.warn);
                    }
                    
                    return; // Already authenticated, no need to continue
                    
                } else if (tokenData.refresh_token && tokenData.refresh_expires_at && Date.now() < tokenData.refresh_expires_at) {
                    console.log('⏰ Access token expired, but refresh token is valid');
                    console.log('🔄 Attempting automatic token refresh...');
                    
                    try {
                        await this.refreshAccessToken(tokenData.refresh_token);
                        console.log('✅ Token refreshed successfully, authentication complete');
                        return; // Successfully refreshed, no need to continue
                    } catch (error) {
                        console.warn('❌ Token refresh failed:', error);
                        console.log('🧹 Clearing invalid token data');
                        localStorage.removeItem('googleSheetsToken');
                        this.isAuthenticated = false;
                        this.accessToken = null;
                    }
                } else {
                    console.log('⏰ All stored tokens have expired');
                    console.log('🧹 Clearing expired token data');
                    localStorage.removeItem('googleSheetsToken');
                    this.isAuthenticated = false;
                    this.accessToken = null;
                }
            } catch (error) {
                console.warn('❌ Invalid token data in storage:', error);
                localStorage.removeItem('googleSheetsToken');
                this.isAuthenticated = false;
                this.accessToken = null;
            }
        } else {
            console.log('📭 No stored token found');
        }

        // If we reach here, we need to authenticate
        console.log('🔐 Authentication required - proceeding with OAuth flow');
        
        // Mark authentication as in progress and create promise
        this.authenticationInProgress = true;
        this.authenticationPromise = this.performAuthentication();
        
        try {
            const result = await this.authenticationPromise;
            return result;
        } finally {
            this.authenticationInProgress = false;
            this.authenticationPromise = null;
        }
    }

    /**
     * Perform the actual authentication process
     */
    async performAuthentication() {

        // Check if authentication was recently cancelled and we're in cooldown
        if (this.authenticationCancelled && this.lastAuthAttempt) {
            const timeSinceLastAttempt = Date.now() - this.lastAuthAttempt;
            if (timeSinceLastAttempt < this.authCooldownPeriod) {
                const remainingTime = Math.ceil((this.authCooldownPeriod - timeSinceLastAttempt) / 1000 / 60);
                console.log(`Authentication cooldown active. Try again in ${remainingTime} minutes.`);
                throw new Error(`Authentication cancelled. Please wait ${remainingTime} minutes before trying again.`);
            } else {
                // Cooldown period has passed, reset the cancellation flag
                this.authenticationCancelled = false;
                this.lastAuthAttempt = null;
            }
        }

        try {
            // Record this authentication attempt
            this.lastAuthAttempt = Date.now();

            // If GAPI isn't loaded yet, load it now
            if (!this.gapi || !this.tokenClient) {
                console.log('Loading Google API for authentication...');
                await this.loadGoogleAPI();
                await this.initializeGAPI();
            }

            // Request OAuth2 token for Sheets access with refresh token support
            return new Promise((resolve, reject) => {
                // Set up callback for this specific request
                this.tokenClient.callback = (response) => {
                    console.log('🎯 Token client callback triggered with response:', response);
                    
                    if (response.access_token) {
                        console.log('✅ Processing successful token response...');
                        
                        // Call the main token handler
                        this.handleTokenResponse(response);
                        
                        this.accessToken = response.access_token;
                        this.isAuthenticated = true;
                        this.authenticationCancelled = false; // Reset cancellation flag on success
                        this.lastAuthAttempt = null;
                        console.log('🎉 Google Sheets authentication successful');
                        resolve(true);
                    } else if (response.error) {
                        // Handle user cancellation or other errors
                        if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
                            this.authenticationCancelled = true;
                            this.cancelCount++;

                            // Disable sync after multiple cancellations
                            if (this.cancelCount >= this.maxCancelCount) {
                                this.syncDisabled = true;
                                console.log(`Google Sheets sync disabled after ${this.cancelCount} cancellations. You can re-enable it in settings.`);
                            }

                            console.log(`Authentication cancelled by user (${this.cancelCount}/${this.maxCancelCount})`);
                            reject(new Error('Authentication cancelled by user'));
                        } else {
                            console.error('Authentication failed:', response);
                            reject(new Error('Authentication failed: ' + response.error));
                        }
                    } else {
                        console.error('Authentication failed: No access token received');
                        reject(new Error('Authentication failed: No access token received'));
                    }
                };

                // Set up error handler for popup blocking or other issues
                this.tokenClient.error_callback = (error) => {
                    console.log('🚫 Authentication error occurred:', error);
                    
                    if (error.type === 'popup_closed' || error.message === 'Popup window closed') {
                        console.log('🪟 User closed the authentication popup');
                        this.authenticationCancelled = true;
                        this.cancelCount++;
                        
                        // Provide user guidance
                        console.log('💡 To authenticate:');
                        console.log('   1. Click the authentication button again');
                        console.log('   2. Complete the Google sign-in process');
                        console.log('   3. Do not close the popup window');
                        
                        reject(new Error('Authentication cancelled - popup was closed. Please try again and complete the sign-in process.'));
                    } else {
                        this.authenticationCancelled = true;
                        this.cancelCount++;
                        
                        console.error('❌ Unexpected authentication error:', error);
                        reject(new Error('Authentication error: ' + (error.message || error.type || 'Unknown error')));
                    }

                    // Disable sync after multiple cancellations
                    if (this.cancelCount >= this.maxCancelCount) {
                        this.syncDisabled = true;
                        console.log(`🛑 Google Sheets sync disabled after ${this.cancelCount} cancellations. You can re-enable it in settings.`);
                    }
                };

                // Request access token with enhanced configuration for refresh tokens
                console.log('🔐 Requesting access token with consent prompt for refresh token...');
                this.tokenClient.requestAccessToken({
                    prompt: 'consent', // Force consent screen to ensure we get refresh token
                    include_granted_scopes: true,
                    enable_granular_consent: true
                });
            });

        } catch (error) {
            this.authenticationCancelled = true;
            console.error('Google Sheets authentication failed:', error);
            throw new Error('Authentication failed: ' + error.message);
        }
    }

    /**
     * Sign out from Google
     */
    async signOut() {
        if (this.isAuthenticated) {
            // Revoke the access token
            if (this.accessToken) {
                window.google.accounts.oauth2.revoke(this.accessToken);
            }

            this.accessToken = null;
            this.isAuthenticated = false;

            // Clear stored token
            localStorage.removeItem('googleSheetsToken');

            console.log('Signed out from Google Sheets');
        }
    }

    /**
     * Create spreadsheet structure if it doesn't exist
     */
    async setupSpreadsheet() {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            // Set the access token for the request
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            // Check if spreadsheet exists and has required sheets
            const spreadsheet = await this.gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });

            const existingSheets = spreadsheet.result.sheets.map(sheet => sheet.properties.title);
            const requiredSheets = Object.values(this.sheets);
            const missingSheets = requiredSheets.filter(sheet => !existingSheets.includes(sheet));

            // Create missing sheets
            if (missingSheets.length > 0) {
                const requests = missingSheets.map(sheetName => ({
                    addSheet: {
                        properties: {
                            title: sheetName
                        }
                    }
                }));

                await this.gapi.client.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: { requests }
                });

                console.log('Created missing sheets:', missingSheets);
            }

            // Setup headers for each sheet
            await this.setupSheetHeaders();

            console.log('Spreadsheet setup completed');
            return true;

        } catch (error) {
            console.error('Failed to setup spreadsheet:', error);
            throw new Error('Spreadsheet setup failed: ' + error.message);
        }
    }

    /**
     * Setup headers for all sheets
     */
    async setupSheetHeaders() {
        const headerUpdates = [
            {
                range: `${this.sheets.volunteers}!A1:E1`,
                values: [['ID', 'Name', 'Committee', 'Status', 'Date Added']]
            },
            {
                range: `${this.sheets.attendance}!A1:G1`,
                values: [['ID', 'Volunteer ID', 'Volunteer Name', 'Event ID', 'Event Name', 'Committee', 'Date/Time']]
            },
            {
                range: `${this.sheets.events}!A1:F1`,
                values: [['Event ID', 'Event Name', 'Date', 'Type', 'Status', 'Day of Week']]
            },
            {
                range: `${this.sheets.settings}!A1:B1`,
                values: [['Setting', 'Value']]
            }
        ];

        const requests = headerUpdates.map(update => ({
            range: update.range,
            values: update.values
        }));

        await this.gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            resource: {
                valueInputOption: 'RAW',
                data: requests
            }
        });
    }

    /**
     * Upload volunteers data to Google Sheets
     */
    async uploadVolunteers(volunteers) {
        // Check for environment mismatch before data operations
        this.checkEnvironmentMismatch();
        
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            // Set the access token for the request
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            const values = volunteers.map(volunteer => [
                volunteer.id,
                volunteer.name,
                volunteer.committee,
                volunteer.status,
                volunteer.dateAdded
            ]);

            await this.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${this.sheets.volunteers}!A2:E${values.length + 1}`,
                valueInputOption: 'RAW',
                resource: { values }
            });

            console.log(`Uploaded ${volunteers.length} volunteers to Google Sheets`);
            return true;

        } catch (error) {
            console.error('❌ Failed to upload volunteers:', error);
            this.handleUploadError(error, 'volunteers');
            throw error;
        }
    }

    /**
     * Download volunteers data from Google Sheets
     */
    async downloadVolunteers() {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            // Set the access token for the request
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            const response = await this.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${this.sheets.volunteers}!A2:E`
            });

            const rows = response.result.values || [];
            const volunteers = rows
                .filter(row => row.length >= 2 && row[0] && row[1]) // Must have ID and Name
                .map(row => ({
                    id: row[0]?.toString().trim() || '',
                    name: row[1]?.toString().trim() || '',
                    committee: row[2]?.toString().trim() || 'General',
                    status: row[3]?.toString().trim() || 'Active',
                    dateAdded: row[4]?.toString().trim() || new Date().toISOString()
                }));

            console.log(`Downloaded ${volunteers.length} volunteers from Google Sheets`);
            return volunteers;

        } catch (error) {
            console.error('Failed to download volunteers:', error);
            throw error;
        }
    }

    /**
     * Sync volunteers from Google Sheets to local storage
     * This will add new volunteers and update existing ones
     */
    async syncVolunteersFromSheets() {
        try {
            console.log('Starting volunteer sync from Google Sheets...');

            // Download volunteers from Google Sheets
            const sheetVolunteers = await this.downloadVolunteers();

            if (sheetVolunteers.length === 0) {
                console.log('No volunteers found in Google Sheets');
                return { added: 0, updated: 0, errors: [] };
            }

            // Get existing volunteers from local storage
            const localVolunteers = await window.StorageManager.getAllVolunteers();
            const localVolunteerIds = new Set(localVolunteers.map(v => v.id));

            let addedCount = 0;
            let updatedCount = 0;
            const errors = [];

            // Process each volunteer from the sheet
            for (const volunteer of sheetVolunteers) {
                try {
                    if (localVolunteerIds.has(volunteer.id)) {
                        // Update existing volunteer
                        await window.StorageManager.updateVolunteer(volunteer);
                        updatedCount++;
                        console.log(`Updated volunteer: ${volunteer.name} (${volunteer.id})`);
                    } else {
                        // Add new volunteer
                        await window.StorageManager.addVolunteer(volunteer);
                        addedCount++;
                        console.log(`Added new volunteer: ${volunteer.name} (${volunteer.id})`);
                    }
                } catch (error) {
                    console.error(`Failed to sync volunteer ${volunteer.id}:`, error);
                    errors.push(`${volunteer.id}: ${error.message}`);
                }
            }

            const result = { added: addedCount, updated: updatedCount, errors };
            console.log('Volunteer sync completed:', result);

            // Trigger UI update if app is available
            if (window.app && typeof window.app.updateVolunteersView === 'function') {
                await window.app.updateVolunteersView();
            }

            return result;

        } catch (error) {
            console.error('Failed to sync volunteers from Google Sheets:', error);
            throw error;
        }
    }

    /**
     * Upload attendance data to Google Sheets
     */
    async uploadAttendance(attendanceRecords) {
        // Check for environment mismatch before data operations
        this.checkEnvironmentMismatch();
        
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            // Set the access token for the request
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            const values = attendanceRecords.map(record => [
                record.id,
                record.volunteerId,
                record.volunteerName,
                record.eventId,
                record.eventName,
                record.committee,
                record.dateTime
            ]);

            // Append to existing data
            await this.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${this.sheets.attendance}!A:G`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values }
            });

            console.log(`Uploaded ${attendanceRecords.length} attendance records to Google Sheets`);
            return true;

        } catch (error) {
            console.error('❌ Failed to upload attendance:', error);
            this.handleUploadError(error, 'attendance');
            throw error;
        }
    }

    /**
     * Upload events data to Google Sheets
     */
    async uploadEvents(events) {
        // Check for environment mismatch before data operations
        this.checkEnvironmentMismatch();
        
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            // Set the access token for the request
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            const values = events.map(event => [
                event.eventId,
                event.eventName,
                event.date,
                event.type,
                event.status,
                event.dayOfWeek || ''
            ]);

            await this.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${this.sheets.events}!A2:F${values.length + 1}`,
                valueInputOption: 'RAW',
                resource: { values }
            });

            console.log(`Uploaded ${events.length} events to Google Sheets`);
            return true;

        } catch (error) {
            console.error('❌ Failed to upload events:', error);
            
            // Handle specific error types for better debugging
            if (error.status === 403) {
                console.error('🚫 Permission denied when uploading events - possible causes:');
                console.error('   1. Access token lacks write permissions to Google Sheets');
                console.error('   2. Google Sheet is not shared with the authenticated account');
                console.error('   3. Token was obtained with insufficient scope');
                console.error('💡 Solution: Re-authenticate to get proper write permissions');
                console.error('💡 Check: Ensure the Google Sheet is shared with your account');
                
                // Mark for re-authentication
                this.isAuthenticated = false;
                this.accessToken = null;
                console.log('🔄 Marked for re-authentication due to permission error');
            } else if (error.status === 401) {
                console.error('🔐 Authentication failed - token expired or invalid');
                this.isAuthenticated = false;
                this.accessToken = null;
                localStorage.removeItem('googleSheetsToken');
                console.log('🧹 Cleared expired authentication data');
            } else if (error.status === 404) {
                console.error('📄 Spreadsheet or sheet not found');
                console.error('💡 Check: Verify the spreadsheet ID and sheet name are correct');
            }
            
            throw error;
        }
    }

    /**
     * Perform full sync of all data
     */
    async syncAllData() {
        // Check for environment mismatch before data operations
        this.checkEnvironmentMismatch();
        
        if (!window.StorageManager) {
            throw new Error('Storage manager not available');
        }

        try {
            console.log('Starting full Google Sheets sync...');

            // Ensure spreadsheet is set up
            await this.setupSpreadsheet();

            // Get all data from local storage
            const [volunteers, attendance, events] = await Promise.all([
                window.StorageManager.getAllVolunteers(),
                window.StorageManager.getTodayAttendance(), // For now, just today's data
                window.StorageManager.getAllEvents()
            ]);

            // Upload to Google Sheets
            await Promise.all([
                this.uploadVolunteers(volunteers),
                this.uploadAttendance(attendance),
                this.uploadEvents(events)
            ]);

            console.log('Google Sheets sync completed successfully');
            this.showSuccess('Data synced to Google Sheets successfully');

            return {
                volunteers: volunteers.length,
                attendance: attendance.length,
                events: events.length
            };

        } catch (error) {
            console.error('Google Sheets sync failed:', error);
            this.showError('Sync failed: ' + error.message);
            throw error;
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Use existing feedback system or create notification
        console.log('✅ ' + message);

        // If scanner feedback is available, use it
        if (window.ScannerManager && window.ScannerManager.showFeedback) {
            window.ScannerManager.showFeedback('success', message);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('❌ ' + message);

        // If scanner feedback is available, use it
        if (window.ScannerManager && window.ScannerManager.showFeedback) {
            window.ScannerManager.showFeedback('error', message);
        }
    }

    /**
     * Test basic API key connectivity (no OAuth required)
     */
    async testBasicConnection() {
        try {
            console.log('Testing basic API key connectivity...');

            if (!this.apiKey || !this.spreadsheetId) {
                throw new Error('API key or spreadsheet ID missing');
            }

            // Use fetch to test basic API access (no OAuth required)
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?key=${this.apiKey}&fields=properties.title,sheets.properties.title`;

            console.log('Testing URL:', url.replace(this.apiKey, 'API_KEY_HIDDEN'));

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                console.error('API Error:', data);
                throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = {
                success: true,
                title: data.properties.title,
                sheets: data.sheets.map(sheet => sheet.properties.title),
                message: `✅ Basic connection successful to "${data.properties.title}"`
            };

            console.log('Basic connection test successful:', result);
            return result;

        } catch (error) {
            console.error('Basic connection test failed:', error);

            let message = '❌ Basic connection failed: ';
            if (error.message.includes('404')) {
                message += 'Spreadsheet not found. Check the Sheet ID.';
            } else if (error.message.includes('403')) {
                message += 'Access denied. Check API key permissions or sheet sharing.';
            } else if (error.message.includes('400')) {
                message += 'Invalid request. Check API key format.';
            } else {
                message += error.message;
            }

            return {
                success: false,
                error: error,
                message: message
            };
        }
    }

    /**
     * Test authenticated connectivity to Google Sheets
     */
    async testConnection() {
        if (!this.isInitialized) {
            throw new Error('Google Sheets service not initialized');
        }

        if (!this.isAuthenticated) {
            throw new Error('Not authenticated. Please authenticate first.');
        }

        try {
            console.log('Testing authenticated Google Sheets connection...');

            // Set the access token for the request
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            // Try to read spreadsheet info with authentication
            const response = await this.gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
                fields: 'properties.title,sheets.properties.title'
            });

            const result = {
                success: true,
                title: response.result.properties.title,
                sheets: response.result.sheets.map(sheet => sheet.properties.title),
                message: `✅ Successfully connected to "${response.result.properties.title}" with write access`
            };

            console.log('Authenticated connection test successful:', result);
            return result;

        } catch (error) {
            console.error('Authenticated connection test failed:', error);

            let message = '❌ Authenticated connection failed: ';
            if (error.status === 404) {
                message += 'Spreadsheet not found. Check the Sheet ID.';
            } else if (error.status === 403) {
                message += 'Access denied. Check permissions or re-authenticate.';
            } else {
                message += error.message;
            }

            return {
                success: false,
                error: error,
                message: message
            };
        }
    }

    /**
     * Get sync status
     */
    getStatus() {
        // Check both instance variables and localStorage
        const stored = localStorage.getItem('googleSheetsCredentials');
        const hasStoredCredentials = !!stored;
        const hasInstanceCredentials = !!(this.apiKey && this.clientId && this.spreadsheetId);

        // Check if we're in cooldown period
        let inCooldown = false;
        let cooldownRemaining = 0;
        if (this.authenticationCancelled && this.lastAuthAttempt) {
            const timeSinceLastAttempt = Date.now() - this.lastAuthAttempt;
            inCooldown = timeSinceLastAttempt < this.authCooldownPeriod;
            cooldownRemaining = Math.ceil((this.authCooldownPeriod - timeSinceLastAttempt) / 1000 / 60);
        }

        return {
            isInitialized: this.isInitialized,
            isAuthenticated: this.isAuthenticated,
            hasCredentials: hasInstanceCredentials || hasStoredCredentials,
            spreadsheetId: this.spreadsheetId || (hasStoredCredentials ? JSON.parse(stored).spreadsheetId : null),
            authenticationCancelled: this.authenticationCancelled,
            inCooldown: inCooldown,
            cooldownRemaining: cooldownRemaining,
            syncDisabled: this.syncDisabled,
            cancelCount: this.cancelCount,
            maxCancelCount: this.maxCancelCount
        };
    }

    /**
     * Re-enable Google Sheets sync
     */
    enableSync() {
        this.syncDisabled = false;
        this.cancelCount = 0;
        this.authenticationCancelled = false;
        this.lastAuthAttempt = null;
        console.log('Google Sheets sync re-enabled');
    }

    /**
     * Clear stored credentials
     */
    clearCredentials() {
        localStorage.removeItem('googleSheetsCredentials');
        this.apiKey = null;
        this.clientId = null;
        this.spreadsheetId = null;
        this.isAuthenticated = false;
        this.syncDisabled = false;
        this.cancelCount = 0;
        this.authenticationCancelled = false;
        this.lastAuthAttempt = null;
        console.log('Google Sheets credentials cleared');
    }

    /**
     * Read data from a specific sheet
     */
    async readSheet(sheetName, range = null) {
        try {
            // Use smart authentication to avoid unnecessary popups
            await this.ensureAuthenticated();

            if (!this.spreadsheetId) {
                throw new Error('Spreadsheet ID not configured');
            }

            // Use the sheet name from configuration if it exists
            const actualSheetName = this.sheets[sheetName.toLowerCase()] || sheetName;
            
            // Default range is the entire sheet
            const sheetRange = range || `${actualSheetName}!A:Z`;

            console.log(`📊 Reading data from sheet: ${sheetRange}`);

            const response = await this.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: sheetRange
            });

            const values = response.result.values || [];
            console.log(`📊 Read ${values.length} rows from ${actualSheetName}`);

            return values;

        } catch (error) {
            console.error(`Failed to read sheet ${sheetName}:`, error);
            throw error;
        }
    }

    /**
     * Check if authentication is needed before performing operations
     */
    async checkAuthenticationNeeded() {
        const authStatus = this.isCurrentlyAuthenticated();
        
        if (authStatus === true) {
            return false; // No authentication needed
        }
        
        if (authStatus === 'needs_refresh') {
            console.log('🔄 Token refresh needed');
            return 'refresh';
        }
        
        console.log('🔐 Full authentication needed');
        return true;
    }

    /**
     * Handle upload errors with detailed logging and recovery
     */
    handleUploadError(error, dataType) {
        if (error.status === 403) {
            console.error(`🚫 Permission denied when uploading ${dataType} - possible causes:`);
            console.error('   1. Access token lacks write permissions to Google Sheets');
            console.error('   2. Google Sheet is not shared with the authenticated account');
            console.error('   3. Token was obtained with insufficient scope');
            console.error('💡 Solution: Re-authenticate to get proper write permissions');
            console.error('💡 Check: Ensure the Google Sheet is shared with your account');
            
            // Mark for re-authentication
            this.isAuthenticated = false;
            this.accessToken = null;
            console.log('🔄 Marked for re-authentication due to permission error');
        } else if (error.status === 401) {
            console.error('🔐 Authentication failed - token expired or invalid');
            this.isAuthenticated = false;
            this.accessToken = null;
            localStorage.removeItem('googleSheetsToken');
            console.log('🧹 Cleared expired authentication data');
        } else if (error.status === 404) {
            console.error('📄 Spreadsheet or sheet not found');
            console.error('💡 Check: Verify the spreadsheet ID and sheet name are correct');
        } else if (error.status === 429) {
            console.error('⏱️ Rate limit exceeded - too many requests');
            console.error('💡 Solution: Wait a moment before retrying');
        } else {
            console.error(`🔍 Unexpected error (${error.status}):`, error.result || error.message);
        }
    }

    /**
     * Get detailed authentication status for debugging
     */
    getAuthStatus() {
        const tokenStored = localStorage.getItem('googleSheetsToken');
        let tokenInfo = null;
        
        if (tokenStored) {
            try {
                const tokenData = JSON.parse(tokenStored);
                tokenInfo = {
                    hasAccessToken: !!tokenData.access_token,
                    hasRefreshToken: !!tokenData.refresh_token,
                    accessTokenExpires: tokenData.expires_at ? new Date(tokenData.expires_at).toLocaleString() : 'Unknown',
                    refreshTokenExpires: tokenData.refresh_expires_at ? new Date(tokenData.refresh_expires_at).toLocaleString() : 'Unknown',
                    timeUntilExpiry: tokenData.expires_at ? Math.round((tokenData.expires_at - Date.now()) / 1000 / 60) + ' minutes' : 'Unknown',
                    isAccessTokenValid: tokenData.expires_at ? Date.now() < tokenData.expires_at : false,
                    isRefreshTokenValid: tokenData.refresh_expires_at ? Date.now() < tokenData.refresh_expires_at : false
                };
            } catch (error) {
                tokenInfo = { error: 'Invalid token data in storage' };
            }
        }

        return {
            isInitialized: this.isInitialized,
            isAuthenticated: this.isAuthenticated,
            hasCredentials: !!(this.apiKey && this.clientId && this.spreadsheetId),
            spreadsheetId: this.spreadsheetId,
            environment: this.environment,
            syncDisabled: this.syncDisabled,
            cancelCount: this.cancelCount,
            authenticationCancelled: this.authenticationCancelled,
            lastAuthAttempt: this.lastAuthAttempt ? new Date(this.lastAuthAttempt).toLocaleString() : null,
            tokenInfo
        };
    }

    /**
     * Get status information for debugging (legacy method)
     */
    getStatus() {
        return this.getAuthStatus();
    }

    /**
     * Smart authentication that avoids unnecessary popups
     */
    async ensureAuthenticated() {
        console.log('🔐 Ensuring authentication is valid...');
        
        // First ensure Google API client is initialized
        if (!this.gapi || !this.gapi.client) {
            console.log('🔧 Google API client not initialized, initializing...');
            await this.initializeGoogleAPI();
        }
        
        const authStatus = this.isCurrentlyAuthenticated();
        
        if (authStatus === true) {
            console.log('✅ Already authenticated with valid token');
            // Ensure the client has the access token set
            if (this.gapi && this.gapi.client) {
                // If we don't have the token in memory, load it from localStorage
                if (!this.accessToken) {
                    const tokenStored = localStorage.getItem('googleSheetsToken');
                    if (tokenStored) {
                        try {
                            const tokenData = JSON.parse(tokenStored);
                            if (tokenData.access_token && tokenData.expires_at && Date.now() < tokenData.expires_at) {
                                this.accessToken = tokenData.access_token;
                                this.isAuthenticated = true;
                                console.log('🔄 Restored access token from localStorage');
                            }
                        } catch (error) {
                            console.warn('❌ Failed to restore token from localStorage:', error);
                        }
                    }
                }
                
                if (this.accessToken) {
                    this.gapi.client.setToken({ access_token: this.accessToken });
                    console.log('🔑 Access token applied to Google API client');
                }
            }
            return true;
        }
        
        if (authStatus === 'needs_refresh') {
            console.log('🔄 Attempting token refresh...');
            const tokenStored = localStorage.getItem('googleSheetsToken');
            if (tokenStored) {
                try {
                    const tokenData = JSON.parse(tokenStored);
                    await this.refreshAccessToken(tokenData.refresh_token);
                    console.log('✅ Token refreshed successfully');
                    return true;
                } catch (error) {
                    console.warn('❌ Token refresh failed, will need to re-authenticate:', error);
                    localStorage.removeItem('googleSheetsToken');
                }
            }
        }
        
        console.log('🔐 Full authentication required');
        
        // Check if authentication is already in progress
        if (this.authenticationInProgress) {
            console.log('⏳ Authentication already in progress, waiting...');
            if (this.authenticationPromise) {
                await this.authenticationPromise;
                return true;
            }
        }
        
        await this.authenticate();
        return true;
    }

    /**
     * Force re-authentication to get refresh token
     */
    async forceReAuthentication() {
        console.log('🔄 Forcing re-authentication to obtain refresh token...');
        
        // Clear stored tokens
        localStorage.removeItem('googleSheetsToken');
        this.isAuthenticated = false;
        this.accessToken = null;
        this.authenticationCancelled = false;
        this.lastAuthAttempt = null;
        
        // Force authentication with consent
        await this.authenticate();
    }

    /**
     * Check if current token has write permissions
     */
    async checkWritePermissions() {
        try {
            console.log('🔍 Checking write permissions...');
            
            if (!this.isAuthenticated) {
                console.log('❌ Not authenticated - cannot check permissions');
                return false;
            }

            // Try a simple write operation to test permissions
            const testRange = `${this.sheets.events}!A1:A1`;
            const testValue = [['Permission Test']];
            
            const response = await this.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: testRange,
                valueInputOption: 'RAW',
                resource: { values: testValue }
            });

            if (response.status === 200) {
                console.log('✅ Write permissions confirmed');
                
                // Clean up test value
                await this.gapi.client.sheets.spreadsheets.values.clear({
                    spreadsheetId: this.spreadsheetId,
                    range: testRange
                });
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.log('❌ Write permission check failed:', error);
            
            if (error.status === 403) {
                console.log('🚫 No write permissions - re-authentication needed');
                return false;
            }
            
            throw error;
        }
    }

    /**
     * Fix permission issues by re-authenticating
     */
    async fixPermissions() {
        console.log('🔧 Attempting to fix permission issues...');
        
        try {
            // First check current permissions
            const hasPermissions = await this.checkWritePermissions();
            
            if (hasPermissions) {
                console.log('✅ Permissions are already correct');
                return true;
            }
            
            console.log('🔄 Re-authenticating to get proper permissions...');
            await this.forceReAuthentication();
            
            // Check permissions again
            const newPermissions = await this.checkWritePermissions();
            
            if (newPermissions) {
                console.log('✅ Permissions fixed successfully');
                return true;
            } else {
                console.log('❌ Still no write permissions after re-auth');
                console.log('💡 Check: Ensure the Google Sheet is shared with your account');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Failed to fix permissions:', error);
            return false;
        }
    }
}

// Initialize Google Sheets service
window.GoogleSheetsService = new GoogleSheetsService();

// Add global test function for easy console testing
window.testGoogleSheetsBasic = async function () {
    try {
        console.log('Testing Google Sheets basic connection...');

        // Get credentials from localStorage
        const stored = localStorage.getItem('googleSheetsCredentials');
        if (!stored) {
            console.error('No credentials found in localStorage');
            return { success: false, message: 'No credentials stored' };
        }

        const credentials = JSON.parse(stored);
        console.log('Found credentials:', {
            hasApiKey: !!credentials.apiKey,
            hasClientId: !!credentials.clientId,
            hasSpreadsheetId: !!credentials.spreadsheetId
        });

        // Set credentials in service
        window.GoogleSheetsService.apiKey = credentials.apiKey;
        window.GoogleSheetsService.clientId = credentials.clientId;
        window.GoogleSheetsService.spreadsheetId = credentials.spreadsheetId;

        // Test basic connection
        const result = await window.GoogleSheetsService.testBasicConnection();
        console.log('Test result:', result);

        return result;

    } catch (error) {
        console.error('Test failed:', error);
        return { success: false, message: error.message };
    }
};