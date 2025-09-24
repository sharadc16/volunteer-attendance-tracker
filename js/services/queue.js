/**
 * Sync Queue Manager
 * Handles offline operation queuing and processing
 */
class SyncQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.maxQueueSize = 1000;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
    this.storageKey = 'vat_sync_queue';
    
    // Bind methods
    this.processQueue = this.processQueue.bind(this);
  }

  /**
   * Initialize the sync queue
   */
  async init() {
    try {
      await this.loadQueue();
      console.log(`SyncQueue initialized with ${this.queue.length} queued operations`);
      return true;
    } catch (error) {
      console.error('Failed to initialize SyncQueue:', error);
      return false;
    }
  }

  /**
   * Add operation to queue
   */
  async enqueue(operation) {
    try {
      // Validate operation
      if (!this.validateOperation(operation)) {
        throw new Error('Invalid operation format');
      }

      // Check queue size limit
      if (this.queue.length >= this.maxQueueSize) {
        // Remove oldest operations to make room
        const removeCount = Math.floor(this.maxQueueSize * 0.1); // Remove 10%
        this.queue.splice(0, removeCount);
        console.warn(`Queue size limit reached, removed ${removeCount} oldest operations`);
      }

      // Create queued operation
      const queuedOperation = {
        id: this.generateOperationId(),
        ...operation,
        queuedAt: new Date().toISOString(),
        attempts: 0,
        lastAttempt: null,
        status: 'queued'
      };

      // Check for duplicates and merge if possible
      const existingIndex = this.findDuplicateOperation(queuedOperation);
      if (existingIndex !== -1) {
        this.queue[existingIndex] = this.mergeOperations(this.queue[existingIndex], queuedOperation);
        console.log(`Merged duplicate operation: ${operation.type} for ${operation.dataType}`);
      } else {
        this.queue.push(queuedOperation);
        console.log(`Queued operation: ${operation.type} for ${operation.dataType}`);
      }

      // Save queue
      await this.saveQueue();

      // Emit event
      this.emitEvent('operationQueued', queuedOperation);

      return queuedOperation.id;

    } catch (error) {
      console.error('Error enqueueing operation:', error);
      throw error;
    }
  }

  /**
   * Process all queued operations
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log('Queue processing already in progress');
      return;
    }

    if (this.queue.length === 0) {
      console.log('No operations in queue to process');
      return;
    }

    this.isProcessing = true;
    console.log(`Processing ${this.queue.length} queued operations...`);

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Process operations in order
      for (let i = 0; i < this.queue.length; i++) {
        const operation = this.queue[i];

        if (operation.status === 'completed') {
          results.skipped++;
          continue;
        }

        try {
          await this.processOperation(operation);
          operation.status = 'completed';
          operation.completedAt = new Date().toISOString();
          results.processed++;

          console.log(`Processed operation ${operation.id}: ${operation.type} for ${operation.dataType}`);

        } catch (error) {
          operation.attempts++;
          operation.lastAttempt = new Date().toISOString();
          operation.lastError = error.message;

          if (operation.attempts >= this.maxRetries) {
            operation.status = 'failed';
            results.failed++;
            console.error(`Operation ${operation.id} failed after ${operation.attempts} attempts:`, error);
          } else {
            operation.status = 'retry';
            console.warn(`Operation ${operation.id} failed, will retry (attempt ${operation.attempts}/${this.maxRetries}):`, error);
          }

          results.errors.push({
            operationId: operation.id,
            error: error.message,
            attempts: operation.attempts
          });
        }

        // Save progress periodically
        if (i % 10 === 0) {
          await this.saveQueue();
        }
      }

      // Remove completed operations
      this.queue = this.queue.filter(op => op.status !== 'completed');

      // Save final state
      await this.saveQueue();

      console.log(`Queue processing completed: ${results.processed} processed, ${results.failed} failed, ${results.skipped} skipped`);

      // Emit completion event
      this.emitEvent('queueProcessed', results);

      return results;

    } catch (error) {
      console.error('Error processing queue:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  async processOperation(operation) {
    switch (operation.type) {
      case 'upload':
        return await this.processUploadOperation(operation);
      case 'download':
        return await this.processDownloadOperation(operation);
      case 'delete':
        return await this.processDeleteOperation(operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Process upload operation
   */
  async processUploadOperation(operation) {
    if (!window.SyncManager) {
      throw new Error('SyncManager not available');
    }

    // Use SyncManager's upload method
    return await window.SyncManager.uploadChanges(operation.dataType, operation.data);
  }

  /**
   * Process download operation
   */
  async processDownloadOperation(operation) {
    if (!window.SyncManager) {
      throw new Error('SyncManager not available');
    }

    // Use SyncManager's download method
    return await window.SyncManager.downloadChanges(operation.dataType);
  }

  /**
   * Process delete operation
   */
  async processDeleteOperation(operation) {
    // Handle delete operations (if needed in the future)
    throw new Error('Delete operations not yet implemented');
  }

  /**
   * Retry failed operations
   */
  async retryFailedOperations() {
    const failedOperations = this.queue.filter(op => op.status === 'failed' || op.status === 'retry');

    if (failedOperations.length === 0) {
      console.log('No failed operations to retry');
      return;
    }

    console.log(`Retrying ${failedOperations.length} failed operations...`);

    // Reset failed operations to queued status
    failedOperations.forEach(op => {
      if (op.attempts < this.maxRetries) {
        op.status = 'queued';
        op.lastError = null;
      }
    });

    // Process the queue
    return await this.processQueue();
  }

  /**
   * Clear the queue
   */
  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    console.log('Sync queue cleared');
    this.emitEvent('queueCleared');
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    const statusCounts = this.queue.reduce((counts, op) => {
      counts[op.status] = (counts[op.status] || 0) + 1;
      return counts;
    }, {});

    return {
      totalOperations: this.queue.length,
      isProcessing: this.isProcessing,
      statusCounts,
      oldestOperation: this.queue.length > 0 ? this.queue[0].queuedAt : null,
      newestOperation: this.queue.length > 0 ? this.queue[this.queue.length - 1].queuedAt : null
    };
  }

  /**
   * Get operations by status
   */
  getOperationsByStatus(status) {
    return this.queue.filter(op => op.status === status);
  }

  /**
   * Remove operation by ID
   */
  async removeOperation(operationId) {
    const index = this.queue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      await this.saveQueue();
      console.log(`Removed operation ${operationId} from queue`);
      this.emitEvent('operationRemoved', removed);
      return removed;
    }
    return null;
  }

  /**
   * Validate operation format
   */
  validateOperation(operation) {
    if (!operation || typeof operation !== 'object') {
      return false;
    }

    // Required fields
    if (!operation.type || !operation.dataType) {
      return false;
    }

    // Valid operation types
    const validTypes = ['upload', 'download', 'delete'];
    if (!validTypes.includes(operation.type)) {
      return false;
    }

    // Valid data types
    const validDataTypes = ['volunteers', 'events', 'attendance'];
    if (!validDataTypes.includes(operation.dataType)) {
      return false;
    }

    // Upload operations need data
    if (operation.type === 'upload' && (!operation.data || !Array.isArray(operation.data))) {
      return false;
    }

    return true;
  }

  /**
   * Find duplicate operation in queue
   */
  findDuplicateOperation(operation) {
    return this.queue.findIndex(existing => 
      existing.type === operation.type &&
      existing.dataType === operation.dataType &&
      existing.status === 'queued'
    );
  }

  /**
   * Merge duplicate operations
   */
  mergeOperations(existing, newOperation) {
    if (existing.type === 'upload' && newOperation.type === 'upload') {
      // Merge upload data, keeping unique records by ID
      const existingIds = new Set(existing.data.map(record => record.id));
      const newRecords = newOperation.data.filter(record => !existingIds.has(record.id));
      
      return {
        ...existing,
        data: [...existing.data, ...newRecords],
        queuedAt: newOperation.queuedAt // Update timestamp
      };
    }

    // For other operations, just update the timestamp
    return {
      ...existing,
      queuedAt: newOperation.queuedAt
    };
  }

  /**
   * Generate unique operation ID
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save queue to storage
   */
  async saveQueue() {
    try {
      const queueData = {
        queue: this.queue,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(queueData));
    } catch (error) {
      console.error('Error saving sync queue:', error);
      throw error;
    }
  }

  /**
   * Load queue from storage
   */
  async loadQueue() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const queueData = JSON.parse(stored);
        this.queue = queueData.queue || [];
        
        // Clean up old operations (older than 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        this.queue = this.queue.filter(op => new Date(op.queuedAt) > weekAgo);
        
        console.log(`Loaded ${this.queue.length} operations from queue storage`);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.queue = [];
    }
  }

  /**
   * Emit queue events
   */
  emitEvent(eventName, data) {
    // Emit as window event
    window.dispatchEvent(new CustomEvent(`syncQueue${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`, {
      detail: data
    }));

    // Also notify SyncManager if available
    if (window.SyncManager && typeof window.SyncManager.notifyListeners === 'function') {
      window.SyncManager.notifyListeners(`queue${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`, data);
    }
  }

  /**
   * Get queue statistics
   */
  getStatistics() {
    const now = new Date();
    const stats = {
      totalOperations: this.queue.length,
      operationsByType: {},
      operationsByStatus: {},
      operationsByDataType: {},
      averageAge: 0,
      oldestOperation: null,
      newestOperation: null
    };

    if (this.queue.length === 0) {
      return stats;
    }

    let totalAge = 0;
    let oldestTime = Infinity;
    let newestTime = 0;

    this.queue.forEach(op => {
      // Count by type
      stats.operationsByType[op.type] = (stats.operationsByType[op.type] || 0) + 1;
      
      // Count by status
      stats.operationsByStatus[op.status] = (stats.operationsByStatus[op.status] || 0) + 1;
      
      // Count by data type
      stats.operationsByDataType[op.dataType] = (stats.operationsByDataType[op.dataType] || 0) + 1;
      
      // Calculate age
      const queuedTime = new Date(op.queuedAt).getTime();
      const age = now.getTime() - queuedTime;
      totalAge += age;
      
      if (queuedTime < oldestTime) {
        oldestTime = queuedTime;
        stats.oldestOperation = op;
      }
      
      if (queuedTime > newestTime) {
        newestTime = queuedTime;
        stats.newestOperation = op;
      }
    });

    stats.averageAge = Math.round(totalAge / this.queue.length / 1000); // in seconds

    return stats;
  }
}

// Create global instance
window.SyncQueue = new SyncQueue();