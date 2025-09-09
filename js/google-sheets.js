/**
 * Google Sheets API integration for the Volunteer Attendance Tracker
 * Handles authentication, data sync, and batch operations
 */

class GoogleSheetsService {
    constructor() {
        this.isInitialized = false;
        this.isAuthenticated = false;
        this.gapi = null;
        this.spreadsheetId = null;
        this.apiKey = null;
        this.clientId = null;
        this.discoveryDoc = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
        this.scopes = 'https://www.googleapis.com/auth/spreadsheets';
        
        // Sheet names
        this.sheets = {
            volunteers: 'Volunteers',
            attendance: 'Attendance',
            events: 'Events',
            settings: 'Settings'
        };
        
        this.init();
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
     * Load stored credentials from localStorage
     */
    async loadStoredCredentials() {
        try {
            const stored = localStorage.getItem('googleSheetsCredentials');
            if (stored) {
                const credentials = JSON.parse(stored);
                
                // Update instance variables
                this.apiKey = credentials.apiKey;
                this.clientId = credentials.clientId;
                this.spreadsheetId = credentials.spreadsheetId;
                
                console.log('Loaded stored Google Sheets credentials');
            }
        } catch (error) {
            console.warn('Failed to load stored credentials:', error);
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
     * Initialize Google API client with new Identity Services
     */
    async initializeGAPI() {
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

                    // Initialize OAuth2 for Sheets access
                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: credentials.clientId,
                        scope: this.scopes,
                        callback: this.handleTokenResponse.bind(this)
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
        console.log('Token response received:', response);
        if (response.access_token) {
            this.accessToken = response.access_token;
            this.isAuthenticated = true;
            console.log('OAuth2 authentication successful');
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
        // Try to get from localStorage first
        const stored = localStorage.getItem('googleSheetsCredentials');
        if (stored) {
            try {
                const credentials = JSON.parse(stored);
                
                // Update instance variables
                this.apiKey = credentials.apiKey;
                this.clientId = credentials.clientId;
                this.spreadsheetId = credentials.spreadsheetId;
                
                console.log('Loaded stored credentials successfully');
                return credentials;
            } catch (error) {
                console.warn('Invalid stored credentials, will prompt user');
            }
        }

        // Prompt user for credentials
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

                // Store credentials
                localStorage.setItem('googleSheetsCredentials', JSON.stringify(credentials));
                console.log('Credentials stored successfully');
                
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
                </div>
                <div class="modal-body">
                    <p>To enable Google Sheets integration, you need to set up a Google Cloud project and get API credentials.</p>
                    
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
                            <label for="spreadsheetId">Google Sheet ID:</label>
                            <input type="text" id="spreadsheetId" name="spreadsheetId" required 
                                   placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" autocomplete="off">
                            <small style="color: #666; font-size: 0.8rem; display: block; margin-top: 0.25rem;">
                                Copy from the Google Sheet URL between /d/ and /edit
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

        try {
            // If GAPI isn't loaded yet, load it now
            if (!this.gapi || !this.tokenClient) {
                console.log('Loading Google API for authentication...');
                await this.loadGoogleAPI();
                await this.initializeGAPI();
            }

            // Request OAuth2 token for Sheets access
            return new Promise((resolve, reject) => {
                // Set up callback for this specific request
                this.tokenClient.callback = (response) => {
                    if (response.access_token) {
                        this.accessToken = response.access_token;
                        this.isAuthenticated = true;
                        console.log('Google Sheets authentication successful');
                        resolve(true);
                    } else {
                        console.error('Authentication failed:', response);
                        reject(new Error('Authentication failed: No access token received'));
                    }
                };

                // Request access token
                this.tokenClient.requestAccessToken({
                    prompt: 'consent' // Force consent screen to ensure we get refresh token
                });
            });
            
        } catch (error) {
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
            console.error('Failed to upload volunteers:', error);
            throw error;
        }
    }

    /**
     * Upload attendance data to Google Sheets
     */
    async uploadAttendance(attendanceRecords) {
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
            console.error('Failed to upload attendance:', error);
            throw error;
        }
    }

    /**
     * Upload events data to Google Sheets
     */
    async uploadEvents(events) {
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
            console.error('Failed to upload events:', error);
            throw error;
        }
    }

    /**
     * Perform full sync of all data
     */
    async syncAllData() {
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
        
        return {
            isInitialized: this.isInitialized,
            isAuthenticated: this.isAuthenticated,
            hasCredentials: hasInstanceCredentials || hasStoredCredentials,
            spreadsheetId: this.spreadsheetId || (hasStoredCredentials ? JSON.parse(stored).spreadsheetId : null)
        };
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
        console.log('Google Sheets credentials cleared');
    }
}

// Initialize Google Sheets service
window.GoogleSheetsService = new GoogleSheetsService();

// Add global test function for easy console testing
window.testGoogleSheetsBasic = async function() {
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