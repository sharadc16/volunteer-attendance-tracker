/**
 * Sync Progress Integration
 * Integrates the progress tracker with the sync manager
 */
window.SyncProgressIntegration = {
  
  /**
   * Initialize progress tracking integration
   */
  init() {
    if (!window.SyncManager || !window.SyncProgressTracker) {
      console.warn('SyncManager or SyncProgressTracker not available');
      return false;
    }
    
    // Initialize progress tracker
    window.SyncProgressTracker.init();
    
    // Integrate with sync manager
    this.integrateWithSyncManager();
    
    console.log('Sync progress integration initialized');
    return true;
  },
  
  /**
   * Integrate progress tracking with sync manager
   */
  integrateWithSyncManager() {
    const syncManager = window.SyncManager;
    const progressTracker = window.SyncProgressTracker;
    
    // Store original methods
    const originalPerformSync = syncManager.performSync.bind(syncManager);
    const originalUploadChanges = syncManager.uploadChanges.bind(syncManager);
    const originalDownloadChanges = syncManager.downloadChanges.bind(syncManager);
    
    // Override performSync to add operation tracking
    syncManager.performSync = async function(options = {}) {
      const operationId = `sync-${Date.now()}`;
      
      try {
        // Start operation tracking
        progressTracker.startOperation('bidirectional-sync', 0, {
          options,
          operationId,
          timestamp: new Date().toISOString()
        });
        
        // Update phase to authenticating
        progressTracker.updatePhase(progressTracker.phases.AUTHENTICATING);
        
        // Call original method
        const result = await originalPerformSync.call(this, options);
        
        // Complete operation
        progressTracker.completeOperation(result.success, result);
        
        return result;
        
      } catch (error) {
        // Record error and complete operation
        progressTracker.recordError(error, { operationId });
        progressTracker.completeOperation(false, { error: error.message });
        throw error;
      }
    };
    
    // Override uploadChanges to add detailed progress tracking
    syncManager.uploadChanges = async function(dataType, changes, options = {}) {
      const startTime = Date.now();
      
      try {
        // Update phase and record count
        progressTracker.updatePhase(progressTracker.phases.UPLOADING, {
          dataType,
          recordCount: changes.length
        });
        
        // Update total records if this is the first data type
        if (progressTracker.currentOperation) {
          progressTracker.currentOperation.totalRecords += changes.length;
        }
        
        // Call original method
        const result = await originalUploadChanges.call(this, dataType, changes, options);
        
        // Record completion metrics
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        progressTracker.recordNetworkRequest(
          `upload-${dataType}`,
          'POST',
          startTime,
          endTime,
          true,
          JSON.stringify(changes).length
        );
        
        return result;
        
      } catch (error) {
        // Record error
        progressTracker.recordError(error, { 
          dataType, 
          operation: 'upload',
          recordCount: changes.length 
        });
        throw error;
      }
    };
    
    // Override downloadChanges to add detailed progress tracking
    syncManager.downloadChanges = async function(dataType, options = {}) {
      const startTime = Date.now();
      
      try {
        // Update phase
        progressTracker.updatePhase(progressTracker.phases.DOWNLOADING, {
          dataType
        });
        
        // Call original method
        const result = await originalDownloadChanges.call(this, dataType, options);
        
        // Record completion metrics
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        progressTracker.recordNetworkRequest(
          `download-${dataType}`,
          'GET',
          startTime,
          endTime,
          true,
          result.count * 100 // Estimate response size
        );
        
        return result;
        
      } catch (error) {
        // Record error
        progressTracker.recordError(error, { 
          dataType, 
          operation: 'download' 
        });
        throw error;
      }
    };
    
    // Add progress listeners to sync manager events
    this.addSyncManagerListeners(syncManager, progressTracker);
  },
  
  /**
   * Add listeners to sync manager events
   */
  addSyncManagerListeners(syncManager, progressTracker) {
    // Listen for upload progress
    syncManager.addListener('uploadStarted', (data) => {
      progressTracker.updatePhase(progressTracker.phases.UPLOADING, {
        dataType: data.dataType,
        totalRecords: data.totalRecords
      });
    });
    
    syncManager.addListener('uploadProgress', (data) => {
      if (data.processed && data.total) {
        progressTracker.updateProgress(data.processed, {
          dataType: data.dataType,
          phase: data.phase || 'uploading',
          total: data.total
        });
      }
    });
    
    syncManager.addListener('uploadCompleted', (data) => {
      progressTracker.updateProgress(data.count || 0, {
        dataType: data.dataType,
        completed: true,
        conflicts: data.conflicts?.length || 0,
        skipped: data.skipped || 0
      });
    });
    
    syncManager.addListener('uploadFailed', (data) => {
      progressTracker.recordError(new Error(data.error), {
        dataType: data.dataType,
        operation: 'upload'
      });
    });
    
    // Listen for download progress
    syncManager.addListener('downloadStarted', (data) => {
      progressTracker.updatePhase(progressTracker.phases.DOWNLOADING, {
        dataType: data.dataType
      });
    });
    
    syncManager.addListener('downloadProgress', (data) => {
      if (data.processed && data.total) {
        progressTracker.updateProgress(data.processed, {
          dataType: data.dataType,
          phase: data.phase || 'downloading',
          total: data.total
        });
      } else if (data.phase) {
        progressTracker.updatePhase(data.phase, {
          dataType: data.dataType
        });
      }
    });
    
    syncManager.addListener('downloadCompleted', (data) => {
      progressTracker.updateProgress(data.count || 0, {
        dataType: data.dataType,
        completed: true,
        conflicts: data.conflicts?.length || 0,
        skipped: data.skipped || 0
      });
    });
    
    syncManager.addListener('downloadFailed', (data) => {
      progressTracker.recordError(new Error(data.error), {
        dataType: data.dataType,
        operation: 'download'
      });
    });
    
    // Listen for conflict resolution
    syncManager.addListener('conflictDetected', (data) => {
      progressTracker.recordWarning('Conflict detected', {
        dataType: data.dataType,
        conflictType: data.type,
        recordId: data.recordId
      });
    });
    
    syncManager.addListener('conflictResolved', (data) => {
      progressTracker.updateProgress(progressTracker.currentOperation?.processedRecords || 0, {
        conflictResolved: true,
        resolution: data.resolution,
        dataType: data.dataType
      });
    });
  },
  
  /**
   * Get enhanced progress information
   */
  getEnhancedProgress() {
    const basicProgress = window.SyncProgressTracker.getCurrentProgress();
    const performance = window.SyncProgressTracker.getPerformanceSummary();
    
    return {
      ...basicProgress,
      performance: {
        averageOperationTime: performance.averageOperationTime,
        averageRecordProcessingTime: performance.averageRecordProcessingTime,
        networkLatency: performance.averageNetworkLatency,
        cacheHitRate: performance.cacheHitRate,
        successRate: performance.successRate,
        memoryUsage: performance.peakMemoryUsageMB
      },
      network: {
        requests: performance.networkRequests,
        bytesTransferred: performance.bytesTransferred,
        cacheHits: performance.cacheHits,
        cacheMisses: performance.cacheMisses
      }
    };
  },
  
  /**
   * Create progress notification
   */
  createProgressNotification(progress) {
    if (!progress.active) {
      return {
        title: 'Sync Status',
        message: 'No active sync operation',
        type: 'info'
      };
    }
    
    const { type, phase, progressPercentage, recordsPerSecond, estimatedTimeRemaining } = progress;
    
    let message = `${this.formatPhase(phase)}`;
    
    if (progressPercentage > 0) {
      message += ` (${progressPercentage}%)`;
    }
    
    if (recordsPerSecond > 0) {
      message += ` - ${recordsPerSecond} records/sec`;
    }
    
    if (estimatedTimeRemaining) {
      message += ` - ${this.formatDuration(estimatedTimeRemaining)} remaining`;
    }
    
    return {
      title: `${this.formatOperationType(type)} in Progress`,
      message,
      type: 'info',
      progress: progressPercentage
    };
  },
  
  /**
   * Format operation type for display
   */
  formatOperationType(type) {
    const types = {
      'bidirectional-sync': 'Sync',
      'upload': 'Upload',
      'download': 'Download',
      'conflict-resolution': 'Resolving Conflicts'
    };
    return types[type] || type;
  },
  
  /**
   * Format phase for display
   */
  formatPhase(phase) {
    const phases = {
      'initializing': 'Initializing',
      'authenticating': 'Authenticating',
      'reading_local': 'Reading local data',
      'reading_remote': 'Reading remote data',
      'transforming': 'Processing data',
      'uploading': 'Uploading changes',
      'downloading': 'Downloading changes',
      'resolving_conflicts': 'Resolving conflicts',
      'finalizing': 'Finalizing',
      'completed': 'Completed',
      'failed': 'Failed'
    };
    return phases[phase] || phase;
  },
  
  /**
   * Format duration in milliseconds to human readable
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }
};