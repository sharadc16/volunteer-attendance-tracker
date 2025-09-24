/**
 * Sync Performance Integration
 * Integrates delta sync and performance monitoring with the main sync service
 */
class SyncPerformanceIntegration {
  constructor() {
    this.deltaSyncManager = null;
    this.performanceMonitor = null;
    this.isInitialized = false;
    this.optimizationSettings = {
      enableDeltaSync: true,
      enablePerformanceMonitoring: true,
      enableBatchOptimization: true,
      enableMemoryOptimization: true
    };
  }

  /**
   * Initialize performance integration
   */
  async init() {
    try {
      console.log('Initializing sync performance integration...');
      
      // Initialize delta sync manager
      if (this.optimizationSettings.enableDeltaSync && window.DeltaSyncManager) {
        this.deltaSyncManager = new window.DeltaSyncManager();
        await this.deltaSyncManager.init();
        console.log('Delta sync manager initialized');
      }
      
      // Initialize performance monitor
      if (this.optimizationSettings.enablePerformanceMonitoring && window.PerformanceMonitor) {
        this.performanceMonitor = new window.PerformanceMonitor();
        await this.performanceMonitor.init();
        console.log('Performance monitor initialized');
      }
      
      // Integrate with existing sync manager
      await this.integrateWithSyncManager();
      
      // Set up UI responsiveness optimizations
      this.setupUIOptimizations();
      
      // Set up memory management
      this.setupMemoryManagement();
      
      this.isInitialized = true;
      console.log('Sync performance integration completed successfully');
      
      return true;
      
    } catch (error) {
      console.error('Failed to initialize sync performance integration:', error);
      return false;
    }
  }

  /**
   * Integrate with existing sync manager
   */
  async integrateWithSyncManager() {
    if (!window.SyncManager) {
      console.warn('SyncManager not available for integration');
      return;
    }

    const originalSyncManager = window.SyncManager;
    
    // Enhance sync manager with performance optimizations
    if (originalSyncManager.performSync) {
      const originalPerformSync = originalSyncManager.performSync.bind(originalSyncManager);
      
      originalSyncManager.performSync = async (options = {}) => {
        let operationId = null;
        
        try {
          // Start performance monitoring
          if (this.performanceMonitor) {
            operationId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.performanceMonitor.startSyncOperation(
              operationId, 
              'full-sync', 
              'all', 
              0
            );
          }
          
          // Use delta sync if enabled
          if (this.deltaSyncManager && this.optimizationSettings.enableDeltaSync) {
            options = await this.enhanceOptionsWithDeltaSync(options);
          }
          
          // Execute original sync with optimizations
          const result = await this.executeOptimizedSync(originalPerformSync, options);
          
          // End performance monitoring
          if (this.performanceMonitor && operationId) {
            this.performanceMonitor.endSyncOperation(operationId, {
              success: result.success,
              recordsProcessed: this.calculateRecordsProcessed(result)
            });
          }
          
          return result;
          
        } catch (error) {
          // End performance monitoring with error
          if (this.performanceMonitor && operationId) {
            this.performanceMonitor.endSyncOperation(operationId, {
              success: false,
              error: error.message
            });
          }
          
          throw error;
        }
      };
    }

    // Enhance upload changes method
    if (originalSyncManager.uploadChanges) {
      const originalUploadChanges = originalSyncManager.uploadChanges.bind(originalSyncManager);
      
      originalSyncManager.uploadChanges = async (dataType, changes, options = {}) => {
        let operationId = null;
        
        try {
          // Start performance monitoring
          if (this.performanceMonitor) {
            operationId = `upload_${dataType}_${Date.now()}`;
            this.performanceMonitor.startSyncOperation(
              operationId, 
              'upload', 
              dataType, 
              changes.length
            );
          }
          
          // Apply delta sync optimizations
          let optimizedChanges = changes;
          if (this.deltaSyncManager && this.optimizationSettings.enableDeltaSync) {
            optimizedChanges = await this.optimizeChangesForUpload(dataType, changes);
          }
          
          // Execute upload with batch optimizations
          const result = await this.executeOptimizedUpload(
            originalUploadChanges, 
            dataType, 
            optimizedChanges, 
            options
          );
          
          // End performance monitoring
          if (this.performanceMonitor && operationId) {
            this.performanceMonitor.endSyncOperation(operationId, {
              success: true,
              recordsProcessed: result.count || 0
            });
          }
          
          return result;
          
        } catch (error) {
          // End performance monitoring with error
          if (this.performanceMonitor && operationId) {
            this.performanceMonitor.endSyncOperation(operationId, {
              success: false,
              error: error.message
            });
          }
          
          throw error;
        }
      };
    }

    // Enhance download changes method
    if (originalSyncManager.downloadChanges) {
      const originalDownloadChanges = originalSyncManager.downloadChanges.bind(originalSyncManager);
      
      originalSyncManager.downloadChanges = async (dataType, options = {}) => {
        let operationId = null;
        
        try {
          // Start performance monitoring
          if (this.performanceMonitor) {
            operationId = `download_${dataType}_${Date.now()}`;
            this.performanceMonitor.startSyncOperation(
              operationId, 
              'download', 
              dataType, 
              0
            );
          }
          
          // Execute download with optimizations
          const result = await this.executeOptimizedDownload(
            originalDownloadChanges, 
            dataType, 
            options
          );
          
          // End performance monitoring
          if (this.performanceMonitor && operationId) {
            this.performanceMonitor.endSyncOperation(operationId, {
              success: true,
              recordsProcessed: result.count || 0
            });
          }
          
          return result;
          
        } catch (error) {
          // End performance monitoring with error
          if (this.performanceMonitor && operationId) {
            this.performanceMonitor.endSyncOperation(operationId, {
              success: false,
              error: error.message
            });
          }
          
          throw error;
        }
      };
    }
  }

