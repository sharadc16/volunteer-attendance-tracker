/**
 * Centralized Error Handler Service
 * Provides comprehensive error handling and user feedback for all application operations
 * Requirements: 1.3, 4.2, 5.4, 10.3, 11.6
 */
class ErrorHandler {
  constructor() {
    this.isInitialized = false;
    this.errorLog = [];
    this.maxLogEntries = 1000;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    // Error categories for better handling
    this.errorCategories = {
      NETWORK: 'network',
      STORAGE: 'storage',
      VALIDATION: 'validation',
      AUTHENTICATION: 'authentication',
      SYNC: 'sync',
      SCANNER: 'scanner',
      CONNECTIVITY: 'connectivity',
      ENVIRONMENT: 'environment',
      PERMISSION: 'permission',
      DATA: 'data',
      SYSTEM: 'system'
    };
    
    // Error severity levels
    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
    
    // Bind methods
    this.handleError = this.handleError.bind(this);
    this.handleAsyncError = this.handleAsyncError.bind(this);
    this.showUserFriendlyError = this.showUserFriendlyError.bind(this);
  }

  /**
   * Initialize error handler
   */
  async init() {
    if (this.isInitialized) return true;

    try {
      // Load error log from storage
      await this.loadErrorLog();
      
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      // Set up unhandled promise rejection handler
      this.setupUnhandledRejectionHandler();
      
      // Clean up old error logs
      await this.cleanupOldLogs();
      
      this.isInitialized = true;
      console.log('ErrorHandler initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize ErrorHandler:', error);
      this.isInitialized = true; // Still mark as initialized to prevent loops
      return false;
    }
  }

  /**
   * Main error handling method
   * @param {Error|string} error - The error to handle
   * @param {Object} context - Additional context about the error
   * @param {Object} options - Error handling options
   */
  async handleError(error, context = {}, options = {}) {
    try {
      // Normalize error object
      const normalizedError = this.normalizeError(error);
      
      // Categorize and analyze error
      const errorInfo = this.analyzeError(normalizedError, context);
      
      // Log the error
      await this.logError(errorInfo);
      
      // Determine if retry is appropriate
      if (options.allowRetry && this.shouldRetry(errorInfo)) {
        return await this.attemptRetry(errorInfo, options);
      }
      
      // Show user-friendly feedback
      if (!options.silent) {
        this.showUserFriendlyError(errorInfo, options);
      }
      
      // Emit error event for other components
      Utils.Event.emit('errorOccurred', {
        error: errorInfo,
        context,
        timestamp: new Date().toISOString()
      });
      
      return errorInfo;
      
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      // Fallback to basic error display
      this.showBasicError(error);
    }
  }

  /**
   * Handle async operations with automatic error handling
   * @param {Function} asyncOperation - The async function to execute
   * @param {Object} context - Context information
   * @param {Object} options - Error handling options
   */
  async handleAsyncError(asyncOperation, context = {}, options = {}) {
    try {
      // Show loading indicator if specified
      if (options.loadingElement) {
        this.showLoadingIndicator(options.loadingElement, options.loadingMessage);
      }
      
      const result = await asyncOperation();
      
      // Hide loading indicator
      if (options.loadingElement) {
        this.hideLoadingIndicator(options.loadingElement);
      }
      
      return { success: true, result };
      
    } catch (error) {
      // Hide loading indicator on error
      if (options.loadingElement) {
        this.hideLoadingIndicator(options.loadingElement);
      }
      
      // Handle the error
      const errorInfo = await this.handleError(error, context, options);
      
      return { success: false, error: errorInfo };
    }
  }

