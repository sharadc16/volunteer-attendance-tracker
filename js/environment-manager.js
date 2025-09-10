/**
 * Environment Management System
 * Handles environment detection, switching, and configuration management
 */

class EnvironmentManager {
    constructor() {
        this.environments = {
            DEVELOPMENT: 'development',
            TESTING: 'testing', 
            PRODUCTION: 'production'
        };
        
        this.currentEnvironment = null;
        this.environmentConfig = null;
        this.listeners = [];
        
        // Environment-specific configurations
        this.configs = {
            development: {
                name: 'Development',
                shortName: 'DEV',
                color: '#ff6b35',
                backgroundColor: '#fff3f0',
                googleSheets: {
                    spreadsheetId: '', // To be configured by user
                    sheetPrefix: 'DEV_'
                },
                database: {
                    name: 'VolunteerAttendanceDB_Dev'
                },
                sync: {
                    interval: 10000, // 10 seconds
                    batchSize: 5
                },
                features: {
                    debugMode: true,
                    testFeatures: true,
                    bypassValidation: true
                }
            },
            testing: {
                name: 'Testing',
                shortName: 'TEST',
                color: '#f39c12',
                backgroundColor: '#fef9e7',
                googleSheets: {
                    spreadsheetId: '', // To be configured by user
                    sheetPrefix: 'TEST_'
                },
                database: {
                    name: 'VolunteerAttendanceDB_Test'
                },
                sync: {
                    interval: 30000, // 30 seconds
                    batchSize: 10
                },
                features: {
                    debugMode: true,
                    testFeatures: false,
                    bypassValidation: false
                }
            },
            production: {
                name: 'Production',
                shortName: 'PROD',
                color: '#27ae60',
                backgroundColor: '#f0fff4',
                googleSheets: {
                    spreadsheetId: '', // To be configured by user
                    sheetPrefix: 'PROD_'
                },
                database: {
                    name: 'VolunteerAttendanceDB'
                },
                sync: {
                    interval: 60000, // 60 seconds
                    batchSize: 20
                },
                features: {
                    debugMode: false,
                    testFeatures: false,
                    bypassValidation: false
                }
            }
        };
        
        this.init();
    }

    /**
     * Initialize environment manager
     */
    async init() {
        try {
            // Load saved environment configuration
            await this.loadEnvironmentConfig();
            
            // Detect current environment
            this.detectEnvironment();
            
            // Validate environment configuration
            await this.validateEnvironment();
            
            // Setup UI indicators
            this.setupEnvironmentUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log(`🌍 Environment Manager initialized - Current: ${this.currentEnvironment.toUpperCase()}`);
            
        } catch (error) {
            console.error('Failed to initialize Environment Manager:', error);
            throw error;
        }
    }

    /**
     * Detect environment based on hostname and URL parameters
     */
    detectEnvironment() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        
        // Check URL parameter first (highest priority)
        const envParam = searchParams.get('env');
        if (envParam) {
            const env = envParam.toLowerCase();
            if (env === 'dev' || env === 'development') {
                this.currentEnvironment = this.environments.DEVELOPMENT;
                return;
            }
            if (env === 'test' || env === 'testing') {
                this.currentEnvironment = this.environments.TESTING;
                return;
            }
            if (env === 'prod' || env === 'production') {
                this.currentEnvironment = this.environments.PRODUCTION;
                return;
            }
        }
        
