/**
 * Settings Page Controller - Simplified Version
 */
class SettingsPage {
  constructor() {
    this.isInitialized = false;
    this.originalSettings = null;
    this.init();
  }

  async init() {
    // Set up automatic cleanup timeout as a safety net
    const cleanupTimeout = setTimeout(() => {
      console.warn('Settings initialization timeout - force hiding loading');
      if (window.Utils && window.Utils.Loading) {
        window.Utils.Loading.forceHide();
      }
    }, 10000); // 10 second safety timeout
    
    try {
      console.log('Initializing Settings Page...');
      
      // Show loading (with fallback)
      if (window.Utils && window.Utils.Loading) {
        Utils.Loading.show('Loading settings...');
      } else {
        console.warn('Utils.Loading not available, using fallback');
      }
      
      // Initialize storage
      await Storage.init();
      
      // Initialize ValidationEngine (with fallback)
      await this.ensureValidationEngineReady();
      
      // Initialize audit logger
      this.initializeAuditLogger();
      
      // Clean up any corrupted storage data
      this.cleanupCorruptedStorage();
      
      // Load saved settings first
      await this.loadSavedSettings();
      
      // Load settings form
      await this.loadSettingsForm();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize sync status
      if (window.SyncStatusUI) {
        window.SyncStatusUI.init();
      }
      
      // Initialize Google Sheets authentication if enabled or if credentials are available
      const shouldInitializeAuth = Config.googleSheets.enabled || await this.hasValidCredentials();
      
      if (shouldInitializeAuth) {
        try {
          await this.initializeGoogleAuth();
        } catch (error) {
          console.warn('Failed to initialize Google auth:', error);
        }
      }
      
      // Clear the safety timeout since we completed successfully
      clearTimeout(cleanupTimeout);
      
      // Hide loading (with fallback)
      if (window.Utils && window.Utils.Loading) {
        Utils.Loading.hide();
      }
      this.isInitialized = true;
      console.log('Settings page initialized successfully');
      
    } catch (error) {
      // Clear the safety timeout
      clearTimeout(cleanupTimeout);
      
      console.error('Failed to initialize settings page:', error);
      if (window.Utils && window.Utils.Notify) {
        Utils.Notify.error('Failed to load settings. Please refresh the page.');
      }
      
      // Use force hide to ensure loading is cleared even on error
      if (window.Utils && window.Utils.Loading) {
        window.Utils.Loading.forceHide();
      }
    }
  }

  /**
   * Initialize audit logger
   */
  initializeAuditLogger() {
    if (!this.auditLogger && window.AuditLogger) {
      this.auditLogger = new window.AuditLogger();
    }
  }

  async initializeGoogleAuth() {
    if (window.AuthManager) {
      const authInitialized = await window.AuthManager.init();
      if (authInitialized && window.AuthManager.isAuthenticatedUser()) {
        if (window.SheetsManager) {
          await window.SheetsManager.init();
          
          // Auto-setup spreadsheet if environment variable is available but not configured
          await this.autoSetupSpreadsheetFromEnvironment();
        }
      }
      
      // Reload the settings form to reflect the correct authentication status
      await this.loadSettingsForm();
    }
  }

  /**
   * Check if valid credentials are available from environment variables
   */
  async hasValidCredentials() {
    try {
      if (!window.CredentialManager) return false;
      
      const credentials = await window.CredentialManager.loadCredentials();
      const validation = window.CredentialManager.validateCredentials(credentials);
      
      return validation.isValid;
    } catch (error) {
      console.warn('Error checking credentials:', error);
      return false;
    }
  }

  /**
   * Automatically setup spreadsheet from environment variables if available
   */
  async autoSetupSpreadsheetFromEnvironment() {
    try {
      // Check if spreadsheet is already configured
      const storedId = window.UIUtils.Storage.get('vat_spreadsheet_id');
      if (storedId) {
        console.log('✅ Settings: Spreadsheet already configured, skipping auto-setup');
        return;
      }

      // Get credentials from CredentialManager
      if (!window.CredentialManager) {
        console.log('⚠️ Settings: CredentialManager not available for auto-setup');
        return;
      }

      const credentials = await window.CredentialManager.loadCredentials();
      const spreadsheetId = credentials?.spreadsheetId;

      if (!spreadsheetId || spreadsheetId === 'YOUR_SPREADSHEET_ID_HERE' || spreadsheetId === '') {
        console.log('ℹ️ Settings: No valid spreadsheet ID in environment variables, skipping auto-setup');
        return;
      }

      console.log('🔄 Settings: Auto-setting up spreadsheet from environment variable:', spreadsheetId.substring(0, 20) + '...');

      // Use SheetsManager to set up the spreadsheet
      if (window.SheetsManager && typeof window.SheetsManager.setSpreadsheetId === 'function') {
        const result = await window.SheetsManager.setSpreadsheetId(spreadsheetId);
        
        if (result && result.success) {
          console.log('✅ Settings: Spreadsheet auto-configured successfully');
          
          // Update the display
          setTimeout(() => {
            this.updateSpreadsheetDisplay();
          }, 100);
          
        } else {
          console.warn('⚠️ Settings: Auto-setup failed:', result?.error || 'Unknown error');
        }
      } else {
        console.warn('⚠️ Settings: SheetsManager.setSpreadsheetId not available');
      }

    } catch (error) {
      console.warn('⚠️ Settings: Error during auto-setup:', error);
    }
  }

  async loadSavedSettings() {
    try {
      console.log('Loading saved settings from storage...');
      
      // Load saved configuration from storage
      const savedConfig = await Storage.getItem('config');
      
      if (savedConfig) {
        console.log('Found saved settings, applying to Config object');
        
        // Update the global Config object with saved settings
        if (savedConfig.scanner) {
          Object.assign(Config.scanner, savedConfig.scanner);
        }
        if (savedConfig.googleSheets) {
          Object.assign(Config.googleSheets, savedConfig.googleSheets);
        }
        if (savedConfig.sync) {
          Object.assign(Config.sync, savedConfig.sync);
        }
        if (savedConfig.ui) {
          Object.assign(Config.ui, savedConfig.ui);
        }
        
        console.log('Settings loaded successfully:', {
          scanner: Config.scanner.enabled,
          googleSheets: Config.googleSheets.enabled,
          sync: Config.sync.enabled
        });
      } else {
        console.log('No saved settings found, checking for auto-restoration...');
        await this.autoRestoreConfiguration();
      }
      
      // Always check if Google Sheets should be auto-enabled based on available credentials
      await this.autoEnableGoogleSheetsIfReady();
      
      // Note: No longer syncing to Config.scanner.validationMode
      // ValidationEngine is now the single source of truth
      
    } catch (error) {
      console.error('Error loading saved settings:', error);
      // Continue with default settings if loading fails
    }
  }

  /**
   * Get current validation mode from ValidationEngine (single source of truth)
   */
  async ensureValidationEngineReady() {
    // Wait for ValidationEngine to be available with retries
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      if (window.ValidationEngine && typeof window.ValidationEngine.init === 'function') {
        try {
          if (!window.ValidationEngine.isInitialized) {
            await window.ValidationEngine.init();
          }
          console.log('✅ ValidationEngine ready for settings');
          return true;
        } catch (error) {
          console.warn(`⚠️ ValidationEngine init attempt ${attempts + 1} failed:`, error);
        }
      } else {
        console.log(`⏳ Waiting for ValidationEngine... attempt ${attempts + 1}/${maxAttempts}`);
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between attempts
      }
    }
    
