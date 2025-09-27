/**
 * System Status Service
 * Provides real-time status indicators for sync, connectivity, and system health
 * Requirements: 4.2, 5.4, 10.3, 11.6
 */
class SystemStatus {
  constructor() {
    this.isInitialized = false;
    this.statusCheckers = new Map();
    this.statusHistory = [];
    this.maxHistoryEntries = 100;
    this.checkInterval = 30000; // 30 seconds
    this.intervalId = null;
    
    // Status categories
    this.categories = {
      CONNECTIVITY: 'connectivity',
      SYNC: 'sync',
      STORAGE: 'storage',
      AUTHENTICATION: 'authentication',
      ENVIRONMENT: 'environment',
      SCANNER: 'scanner'
    };
    
    // Status levels
    this.levels = {
      HEALTHY: 'healthy',
      WARNING: 'warning',
      ERROR: 'error',
      UNKNOWN: 'unknown'
    };
    
    // Current status
    this.currentStatus = {
      overall: this.levels.UNKNOWN,
      categories: {},
      lastCheck: null,
      details: {}
    };
    
    // Bind methods
    this.checkStatus = this.checkStatus.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
  }

  /**
   * Initialize system status monitoring
   */
  async init() {
    if (this.isInitialized) return true;

    try {
      // Register default status checkers
      this.registerDefaultCheckers();
      
      // Load status history
      await this.loadStatusHistory();
      
      // Perform initial status check
      await this.checkAllStatus();
      
      // Start periodic status checks
      this.startPeriodicChecks();
      
      // Set up UI updates
      this.setupStatusUI();
      
      this.isInitialized = true;
      console.log('SystemStatus initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize SystemStatus:', error);
      return false;
    }
  }

  /**
   * Register default status checkers
   */
  registerDefaultCheckers() {
    // Connectivity checker
    this.registerChecker(this.categories.CONNECTIVITY, async () => {
      try {
        // Check internet connectivity
        const online = navigator.onLine;
        if (!online) {
          return {
            level: this.levels.ERROR,
            message: 'No internet connection',
            details: { online: false }
          };
        }
        
        // Test actual connectivity with a lightweight request
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        
        return {
          level: this.levels.HEALTHY,
          message: 'Internet connection active',
          details: { online: true, tested: true }
        };
        
      } catch (error) {
        return {
          level: this.levels.WARNING,
          message: 'Internet connection may be limited',
          details: { online: navigator.onLine, error: error.message }
        };
      }
    });
    
    // Storage checker
    this.registerChecker(this.categories.STORAGE, async () => {
      try {
        // Check localStorage availability
        const testKey = 'vat_storage_test';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        // Check storage quota
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          const usedMB = Math.round((estimate.usage || 0) / 1024 / 1024);
          const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
          const usagePercent = quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0;
          
          if (usagePercent > 90) {
            return {
              level: this.levels.ERROR,
              message: `Storage almost full (${usagePercent.toFixed(1)}%)`,
              details: { usedMB, quotaMB, usagePercent }
            };
          } else if (usagePercent > 75) {
            return {
              level: this.levels.WARNING,
              message: `Storage usage high (${usagePercent.toFixed(1)}%)`,
              details: { usedMB, quotaMB, usagePercent }
            };
          }
          
          return {
            level: this.levels.HEALTHY,
            message: `Storage available (${usagePercent.toFixed(1)}% used)`,
            details: { usedMB, quotaMB, usagePercent }
          };
        }
        
        return {
          level: this.levels.HEALTHY,
          message: 'Local storage available',
          details: { available: true }
        };
        
      } catch (error) {
        return {
          level: this.levels.ERROR,
          message: 'Storage not available',
          details: { error: error.message }
        };
      }
    });
    
    // Authentication checker
    this.registerChecker(this.categories.AUTHENTICATION, async () => {
      try {
        if (!window.AuthManager) {
          return {
            level: this.levels.UNKNOWN,
            message: 'Authentication system not available',
            details: { available: false }
          };
        }
        
        const isAuthenticated = window.AuthManager.isAuthenticatedUser();
        
        if (isAuthenticated) {
          return {
            level: this.levels.HEALTHY,
            message: 'User authenticated',
            details: { authenticated: true }
          };
        } else {
          return {
            level: this.levels.WARNING,
            message: 'User not authenticated',
            details: { authenticated: false }
          };
        }
        
      } catch (error) {
        return {
          level: this.levels.ERROR,
          message: 'Authentication check failed',
          details: { error: error.message }
        };
      }
    });
    