  /**
   * Normalize error to consistent format
   */
  normalizeError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        originalError: error
      };
    }
    
    if (typeof error === 'string') {
      return {
        name: 'Error',
        message: error,
        stack: null,
        originalError: new Error(error)
      };
    }
    
    if (typeof error === 'object' && error !== null) {
      return {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        originalError: error
      };
    }
    
    return {
      name: 'Error',
      message: 'Unknown error occurred',
      stack: null,
      originalError: error
    };
  }

  /**
   * Analyze error to determine category, severity, and recovery options
   */
  analyzeError(normalizedError, context) {
    const errorInfo = {
      id: Utils.String.generateId(),
      timestamp: new Date().toISOString(),
      name: normalizedError.name,
      message: normalizedError.message,
      stack: normalizedError.stack,
      context: context,
      category: this.categorizeError(normalizedError, context),
      severity: this.determineSeverity(normalizedError, context),
      userMessage: null,
      recoveryOptions: [],
      retryable: false,
      originalError: normalizedError.originalError
    };
    
    // Generate user-friendly message and recovery options
    this.generateUserFriendlyInfo(errorInfo);
    
    return errorInfo;
  }

  /**
   * Categorize error based on message and context
   */
  categorizeError(error, context) {
    const message = error.message.toLowerCase();
    const contextType = context.type || '';
    
    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || message.includes('timeout') ||
        message.includes('cors') || contextType.includes('api')) {
      return this.errorCategories.NETWORK;
    }
    
    // Storage-related errors
    if (message.includes('storage') || message.includes('indexeddb') ||
        message.includes('quota') || contextType.includes('storage')) {
      return this.errorCategories.STORAGE;
    }
    
    // Authentication errors
    if (message.includes('auth') || message.includes('unauthorized') ||
        message.includes('token') || message.includes('login') ||
        contextType.includes('auth')) {
      return this.errorCategories.AUTHENTICATION;
    }
    
    // Sync-related errors
    if (message.includes('sync') || message.includes('sheets') ||
        contextType.includes('sync')) {
      return this.errorCategories.SYNC;
    }
    
    // Scanner-related errors
    if (message.includes('scanner') || message.includes('scan') ||
        contextType.includes('scanner')) {
      return this.errorCategories.SCANNER;
    }
    
    // Connectivity validation errors
    if (message.includes('connectivity') || message.includes('validation') ||
        contextType.includes('connectivity')) {
      return this.errorCategories.CONNECTIVITY;
    }
    
    // Environment-related errors
    if (message.includes('environment') || message.includes('config') ||
        contextType.includes('environment')) {
      return this.errorCategories.ENVIRONMENT;
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('access') ||
        message.includes('forbidden')) {
      return this.errorCategories.PERMISSION;
    }
    
    // Data validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        contextType.includes('validation')) {
      return this.errorCategories.VALIDATION;
    }
    
    // Default to system error
    return this.errorCategories.SYSTEM;
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context) {
    const message = error.message.toLowerCase();
    const category = this.categorizeError(error, context);
    
    // Critical errors that prevent core functionality
    if (message.includes('critical') || message.includes('fatal') ||
        category === this.errorCategories.STORAGE && message.includes('quota')) {
      return this.severityLevels.CRITICAL;
    }
    
    // High severity errors that significantly impact functionality
    if (category === this.errorCategories.AUTHENTICATION ||
        category === this.errorCategories.CONNECTIVITY ||
        category === this.errorCategories.ENVIRONMENT ||
        message.includes('cannot') || message.includes('failed to')) {
      return this.severityLevels.HIGH;
    }
    
    // Medium severity errors that impact some functionality
    if (category === this.errorCategories.SYNC ||
        category === this.errorCategories.NETWORK ||
        category === this.errorCategories.SCANNER) {
      return this.severityLevels.MEDIUM;
    }
    
    // Low severity errors that have minimal impact
    return this.severityLevels.LOW;
  }

  /**
   * Generate user-friendly error message and recovery options
   */
  generateUserFriendlyInfo(errorInfo) {
    const { category, message, context } = errorInfo;
    
    switch (category) {
      case this.errorCategories.NETWORK:
        errorInfo.userMessage = 'Network connection issue. Please check your internet connection.';
        errorInfo.recoveryOptions = [
          'Check your internet connection',
          'Try again in a few moments',
          'Contact IT support if the problem persists'
        ];
        errorInfo.retryable = true;
        break;
        
      case this.errorCategories.STORAGE:
        if (message.includes('quota')) {
          errorInfo.userMessage = 'Storage space is full. Please clear some data or contact an administrator.';
          errorInfo.recoveryOptions = [
            'Clear old attendance records',
            'Export data and clear local storage',
            'Contact administrator for assistance'
          ];
        } else {
          errorInfo.userMessage = 'Data storage issue. Your information may not be saved properly.';
          errorInfo.recoveryOptions = [
            'Try refreshing the page',
            'Check if you have sufficient storage space',
            'Contact technical support'
          ];
        }
        break;
        
      case this.errorCategories.AUTHENTICATION:
        errorInfo.userMessage = 'Authentication issue. Please sign in again.';
        errorInfo.recoveryOptions = [
          'Sign out and sign in again',
          'Check your Google account permissions',
          'Clear browser cache and cookies',
          'Contact administrator if problem persists'
        ];
        break;
        
      case this.errorCategories.SYNC:
        errorInfo.userMessage = 'Data synchronization failed. Your changes may not be saved to the cloud.';
        errorInfo.recoveryOptions = [
          'Check your internet connection',
          'Verify Google Sheets permissions',
          'Try manual sync from settings',
          'Data is saved locally and will sync when connection is restored'
        ];
        errorInfo.retryable = true;
        break;
        
      case this.errorCategories.SCANNER:
        errorInfo.userMessage = 'Scanner issue. Please try scanning again.';
        errorInfo.recoveryOptions = [
          'Try scanning the badge again',
          'Check if the scanner is properly connected',
          'Manually enter the volunteer ID',
          'Contact technical support if scanner continues to malfunction'
        ];
        errorInfo.retryable = true;
        break;
        
      case this.errorCategories.CONNECTIVITY:
        errorInfo.userMessage = 'System connectivity check failed. Some features may not work properly.';
        errorInfo.recoveryOptions = [
          'Check your internet connection',
          'Verify Google Sheets access permissions',
          'Try refreshing the page',
          'Use development bypass mode if available'
        ];
        break;
        
      case this.errorCategories.ENVIRONMENT:
        errorInfo.userMessage = 'Environment configuration issue. Please check your settings.';
        errorInfo.recoveryOptions = [
          'Verify you are in the correct environment (DEV/TEST/PROD)',
          'Check Google Sheets configuration',
          'Contact administrator to verify environment setup',
          'Switch to the correct environment if needed'
        ];
        break;
        
      case this.errorCategories.PERMISSION:
        errorInfo.userMessage = 'Permission denied. You may not have access to this feature.';
        errorInfo.recoveryOptions = [
          'Contact administrator for access permissions',
          'Verify you are signed in with the correct account',
          'Check if your role allows this action'
        ];
        break;
        
      case this.errorCategories.VALIDATION:
        errorInfo.userMessage = 'Data validation failed. Please check your input.';
        errorInfo.recoveryOptions = [
          'Verify the information you entered is correct',
          'Check required fields are filled',
          'Try again with different input'
        ];
        break;
        
      default:
        errorInfo.userMessage = 'An unexpected error occurred. Please try again.';
        errorInfo.recoveryOptions = [
          'Try refreshing the page',
          'Check your internet connection',
          'Contact technical support if the problem persists'
        ];
        errorInfo.retryable = true;
    }
  }

  /**
   * Show user-friendly error message
   */
  showUserFriendlyError(errorInfo, options = {}) {
    const { userMessage, recoveryOptions, severity } = errorInfo;
    const targetElement = options.targetElement || '#errorFeedback';
    
    // Determine feedback type based on severity
    let feedbackType = 'error';
    if (severity === this.severityLevels.CRITICAL) {
      feedbackType = 'critical';
    } else if (severity === this.severityLevels.HIGH) {
      feedbackType = 'error';
    } else if (severity === this.severityLevels.MEDIUM) {
      feedbackType = 'warning';
    } else {
      feedbackType = 'info';
    }
    
    // Show basic error message
    if (window.UI && window.UI.Feedback) {
      UI.Feedback.show(targetElement, userMessage, feedbackType);
    } else {
      console.error('UI.Feedback not available, showing console error:', userMessage);
    }
    
    // Show detailed error modal for high/critical errors
    if (severity === this.severityLevels.HIGH || severity === this.severityLevels.CRITICAL) {
      this.showDetailedErrorModal(errorInfo, options);
    }
  }

  /**
   * Show detailed error modal with recovery options
   */
  showDetailedErrorModal(errorInfo, options = {}) {
    if (!window.UI || !window.UI.Modal) {
      console.error('UI.Modal not available for detailed error display');
      return;
    }
    
    const { userMessage, recoveryOptions, category, severity } = errorInfo;
    
    // Create modal content
    const modalContent = `
      <div class="error-modal-content">
        <div class="error-header ${severity}">
          <div class="error-icon">${this.getErrorIcon(category, severity)}</div>
          <div class="error-title">${this.getErrorTitle(category, severity)}</div>
        </div>
        
        <div class="error-message">
          ${userMessage}
        </div>
        
        ${recoveryOptions.length > 0 ? `
          <div class="error-recovery">
            <h4>What you can do:</h4>
            <ul class="recovery-options">
              ${recoveryOptions.map(option => `<li>${option}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${options.showTechnicalDetails ? `
          <details class="error-technical">
            <summary>Technical Details</summary>
            <div class="technical-info">
              <p><strong>Error:</strong> ${errorInfo.name}</p>
              <p><strong>Message:</strong> ${errorInfo.message}</p>
              <p><strong>Category:</strong> ${errorInfo.category}</p>
              <p><strong>Time:</strong> ${Utils.Date.format(errorInfo.timestamp, 'datetime')}</p>
              ${errorInfo.context.operation ? `<p><strong>Operation:</strong> ${errorInfo.context.operation}</p>` : ''}
            </div>
          </details>
        ` : ''}
      </div>
    `;
    
    // Show modal with appropriate buttons
    const buttons = [
      {
        text: 'OK',
        class: 'btn-primary',
        handler: () => UI.Modal.hide()
      }
    ];
    
    // Add retry button if error is retryable
    if (errorInfo.retryable && options.retryHandler) {
      buttons.unshift({
        text: 'Try Again',
        class: 'btn-secondary',
        handler: () => {
          UI.Modal.hide();
          options.retryHandler();
        }
      });
    }
    
    UI.Modal.show(this.getErrorTitle(category, severity), modalContent, buttons);
  }

  /**
   * Get error icon based on category and severity
   */
  getErrorIcon(category, severity) {
    if (severity === this.severityLevels.CRITICAL) return '🚨';
    if (severity === this.severityLevels.HIGH) return '❌';
    if (severity === this.severityLevels.MEDIUM) return '⚠️';
    
    const icons = {
      [this.errorCategories.NETWORK]: '🌐',
      [this.errorCategories.STORAGE]: '💾',
      [this.errorCategories.AUTHENTICATION]: '🔐',
      [this.errorCategories.SYNC]: '🔄',
      [this.errorCategories.SCANNER]: '📱',
      [this.errorCategories.CONNECTIVITY]: '📡',
      [this.errorCategories.ENVIRONMENT]: '⚙️',
      [this.errorCategories.PERMISSION]: '🚫',
      [this.errorCategories.VALIDATION]: '✏️'
    };
    
    return icons[category] || 'ℹ️';
  }

  /**
   * Get error title based on category and severity
   */
  getErrorTitle(category, severity) {
    if (severity === this.severityLevels.CRITICAL) return 'Critical System Error';
    if (severity === this.severityLevels.HIGH) return 'System Error';
    if (severity === this.severityLevels.MEDIUM) return 'Warning';
    
    const titles = {
      [this.errorCategories.NETWORK]: 'Network Error',
      [this.errorCategories.STORAGE]: 'Storage Error',
      [this.errorCategories.AUTHENTICATION]: 'Authentication Error',
      [this.errorCategories.SYNC]: 'Sync Error',
      [this.errorCategories.SCANNER]: 'Scanner Error',
      [this.errorCategories.CONNECTIVITY]: 'Connectivity Error',
      [this.errorCategories.ENVIRONMENT]: 'Environment Error',
      [this.errorCategories.PERMISSION]: 'Permission Error',
      [this.errorCategories.VALIDATION]: 'Validation Error'
    };
    
    return titles[category] || 'System Notice';
  }

  /**
   * Show basic error (fallback when UI components not available)
   */
  showBasicError(error) {
    const message = typeof error === 'string' ? error : error.message || 'An error occurred';
    
    // Try to show in a simple alert
    if (typeof alert !== 'undefined') {
      alert(`Error: ${message}`);
    } else {
      console.error('Error (no UI available):', message);
    }
  }

  /**
   * Show loading indicator
   */
  showLoadingIndicator(element, message = 'Loading...') {
    const targetEl = typeof element === 'string' ? document.querySelector(element) : element;
    if (!targetEl) return;
    
    // Store original content
    if (!targetEl.dataset.originalContent) {
      targetEl.dataset.originalContent = targetEl.innerHTML;
    }
    
    // Show loading indicator
    targetEl.innerHTML = `
      <div class="loading-indicator">
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
      </div>
    `;
    
    targetEl.classList.add('loading');
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator(element) {
    const targetEl = typeof element === 'string' ? document.querySelector(element) : element;
    if (!targetEl) return;
    
    // Restore original content
    if (targetEl.dataset.originalContent) {
      targetEl.innerHTML = targetEl.dataset.originalContent;
      delete targetEl.dataset.originalContent;
    }
    
    targetEl.classList.remove('loading');
  }

  /**
   * Determine if error should be retried
   */
  shouldRetry(errorInfo) {
    // Don't retry if already at max attempts
    const attemptKey = `${errorInfo.context.operation || 'unknown'}_${errorInfo.category}`;
    const attempts = this.retryAttempts.get(attemptKey) || 0;
    
    if (attempts >= this.maxRetries) {
      return false;
    }
    
    // Only retry certain categories of errors
    const retryableCategories = [
      this.errorCategories.NETWORK,
      this.errorCategories.SYNC,
      this.errorCategories.SCANNER
    ];
    
    return errorInfo.retryable && retryableCategories.includes(errorInfo.category);
  }

  /**
   * Attempt to retry failed operation
   */
  async attemptRetry(errorInfo, options) {
    const attemptKey = `${errorInfo.context.operation || 'unknown'}_${errorInfo.category}`;
    const attempts = this.retryAttempts.get(attemptKey) || 0;
    
    // Increment retry count
    this.retryAttempts.set(attemptKey, attempts + 1);
    
    // Calculate delay with exponential backoff
    const delay = this.retryDelay * Math.pow(2, attempts);
    
    console.log(`Retrying operation after ${delay}ms (attempt ${attempts + 1}/${this.maxRetries})`);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Show retry feedback
    if (options.targetElement && window.UI && window.UI.Feedback) {
      UI.Feedback.show(options.targetElement, 
        `Retrying... (attempt ${attempts + 1}/${this.maxRetries})`, 'info');
    }
    
    try {
      // Attempt retry if retry function provided
      if (options.retryFunction) {
        const result = await options.retryFunction();
        
        // Clear retry count on success
        this.retryAttempts.delete(attemptKey);
        
        return { success: true, result };
      }
      
      return { success: false, error: 'No retry function provided' };
      
    } catch (retryError) {
      // Handle retry failure
      return await this.handleError(retryError, 
        { ...errorInfo.context, isRetry: true }, 
        { ...options, allowRetry: false }
      );
    }
  }

  /**
   * Log error to storage
   */
  async logError(errorInfo) {
    try {
      // Add to in-memory log
      this.errorLog.push(errorInfo);
      
      // Keep log size manageable
      if (this.errorLog.length > this.maxLogEntries) {
        this.errorLog = this.errorLog.slice(-this.maxLogEntries);
      }
      
      // Save to storage
      await this.saveErrorLog();
      
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  /**
   * Load error log from storage
   */
  async loadErrorLog() {
    try {
      const stored = await Storage.getItem('errorLog');
      if (stored && Array.isArray(stored)) {
        this.errorLog = stored.slice(-this.maxLogEntries);
      }
    } catch (error) {
      console.error('Failed to load error log:', error);
      this.errorLog = [];
    }
  }

  /**
   * Save error log to storage
   */
  async saveErrorLog() {
    try {
      await Storage.setItem('errorLog', this.errorLog);
    } catch (error) {
      console.error('Failed to save error log:', error);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(period = 'today') {
    const now = new Date();
    let filteredErrors = this.errorLog;
    
    // Filter by period
    switch (period) {
      case 'today':
        const today = Utils.Date.today();
        filteredErrors = this.errorLog.filter(error => 
          Utils.Date.format(error.timestamp, 'date') === today
        );
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredErrors = this.errorLog.filter(error => 
          new Date(error.timestamp) >= weekAgo
        );
        break;
    }
    
    // Calculate statistics
    const stats = {
      totalErrors: filteredErrors.length,
      byCategory: Utils.Array.groupBy(filteredErrors, 'category'),
      bySeverity: Utils.Array.groupBy(filteredErrors, 'severity'),
      mostCommon: this.getMostCommonErrors(filteredErrors),
      recentErrors: filteredErrors.slice(-10).reverse()
    };
    
    return stats;
  }

  /**
   * Get most common errors
   */
  getMostCommonErrors(errors, limit = 5) {
    const errorCounts = {};
    
    errors.forEach(error => {
      const key = `${error.category}:${error.name}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => ({ error: key, count }));
  }

  /**
   * Clean up old error logs
   */
  async cleanupOldLogs(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      this.errorLog = this.errorLog.filter(error => 
        new Date(error.timestamp) >= cutoffDate
      );
      
      await this.saveErrorLog();
      
    } catch (error) {
      console.error('Failed to cleanup old error logs:', error);
    }
  }

  /**
   * Set up global error handlers
   */
  setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || event.message, {
        type: 'global',
        operation: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }, { silent: false });
    });
  }

  /**
   * Set up unhandled promise rejection handler
   */
  setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'global',
        operation: 'unhandled_promise_rejection'
      }, { silent: false });
      
      // Prevent default browser behavior
      event.preventDefault();
    });
  }

  /**
   * Clear all error logs
   */
  async clearErrorLog() {
    try {
      this.errorLog = [];
      this.retryAttempts.clear();
      await Storage.removeItem('errorLog');
      console.log('Error log cleared');
    } catch (error) {
      console.error('Failed to clear error log:', error);
    }
  }

  /**
   * Export error log for debugging
   */
  exportErrorLog() {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        errors: this.errorLog,
        stats: this.getErrorStats('week')
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], 
        { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-log-${Utils.Date.format(new Date(), 'date')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to export error log:', error);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff(operation, operationName, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Retrying operation ${operationName} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    throw lastError;
  }
}

// Global instance
window.ErrorHandler = new ErrorHandler();