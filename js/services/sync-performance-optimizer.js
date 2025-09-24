/**
 * Sync Performance Optimizer
 * Provides performance optimizations for sync operations
 */
class SyncPerformanceOptimizer {
  constructor() {
    this.chunkSize = 100; // Process 100 records at a time
    this.yieldInterval = 10; // Yield control every 10ms
    this.batchSize = 500; // API batch size
  }

  /**
   * Process data in chunks to avoid blocking the UI thread
   * @param {Array} data - Data to process
   * @param {Function} processor - Function to process each chunk
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Processed results
   */
  async processInChunks(data, processor, options = {}) {
    const chunkSize = options.chunkSize || this.chunkSize;
    const yieldInterval = options.yieldInterval || this.yieldInterval;
    const results = [];
    
    console.log(`Processing ${data.length} records in chunks of ${chunkSize}`);
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const startTime = performance.now();
      
      try {
        const chunkResult = await processor(chunk, i);
        results.push(...chunkResult);
        
        const processingTime = performance.now() - startTime;
        
        // Yield control back to browser if processing took too long
        if (processingTime > yieldInterval) {
          await this.yieldControl();
        }
        
        // Report progress
        if (options.onProgress) {
          options.onProgress({
            processed: Math.min(i + chunkSize, data.length),
            total: data.length,
            chunk: Math.floor(i / chunkSize) + 1,
            totalChunks: Math.ceil(data.length / chunkSize)
          });
        }
        
      } catch (error) {
        console.error(`Error processing chunk ${Math.floor(i / chunkSize) + 1}:`, error);
        
        if (options.continueOnError) {
          // Skip this chunk and continue
          continue;
        } else {
          throw error;
        }
      }
    }
    
