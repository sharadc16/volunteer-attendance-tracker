/**
 * Sync Logging Integration
 * Integrates the sync logger with sync manager and progress tracker
 */
window.SyncLoggingIntegration = {
  
  /**
   * Initialize logging integration
   */
  init() {
    if (!window.SyncLogger) {
      console.warn('SyncLogger not available');
      return false;
    }
    
    // Initialize sync logger
    window.SyncLogger.init();
    
    // Integrate with sync manager
    this.integrateWithSyncManager();
    
    // Integrate with progress tracker
    this.integrateWithProgressTracker();
    
    // Integrate with auth manager
    this.integrateWithAuthManager();
    
    console.log('Sync logging integration initialized');
    return true;
  },
  
  /**
   * Integrate with sync manager
   */
  integrateWithSyncManager() {
    if (!window.SyncManager) return;
    
    const syncManager = window.SyncManager;
    const logger = window.SyncLogger;
    
    // Log sync lifecycle events
    syncManager.addListener('initialized', (data) => {
      logger.info('Sync manager initialized', logger.categories.SYNC, {
        enabled: data.enabled,
        queueAvailable: data.queueAvailable
      });
    });
    
    syncManager.addListener('syncStarted', (data) => {
      logger.info('Sync operation started', logger.categories.SYNC, {
        timestamp: data.timestamp,
        sessionId: logger.sessionInfo.sessionId
      });
    });
    
    syncManager.addListener('syncCompleted', (data) => {
      logger.info('Sync operation completed successfully', logger.categories.SYNC, {
        duration: data.duration,
        uploaded: data.uploaded,
        downloaded: data.downloaded,
        conflicts: data.conflicts?.length || 0,
        errors: data.errors?.length || 0
      });
    });
    
    syncManager.addListener('syncFailed', (data) => {
      logger.error('Sync operation failed', logger.categories.SYNC, {
        error: data.error,
        timestamp: data.timestamp
      });
    });
    
    // Log upload/download events
    syncManager.addListener('uploadStarted', (data) => {
      logger.info(`Upload started for ${data.dataType}`, logger.categories.DATA, {
        dataType: data.dataType,
        totalRecords: data.totalRecords
      });
    });
    
    syncManager.addListener('uploadCompleted', (data) => {
      logger.info(`Upload completed for ${data.dataType}`, logger.categories.DATA, {
        dataType: data.dataType,
        count: data.count,
        conflicts: data.conflicts?.length || 0,
        skipped: data.skipped || 0,
        newRecords: data.newRecords || 0,
        updatedRecords: data.updatedRecords || 0
      });
    });
    
    syncManager.addListener('uploadFailed', (data) => {
      logger.error(`Upload failed for ${data.dataType}`, logger.categories.DATA, {
        dataType: data.dataType,
        error: data.error
      });
    });
    
    syncManager.addListener('downloadStarted', (data) => {
      logger.info(`Download started for ${data.dataType}`, logger.categories.DATA, {
        dataType: data.dataType
      });
    });
    
    syncManager.addListener('downloadCompleted', (data) => {
      logger.info(`Download completed for ${data.dataType}`, logger.categories.DATA, {
        dataType: data.dataType,
        count: data.count,
        conflicts: data.conflicts?.length || 0,
        skipped: data.skipped || 0
      });
    });
    
    syncManager.addListener('downloadFailed', (data) => {
      logger.error(`Download failed for ${data.dataType}`, logger.categories.DATA, {
        dataType: data.dataType,
        error: data.error
      });
    });
    
    // Log conflict resolution
    syncManager.addListener('conflictDetected', (data) => {
      logger.warn('Data conflict detected', logger.categories.CONFLICT, {
        dataType: data.dataType,
        recordId: data.recordId,
        conflictType: data.type,
        localData: data.localData,
        remoteData: data.remoteData
      });
    });
    
    syncManager.addListener('conflictResolved', (data) => {
      logger.info('Data conflict resolved', logger.categories.CONFLICT, {
        dataType: data.dataType,
        recordId: data.recordId,
        resolution: data.resolution,
        resolvedBy: data.resolvedBy || 'automatic'
      });
    });
    
    // Log network events
    syncManager.addListener('networkError', (data) => {
      logger.error('Network error during sync', logger.categories.NETWORK, {
        url: data.url,
        method: data.method,
        error: data.error,
        retryAttempt: data.retryAttempt
      });
    });
    
    syncManager.addListener('rateLimitExceeded', (data) => {
      logger.warn('API rate limit exceeded', logger.categories.NETWORK, {
        service: data.service,
        retryAfter: data.retryAfter,
        requestCount: data.requestCount
      });
    });
    
    // Log periodic sync events
    syncManager.addListener('periodicSyncStarted', (data) => {
      logger.debug('Periodic sync started', logger.categories.SYNC, {
        interval: data.interval
      });
    });
    
    syncManager.addListener('periodicSyncStopped', () => {
      logger.debug('Periodic sync stopped', logger.categories.SYNC);
    });
  },
  
  /**
   * Integrate with progress tracker
   */
  integrateWithProgressTracker() {
    if (!window.SyncProgressTracker) return;
    
    const progressTracker = window.SyncProgressTracker;
    const logger = window.SyncLogger;
    
    // Log operation lifecycle
    progressTracker.addProgressListener('operationStarted', (data) => {
      logger.info(`Operation started: ${data.operation.type}`, logger.categories.PERFORMANCE, {
        operationType: data.operation.type,
        totalRecords: data.operation.totalRecords,
        metadata: data.operation.metadata
      });
    });
    
    progressTracker.addProgressListener('operationCompleted', (data) => {
      const operation = data.operation;
      const performance = data.performance;
      
      if (operation.success) {
        logger.info(`Operation completed: ${operation.type}`, logger.categories.PERFORMANCE, {
          operationType: operation.type,
          duration: operation.totalDuration,
          processedRecords: operation.processedRecords,
          phases: operation.phases.length,
          networkRequests: operation.networkRequests?.length || 0,
          cacheAccess: operation.cacheAccess?.length || 0,
          errors: operation.errors.length,
          warnings: operation.warnings.length,
          averageOperationTime: performance.averageOperationTime,
          recordsPerSecond: operation.recordsPerSecond
        });
      } else {
        logger.error(`Operation failed: ${operation.type}`, logger.categories.PERFORMANCE, {
          operationType: operation.type,
          duration: operation.totalDuration,
          errors: operation.errors,
          result: operation.result
        });
      }
    });
    
    // Log phase changes
    progressTracker.addProgressListener('phaseChanged', (data) => {
      logger.debug(`Phase changed: ${data.previousPhase} -> ${data.currentPhase}`, 
        logger.categories.PERFORMANCE, {
        operation: data.operation.type,
        previousPhase: data.previousPhase,
        currentPhase: data.currentPhase,
        phaseDuration: data.phaseDuration,
        details: data.details
      });
    });
    
    // Log errors and warnings
    progressTracker.addProgressListener('errorRecorded', (data) => {
      logger.error('Operation error', logger.categories.ERROR, {
        operation: data.operation.type,
        phase: data.error.phase,
        message: data.error.message,
        context: data.error.context,
        stack: data.error.stack
      });
    });
    
    progressTracker.addProgressListener('warningRecorded', (data) => {
      logger.warn('Operation warning', logger.categories.SYSTEM, {
        operation: data.operation.type,
        phase: data.warning.phase,
        message: data.warning.message,
        context: data.warning.context
      });
    });
  },
  
  /**
   * Integrate with auth manager
   */
  integrateWithAuthManager() {
    if (!window.AuthManager) return;
    
    const authManager = window.AuthManager;
    const logger = window.SyncLogger;
    
    // Store original methods to wrap them
    const originalInit = authManager.init?.bind(authManager);
    const originalAuthenticate = authManager.authenticate?.bind(authManager);
    const originalRefreshToken = authManager.refreshToken?.bind(authManager);
    const originalSignOut = authManager.signOut?.bind(authManager);
    
    // Wrap init method
    if (originalInit) {
      authManager.init = async function(...args) {
        logger.info('Auth manager initialization started', logger.categories.AUTH);
        try {
          const result = await originalInit(...args);
          logger.info('Auth manager initialized successfully', logger.categories.AUTH, {
            result
          });
          return result;
        } catch (error) {
          logger.error('Auth manager initialization failed', logger.categories.AUTH, {
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
      };
    }
    
    // Wrap authenticate method
    if (originalAuthenticate) {
      authManager.authenticate = async function(...args) {
        logger.info('Authentication started', logger.categories.AUTH);
        try {
          const result = await originalAuthenticate(...args);
          logger.info('Authentication successful', logger.categories.AUTH, {
            hasToken: !!result?.access_token,
            expiresIn: result?.expires_in
          });
          return result;
        } catch (error) {
          logger.error('Authentication failed', logger.categories.AUTH, {
            error: error.message,
            code: error.code
          });
          throw error;
        }
      };
    }
    
    // Wrap token refresh method
    if (originalRefreshToken) {
      authManager.refreshToken = async function(...args) {
        logger.debug('Token refresh started', logger.categories.AUTH);
        try {
          const result = await originalRefreshToken(...args);
          logger.info('Token refreshed successfully', logger.categories.AUTH, {
            hasNewToken: !!result?.access_token
          });
          return result;
        } catch (error) {
          logger.error('Token refresh failed', logger.categories.AUTH, {
            error: error.message,
            code: error.code
          });
          throw error;
        }
      };
    }
    
    // Wrap sign out method
    if (originalSignOut) {
      authManager.signOut = async function(...args) {
        logger.info('Sign out started', logger.categories.AUTH);
        try {
          const result = await originalSignOut(...args);
          logger.info('Sign out completed', logger.categories.AUTH);
          return result;
        } catch (error) {
          logger.error('Sign out failed', logger.categories.AUTH, {
            error: error.message
          });
          throw error;
        }
      };
    }
  },
  
  /**
   * Create log viewer UI
   */
  createLogViewer() {
    const logger = window.SyncLogger;
    const logs = logger.getLogs();
    const stats = logger.getLogStatistics();
    
    return `
      <div class="log-viewer">
        <div class="log-header">
          <h4>Sync Logs</h4>
          <div class="log-stats">
            <span class="stat">Total: ${stats.totalLogs}</span>
            <span class="stat">Errors: ${stats.logsByLevel.ERROR || 0}</span>
            <span class="stat">Warnings: ${stats.logsByLevel.WARN || 0}</span>
            <span class="stat">Storage: ${stats.storageUsage.totalKB}KB</span>
          </div>
        </div>
        
        <div class="log-filters">
          <select id="logLevelFilter" class="log-filter">
            <option value="">All Levels</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warning</option>
            <option value="ERROR">Error</option>
            <option value="CRITICAL">Critical</option>
          </select>
          
          <select id="logCategoryFilter" class="log-filter">
            <option value="">All Categories</option>
            <option value="sync">Sync</option>
            <option value="auth">Auth</option>
            <option value="network">Network</option>
            <option value="data">Data</option>
            <option value="conflict">Conflict</option>
            <option value="performance">Performance</option>
            <option value="error">Error</option>
            <option value="system">System</option>
          </select>
          
          <input type="text" id="logSearchInput" placeholder="Search logs..." class="log-search">
          
          <button id="clearLogsBtn" class="btn btn-sm btn-secondary">Clear Logs</button>
          <button id="exportLogsBtn" class="btn btn-sm btn-secondary">Export</button>
        </div>
        
        <div class="log-entries" id="logEntries">
          ${this.renderLogEntries(logs.slice(0, 50))}
        </div>
        
        ${logs.length > 50 ? `
          <div class="log-pagination">
            <button id="loadMoreLogs" class="btn btn-sm btn-secondary">
              Load More (${logs.length - 50} remaining)
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },
  
  /**
   * Render log entries
   */
  renderLogEntries(logs) {
    return logs.map(log => `
      <div class="log-entry ${log.level.toLowerCase()}">
        <div class="log-entry-header">
          <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
          <span class="log-level ${log.level.toLowerCase()}">${log.level}</span>
          <span class="log-category">${log.category}</span>
        </div>
        <div class="log-message">${log.message}</div>
        ${Object.keys(log.data).length > 0 ? `
          <div class="log-data">
            <button class="log-data-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
              Show Data
            </button>
            <pre class="log-data-content hidden">${JSON.stringify(log.data, null, 2)}</pre>
          </div>
        ` : ''}
        ${log.stack ? `
          <div class="log-stack">
            <button class="log-stack-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
              Show Stack Trace
            </button>
            <pre class="log-stack-content hidden">${log.stack}</pre>
          </div>
        ` : ''}
      </div>
    `).join('');
  },
  
  /**
   * Setup log viewer event handlers
   */
  setupLogViewerHandlers() {
    const logger = window.SyncLogger;
    
    // Level filter
    const levelFilter = document.getElementById('logLevelFilter');
    if (levelFilter) {
      levelFilter.onchange = () => this.filterLogs();
    }
    
    // Category filter
    const categoryFilter = document.getElementById('logCategoryFilter');
    if (categoryFilter) {
      categoryFilter.onchange = () => this.filterLogs();
    }
    
    // Search input
    const searchInput = document.getElementById('logSearchInput');
    if (searchInput) {
      searchInput.oninput = () => this.filterLogs();
    }
    
    // Clear logs button
    const clearBtn = document.getElementById('clearLogsBtn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
          logger.clearLogs();
          this.refreshLogViewer();
        }
      };
    }
    
    // Export logs button
    const exportBtn = document.getElementById('exportLogsBtn');
    if (exportBtn) {
      exportBtn.onclick = () => this.exportLogs();
    }
    
    // Load more button
    const loadMoreBtn = document.getElementById('loadMoreLogs');
    if (loadMoreBtn) {
      loadMoreBtn.onclick = () => this.loadMoreLogs();
    }
  },
  
  /**
   * Filter logs based on current filters
   */
  filterLogs() {
    const levelFilter = document.getElementById('logLevelFilter')?.value;
    const categoryFilter = document.getElementById('logCategoryFilter')?.value;
    const searchQuery = document.getElementById('logSearchInput')?.value;
    
    let filteredLogs = window.SyncLogger.getLogs();
    
    if (levelFilter) {
      filteredLogs = filteredLogs.filter(log => log.level === levelFilter);
    }
    
    if (categoryFilter) {
      filteredLogs = filteredLogs.filter(log => log.category === categoryFilter);
    }
    
    if (searchQuery) {
      filteredLogs = window.SyncLogger.searchLogs(searchQuery, {
        category: categoryFilter || null,
        level: levelFilter || null
      });
    }
    
    const logEntries = document.getElementById('logEntries');
    if (logEntries) {
      logEntries.innerHTML = this.renderLogEntries(filteredLogs.slice(0, 50));
    }
  },
  
  /**
   * Export logs
   */
  exportLogs() {
    try {
      const exportData = window.SyncLogger.exportLogs();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `sync-logs-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export logs');
    }
  },
  
  /**
   * Load more logs
   */
  loadMoreLogs() {
    // Implementation would load more log entries
    console.log('Load more logs functionality would be implemented here');
  },
  
  /**
   * Refresh log viewer
   */
  refreshLogViewer() {
    const logEntries = document.getElementById('logEntries');
    if (logEntries) {
      const logs = window.SyncLogger.getLogs();
      logEntries.innerHTML = this.renderLogEntries(logs.slice(0, 50));
    }
  }
};