  /**
   * Enhance sync options with delta sync information
   */
  async enhanceOptionsWithDeltaSync(options) {
    if (!this.deltaSyncManager) return options;

    const enhancedOptions = { ...options };
    
    // Get delta changes for each data type
    if (!enhancedOptions.types) {
      enhancedOptions.types = ['volunteers', 'events', 'attendance'];
    }
    
    enhancedOptions.deltaChanges = {};
    enhancedOptions.modifiedRecords = {};
    
    for (const dataType of enhancedOptions.types) {
      const lastSyncTime = window.SyncManager?.lastSync?.[dataType];
      
      // Get tracked changes (for queued operations)
      const changes = await this.deltaSyncManager.getChangesSince(dataType, lastSyncTime);
      enhancedOptions.deltaChanges[dataType] = changes;
      
      // Get modified records since last sync (Requirement 9.2)
      const modifiedData = await this.deltaSyncManager.getModifiedRecordsSince(dataType, lastSyncTime);
      enhancedOptions.modifiedRecords[dataType] = modifiedData;
      
      console.log(
        `Delta sync for ${dataType}: ${changes.length} tracked changes, ` +
        `${modifiedData.changeCount} modified records (${modifiedData.isFullSync ? 'full' : 'delta'} sync)`
      );
    }
    
    return enhancedOptions;
  }

  /**
   * Optimize changes for upload using delta sync
   */
  async optimizeChangesForUpload(dataType, changes) {
    if (!this.deltaSyncManager) return changes;

    // Get tracked changes
    const trackedChanges = await this.deltaSyncManager.getChangesSince(dataType, null);
    
    if (trackedChanges.length === 0) {
      return changes;
    }
    
    // Filter changes to only include those that haven't been synced
    const unsyncedChanges = changes.filter(change => {
      const tracked = trackedChanges.find(tc => tc.id === change.id);
      return !tracked || !tracked.synced;
    });
    
    // Apply deduplication and optimization (Requirement 9.4)
    const operations = unsyncedChanges.map(change => ({
      id: change.id,
      dataType,
      operation: change._changeType || 'update',
      data: change,
      timestamp: change._changeTimestamp || change.updatedAt || change.createdAt
    }));
    
    const optimizedOperations = await this.deltaSyncManager.optimizeAndDeduplicateOperations(operations);
    const optimizedChanges = optimizedOperations.map(op => op.data);
    
    console.log(
      `Optimized ${dataType} upload: ${changes.length} -> ${unsyncedChanges.length} -> ${optimizedChanges.length} changes ` +
      `(${Math.round(((changes.length - optimizedChanges.length) / changes.length) * 100)}% reduction)`
    );
    
    return optimizedChanges;
  }