        // Check for development indicators
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' || 
            hostname.includes('dev') ||
            pathname.includes('/dev/') ||
            window.FORCE_DEV_MODE) {
            this.currentEnvironment = this.environments.DEVELOPMENT;
            return;
        }
        
        // Check for testing indicators
        if (hostname.includes('test') || 
            hostname.includes('staging') ||
            pathname.includes('/test/')) {
            this.currentEnvironment = this.environments.TESTING;
            return;
        }
        
        // Check for production indicators
        if (hostname.includes('github.io') || 
            hostname.includes('netlify.app') ||
            hostname.includes('vercel.app') ||
            !hostname.includes('localhost')) {
            this.currentEnvironment = this.environments.PRODUCTION;
            return;
        }
        
        // Default to development if uncertain
        this.currentEnvironment = this.environments.DEVELOPMENT;
        console.warn('Could not determine environment, defaulting to development');
    }

    /**
     * Load environment configuration from storage
     */
    async loadEnvironmentConfig() {
        try {
            const saved = localStorage.getItem('environmentConfig');
            if (saved) {
                const config = JSON.parse(saved);
                
                // Merge saved config with defaults
                Object.keys(this.configs).forEach(env => {
                    if (config[env]) {
                        this.configs[env] = { ...this.configs[env], ...config[env] };
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load environment config:', error);
        }
    }

    /**
     * Save environment configuration to storage
     */
    async saveEnvironmentConfig() {
        try {
            localStorage.setItem('environmentConfig', JSON.stringify(this.configs));
        } catch (error) {
            console.error('Failed to save environment config:', error);
        }
    }

    /**
     * Validate current environment configuration
     */
    async validateEnvironment() {
        const config = this.getCurrentConfig();
        const issues = [];
        
        // Check Google Sheets configuration
        if (!config.googleSheets.spreadsheetId) {
            issues.push(`Google Sheets not configured for ${config.name} environment`);
        }
        
        // Check for environment mismatch
        const expectedEnv = this.detectExpectedEnvironment();
        if (expectedEnv && expectedEnv !== this.currentEnvironment) {
            issues.push(`Environment mismatch: Expected ${expectedEnv}, but configured as ${this.currentEnvironment}`);
        }
        
        if (issues.length > 0) {
            console.warn('Environment validation issues:', issues);
            this.showEnvironmentWarnings(issues);
        }
        
        return issues.length === 0;
    }

    /**
     * Detect expected environment based on URL patterns
     */
    detectExpectedEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return this.environments.DEVELOPMENT;
        }
        
        if (hostname.includes('test') || hostname.includes('staging')) {
            return this.environments.TESTING;
        }
        
        if (hostname.includes('github.io') && !hostname.includes('dev') && !hostname.includes('test')) {
            return this.environments.PRODUCTION;
        }
        
        return null;
    }

    /**
     * Get current environment configuration
     */
    getCurrentConfig() {
        return this.configs[this.currentEnvironment];
    }

    /**
     * Switch to a different environment
     */
    async switchEnvironment(newEnvironment, options = {}) {
        if (!this.environments[newEnvironment.toUpperCase()]) {
            throw new Error(`Invalid environment: ${newEnvironment}`);
        }
        
        const targetEnv = this.environments[newEnvironment.toUpperCase()];
        
        if (targetEnv === this.currentEnvironment) {
            console.log('Already in target environment');
            return;
        }
        
        // Show confirmation dialog unless bypassed
        if (!options.skipConfirmation) {
            const confirmed = await this.showSwitchConfirmation(targetEnv);
            if (!confirmed) {
                return false;
            }
        }
        
        try {
            // Clear local data
            await this.clearEnvironmentData();
            
            // Update current environment
            const oldEnvironment = this.currentEnvironment;
            this.currentEnvironment = targetEnv;
            
            // Update UI
            this.updateEnvironmentUI();
            
            // Notify listeners
            this.notifyEnvironmentChange(oldEnvironment, targetEnv);
            
            // Save configuration
            await this.saveEnvironmentConfig();
            
            console.log(`🔄 Environment switched from ${oldEnvironment} to ${targetEnv}`);
            
            // Show success message
            this.showEnvironmentMessage(`Switched to ${this.getCurrentConfig().name} environment`, 'success');
            
            return true;
            
        } catch (error) {
            console.error('Failed to switch environment:', error);
            this.showEnvironmentMessage('Failed to switch environment', 'error');
            throw error;
        }
    }

    /**
     * Clear environment-specific data
     */
    async clearEnvironmentData() {
        try {
            // Clear IndexedDB data
            if (window.StorageManager) {
                await window.StorageManager.clearAllData();
            }
            
            // Clear relevant localStorage items (but keep environment config)
            const keysToKeep = ['environmentConfig'];
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && !keysToKeep.includes(key)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
        } catch (error) {
            console.error('Failed to clear environment data:', error);
        }
    }

    /**
     * Setup environment UI indicators
     */
    setupEnvironmentUI() {
        this.createEnvironmentBadge();
        this.createEnvironmentSwitcher();
        this.updateEnvironmentUI();
    }

    /**
     * Create environment badge
     */
    createEnvironmentBadge() {
        // Remove existing badge
        const existingBadge = document.getElementById('environmentBadge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        const config = this.getCurrentConfig();
        const badge = document.createElement('div');
        badge.id = 'environmentBadge';
        badge.className = 'environment-badge';
        badge.textContent = config.shortName;
        badge.title = `Current Environment: ${config.name}`;
        
        badge.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: ${config.color};
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            font-family: monospace;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        `;
        
        // Add hover effect
        badge.addEventListener('mouseenter', () => {
            badge.style.transform = 'scale(1.1)';
        });
        
        badge.addEventListener('mouseleave', () => {
            badge.style.transform = 'scale(1)';
        });
        
        // Click to show environment switcher
        badge.addEventListener('click', () => {
            this.showEnvironmentSwitcher();
        });
        
        document.body.appendChild(badge);
    }

    /**
     * Create environment switcher modal
     */
    createEnvironmentSwitcher() {
        // Remove existing switcher
        const existingSwitcher = document.getElementById('environmentSwitcher');
        if (existingSwitcher) {
            existingSwitcher.remove();
        }
        
        const switcher = document.createElement('div');
        switcher.id = 'environmentSwitcher';
        switcher.className = 'environment-switcher';
        switcher.style.display = 'none';
        
        switcher.innerHTML = `
            <div class="environment-switcher-overlay"></div>
            <div class="environment-switcher-modal">
                <div class="environment-switcher-header">
                    <h3>🌍 Environment Settings</h3>
                    <button class="environment-switcher-close" type="button">✕</button>
                </div>
                <div class="environment-switcher-content">
                    <div class="current-environment">
                        <strong>Current Environment:</strong>
                        <span class="current-env-name">${this.getCurrentConfig().name}</span>
                        <span class="current-env-badge" style="background: ${this.getCurrentConfig().color}">${this.getCurrentConfig().shortName}</span>
                    </div>
                    
                    <div class="environment-options">
                        <h4>Switch Environment:</h4>
                        <div class="environment-grid">
                            ${Object.values(this.environments).map(env => {
                                const config = this.configs[env];
                                const isCurrent = env === this.currentEnvironment;
                                return `
                                    <button class="environment-option ${isCurrent ? 'current' : ''}" 
                                            data-environment="${env}"
                                            ${isCurrent ? 'disabled' : ''}>
                                        <div class="env-badge" style="background: ${config.color}">${config.shortName}</div>
                                        <div class="env-name">${config.name}</div>
                                        <div class="env-description">
                                            ${env === 'development' ? 'Local testing & development' : 
                                              env === 'testing' ? 'Staging & pre-production' : 
                                              'Live production environment'}
                                        </div>
                                        ${isCurrent ? '<div class="env-current">Current</div>' : ''}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="environment-config">
                        <h4>Configuration:</h4>
                        <div class="config-item">
                            <label>Google Sheets ID (${this.getCurrentConfig().shortName}):</label>
                            <input type="text" id="googleSheetsId" 
                                   value="${this.getCurrentConfig().googleSheets.spreadsheetId}"
                                   placeholder="Enter Google Sheets ID for this environment">
                        </div>
                    </div>
                    
                    <div class="environment-actions">
                        <button class="btn btn-secondary" id="saveEnvironmentConfig">Save Configuration</button>
                        <button class="btn btn-secondary" id="validateEnvironment">Validate Environment</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(switcher);
        this.setupEnvironmentSwitcherEvents(switcher);
    }

    /**
     * Setup environment switcher event listeners
     */
    setupEnvironmentSwitcherEvents(switcher) {
        // Close button
        const closeBtn = switcher.querySelector('.environment-switcher-close');
        const overlay = switcher.querySelector('.environment-switcher-overlay');
        
        closeBtn.addEventListener('click', () => this.hideEnvironmentSwitcher());
        overlay.addEventListener('click', () => this.hideEnvironmentSwitcher());
        
        // Environment option buttons
        switcher.querySelectorAll('.environment-option:not(.current)').forEach(btn => {
            btn.addEventListener('click', () => {
                const env = btn.dataset.environment;
                this.switchEnvironment(env);
                this.hideEnvironmentSwitcher();
            });
        });
        
        // Save configuration
        const saveBtn = switcher.querySelector('#saveEnvironmentConfig');
        saveBtn.addEventListener('click', () => this.saveCurrentEnvironmentConfig());
        
        // Validate environment
        const validateBtn = switcher.querySelector('#validateEnvironment');
        validateBtn.addEventListener('click', () => this.validateCurrentEnvironment());
    }

    /**
     * Show environment switcher modal
     */
    showEnvironmentSwitcher() {
        const switcher = document.getElementById('environmentSwitcher');
        if (switcher) {
            switcher.style.display = 'block';
            
            // Update Google Sheets ID input
            const input = switcher.querySelector('#googleSheetsId');
            if (input) {
                input.value = this.getCurrentConfig().googleSheets.spreadsheetId;
            }
        }
    }

    /**
     * Hide environment switcher modal
     */
    hideEnvironmentSwitcher() {
        const switcher = document.getElementById('environmentSwitcher');
        if (switcher) {
            switcher.style.display = 'none';
        }
    }

    /**
     * Save current environment configuration
     */
    async saveCurrentEnvironmentConfig() {
        try {
            const switcher = document.getElementById('environmentSwitcher');
            const googleSheetsId = switcher.querySelector('#googleSheetsId').value.trim();
            
            // Update configuration
            this.configs[this.currentEnvironment].googleSheets.spreadsheetId = googleSheetsId;
            
            // Save to storage
            await this.saveEnvironmentConfig();
            
            this.showEnvironmentMessage('Configuration saved successfully', 'success');
            
        } catch (error) {
            console.error('Failed to save configuration:', error);
            this.showEnvironmentMessage('Failed to save configuration', 'error');
        }
    }

    /**
     * Validate current environment
     */
    async validateCurrentEnvironment() {
        try {
            const isValid = await this.validateEnvironment();
            
            if (isValid) {
                this.showEnvironmentMessage('Environment validation passed', 'success');
            } else {
                this.showEnvironmentMessage('Environment validation failed - check console for details', 'warning');
            }
            
        } catch (error) {
            console.error('Environment validation error:', error);
            this.showEnvironmentMessage('Environment validation error', 'error');
        }
    }

    /**
     * Update environment UI elements
     */
    updateEnvironmentUI() {
        // Update badge
        const badge = document.getElementById('environmentBadge');
        if (badge) {
            const config = this.getCurrentConfig();
            badge.textContent = config.shortName;
            badge.title = `Current Environment: ${config.name}`;
            badge.style.background = config.color;
        }
        
        // Update body class for environment-specific styling
        document.body.className = document.body.className.replace(/env-\w+/g, '');
        document.body.classList.add(`env-${this.currentEnvironment}`);
        
        // Update any environment-specific UI elements
        this.updateEnvironmentSpecificUI();
    }

    /**
     * Update environment-specific UI elements
     */
    updateEnvironmentSpecificUI() {
        const config = this.getCurrentConfig();
        
        // Update header background for non-production environments
        if (this.currentEnvironment !== this.environments.PRODUCTION) {
            const header = document.querySelector('.app-header');
            if (header) {
                header.style.borderBottom = `3px solid ${config.color}`;
            }
        }
        
        // Show/hide debug features
        const debugElements = document.querySelectorAll('.debug-only');
        debugElements.forEach(el => {
            el.style.display = config.features.debugMode ? 'block' : 'none';
        });
    }

    /**
     * Show environment switch confirmation dialog
     */
    async showSwitchConfirmation(targetEnvironment) {
        const config = this.configs[targetEnvironment];
        
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'environment-confirmation-modal';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <h3>⚠️ Switch Environment</h3>
                    <p>You are about to switch to <strong>${config.name}</strong> environment.</p>
                    <div class="warning-list">
                        <p><strong>This will:</strong></p>
                        <ul>
                            <li>Clear all local data and cache</li>
                            <li>Disconnect from current Google Sheets</li>
                            <li>Require re-authentication</li>
                            <li>Reset all unsaved changes</li>
                        </ul>
                    </div>
                    ${targetEnvironment === this.environments.PRODUCTION ? 
                        '<div class="production-warning">⚠️ <strong>Production Environment</strong> - Live data will be affected!</div>' : 
                        ''}
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancelSwitch">Cancel</button>
                        <button class="btn btn-primary" id="confirmSwitch">Switch to ${config.shortName}</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const cancelBtn = modal.querySelector('#cancelSwitch');
            const confirmBtn = modal.querySelector('#confirmSwitch');
            const overlay = modal.querySelector('.modal-overlay');
            
            const cleanup = () => {
                document.body.removeChild(modal);
            };
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
            
            overlay.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
        });
    }

    /**
     * Show environment warnings
     */
    showEnvironmentWarnings(issues) {
        // Remove any existing environment warning banner
        const existingBanner = document.getElementById('environmentWarningBanner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const warningContainer = document.createElement('div');
        warningContainer.id = 'environmentWarningBanner';
        warningContainer.className = 'environment-warnings';
        
        warningContainer.style.cssText = `
            position: relative;
            width: 100%;
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            color: #856404;
            padding: 8px 0;
            border-bottom: 1px solid #ffc107;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        warningContainer.innerHTML = `
            <div class="banner-content" style="display: flex; align-items: center; gap: 12px; max-width: 1200px; margin: 0 auto; padding: 0 1rem;">
                <div class="banner-icon" style="font-size: 24px;">⚠️</div>
                <div class="banner-title" style="font-weight: 600; font-size: 16px; flex: 1;">
                    Environment Configuration Issues
                </div>
                <div class="banner-actions" style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <button class="banner-btn banner-btn-primary" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; background: #007bff; color: white; transition: all 0.2s ease;" onclick="window.EnvironmentManager.showEnvironmentSwitcher()">
                        🔧 Configure
                    </button>
                    <button class="banner-btn banner-btn-dismiss" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; background: transparent; color: #856404; opacity: 0.7; transition: all 0.2s ease;">
                        ✕ Dismiss
                    </button>
                </div>
            </div>
        `;
        
        // Insert banner at the top of the app container, after any existing banners
        const appContainer = document.querySelector('.app-container');
        const existingGoogleBanner = document.getElementById('googleSheetsSetupBanner');
        
        if (appContainer) {
            if (existingGoogleBanner) {
                // Insert after Google Sheets banner
                existingGoogleBanner.insertAdjacentElement('afterend', warningContainer);
            } else {
                // Insert at the beginning of app container
                appContainer.insertBefore(warningContainer, appContainer.firstChild);
            }
        } else {
            // Fallback: insert at beginning of body
            document.body.insertBefore(warningContainer, document.body.firstChild);
        }
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (warningContainer.parentNode) {
                warningContainer.parentNode.removeChild(warningContainer);
            }
        }, 15000);
        
        // Dismiss button
        const dismissBtn = warningContainer.querySelector('.banner-btn-dismiss');
        dismissBtn.addEventListener('click', () => {
            warningContainer.parentNode.removeChild(warningContainer);
        });

        // Add hover effects
        const primaryBtn = warningContainer.querySelector('.banner-btn-primary');
        primaryBtn.addEventListener('mouseenter', () => {
            primaryBtn.style.background = '#0056b3';
            primaryBtn.style.transform = 'translateY(-1px)';
        });
        primaryBtn.addEventListener('mouseleave', () => {
            primaryBtn.style.background = '#007bff';
            primaryBtn.style.transform = 'translateY(0)';
        });

        dismissBtn.addEventListener('mouseenter', () => {
            dismissBtn.style.opacity = '1';
            dismissBtn.style.background = 'rgba(133, 100, 4, 0.1)';
        });
        dismissBtn.addEventListener('mouseleave', () => {
            dismissBtn.style.opacity = '0.7';
            dismissBtn.style.background = 'transparent';
        });
    }

    /**
     * Show environment message
     */
    showEnvironmentMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `environment-message ${type}`;
        messageEl.textContent = message;
        
        const colors = {
            success: '#d4edda',
            error: '#f8d7da',
            warning: '#fff3cd',
            info: '#d1ecf1'
        };
        
        messageEl.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            background: ${colors[type]};
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 9999;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for environment changes from other components
        window.addEventListener('environmentChange', (e) => {
            this.handleEnvironmentChangeRequest(e.detail);
        });
        
        // Listen for configuration updates
        window.addEventListener('configurationUpdate', (e) => {
            this.handleConfigurationUpdate(e.detail);
        });
    }

    /**
     * Handle environment change request
     */
    async handleEnvironmentChangeRequest(detail) {
        try {
            await this.switchEnvironment(detail.environment, detail.options);
        } catch (error) {
            console.error('Failed to handle environment change request:', error);
        }
    }

    /**
     * Handle configuration update
     */
    handleConfigurationUpdate(detail) {
        if (detail.environment && this.configs[detail.environment]) {
            this.configs[detail.environment] = { ...this.configs[detail.environment], ...detail.config };
            this.saveEnvironmentConfig();
        }
    }

    /**
     * Add environment change listener
     */
    addEnvironmentChangeListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove environment change listener
     */
    removeEnvironmentChangeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify environment change listeners
     */
    notifyEnvironmentChange(oldEnvironment, newEnvironment) {
        const event = {
            oldEnvironment,
            newEnvironment,
            config: this.getCurrentConfig()
        };
        
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in environment change listener:', error);
            }
        });
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('environmentChanged', { detail: event }));
    }

    /**
     * Get environment-specific Google Sheets configuration
     */
    getGoogleSheetsConfig() {
        const config = this.getCurrentConfig();
        return {
            spreadsheetId: config.googleSheets.spreadsheetId,
            sheetPrefix: config.googleSheets.sheetPrefix,
            environment: this.currentEnvironment
        };
    }

    /**
     * Check if environment mismatch exists
     */
    checkEnvironmentMismatch() {
        const expected = this.detectExpectedEnvironment();
        return expected && expected !== this.currentEnvironment;
    }

    /**
     * Prevent data writes if environment mismatch detected
     */
    preventDataWrites() {
        if (this.checkEnvironmentMismatch()) {
            throw new Error('Environment mismatch detected - data writes prevented');
        }
    }
}

// Initialize environment manager when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.EnvironmentManager = new EnvironmentManager();
        console.log('✅ Environment Manager ready');
    } catch (error) {
        console.error('❌ Failed to initialize Environment Manager:', error);
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentManager;
}