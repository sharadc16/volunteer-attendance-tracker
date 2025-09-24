/**
 * Sync Status UI Components
 * Manages real-time sync status display, progress indicators, and history
 */
window.SyncStatusUI = {
  
  // Current sync state
  state: {
    enabled: false,
    online: false,
    syncing: false,
    lastSync: null,
    currentOperation: null,
    progress: {
      phase: null,
      processed: 0,
      total: 0,
      percentage: 0
    },
    stats: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      uploadedRecords: 0,
      downloadedRecords: 0,
      conflictsResolved: 0,
      lastError: null
    }
  },
  
  // UI Elements cache
  elements: {
    statusIndicator: null,
    statusText: null,
    statusDot: null,
    progressBar: null,
    progressText: null,
    syncButton: null,
    historyModal: null,
    statsContainer: null
  },
  
  /**
   * Initialize sync status UI
   */
  init() {
    try {
      // Cache UI elements
      this.cacheElements();
      
      // Create progress bar if not exists
      this.createProgressBar();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize sync status listeners
      this.initializeSyncListeners();
      
      // Connect to centralized status manager
      this.connectToStatusManager();
      
      // Update initial state
      this.updateDisplay();
      
      console.log('SyncStatusUI initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize SyncStatusUI:', error);
      return false;
    }
  },
  
  /**
   * Connect to centralized status manager
   */
  connectToStatusManager() {
    if (window.StatusManager) {
      console.log('SyncStatusUI: Connecting to StatusManager');
      
      // Listen for sync status changes
      window.StatusManager.addEventListener('sync', (syncState) => {
        console.log('SyncStatusUI: Received sync status update:', syncState);
        this.state.enabled = syncState.enabled;
        this.state.online = syncState.online;
        this.state.syncing = syncState.syncing;
        this.state.lastSync = syncState.lastSync;
        this.updateDisplay();
      });
      
      // Listen for network status changes
      window.StatusManager.addEventListener('network', (networkState) => {
        this.updateDisplay();
      });
      
      // Listen for auth status changes
      window.StatusManager.addEventListener('auth', (authState) => {
        this.updateDisplay();
      });
      
      // Get initial state
      const currentState = window.StatusManager.getState();
      if (currentState) {
        this.state.enabled = currentState.sync.enabled;
        this.state.online = currentState.sync.online;
        this.state.syncing = currentState.sync.syncing;
        this.state.lastSync = currentState.sync.lastSync;
      }
    }
  },
  
  /**
   * Cache frequently used UI elements
   */
  cacheElements() {
    this.elements.statusIndicator = window.UIUtils.DOM.get('#syncStatus');
    this.elements.statusText = window.UIUtils.DOM.get('#syncStatus .status-text');
    this.elements.statusDot = window.UIUtils.DOM.get('#syncStatus .status-dot');
    this.elements.syncButton = window.UIUtils.DOM.get('#syncBtn');
    
    // Create elements if they don't exist
    if (!this.elements.statusIndicator) {
      this.createStatusIndicator();
    }
  },
  
  /**
   * Create sync status indicator if it doesn't exist
   */
  createStatusIndicator() {
    const scannerCard = document.querySelector('.scanner-card .card-header');
    if (!scannerCard) return;
    
    const statusIndicator = window.UIUtils.DOM.create('div', { className: 'sync-status' });
    statusIndicator.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-text">Offline</span>
      <button class="status-details-btn" title="View sync details">ℹ️</button>
    `;
    statusIndicator.id = 'syncStatus';
    
    scannerCard.appendChild(statusIndicator);
    
    // Update cache
    this.elements.statusIndicator = statusIndicator;
    this.elements.statusText = statusIndicator.querySelector('.status-text');
    this.elements.statusDot = statusIndicator.querySelector('.status-dot');
    
    // Add click handler for details
    const detailsBtn = statusIndicator.querySelector('.status-details-btn');
    if (detailsBtn) {
      detailsBtn.onclick = () => this.showSyncDetails();
    }
  },
  
  /**
   * Create progress bar for sync operations
   */
  createProgressBar() {
    const statusIndicator = this.elements.statusIndicator;
    if (!statusIndicator) return;
    
    // Check if progress bar already exists
    if (statusIndicator.querySelector('.sync-progress')) return;
    
    const progressContainer = window.UIUtils.DOM.create('div', { className: 'sync-progress hidden' });
    progressContainer.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <div class="progress-text">Preparing...</div>
    `;
    
    statusIndicator.appendChild(progressContainer);
    
    // Cache elements
    this.elements.progressBar = progressContainer.querySelector('.progress-fill');
    this.elements.progressText = progressContainer.querySelector('.progress-text');
  },
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Sync button click
    if (this.elements.syncButton) {
      this.elements.syncButton.onclick = () => this.handleSyncButtonClick();
    }
    
    // Status indicator click for details
    if (this.elements.statusIndicator) {
      this.elements.statusIndicator.onclick = (e) => {
        if (!e.target.classList.contains('status-details-btn')) {
          this.showSyncDetails();
        }
      };
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            this.handleSyncButtonClick();
            break;
          case 'h':
            if (e.shiftKey) {
              e.preventDefault();
              this.showSyncHistory();
            }
            break;
        }
      }
    });
  },
  
  /**
   * Initialize sync event listeners
   */
  initializeSyncListeners() {
    // Listen for sync manager events
    if (window.SyncManager) {
      window.SyncManager.addListener('statusUpdate', (data) => {
        this.updateState(data);
        this.updateDisplay();
      });
      
      window.SyncManager.addListener('syncStarted', (data) => {
        this.state.syncing = true;
        this.state.currentOperation = 'sync';
        this.showProgress('Initializing sync...', 0);
        this.updateDisplay();
        
        // Add to history
        this.addHistoryEntry({
          type: 'sync',
          status: 'started',
          timestamp: data.timestamp
        });
      });
      
      window.SyncManager.addListener('syncCompleted', (data) => {
        this.state.syncing = false;
        this.state.currentOperation = null;
        this.state.lastSync = new Date().toISOString();
        this.updateStats(data);
        this.hideProgress();
        this.updateDisplay();
        this.showSyncNotification('Sync completed successfully', 'success');
        
        // Add to history
        this.addHistoryEntry({
          type: 'sync',
          status: 'completed',
          success: true,
          duration: data.duration,
          uploaded: Object.values(data.uploaded || {}).reduce((a, b) => a + b, 0),
          downloaded: Object.values(data.downloaded || {}).reduce((a, b) => a + b, 0),
          conflicts: data.conflicts?.length || 0,
          details: data
        });
      });
      
      window.SyncManager.addListener('syncFailed', (data) => {
        this.state.syncing = false;
        this.state.currentOperation = null;
        this.state.stats.lastError = data.error;
        this.hideProgress();
        this.updateDisplay();
        this.showSyncNotification(`Sync failed: ${data.error}`, 'error');
        
        // Add to history
        this.addHistoryEntry({
          type: 'sync',
          status: 'failed',
          success: false,
          error: data.error,
          details: data
        });
      });
      
      // Enhanced progress tracking listeners
      window.SyncManager.addListener('uploadStarted', (data) => {
        this.showProgress(`Uploading ${data.dataType}...`, 0);
      });
      
      window.SyncManager.addListener('uploadProgress', (data) => {
        const percentage = data.total ? Math.round((data.processed / data.total) * 100) : null;
        const message = data.total ? 
          `Uploading ${data.dataType}: ${data.processed}/${data.total}` :
          `Uploading ${data.dataType}...`;
        this.showProgress(message, percentage);
      });
      
      window.SyncManager.addListener('downloadStarted', (data) => {
        this.showProgress(`Downloading ${data.dataType}...`, 0);
      });
      
      window.SyncManager.addListener('downloadProgress', (data) => {
        if (data.total) {
          const percentage = Math.round((data.processed / data.total) * 100);
          this.showProgress(`Processing ${data.dataType}: ${data.processed}/${data.total}`, percentage);
        } else {
          const phase = data.phase ? data.phase.replace('_', ' ') : 'processing';
          this.showProgress(`${phase} ${data.dataType}...`, null);
        }
      });
    }
    
    // Listen for enhanced progress tracking if available
    if (window.SyncProgressTracker) {
      window.SyncProgressTracker.addProgressListener((event, data) => {
        this.handleProgressTrackerEvent(event, data);
      });
    }
  },
  
  /**
   * Handle progress tracker events
   */
  handleProgressTrackerEvent(event, data) {
    switch (event) {
      case 'operationStarted':
        this.state.syncing = true;
        this.state.currentOperation = data.operation.type;
        this.updateDisplay();
        break;
        
      case 'phaseChanged':
        const phaseMessage = this.formatPhaseMessage(data.currentPhase, data.details);
        this.showProgress(phaseMessage, null);
        break;
        
      case 'progressUpdated':
        const progressMessage = this.formatProgressMessage(data);
        this.showProgress(progressMessage, data.progressPercentage);
        break;
        
      case 'operationCompleted':
        this.state.syncing = false;
        this.state.currentOperation = null;
        this.hideProgress();
        this.updateDisplay();
        
        // Show completion notification with performance info
        const performance = data.performance;
        const message = data.operation.success ? 
          `Sync completed in ${this.formatDuration(data.operation.totalDuration)}` :
          `Sync failed: ${data.operation.result?.error || 'Unknown error'}`;
        
        this.showSyncNotification(message, data.operation.success ? 'success' : 'error');
        break;
        
      case 'errorRecorded':
        this.showSyncNotification(`Error: ${data.error.message}`, 'error');
        break;
        
      case 'warningRecorded':
        this.showSyncNotification(`Warning: ${data.warning.message}`, 'warning');
        break;
    }
  },
  
  /**
   * Format phase message for display
   */
  formatPhaseMessage(phase, details) {
    const phaseNames = {
      'initializing': 'Initializing sync...',
      'authenticating': 'Authenticating with Google...',
      'reading_local': 'Reading local data...',
      'reading_remote': 'Reading remote data...',
      'transforming': 'Processing data...',
      'uploading': 'Uploading changes...',
      'downloading': 'Downloading changes...',
      'resolving_conflicts': 'Resolving conflicts...',
      'finalizing': 'Finalizing sync...'
    };
    
    let message = phaseNames[phase] || phase;
    
    if (details?.dataType) {
      message = message.replace('data', details.dataType);
      message = message.replace('changes', `${details.dataType} changes`);
    }
    
    return message;
  },
  
  /**
   * Format progress message with performance info
   */
  formatProgressMessage(data) {
    let message = `Processing: ${data.processedRecords}`;
    
    if (data.totalRecords > 0) {
      message += `/${data.totalRecords}`;
    }
    
    if (data.recordsPerSecond > 0) {
      message += ` (${data.recordsPerSecond}/sec)`;
    }
    
    if (data.estimatedTimeRemaining) {
      message += ` - ${this.formatDuration(data.estimatedTimeRemaining)} remaining`;
    }
    
    return message;
  },
  
  /**
   * Update internal state from sync manager
   */
  updateState(data) {
    Object.assign(this.state, {
      enabled: data.enabled || false,
      online: data.online || false,
      syncing: data.syncing || false,
      lastSync: data.lastSync?.timestamp || this.state.lastSync,
      stats: { ...this.state.stats, ...data.stats }
    });
  },
  
  /**
   * Update sync statistics
   */
  updateStats(syncResult) {
    if (!syncResult) return;
    
    this.state.stats.totalSyncs++;
    this.state.stats.successfulSyncs++;
    
    if (syncResult.uploaded) {
      Object.values(syncResult.uploaded).forEach(count => {
        this.state.stats.uploadedRecords += count;
      });
    }
    
    if (syncResult.downloaded) {
      Object.values(syncResult.downloaded).forEach(count => {
        this.state.stats.downloadedRecords += count;
      });
    }
    
    if (syncResult.conflicts) {
      this.state.stats.conflictsResolved += syncResult.conflicts.length;
    }
  },
  
  /**
   * Format duration using StatusManager utility
   */
  formatDuration(ms) {
    return window.StatusManager ? window.StatusManager.formatDuration(ms) : '0ms';
  },
  
  /**
   * Update the main display
   */
  updateDisplay() {
    this.updateStatusIndicator();
    this.updateSyncButton();
    this.updateStatsDisplay();
  },
  
  /**
   * Update status indicator appearance
   */
  updateStatusIndicator() {
    const { statusIndicator, statusText, statusDot } = this.elements;
    if (!statusIndicator || !statusText) return;
    
    // Remove all status classes
    statusIndicator.classList.remove('online', 'offline', 'syncing', 'error', 'disabled');
    
    let statusClass = 'offline';
    let statusMessage = 'Offline';
    let title = 'Sync status';
    
    if (this.state.syncing) {
      statusClass = 'syncing';
      statusMessage = this.state.currentOperation === 'sync' ? 'Syncing...' : 'Processing...';
      title = 'Synchronization in progress';
    } else if (!this.state.enabled) {
      statusClass = 'disabled';
      statusMessage = 'Disabled';
      title = 'Google Sheets sync is disabled';
    } else if (this.state.online) {
      statusClass = 'online';
      statusMessage = 'Online';
      const lastSyncText = this.state.lastSync ? 
        this.formatRelativeTime(this.state.lastSync) : 'Never';
      title = `Last sync: ${lastSyncText}`;
    } else {
      statusClass = 'offline';
      statusMessage = 'Offline';
      title = 'No internet connection - changes will sync when online';
    }
    
    // Add conflicts indicator
    if (this.state.stats.lastError) {
      statusClass += ' has-error';
      title += ` | Last error: ${this.state.stats.lastError}`;
    }
    
    statusIndicator.classList.add(statusClass);
    statusText.textContent = statusMessage;
    statusIndicator.title = title;
  },
  
  /**
   * Update sync button state
   */
  updateSyncButton() {
    const { syncButton } = this.elements;
    if (!syncButton) return;
    
    if (this.state.syncing) {
      syncButton.innerHTML = '⏸️';
      syncButton.title = 'Sync in progress...';
      syncButton.disabled = true;
    } else if (this.state.enabled && this.state.online) {
      syncButton.innerHTML = '🔄';
      syncButton.title = 'Manual sync (Ctrl+S)';
      syncButton.disabled = false;
    } else {
      syncButton.innerHTML = '🔄';
      syncButton.title = this.state.enabled ? 'Offline - sync when connected' : 'Sync disabled';
      syncButton.disabled = !this.state.enabled;
    }
  },
  
  /**
   * Show sync progress
   */
  showProgress(message, percentage = null) {
    const progressContainer = this.elements.statusIndicator?.querySelector('.sync-progress');
    const { progressBar, progressText } = this.elements;
    
    if (!progressContainer) return;
    
    progressContainer.classList.remove('hidden');
    
    if (progressText) {
      progressText.textContent = message;
    }
    
    if (progressBar && percentage !== null) {
      progressBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
      this.state.progress.percentage = percentage;
    }
    
    this.state.progress.phase = message;
  },
  
  /**
   * Hide sync progress
   */
  hideProgress() {
    const progressContainer = this.elements.statusIndicator?.querySelector('.sync-progress');
    if (progressContainer) {
      progressContainer.classList.add('hidden');
    }
    
    this.state.progress = {
      phase: null,
      processed: 0,
      total: 0,
      percentage: 0
    };
  },
  
  /**
   * Handle sync button click
   */
  async handleSyncButtonClick() {
    if (this.state.syncing || !this.state.enabled) return;
    
    try {
      if (window.SyncManager) {
        await window.SyncManager.performSync({ force: true });
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      this.showSyncNotification(`Manual sync failed: ${error.message}`, 'error');
    }
  },
  
  /**
   * Show sync notification
   */
  showSyncNotification(message, type = 'info') {
    // Create notification element
    const notification = window.UIUtils.DOM.create('div', { className: `sync-notification ${type}` });
    notification.innerHTML = `
      <span class="notification-icon">${this.getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close">×</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-hide after 5 seconds
    const hideTimeout = setTimeout(() => this.hideNotification(notification), 5000);
    
    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.onclick = () => {
      clearTimeout(hideTimeout);
      this.hideNotification(notification);
    };
  },
  
  /**
   * Hide sync notification
   */
  hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  },
  
  /**
   * Get notification icon for type
   */
  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  },
  
  /**
   * Format relative time
   */
  formatRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.toLocaleDateString();
  },

  /**
   * Show detailed sync information modal
   */
  showSyncDetails() {
    const content = this.createSyncDetailsContent();
    
    window.UI.Modal.show('Sync Status Details', content, [
      {
        text: 'View History',
        class: 'btn-secondary',
        handler: () => {
          window.UI.Modal.hide();
          this.showSyncHistory();
        }
      },
      {
        text: 'Manual Sync',
        class: 'btn-primary',
        handler: () => {
          window.UI.Modal.hide();
          this.handleSyncButtonClick();
        }
      },
      {
        text: 'Close',
        class: 'btn-secondary',
        handler: () => window.UI.Modal.hide()
      }
    ]);
  },
  
  /**
   * Create sync details content
   */
  createSyncDetailsContent() {
    const { state } = this;
    
    return `
      <div class="sync-details">
        <div class="detail-section">
          <h4>Current Status</h4>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">Sync Enabled:</span>
              <span class="status-value ${state.enabled ? 'enabled' : 'disabled'}">
                ${state.enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Connection:</span>
              <span class="status-value ${state.online ? 'online' : 'offline'}">
                ${state.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Currently Syncing:</span>
              <span class="status-value ${state.syncing ? 'syncing' : 'idle'}">
                ${state.syncing ? 'Yes' : 'No'}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Last Sync:</span>
              <span class="status-value">
                ${state.lastSync ? this.formatRelativeTime(state.lastSync) : 'Never'}
              </span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>Statistics</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${state.stats.totalSyncs}</div>
              <div class="stat-label">Total Syncs</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${state.stats.successfulSyncs}</div>
              <div class="stat-label">Successful</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${state.stats.failedSyncs}</div>
              <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${state.stats.uploadedRecords}</div>
              <div class="stat-label">Uploaded</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${state.stats.downloadedRecords}</div>
              <div class="stat-label">Downloaded</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${state.stats.conflictsResolved}</div>
              <div class="stat-label">Conflicts Resolved</div>
            </div>
          </div>
        </div>
        
        ${state.syncing ? this.createProgressSection() : ''}
        ${state.stats.lastError ? this.createErrorSection() : ''}
      </div>
    `;
  },
  
  /**
   * Create progress section for active sync
   */
  createProgressSection() {
    const { progress } = this.state;
    
    return `
      <div class="detail-section">
        <h4>Current Progress</h4>
        <div class="progress-details">
          <div class="progress-phase">${progress.phase || 'Processing...'}</div>
          ${progress.percentage !== null ? `
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress.percentage}%"></div>
              </div>
              <div class="progress-percentage">${progress.percentage}%</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },
  
  /**
   * Create error section
   */
  createErrorSection() {
    return `
      <div class="detail-section error-section">
        <h4>Last Error</h4>
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          <span class="error-text">${this.state.stats.lastError}</span>
        </div>
        <div class="error-actions">
          <button class="btn btn-sm btn-secondary" onclick="window.SyncStatusUI.clearLastError()">
            Clear Error
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * Clear last error
   */
  clearLastError() {
    this.state.stats.lastError = null;
    if (window.SyncManager) {
      window.SyncManager.syncStats.lastError = null;
      window.SyncManager.saveSyncStats();
    }
    this.updateDisplay();
    window.UI.Modal.hide();
  },
  
  /**
   * Show sync history modal
   */
  showSyncHistory() {
    const content = this.createSyncHistoryContent();
    
    window.UI.Modal.show('Sync History & Logs', content, [
      {
        text: 'View Logs',
        class: 'btn-secondary',
        handler: () => {
          window.UI.Modal.hide();
          this.showDetailedLogs();
        }
      },
      {
        text: 'Clear History',
        class: 'btn-secondary',
        handler: () => this.clearSyncHistory()
      },
      {
        text: 'Export',
        class: 'btn-secondary',
        handler: () => this.exportSyncHistory()
      },
      {
        text: 'Close',
        class: 'btn-primary',
        handler: () => window.UI.Modal.hide()
      }
    ]);
  },
  
  /**
   * Show detailed logs modal
   */
  showDetailedLogs() {
    if (!window.SyncLoggingIntegration) {
      window.UI.Modal.alert('Logs Unavailable', 'Detailed logging is not available.');
      return;
    }
    
    const content = window.SyncLoggingIntegration.createLogViewer();
    
    window.UI.Modal.show('Detailed Sync Logs', content, [
      {
        text: 'Close',
        class: 'btn-primary',
        handler: () => window.UI.Modal.hide()
      }
    ]);
    
    // Setup log viewer handlers after modal is shown
    setTimeout(() => {
      window.SyncLoggingIntegration.setupLogViewerHandlers();
    }, 100);
  },
  
  /**
   * Create sync history content
   */
  createSyncHistoryContent() {
    const history = this.getSyncHistory();
    
    if (history.length === 0) {
      return `
        <div class="empty-state">
          <span class="empty-icon">📋</span>
          <h3>No Sync History</h3>
          <p>Sync operations will appear here once they start running.</p>
        </div>
      `;
    }
    
    return `
      <div class="sync-history">
        <div class="history-header">
          <div class="history-stats">
            <span class="stat">Total: ${history.length}</span>
            <span class="stat">Success: ${history.filter(h => h.success).length}</span>
            <span class="stat">Failed: ${history.filter(h => !h.success).length}</span>
          </div>
        </div>
        <div class="history-list">
          ${history.map(entry => this.createHistoryEntry(entry)).join('')}
        </div>
      </div>
    `;
  },
  
  /**
   * Create individual history entry
   */
  createHistoryEntry(entry) {
    const statusIcon = entry.success ? '✅' : '❌';
    const statusClass = entry.success ? 'success' : 'error';
    const duration = entry.duration ? `${entry.duration}ms` : 'Unknown';
    
    return `
      <div class="history-entry ${statusClass}">
        <div class="entry-header">
          <span class="entry-status">${statusIcon}</span>
          <span class="entry-timestamp">${new Date(entry.timestamp).toLocaleString()}</span>
          <span class="entry-duration">${duration}</span>
        </div>
        <div class="entry-details">
          ${entry.success ? `
            <div class="entry-summary">
              Uploaded: ${entry.uploaded || 0} | Downloaded: ${entry.downloaded || 0}
              ${entry.conflicts ? ` | Conflicts: ${entry.conflicts}` : ''}
            </div>
          ` : `
            <div class="entry-error">${entry.error || 'Unknown error'}</div>
          `}
        </div>
        ${entry.details ? `
          <div class="entry-expandable">
            <button class="expand-btn" onclick="this.nextElementSibling.classList.toggle('hidden')">
              Show Details
            </button>
            <div class="entry-full-details hidden">
              <pre>${JSON.stringify(entry.details, null, 2)}</pre>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },
  
  /**
   * Get sync history from storage
   */
  getSyncHistory() {
    try {
      return window.UIUtils.Storage.get('vat_sync_history', []);
    } catch (error) {
      console.error('Error loading sync history:', error);
      return [];
    }
  },
  
  /**
   * Add entry to sync history
   */
  addHistoryEntry(entry) {
    try {
      const history = this.getSyncHistory();
      
      // Add new entry
      history.unshift({
        timestamp: new Date().toISOString(),
        ...entry
      });
      
      // Keep only last 50 entries
      const trimmedHistory = history.slice(0, 50);
      
      window.UIUtils.Storage.set('vat_sync_history', trimmedHistory);
      
    } catch (error) {
      console.error('Error saving sync history:', error);
    }
  },
  
  /**
   * Clear sync history
   */
  clearSyncHistory() {
    window.UI.Modal.confirm(
      'Clear Sync History',
      'Are you sure you want to clear all sync history? This action cannot be undone.',
      () => {
        window.UIUtils.Storage.remove('vat_sync_history');
        window.UI.Modal.hide();
        this.showSyncNotification('Sync history cleared', 'info');
      }
    );
  },
  
  /**
   * Export sync history as JSON
   */
  exportSyncHistory() {
    try {
      const history = this.getSyncHistory();
      const dataStr = JSON.stringify(history, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `sync-history-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      this.showSyncNotification('Sync history exported', 'success');
      
    } catch (error) {
      console.error('Error exporting sync history:', error);
      this.showSyncNotification('Failed to export sync history', 'error');
    }
  },
  
  /**
   * Update stats display in settings or other UI
   */
  updateStatsDisplay() {
    // Update any stats displays in settings or other parts of the UI
    const statsElements = {
      'sync-total-count': this.state.stats.totalSyncs,
      'sync-success-count': this.state.stats.successfulSyncs,
      'sync-failed-count': this.state.stats.failedSyncs,
      'sync-uploaded-count': this.state.stats.uploadedRecords,
      'sync-downloaded-count': this.state.stats.downloadedRecords,
      'sync-conflicts-count': this.state.stats.conflictsResolved
    };
    
    Object.entries(statsElements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value.toString();
      }
    });
    
    // Update last sync time
    const lastSyncElement = document.getElementById('sync-last-time');
    if (lastSyncElement) {
      lastSyncElement.textContent = this.state.lastSync ? 
        new Date(this.state.lastSync).toLocaleString() : 'Never';
    }
  }
};