/**
 * Centralized Error Handling Utility
 * Provides consistent error handling, logging, and recovery strategies
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
  }

  /**
   * Handle error with context and recovery strategy
   */
  handleError(error, context = {}) {
    const errorInfo = this.createErrorInfo(error, context);
    const recoveryStrategy = this.determineRecoveryStrategy(errorInfo);

    // Log the error
    this.logError(errorInfo, recoveryStrategy);

    // Notify listeners
    this.notifyErrorListeners(errorInfo, recoveryStrategy);

    return {
      errorInfo,
      recoveryStrategy
    };
  }

  /**
   * Create standardized error information
   */
  createErrorInfo(error, context) {
    return {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      stack: error.stack || '',
      timestamp: new Date().toISOString(),
      context: {
        component: context.component || 'Unknown',
        operation: context.operation || 'Unknown',
        ...context
      },
      severity: this.determineSeverity(error, context),
      category: this.categorizeError(error, context)
    };
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context) {
    const message = error.message || error.toString() || '';

    // Network errors are usually recoverable
    if (error.name === 'NetworkError' || message.includes('fetch')) {
      return 'medium';
    }

    // Authentication errors need user action
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return 'high';
    }

    // Validation errors are usually user fixable
    if (message.includes('validation') || message.includes('invalid')) {
      return 'low';
    }

    // System errors are serious
    if (context.component === 'Storage' || context.component === 'AuthManager') {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Categorize error for better handling
   */
  categorizeError(error, context) {
    const message = error.message || error.toString() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }

    if (message.includes('auth') || message.includes('credential')) {
      return 'authentication';
    }

    if (message.includes('validation') || message.includes('format')) {
      return 'validation';
    }

    if (message.includes('storage') || message.includes('localStorage')) {
      return 'storage';
    }

    if (context.component) {
      return context.component.toLowerCase();
    }

    return 'general';
  }

  /**
   * Determine recovery strategy
   */
  determineRecoveryStrategy(errorInfo) {
    const strategy = {
      canRecover: false,
      shouldRetry: false,
      retryDelay: 1000,
      maxRetries: 3,
      userAction: null,
      userMessage: null,
      actions: []
    };

    switch (errorInfo.category) {
      case 'network':
        strategy.canRecover = true;
        strategy.shouldRetry = true;
        strategy.retryDelay = 2000;
        strategy.userMessage = 'Network connection issue. Retrying...';
        strategy.actions = ['retry', 'check_connection'];
        break;

      case 'authentication':
        strategy.canRecover = true;
        strategy.shouldRetry = false;
        strategy.userAction = 'reauthenticate';
        strategy.userMessage = 'Authentication required. Please sign in again.';
        strategy.actions = ['reauthenticate', 'check_credentials'];
        break;

      case 'validation':
        strategy.canRecover = true;
        strategy.shouldRetry = false;
        strategy.userAction = 'fix_input';
        strategy.userMessage = 'Please check your input and try again.';
        strategy.actions = ['validate_input', 'show_help'];
        break;

      case 'storage':
        strategy.canRecover = true;
        strategy.shouldRetry = true;
        strategy.retryDelay = 500;
        strategy.maxRetries = 2;
        strategy.userMessage = 'Storage issue detected. Attempting to recover...';
        strategy.actions = ['retry', 'clear_cache'];
        break;

      default:
        strategy.canRecover = errorInfo.severity !== 'high';
        strategy.shouldRetry = errorInfo.severity === 'low';
        strategy.userMessage = 'An error occurred. Please try again.';
        strategy.actions = ['retry', 'report_error'];
    }

    return strategy;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff(operation, options = {}) {
    const operationId = options.operationId || 'unknown';
    const maxAttempts = options.maxRetries || this.maxRetryAttempts;
    const baseDelay = options.baseDelay || 1000;

    const currentAttempts = this.retryAttempts.get(operationId) || 0;

    if (currentAttempts >= maxAttempts) {
      throw new Error(`Max retry attempts (${maxAttempts}) exceeded for operation: ${operationId}`);
    }

    try {
      const result = await operation();

      // Success - clear retry count
      this.retryAttempts.delete(operationId);
      return result;

    } catch (error) {
      const newAttemptCount = currentAttempts + 1;
      this.retryAttempts.set(operationId, newAttemptCount);

      if (newAttemptCount >= maxAttempts) {
        this.retryAttempts.delete(operationId);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, currentAttempts);

      console.log(`Retrying operation ${operationId} in ${delay}ms (attempt ${newAttemptCount}/${maxAttempts})`);

      await this.delay(delay);
      return this.retryWithBackoff(operation, options);
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log error with context
   */
  logError(errorInfo, recoveryStrategy) {
    const logEntry = {
      ...errorInfo,
      recoveryStrategy,
      id: this.generateErrorId()
    };

    // Add to memory log
    this.errorLog.unshift(logEntry);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console logging based on severity
    const logMethod = errorInfo.severity === 'high' ? 'error' :
      errorInfo.severity === 'medium' ? 'warn' : 'log';

    console[logMethod](`[${errorInfo.severity.toUpperCase()}] ${errorInfo.category}:`, errorInfo.message);

    // Store in localStorage for debugging
    this.storeErrorLog(logEntry);
  }

  /**
   * Store error log in localStorage
   */
  storeErrorLog(logEntry) {
    try {
      const storedLogs = JSON.parse(localStorage.getItem('vat_error_logs') || '[]');
      storedLogs.unshift(logEntry);
      localStorage.setItem('vat_error_logs', JSON.stringify(storedLogs.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit = 20) {
    return this.errorLog.slice(0, limit);
  }

  /**
   * Clear error logs
   */
  clearErrorLogs() {
    this.errorLog = [];
    this.retryAttempts.clear();

    try {
      localStorage.removeItem('vat_error_logs');
    } catch (error) {
      console.warn('Failed to clear stored error logs:', error);
    }
  }

  /**
   * Error listeners for UI notifications
   */
  errorListeners = [];

  addErrorListener(callback) {
    this.errorListeners.push(callback);
  }

  removeErrorListener(callback) {
    const index = this.errorListeners.indexOf(callback);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

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
   * Wrap async function with error handling
   */
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const result = this.handleError(error, context);

        if (result.recoveryStrategy.shouldRetry) {
          return this.retryWithBackoff(() => fn(...args), {
            operationId: context.operation || 'wrapped_function'
          });
        }

        throw error;
      }
    };
  }

  /**
   * Wrap sync function with error handling
   */
  wrapSync(fn, context = {}) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(error, context);
        throw error;
      }
    };
  }
}

// Global instance
window.ErrorHandler = new ErrorHandler();

console.log('ErrorHandler initialized');