  /**
   * Execute optimized sync with UI responsiveness
   */
  async executeOptimizedSync(originalSync, options) {
    // Use requestIdleCallback for better UI responsiveness
    return new Promise((resolve, reject) => {
      const executeSync = async () => {
        try {
          const result = await originalSync(options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      if (window.requestIdleCallback) {
        window.requestIdleCallback(executeSync, { timeout: 1000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(executeSync, 0);
      }
    });
  }

  /**
   * Execute optimized upload with batch processing
   */
  async executeOptimizedUpload(originalUpload, dataType, changes, options) {
    if (!this.optimizationSettings.enableBatchOptimization || changes.length <= 50) {
      return await originalUpload(dataType, changes, options);
    }
    
    // Process in optimized batches
    const batchSize = this.calculateOptimalBatchSize(changes.length);
    const results = {
      count: 0,
      conflicts: [],
      skipped: 0,
      newRecords: 0,
      updatedRecords: 0
    };
    
    for (let i = 0; i < changes.length; i += batchSize) {
      const batch = changes.slice(i, i + batchSize);
      
      // Record batch operation performance
      if (this.performanceMonitor) {
        const batchStart = performance.now();
        
        try {
          const batchResult = await originalUpload(dataType, batch, { 
            ...options, 
            batchMode: true 
          });
          
          const batchDuration = performance.now() - batchStart;
          this.performanceMonitor.recordBatchOperation(
            'upload', 
            batch.length, 
            batchDuration, 
            true
          );
          
          // Merge results
          results.count += batchResult.count || 0;
          results.conflicts.push(...(batchResult.conflicts || []));
          results.skipped += batchResult.skipped || 0;
          results.newRecords += batchResult.newRecords || 0;
          results.updatedRecords += batchResult.updatedRecords || 0;
          
        } catch (error) {
          const batchDuration = performance.now() - batchStart;
          this.performanceMonitor.recordBatchOperation(
            'upload', 
            batch.length, 
            batchDuration, 
            false
          );
          throw error;
        }
      } else {
        const batchResult = await originalUpload(dataType, batch, { 
          ...options, 
          batchMode: true 
        });
        
        // Merge results
        results.count += batchResult.count || 0;
        results.conflicts.push(...(batchResult.conflicts || []));
        results.skipped += batchResult.skipped || 0;
        results.newRecords += batchResult.newRecords || 0;
        results.updatedRecords += batchResult.updatedRecords || 0;
      }
      
      // Yield control to prevent UI blocking
      if (i + batchSize < changes.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  /**
   * Execute optimized download
   */
  async executeOptimizedDownload(originalDownload, dataType, options) {
    const downloadStart = performance.now();
    
    try {
      const result = await originalDownload(dataType, options);
      
      // Record API call performance
      if (this.performanceMonitor) {
        const downloadDuration = performance.now() - downloadStart;
        this.performanceMonitor.recordApiCall(
          'GET', 
          `/sheets/${dataType}`, 
          downloadDuration, 
          true, 
          JSON.stringify(result).length
        );
      }
      
      // Apply efficient local cache update (Requirement 9.5)
      if (this.deltaSyncManager && result.data && result.data.length > 0) {
        const cacheUpdateStart = performance.now();
        
        const cacheResult = await this.deltaSyncManager.updateLocalCacheEfficiently(
          dataType, 
          result.data, 
          {
            handleDeletions: options.handleDeletions || false,
            batchSize: this.calculateOptimalBatchSize(result.data.length)
          }
        );
        
        const cacheUpdateDuration = performance.now() - cacheUpdateStart;
        
        console.log(
          `Local cache update for ${dataType}: ${cacheResult.totalProcessed} records processed ` +
          `in ${cacheUpdateDuration}ms (${cacheResult.created} created, ${cacheResult.updated} updated, ` +
          `${cacheResult.deleted} deleted)`
        );
        
        // Update result with cache update info
        result.cacheUpdate = cacheResult;
      }
      
      return result;
      
    } catch (error) {
      // Record failed API call
      if (this.performanceMonitor) {
        const downloadDuration = performance.now() - downloadStart;
        this.performanceMonitor.recordApiCall(
          'GET', 
          `/sheets/${dataType}`, 
          downloadDuration, 
          false, 
          0
        );
      }
      
      throw error;
    }
  }

  /**
   * Calculate optimal batch size based on data size and performance
   */
  calculateOptimalBatchSize(totalRecords) {
    // Base batch size
    let batchSize = 50;
    
    // Adjust based on total records
    if (totalRecords > 1000) {
      batchSize = 100;
    } else if (totalRecords > 5000) {
      batchSize = 200;
    } else if (totalRecords < 20) {
      batchSize = Math.max(10, totalRecords);
    }
    
    // Adjust based on performance history
    if (this.performanceMonitor) {
      const stats = this.performanceMonitor.getPerformanceStats();
      if (stats.batchOperations.averageThroughput > 0) {
        // Optimize based on throughput
        const targetDuration = 2000; // 2 seconds per batch
        const optimalSize = Math.round(stats.batchOperations.averageThroughput * (targetDuration / 1000));
        batchSize = Math.min(Math.max(optimalSize, 10), 500);
      }
    }
    
    return batchSize;
  }

  /**
   * Calculate total records processed from sync result
   */
  calculateRecordsProcessed(result) {
    if (!result || !result.result) return 0;
    
    let total = 0;
    
    if (result.result.uploaded) {
      Object.values(result.result.uploaded).forEach(count => {
        total += count || 0;
      });
    }
    
    if (result.result.downloaded) {
      Object.values(result.result.downloaded).forEach(count => {
        total += count || 0;
      });
    }
    
    return total;
  }

  /**
   * Set up UI responsiveness optimizations
   */
  setupUIOptimizations() {
    // Debounce UI updates during sync
    this.debouncedUIUpdate = this.debounce((status) => {
      if (window.SyncManager && window.SyncManager.updateSyncStatus) {
        window.SyncManager.updateSyncStatus();
      }
    }, 100);
    
    // Listen for sync events and update UI efficiently
    if (window.SyncManager && window.SyncManager.addListener) {
      window.SyncManager.addListener('syncProgress', this.debouncedUIUpdate);
      window.SyncManager.addListener('uploadProgress', this.debouncedUIUpdate);
      window.SyncManager.addListener('downloadProgress', this.debouncedUIUpdate);
    }
  }

  /**
   * Set up memory management
   */
  setupMemoryManagement() {
    if (!this.optimizationSettings.enableMemoryOptimization) return;
    
    // Periodic memory cleanup
    setInterval(() => {
      this.performMemoryCleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Clean up on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performMemoryCleanup();
      }
    });
  }

  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    try {
      // Clean up delta sync manager
      if (this.deltaSyncManager) {
        this.deltaSyncManager.cleanupOldChanges(7); // Keep 7 days
      }
      
      // Clean up performance monitor
      if (this.performanceMonitor) {
        this.performanceMonitor.cleanupOldMetrics();
      }
      
      // Clean up sync manager caches if available
      if (window.SyncManager && window.SyncManager.clearCache) {
        window.SyncManager.clearCache();
      }
      
      console.log('Memory cleanup completed');
      
    } catch (error) {
      console.error('Error during memory cleanup:', error);
    }
  }

  /**
   * Debounce utility function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {
      deltaSync: null,
      performance: null,
      integration: {
        initialized: this.isInitialized,
        optimizations: this.optimizationSettings
      }
    };
    
    if (this.deltaSyncManager) {
      stats.deltaSync = this.deltaSyncManager.getDeltaSyncStats();
    }
    
    if (this.performanceMonitor) {
      stats.performance = this.performanceMonitor.getPerformanceStats();
    }
    
    return stats;
  }

  /**
   * Get efficiency report
   */
  getEfficiencyReport() {
    const report = {
      timestamp: new Date().toISOString(),
      integration: {
        status: this.isInitialized ? 'active' : 'inactive',
        optimizations: this.optimizationSettings
      }
    };
    
    if (this.performanceMonitor) {
      report.performance = this.performanceMonitor.getEfficiencyReport();
    }
    
    if (this.deltaSyncManager) {
      report.deltaSync = this.deltaSyncManager.getDeltaSyncStats();
    }
    
    return report;
  }

  /**
   * Update optimization settings
   */
  updateOptimizationSettings(settings) {
    this.optimizationSettings = { ...this.optimizationSettings, ...settings };
    console.log('Optimization settings updated:', this.optimizationSettings);
  }

  /**
   * Get current optimization settings
   */
  getOptimizationSettings() {
    return { ...this.optimizationSettings };
  }
}

// Initialize performance integration when available
if (typeof window !== 'undefined') {
  // Create global instance
  window.SyncPerformanceIntegration = new SyncPerformanceIntegration();
  
  // Auto-initialize if sync manager is available
  document.addEventListener('DOMContentLoaded', async () => {
    if (window.SyncManager && !window.SyncPerformanceIntegration.isInitialized) {
      await window.SyncPerformanceIntegration.init();
    }
  });
}