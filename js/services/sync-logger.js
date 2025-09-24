/**
 * Sync Logger
 * Comprehensive logging system for sync operations with audit trail and retention management
 */
window.SyncLogger = {
  
  // Log levels
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
  },
  
  // Current log level (configurable)
  currentLevel: 1, // INFO by default
  
  // Log storage keys
  storageKeys: {
    logs: 'vat_sync_logs',
    auditTrail: 'vat_sync_audit_trail',
    config: 'vat_sync_logger_config'
  },
  
  // Configuration
  config: {
    maxLogEntries: 1000,
    maxAuditEntries: 500,
    retentionDays: 30,
    enableConsoleOutput: true,
    enableRemoteLogging: false,
    logLevel: 'INFO',
    includeStackTrace: true,
    compressOldLogs: true
  },
  
  // Log categories
  categories: {
    SYNC: 'sync',
    AUTH: 'auth',
    NETWORK: 'network',
    DATA: 'data',
    CONFLICT: 'conflict',
    PERFORMANCE: 'performance',
    ERROR: 'error',
    SYSTEM: 'system'
  },
  
  // Current session info
  sessionInfo: {
    sessionId: null,
    startTime: null,
    userAgent: null,
    platform: null
  },
  
  /**
   * Initialize sync logger
   */
  init() {
    try {
      // Generate session ID
      this.sessionInfo.sessionId = this.generateSessionId();
      this.sessionInfo.startTime = new Date().toISOString();
      this.sessionInfo.userAgent = navigator.userAgent;
      this.sessionInfo.platform = navigator.platform;
      
      // Load configuration
      this.loadConfig();
      
      // Set log level
      this.setLogLevel(this.config.logLevel);
      
      // Clean up old logs
      this.cleanupOldLogs();
      
      // Set up error handlers
      this.setupErrorHandlers();
      
      // Log initialization
      this.info('SyncLogger initialized', this.categories.SYSTEM, {
        sessionId: this.sessionInfo.sessionId,
        config: this.config
      });
      
      console.log('SyncLogger initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize SyncLogger:', error);
      return false;
    }
  },
  
  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Load logger configuration
   */
  loadConfig() {
    try {
      const stored = localStorage.getItem(this.storageKeys.config);
      if (stored) {
        const savedConfig = JSON.parse(stored);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Error loading logger config:', error);
    }
  },
  
  /**
   * Save logger configuration
   */
  saveConfig() {
    try {
      localStorage.setItem(this.storageKeys.config, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving logger config:', error);
    }
  },
  
  /**
   * Set log level
   */
  setLogLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
    } else {
      this.currentLevel = level;
    }
    this.config.logLevel = level;
    this.saveConfig();
  },
  
  /**
   * Setup global error handlers
   */
  setupErrorHandlers() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled JavaScript error', this.categories.ERROR, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', this.categories.ERROR, {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  },
  
  /**
   * Log debug message
   */
  debug(message, category = this.categories.SYSTEM, data = {}) {
    this.log(this.levels.DEBUG, message, category, data);
  },
  
  /**
   * Log info message
   */
  info(message, category = this.categories.SYSTEM, data = {}) {
    this.log(this.levels.INFO, message, category, data);
  },
  
  /**
   * Log warning message
   */
  warn(message, category = this.categories.SYSTEM, data = {}) {
    this.log(this.levels.WARN, message, category, data);
  },
  
  /**
   * Log error message
   */
  error(message, category = this.categories.ERROR, data = {}) {
    this.log(this.levels.ERROR, message, category, data);
  },
  
  /**
   * Log critical message
   */
  critical(message, category = this.categories.ERROR, data = {}) {
    this.log(this.levels.CRITICAL, message, category, data);
  },
  
  /**
   * Main logging method
   */
  log(level, message, category, data = {}) {
    // Check if we should log this level
    if (level < this.currentLevel) return;
    
    const timestamp = new Date().toISOString();
    const levelName = this.getLevelName(level);
    
    // Create log entry
    const logEntry = {
      id: this.generateLogId(),
      timestamp,
      sessionId: this.sessionInfo.sessionId,
      level: levelName,
      category,
      message,
      data: this.sanitizeData(data),
      stack: this.config.includeStackTrace && level >= this.levels.ERROR ? 
        this.getStackTrace() : null
    };
    
    // Store log entry
    this.storeLogEntry(logEntry);
    
    // Console output
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }
    
    // Remote logging (if enabled)
    if (this.config.enableRemoteLogging) {
      this.sendToRemoteLogger(logEntry);
    }
    
    // Create audit trail for important events
    if (level >= this.levels.WARN || category === this.categories.SYNC) {
      this.createAuditEntry(logEntry);
    }
  },
  
  /**
   * Get level name from level number
   */
  getLevelName(level) {
    const levelNames = Object.keys(this.levels);
    return levelNames.find(name => this.levels[name] === level) || 'UNKNOWN';
  },
  
  /**
   * Generate unique log ID
   */
  generateLogId() {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  },
  
  /**
   * Sanitize data for logging (remove sensitive info)
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = JSON.parse(JSON.stringify(data));
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential', 'auth'];
    
    const sanitizeObject = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        return result;
      }
      
      return obj;
    };
    
    return sanitizeObject(sanitized);
  },
  
  /**
   * Get stack trace
   */
  getStackTrace() {
    try {
      throw new Error();
    } catch (e) {
      return e.stack?.split('\n').slice(3).join('\n') || null;
    }
  },
  
  /**
   * Store log entry in local storage
   */
  storeLogEntry(logEntry) {
    try {
      const logs = this.getLogs();
      logs.unshift(logEntry);
      
      // Trim to max entries
      const trimmedLogs = logs.slice(0, this.config.maxLogEntries);
      
      localStorage.setItem(this.storageKeys.logs, JSON.stringify(trimmedLogs));
      
    } catch (error) {
      console.error('Error storing log entry:', error);
      // If storage is full, try to clean up and retry
      this.cleanupOldLogs();
      try {
        const logs = this.getLogs();
        logs.unshift(logEntry);
        const trimmedLogs = logs.slice(0, Math.floor(this.config.maxLogEntries / 2));
        localStorage.setItem(this.storageKeys.logs, JSON.stringify(trimmedLogs));
      } catch (retryError) {
        console.error('Failed to store log entry after cleanup:', retryError);
      }
    }
  },
  
  /**
   * Output log entry to console
   */
  outputToConsole(logEntry) {
    const { level, message, category, data, timestamp } = logEntry;
    const prefix = `[${timestamp}] [${level}] [${category}]`;
    
    switch (level) {
      case 'DEBUG':
        console.debug(prefix, message, data);
        break;
      case 'INFO':
        console.info(prefix, message, data);
        break;
      case 'WARN':
        console.warn(prefix, message, data);
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(prefix, message, data);
        break;
      default:
        console.log(prefix, message, data);
    }
  },
  
  /**
   * Send log entry to remote logger (placeholder)
   */
  sendToRemoteLogger(logEntry) {
    // This would send logs to a remote logging service
    // Implementation depends on the specific service used
    console.debug('Remote logging not implemented:', logEntry);
  },
  
  /**
   * Create audit trail entry
   */
  createAuditEntry(logEntry) {
    try {
      const auditEntry = {
        id: this.generateLogId(),
        timestamp: logEntry.timestamp,
        sessionId: logEntry.sessionId,
        level: logEntry.level,
        category: logEntry.category,
        message: logEntry.message,
        userId: this.getCurrentUserId(),
        action: this.extractAction(logEntry),
        resource: this.extractResource(logEntry),
        result: this.extractResult(logEntry),
        metadata: {
          userAgent: this.sessionInfo.userAgent,
          platform: this.sessionInfo.platform,
          url: window.location.href
        }
      };
      
      const auditTrail = this.getAuditTrail();
      auditTrail.unshift(auditEntry);
      
      // Trim to max entries
      const trimmedAudit = auditTrail.slice(0, this.config.maxAuditEntries);
      
      localStorage.setItem(this.storageKeys.auditTrail, JSON.stringify(trimmedAudit));
      
    } catch (error) {
      console.error('Error creating audit entry:', error);
    }
  },
  
  /**
   * Extract action from log entry
   */
  extractAction(logEntry) {
    const { category, message, data } = logEntry;
    
    if (category === this.categories.SYNC) {
      if (message.includes('started')) return 'sync_start';
      if (message.includes('completed')) return 'sync_complete';
      if (message.includes('failed')) return 'sync_fail';
      if (message.includes('upload')) return 'data_upload';
      if (message.includes('download')) return 'data_download';
    }
    
    if (category === this.categories.AUTH) {
      if (message.includes('login') || message.includes('authenticate')) return 'auth_login';
      if (message.includes('logout')) return 'auth_logout';
      if (message.includes('token')) return 'auth_token';
    }
    
    if (category === this.categories.CONFLICT) {
      return 'conflict_resolution';
    }
    
    return 'unknown';
  },
  
  /**
   * Extract resource from log entry
   */
  extractResource(logEntry) {
    const { data } = logEntry;
    
    if (data.dataType) return data.dataType;
    if (data.spreadsheetId) return 'spreadsheet';
    if (data.sheetName) return data.sheetName;
    if (data.recordId) return `record:${data.recordId}`;
    
    return 'system';
  },
  
  /**
   * Extract result from log entry
   */
  extractResult(logEntry) {
    const { level, message } = logEntry;
    
    if (level === 'ERROR' || level === 'CRITICAL') return 'failure';
    if (message.includes('success') || message.includes('completed')) return 'success';
    if (message.includes('warning') || level === 'WARN') return 'warning';
    
    return 'unknown';
  },
  
  /**
   * Get current user ID (placeholder)
   */
  getCurrentUserId() {
    // This would get the current user ID from the auth system
    return 'anonymous';
  },
  
  /**
   * Get all logs
   */
  getLogs() {
    try {
      const stored = localStorage.getItem(this.storageKeys.logs);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading logs:', error);
      return [];
    }
  },
  
  /**
   * Get audit trail
   */
  getAuditTrail() {
    try {
      const stored = localStorage.getItem(this.storageKeys.auditTrail);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading audit trail:', error);
      return [];
    }
  },
  
  /**
   * Get logs by category
   */
  getLogsByCategory(category, limit = 100) {
    const logs = this.getLogs();
    return logs
      .filter(log => log.category === category)
      .slice(0, limit);
  },
  
  /**
   * Get logs by level
   */
  getLogsByLevel(level, limit = 100) {
    const logs = this.getLogs();
    const levelName = typeof level === 'string' ? level : this.getLevelName(level);
    return logs
      .filter(log => log.level === levelName)
      .slice(0, limit);
  },
  
  /**
   * Get logs by date range
   */
  getLogsByDateRange(startDate, endDate, limit = 100) {
    const logs = this.getLogs();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return logs
      .filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      })
      .slice(0, limit);
  },
  
  /**
   * Search logs
   */
  searchLogs(query, options = {}) {
    const {
      category = null,
      level = null,
      limit = 100,
      caseSensitive = false
    } = options;
    
    const logs = this.getLogs();
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    
    return logs
      .filter(log => {
        // Category filter
        if (category && log.category !== category) return false;
        
        // Level filter
        if (level && log.level !== level) return false;
        
        // Text search
        const message = caseSensitive ? log.message : log.message.toLowerCase();
        const dataStr = caseSensitive ? 
          JSON.stringify(log.data) : 
          JSON.stringify(log.data).toLowerCase();
        
        return message.includes(searchTerm) || dataStr.includes(searchTerm);
      })
      .slice(0, limit);
  },
  
  /**
   * Clean up old logs
   */
  cleanupOldLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      
      // Clean up logs
      const logs = this.getLogs();
      const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate > cutoffDate;
      });
      
      if (filteredLogs.length !== logs.length) {
        localStorage.setItem(this.storageKeys.logs, JSON.stringify(filteredLogs));
        this.info(`Cleaned up ${logs.length - filteredLogs.length} old log entries`, 
          this.categories.SYSTEM);
      }
      
      // Clean up audit trail
      const auditTrail = this.getAuditTrail();
      const filteredAudit = auditTrail.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate > cutoffDate;
      });
      
      if (filteredAudit.length !== auditTrail.length) {
        localStorage.setItem(this.storageKeys.auditTrail, JSON.stringify(filteredAudit));
        this.info(`Cleaned up ${auditTrail.length - filteredAudit.length} old audit entries`, 
          this.categories.SYSTEM);
      }
      
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  },
  
  /**
   * Export logs as JSON
   */
  exportLogs(options = {}) {
    const {
      category = null,
      level = null,
      startDate = null,
      endDate = null,
      includeAuditTrail = true
    } = options;
    
    let logs = this.getLogs();
    
    // Apply filters
    if (category) {
      logs = logs.filter(log => log.category === category);
    }
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      logs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }
    
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      sessionInfo: this.sessionInfo,
      config: this.config,
      logs,
      auditTrail: includeAuditTrail ? this.getAuditTrail() : []
    };
    
    return JSON.stringify(exportData, null, 2);
  },
  
  /**
   * Clear all logs
   */
  clearLogs() {
    try {
      localStorage.removeItem(this.storageKeys.logs);
      localStorage.removeItem(this.storageKeys.auditTrail);
      this.info('All logs cleared', this.categories.SYSTEM);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  },
  
  /**
   * Get log statistics
   */
  getLogStatistics() {
    const logs = this.getLogs();
    const auditTrail = this.getAuditTrail();
    
    const stats = {
      totalLogs: logs.length,
      totalAuditEntries: auditTrail.length,
      logsByLevel: {},
      logsByCategory: {},
      oldestLog: null,
      newestLog: null,
      sessionInfo: this.sessionInfo,
      storageUsage: this.getStorageUsage()
    };
    
    // Count by level and category
    logs.forEach(log => {
      stats.logsByLevel[log.level] = (stats.logsByLevel[log.level] || 0) + 1;
      stats.logsByCategory[log.category] = (stats.logsByCategory[log.category] || 0) + 1;
    });
    
    // Find oldest and newest
    if (logs.length > 0) {
      stats.oldestLog = logs[logs.length - 1].timestamp;
      stats.newestLog = logs[0].timestamp;
    }
    
    return stats;
  },
  
  /**
   * Get storage usage
   */
  getStorageUsage() {
    try {
      const logsSize = localStorage.getItem(this.storageKeys.logs)?.length || 0;
      const auditSize = localStorage.getItem(this.storageKeys.auditTrail)?.length || 0;
      const configSize = localStorage.getItem(this.storageKeys.config)?.length || 0;
      
      return {
        logs: logsSize,
        auditTrail: auditSize,
        config: configSize,
        total: logsSize + auditSize + configSize,
        totalKB: Math.round((logsSize + auditSize + configSize) / 1024)
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { logs: 0, auditTrail: 0, config: 0, total: 0, totalKB: 0 };
    }
  }
};