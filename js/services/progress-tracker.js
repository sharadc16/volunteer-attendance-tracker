/**
 * Sync Progress Tracker
 * Tracks and reports progress for sync operations with detailed metrics
 */
window.SyncProgressTracker = {
  
  // Current operation tracking
  currentOperation: null,
  operationStartTime: null,
  operationMetrics: {
    totalOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    totalRecords: 0,
    processedRecords: 0,
    bytesTransferred: 0,
    networkRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  },
  
  // Performance tracking
  performanceMetrics: {
    averageOperationTime: 0,
    averageRecordProcessingTime: 0,
    averageNetworkLatency: 0,
    peakMemoryUsage: 0,
    totalSyncTime: 0
  },
  
  // Progress listeners
  progressListeners: [],
  
  // Operation phases
  phases: {
    INITIALIZING: 'initializing',
    AUTHENTICATING: 'authenticating',
    READING_LOCAL: 'reading_local',
    READING_REMOTE: 'reading_remote',
    TRANSFORMING: 'transforming',
    UPLOADING: 'uploading',
    DOWNLOADING: 'downloading',
    RESOLVING_CONFLICTS: 'resolving_conflicts',
    FINALIZING: 'finalizing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  },
  
  /**
   * Initialize progress tracker
   */
  init() {
    try {
      // Reset metrics
      this.resetMetrics();
      
      // Set up performance monitoring
      this.setupPerformanceMonitoring();
      
      // Load historical performance data
      this.loadPerformanceHistory();
      
      console.log('SyncProgressTracker initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize SyncProgressTracker:', error);
      return false;
    }
  },
  
  /**
   * Start tracking a new operation
   */
  startOperation(operationType, totalRecords = 0, metadata = {}) {
    this.currentOperation = {
      type: operationType,
      startTime: Date.now(),
      totalRecords,
      processedRecords: 0,
      currentPhase: this.phases.INITIALIZING,
      phaseStartTime: Date.now(),
      phases: [],
      metadata,
      errors: [],
      warnings: []
    };
    
    this.operationStartTime = Date.now();
    this.operationMetrics.totalOperations++;
    this.operationMetrics.totalRecords += totalRecords;
    
    // Start memory monitoring
    this.startMemoryMonitoring();
    
    // Notify listeners
    this.notifyProgressListeners('operationStarted', {
      operation: this.currentOperation,
      metrics: this.operationMetrics
    });
    
    console.log(`Started tracking operation: ${operationType}`, this.currentOperation);
  },
  
  /**
   * Update operation phase
   */
  updatePhase(phase, details = {}) {
    if (!this.currentOperation) return;
    
    const now = Date.now();
    const previousPhase = this.currentOperation.currentPhase;
    const phaseDuration = now - this.currentOperation.phaseStartTime;
    
    // Record completed phase
    if (previousPhase !== this.phases.INITIALIZING) {
      this.currentOperation.phases.push({
        phase: previousPhase,
        startTime: this.currentOperation.phaseStartTime,
        endTime: now,
        duration: phaseDuration,
        details: this.currentOperation.phaseDetails || {}
      });
    }
    
    // Update to new phase
    this.currentOperation.currentPhase = phase;
    this.currentOperation.phaseStartTime = now;
    this.currentOperation.phaseDetails = details;
    
    // Notify listeners
    this.notifyProgressListeners('phaseChanged', {
      operation: this.currentOperation,
      previousPhase,
      currentPhase: phase,
      phaseDuration,
      details
    });
    
    console.log(`Phase changed: ${previousPhase} -> ${phase}`, details);
  },
  
  /**
   * Update progress within current phase
   */
  updateProgress(processedRecords, details = {}) {
    if (!this.currentOperation) return;
    
    const previousProcessed = this.currentOperation.processedRecords;
    this.currentOperation.processedRecords = processedRecords;
    
    // Update global metrics
    this.operationMetrics.processedRecords += (processedRecords - previousProcessed);
    
    // Calculate progress percentage
    const progressPercentage = this.currentOperation.totalRecords > 0 ? 
      Math.round((processedRecords / this.currentOperation.totalRecords) * 100) : 0;
    
    // Calculate processing rate
    const elapsed = Date.now() - this.currentOperation.startTime;
    const recordsPerSecond = elapsed > 0 ? Math.round((processedRecords / elapsed) * 1000) : 0;
    
    // Estimate time remaining
    const remainingRecords = this.currentOperation.totalRecords - processedRecords;
    const estimatedTimeRemaining = recordsPerSecond > 0 ? 
      Math.round(remainingRecords / recordsPerSecond) : null;
    
    // Update operation details
    this.currentOperation.progressPercentage = progressPercentage;
    this.currentOperation.recordsPerSecond = recordsPerSecond;
    this.currentOperation.estimatedTimeRemaining = estimatedTimeRemaining;
    this.currentOperation.phaseDetails = { ...this.currentOperation.phaseDetails, ...details };
    
    // Notify listeners
    this.notifyProgressListeners('progressUpdated', {
      operation: this.currentOperation,
      processedRecords,
      totalRecords: this.currentOperation.totalRecords,
      progressPercentage,
      recordsPerSecond,
      estimatedTimeRemaining,
      details
    });
  },
  
  /**
   * Record network request metrics
   */
  recordNetworkRequest(url, method, startTime, endTime, success, responseSize = 0) {
    const latency = endTime - startTime;
    
    this.operationMetrics.networkRequests++;
    this.operationMetrics.bytesTransferred += responseSize;
    
    // Update average latency
    const currentAvg = this.performanceMetrics.averageNetworkLatency;
    const requestCount = this.operationMetrics.networkRequests;
    this.performanceMetrics.averageNetworkLatency = 
      ((currentAvg * (requestCount - 1)) + latency) / requestCount;
    
    // Record in current operation if active
    if (this.currentOperation) {
      if (!this.currentOperation.networkRequests) {
        this.currentOperation.networkRequests = [];
      }
      
      this.currentOperation.networkRequests.push({
        url,
        method,
        startTime,
        endTime,
        latency,
        success,
        responseSize
      });
    }
    
    console.log(`Network request: ${method} ${url} - ${latency}ms, ${responseSize} bytes`);
  },
  
  /**
   * Record cache hit/miss
   */
  recordCacheAccess(key, hit, data = null) {
    if (hit) {
      this.operationMetrics.cacheHits++;
    } else {
      this.operationMetrics.cacheMisses++;
    }
    
    // Record in current operation if active
    if (this.currentOperation) {
      if (!this.currentOperation.cacheAccess) {
        this.currentOperation.cacheAccess = [];
      }
      
      this.currentOperation.cacheAccess.push({
        key,
        hit,
        timestamp: Date.now(),
        dataSize: data ? JSON.stringify(data).length : 0
      });
    }
  },
  
  /**
   * Add error to current operation
   */
  recordError(error, context = {}) {
    if (!this.currentOperation) return;
    
    const errorRecord = {
      message: error.message || error,
      timestamp: Date.now(),
      phase: this.currentOperation.currentPhase,
      context,
      stack: error.stack
    };
    
    this.currentOperation.errors.push(errorRecord);
    this.operationMetrics.failedOperations++;
    
    // Notify listeners
    this.notifyProgressListeners('errorRecorded', {
      operation: this.currentOperation,
      error: errorRecord
    });
    
    console.error('Operation error recorded:', errorRecord);
  },
  
  /**
   * Add warning to current operation
   */
  recordWarning(message, context = {}) {
    if (!this.currentOperation) return;
    
    const warningRecord = {
      message,
      timestamp: Date.now(),
      phase: this.currentOperation.currentPhase,
      context
    };
    
    this.currentOperation.warnings.push(warningRecord);
    
    // Notify listeners
    this.notifyProgressListeners('warningRecorded', {
      operation: this.currentOperation,
      warning: warningRecord
    });
    
    console.warn('Operation warning recorded:', warningRecord);
  },
  
  /**
   * Complete current operation
   */
  completeOperation(success = true, result = {}) {
    if (!this.currentOperation) return;
    
    const now = Date.now();
    const totalDuration = now - this.currentOperation.startTime;
    
    // Record final phase
    if (this.currentOperation.currentPhase !== this.phases.COMPLETED && 
        this.currentOperation.currentPhase !== this.phases.FAILED) {
      this.updatePhase(success ? this.phases.COMPLETED : this.phases.FAILED);
    }
    
    // Complete the operation
    this.currentOperation.endTime = now;
    this.currentOperation.totalDuration = totalDuration;
    this.currentOperation.success = success;
    this.currentOperation.result = result;
    
    // Update metrics
    if (success) {
      this.operationMetrics.completedOperations++;
    } else {
      this.operationMetrics.failedOperations++;
    }
    
    // Update performance metrics
    this.updatePerformanceMetrics(this.currentOperation);
    
    // Stop memory monitoring
    this.stopMemoryMonitoring();
    
    // Save operation to history
    this.saveOperationToHistory(this.currentOperation);
    
    // Notify listeners
    this.notifyProgressListeners('operationCompleted', {
      operation: this.currentOperation,
      metrics: this.operationMetrics,
      performance: this.performanceMetrics
    });
    
    console.log(`Operation completed: ${this.currentOperation.type}`, {
      duration: totalDuration,
      success,
      result
    });
    
    // Clear current operation
    const completedOperation = this.currentOperation;
    this.currentOperation = null;
    
    return completedOperation;
  },
  
  /**
   * Update performance metrics based on completed operation
   */
  updatePerformanceMetrics(operation) {
    const { totalDuration, processedRecords, success } = operation;
    
    if (success && totalDuration > 0) {
      // Update average operation time
      const completedOps = this.operationMetrics.completedOperations;
      const currentAvgTime = this.performanceMetrics.averageOperationTime;
      this.performanceMetrics.averageOperationTime = 
        ((currentAvgTime * (completedOps - 1)) + totalDuration) / completedOps;
      
      // Update average record processing time
      if (processedRecords > 0) {
        const recordTime = totalDuration / processedRecords;
        const currentAvgRecordTime = this.performanceMetrics.averageRecordProcessingTime;
        this.performanceMetrics.averageRecordProcessingTime = 
          ((currentAvgRecordTime * (completedOps - 1)) + recordTime) / completedOps;
      }
      
      // Update total sync time
      this.performanceMetrics.totalSyncTime += totalDuration;
    }
  },
  
  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (!performance.memory) return;
    
    this.memoryMonitorInterval = setInterval(() => {
      const memoryUsage = performance.memory.usedJSHeapSize;
      if (memoryUsage > this.performanceMetrics.peakMemoryUsage) {
        this.performanceMetrics.peakMemoryUsage = memoryUsage;
      }
    }, 1000);
  },
  
  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
  },
  
  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentOperation) {
        this.recordWarning('Page became hidden during sync operation');
      }
    });
    
    // Monitor network status changes
    window.addEventListener('online', () => {
      if (this.currentOperation) {
        this.recordWarning('Network connection restored during sync');
      }
    });
    
    window.addEventListener('offline', () => {
      if (this.currentOperation) {
        this.recordError(new Error('Network connection lost during sync'));
      }
    });
  },
  
  /**
   * Save operation to history
   */
  saveOperationToHistory(operation) {
    try {
      const history = this.getOperationHistory();
      
      // Add operation to history
      history.unshift({
        ...operation,
        // Remove large data to save storage space
        networkRequests: operation.networkRequests?.length || 0,
        cacheAccess: operation.cacheAccess?.length || 0
      });
      
      // Keep only last 100 operations
      const trimmedHistory = history.slice(0, 100);
      
      localStorage.setItem('vat_sync_operation_history', JSON.stringify(trimmedHistory));
      
    } catch (error) {
      console.error('Error saving operation to history:', error);
    }
  },
  
  /**
   * Get operation history
   */
  getOperationHistory() {
    try {
      const stored = localStorage.getItem('vat_sync_operation_history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading operation history:', error);
      return [];
    }
  },
  
  /**
   * Load performance history
   */
  loadPerformanceHistory() {
    try {
      const stored = localStorage.getItem('vat_sync_performance_metrics');
      if (stored) {
        const savedMetrics = JSON.parse(stored);
        Object.assign(this.performanceMetrics, savedMetrics);
      }
    } catch (error) {
      console.error('Error loading performance history:', error);
    }
  },
  
  /**
   * Save performance metrics
   */
  savePerformanceMetrics() {
    try {
      localStorage.setItem('vat_sync_performance_metrics', 
        JSON.stringify(this.performanceMetrics));
    } catch (error) {
      console.error('Error saving performance metrics:', error);
    }
  },
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.operationMetrics = {
      totalOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      totalRecords: 0,
      processedRecords: 0,
      bytesTransferred: 0,
      networkRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  },
  
  /**
   * Get current progress summary
   */
  getCurrentProgress() {
    if (!this.currentOperation) {
      return {
        active: false,
        message: 'No active operation'
      };
    }
    
    const { currentOperation } = this;
    return {
      active: true,
      type: currentOperation.type,
      phase: currentOperation.currentPhase,
      processedRecords: currentOperation.processedRecords,
      totalRecords: currentOperation.totalRecords,
      progressPercentage: currentOperation.progressPercentage || 0,
      recordsPerSecond: currentOperation.recordsPerSecond || 0,
      estimatedTimeRemaining: currentOperation.estimatedTimeRemaining,
      duration: Date.now() - currentOperation.startTime,
      errors: currentOperation.errors.length,
      warnings: currentOperation.warnings.length
    };
  },
  
  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const cacheHitRate = this.operationMetrics.cacheHits + this.operationMetrics.cacheMisses > 0 ?
      Math.round((this.operationMetrics.cacheHits / 
        (this.operationMetrics.cacheHits + this.operationMetrics.cacheMisses)) * 100) : 0;
    
    const successRate = this.operationMetrics.totalOperations > 0 ?
      Math.round((this.operationMetrics.completedOperations / 
        this.operationMetrics.totalOperations) * 100) : 0;
    
    return {
      ...this.performanceMetrics,
      ...this.operationMetrics,
      cacheHitRate,
      successRate,
      averageNetworkLatency: Math.round(this.performanceMetrics.averageNetworkLatency),
      peakMemoryUsageMB: Math.round(this.performanceMetrics.peakMemoryUsage / 1024 / 1024)
    };
  },
  
  /**
   * Add progress listener
   */
  addProgressListener(callback) {
    if (typeof callback === 'function') {
      this.progressListeners.push(callback);
      return true;
    }
    return false;
  },
  
  /**
   * Remove progress listener
   */
  removeProgressListener(callback) {
    const index = this.progressListeners.indexOf(callback);
    if (index > -1) {
      this.progressListeners.splice(index, 1);
    }
  },
  
  /**
   * Notify progress listeners
   */
  notifyProgressListeners(event, data) {
    this.progressListeners.forEach(callback => {
      try {
        if (typeof callback === 'function') {
          callback(event, data);
        }
      } catch (error) {
        console.error('Error in progress listener:', error);
      }
    });
  }
};