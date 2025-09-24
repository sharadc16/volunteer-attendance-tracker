/**
 * Performance Monitoring Service
 * Monitors sync operation timing, memory usage, and efficiency metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      syncOperations: [],
      memoryUsage: [],
      apiCalls: [],
      batchOperations: [],
      networkLatency: []
    };
    this.activeOperations = new Map();
    this.alertThresholds = {
      syncDuration: 120000, // 2 minutes
      memoryUsage: 100 * 1024 * 1024, // 100MB
      apiLatency: 5000, // 5 seconds
      batchSize: 1000 // records
    };
    this.alertCallbacks = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.retentionDays = 7;
  }

  /**
   * Initialize performance monitoring
   */
  async init() {
    try {
      // Load existing metrics from storage
      await this.loadMetrics();
      
      // Start continuous monitoring
      this.startMonitoring();
      
      // Set up periodic cleanup
      this.setupPeriodicCleanup();
      
      console.log('PerformanceMonitor initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize PerformanceMonitor:', error);
      return false;
    }
  }

  /**
   * Load metrics from storage
   */
  async loadMetrics() {
    try {
      const stored = localStorage.getItem('vat_performance_metrics');
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = { ...this.metrics, ...data };
        
        // Clean up old metrics on load
        this.cleanupOldMetrics();
      }
      
      console.log('Performance metrics loaded');
      
    } catch (error) {
      console.error('Error loading performance metrics:', error);
      this.resetMetrics();
    }
  }

  /**
   * Save metrics to storage
   */
  async saveMetrics() {
    try {
      localStorage.setItem('vat_performance_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Error saving performance metrics:', error);
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      syncOperations: [],
      memoryUsage: [],
      apiCalls: [],
      batchOperations: [],
      networkLatency: []
    };
    
    try {
      localStorage.removeItem('vat_performance_metrics');
    } catch (error) {
      console.error('Error resetting metrics:', error);
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor memory usage every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Performance monitoring stopped');
  }

  /**
   * Set up periodic cleanup of old metrics
   */
  setupPeriodicCleanup() {
    // Clean up old metrics daily
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Start tracking a sync operation
   */
  startSyncOperation(operationId, operationType, dataType, recordCount = 0) {
    const operation = {
      id: operationId,
      type: operationType, // 'upload', 'download', 'full-sync'
      dataType,
      recordCount,
      startTime: performance.now(),
      startTimestamp: new Date().toISOString(),
      memoryStart: this.getCurrentMemoryUsage(),
      apiCalls: 0,
      networkCalls: 0,
      errors: []
    };
    
    this.activeOperations.set(operationId, operation);
    
    console.log(`Started tracking ${operationType} operation for ${dataType}: ${operationId}`);
    return operation;
  }

  /**
   * End tracking a sync operation
   */
  endSyncOperation(operationId, result = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`No active operation found for ID: ${operationId}`);
      return null;
    }
    
    // Calculate final metrics
    const endTime = performance.now();
    const duration = endTime - operation.startTime;
    const memoryEnd = this.getCurrentMemoryUsage();
    const memoryDelta = memoryEnd - operation.memoryStart;
    
    const completedOperation = {
      ...operation,
      endTime,
      endTimestamp: new Date().toISOString(),
      duration,
      memoryEnd,
      memoryDelta,
      success: result.success !== false,
      recordsProcessed: result.recordsProcessed || operation.recordCount,
      bytesTransferred: result.bytesTransferred || 0,
      ...result
    };
    
    // Store the completed operation
    this.metrics.syncOperations.push(completedOperation);
    
    // Remove from active operations
    this.activeOperations.delete(operationId);
    
    // Check for performance alerts
    this.checkPerformanceAlerts(completedOperation);
    
    // Save metrics
    this.saveMetrics();
    
    console.log(`Completed tracking operation ${operationId}: ${duration.toFixed(2)}ms`);
    return completedOperation;
  }

  /**
   * Record an API call
   */
  recordApiCall(method, endpoint, duration, success = true, responseSize = 0) {
    const apiCall = {
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      duration,
      success,
      responseSize,
      latency: duration
    };
    
    this.metrics.apiCalls.push(apiCall);
    this.metrics.networkLatency.push({
      timestamp: apiCall.timestamp,
      latency: duration,
      endpoint
    });
    
    // Update active operations
    this.activeOperations.forEach(operation => {
      operation.apiCalls++;
      operation.networkCalls++;
    });
    
    // Check for latency alerts
    if (duration > this.alertThresholds.apiLatency) {
      this.triggerAlert('high_latency', {
        endpoint,
        duration,
        threshold: this.alertThresholds.apiLatency
      });
    }
    
    // Limit stored API calls to prevent memory issues
    if (this.metrics.apiCalls.length > 1000) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-500);
    }
    
    if (this.metrics.networkLatency.length > 1000) {
      this.metrics.networkLatency = this.metrics.networkLatency.slice(-500);
    }
  }

  /**
   * Record a batch operation
   */
  recordBatchOperation(batchType, batchSize, duration, success = true) {
    const batchOperation = {
      timestamp: new Date().toISOString(),
      type: batchType, // 'upload', 'download', 'transform'
      size: batchSize,
      duration,
      success,
      throughput: batchSize / (duration / 1000) // records per second
    };
    
    this.metrics.batchOperations.push(batchOperation);
    
    // Check for batch size alerts
    if (batchSize > this.alertThresholds.batchSize) {
      this.triggerAlert('large_batch', {
        type: batchType,
        size: batchSize,
        threshold: this.alertThresholds.batchSize
      });
    }
    
    // Limit stored batch operations
    if (this.metrics.batchOperations.length > 500) {
      this.metrics.batchOperations = this.metrics.batchOperations.slice(-250);
    }
  }

  /**
   * Record current memory usage
   */
  recordMemoryUsage() {
    const memoryUsage = this.getCurrentMemoryUsage();
    
    this.metrics.memoryUsage.push({
      timestamp: new Date().toISOString(),
      usage: memoryUsage,
      heapUsed: this.getHeapUsage()
    });
    
    // Check for memory alerts
    if (memoryUsage > this.alertThresholds.memoryUsage) {
      this.triggerAlert('high_memory', {
        usage: memoryUsage,
        threshold: this.alertThresholds.memoryUsage
      });
    }
    
    // Limit stored memory usage records
    if (this.metrics.memoryUsage.length > 1000) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-500);
    }
  }

  /**
   * Get current memory usage estimate
   */
  getCurrentMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    
    // Fallback estimation based on stored data
    return this.estimateMemoryUsage();
  }

  /**
   * Get heap usage if available
   */
  getHeapUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * Estimate memory usage when performance.memory is not available
   */
  estimateMemoryUsage() {
    // Rough estimation based on stored data size
    const dataSize = JSON.stringify(this.metrics).length;
    return dataSize * 2; // Rough multiplier for object overhead
  }

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(operation) {
    // Check sync duration
    if (operation.duration > this.alertThresholds.syncDuration) {
      this.triggerAlert('slow_sync', {
        operationId: operation.id,
        duration: operation.duration,
        threshold: this.alertThresholds.syncDuration,
        type: operation.type,
        dataType: operation.dataType
      });
    }
    
    // Check memory delta
    if (Math.abs(operation.memoryDelta) > this.alertThresholds.memoryUsage / 2) {
      this.triggerAlert('memory_spike', {
        operationId: operation.id,
        memoryDelta: operation.memoryDelta,
        type: operation.type,
        dataType: operation.dataType
      });
    }
  }

  /**
   * Trigger a performance alert
   */
  triggerAlert(alertType, details) {
    const alert = {
      type: alertType,
      timestamp: new Date().toISOString(),
      details,
      severity: this.getAlertSeverity(alertType)
    };
    
    console.warn(`Performance Alert [${alertType}]:`, details);
    
    // Notify registered callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
    
    // Store alert for reporting
    if (!this.metrics.alerts) {
      this.metrics.alerts = [];
    }
    this.metrics.alerts.push(alert);
    
    // Limit stored alerts
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-50);
    }
  }

  /**
   * Get alert severity level
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      slow_sync: 'warning',
      high_memory: 'error',
      high_latency: 'warning',
      large_batch: 'info',
      memory_spike: 'warning'
    };
    
    return severityMap[alertType] || 'info';
  }

  /**
   * Register alert callback
   */
  onAlert(callback) {
    if (typeof callback === 'function') {
      this.alertCallbacks.push(callback);
    }
  }

  /**
   * Remove alert callback
   */
  offAlert(callback) {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Filter recent operations
    const recentOperations = this.metrics.syncOperations.filter(op => 
      new Date(op.startTimestamp) > oneDayAgo
    );
    
    const recentApiCalls = this.metrics.apiCalls.filter(call => 
      new Date(call.timestamp) > oneHourAgo
    );
    
    const recentBatches = this.metrics.batchOperations.filter(batch => 
      new Date(batch.timestamp) > oneDayAgo
    );
    
    // Calculate statistics
    const stats = {
      syncOperations: {
        total: recentOperations.length,
        successful: recentOperations.filter(op => op.success).length,
        failed: recentOperations.filter(op => !op.success).length,
        averageDuration: this.calculateAverage(recentOperations.map(op => op.duration)),
        totalRecordsProcessed: recentOperations.reduce((sum, op) => sum + (op.recordsProcessed || 0), 0)
      },
      apiCalls: {
        total: recentApiCalls.length,
        successful: recentApiCalls.filter(call => call.success).length,
        failed: recentApiCalls.filter(call => !call.success).length,
        averageLatency: this.calculateAverage(recentApiCalls.map(call => call.latency)),
        totalResponseSize: recentApiCalls.reduce((sum, call) => sum + (call.responseSize || 0), 0)
      },
      batchOperations: {
        total: recentBatches.length,
        averageSize: this.calculateAverage(recentBatches.map(batch => batch.size)),
        averageThroughput: this.calculateAverage(recentBatches.map(batch => batch.throughput)),
        totalRecords: recentBatches.reduce((sum, batch) => sum + batch.size, 0)
      },
      memory: {
        current: this.getCurrentMemoryUsage(),
        peak: Math.max(...this.metrics.memoryUsage.map(m => m.usage)),
        average: this.calculateAverage(this.metrics.memoryUsage.map(m => m.usage))
      },
      alerts: {
        total: (this.metrics.alerts || []).length,
        recent: (this.metrics.alerts || []).filter(alert => 
          new Date(alert.timestamp) > oneDayAgo
        ).length
      }
    };
    
    return stats;
  }

  /**
   * Calculate average of an array of numbers
   */
  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Get efficiency report
   */
  getEfficiencyReport() {
    const stats = this.getPerformanceStats();
    const report = {
      timestamp: new Date().toISOString(),
      syncEfficiency: {
        successRate: stats.syncOperations.total > 0 ? 
          (stats.syncOperations.successful / stats.syncOperations.total) * 100 : 0,
        averageDuration: stats.syncOperations.averageDuration,
        recordsPerSecond: stats.syncOperations.averageDuration > 0 ? 
          (stats.syncOperations.totalRecordsProcessed / (stats.syncOperations.averageDuration / 1000)) : 0
      },
      apiEfficiency: {
        successRate: stats.apiCalls.total > 0 ? 
          (stats.apiCalls.successful / stats.apiCalls.total) * 100 : 0,
        averageLatency: stats.apiCalls.averageLatency,
        callsPerMinute: stats.apiCalls.total / (60) // Assuming 1 hour window
      },
      batchEfficiency: {
        averageSize: stats.batchOperations.averageSize,
        averageThroughput: stats.batchOperations.averageThroughput,
        totalRecords: stats.batchOperations.totalRecords
      },
      memoryEfficiency: {
        currentUsage: stats.memory.current,
        peakUsage: stats.memory.peak,
        averageUsage: stats.memory.average,
        utilizationRatio: stats.memory.current / this.alertThresholds.memoryUsage
      },
      recommendations: this.generateRecommendations(stats)
    };
    
    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    // Sync performance recommendations
    if (stats.syncOperations.averageDuration > this.alertThresholds.syncDuration / 2) {
      recommendations.push({
        type: 'sync_performance',
        message: 'Consider reducing sync frequency or batch size to improve performance',
        priority: 'medium'
      });
    }
    
    // API latency recommendations
    if (stats.apiCalls.averageLatency > this.alertThresholds.apiLatency / 2) {
      recommendations.push({
        type: 'api_latency',
        message: 'High API latency detected. Consider implementing request caching or reducing call frequency',
        priority: 'high'
      });
    }
    
    // Memory usage recommendations
    if (stats.memory.current > this.alertThresholds.memoryUsage * 0.8) {
      recommendations.push({
        type: 'memory_usage',
        message: 'High memory usage detected. Consider implementing data cleanup or reducing cache size',
        priority: 'high'
      });
    }
    
    // Batch size recommendations
    if (stats.batchOperations.averageSize < 10) {
      recommendations.push({
        type: 'batch_size',
        message: 'Small batch sizes detected. Consider increasing batch size for better efficiency',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    let cleanedCount = 0;
    
    // Clean up sync operations
    const originalSyncCount = this.metrics.syncOperations.length;
    this.metrics.syncOperations = this.metrics.syncOperations.filter(op => 
      new Date(op.startTimestamp) > cutoffDate
    );
    cleanedCount += originalSyncCount - this.metrics.syncOperations.length;
    
    // Clean up API calls
    const originalApiCount = this.metrics.apiCalls.length;
    this.metrics.apiCalls = this.metrics.apiCalls.filter(call => 
      new Date(call.timestamp) > cutoffDate
    );
    cleanedCount += originalApiCount - this.metrics.apiCalls.length;
    
    // Clean up batch operations
    const originalBatchCount = this.metrics.batchOperations.length;
    this.metrics.batchOperations = this.metrics.batchOperations.filter(batch => 
      new Date(batch.timestamp) > cutoffDate
    );
    cleanedCount += originalBatchCount - this.metrics.batchOperations.length;
    
    // Clean up memory usage
    const originalMemoryCount = this.metrics.memoryUsage.length;
    this.metrics.memoryUsage = this.metrics.memoryUsage.filter(memory => 
      new Date(memory.timestamp) > cutoffDate
    );
    cleanedCount += originalMemoryCount - this.metrics.memoryUsage.length;
    
    // Clean up network latency
    const originalLatencyCount = this.metrics.networkLatency.length;
    this.metrics.networkLatency = this.metrics.networkLatency.filter(latency => 
      new Date(latency.timestamp) > cutoffDate
    );
    cleanedCount += originalLatencyCount - this.metrics.networkLatency.length;
    
    if (cleanedCount > 0) {
      this.saveMetrics();
      console.log(`Cleaned up ${cleanedCount} old performance metrics`);
    }
    
    return cleanedCount;
  }

  /**
   * Set alert thresholds
   */
  setAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    console.log('Alert thresholds updated:', this.alertThresholds);
  }

  /**
   * Get current alert thresholds
   */
  getAlertThresholds() {
    return { ...this.alertThresholds };
  }

  /**
   * Export performance data
   */
  exportPerformanceData() {
    return {
      metrics: this.metrics,
      stats: this.getPerformanceStats(),
      report: this.getEfficiencyReport(),
      thresholds: this.alertThresholds,
      exportTimestamp: new Date().toISOString()
    };
  }
}

// Make PerformanceMonitor available globally
window.PerformanceMonitor = PerformanceMonitor;