    return results;
  }

  /**
   * Yield control back to the browser
   * @returns {Promise}
   */
  async yieldControl() {
    return new Promise(resolve => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(resolve, { timeout: 5 });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Optimize data transformation with batching and chunking
   * @param {Array} data - Data to transform
   * @param {string} dataType - Type of data
   * @param {string} direction - 'toSheets' or 'fromSheets'
   * @param {Object} options - Transformation options
   * @returns {Promise<Array>} Transformed data
   */
  async optimizedTransform(data, dataType, direction = 'toSheets', options = {}) {
    if (!window.DataTransformer) {
      throw new Error('DataTransformer not available');
    }

    const transformer = window.DataTransformer;
    
    // Try batch transformation first
    try {
      console.log(`Attempting batch transformation of ${data.length} ${dataType} records`);
      const startTime = performance.now();
      
      const result = transformer.batchTransform(data, dataType, direction);
      
      const transformTime = performance.now() - startTime;
      console.log(`Batch transformation completed in ${transformTime.toFixed(2)}ms`);
      
      return result;
      
    } catch (batchError) {
      console.warn('Batch transformation failed, using chunked processing:', batchError);
      
      // Fallback to chunked processing
      return await this.processInChunks(
        data,
        async (chunk) => {
          const chunkResults = [];
          for (const item of chunk) {
            try {
              const transformed = direction === 'toSheets' 
                ? transformer.toSheetsFormat(item, dataType)
                : transformer.fromSheetsFormat([item], dataType);
              
              if (direction === 'toSheets') {
                chunkResults.push(...transformed);
              } else {
                chunkResults.push(...transformed);
              }
            } catch (error) {
              console.warn(`Skipping invalid record during transformation:`, error);
            }
          }
          return chunkResults;
        },
        {
          chunkSize: options.chunkSize || this.chunkSize,
          onProgress: options.onProgress,
          continueOnError: true
        }
      );
    }
  }

  /**
   * Optimize API operations with intelligent batching
   * @param {Array} operations - API operations to perform
   * @param {Function} executor - Function to execute operations
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} Operation results
   */
  async optimizedApiOperations(operations, executor, options = {}) {
    const batchSize = options.batchSize || this.batchSize;
    const results = [];
    
    console.log(`Executing ${operations.length} API operations in batches of ${batchSize}`);
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      try {
        const batchResult = await executor(batch);
        results.push(...(Array.isArray(batchResult) ? batchResult : [batchResult]));
        
        // Report progress
        if (options.onProgress) {
          options.onProgress({
            processed: Math.min(i + batchSize, operations.length),
            total: operations.length,
            batch: Math.floor(i / batchSize) + 1,
            totalBatches: Math.ceil(operations.length / batchSize)
          });
        }
        
        // Add delay between batches to avoid rate limiting
        if (options.delayBetweenBatches && i + batchSize < operations.length) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
        }
        
      } catch (error) {
        console.error(`Error executing API batch ${Math.floor(i / batchSize) + 1}:`, error);
        
        if (options.continueOnError) {
          continue;
        } else {
          throw error;
        }
      }
    }
    
    return results;
  }

  /**
   * Calculate optimal chunk and batch sizes based on data size and system performance
   * @param {number} dataSize - Size of data to process
   * @param {Object} systemInfo - System performance information
   * @returns {Object} Optimal sizes
   */
  calculateOptimalSizes(dataSize, systemInfo = {}) {
    const memoryLimit = systemInfo.memoryLimit || 100 * 1024 * 1024; // 100MB default
    const cpuCores = systemInfo.cpuCores || navigator.hardwareConcurrency || 4;
    
    // Calculate chunk size based on memory constraints
    const estimatedRecordSize = 1024; // 1KB per record estimate
    const maxChunkSize = Math.floor(memoryLimit / (estimatedRecordSize * 10)); // 10x safety margin
    
    // Calculate optimal chunk size
    let chunkSize = Math.min(
      Math.max(50, Math.floor(dataSize / (cpuCores * 4))), // At least 50, scale with CPU cores
      maxChunkSize,
      500 // Maximum chunk size
    );
    
    // Calculate batch size for API operations
    let batchSize = Math.min(
      Math.max(100, Math.floor(dataSize / 10)), // At least 100, scale with data size
      1000 // Google Sheets API limit
    );
    
    return {
      chunkSize,
      batchSize,
      estimatedMemoryUsage: dataSize * estimatedRecordSize,
      recommendedConcurrency: Math.min(cpuCores, 4)
    };
  }

  /**
   * Monitor performance during sync operations
   * @param {string} operationName - Name of the operation
   * @param {Function} operation - Operation to monitor
   * @returns {Promise<any>} Operation result with performance metrics
   */
  async monitorPerformance(operationName, operation) {
    const startTime = performance.now();
    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    try {
      const result = await operation();
      
      const endTime = performance.now();
      const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      const metrics = {
        duration: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        operationName,
        timestamp: new Date().toISOString()
      };
      
      console.log(`Performance metrics for ${operationName}:`, metrics);
      
      // Store metrics for analysis
      this.storePerformanceMetrics(metrics);
      
      return { result, metrics };
      
    } catch (error) {
      const endTime = performance.now();
      const metrics = {
        duration: endTime - startTime,
        operationName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      console.error(`Performance metrics for failed ${operationName}:`, metrics);
      this.storePerformanceMetrics(metrics);
      
      throw error;
    }
  }

  /**
   * Store performance metrics for analysis
   * @param {Object} metrics - Performance metrics
   */
  storePerformanceMetrics(metrics) {
    try {
      const existingMetrics = JSON.parse(localStorage.getItem('sync_performance_metrics') || '[]');
      existingMetrics.push(metrics);
      
      // Keep only last 100 metrics
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }
      
      localStorage.setItem('sync_performance_metrics', JSON.stringify(existingMetrics));
    } catch (error) {
      console.warn('Failed to store performance metrics:', error);
    }
  }

  /**
   * Get performance metrics for analysis
   * @returns {Array} Performance metrics
   */
  getPerformanceMetrics() {
    try {
      return JSON.parse(localStorage.getItem('sync_performance_metrics') || '[]');
    } catch (error) {
      console.warn('Failed to retrieve performance metrics:', error);
      return [];
    }
  }

  /**
   * Clear stored performance metrics
   */
  clearPerformanceMetrics() {
    try {
      localStorage.removeItem('sync_performance_metrics');
      console.log('Performance metrics cleared');
    } catch (error) {
      console.warn('Failed to clear performance metrics:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncPerformanceOptimizer;
} else if (typeof window !== 'undefined') {
  window.SyncPerformanceOptimizer = SyncPerformanceOptimizer;
}