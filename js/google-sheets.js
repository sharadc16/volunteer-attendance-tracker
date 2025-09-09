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

            // Load Google API script
            await this.loadGoogleAPI();
            
            // Initialize GAPI
            await this.initializeGAPI();
            
            this.isInitialized = true;
            console.log('Google Sheets service initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Google Sheets service:', error);
            this.showError('Failed to initialize Google Sheets integration');
        }
    }

    /**
     * Load Google API script dynamically
     */
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.gapi) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize Google API client
     */
    async initializeGAPI() {
        return new Promise((resolve, reject) => {
            window.gapi.load('client:auth2', async () => {
                try {
                    // Get API credentials from configuration or prompt user
                    const credentials = await this.getCredentials();
                    
                    await window.gapi.client.init({
                        apiKey: credentials.apiKey,
                        clientId: credentials.clientId,
                        discoveryDocs: [this.discoveryDoc],
                        scope: this.scopes
                    });

                    this.gapi = window.gapi;
                    this.apiKey = credentials.apiKey;
                    this.clientId = credentials.clientId;
                    this.spreadsheetId = credentials.spreadsheetId;

                    // Check if user is already signed in
                    const authInstance = this.gapi.auth2.getAuthInstance();
                    this.isAuthenticated = authInstance.isSignedIn.get();

                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Get API credentials from user or storage
     */
    async getCredentials() {
        // Try to get from localStorage first
        const stored = localStorage.getItem('googleSheetsCredentials');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                console.warn('Invalid stored credentials, will prompt user');
            }
        }

        // Prompt user for credentials
        return await this.promptForCredentials();
    }

    /**
     * Prompt user for Google Sheets credentials
     */
    async promptForCredentials() {
        return new Promise((resolve, reject) => {
            const modal = this.createCredentialsModal();
            document.body.appendChild(modal);

            const form = modal.querySelector('#credentialsForm');
            const cancelBtn = modal.querySelector('#cancelCredentials');

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const credentials = {
                    apiKey: form.apiKey.value.trim(),
                    clientId: form.clientId.value.trim(),
                    spreadsheetId: form.spreadsheetId.value.trim()
                };

                // Validate credentials
                if (!credentials.apiKey || !credentials.clientId || !credentials.spreadsheetId) {
                    alert('Please fill in all fields');
                    return;
                }

                // Store credentials
                localStorage.setItem('googleSheetsCredentials', JSON.stringify(credentials));
                
                // Remove modal
                document.body.removeChild(modal);
                
                resolve(credentials);
            });

            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                reject(new Error('User cancelled credential setup'));
            });
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
                            <label for="apiKey" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">API Key:</label>
                            <input type="text" id="apiKey" name="apiKey" required 
                                   style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                                   placeholder="AIza...">
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label for="clientId" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">OAuth Client ID:</label>
                            <input type="text" id="clientId" name="clientId" required 
                                   style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                                   placeholder="123456789-...googleusercontent.com">
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label for="spreadsheetId" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Google Sheet ID:</label>
                            <input type="text" id="spreadsheetId" name="spreadsheetId" required 
                                   style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                                   placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms">
                            <small style="color: #666;">Copy from the Google Sheet URL between /d/ and /edit</small>
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
     * Authenticate user with Google
     */
    async authenticate() {
        if (!this.isInitialized) {
            throw new Error('Google Sheets service not initialized');
        }

        try {
            const authInstance = this.gapi.auth2.getAuthInstance();
            
            if (!authInstance.isSignedIn.get()) {
                await authInstance.signIn();
            }
            
            this.isAuthenticated = true;
            console.log('Google Sheets authentication successful');
            
            return true;
        } catch (error) {
            console.error('Google Sheets authentication failed:', error);
            throw new Error('Authentication failed: ' + error.message);
        }
    }

    /**
     * Sign out from Google
     */
    async signOut() {
        if (this.isAuthenticated && this.gapi) {
            const authInstance = this.gapi.auth2.getAuthInstance();
            await authInstance.signOut();
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
     * Get sync status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isAuthenticated: this.isAuthenticated,
            hasCredentials: !!(this.apiKey && this.clientId && this.spreadsheetId),
            spreadsheetId: this.spreadsheetId
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