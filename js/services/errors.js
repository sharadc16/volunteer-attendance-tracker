/**
 * Centralized Error Handler for Google Sheets Sync
 * Handles error categorization, logging, recovery suggestions, and user feedback
 */
class SyncErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.errorListeners = [];
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
    this.baseRetryDelay = 1000; // 1 second
    
    // Error categories
    this.ERROR_CATEGORIES = {
      AUTHENTICATION: 'authentication',
      API: 'api',
      NETWORK: 'network',
      DATA: 'data',
      UNKNOWN: 'unknown'
    };
    
    // Error severity levels
    this.SEVERITY_LEVELS = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * Main error handling entry point
   * @param {Error|string} error - The error to handle
   * @param {Object} context - Additional context about the error
   * @returns {Object} Error handling result
   */
  handleError(error, context = {}) {
    const errorInfo = this.categorizeError(error, context);
    
    // Log the error
    this.logError(errorInfo);
    
    // Determine recovery strategy
    const recoveryStrategy = this.getRecoveryStrategy(errorInfo);
    
    // Notify listeners
    this.notifyErrorListeners(errorInfo, recoveryStrategy);
    
    // Show user notification if needed
    if (errorInfo.severity !== this.SEVERITY_LEVELS.LOW) {
      this.showUserError(errorInfo, recoveryStrategy);
    }
    
    return {
      errorInfo,
      recoveryStrategy,
      canRetry: recoveryStrategy.canRetry,
      shouldRetry: recoveryStrategy.shouldRetry
    };
  } 
 /**
   * Categorize error by type and severity
   * @param {Error|string} error - The error to categorize
   * @param {Object} context - Additional context
   * @returns {Object} Categorized error information
   */
  categorizeError(error, context) {
    const errorInfo = {
      originalError: error,
      message: this.extractErrorMessage(error),
      category: this.ERROR_CATEGORIES.UNKNOWN,
      severity: this.SEVERITY_LEVELS.MEDIUM,
      timestamp: new Date().toISOString(),
      context: context,
      code: this.extractErrorCode(error),
      stack: error?.stack,
      retryable: false
    };

    // Categorize based on error characteristics
    if (this.isAuthenticationError(error)) {
      errorInfo.category = this.ERROR_CATEGORIES.AUTHENTICATION;
      errorInfo.severity = this.SEVERITY_LEVELS.HIGH;
      errorInfo.retryable = true;
    } else if (this.isAPIError(error)) {
      errorInfo.category = this.ERROR_CATEGORIES.API;
      errorInfo.severity = this.getAPISeverity(error);
      errorInfo.retryable = this.isAPIRetryable(error);
    } else if (this.isNetworkError(error)) {
      errorInfo.category = this.ERROR_CATEGORIES.NETWORK;
      errorInfo.severity = this.SEVERITY_LEVELS.MEDIUM;
      errorInfo.retryable = true;
    } else if (this.isDataError(error)) {
      errorInfo.category = this.ERROR_CATEGORIES.DATA;
      errorInfo.severity = this.getDataSeverity(error);
      errorInfo.retryable = false;
    }

    return errorInfo;
  }

  /**
   * Extract error message from various error types
   */
  extractErrorMessage(error) {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error_description) {
      return error.error_description;
    }
    
    if (error?.result?.error?.message) {
      return error.result.error.message;
    }
    
    return 'Unknown error occurred';
  }

  /**
   * Extract error code from various error types
   */
  extractErrorCode(error) {
    if (error?.code) {
      return error.code;
    }
    
    if (error?.status) {
      return error.status;
    }
    
    if (error?.result?.error?.code) {
      return error.result.error.code;
    }
    
    return null;
  }  /**

   * Check if error is authentication-related
   */
  isAuthenticationError(error) {
    const authErrors = [
      'invalid_client',
      'access_denied',
      'unauthorized',
      'popup_blocked_by_browser',
      'popup_closed_by_user',
      'invalid_grant',
      'token_expired'
    ];
    
    const message = this.extractErrorMessage(error).toLowerCase();
    const code = this.extractErrorCode(error);
    
    return authErrors.some(authError => 
      message.includes(authError) || 
      code === authError ||
      code === 401 ||
      code === 403
    );
  }

  /**
   * Check if error is API-related
   */
  isAPIError(error) {
    const code = this.extractErrorCode(error);
    const message = this.extractErrorMessage(error).toLowerCase();
    
    return (
      (code >= 400 && code < 600) ||
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('api') ||
      message.includes('service unavailable')
    );
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error) {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('offline') ||
      message.includes('dns') ||
      error?.name === 'NetworkError' ||
      error?.code === 'NETWORK_ERROR'
    );
  }

  /**
   * Check if error is data-related
   */
  isDataError(error) {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    return (
      message.includes('validation') ||
      message.includes('invalid data') ||
      message.includes('constraint') ||
      message.includes('format') ||
      message.includes('required field') ||
      message.includes('data corruption')
    );
  }

  /**
   * Get API error severity
   */
  getAPISeverity(error) {
    const code = this.extractErrorCode(error);
    
    if (code === 429) { // Rate limit
      return this.SEVERITY_LEVELS.MEDIUM;
    }
    
    if (code >= 500) { // Server errors
      return this.SEVERITY_LEVELS.HIGH;
    }
    
    if (code >= 400) { // Client errors
      return this.SEVERITY_LEVELS.MEDIUM;
    }
    
    return this.SEVERITY_LEVELS.LOW;
  }  /**

   * Check if API error is retryable
   */
  isAPIRetryable(error) {
    const code = this.extractErrorCode(error);
    const message = this.extractErrorMessage(error).toLowerCase();
    
    // Retryable status codes
    const retryableCodes = [429, 500, 502, 503, 504];
    
    // Non-retryable conditions
    if (code === 400 || code === 401 || code === 403 || code === 404) {
      return false;
    }
    
    // Rate limit is retryable
    if (message.includes('rate limit') || message.includes('quota')) {
      return true;
    }
    
    return retryableCodes.includes(code);
  }

  /**
   * Get data error severity
   */
  getDataSeverity(error) {
    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('corruption') || message.includes('critical')) {
      return this.SEVERITY_LEVELS.CRITICAL;
    }
    
    if (message.includes('validation') || message.includes('constraint')) {
      return this.SEVERITY_LEVELS.MEDIUM;
    }
    
    return this.SEVERITY_LEVELS.LOW;
  }

  /**
   * Get recovery strategy for error
   */
  getRecoveryStrategy(errorInfo) {
    const strategy = {
      canRetry: errorInfo.retryable,
      shouldRetry: false,
      retryDelay: this.baseRetryDelay,
      maxRetries: this.maxRetryAttempts,
      actions: [],
      userMessage: '',
      technicalMessage: errorInfo.message
    };

    switch (errorInfo.category) {
      case this.ERROR_CATEGORIES.AUTHENTICATION:
        return this.getAuthRecoveryStrategy(errorInfo, strategy);
      
      case this.ERROR_CATEGORIES.API:
        return this.getAPIRecoveryStrategy(errorInfo, strategy);
      
      case this.ERROR_CATEGORIES.NETWORK:
        return this.getNetworkRecoveryStrategy(errorInfo, strategy);
      
      case this.ERROR_CATEGORIES.DATA:
        return this.getDataRecoveryStrategy(errorInfo, strategy);
      
      default:
        strategy.userMessage = 'An unexpected error occurred. Please try again.';
        strategy.actions = ['retry', 'contact_support'];
        return strategy;
    }
  }

  /**
   * Get authentication recovery strategy
   */
  getAuthRecoveryStrategy(errorInfo, strategy) {
    const code = errorInfo.code;
    const message = errorInfo.message.toLowerCase();

    if (message.includes('popup_blocked')) {
      strategy.userMessage = 'Please allow popups for this site and try again.';
      strategy.actions = ['enable_popups', 'retry'];
      strategy.canRetry = true;
    } else if (message.includes('access_denied')) {
      strategy.userMessage = 'Access was denied. Please grant permission to access Google Sheets.';
      strategy.actions = ['grant_permissions', 'retry'];
      strategy.canRetry = true;
    } else if (code === 401 || message.includes('unauthorized')) {
      strategy.userMessage = 'Your session has expired. Please sign in again.';
      strategy.actions = ['reauthenticate'];
      strategy.canRetry = true;
      strategy.shouldRetry = true;
    } else if (code === 403) {
      strategy.userMessage = 'You don\'t have permission to access this resource.';
      strategy.actions = ['check_permissions', 'contact_admin'];
      strategy.canRetry = false;
    } else {
      strategy.userMessage = 'Authentication failed. Please try signing in again.';
      strategy.actions = ['reauthenticate', 'check_credentials'];
      strategy.canRetry = true;
    }

    return strategy;
  }  /*
*
   * Get API recovery strategy
   */
  getAPIRecoveryStrategy(errorInfo, strategy) {
    const code = errorInfo.code;
    const message = errorInfo.message.toLowerCase();

    if (code === 429 || message.includes('rate limit')) {
      strategy.userMessage = 'Too many requests. Please wait a moment and try again.';
      strategy.actions = ['wait_and_retry'];
      strategy.canRetry = true;
      strategy.shouldRetry = true;
      strategy.retryDelay = this.calculateBackoffDelay(errorInfo.context?.retryCount || 0);
    } else if (message.includes('quota exceeded')) {
      strategy.userMessage = 'API quota exceeded. Please try again later or contact support.';
      strategy.actions = ['wait_longer', 'contact_support'];
      strategy.canRetry = true;
      strategy.retryDelay = 60000; // 1 minute
    } else if (code >= 500) {
      strategy.userMessage = 'Google Sheets service is temporarily unavailable. Please try again.';
      strategy.actions = ['retry_later', 'check_status'];
      strategy.canRetry = true;
      strategy.shouldRetry = true;
      strategy.retryDelay = this.calculateBackoffDelay(errorInfo.context?.retryCount || 0);
    } else if (code === 400) {
      strategy.userMessage = 'Invalid request. Please check your data and try again.';
      strategy.actions = ['validate_data', 'contact_support'];
      strategy.canRetry = false;
    } else {
      strategy.userMessage = 'API request failed. Please try again.';
      strategy.actions = ['retry', 'check_connection'];
      strategy.canRetry = true;
    }

    return strategy;
  }

  /**
   * Get network recovery strategy
   */
  getNetworkRecoveryStrategy(errorInfo, strategy) {
    const message = errorInfo.message.toLowerCase();

    if (message.includes('offline') || message.includes('network')) {
      strategy.userMessage = 'You appear to be offline. Changes will be synced when connection is restored.';
      strategy.actions = ['enable_offline_mode', 'check_connection'];
      strategy.canRetry = true;
      strategy.shouldRetry = true;
      strategy.retryDelay = 30000; // 30 seconds
      
      // Activate offline mode through NetworkManager
      this.activateOfflineMode(errorInfo);
      
    } else if (message.includes('timeout')) {
      strategy.userMessage = 'Request timed out. Please check your connection and try again.';
      strategy.actions = ['check_connection', 'retry'];
      strategy.canRetry = true;
      strategy.shouldRetry = true;
      
      // Check network status
      this.checkNetworkStatus();
      
    } else {
      strategy.userMessage = 'Network error occurred. Please check your connection.';
      strategy.actions = ['check_connection', 'retry'];
      strategy.canRetry = true;
      
      // Check network status
      this.checkNetworkStatus();
    }

    return strategy;
  }

  /**
   * Activate offline mode
   */
  activateOfflineMode(errorInfo) {
    if (window.NetworkManager) {
      // Force network status check
      window.NetworkManager.forceConnectionCheck();
      
      // Emit offline mode activation event
      window.dispatchEvent(new CustomEvent('offlineModeActivated', {
        detail: { errorInfo, timestamp: Date.now() }
      }));
    }
  }

  /**
   * Check network status
   */
  checkNetworkStatus() {
    if (window.NetworkManager) {
      window.NetworkManager.forceConnectionCheck();
    }
  }

  /**
   * Get data recovery strategy
   */
  getDataRecoveryStrategy(errorInfo, strategy) {
    const message = errorInfo.message.toLowerCase();

    if (message.includes('validation')) {
      strategy.userMessage = 'Data validation failed. Please check your input and try again.';
      strategy.actions = ['validate_input', 'fix_data'];
      strategy.canRetry = false;
    } else if (message.includes('corruption')) {
      strategy.userMessage = 'Data corruption detected. Attempting to recover from backup.';
      strategy.actions = ['restore_backup', 'contact_support'];
      strategy.canRetry = false;
    } else if (message.includes('constraint')) {
      strategy.userMessage = 'Data constraint violation. Please check for duplicate or invalid entries.';
      strategy.actions = ['check_duplicates', 'fix_constraints'];
      strategy.canRetry = false;
    } else {
      strategy.userMessage = 'Data error occurred. Please verify your information.';
      strategy.actions = ['verify_data', 'contact_support'];
      strategy.canRetry = false;
    }

    return strategy;
  }  /**
   * 
Calculate exponential backoff delay
   */
  calculateBackoffDelay(retryCount) {
    const maxDelay = 30000; // 30 seconds max
    const delay = this.baseRetryDelay * Math.pow(2, retryCount);
    return Math.min(delay, maxDelay);
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff(operation, context = {}) {
    const operationId = context.operationId || 'unknown';
    const currentAttempts = this.retryAttempts.get(operationId) || 0;
    
    if (currentAttempts >= this.maxRetryAttempts) {
      throw new Error(`Max retry attempts (${this.maxRetryAttempts}) exceeded for operation: ${operationId}`);
    }

    try {
      const result = await operation();
      
      // Success - clear retry count
      this.retryAttempts.delete(operationId);
      return result;
      
    } catch (error) {
      const newAttemptCount = currentAttempts + 1;
      this.retryAttempts.set(operationId, newAttemptCount);
      
      const errorResult = this.handleError(error, {
        ...context,
        retryCount: newAttemptCount,
        operationId
      });
      
      if (errorResult.recoveryStrategy.shouldRetry && newAttemptCount < this.maxRetryAttempts) {
        console.log(`Retrying operation ${operationId} in ${errorResult.recoveryStrategy.retryDelay}ms (attempt ${newAttemptCount})`);
        
        await this.delay(errorResult.recoveryStrategy.retryDelay);
        return this.retryWithBackoff(operation, context);
      }
      
      throw error;
    }
  }

  /**
   * Delay utility for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log error with debugging information
   */
  logError(errorInfo) {
    const logEntry = {
      ...errorInfo,
      id: this.generateErrorId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: errorInfo.timestamp
    };

    // Add to error log
    this.errorLog.unshift(logEntry);
    
    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console logging based on severity
    switch (errorInfo.severity) {
      case this.SEVERITY_LEVELS.CRITICAL:
        console.error('CRITICAL ERROR:', logEntry);
        break;
      case this.SEVERITY_LEVELS.HIGH:
        console.error('HIGH SEVERITY ERROR:', logEntry);
        break;
      case this.SEVERITY_LEVELS.MEDIUM:
        console.warn('MEDIUM SEVERITY ERROR:', logEntry);
        break;
      default:
        console.log('LOW SEVERITY ERROR:', logEntry);
    }

    // Store in localStorage for debugging
    try {
      const storedLogs = JSON.parse(localStorage.getItem('vat_error_logs') || '[]');
      storedLogs.unshift(logEntry);
      localStorage.setItem('vat_error_logs', JSON.stringify(storedLogs.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  }  /**
   
* Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Show user-friendly error message
   */
  showUserError(errorInfo, recoveryStrategy) {
    const notification = {
      type: this.getNotificationType(errorInfo.severity),
      title: this.getErrorTitle(errorInfo.category),
      message: recoveryStrategy.userMessage,
      actions: recoveryStrategy.actions,
      errorId: errorInfo.id || this.generateErrorId(),
      timestamp: errorInfo.timestamp,
      dismissible: errorInfo.severity !== this.SEVERITY_LEVELS.CRITICAL
    };

    // Emit error notification event
    window.dispatchEvent(new CustomEvent('errorNotification', {
      detail: notification
    }));

    // Also show browser notification for critical errors
    if (errorInfo.severity === this.SEVERITY_LEVELS.CRITICAL && 'Notification' in window) {
      this.showBrowserNotification(notification);
    }
  }

  /**
   * Get notification type based on severity
   */
  getNotificationType(severity) {
    switch (severity) {
      case this.SEVERITY_LEVELS.CRITICAL:
        return 'error';
      case this.SEVERITY_LEVELS.HIGH:
        return 'error';
      case this.SEVERITY_LEVELS.MEDIUM:
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Get error title based on category
   */
  getErrorTitle(category) {
    switch (category) {
      case this.ERROR_CATEGORIES.AUTHENTICATION:
        return 'Authentication Error';
      case this.ERROR_CATEGORIES.API:
        return 'Google Sheets API Error';
      case this.ERROR_CATEGORIES.NETWORK:
        return 'Network Error';
      case this.ERROR_CATEGORIES.DATA:
        return 'Data Error';
      default:
        return 'Error';
    }
  }

  /**
   * Show browser notification for critical errors
   */
  async showBrowserNotification(notification) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/assets/icons/error.png',
          tag: notification.errorId
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/assets/icons/error.png',
            tag: notification.errorId
          });
        }
      }
    } catch (error) {
      console.warn('Failed to show browser notification:', error);
    }
  } 
 /**
   * Add error listener
   */
  addErrorListener(callback) {
    this.errorListeners.push(callback);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(callback) {
    const index = this.errorListeners.indexOf(callback);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Notify error listeners
   */
  notifyErrorListeners(errorInfo, recoveryStrategy) {
    this.errorListeners.forEach(callback => {
      try {
        callback(errorInfo, recoveryStrategy);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byCategory: {},
      bySeverity: {},
      recent: this.errorLog.slice(0, 10)
    };

    this.errorLog.forEach(error => {
      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    this.retryAttempts.clear();
    
    try {
      localStorage.removeItem('vat_error_logs');
    } catch (error) {
      console.warn('Failed to clear stored error logs:', error);
    }
  }

  /**
   * Export error log for debugging
   */
  exportErrorLog() {
    return {
      errors: this.errorLog,
      stats: this.getErrorStats(),
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  /**
   * Check if operation should be retried
   */
  shouldRetryOperation(operationId) {
    const attempts = this.retryAttempts.get(operationId) || 0;
    return attempts < this.maxRetryAttempts;
  }

  /**
   * Reset retry count for operation
   */
  resetRetryCount(operationId) {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Get current retry count for operation
   */
  getRetryCount(operationId) {
    return this.retryAttempts.get(operationId) || 0;
  }
}

// Global instance for sync-specific error handling
window.SyncErrorHandler = new SyncErrorHandler();

// Also create a reference for backward compatibility
// Note: The general ErrorHandler is in error-handler.js
console.log('SyncErrorHandler initialized for Google Sheets sync');