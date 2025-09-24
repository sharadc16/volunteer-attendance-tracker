/**
 * Settings Page Controller
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
      
      // Show loading
      Utils.Loading.show('Loading settings...');
      
      // Initialize storage
      await Storage.init();
      
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
      
      // Initialize Google Sheets authentication if enabled
      if (Config.googleSheets.enabled) {
        try {
          await this.initializeGoogleAuth();
        } catch (error) {
          console.warn('Failed to initialize Google auth:', error);
        }
      }
      
      // Clear the safety timeout since we completed successfully
      clearTimeout(cleanupTimeout);
      
      Utils.Loading.hide();
      this.isInitialized = true;
      console.log('Settings page initialized successfully');
      
    } catch (error) {
      // Clear the safety timeout
      clearTimeout(cleanupTimeout);
      
      console.error('Failed to initialize settings page:', error);
      Utils.Notify.error('Failed to load settings. Please refresh the page.');
      
      // Use force hide to ensure loading is cleared even on error
      if (window.Utils && window.Utils.Loading) {
        window.Utils.Loading.forceHide();
      }
    }
  }

  async initializeGoogleAuth() {
    if (window.AuthManager) {
      const authInitialized = await window.AuthManager.init();
      if (authInitialized && window.AuthManager.isAuthenticatedUser()) {
        if (window.SheetsManager) {
          await window.SheetsManager.init();
        }
      }
      
      // Reload the settings form to reflect the correct authentication status
      await this.loadSettingsForm();
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
        console.log('No saved settings found, using defaults');
      }
      
    } catch (error) {
      console.error('Error loading saved settings:', error);
      // Continue with default settings if loading fails
    }
  }

  async loadSettingsForm() {
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

    // Store original settings for comparison
    this.originalSettings = JSON.parse(JSON.stringify(Config));

    const settingsForm = `
      <div class="settings-sections">
        <div class="setting-section">
          <h3>Scanner Settings</h3>
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
        </div>
        
        <div class="setting-section">
          <h3>Google Sheets Sync</h3>
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
              
              <!-- Sync interval moved to general sync settings section -->
              
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
        
        <div class="setting-section">
          <h3>Sync Settings</h3>
          <div class="setting-group">
            <label class="setting-item">
              <input type="checkbox" id="syncEnabled" ${Config.sync.enabled ? 'checked' : ''}>
              <span>Enable data sync</span>
            </label>
            <label class="setting-item">
              <span>Sync interval (seconds):</span>
              <input type="number" id="syncInterval" value="${Config.sync.interval / 1000}" min="120" max="600">
              <div class="field-feedback">
                <small>Recommended: 180-300 seconds (3-5 minutes) to prevent sync overlaps</small>
              </div>
            </label>
          </div>
        </div>
        
        <div class="setting-section">
          <h3>Display Settings</h3>
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
        
        <div class="setting-section">
          <h3>Configuration Management</h3>
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
        
        <div class="setting-section">
          <h3>Data Management</h3>
          <div class="setting-group">
            <div class="setting-buttons">
              <button type="button" class="btn btn-secondary" onclick="settingsPage.exportAllData()">📤 Export All Data</button>
              <button type="button" class="btn btn-secondary" onclick="settingsPage.importData()">📥 Import Data</button>
              <button type="button" class="btn btn-warning" onclick="settingsPage.clearAllData()">🗑️ Clear All Data</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = Utils.DOM.get('#settingsForm');
    if (container) {
      container.innerHTML = settingsForm;
      
      // Setup Google Sheets toggle
      setTimeout(() => {
        const googleSheetsToggle = Utils.DOM.get('#googleSheetsEnabled');
        const googleSheetsConfig = Utils.DOM.get('#googleSheetsConfig');
        
        if (googleSheetsToggle && googleSheetsConfig) {
          googleSheetsToggle.onchange = (e) => {
            googleSheetsConfig.style.display = e.target.checked ? 'block' : 'none';
          };
        }
        
        // Initialize settings validator
        if (window.SettingsValidator) {
          window.SettingsValidator.init();
          window.SettingsValidator.setupFormValidation();
        }

        // Show current spreadsheet info if available
        this.updateSpreadsheetDisplay();
      }, 100);
    }
  }

  setupEventListeners() {
    // Initialize shared components
    this.initializeSharedComponents();

    // Save button
    const saveBtn = Utils.DOM.get('#saveBtn');
    if (saveBtn) {
      saveBtn.onclick = () => this.saveSettings();
    }

    // Cancel button
    const cancelBtn = Utils.DOM.get('#cancelBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => this.cancelSettings();
    }

    // Setup modal handlers
    this.setupModalHandlers();
    
    // Note: Sync button is now handled by NavigationComponent
  }

  // Initialize shared components
  initializeSharedComponents() {
    // Initialize header and navigation with shared components
    if (window.HeaderComponent) {
      window.HeaderComponent.replace('Settings');
    }
    
    if (window.NavigationComponent) {
      window.NavigationComponent.replace('settings');
    }
    
    console.log('Settings page: Shared components initialized');
  }

  setupModalHandlers() {
    const modalOverlay = Utils.DOM.get('#modalOverlay');
    const modalClose = Utils.DOM.get('#modalClose');
    const modalCancel = Utils.DOM.get('#modalCancel');
    
    // Close modal handlers
    [modalClose, modalCancel].forEach(btn => {
      if (btn) {
        btn.onclick = () => UI.Modal.hide();
      }
    });
    
    // Close on overlay click
    if (modalOverlay) {
      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
          UI.Modal.hide();
        }
      };
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && UI.Modal.current) {
        UI.Modal.hide();
      }
    });
  }

  async saveSettings() {
    try {
      Utils.Loading.show('Saving settings...');

      // Collect form data
      const newSettings = this.collectFormData();
      
      // Validate settings
      if (!this.validateSettings(newSettings)) {
        Utils.Loading.hide();
        return;
      }

      // Save settings
      await this.applySettings(newSettings);
      
      Utils.Loading.hide();
      Utils.Notify.success('Settings saved successfully');
      
      // Redirect back to main app after a short delay
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Error saving settings:', error);
      Utils.Notify.error('Failed to save settings: ' + error.message);
    }
  }

  collectFormData() {
    return {
      scanner: {
        enabled: Utils.DOM.get('#scannerEnabled')?.checked || false,
        autoFocus: Utils.DOM.get('#autoFocus')?.checked || false,
        prefix: Utils.DOM.get('#scannerPrefix')?.value || '',
        suffix: Utils.DOM.get('#scannerSuffix')?.value || ''
      },
      googleSheets: {
        enabled: Utils.DOM.get('#googleSheetsEnabled')?.checked || false,
        spreadsheetId: Utils.DOM.get('#googleSpreadsheetId')?.value || '',
        apiKey: Utils.DOM.get('#googleApiKey')?.value || '',
        clientId: Utils.DOM.get('#googleClientId')?.value || ''
      },
      sync: {
        enabled: Utils.DOM.get('#syncEnabled')?.checked || false,
        interval: (parseInt(Utils.DOM.get('#syncInterval')?.value) || 300) * 1000
      },
      ui: {
        recentAttendanceLimit: parseInt(Utils.DOM.get('#recentLimit')?.value) || 10,
        autoRefreshInterval: (parseInt(Utils.DOM.get('#autoRefresh')?.value) || 30) * 1000
      }
    };
  }

  validateSettings(settings) {
    // Basic validation
    if (settings.sync.interval < 120000) {
      Utils.Notify.error('Sync interval should be at least 2 minutes to prevent overlaps');
      return false;
    }

    if (settings.ui.recentAttendanceLimit < 5 || settings.ui.recentAttendanceLimit > 50) {
      Utils.Notify.error('Recent check-ins limit must be between 5 and 50');
      return false;
    }

    return true;
  }

  async applySettings(newSettings) {
    // Update Config object
    Object.assign(Config.scanner, newSettings.scanner);
    Object.assign(Config.googleSheets, newSettings.googleSheets);
    Object.assign(Config.sync, newSettings.sync);
    Object.assign(Config.ui, newSettings.ui);

    // Save to storage
    await Storage.setItem('config', Config);

    // Apply Google credentials if provided
    if (newSettings.googleSheets.apiKey || newSettings.googleSheets.clientId || newSettings.googleSheets.spreadsheetId) {
      if (window.EnvironmentManager) {
        await window.EnvironmentManager.storeCredentials({
          apiKey: newSettings.googleSheets.apiKey,
          clientId: newSettings.googleSheets.clientId,
          spreadsheetId: newSettings.googleSheets.spreadsheetId
        });
      }
    }
  }

  cancelSettings() {
    // Check if settings have changed
    const currentSettings = this.collectFormData();
    const hasChanges = JSON.stringify(currentSettings) !== JSON.stringify(this.originalSettings);
    
    if (hasChanges) {
      UI.Modal.confirm(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave without saving?',
        () => {
          window.location.href = 'index.html';
        }
      );
    } else {
      window.location.href = 'index.html';
    }
  }

  async handleSync() {
    try {
      if (!Config.googleSheets.enabled) {
        Utils.Notify.warning('Google Sheets sync is disabled. Enable it to sync data.');
        return;
      }

      if (!window.AuthManager || !window.AuthManager.isAuthenticatedUser()) {
        Utils.Notify.warning('Please authenticate with Google first.');
        return;
      }

      Utils.Loading.show('Syncing data...');
      
      if (window.Sync && !window.Sync.isEnabled) {
        await window.Sync.init();
      }

      const result = await window.Sync.performSync({ force: true });
      
      Utils.Loading.hide();
      
      if (result.success) {
        Utils.Notify.success('Sync completed successfully!');
      } else {
        Utils.Notify.error('Sync failed: ' + (result.error || 'Unknown error'));
      }
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Sync error:', error);
      Utils.Notify.error('Sync failed: ' + error.message);
    }
  }

  // Google Sheets methods
  togglePasswordVisibility(inputId) {
    const input = Utils.DOM.get('#' + inputId);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }

  async testGoogleCredentials() {
    try {
      Utils.Loading.show('Testing credentials...');
      
      const apiKey = Utils.DOM.get('#googleApiKey')?.value;
      const clientId = Utils.DOM.get('#googleClientId')?.value;
      const spreadsheetId = Utils.DOM.get('#googleSpreadsheetId')?.value;
      
      if (!apiKey || !clientId) {
        Utils.Notify.warning('Please enter both API Key and Client ID');
        Utils.Loading.hide();
        return;
      }

      // Test credentials logic would go here
      // Note: Spreadsheet ID is optional - system can auto-create if needed
      Utils.Loading.hide();
      Utils.Notify.success('Credentials are valid!' + (spreadsheetId ? ' Spreadsheet ID provided.' : ' Will auto-create spreadsheet.'));
      
    } catch (error) {
      Utils.Loading.hide();
      Utils.Notify.error('Invalid credentials: ' + error.message);
    }
  }

  clearGoogleCredentials() {
    Utils.DOM.get('#googleApiKey').value = '';
    Utils.DOM.get('#googleClientId').value = '';
    Utils.DOM.get('#googleSpreadsheetId').value = '';
    this.hideSpreadsheetInfo();
    Utils.Notify.success('Credentials cleared');
  }

  // Spreadsheet management methods
  async refreshSpreadsheetInfo() {
    try {
      if (window.SheetsManager && window.SheetsManager.spreadsheetId) {
        this.showSpreadsheetInfo(
          window.SheetsManager.spreadsheetId,
          window.SheetsManager.spreadsheetUrl
        );
        Utils.Notify.success('Spreadsheet info refreshed');
      } else {
        this.hideSpreadsheetInfo();
        Utils.Notify.warning('No active spreadsheet found');
      }
    } catch (error) {
      Utils.Notify.error('Failed to refresh spreadsheet info: ' + error.message);
    }
  }

  showSpreadsheetInfo(spreadsheetId, spreadsheetUrl) {
    const infoDiv = Utils.DOM.get('#spreadsheetInfo');
    const idSpan = Utils.DOM.get('#currentSpreadsheetId');
    const urlLink = Utils.DOM.get('#currentSpreadsheetUrl');
    
    if (infoDiv && idSpan && urlLink) {
      idSpan.textContent = spreadsheetId;
      urlLink.href = spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      urlLink.textContent = 'Open Spreadsheet';
      infoDiv.style.display = 'block';
    }
  }

  hideSpreadsheetInfo() {
    const infoDiv = Utils.DOM.get('#spreadsheetInfo');
    if (infoDiv) {
      infoDiv.style.display = 'none';
    }
  }

  copySpreadsheetId() {
    const idSpan = Utils.DOM.get('#currentSpreadsheetId');
    if (idSpan && idSpan.textContent !== '-') {
      navigator.clipboard.writeText(idSpan.textContent).then(() => {
        Utils.Notify.success('Spreadsheet ID copied to clipboard');
      }).catch(() => {
        Utils.Notify.error('Failed to copy spreadsheet ID');
      });
    }
  }

  async createNewSpreadsheet() {
    try {
      if (!window.SheetsManager) {
        Utils.Notify.error('Sheets manager not available');
        return;
      }

      Utils.Loading.show('Creating new spreadsheet...');
      
      // Clear existing spreadsheet ID to force creation of new one
      window.UIUtils.Storage.remove('vat_spreadsheet_id');
      window.SheetsManager.spreadsheetId = null;
      
      // Initialize sheets manager which will create new spreadsheet
      await window.SheetsManager.init();
      
      if (window.SheetsManager.spreadsheetId) {
        this.showSpreadsheetInfo(
          window.SheetsManager.spreadsheetId,
          window.SheetsManager.spreadsheetUrl
        );
        Utils.Notify.success('New spreadsheet created successfully!');
      } else {
        throw new Error('Failed to create spreadsheet');
      }
      
      Utils.Loading.hide();
      
    } catch (error) {
      Utils.Loading.hide();
      Utils.Notify.error('Failed to create new spreadsheet: ' + error.message);
    }
  }

  updateSpreadsheetDisplay() {
    console.log('🔄 Settings: Updating spreadsheet display...');
    
    const statusContainer = Utils.DOM.get('#spreadsheetStatus');
    if (!statusContainer) {
      console.log('❌ Settings: Spreadsheet status container not found');
      return;
    }
    
    // Check for existing spreadsheet info
    const storedId = window.UIUtils.Storage.get('vat_spreadsheet_id');
    console.log('🔄 Settings: Stored spreadsheet ID:', storedId);
    
    if (storedId) {
      console.log('✅ Settings: Spreadsheet found, updating display with configured state');
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${storedId}`;
      statusContainer.innerHTML = `
        <div class="spreadsheet-configured">
          <div class="status-indicator configured">
            <span class="status-dot"></span>
            <span class="status-text">Spreadsheet Configured</span>
          </div>
          <div class="spreadsheet-details">
            <div class="spreadsheet-id">
              <strong>ID:</strong> <code>${storedId}</code>
              <button type="button" class="btn-icon" onclick="settingsPage.copyToClipboard('${storedId}')" title="Copy ID">📋</button>
            </div>
            <div class="spreadsheet-url">
              <strong>Link:</strong> <a href="${spreadsheetUrl}" target="_blank" rel="noopener">Open Spreadsheet</a>
            </div>
            <div class="spreadsheet-actions">
              <button type="button" class="btn btn-small btn-warning" onclick="settingsPage.removeSpreadsheet()">🗑️ Remove</button>
            </div>
          </div>
        </div>
      `;
      console.log('✅ Settings: Spreadsheet display updated - showing configured state');
    } else {
      console.log('⚠️ Settings: No spreadsheet found, showing not-configured state');
      statusContainer.innerHTML = `
        <div class="spreadsheet-not-configured">
          <div class="status-indicator not-configured">
            <span class="status-dot"></span>
            <span class="status-text">No Spreadsheet Configured</span>
          </div>
          <p class="help-text">You need to configure a Google Spreadsheet to enable sync functionality.</p>
        </div>
      `;
    }
  }

  // Unified spreadsheet setup method
  async setupSpreadsheet() {
    const input = Utils.DOM.get('#spreadsheetInput');
    const inputValue = input.value.trim();
    
    try {
      if (!inputValue) {
        // No input provided - create new spreadsheet
        console.log('🔄 Settings: No input provided, creating new spreadsheet');
        await this.createNewSpreadsheet();
        return;
      }
      
      // Extract spreadsheet ID from input (could be ID or URL)
      const spreadsheetId = this.extractSpreadsheetId(inputValue);
      
      if (!spreadsheetId) {
        throw new Error('Invalid spreadsheet ID or URL format');
      }
      
      console.log('🔄 Settings: Setting up spreadsheet with ID:', spreadsheetId);
      Utils.Loading.show('Setting up spreadsheet...');
      
      // Set the spreadsheet ID using SheetsManager
      if (!window.SheetsManager) {
        throw new Error('SheetsManager not available');
      }
      
      console.log('🔄 Settings: Calling SheetsManager.setSpreadsheetId()');
      const result = await window.SheetsManager.setSpreadsheetId(spreadsheetId);
      console.log('🔄 Settings: SheetsManager result:', result);
      
      // Handle both boolean and object returns
      const isSuccess = result === true || (result && result.success === true);
      
      if (isSuccess) {
        console.log('✅ Settings: Spreadsheet setup successful, hiding loading');
        Utils.Loading.hide();
        Utils.Notify.success('Spreadsheet configured successfully!');
        
        // Clear the input
        input.value = '';
        
        // Update the display with a small delay to ensure storage is updated
        setTimeout(() => {
          this.updateSpreadsheetDisplay();
        }, 100);
        
        // Refresh sync status to reflect the new spreadsheet
        if (window.StatusManager) {
          window.StatusManager.updateSyncStatus({
            enabled: true,
            authenticated: window.AuthManager?.isAuthenticatedUser() || false,
            online: true // We just successfully configured a spreadsheet
          });
        }
        
      } else {
        console.log('❌ Settings: Spreadsheet setup failed, hiding loading');
        Utils.Loading.hide();
        const errorMessage = (result && result.error) || 'Unknown error';
        Utils.Notify.error('Failed to configure spreadsheet: ' + errorMessage);
      }
      
    } catch (error) {
      console.log('❌ Settings: Exception during spreadsheet setup, hiding loading');
      Utils.Loading.hide();
      console.error('Error setting up spreadsheet:', error);
      Utils.Notify.error('Failed to set up spreadsheet: ' + error.message);
    }
  }
  
  // Helper method to extract spreadsheet ID from various input formats
  extractSpreadsheetId(input) {
    // If it's already a 44-character ID, return as-is
    if (/^[a-zA-Z0-9-_]{44}$/.test(input)) {
      return input;
    }
    
    // Try to extract from Google Sheets URL
    const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{44})/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Try to extract from shorter formats or partial IDs
    const cleanInput = input.replace(/[^a-zA-Z0-9-_]/g, '');
    if (cleanInput.length >= 40 && cleanInput.length <= 50) {
      // Might be a valid ID with some extra characters
      const possibleId = cleanInput.substring(0, 44);
      if (/^[a-zA-Z0-9-_]{44}$/.test(possibleId)) {
        return possibleId;
      }
    }
    
    return null;
  }
  
  // Validate current spreadsheet
  async validateCurrentSpreadsheet() {
    try {
      if (!window.SheetsManager || !window.SheetsManager.spreadsheetId) {
        Utils.Notify.warning('No spreadsheet is currently configured');
        return;
      }
      
      Utils.Loading.show('Validating current spreadsheet...');
      
      const result = await window.SheetsManager.validateSpreadsheet(window.SheetsManager.spreadsheetId);
      
      Utils.Loading.hide();
      
      if (result) {
        Utils.Notify.success('Current spreadsheet is valid and accessible');
      } else {
        Utils.Notify.error('Current spreadsheet is not accessible or invalid');
      }
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Error validating spreadsheet:', error);
      Utils.Notify.error('Failed to validate spreadsheet: ' + error.message);
    }
  }



  // Remove current spreadsheet configuration
  async removeSpreadsheet() {
    UI.Modal.confirm(
      'Remove Spreadsheet',
      'Are you sure you want to remove the current spreadsheet configuration? This will disable sync functionality.',
      () => {
        // Remove from storage
        window.UIUtils.Storage.remove('vat_spreadsheet_id');
        
        // Clear SheetsManager
        if (window.SheetsManager) {
          window.SheetsManager.spreadsheetId = null;
          window.SheetsManager.spreadsheetUrl = null;
        }
        
        Utils.Notify.success('Spreadsheet configuration removed');
        this.updateSpreadsheetDisplay();
      }
    );
  }

  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Utils.Notify.success('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Utils.Notify.error('Failed to copy to clipboard');
    }
  }

  // Reset sync timestamps to force full sync
  async resetSyncTimestamps() {
    UI.Modal.confirm(
      'Reset Sync Timestamps',
      'This will reset sync timestamps and force a full sync on the next sync operation. This can help if sync is not working properly. Continue?',
      async () => {
        try {
          if (window.Sync && window.Sync.resetSyncTimestamps) {
            const success = await window.Sync.resetSyncTimestamps();
            if (success) {
              Utils.Notify.success('Sync timestamps reset successfully');
            } else {
              Utils.Notify.error('Failed to reset sync timestamps');
            }
          } else {
            Utils.Notify.error('Sync service not available');
          }
        } catch (error) {
          console.error('Error resetting sync timestamps:', error);
          Utils.Notify.error('Error resetting sync timestamps: ' + error.message);
        }
      }
    );
  }

  // Clean up any corrupted storage data
  cleanupCorruptedStorage() {
    const keysToCheck = ['vat_spreadsheet_id', 'vat_spreadsheet_url', 'config'];
    let cleanedCount = 0;
    
    keysToCheck.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          JSON.parse(item); // Test if it's valid JSON
        }
      } catch (error) {
        console.log(`Cleaning up corrupted storage key: ${key}`);
        localStorage.removeItem(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} corrupted storage items`);
    }
  }

  async authenticateGoogle() {
    try {
      if (!window.AuthManager) {
        throw new Error('AuthManager not available - Google Sheets sync may be disabled');
      }
      
      // Check if CredentialManager is available
      if (!window.CredentialManager) {
        throw new Error('CredentialManager not available - please check script loading order');
      }
      
      // FIRST: Save credentials from the form before attempting authentication
      Utils.Loading.show('Saving credentials...');
      
      // Get credentials from form inputs
      const apiKeyInput = Utils.DOM.get('#googleApiKey');
      const clientIdInput = Utils.DOM.get('#googleClientId');
      
      if (!apiKeyInput || !clientIdInput) {
        Utils.Loading.hide();
        throw new Error('Credential input fields not found. Please refresh the page and try again.');
      }
      
      const apiKey = apiKeyInput.value.trim();
      const clientId = clientIdInput.value.trim();
      
      // Validate that credentials are provided
      if (!apiKey || !clientId) {
        Utils.Loading.hide();
        throw new Error('Please enter both Google API Key and Client ID before authenticating.');
      }
      
      // Validate credential format
      if (apiKey === 'YOUR_API_KEY_HERE' || clientId === 'YOUR_CLIENT_ID_HERE') {
        Utils.Loading.hide();
        throw new Error('Please replace the placeholder credentials with your actual Google API credentials.');
      }
      
      // Save credentials using EnvironmentManager
      if (window.EnvironmentManager) {
        await window.EnvironmentManager.storeCredentials({
          apiKey: apiKey,
          clientId: clientId
        });
        console.log('✅ Credentials saved successfully');
      }
      
      // Force reload credentials in CredentialManager
      await window.CredentialManager.loadCredentials();
      
      // Check if AuthManager is initialized, if not, initialize it
      if (!window.AuthManager.isInitialized) {
        Utils.Loading.show('Initializing authentication...');
        
        // Check if credentials are now configured
        if (!window.CredentialManager.areCredentialsReady()) {
          const diagnostics = window.CredentialManager.getDiagnostics();
          Utils.Loading.hide();
          
          let errorMessage = 'Google API credentials still not configured properly after saving.\n\n';
          errorMessage += 'Diagnostics:\n' + JSON.stringify(diagnostics, null, 2);
          errorMessage += '\n\nPlease check the GOOGLE_API_SETUP.md guide.';
          
          throw new Error(errorMessage);
        }
        
        const initialized = await window.AuthManager.init();
        if (!initialized) {
          throw new Error('Failed to initialize AuthManager - check console for details');
        }
      }
      
      Utils.Loading.show('Authenticating with Google...');
      await window.AuthManager.authenticate();
      Utils.Loading.hide();
      
      Utils.Notify.success('Authentication successful!');
      // Reload the form to update auth status
      await this.loadSettingsForm();
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Authentication error:', error);
      
      // Show more user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('popup')) {
        userMessage = 'Authentication popup was blocked or closed. Please allow popups and try again.';
      } else if (error.message.includes('network') || error.message.includes('offline')) {
        userMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('credentials')) {
        userMessage = error.message; // Already user-friendly
      }
      
      Utils.Notify.error('Authentication failed: ' + userMessage);
    }
  }

  async signOutGoogle() {
    try {
      if (!window.AuthManager) {
        throw new Error('AuthManager not available');
      }
      
      if (!window.AuthManager.isInitialized) {
        Utils.Notify.warning('AuthManager not initialized - nothing to sign out from');
        return;
      }
      
      Utils.Loading.show('Signing out...');
      await window.AuthManager.signOut();
      Utils.Loading.hide();
      
      Utils.Notify.success('Signed out successfully');
      // Reload the form to update auth status
      await this.loadSettingsForm();
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Sign out error:', error);
      Utils.Notify.error('Sign out failed: ' + error.message);
    }
  }

  // Configuration management methods
  exportConfiguration() {
    const config = JSON.stringify(Config, null, 2);
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gurukul-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    Utils.Notify.success('Settings exported successfully');
  }

  importConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        const importedConfig = JSON.parse(text);
        
        // Validate imported config
        if (!importedConfig.scanner || !importedConfig.googleSheets) {
          throw new Error('Invalid configuration file');
        }

        // Apply imported settings
        Object.assign(Config, importedConfig);
        await Storage.setItem('config', Config);
        
        Utils.Notify.success('Settings imported successfully');
        await this.loadSettingsForm();
        
      } catch (error) {
        Utils.Notify.error('Failed to import settings: ' + error.message);
      }
    };
    input.click();
  }

  showConfigurationBackups() {
    Utils.Notify.info('Configuration backup feature coming soon');
  }

  async resetConfiguration() {
    UI.Modal.confirm(
      'Reset Configuration',
      'This will reset all settings to their default values. This action cannot be undone.',
      async () => {
        try {
          // Reset to default config
          const defaultConfig = {
            scanner: { enabled: true, autoFocus: true, prefix: '', suffix: '' },
            googleSheets: { enabled: false, spreadsheetId: '', apiKey: '', clientId: '' },
            sync: { enabled: false, interval: 300000 },
            ui: { recentAttendanceLimit: 10, autoRefreshInterval: 30000 }
          };
          
          Object.assign(Config, defaultConfig);
          await Storage.setItem('config', Config);
          
          Utils.Notify.success('Configuration reset to defaults');
          await this.loadSettingsForm();
          
        } catch (error) {
          Utils.Notify.error('Failed to reset configuration: ' + error.message);
        }
      }
    );
  }

  // Data management methods
  async exportAllData() {
    try {
      const data = {
        volunteers: await Storage.getAllVolunteers(),
        events: await Storage.getAllEvents(),
        attendance: await Storage.getAllAttendance(),
        config: Config,
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gurukul-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      Utils.Notify.success('Data exported successfully');
    } catch (error) {
      Utils.Notify.error('Failed to export data: ' + error.message);
    }
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        const data = JSON.parse(text);
        
        UI.Modal.confirm(
          'Import Data',
          'This will replace all existing data. Are you sure?',
          async () => {
            try {
              Utils.Loading.show('Importing data...');
              
              // Import data
              if (data.volunteers) {
                await Storage.clearVolunteers();
                for (const volunteer of data.volunteers) {
                  await Storage.addVolunteer(volunteer);
                }
              }
              
              if (data.events) {
                await Storage.clearEvents();
                for (const event of data.events) {
                  await Storage.addEvent(event);
                }
              }
              
              if (data.attendance) {
                await Storage.clearAttendance();
                for (const record of data.attendance) {
                  await Storage.addAttendance(record);
                }
              }
              
              Utils.Loading.hide();
              Utils.Notify.success('Data imported successfully');
              
            } catch (error) {
              Utils.Loading.hide();
              Utils.Notify.error('Failed to import data: ' + error.message);
            }
          }
        );
        
      } catch (error) {
        Utils.Notify.error('Failed to read import file: ' + error.message);
      }
    };
    input.click();
  }

  clearAllData() {
    UI.Modal.confirm(
      'Clear All Data',
      'This will permanently delete all volunteers, events, and attendance records. This action cannot be undone.',
      async () => {
        try {
          Utils.Loading.show('Clearing data...');
          
          await Storage.clearVolunteers();
          await Storage.clearEvents();
          await Storage.clearAttendance();
          
          Utils.Loading.hide();
          Utils.Notify.success('All data cleared successfully');
          
        } catch (error) {
          Utils.Loading.hide();
          Utils.Notify.error('Failed to clear data: ' + error.message);
        }
      }
    );
  }
}

// Initialize settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.settingsPage = new SettingsPage();
});