    // Sync checker
    this.registerChecker(this.categories.SYNC, async () => {
      try {
        if (!window.SyncManager) {
          return {
            level: this.levels.UNKNOWN,
            message: 'Sync system not available',
            details: { available: false }
          };
        }
        
        const syncManager = window.SyncManager;
        const isEnabled = syncManager.isEnabled;
        const isOnline = syncManager.isOnline;
        const isSyncing = syncManager.isSyncing;
        const lastSync = syncManager.lastSync?.timestamp;
        
        // Check configuration state using simplified logic
        const syncEnabled = window.Config?.sync?.enabled;
        const isAuthenticated = window.AuthManager?.isAuthenticatedUser();
        const sheetsReady = window.SheetsManager?.isInitialized;
        
        // Provide detailed status based on simplified logic
        if (!syncEnabled) {
          return {
            level: this.levels.WARNING,
            message: 'Sync disabled in settings',
            details: { 
              enabled: false, 
              reason: 'config_disabled',
              syncEnabled: syncEnabled,
              authenticated: isAuthenticated,
              sheetsReady: sheetsReady
            }
          };
        }
        
        if (!isAuthenticated) {
          return {
            level: this.levels.WARNING,
            message: 'Not authenticated with Google',
            details: { 
              enabled: false, 
              reason: 'not_authenticated',
              syncEnabled: syncEnabled,
              authenticated: isAuthenticated,
              sheetsReady: sheetsReady
            }
          };
        }
        
        if (!sheetsReady) {
          return {
            level: this.levels.WARNING,
            message: 'Google Sheets not initialized',
            details: { 
              enabled: false, 
              reason: 'sheets_not_ready',
              syncEnabled: syncEnabled,
              authenticated: isAuthenticated,
              sheetsReady: sheetsReady
            }
          };
        }
        
        if (!isEnabled) {
          return {
            level: this.levels.WARNING,
            message: 'Sync disabled (unknown reason)',
            details: { 
              enabled: false,
              reason: 'manager_disabled',
              syncEnabled: syncEnabled,
              authenticated: isAuthenticated,
              sheetsReady: sheetsReady
            }
          };
        }
        
        if (isSyncing) {
          return {
            level: this.levels.HEALTHY,
            message: 'Sync in progress',
            details: { enabled: true, syncing: true }
          };
        }
        
        if (!isOnline) {
          return {
            level: this.levels.ERROR,
            message: 'Sync offline',
            details: { enabled: true, online: false }
          };
        }
        
        // Check last sync time
        if (lastSync) {
          const lastSyncDate = new Date(lastSync);
          const now = new Date();
          const hoursSinceSync = (now - lastSyncDate) / (1000 * 60 * 60);
          
          if (hoursSinceSync > 24) {
            return {
              level: this.levels.WARNING,
              message: `Last sync ${Math.round(hoursSinceSync)}h ago`,
              details: { enabled: true, online: true, hoursSinceSync }
            };
          }
        }
        
        return {
          level: this.levels.HEALTHY,
          message: 'Sync active',
          details: { enabled: true, online: true, lastSync }
        };
        
      } catch (error) {
        return {
          level: this.levels.ERROR,
          message: 'Sync check failed',
          details: { error: error.message }
        };
      }
    });
    
    // Environment checker
    this.registerChecker(this.categories.ENVIRONMENT, async () => {
      try {
        if (!window.Config) {
          return {
            level: this.levels.ERROR,
            message: 'Configuration not available',
            details: { available: false }
          };
        }
        
        const environment = window.Config.environment || 'unknown';
        const isProduction = environment.toLowerCase() === 'production';
        
        // Check for environment mismatches
        const hostname = window.location.hostname;
        const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
        
        if (isProduction && isLocalhost) {
          return {
            level: this.levels.ERROR,
            message: 'Environment mismatch: Production config on localhost',
            details: { environment, hostname, mismatch: true }
          };
        }
        
        return {
          level: this.levels.HEALTHY,
          message: `Environment: ${environment}`,
          details: { environment, hostname }
        };
        
      } catch (error) {
        return {
          level: this.levels.ERROR,
          message: 'Environment check failed',
          details: { error: error.message }
        };
      }
    });
    