    console.warn('⚠️ ValidationEngine not available after all attempts, using fallback mode');
    return false;
  }

  getValidationMode() {
    // ONLY use ValidationEngine (single source of truth)
    if (window.ValidationEngine && window.ValidationEngine.isInitialized) {
      return window.ValidationEngine.getMode();
    }
    // Return strict as safe default if ValidationEngine not ready
    return 'strict';
  }

  async loadSettingsForm() {
    // Debug: Log current validation mode before rendering
    const currentMode = this.getValidationMode();
    console.log('🔍 Settings form loading - current validation mode:', currentMode);
    console.log('🔍 ValidationEngine is single source of truth');
    console.log('🔍 ValidationEngine mode:', window.ValidationEngine?.getMode());
    
    // Load current Google Sheets credentials
    const credentials = window.EnvironmentManager ? 
      await window.EnvironmentManager.loadEnvironment() : 
      { apiKey: '', clientId: '' };
    const isUsingEnvCredentials = window.EnvironmentManager ? 
      window.EnvironmentManager.isUsingEnvironmentCredentials() : 
      true;
    const authStatus = window.AuthManager ? 
      window.AuthManager.isAuthenticatedUser() : 
      false;

    // Auto-enable Google Sheets if credentials are available and authenticated
    const shouldEnableGoogleSheets = authStatus && (credentials.apiKey || credentials.clientId);
    if (shouldEnableGoogleSheets && !Config.googleSheets.enabled) {
      Config.googleSheets.enabled = true;
      console.log('Auto-enabled Google Sheets based on authentication status');
    }

    // Store original settings for comparison
    this.originalSettings = JSON.parse(JSON.stringify(Config));

    const settingsForm = `
      <div class="view-header">
        <h2>Settings</h2>
        <div class="view-header-actions">
          <button type="button" class="btn btn-small btn-secondary" onclick="settingsPage.expandAllSections()">
            📂 Expand All
          </button>
          <button type="button" class="btn btn-small btn-secondary" onclick="settingsPage.collapseAllSections()">
            📁 Collapse All
          </button>
        </div>
      </div>
      <div class="settings-sections">
        <div class="setting-section">
          <div class="setting-section-header" onclick="settingsPage.toggleSection('scanner')">
            <h3>Scanner Settings</h3>
            <span class="section-toggle">▶</span>
          </div>
          <div class="setting-section-content collapsed" id="scanner-content">
          <div class="setting-group">
            <label class="setting-item">
              <input type="checkbox" id="scannerEnabled" ${Config.scanner.enabled ? 'checked' : ''}>
              <span>Enable scanner</span>
            </label>
            <label class="setting-item">
              <input type="checkbox" id="autoFocus" ${Config.scanner.autoFocus ? 'checked' : ''}>
              <span>Auto-focus scanner input</span>
            </label>
            <label class="setting-item">
              <span>Scanner prefix:</span>
              <input type="text" id="scannerPrefix" value="${Config.scanner.prefix}" placeholder="Optional prefix">
            </label>
            <label class="setting-item">
              <span>Scanner suffix:</span>
              <input type="text" id="scannerSuffix" value="${Config.scanner.suffix}" placeholder="Optional suffix">
            </label>
          </div>
          
          <div class="setting-group">
            <div class="setting-header">
              <h4>Validation Mode</h4>
              <div class="tooltip">
                <span class="help-icon">❓</span>
                <div class="tooltip-text">
                  <strong>Validation Mode Guide:</strong><br>
                  Choose how the scanner handles volunteer IDs. This affects data accuracy, security, and workflow efficiency. 
                  You can change modes at any time based on your event needs.
                </div>
              </div>
            </div>
            <div class="validation-mode-selector">
              <label class="radio-option ${this.getValidationMode() === 'strict' ? 'selected' : ''}">
                <input type="radio" name="validationMode" value="strict" 
                       ${this.getValidationMode() === 'strict' ? 'checked' : ''}>
                <div class="radio-content">
                  <div class="radio-header">
                    <span class="radio-icon">🔒</span>
                    <strong>Strict Validation</strong>
                    <span class="mode-badge recommended">Recommended</span>
                    <div class="tooltip">
                      <span class="help-icon">ℹ️</span>
                      <div class="tooltip-text">
                        <strong>Summary:</strong> Only registered volunteers • Highest security<br><br>
                        <strong>Best for:</strong> Regular events with pre-registered volunteers, security-sensitive environments, 
                        events with limited capacity.<br><br>
                        <strong>How it works:</strong> Only accepts IDs that match existing volunteer records. 
                        Unknown IDs are rejected with an error message.<br><br>
                        <strong>Data Quality:</strong> Highest accuracy and security.
                      </div>
                    </div>
                  </div>
                  <small class="radio-description">Only registered volunteers • Highest security</small>
                </div>
              </label>
              
              <label class="radio-option ${this.getValidationMode() === 'create-if-not-found' ? 'selected' : ''}">
                <input type="radio" name="validationMode" value="create-if-not-found"
                       ${this.getValidationMode() === 'create-if-not-found' ? 'checked' : ''}>
                <div class="radio-content">
                  <div class="radio-header">
                    <span class="radio-icon">➕</span>
                    <strong>Create If Not Found</strong>
                    <span class="mode-badge flexible">Flexible</span>
                    <div class="tooltip">
                      <span class="help-icon">ℹ️</span>
                      <div class="tooltip-text">
                        <strong>Summary:</strong> Auto-register new volunteers • Balanced approach<br><br>
                        <strong>Best for:</strong> Community events with walk-ins, building volunteer database over time, 
                        mixed events with both registered and new volunteers.<br><br>
                        <strong>How it works:</strong> Checks for existing volunteers first. If not found, 
                        shows a quick registration form to create new volunteer records.<br><br>
                        <strong>Data Quality:</strong> Good accuracy with validation status tracking.
                      </div>
                    </div>
                  </div>
                  <small class="radio-description">Auto-register new volunteers • Balanced approach</small>
                </div>
              </label>
              
              <label class="radio-option ${this.getValidationMode() === 'no-validation' ? 'selected' : ''}">
                <input type="radio" name="validationMode" value="no-validation"
                       ${this.getValidationMode() === 'no-validation' ? 'checked' : ''}>
                <div class="radio-content">
                  <div class="radio-header">
                    <span class="radio-icon">⚠️</span>
                    <strong>No Validation</strong>
                    <span class="mode-badge caution">Use with Caution</span>
                    <div class="tooltip">
                      <span class="help-icon">⚠️</span>
                      <div class="tooltip-text">
                        <strong>Summary:</strong> Accept any ID • Emergency use only<br><br>
                        <strong>Best for:</strong> Emergency situations, system failures, testing purposes, 
                        temporary events with unknown participants.<br><br>
                        <strong>How it works:</strong> Accepts any scanned ID without verification. 
                        Creates temporary attendance records.<br><br>
                        <strong>Data Quality:</strong> No validation - requires manual cleanup afterward.
                      </div>
                    </div>
                  </div>
                  <small class="radio-description">Accept any ID • Emergency use only</small>
                </div>
              </label>
            </div>
            
            <div class="validation-mode-help enhanced">
              <div class="help-section-header">
                <strong>📋 Quick Reference:</strong>
              </div>
              <div class="help-grid">
                <div class="help-item">
                  <strong>🏢 Corporate Events:</strong> Use Strict Mode with pre-registered lists
                </div>
                <div class="help-item">
                  <strong>🎪 Community Events:</strong> Use Create Mode for walk-in volunteers
                </div>
                <div class="help-item">
                  <strong>🚨 Emergencies:</strong> Use No Validation temporarily, clean up later
                </div>
              </div>
              <div class="help-actions">
                <button type="button" class="btn btn-link" onclick="settingsPage.showValidationHelp()">
                  📚 View Complete Guide
                </button>
                <button type="button" class="btn btn-link" onclick="settingsPage.showTroubleshooting()">
                  🔧 Troubleshooting
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
        
        <div class="setting-section">
          <div class="setting-section-header" onclick="settingsPage.toggleSection('googlesheets')">
            <h3>Google Sheets Sync</h3>
            <span class="section-toggle">▶</span>
          </div>
          <div class="setting-section-content collapsed" id="googlesheets-content">
          <div class="setting-group">
            <label class="setting-item">
              <input type="checkbox" id="googleSheetsEnabled" ${Config.googleSheets.enabled ? 'checked' : ''}>
              <span>Enable Google Sheets synchronization</span>
            </label>
            

            
            <div class="google-sheets-config" id="googleSheetsConfig" style="display: ${Config.googleSheets.enabled ? 'block' : 'none'};">
              <div class="credential-status">
                <div class="status-indicator ${authStatus ? 'authenticated' : 'not-authenticated'}">
                  <span class="status-dot"></span>
                  <span class="status-text">${authStatus ? 'Authenticated' : 'Not Authenticated'}</span>
                </div>
                ${isUsingEnvCredentials ? 
                  '<small class="credential-source">Using environment credentials</small>' : 
                  '<small class="credential-source">Using manual credentials</small>'
                }
              </div>
              
              <div class="credential-override">
                <h4>API Credentials</h4>
                <small class="help-text">Leave blank to use environment variables</small>
                
                <label class="setting-item">
                  <span>Google API Key:</span>
                  <div class="input-with-button">
                    <input type="password" id="googleApiKey" 
                           value="${!isUsingEnvCredentials ? (credentials.apiKey || '') : ''}" 
                           placeholder="AIza...">
                    <button type="button" class="btn-icon" onclick="settingsPage.togglePasswordVisibility('googleApiKey')" title="Show/Hide">👁️</button>
                  </div>
                </label>
                
                <label class="setting-item">
                  <span>Google Client ID:</span>
                  <div class="input-with-button">
                    <input type="password" id="googleClientId" 
                           value="${!isUsingEnvCredentials ? (credentials.clientId || '') : ''}" 
                           placeholder="...googleusercontent.com">
                    <button type="button" class="btn-icon" onclick="settingsPage.togglePasswordVisibility('googleClientId')" title="Show/Hide">👁️</button>
                  </div>
                </label>
                
                <div class="credential-actions">
                  <button type="button" class="btn btn-small btn-secondary" onclick="settingsPage.testGoogleCredentials()">🔍 Test Credentials</button>
                  <button type="button" class="btn btn-small btn-secondary" onclick="settingsPage.clearGoogleCredentials()">🗑️ Clear Override</button>
                  ${authStatus ? 
                    '<button type="button" class="btn btn-small btn-warning" onclick="settingsPage.signOutGoogle()">🚪 Sign Out</button>' :
                    '<button type="button" class="btn btn-small btn-primary" onclick="settingsPage.authenticateGoogle()">🔐 Authenticate</button>'
                  }
                </div>
              </div>
              
              <div class="spreadsheet-management">
                <h4>Spreadsheet Configuration</h4>
                <div id="spreadsheetStatus" class="spreadsheet-status">
                  <!-- Will be populated by updateSpreadsheetDisplay() -->
                </div>
                
                <div class="spreadsheet-actions">
                  <div class="setting-item">
                    <label for="spreadsheetInput">Spreadsheet Setup:</label>
                    <div class="input-with-button">
                      <input type="text" id="spreadsheetInput" 
                             value="${credentials.spreadsheetId || ''}"
                             placeholder="Enter Spreadsheet ID or URL" 
                             style="font-family: monospace;">
                      <button type="button" class="btn btn-small btn-primary" onclick="settingsPage.setupSpreadsheet()">Setup</button>
                    </div>
                    <small class="help-text">Enter a Google Spreadsheet ID/URL, or leave blank to create a new one${credentials.spreadsheetId ? ' (showing environment variable)' : ''}</small>
                  </div>
                  
                  <div class="setting-item">
                    <div class="spreadsheet-quick-actions">
                      <button type="button" class="btn btn-small btn-secondary" onclick="settingsPage.createNewSpreadsheet()">
                        ➕ Create New
                      </button>
                      <button type="button" class="btn btn-small btn-secondary" onclick="settingsPage.validateCurrentSpreadsheet()">
                        🔍 Validate Current
                      </button>
                      <button type="button" class="btn btn-small btn-warning" onclick="settingsPage.removeSpreadsheet()">
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="sync-troubleshooting">
                <h4>Sync Troubleshooting</h4>
                <div class="setting-item">
                  <span>If sync is not working properly:</span>
                  <button type="button" class="btn btn-small btn-warning" onclick="settingsPage.resetSyncTimestamps()">
                    🔄 Reset Sync Timestamps
                  </button>
                  <small class="help-text">Forces a full sync on the next sync operation</small>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
        
        <div class="setting-section">
          <div class="setting-section-header" onclick="settingsPage.toggleSection('sync')">
            <h3>Sync Settings</h3>
            <span class="section-toggle">▶</span>
          </div>
          <div class="setting-section-content collapsed" id="sync-content">
          <div class="setting-group">
            <label class="setting-item">
              <input type="checkbox" id="syncEnabled" ${Config.sync.enabled ? 'checked' : ''}>
              <span>Enable data sync</span>
            </label>
            <label class="setting-item">
              <span>Periodic sync interval (seconds):</span>
              <input type="number" id="syncInterval" value="${Config.sync.interval / 1000}" min="120" max="600">
              <div class="field-feedback">
                <small>Full sync interval: 180-300 seconds (3-5 minutes) for complete data synchronization</small>
              </div>
            </label>
            <label class="setting-item">
              <span>Delta sync interval (seconds):</span>
              <input type="number" id="deltaSyncInterval" value="${Config.sync.deltaInterval / 1000}" min="10" max="120">
              <div class="field-feedback">
                <small>Quick sync for changes: 10-60 seconds (immediate sync after attendance scanning)</small>
              </div>
            </label>
          </div>
          </div>
        </div>
        
        <div class="setting-section">
          <div class="setting-section-header" onclick="settingsPage.toggleSection('display')">
            <h3>Display Settings</h3>
            <span class="section-toggle">▶</span>
          </div>
          <div class="setting-section-content collapsed" id="display-content">
          <div class="setting-group">
            <label class="setting-item">
              <span>Recent check-ins to show:</span>
              <input type="number" id="recentLimit" value="${Config.ui.recentAttendanceLimit}" min="5" max="50">
            </label>
            <label class="setting-item">
              <span>Auto-refresh interval (seconds):</span>
              <input type="number" id="autoRefresh" value="${Config.ui.autoRefreshInterval / 1000}" min="10" max="300">
            </label>
          </div>
          </div>
        </div>
        
        <div class="setting-section">
          <div class="setting-section-header" onclick="settingsPage.toggleSection('config')">
            <h3>Configuration Management</h3>
            <span class="section-toggle">▶</span>
          </div>
          <div class="setting-section-content collapsed" id="config-content">
          <div class="setting-group">
            <div class="setting-buttons">
              <button type="button" class="btn btn-secondary" onclick="settingsPage.exportConfiguration()">📤 Export Settings</button>
              <button type="button" class="btn btn-secondary" onclick="settingsPage.importConfiguration()">📥 Import Settings</button>
              <button type="button" class="btn btn-secondary" onclick="settingsPage.showConfigurationBackups()">🗂️ View Backups</button>
              <button type="button" class="btn btn-warning" onclick="settingsPage.resetConfiguration()">🔄 Reset to Defaults</button>
            </div>
            <small class="help-text">Backups are created automatically before major changes</small>
          </div>
          </div>
        </div>
        
        <div class="setting-section">
          <div class="setting-section-header" onclick="settingsPage.toggleSection('audit')">
            <h3>Audit Log</h3>
            <span class="section-toggle">▶</span>
          </div>
          <div class="setting-section-content collapsed" id="audit-content">
          <div class="setting-group">
            <div class="audit-log-summary" id="auditLogSummary">
              <!-- Will be populated by updateAuditLogSummary() -->
            </div>
            <div class="setting-buttons">
              <button type="button" class="btn btn-secondary" onclick="settingsPage.viewAuditLog()">📋 View Audit Log</button>
              <button type="button" class="btn btn-secondary" onclick="settingsPage.exportAuditLog()">📤 Export Audit Log</button>
              <button type="button" class="btn btn-warning" onclick="settingsPage.clearAuditLog()">🗑️ Clear Audit Log</button>
            </div>
            <small class="help-text">Audit log tracks validation mode changes and system configuration modifications for troubleshooting and compliance.</small>
          </div>
          </div>
        </div>
        
        <div class="setting-section">
          <div class="setting-section-header" onclick="settingsPage.toggleSection('admin')">
            <h3>System Administration</h3>
            <span class="section-toggle">▶</span>
          </div>
          <div class="setting-section-content collapsed" id="admin-content">
            <div class="setting-group">
              <div class="setting-subsection">
                <h4>User Roles</h4>
                <div class="current-user-role">
                  <div class="role-display" id="currentUserRole">
                    <span class="role-badge admin">Administrator</span>
                    <small class="role-description">Full access to all system features</small>
                  </div>
                </div>
                
                <div class="role-definitions">
                  <h5>Role Definitions</h5>
                  <div class="role-list">
                    <div class="role-item">
                      <span class="role-name">Administrator</span>
                      <span class="role-permissions">Full system access, user management, settings configuration</span>
                    </div>
                    <div class="role-item">
                      <span class="role-name">Coordinator</span>
                      <span class="role-permissions">Event management, volunteer management, reports access</span>
                    </div>
                    <div class="role-item">
                      <span class="role-name">Scanner Operator</span>
                      <span class="role-permissions">Scanner access, basic volunteer lookup, limited reports</span>
                    </div>
                    <div class="role-item">
                      <span class="role-name">Viewer</span>
                      <span class="role-permissions">Read-only access to reports and volunteer lists</span>
                    </div>
                  </div>
                </div>
                
                <div class="role-assignment">
                  <h5>Role Assignment</h5>
                  <div class="assignment-form">
                    <div class="form-group">
                      <label for="userEmail">User Email</label>
                      <input type="email" id="userEmail" placeholder="user@example.com">
                    </div>
                    <div class="form-group">
                      <label for="assignRole">Assign Role</label>
                      <select id="assignRole">
                        <option value="viewer">Viewer</option>
                        <option value="scanner">Scanner Operator</option>
                        <option value="coordinator">Coordinator</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <button type="button" class="btn btn-primary" onclick="settingsPage.assignUserRole()">Assign Role</button>
                  </div>
                </div>
                
                <div class="current-assignments">
                  <h5>Current Role Assignments</h5>
                  <div class="assignments-list" id="roleAssignmentsList">
                    <div class="loading">Loading role assignments...</div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
        
        <div class="setting-section">
          <div class="setting-section-header" onclick="settingsPage.toggleSection('data')">
            <h3>Data Management</h3>
            <span class="section-toggle">▶</span>
          </div>
          <div class="setting-section-content collapsed" id="data-content">
            <div class="setting-group">
              <div class="setting-buttons">
                <button type="button" class="btn btn-secondary" onclick="DataManager.exportAllData()">📤 Export All Data</button>
                <button type="button" class="btn btn-secondary" onclick="DataManager.importData()">📥 Import Data</button>
                <button type="button" class="btn btn-warning" onclick="DataManager.clearAllData()">🗑️ Clear All Data</button>
              </div>
              <div class="setting-buttons">
                <button type="button" class="btn btn-primary" onclick="DataManager.resetAndSyncFromSheets()">🔄 Reset & Sync from Sheets</button>
              </div>
              <small class="help-text">Use with caution - data operations cannot be undone</small>
            </div>
          </div>
        </div>
      </div>
      
      <div class="settings-actions">
        <button type="button" class="btn btn-primary" onclick="settingsPage.saveSettings()">💾 Save Settings</button>
        <button type="button" class="btn btn-secondary" onclick="settingsPage.resetSettings()">🔄 Reset</button>
        <button type="button" class="btn btn-secondary" onclick="settingsPage.cancelSettings()">❌ Cancel</button>
      </div>
    `;

    // Insert the form into the page
    const container = document.getElementById('settingsForm') || document.getElementById('settingsContainer') || document.querySelector('.settings-container') || document.body;
    container.innerHTML = settingsForm;

    // Initialize shared components after form is loaded
    setTimeout(() => {
      this.initializeSharedComponents();
      
      // Update displays
      this.updateSpreadsheetDisplay();
      this.updateAuditLogSummary();
      
      // Load role assignments
      this.loadRoleAssignments();
    }, 100);
  }

  // Initialize shared components
  initializeSharedComponents() {
    // Initialize header and navigation with shared components
    if (window.HeaderComponent) {
      window.HeaderComponent.replace('Gurukul - Settings');
    }

    if (window.NavigationComponent) {
      window.NavigationComponent.replace('settings');
    }

    // Setup modal handlers
    this.setupModalHandlers();
    
    // Note: Sync button is now handled by NavigationComponent
  }

  // Data management methods - delegated to centralized DataManager
  async exportAllData() {
    return await window.DataManager.exportAllData();
  }

  async importData() {
    return await window.DataManager.importData();
  }

  async clearAllData() {
    return await window.DataManager.clearAllData();
  }

  async resetAndSyncFromSheets() {
    return await window.DataManager.resetAndSyncFromSheets();
  }

  // User role management methods
  async loadRoleAssignments() {
    try {
      // In a real system, this would load from a backend
      const assignments = JSON.parse(localStorage.getItem('roleAssignments') || '[]');
      const assignmentsList = document.getElementById('roleAssignmentsList');
      
      if (!assignmentsList) return;
      
      if (assignments.length === 0) {
        assignmentsList.innerHTML = '<div class="empty-state">No role assignments yet</div>';
        return;
      }
      
      const html = assignments.map(assignment => `
        <div class="assignment-item">
          <div class="assignment-info">
            <span class="assignment-email">${assignment.email}</span>
            <span class="assignment-role ${assignment.role}">${assignment.role}</span>
          </div>
          <div class="assignment-actions">
            <button class="btn btn-small btn-secondary" onclick="settingsPage.editRoleAssignment('${assignment.email}')">Edit</button>
            <button class="btn btn-small btn-warning" onclick="settingsPage.removeRoleAssignment('${assignment.email}')">Remove</button>
          </div>
        </div>
      `).join('');
      
      assignmentsList.innerHTML = html;
      
    } catch (error) {
      console.error('Error loading role assignments:', error);
    }
  }

  async assignUserRole() {
    try {
      const email = document.getElementById('userEmail')?.value.trim();
      const role = document.getElementById('assignRole')?.value;
      
      if (!email || !role) {
        Utils.Notify.error('Please enter email and select role');
        return;
      }
      
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Utils.Notify.error('Please enter a valid email address');
        return;
      }
      
      // Get existing assignments
      const assignments = JSON.parse(localStorage.getItem('roleAssignments') || '[]');
      
      // Check if user already has a role
      const existingIndex = assignments.findIndex(a => a.email === email);
      
      if (existingIndex >= 0) {
        // Update existing assignment
        assignments[existingIndex] = {
          email,
          role,
          assignedAt: new Date().toISOString(),
          assignedBy: 'current-user' // In a real system, this would be the current user
        };
      } else {
        // Add new assignment
        assignments.push({
          email,
          role,
          assignedAt: new Date().toISOString(),
          assignedBy: 'current-user'
        });
      }
      
      // Save assignments
      localStorage.setItem('roleAssignments', JSON.stringify(assignments));
      
      // Clear form
      document.getElementById('userEmail').value = '';
      document.getElementById('assignRole').value = 'viewer';
      
      Utils.Notify.success(`Role ${role} assigned to ${email}`);
      
      // Refresh assignments list
      await this.loadRoleAssignments();
      
    } catch (error) {
      Utils.Notify.error('Failed to assign role: ' + error.message);
    }
  }

  async editRoleAssignment(email) {
    try {
      const assignments = JSON.parse(localStorage.getItem('roleAssignments') || '[]');
      const assignment = assignments.find(a => a.email === email);
      
      if (!assignment) {
        Utils.Notify.error('Assignment not found');
        return;
      }
      
      // Pre-fill the form
      document.getElementById('userEmail').value = email;
      document.getElementById('assignRole').value = assignment.role;
      
      Utils.Notify.info('Edit the role and click Assign Role to update');
      
    } catch (error) {
      Utils.Notify.error('Failed to edit assignment: ' + error.message);
    }
  }

  async removeRoleAssignment(email) {
    try {
      if (!confirm(`Remove role assignment for ${email}?`)) {
        return;
      }
      
      const assignments = JSON.parse(localStorage.getItem('roleAssignments') || '[]');
      const filtered = assignments.filter(a => a.email !== email);
      
      localStorage.setItem('roleAssignments', JSON.stringify(filtered));
      
      Utils.Notify.success(`Role assignment removed for ${email}`);
      
      // Refresh assignments list
      await this.loadRoleAssignments();
      
    } catch (error) {
      Utils.Notify.error('Failed to remove assignment: ' + error.message);
    }
  }

  // Setup event listeners for form elements
  setupEventListeners() {
    // Setup event listeners for settings form
    console.log('Setting up event listeners...');
    
    // Validation Mode radio buttons - UNIFIED HANDLER
    const validationModeRadios = document.querySelectorAll('input[name="validationMode"]');
    validationModeRadios.forEach(radio => {
      radio.addEventListener('change', async (e) => {
        if (e.target.checked) {
          const newMode = e.target.value;
          console.log(`🔄 Validation mode changed to: ${newMode}`);
          
          try {
            // ONLY use ValidationEngine (single source of truth)
            if (window.ValidationEngine && window.ValidationEngine.isInitialized) {
              await window.ValidationEngine.setMode(newMode);
              console.log(`✅ ValidationEngine mode updated to: ${newMode}`);
            } else {
              console.error('❌ ValidationEngine not available - cannot change validation mode');
              throw new Error('ValidationEngine not initialized');
            }
            
            // Update UI indicators
            this.updateValidationModeDisplay(newMode);
            
            // Show success feedback with more details
            const displayName = this.getValidationModeDisplayName(newMode);
            Utils.Notify.success(`✅ Validation mode changed to: ${displayName}`);
            
            // Add visual feedback to the radio button
            setTimeout(() => {
              const selectedRadio = document.querySelector(`input[name="validationMode"][value="${newMode}"]`);
              if (selectedRadio) {
                const label = selectedRadio.closest('label');
                if (label) {
                  label.style.backgroundColor = '#d4edda';
                  label.style.borderColor = '#c3e6cb';
                  setTimeout(() => {
                    label.style.backgroundColor = '';
                    label.style.borderColor = '';
                  }, 2000);
                }
              }
            }, 100);
            
          } catch (error) {
            console.error('Failed to update validation mode:', error);
            Utils.Notify.error('❌ Failed to update validation mode: ' + error.message);
            
            // Revert radio button selection
            const currentMode = this.getValidationMode();
            const currentRadio = document.querySelector(`input[name="validationMode"][value="${currentMode}"]`);
            if (currentRadio) {
              currentRadio.checked = true;
            }
          }
        }
      });
    });
    
    // Sync enabled toggle
    const syncEnabled = document.getElementById('syncEnabled');
    if (syncEnabled) {
      // Add change event listener
      syncEnabled.addEventListener('change', (e) => {
        // Update config
        Config.sync.enabled = e.target.checked;
        
        console.log(`🔄 Sync enabled changed to: ${e.target.checked}`);
        
        // Save the setting
        this.saveSettingsToStorage();
        
        // Update unified sync manager
        if (window.UnifiedSyncManager) {
          window.UnifiedSyncManager.updateSyncStatus();
        }
      });
    }

    // Google Sheets toggle
    const googleSheetsEnabled = document.getElementById('googleSheetsEnabled');
    const googleSheetsConfig = document.getElementById('googleSheetsConfig');
    
    if (googleSheetsEnabled && googleSheetsConfig) {
      // Set initial display state based on checkbox
      googleSheetsConfig.style.display = googleSheetsEnabled.checked ? 'block' : 'none';
      
      // Add change event listener
      googleSheetsEnabled.addEventListener('change', (e) => {
        googleSheetsConfig.style.display = e.target.checked ? 'block' : 'none';
        
        // Update config
        Config.googleSheets.enabled = e.target.checked;
        
        console.log(`🔄 Google Sheets enabled changed to: ${e.target.checked}`);
        
        // Save the setting
        this.saveSettingsToStorage();
        
        // Update unified sync manager
        if (window.UnifiedSyncManager) {
          window.UnifiedSyncManager.updateSyncStatus();
        }
      });
    }
  }

  setupModalHandlers() {
    // Setup modal handlers
    console.log('Setting up modal handlers...');
  }

  /**
   * Get display name for validation mode
   */
  getValidationModeDisplayName(mode) {
    const displayNames = {
      'strict': 'Strict Validation',
      'no-validation': 'No Validation',
      'create-if-not-found': 'Create If Not Found'
    };
    return displayNames[mode] || mode;
  }

  /**
   * Update validation mode display elements
   */
  updateValidationModeDisplay(newMode) {
    // Update radio button labels to show selected state
    const radioOptions = document.querySelectorAll('.validation-mode-selector .radio-option');
    radioOptions.forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio) {
        if (radio.value === newMode) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
      }
    });

    // Emit event for other components to update
    Utils.Event.emit('validationModeChanged', {
      newMode,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current form data
   */
  getFormData() {
    const formData = {};
    
    try {
      // Get sync enabled
      const syncEnabled = document.getElementById('syncEnabled');
      if (syncEnabled) {
        formData.syncEnabled = syncEnabled.checked;
      }
      
      // Get Google Sheets enabled
      const googleSheetsEnabled = document.getElementById('googleSheetsEnabled');
      if (googleSheetsEnabled) {
        formData.googleSheetsEnabled = googleSheetsEnabled.checked;
      }
      
      // Get validation mode
      const validationModeRadio = document.querySelector('input[name="validationMode"]:checked');
      if (validationModeRadio) {
        formData.validationMode = validationModeRadio.value;
      }
      
      console.log('📋 Form data extracted:', formData);
      
    } catch (error) {
      console.error('Error extracting form data:', error);
    }
    
    return formData;
  }

  /**
   * Update settings display after save
   */
  updateSettingsDisplay() {
    try {
      // Update validation mode display
      const currentMode = this.getValidationMode();
      this.updateValidationModeDisplay(currentMode);
      
      // Update any other UI elements that show current settings
      console.log('🔄 Settings display updated');
      
    } catch (error) {
      console.error('Error updating settings display:', error);
    }
  }

  async saveSettingsToStorage() {
    try {
      // Save current config to storage
      await Storage.setItem('config', {
        scanner: Config.scanner,
        googleSheets: Config.googleSheets,
        sync: Config.sync,
        ui: Config.ui
      });
      console.log('Settings saved to storage');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Auto-restore configuration from environment variables and credentials
   */
  async autoRestoreConfiguration() {
    try {
      console.log('🔄 Auto-restoring configuration from available sources...');
      
      let configChanged = false;
      
      // Check if credentials are available
      if (window.CredentialManager) {
        const credentials = await window.CredentialManager.loadCredentials();
        
        if (credentials.apiKey && credentials.clientId) {
          console.log('✅ Found Google Sheets credentials, enabling Google Sheets sync');
          Config.googleSheets.enabled = true;
          configChanged = true;
        }
      }
      
      // Enable sync by default if Google Sheets is enabled
      if (Config.googleSheets.enabled && !Config.sync.enabled) {
        console.log('✅ Enabling sync since Google Sheets is available');
        Config.sync.enabled = true;
        configChanged = true;
      }
      
      // Save restored configuration
      if (configChanged) {
        await this.saveSettingsToStorage();
        console.log('✅ Configuration auto-restored and saved');
      }
      
    } catch (error) {
      console.warn('⚠️ Auto-restoration failed:', error);
    }
  }

  /**
   * Auto-enable Google Sheets if credentials are available and authentication is ready
   */
  async autoEnableGoogleSheetsIfReady() {
    try {
      // Skip if already enabled
      if (Config.googleSheets.enabled) {
        return;
      }
      
      console.log('🔍 Checking if Google Sheets should be auto-enabled...');
      
      // Check if credentials are available
      if (!window.CredentialManager) {
        return;
      }
      
      const credentials = await window.CredentialManager.loadCredentials();
      if (!credentials.apiKey || !credentials.clientId) {
        console.log('ℹ️ No Google Sheets credentials available');
        return;
      }
      
      // Check if authentication is working
      if (window.AuthManager) {
        const isAuthenticated = window.AuthManager.isAuthenticatedUser();
        if (isAuthenticated) {
          console.log('✅ Google Sheets credentials and authentication available, auto-enabling');
          Config.googleSheets.enabled = true;
          Config.sync.enabled = true;
          await this.saveSettingsToStorage();
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Auto-enable check failed:', error);
    }
  }



  updateSpreadsheetDisplay() {
    // Update spreadsheet display
    const statusContainer = document.getElementById('spreadsheetStatus');
    if (!statusContainer) return;
    
    try {
      const spreadsheetId = window.UIUtils?.Storage?.get('vat_spreadsheet_id');
      const isAuthenticated = window.AuthManager?.isAuthenticatedUser() || false;
      
      if (spreadsheetId && isAuthenticated) {
        statusContainer.innerHTML = `
          <div class="spreadsheet-info">
            <div class="spreadsheet-status-item">
              <span class="status-label">Status:</span>
              <span class="status-value connected">✅ Connected</span>
            </div>
            <div class="spreadsheet-status-item">
              <span class="status-label">Spreadsheet ID:</span>
              <span class="status-value">${spreadsheetId.substring(0, 20)}...</span>
            </div>
            <div class="spreadsheet-actions">
              <a href="https://docs.google.com/spreadsheets/d/${spreadsheetId}" target="_blank" class="btn btn-small btn-secondary">
                📊 Open Spreadsheet
              </a>
            </div>
          </div>
        `;
      } else if (spreadsheetId && !isAuthenticated) {
        statusContainer.innerHTML = `
          <div class="spreadsheet-info">
            <div class="spreadsheet-status-item">
              <span class="status-label">Status:</span>
              <span class="status-value warning">⚠️ Not Authenticated</span>
            </div>
            <div class="spreadsheet-status-item">
              <span class="status-label">Spreadsheet ID:</span>
              <span class="status-value">${spreadsheetId.substring(0, 20)}...</span>
            </div>
          </div>
        `;
      } else {
        statusContainer.innerHTML = `
          <div class="spreadsheet-info">
            <div class="spreadsheet-status-item">
              <span class="status-label">Status:</span>
              <span class="status-value disconnected">❌ Not Configured</span>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error updating spreadsheet display:', error);
      statusContainer.innerHTML = `
        <div class="spreadsheet-info">
          <div class="spreadsheet-status-item">
            <span class="status-label">Status:</span>
            <span class="status-value error">❌ Error</span>
          </div>
        </div>
      `;
    }
  }

  updateAuditLogSummary() {
    // Update audit log summary
    const summaryContainer = document.getElementById('auditLogSummary');
    if (!summaryContainer) return;
    
    try {
      // Get audit log entries (simplified version)
      const auditEntries = JSON.parse(localStorage.getItem('auditLog') || '[]');
      const recentEntries = auditEntries.slice(-5);
      
      summaryContainer.innerHTML = `
        <div class="audit-summary">
          <div class="audit-stat">
            <span class="stat-number">${auditEntries.length}</span>
            <span class="stat-label">Total Entries</span>
          </div>
          <div class="audit-recent">
            <h5>Recent Activity</h5>
            ${recentEntries.length > 0 ? 
              recentEntries.map(entry => `
                <div class="audit-entry">
                  <span class="audit-action">${entry.action || 'Unknown'}</span>
                  <span class="audit-time">${new Date(entry.timestamp).toLocaleString()}</span>
                </div>
              `).join('') :
              '<div class="empty-state">No recent activity</div>'
            }
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error updating audit log summary:', error);
      summaryContainer.innerHTML = '<div class="error">Failed to load audit log summary</div>';
    }
  }

  cleanupCorruptedStorage() {
    // Cleanup corrupted storage
    try {
      // Check for and clean up any corrupted storage entries
      const keys = ['config', 'volunteers', 'events', 'attendance'];
      
      keys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            JSON.parse(value); // Test if it's valid JSON
          }
        } catch (error) {
          console.warn(`Removing corrupted storage key: ${key}`);
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error during storage cleanup:', error);
    }
  }

  // Section toggle methods
  toggleSection(sectionName) {
    const content = document.getElementById(`${sectionName}-content`);
    const toggle = document.querySelector(`[onclick="settingsPage.toggleSection('${sectionName}')"] .section-toggle`);
    
    if (content && toggle) {
      const isCollapsed = content.classList.contains('collapsed');
      
      if (isCollapsed) {
        content.classList.remove('collapsed');
        toggle.textContent = '▼';
      } else {
        content.classList.add('collapsed');
        toggle.textContent = '▶';
      }
    }
  }

  expandAllSections() {
    document.querySelectorAll('.setting-section-content').forEach(content => {
      content.classList.remove('collapsed');
    });
    document.querySelectorAll('.section-toggle').forEach(toggle => {
      toggle.textContent = '▼';
    });
  }

  collapseAllSections() {
    document.querySelectorAll('.setting-section-content').forEach(content => {
      content.classList.add('collapsed');
    });
    document.querySelectorAll('.section-toggle').forEach(toggle => {
      toggle.textContent = '▶';
    });
  }

  // Settings management methods
  async saveSettings() {
    try {
      console.log('🔄 Saving all settings...');
      
      // Get current form values
      const formData = this.getFormData();
      
      // Update Config object with form values
      if (formData.syncEnabled !== undefined) {
        Config.sync.enabled = formData.syncEnabled;
      }
      
      if (formData.googleSheetsEnabled !== undefined) {
        Config.googleSheets.enabled = formData.googleSheetsEnabled;
      }
      
      if (formData.validationMode) {
        // ONLY use ValidationEngine (single source of truth)
        if (window.ValidationEngine && window.ValidationEngine.isInitialized) {
          await window.ValidationEngine.setMode(formData.validationMode);
          console.log(`✅ Validation mode set via ValidationEngine: ${formData.validationMode}`);
        } else {
          console.error('❌ ValidationEngine not available - cannot save validation mode');
          throw new Error('ValidationEngine not initialized - validation mode cannot be saved');
        }
      }
      
      // Save to storage using ConfigManager
      if (window.ConfigManager && typeof window.ConfigManager.saveConfig === 'function') {
        await window.ConfigManager.saveConfig();
        console.log('✅ Settings saved via ConfigManager');
      } else {
        // Fallback to direct storage save
        await this.saveSettingsToStorage();
        console.log('✅ Settings saved via direct storage');
      }
      
      // Update UI components
      this.updateSettingsDisplay();
      
      // Refresh the form to show updated values
      setTimeout(async () => {
        await this.loadSettingsForm();
        console.log('🔄 Settings form refreshed after save');
      }, 500);
      
      // Emit event for other components
      Utils.Event.emit('settingsSaved', {
        timestamp: new Date().toISOString(),
        validationMode: formData.validationMode
      });
      
      Utils.Notify.success('Settings saved successfully');
      console.log('✅ All settings saved successfully');
      
      // Reload page and redirect to dashboard to ensure all changes are properly reflected
      setTimeout(() => {
        console.log('🔄 Reloading page to dashboard to reflect all changes...');
        window.location.href = window.location.pathname; // Reload to dashboard (no hash)
      }, 1000); // Give user time to see the success message
      
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      Utils.Notify.error('Failed to save settings: ' + error.message);
    }
  }

  async resetSettings() {
    if (confirm('Reset all settings to defaults?')) {
      Utils.Notify.info('Settings reset to defaults');
    }
  }

  async cancelSettings() {
    if (confirm('Cancel changes and return to dashboard?')) {
      window.location.href = 'index.html';
    }
  }

  // Placeholder methods for removed functionality
  showValidationHelp() {
    Utils.Notify.info('Validation help feature coming soon');
  }

  showTroubleshooting() {
    Utils.Notify.info('Troubleshooting guide feature coming soon');
  }

  togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.type = field.type === 'password' ? 'text' : 'password';
    }
  }

  /**
   * Test Google credentials
   */
  async testGoogleCredentials() {
    try {
      Utils.Loading.show('Testing credentials...');
      
      // Get credentials from form
      const apiKey = document.getElementById('googleApiKey')?.value?.trim();
      const clientId = document.getElementById('googleClientId')?.value?.trim();
      
      if (!apiKey || !clientId) {
        throw new Error('Please enter both API Key and Client ID');
      }
      
      // Update credentials temporarily for testing
      const originalCredentials = window.AuthManager?.getCredentials();
      
      if (window.AuthManager) {
        await window.AuthManager.updateCredentials({
          apiKey,
          clientId
        });
        
        // Test authentication
        const isValid = await window.AuthManager.validateAuthentication();
        
        if (isValid) {
          Utils.Loading.hide();
          Utils.Notify.success('Credentials are valid!');
        } else {
          // Restore original credentials
          if (originalCredentials) {
            await window.AuthManager.updateCredentials(originalCredentials);
          }
          throw new Error('Invalid credentials or insufficient permissions');
        }
      } else {
        throw new Error('AuthManager not available');
      }
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Credential test failed:', error);
      Utils.Notify.error('Credential test failed: ' + error.message);
    }
  }

  /**
   * Clear Google credentials override
   */
  async clearGoogleCredentials() {
    try {
      // Clear form fields
      const apiKeyField = document.getElementById('googleApiKey');
      const clientIdField = document.getElementById('googleClientId');
      
      if (apiKeyField) apiKeyField.value = '';
      if (clientIdField) clientIdField.value = '';
      
      // Clear stored override credentials
      if (window.EnvironmentManager) {
        await window.EnvironmentManager.clearStoredCredentials();
      }
      
      // Reinitialize with environment credentials
      if (window.AuthManager) {
        await window.AuthManager.updateCredentials({});
      }
      
      Utils.Notify.success('Credential override cleared. Using environment variables.');
      
      // Reload settings form to reflect changes
      await this.loadSettingsForm();
      
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      Utils.Notify.error('Failed to clear credentials: ' + error.message);
    }
  }

  /**
   * Sign out from Google Sheets
   */
  async signOutGoogle() {
    try {
      Utils.Loading.show('Signing out...');
      
      if (window.AuthManager) {
        await window.AuthManager.signOut();
      }
      
      // Disable sync
      if (window.SyncManager && window.SyncManager.isEnabled) {
        // Unified sync system handles disabling automatically
      }
      
      Utils.Loading.hide();
      Utils.Notify.success('Successfully signed out from Google');
      
      // Reload settings form to reflect changes
      await this.loadSettingsForm();
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Sign out failed:', error);
      Utils.Notify.error('Sign out failed: ' + error.message);
    }
  }

  /**
   * Authenticate with Google Sheets
   */
  async authenticateGoogle() {
    try {
      Utils.Loading.show('Authenticating with Google...');
      
      if (!window.AuthManager) {
        throw new Error('AuthManager not available');
      }
      
      // Initialize and authenticate with Google
      const initialized = await window.AuthManager.init();
      if (!initialized) {
        throw new Error('Failed to initialize Google authentication');
      }
      
      await window.AuthManager.authenticate();
      
      // Initialize SheetsManager after successful authentication
      if (window.SheetsManager && !window.SheetsManager.isInitialized) {
        await window.SheetsManager.init();
      }
      
      // Unified sync system is automatically enabled when conditions are met
      console.log('Google Sheets sync will be enabled automatically by unified sync system');
      
      Utils.Loading.hide();
      Utils.Notify.success('Successfully authenticated with Google!');
      
      // Reload settings form to reflect changes
      await this.loadSettingsForm();
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Google authentication failed:', error);
      
      let errorMessage = 'Authentication failed: ';
      if (error.message.includes('popup')) {
        errorMessage += 'Please allow popups for this site and try again.';
      } else if (error.message.includes('access_denied')) {
        errorMessage += 'Access denied. Please grant the required permissions.';
      } else {
        errorMessage += error.message;
      }
      
      Utils.Notify.error(errorMessage);
    }
  }

  /**
   * Setup spreadsheet from input
   */
  async setupSpreadsheet() {
    try {
      const input = document.getElementById('spreadsheetInput')?.value?.trim();
      
      if (!input) {
        Utils.Notify.error('Please enter a spreadsheet ID or URL');
        return;
      }
      
      if (!window.AuthManager?.isAuthenticatedUser()) {
        Utils.Notify.error('Please authenticate with Google first');
        return;
      }
      
      Utils.Loading.show('Setting up spreadsheet...');
      
      // Extract spreadsheet ID from URL if needed
      let spreadsheetId = input;
      const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (urlMatch) {
        spreadsheetId = urlMatch[1];
      }
      
      // Use SheetsManager to set up the spreadsheet
      if (window.SheetsManager && typeof window.SheetsManager.setSpreadsheetId === 'function') {
        const result = await window.SheetsManager.setSpreadsheetId(spreadsheetId);
        
        if (result && result.success) {
          Utils.Loading.hide();
          Utils.Notify.success('Spreadsheet configured successfully!');
          this.updateSpreadsheetDisplay();
        } else {
          throw new Error(result?.error || 'Failed to configure spreadsheet');
        }
      } else {
        throw new Error('SheetsManager not available');
      }
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Spreadsheet setup failed:', error);
      Utils.Notify.error('Spreadsheet setup failed: ' + error.message);
    }
  }

  /**
   * Create new spreadsheet
   */
  async createNewSpreadsheet() {
    try {
      if (!window.AuthManager?.isAuthenticatedUser()) {
        Utils.Notify.error('Please authenticate with Google first');
        return;
      }
      
      Utils.Loading.show('Creating new spreadsheet...');
      
      if (window.SheetsManager && typeof window.SheetsManager.createNewSpreadsheet === 'function') {
        const result = await window.SheetsManager.createNewSpreadsheet();
        
        if (result && result.success) {
          Utils.Loading.hide();
          Utils.Notify.success('New spreadsheet created successfully!');
          this.updateSpreadsheetDisplay();
          
          // Update the input field with the new spreadsheet ID
          const input = document.getElementById('spreadsheetInput');
          if (input && result.spreadsheetId) {
            input.value = result.spreadsheetId;
          }
        } else {
          throw new Error(result?.error || 'Failed to create spreadsheet');
        }
      } else {
        throw new Error('SheetsManager not available');
      }
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Failed to create spreadsheet:', error);
      Utils.Notify.error('Failed to create spreadsheet: ' + error.message);
    }
  }

  /**
   * Validate current spreadsheet
   */
  async validateCurrentSpreadsheet() {
    try {
      if (!window.AuthManager?.isAuthenticatedUser()) {
        Utils.Notify.error('Please authenticate with Google first');
        return;
      }
      
      const spreadsheetId = window.UIUtils?.Storage?.get('vat_spreadsheet_id');
      if (!spreadsheetId) {
        Utils.Notify.error('No spreadsheet configured');
        return;
      }
      
      Utils.Loading.show('Validating spreadsheet...');
      
      if (window.SheetsManager && typeof window.SheetsManager.validateSpreadsheet === 'function') {
        const result = await window.SheetsManager.validateSpreadsheet(spreadsheetId);
        
        Utils.Loading.hide();
        
        if (result && result.isValid) {
          Utils.Notify.success('Spreadsheet is valid and accessible!');
        } else {
          Utils.Notify.warning('Spreadsheet validation issues: ' + (result?.error || 'Unknown issue'));
        }
      } else {
        throw new Error('SheetsManager not available');
      }
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Spreadsheet validation failed:', error);
      Utils.Notify.error('Spreadsheet validation failed: ' + error.message);
    }
  }

  /**
   * Remove current spreadsheet
   */
  async removeSpreadsheet() {
    try {
      const spreadsheetId = window.UIUtils?.Storage?.get('vat_spreadsheet_id');
      if (!spreadsheetId) {
        Utils.Notify.warning('No spreadsheet configured');
        return;
      }
      
      if (!confirm('Are you sure you want to remove the current spreadsheet configuration?')) {
        return;
      }
      
      // Clear the spreadsheet configuration
      if (window.UIUtils?.Storage) {
        window.UIUtils.Storage.remove('vat_spreadsheet_id');
      }
      
      // Clear the input field
      const input = document.getElementById('spreadsheetInput');
      if (input) {
        input.value = '';
      }
      
      Utils.Notify.success('Spreadsheet configuration removed');
      this.updateSpreadsheetDisplay();
      
    } catch (error) {
      console.error('Failed to remove spreadsheet:', error);
      Utils.Notify.error('Failed to remove spreadsheet: ' + error.message);
    }
  }

  /**
   * Reset sync timestamps to force full sync
   */
  async resetSyncTimestamps() {
    try {
      if (!confirm('This will force a full sync on the next sync operation. Continue?')) {
        return;
      }
      
      // Clear sync timestamps
      if (window.UIUtils?.Storage) {
        window.UIUtils.Storage.remove('lastSyncTimestamp');
        window.UIUtils.Storage.remove('lastVolunteerSync');
        window.UIUtils.Storage.remove('lastEventSync');
        window.UIUtils.Storage.remove('lastAttendanceSync');
      }
      
      // Reset unified sync timestamps if available
      if (window.UnifiedSync && typeof window.UnifiedSync.resetTimestamps === 'function') {
        await window.UnifiedSync.resetTimestamps();
      }
      
      Utils.Notify.success('Sync timestamps reset. Next sync will be a full sync.');
      
    } catch (error) {
      console.error('Failed to reset sync timestamps:', error);
      Utils.Notify.error('Failed to reset sync timestamps: ' + error.message);
    }
  }

  exportConfiguration() {
    Utils.Notify.info('Export configuration feature coming soon');
  }

  importConfiguration() {
    Utils.Notify.info('Import configuration feature coming soon');
  }

  showConfigurationBackups() {
    Utils.Notify.info('Configuration backups feature coming soon');
  }

  resetConfiguration() {
    Utils.Notify.info('Reset configuration feature coming soon');
  }

  viewAuditLog() {
    Utils.Notify.info('View audit log feature coming soon');
  }

  exportAuditLog() {
    Utils.Notify.info('Export audit log feature coming soon');
  }

  clearAuditLog() {
    Utils.Notify.info('Clear audit log feature coming soon');
  }

  // Data management methods - delegated to centralized DataManager
  async importData() {
    return await DataManager.importData();
  }

  async clearAllData() {
    return await DataManager.clearAllData();
  }

  // Note: resetAndSyncFromSheets is now handled by DataManager service
}

// Export to global scope
window.SettingsPage = SettingsPage;

// Settings component will be initialized by the main app
// No separate DOMContentLoaded listener needed for SPA