    // Scanner checker
    this.registerChecker(this.categories.SCANNER, async () => {
      try {
        if (!window.Scanner) {
          return {
            level: this.levels.UNKNOWN,
            message: 'Scanner not available',
            details: { available: false }
          };
        }
        
        const isEnabled = window.Scanner.isEnabled;
        const currentEvent = window.Scanner.currentEvent;
        
        if (!currentEvent) {
          return {
            level: this.levels.WARNING,
            message: 'No active event for scanning',
            details: { enabled: isEnabled, hasEvent: false }
          };
        }
        
        if (!isEnabled) {
          return {
            level: this.levels.WARNING,
            message: 'Scanner disabled',
            details: { enabled: false, hasEvent: true }
          };
        }
        
        return {
          level: this.levels.HEALTHY,
          message: 'Scanner ready',
          details: { enabled: true, hasEvent: true, eventName: currentEvent.name }
        };
        
      } catch (error) {
        return {
          level: this.levels.ERROR,
          message: 'Scanner check failed',
          details: { error: error.message }
        };
      }
    });
  }

  /**
   * Register a status checker
   * @param {string} category - Status category
   * @param {Function} checker - Async function that returns status
   */
  registerChecker(category, checker) {
    this.statusCheckers.set(category, checker);
  }

  /**
   * Check all status categories
   */
  async checkAllStatus() {
    const results = {};
    
    for (const [category, checker] of this.statusCheckers.entries()) {
      try {
        results[category] = await checker();
      } catch (error) {
        results[category] = {
          level: this.levels.ERROR,
          message: `Status check failed: ${error.message}`,
          details: { error: error.message }
        };
      }
    }
    
    // Calculate overall status
    const overallLevel = this.calculateOverallStatus(results);
    
    // Update current status
    this.currentStatus = {
      overall: overallLevel,
      categories: results,
      lastCheck: new Date().toISOString(),
      details: this.generateStatusSummary(results)
    };
    
    // Add to history
    this.addToHistory(this.currentStatus);
    
    // Save to storage
    await this.saveStatusHistory();
    
    // Emit status update event
    Utils.Event.emit('systemStatusUpdated', {
      status: this.currentStatus,
      timestamp: new Date().toISOString()
    });
    
    // Update UI
    this.updateStatusUI();
    
    return this.currentStatus;
  }

  /**
   * Check specific status category
   */
  async checkStatus(category) {
    const checker = this.statusCheckers.get(category);
    if (!checker) {
      throw new Error(`No status checker registered for category: ${category}`);
    }
    
    try {
      const result = await checker();
      
      // Update current status for this category
      this.currentStatus.categories[category] = result;
      this.currentStatus.overall = this.calculateOverallStatus(this.currentStatus.categories);
      this.currentStatus.lastCheck = new Date().toISOString();
      
      // Emit category-specific update
      Utils.Event.emit('categoryStatusUpdated', {
        category,
        status: result,
        timestamp: new Date().toISOString()
      });
      
      return result;
      
    } catch (error) {
      const errorResult = {
        level: this.levels.ERROR,
        message: `Status check failed: ${error.message}`,
        details: { error: error.message }
      };
      
      this.currentStatus.categories[category] = errorResult;
      return errorResult;
    }
  }

  /**
   * Calculate overall system status
   */
  calculateOverallStatus(categoryResults) {
    const levels = Object.values(categoryResults).map(result => result.level);
    
    if (levels.includes(this.levels.ERROR)) {
      return this.levels.ERROR;
    }
    
    if (levels.includes(this.levels.WARNING)) {
      return this.levels.WARNING;
    }
    
    if (levels.includes(this.levels.UNKNOWN)) {
      return this.levels.UNKNOWN;
    }
    
    return this.levels.HEALTHY;
  }

  /**
   * Generate status summary
   */
  generateStatusSummary(categoryResults) {
    const summary = {
      healthyCount: 0,
      warningCount: 0,
      errorCount: 0,
      unknownCount: 0,
      totalChecks: Object.keys(categoryResults).length
    };
    
    Object.values(categoryResults).forEach(result => {
      switch (result.level) {
        case this.levels.HEALTHY:
          summary.healthyCount++;
          break;
        case this.levels.WARNING:
          summary.warningCount++;
          break;
        case this.levels.ERROR:
          summary.errorCount++;
          break;
        case this.levels.UNKNOWN:
          summary.unknownCount++;
          break;
      }
    });
    
    return summary;
  }

  /**
   * Add status to history
   */
  addToHistory(status) {
    this.statusHistory.push({
      ...status,
      timestamp: new Date().toISOString()
    });
    
    // Keep history size manageable
    if (this.statusHistory.length > this.maxHistoryEntries) {
      this.statusHistory = this.statusHistory.slice(-this.maxHistoryEntries);
    }
  }

  /**
   * Start periodic status checks
   */
  startPeriodicChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = setInterval(() => {
      this.checkAllStatus().catch(error => {
        console.error('Periodic status check failed:', error);
      });
    }, this.checkInterval);
    
    console.log(`Started periodic status checks every ${this.checkInterval}ms`);
  }

  /**
   * Stop periodic status checks
   */
  stopPeriodicChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Update status UI elements
   */
  updateStatusUI() {
    // Update overall status indicator
    this.updateOverallStatusIndicator();
    
    // Update category indicators
    Object.entries(this.currentStatus.categories).forEach(([category, status]) => {
      this.updateCategoryIndicator(category, status);
    });
    
    // Update status dashboard if visible
    this.updateStatusDashboard();
  }

  /**
   * Update overall status indicator
   */
  updateOverallStatusIndicator() {
    const indicator = document.querySelector('.system-status-indicator');
    if (!indicator) return;
    
    const { overall, details } = this.currentStatus;
    
    // Update indicator class
    indicator.className = `system-status-indicator status-${overall}`;
    
    // Update indicator content
    const icon = this.getStatusIcon(overall);
    const message = this.getOverallStatusMessage(overall, details);
    
    indicator.innerHTML = `
      <span class="status-icon">${icon}</span>
      <span class="status-message">${message}</span>
    `;
    
    // Update tooltip
    indicator.title = this.generateStatusTooltip();
  }

  /**
   * Update category status indicator
   */
  updateCategoryIndicator(category, status) {
    const indicator = document.querySelector(`.status-${category}`);
    if (!indicator) return;
    
    indicator.className = `status-indicator status-${category} level-${status.level}`;
    indicator.textContent = status.message;
    indicator.title = JSON.stringify(status.details, null, 2);
  }

  /**
   * Update status dashboard
   */
  updateStatusDashboard() {
    const dashboard = document.querySelector('.system-status-dashboard');
    if (!dashboard) return;
    
    const { categories, overall, lastCheck, details } = this.currentStatus;
    
    dashboard.innerHTML = `
      <div class="status-dashboard-header">
        <h3>System Status</h3>
        <div class="overall-status status-${overall}">
          ${this.getStatusIcon(overall)} ${this.getOverallStatusMessage(overall, details)}
        </div>
        <div class="last-check">Last checked: ${Utils.Date.format(lastCheck, 'time')}</div>
      </div>
      
      <div class="status-categories">
        ${Object.entries(categories).map(([category, status]) => `
          <div class="status-category level-${status.level}">
            <div class="category-header">
              <span class="category-name">${this.getCategoryDisplayName(category)}</span>
              <span class="category-status">${this.getStatusIcon(status.level)}</span>
            </div>
            <div class="category-message">${status.message}</div>
            ${status.details ? `
              <details class="category-details">
                <summary>Details</summary>
                <pre>${JSON.stringify(status.details, null, 2)}</pre>
              </details>
            ` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="status-actions">
        <button onclick="window.SystemStatus.checkAllStatus()" class="btn btn-sm">
          Refresh Status
        </button>
        <button onclick="window.SystemStatus.showStatusHistory()" class="btn btn-sm btn-secondary">
          View History
        </button>
      </div>
    `;
  }

  /**
   * Get status icon
   */
  getStatusIcon(level) {
    const icons = {
      [this.levels.HEALTHY]: '🟢',
      [this.levels.WARNING]: '🟡',
      [this.levels.ERROR]: '🔴',
      [this.levels.UNKNOWN]: '⚪'
    };
    
    return icons[level] || '❓';
  }

  /**
   * Get overall status message
   */
  getOverallStatusMessage(level, details) {
    switch (level) {
      case this.levels.HEALTHY:
        return 'All systems operational';
      case this.levels.WARNING:
        return `${details.warningCount} warning(s)`;
      case this.levels.ERROR:
        return `${details.errorCount} error(s)`;
      case this.levels.UNKNOWN:
        return 'Status unknown';
      default:
        return 'Status unavailable';
    }
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category) {
    const names = {
      [this.categories.CONNECTIVITY]: 'Connectivity',
      [this.categories.SYNC]: 'Data Sync',
      [this.categories.STORAGE]: 'Local Storage',
      [this.categories.AUTHENTICATION]: 'Authentication',
      [this.categories.ENVIRONMENT]: 'Environment',
      [this.categories.SCANNER]: 'Scanner'
    };
    
    return names[category] || category;
  }

  /**
   * Generate status tooltip
   */
  generateStatusTooltip() {
    const { categories, lastCheck } = this.currentStatus;
    
    const lines = [
      `Last checked: ${Utils.Date.format(lastCheck, 'datetime')}`,
      ''
    ];
    
    Object.entries(categories).forEach(([category, status]) => {
      lines.push(`${this.getCategoryDisplayName(category)}: ${status.message}`);
    });
    
    return lines.join('\n');
  }

  /**
   * Show status history modal
   */
  showStatusHistory() {
    if (!window.UI || !window.UI.Modal) {
      console.error('UI.Modal not available');
      return;
    }
    
    const historyHTML = `
      <div class="status-history">
        <div class="history-controls">
          <button onclick="window.SystemStatus.exportStatusHistory()" class="btn btn-sm">
            Export History
          </button>
          <button onclick="window.SystemStatus.clearStatusHistory()" class="btn btn-sm btn-danger">
            Clear History
          </button>
        </div>
        
        <div class="history-list">
          ${this.statusHistory.slice(-20).reverse().map(entry => `
            <div class="history-entry status-${entry.overall}">
              <div class="entry-header">
                <span class="entry-time">${Utils.Date.format(entry.timestamp, 'datetime')}</span>
                <span class="entry-status">${this.getStatusIcon(entry.overall)} ${entry.overall}</span>
              </div>
              <div class="entry-summary">
                ${entry.details.errorCount > 0 ? `${entry.details.errorCount} errors, ` : ''}
                ${entry.details.warningCount > 0 ? `${entry.details.warningCount} warnings, ` : ''}
                ${entry.details.healthyCount} healthy
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    UI.Modal.show('System Status History', historyHTML, [
      {
        text: 'Close',
        class: 'btn-primary',
        handler: () => UI.Modal.hide()
      }
    ]);
  }

  /**
   * Load status history from storage
   */
  async loadStatusHistory() {
    try {
      const stored = await Storage.getItem('systemStatusHistory');
      if (stored && Array.isArray(stored)) {
        this.statusHistory = stored.slice(-this.maxHistoryEntries);
      }
    } catch (error) {
      console.error('Failed to load status history:', error);
      this.statusHistory = [];
    }
  }

  /**
   * Save status history to storage
   */
  async saveStatusHistory() {
    try {
      await Storage.setItem('systemStatusHistory', this.statusHistory);
    } catch (error) {
      console.error('Failed to save status history:', error);
    }
  }

  /**
   * Clear status history
   */
  async clearStatusHistory() {
    this.statusHistory = [];
    await Storage.removeItem('systemStatusHistory');
    console.log('Status history cleared');
  }

  /**
   * Export status history
   */
  exportStatusHistory() {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        currentStatus: this.currentStatus,
        history: this.statusHistory
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], 
        { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-status-${Utils.Date.format(new Date(), 'date')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to export status history:', error);
    }
  }

  /**
   * Setup status UI elements
   */
  setupStatusUI() {
    // Inject status styles if not already present
    this.injectStatusStyles();
    
    // Create status indicator if not present
    this.createStatusIndicator();
  }

  /**
   * Create status indicator element
   */
  createStatusIndicator() {
    // Check if indicator already exists
    if (document.querySelector('.system-status-indicator')) return;
    
    // Find a good place to add the indicator
    const header = document.querySelector('header') || 
                  document.querySelector('.header') ||
                  document.querySelector('nav') ||
                  document.body;
    
    if (header) {
      const indicator = document.createElement('div');
      indicator.className = 'system-status-indicator';
      indicator.innerHTML = `
        <span class="status-icon">⚪</span>
        <span class="status-message">Checking status...</span>
      `;
      
      // Add click handler to show detailed status
      indicator.addEventListener('click', () => {
        this.showStatusDashboard();
      });
      
      header.appendChild(indicator);
    }
  }

  /**
   * Show status dashboard modal
   */
  showStatusDashboard() {
    if (!window.UI || !window.UI.Modal) {
      console.error('UI.Modal not available');
      return;
    }
    
    const dashboardHTML = '<div class="system-status-dashboard"></div>';
    
    UI.Modal.show('System Status', dashboardHTML, [
      {
        text: 'Refresh',
        class: 'btn-secondary',
        handler: () => {
          this.checkAllStatus();
        }
      },
      {
        text: 'Close',
        class: 'btn-primary',
        handler: () => UI.Modal.hide()
      }
    ]);
    
    // Update dashboard content
    this.updateStatusDashboard();
  }

  /**
   * Inject status styles
   */
  injectStatusStyles() {
    if (document.getElementById('systemStatusStyles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'systemStatusStyles';
    styles.textContent = `
      .system-status-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .system-status-indicator:hover {
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .system-status-indicator.status-healthy {
        border-color: #28a745;
      }
      
      .system-status-indicator.status-warning {
        border-color: #ffc107;
        background: rgba(255, 193, 7, 0.1);
      }
      
      .system-status-indicator.status-error {
        border-color: #dc3545;
        background: rgba(220, 53, 69, 0.1);
      }
      
      .system-status-dashboard {
        max-width: 600px;
      }
      
      .status-dashboard-header {
        margin-bottom: 20px;
        text-align: center;
      }
      
      .overall-status {
        font-size: 18px;
        font-weight: bold;
        margin: 10px 0;
      }
      
      .last-check {
        font-size: 12px;
        color: #666;
      }
      
      .status-categories {
        display: grid;
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .status-category {
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #f8f9fa;
      }
      
      .status-category.level-healthy {
        border-color: #28a745;
        background: rgba(40, 167, 69, 0.05);
      }
      
      .status-category.level-warning {
        border-color: #ffc107;
        background: rgba(255, 193, 7, 0.05);
      }
      
      .status-category.level-error {
        border-color: #dc3545;
        background: rgba(220, 53, 69, 0.05);
      }
      
      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      
      .category-name {
        font-weight: 600;
      }
      
      .category-message {
        font-size: 14px;
        color: #666;
      }
      
      .category-details {
        margin-top: 8px;
      }
      
      .category-details pre {
        font-size: 11px;
        background: #f1f1f1;
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
      }
      
      .status-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
      
      .status-history {
        max-width: 500px;
      }
      
      .history-controls {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        justify-content: center;
      }
      
      .history-list {
        max-height: 400px;
        overflow-y: auto;
      }
      
      .history-entry {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 8px;
      }
      
      .history-entry.status-healthy {
        border-left: 4px solid #28a745;
      }
      
      .history-entry.status-warning {
        border-left: 4px solid #ffc107;
      }
      
      .history-entry.status-error {
        border-left: 4px solid #dc3545;
      }
      
      .entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      
      .entry-time {
        font-size: 12px;
        color: #666;
      }
      
      .entry-summary {
        font-size: 12px;
        color: #888;
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Get current system status
   */
  getCurrentStatus() {
    return this.currentStatus;
  }

  /**
   * Get status for specific category
   */
  getCategoryStatus(category) {
    return this.currentStatus.categories[category] || null;
  }

  /**
   * Set check interval
   */
  setCheckInterval(intervalMs) {
    this.checkInterval = intervalMs;
    
    if (this.intervalId) {
      this.stopPeriodicChecks();
      this.startPeriodicChecks();
    }
  }

  /**
   * Update system status
   */
  updateStatus(category, status) {
    if (!this.status.categories) {
      this.status.categories = {};
    }
    
    this.status.categories[category] = status;
    this.status.lastCheck = new Date().toISOString();
    
    // Update overall status based on worst category status
    const levels = Object.values(this.status.categories).map(s => s.level);
    if (levels.includes(this.levels.CRITICAL)) {
      this.status.overall = this.levels.CRITICAL;
    } else if (levels.includes(this.levels.ERROR)) {
      this.status.overall = this.levels.ERROR;
    } else if (levels.includes(this.levels.WARNING)) {
      this.status.overall = this.levels.WARNING;
    } else if (levels.includes(this.levels.HEALTHY)) {
      this.status.overall = this.levels.HEALTHY;
    } else {
      this.status.overall = this.levels.UNKNOWN;
    }
  }
}

// Global instance
window.SystemStatus = new SystemStatus();