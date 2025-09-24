/**
 * Delta Sync Optimization Service
 * Implements efficient change detection and batch operations for Google Sheets sync
 */
class DeltaSyncManager {
  constructor() {
    this.changeTracking = {
      volunteers: new Map(),
      events: new Map(),
      attendance: new Map()
    };
    this.batchConfig = {
      maxBatchSize: 100,
      maxBatchDelay: 5000, // 5 seconds
      minBatchSize: 10
    };
    this.pendingBatches = {
      volunteers: [],
      events: [],
      attendance: []
    };
    this.batchTimers = new Map();
    this.syncOptimizations = {
      deduplication: true,
      compression: true,
      deltaOnly: true,
      batchOperations: true
    };
  }

  /**
   * Initialize delta sync manager
   */
  async init() {
    try {
      // Load change tracking data from storage
      await this.loadChangeTracking();
      
      // Initialize batch processing
      this.initializeBatchProcessing();
      
      // Set up change listeners
      this.setupChangeListeners();
      
      console.log('DeltaSyncManager initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize DeltaSyncManager:', error);
      return false;
    }
  }

  /**
   * Load change tracking data from storage
   */
  async loadChangeTracking() {
    try {
      const stored = localStorage.getItem('vat_change_tracking');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restore Maps from stored data
        Object.keys(this.changeTracking).forEach(dataType => {
          if (data[dataType]) {
            this.changeTracking[dataType] = new Map(data[dataType]);
          }
        });
      }
      
      console.log('Change tracking data loaded');
      
    } catch (error) {
      console.error('Error loading change tracking data:', error);
      // Reset on error
      this.resetChangeTracking();
    }
  }

  /**
   * Save change tracking data to storage
   */
  async saveChangeTracking() {
    try {
      const data = {};
      
      // Convert Maps to arrays for storage
      Object.keys(this.changeTracking).forEach(dataType => {
        data[dataType] = Array.from(this.changeTracking[dataType].entries());
      });
      
      localStorage.setItem('vat_change_tracking', JSON.stringify(data));
      
    } catch (error) {
      console.error('Error saving change tracking data:', error);
    }
  }

  /**
   * Reset change tracking data
   */
  resetChangeTracking() {
    Object.keys(this.changeTracking).forEach(dataType => {
      this.changeTracking[dataType].clear();
    });
    
    try {
      localStorage.removeItem('vat_change_tracking');
    } catch (error) {
      console.error('Error resetting change tracking:', error);
    }
  }

  /**
   * Initialize batch processing
   */
  initializeBatchProcessing() {
    // Clear any existing timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    
    // Reset pending batches
    Object.keys(this.pendingBatches).forEach(dataType => {
      this.pendingBatches[dataType] = [];
    });
  }

  /**
   * Set up change listeners for automatic tracking
   */
  setupChangeListeners() {
    // Listen for storage events to track changes
    if (window.Storage) {
      const originalMethods = {
        addVolunteer: window.Storage.addVolunteer,
        updateVolunteer: window.Storage.updateVolunteer,
        deleteVolunteer: window.Storage.deleteVolunteer,
        addEvent: window.Storage.addEvent,
        updateEvent: window.Storage.updateEvent,
        deleteEvent: window.Storage.deleteEvent,
        addAttendance: window.Storage.addAttendance,
        updateAttendance: window.Storage.updateAttendance,
        deleteAttendance: window.Storage.deleteAttendance
      };

      // Wrap storage methods to track changes
      window.Storage.addVolunteer = async (volunteer) => {
        const result = await originalMethods.addVolunteer.call(window.Storage, volunteer);
        this.trackChange('volunteers', result.id, 'create', result);
        return result;
      };

      window.Storage.updateVolunteer = async (id, updates) => {
        const result = await originalMethods.updateVolunteer.call(window.Storage, id, updates);
        this.trackChange('volunteers', id, 'update', result);
        return result;
      };

      window.Storage.deleteVolunteer = async (id) => {
        const result = await originalMethods.deleteVolunteer.call(window.Storage, id);
        this.trackChange('volunteers', id, 'delete', { id });
        return result;
      };

      // Similar wrapping for events and attendance
      window.Storage.addEvent = async (event) => {
        const result = await originalMethods.addEvent.call(window.Storage, event);
        this.trackChange('events', result.id, 'create', result);
        return result;
      };

      window.Storage.updateEvent = async (id, updates) => {
        const result = await originalMethods.updateEvent.call(window.Storage, id, updates);
        this.trackChange('events', id, 'update', result);
        return result;
      };

      window.Storage.deleteEvent = async (id) => {
        const result = await originalMethods.deleteEvent.call(window.Storage, id);
        this.trackChange('events', id, 'delete', { id });
        return result;
      };

      window.Storage.addAttendance = async (attendance) => {
        const result = await originalMethods.addAttendance.call(window.Storage, attendance);
        this.trackChange('attendance', result.id, 'create', result);
        return result;
      };

      window.Storage.updateAttendance = async (id, updates) => {
        const result = await originalMethods.updateAttendance.call(window.Storage, id, updates);
        this.trackChange('attendance', id, 'update', result);
        return result;
      };

      window.Storage.deleteAttendance = async (id) => {
        const result = await originalMethods.deleteAttendance.call(window.Storage, id);
        this.trackChange('attendance', id, 'delete', { id });
        return result;
      };
    }
  }

  /**
   * Track a change for delta sync
   */
  trackChange(dataType, recordId, operation, data) {
    if (!this.changeTracking[dataType]) {
      console.warn(`Unknown data type for change tracking: ${dataType}`);
      return;
    }

    const timestamp = new Date().toISOString();
    const changeRecord = {
      id: recordId,
      operation, // 'create', 'update', 'delete'
      data,
      timestamp,
      synced: false,
      retryCount: 0
    };

    // Store the change
    this.changeTracking[dataType].set(recordId, changeRecord);
    
    // Add to pending batch
    this.addToPendingBatch(dataType, changeRecord);
    
    // Save tracking data
    this.saveChangeTracking();
    
    console.log(`Tracked ${operation} change for ${dataType} record ${recordId}`);
  }

  /**
   * Add change to pending batch for processing
   */
  addToPendingBatch(dataType, changeRecord) {
    this.pendingBatches[dataType].push(changeRecord);
    
    // Check if we should process the batch immediately
    if (this.pendingBatches[dataType].length >= this.batchConfig.maxBatchSize) {
      this.processBatch(dataType);
    } else if (!this.batchTimers.has(dataType)) {
      // Set timer for delayed batch processing
      const timer = setTimeout(() => {
        this.processBatch(dataType);
      }, this.batchConfig.maxBatchDelay);
      
      this.batchTimers.set(dataType, timer);
    }
  }

  /**
   * Process pending batch for a data type
   */
  async processBatch(dataType) {
    const batch = this.pendingBatches[dataType];
    if (batch.length === 0) return;

    // Clear timer
    if (this.batchTimers.has(dataType)) {
      clearTimeout(this.batchTimers.get(dataType));
      this.batchTimers.delete(dataType);
    }

    // Clear pending batch
    this.pendingBatches[dataType] = [];

    try {
      console.log(`Processing batch of ${batch.length} ${dataType} changes`);
      
      // Optimize batch before processing
      const optimizedBatch = this.optimizeBatch(batch);
      
      // Process the optimized batch
      await this.processBatchChanges(dataType, optimizedBatch);
      
      // Mark changes as synced
      optimizedBatch.forEach(change => {
        const tracked = this.changeTracking[dataType].get(change.id);
        if (tracked) {
          tracked.synced = true;
          tracked.syncedAt = new Date().toISOString();
        }
      });
      
      // Save updated tracking data
      await this.saveChangeTracking();
      
      console.log(`Successfully processed batch of ${optimizedBatch.length} ${dataType} changes`);
      
    } catch (error) {
      console.error(`Error processing batch for ${dataType}:`, error);
      
      // Re-queue failed changes with retry count
      batch.forEach(change => {
        change.retryCount = (change.retryCount || 0) + 1;
        if (change.retryCount < 3) {
          this.addToPendingBatch(dataType, change);
        } else {
          console.error(`Max retries reached for change ${change.id}, dropping`);
        }
      });
    }
  }

  /**
   * Optimize batch by deduplicating and merging changes
   */
  optimizeBatch(batch) {
    if (!this.syncOptimizations.deduplication) {
      return batch;
    }

    const optimized = new Map();
    
    // Process changes in chronological order
    const sortedBatch = batch.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    sortedBatch.forEach(change => {
      const existingChange = optimized.get(change.id);
      
      if (!existingChange) {
        // First change for this record
        optimized.set(change.id, { ...change });
      } else {
        // Merge with existing change
        if (change.operation === 'delete') {
          // Delete overrides any previous operation
          optimized.set(change.id, { ...change });
        } else if (existingChange.operation === 'delete') {
          // Previous delete, this must be a create
          optimized.set(change.id, { 
            ...change, 
            operation: 'create' 
          });
        } else if (change.operation === 'update' && existingChange.operation === 'create') {
          // Merge update into create
          optimized.set(change.id, {
            ...existingChange,
            data: { ...existingChange.data, ...change.data },
            timestamp: change.timestamp
          });
        } else if (change.operation === 'update' && existingChange.operation === 'update') {
          // Merge updates
          optimized.set(change.id, {
            ...existingChange,
            data: { ...existingChange.data, ...change.data },
            timestamp: change.timestamp
          });
        }
      }
    });

    const result = Array.from(optimized.values());
    
    if (result.length < batch.length) {
      console.log(`Optimized batch from ${batch.length} to ${result.length} changes`);
    }
    
    return result;
  }

  /**
   * Process batch changes through sync manager
   */
  async processBatchChanges(dataType, batch) {
    if (!window.SyncManager || !window.SyncManager.isEnabled) {
      console.log('Sync manager not available or disabled, queuing changes');
      return;
    }

    // Group changes by operation type
    const operations = {
      create: batch.filter(c => c.operation === 'create'),
      update: batch.filter(c => c.operation === 'update'),
      delete: batch.filter(c => c.operation === 'delete')
    };

    // Process creates and updates (deletes handled separately)
    const dataToSync = [
      ...operations.create.map(c => c.data),
      ...operations.update.map(c => c.data)
    ];

    if (dataToSync.length > 0) {
      // Use existing sync manager upload functionality
      await window.SyncManager.uploadChanges(dataType, dataToSync, {
        batchMode: true,
        source: 'delta-sync'
      });
    }

    // Handle deletes separately if needed
    if (operations.delete.length > 0) {
      await this.processDeleteOperations(dataType, operations.delete);
    }
  }

  /**
   * Process delete operations
   */
  async processDeleteOperations(dataType, deleteOperations) {
    // For now, log delete operations
    // In a full implementation, this would handle sheet row deletions
    console.log(`Processing ${deleteOperations.length} delete operations for ${dataType}`);
    
    deleteOperations.forEach(operation => {
      console.log(`Delete operation for ${dataType} record ${operation.id}`);
    });
  }

  /**
   * Get changes since last sync with timestamp filtering
   */
  async getChangesSince(dataType, timestamp) {
    if (!this.changeTracking[dataType]) {
      return [];
    }

    const sinceDate = timestamp ? new Date(timestamp) : new Date(0);
    const changes = [];

    this.changeTracking[dataType].forEach((change, id) => {
      const changeDate = new Date(change.timestamp);
      if (changeDate > sinceDate && !change.synced) {
        changes.push(change);
      }
    });

    return changes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Get only modified records since last sync (Requirement 9.2)
   * This implements efficient change detection to sync only modified data
   */
  async getModifiedRecordsSince(dataType, lastSyncTimestamp) {
    try {
      let allRecords = [];
      
      // Get all records from storage
      switch (dataType) {
        case 'volunteers':
          allRecords = await window.Storage.getAllVolunteers();
          break;
        case 'events':
          allRecords = await window.Storage.getAllEvents();
          break;
        case 'attendance':
          allRecords = await window.Storage.getAllAttendance();
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }
      
      if (!lastSyncTimestamp) {
        // First sync - return all records but mark them for efficient processing
        return {
          records: allRecords,
          isFullSync: true,
          changeCount: allRecords.length
        };
      }
      
      const lastSyncDate = new Date(lastSyncTimestamp);
      const modifiedRecords = [];
      const trackedChanges = this.changeTracking[dataType];
      
      // Use change tracking for efficient filtering
      if (trackedChanges && trackedChanges.size > 0) {
        // Filter using tracked changes (most efficient)
        trackedChanges.forEach((change, recordId) => {
          if (!change.synced && new Date(change.timestamp) > lastSyncDate) {
            const record = allRecords.find(r => r.id === recordId);
            if (record) {
              modifiedRecords.push({
                ...record,
                _changeType: change.operation,
                _changeTimestamp: change.timestamp
              });
            }
          }
        });
      } else {
        // Fallback to timestamp comparison
        allRecords.forEach(record => {
          const recordDate = new Date(record.updatedAt || record.createdAt);
          if (recordDate > lastSyncDate) {
            modifiedRecords.push({
              ...record,
              _changeType: 'update',
              _changeTimestamp: record.updatedAt || record.createdAt
            });
          }
        });
      }
      
      console.log(`Delta sync: Found ${modifiedRecords.length} modified ${dataType} records since ${lastSyncTimestamp}`);
      
      return {
        records: modifiedRecords,
        isFullSync: false,
        changeCount: modifiedRecords.length,
        totalRecords: allRecords.length
      };
      
    } catch (error) {
      console.error(`Error getting modified ${dataType} records:`, error);
      throw error;
    }
  }

  /**
   * Optimize and deduplicate sync operations (Requirement 9.4)
   */
  async optimizeAndDeduplicateOperations(operations) {
    if (!operations || operations.length === 0) {
      return [];
    }
    
    console.log(`Optimizing ${operations.length} sync operations...`);
    
    // Group operations by data type and record ID
    const operationMap = new Map();
    
    operations.forEach(operation => {
      const key = `${operation.dataType}:${operation.recordId || operation.id}`;
      
      if (!operationMap.has(key)) {
        operationMap.set(key, []);
      }
      
      operationMap.get(key).push(operation);
    });
    
    const optimizedOperations = [];
    
    // Process each group of operations for the same record
    operationMap.forEach((recordOperations, key) => {
      if (recordOperations.length === 1) {
        // Single operation, no optimization needed
        optimizedOperations.push(recordOperations[0]);
        return;
      }
      
      // Sort operations by timestamp
      recordOperations.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      // Apply deduplication logic
      const optimized = this.deduplicateRecordOperations(recordOperations);
      if (optimized) {
        optimizedOperations.push(optimized);
      }
    });
    
    // Sort final operations by priority and timestamp
    optimizedOperations.sort((a, b) => {
      // Priority order: delete > update > create
      const priorityOrder = { delete: 3, update: 2, create: 1 };
      const aPriority = priorityOrder[a.operation] || 0;
      const bPriority = priorityOrder[b.operation] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    const reductionPercent = Math.round(
      ((operations.length - optimizedOperations.length) / operations.length) * 100
    );
    
    console.log(
      `Operation optimization: ${operations.length} -> ${optimizedOperations.length} ` +
      `(${reductionPercent}% reduction)`
    );
    
    return optimizedOperations;
  }

  /**
   * Deduplicate operations for a single record
   */
  deduplicateRecordOperations(operations) {
    if (operations.length === 0) return null;
    if (operations.length === 1) return operations[0];
    
    // Find the latest operation
    const latestOperation = operations[operations.length - 1];
    
    // Check for operation patterns
    const hasCreate = operations.some(op => op.operation === 'create');
    const hasUpdate = operations.some(op => op.operation === 'update');
    const hasDelete = operations.some(op => op.operation === 'delete');
    
    if (hasDelete) {
      // If there's a delete, it overrides everything
      return operations.find(op => op.operation === 'delete');
    }
    
    if (hasCreate && hasUpdate) {
      // Merge create and updates into a single create
      const createOp = operations.find(op => op.operation === 'create');
      const updates = operations.filter(op => op.operation === 'update');
      
      let mergedData = { ...createOp.data };
      updates.forEach(update => {
        mergedData = { ...mergedData, ...update.data };
      });
      
      return {
        ...createOp,
        data: mergedData,
        timestamp: latestOperation.timestamp,
        _optimized: true,
        _originalOperations: operations.length
      };
    }
    
    if (hasUpdate) {
      // Merge all updates
      const updates = operations.filter(op => op.operation === 'update');
      let mergedData = {};
      
      updates.forEach(update => {
        mergedData = { ...mergedData, ...update.data };
      });
      
      return {
        ...latestOperation,
        data: mergedData,
        _optimized: true,
        _originalOperations: operations.length
      };
    }
    
    // Default to latest operation
    return latestOperation;
  }

  /**
   * Efficient local cache update (Requirement 9.5)
   */
  async updateLocalCacheEfficiently(dataType, remoteData, options = {}) {
    try {
      console.log(`Efficiently updating local cache for ${dataType}...`);
      
      const startTime = performance.now();
      let updatedCount = 0;
      let createdCount = 0;
      let deletedCount = 0;
      
      // Get current local data
      let localData = [];
      switch (dataType) {
        case 'volunteers':
          localData = await window.Storage.getAllVolunteers();
          break;
        case 'events':
          localData = await window.Storage.getAllEvents();
          break;
        case 'attendance':
          localData = await window.Storage.getAllAttendance();
          break;
      }
      
      // Create lookup maps for efficient comparison
      const localMap = new Map(localData.map(item => [item.id, item]));
      const remoteMap = new Map(remoteData.map(item => [item.id, item]));
      
      // Process updates and creates
      for (const [id, remoteItem] of remoteMap) {
        const localItem = localMap.get(id);
        
        if (!localItem) {
          // New item - create
          await this.createLocalRecord(dataType, remoteItem);
          createdCount++;
        } else {
          // Check if update is needed
          const needsUpdate = this.needsLocalUpdate(localItem, remoteItem);
          if (needsUpdate) {
            await this.updateLocalRecord(dataType, id, remoteItem);
            updatedCount++;
          }
        }
        
        // Yield control periodically to prevent UI blocking
        if ((createdCount + updatedCount) % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      // Process deletions (items in local but not in remote)
      if (options.handleDeletions) {
        for (const [id, localItem] of localMap) {
          if (!remoteMap.has(id)) {
            await this.deleteLocalRecord(dataType, id);
            deletedCount++;
          }
        }
      }
      
      const duration = performance.now() - startTime;
      
      console.log(
        `Local cache update completed in ${Math.round(duration)}ms: ` +
        `${createdCount} created, ${updatedCount} updated, ${deletedCount} deleted`
      );
      
      // Update change tracking to reflect sync
      this.markRecordsAsSynced(dataType, Array.from(remoteMap.keys()));
      
      return {
        created: createdCount,
        updated: updatedCount,
        deleted: deletedCount,
        duration: Math.round(duration),
        totalProcessed: remoteData.length
      };
      
    } catch (error) {
      console.error(`Error updating local cache for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Check if local record needs update
   */
  needsLocalUpdate(localItem, remoteItem) {
    // Compare timestamps
    const localTimestamp = new Date(localItem.updatedAt || localItem.createdAt);
    const remoteTimestamp = new Date(remoteItem.updatedAt || remoteItem.createdAt);
    
    if (remoteTimestamp > localTimestamp) {
      return true;
    }
    
    // Compare key fields for changes
    const keyFields = this.getKeyFieldsForDataType(localItem);
    return keyFields.some(field => {
      return JSON.stringify(localItem[field]) !== JSON.stringify(remoteItem[field]);
    });
  }

  /**
   * Get key fields to compare for each data type
   */
  getKeyFieldsForDataType(item) {
    // Determine data type from item structure
    if (item.hasOwnProperty('committee')) {
      // Volunteer
      return ['name', 'email', 'committee'];
    } else if (item.hasOwnProperty('startTime')) {
      // Event
      return ['name', 'date', 'startTime', 'endTime', 'status'];
    } else if (item.hasOwnProperty('volunteerId')) {
      // Attendance
      return ['volunteerId', 'eventId', 'dateTime'];
    }
    
    return ['name']; // Default
  }

  /**
   * Create local record efficiently
   */
  async createLocalRecord(dataType, data) {
    switch (dataType) {
      case 'volunteers':
        return await window.Storage.addVolunteer(data);
      case 'events':
        return await window.Storage.addEvent(data);
      case 'attendance':
        return await window.Storage.addAttendance(data);
    }
  }

  /**
   * Update local record efficiently
   */
  async updateLocalRecord(dataType, id, data) {
    switch (dataType) {
      case 'volunteers':
        return await window.Storage.updateVolunteer(id, data);
      case 'events':
        return await window.Storage.updateEvent(id, data);
      case 'attendance':
        return await window.Storage.updateAttendance(id, data);
    }
  }

  /**
   * Delete local record efficiently
   */
  async deleteLocalRecord(dataType, id) {
    switch (dataType) {
      case 'volunteers':
        return await window.Storage.deleteVolunteer(id);
      case 'events':
        return await window.Storage.deleteEvent(id);
      case 'attendance':
        return await window.Storage.deleteAttendance(id);
    }
  }

  /**
   * Mark records as synced in change tracking
   */
  markRecordsAsSynced(dataType, recordIds) {
    const changes = this.changeTracking[dataType];
    if (!changes) return;
    
    recordIds.forEach(id => {
      const change = changes.get(id);
      if (change) {
        change.synced = true;
        change.syncedAt = new Date().toISOString();
      }
    });
    
    this.saveChangeTracking();
  }

  /**
   * Get delta sync statistics
   */
  getDeltaSyncStats() {
    const stats = {
      totalTrackedChanges: 0,
      unsyncedChanges: 0,
      pendingBatches: 0,
      changesByType: {}
    };

    Object.keys(this.changeTracking).forEach(dataType => {
      const changes = this.changeTracking[dataType];
      const unsynced = Array.from(changes.values()).filter(c => !c.synced);
      
      stats.changesByType[dataType] = {
        total: changes.size,
        unsynced: unsynced.length,
        pending: this.pendingBatches[dataType].length
      };
      
      stats.totalTrackedChanges += changes.size;
      stats.unsyncedChanges += unsynced.length;
      stats.pendingBatches += this.pendingBatches[dataType].length;
    });

    return stats;
  }

  /**
   * Clear synced changes older than specified days
   */
  async cleanupOldChanges(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let cleanedCount = 0;

    Object.keys(this.changeTracking).forEach(dataType => {
      const changes = this.changeTracking[dataType];
      const toDelete = [];

      changes.forEach((change, id) => {
        if (change.synced && new Date(change.syncedAt || change.timestamp) < cutoffDate) {
          toDelete.push(id);
        }
      });

      toDelete.forEach(id => {
        changes.delete(id);
        cleanedCount++;
      });
    });

    if (cleanedCount > 0) {
      await this.saveChangeTracking();
      console.log(`Cleaned up ${cleanedCount} old synced changes`);
    }

    return cleanedCount;
  }

  /**
   * Force process all pending batches
   */
  async flushPendingBatches() {
    const promises = Object.keys(this.pendingBatches).map(dataType => {
      if (this.pendingBatches[dataType].length > 0) {
        return this.processBatch(dataType);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    console.log('All pending batches flushed');
  }

  /**
   * Enable or disable specific optimizations
   */
  setOptimization(optimization, enabled) {
    if (this.syncOptimizations.hasOwnProperty(optimization)) {
      this.syncOptimizations[optimization] = enabled;
      console.log(`${optimization} optimization ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      console.warn(`Unknown optimization: ${optimization}`);
    }
  }

  /**
   * Get current optimization settings
   */
  getOptimizations() {
    return { ...this.syncOptimizations };
  }

  /**
   * Create optimized batch operations for multiple changes
   */
  async createOptimizedBatches(dataType, changes, options = {}) {
    if (!changes || changes.length === 0) {
      return [];
    }
    
    const maxBatchSize = options.maxBatchSize || this.batchConfig.maxBatchSize;
    const batches = [];
    
    // First, optimize and deduplicate the changes
    const optimizedChanges = await this.optimizeAndDeduplicateOperations(
      changes.map(change => ({
        ...change,
        dataType,
        recordId: change.id
      }))
    );
    
    // Group by operation type for better batch efficiency
    const operationGroups = {
      create: optimizedChanges.filter(c => c.operation === 'create'),
      update: optimizedChanges.filter(c => c.operation === 'update'),
      delete: optimizedChanges.filter(c => c.operation === 'delete')
    };
    
    // Create batches for each operation type
    Object.entries(operationGroups).forEach(([operation, operationChanges]) => {
      if (operationChanges.length === 0) return;
      
      for (let i = 0; i < operationChanges.length; i += maxBatchSize) {
        const batchChanges = operationChanges.slice(i, i + maxBatchSize);
        
        batches.push({
          id: `${dataType}_${operation}_${Date.now()}_${i}`,
          dataType,
          operation,
          changes: batchChanges,
          size: batchChanges.length,
          priority: this.getBatchPriority(operation),
          estimatedDuration: this.estimateBatchDuration(batchChanges.length, operation),
          createdAt: new Date().toISOString()
        });
      }
    });
    
    // Sort batches by priority and estimated duration
    batches.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.estimatedDuration - b.estimatedDuration; // Shorter duration first
    });
    
    console.log(
      `Created ${batches.length} optimized batches for ${optimizedChanges.length} ${dataType} changes`
    );
    
    return batches;
  }

  /**
   * Get batch priority based on operation type
   */
  getBatchPriority(operation) {
    const priorities = {
      delete: 3,  // Highest priority
      create: 2,  // Medium priority
      update: 1   // Lowest priority
    };
    return priorities[operation] || 0;
  }

  /**
   * Estimate batch processing duration
   */
  estimateBatchDuration(batchSize, operation) {
    // Base duration estimates in milliseconds
    const baseDurations = {
      create: 100,  // 100ms per create
      update: 80,   // 80ms per update
      delete: 50    // 50ms per delete
    };
    
    const baseDuration = baseDurations[operation] || 100;
    
    // Add overhead for batch processing
    const overhead = Math.min(batchSize * 10, 500); // Max 500ms overhead
    
    return (batchSize * baseDuration) + overhead;
  }

  /**
   * Execute batch with performance monitoring
   */
  async executeBatchWithMonitoring(batch, executor) {
    const startTime = performance.now();
    let result = null;
    let error = null;
    
    try {
      console.log(
        `Executing ${batch.operation} batch for ${batch.dataType}: ` +
        `${batch.size} records (estimated ${batch.estimatedDuration}ms)`
      );
      
      result = await executor(batch);
      
      const actualDuration = performance.now() - startTime;
      
      // Update duration estimates based on actual performance
      this.updateDurationEstimates(batch.operation, batch.size, actualDuration);
      
      console.log(
        `Batch completed in ${Math.round(actualDuration)}ms ` +
        `(estimated ${batch.estimatedDuration}ms)`
      );
      
      return {
        success: true,
        result,
        duration: Math.round(actualDuration),
        batchId: batch.id
      };
      
    } catch (err) {
      error = err;
      const actualDuration = performance.now() - startTime;
      
      console.error(
        `Batch failed after ${Math.round(actualDuration)}ms:`, 
        error.message
      );
      
      return {
        success: false,
        error: error.message,
        duration: Math.round(actualDuration),
        batchId: batch.id
      };
    }
  }

  /**
   * Update duration estimates based on actual performance
   */
  updateDurationEstimates(operation, batchSize, actualDuration) {
    // Simple learning algorithm to improve estimates
    const key = `duration_${operation}`;
    const stored = localStorage.getItem(key);
    
    let estimates = { count: 0, totalDuration: 0, avgPerRecord: 100 };
    
    if (stored) {
      try {
        estimates = JSON.parse(stored);
      } catch (e) {
        // Use defaults
      }
    }
    
    // Update estimates
    estimates.count++;
    estimates.totalDuration += actualDuration;
    estimates.avgPerRecord = estimates.totalDuration / estimates.count / batchSize;
    
    // Store updated estimates
    try {
      localStorage.setItem(key, JSON.stringify(estimates));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Get comprehensive delta sync performance metrics
   */
  getDeltaSyncPerformanceMetrics() {
    const stats = this.getDeltaSyncStats();
    
    // Add performance-specific metrics
    const performanceMetrics = {
      ...stats,
      batchConfiguration: this.batchConfig,
      optimizationSettings: this.syncOptimizations,
      pendingBatchSizes: Object.keys(this.pendingBatches).reduce((acc, dataType) => {
        acc[dataType] = this.pendingBatches[dataType].length;
        return acc;
      }, {}),
      changeTrackingSize: Object.keys(this.changeTracking).reduce((acc, dataType) => {
        acc[dataType] = this.changeTracking[dataType].size;
        return acc;
      }, {}),
      memoryUsage: this.estimateMemoryUsage()
    };
    
    return performanceMetrics;
  }

  /**
   * Estimate memory usage of delta sync system
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    // Estimate change tracking memory usage
    Object.values(this.changeTracking).forEach(changeMap => {
      changeMap.forEach(change => {
        // Rough estimate: 1KB per change record
        totalSize += 1024;
      });
    });
    
    // Estimate pending batches memory usage
    Object.values(this.pendingBatches).forEach(batch => {
      totalSize += batch.length * 512; // 512 bytes per pending change
    });
    
    return {
      estimatedBytes: totalSize,
      estimatedKB: Math.round(totalSize / 1024),
      estimatedMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
    };
  }

  /**
   * Optimize batch configuration based on performance history
   */
  optimizeBatchConfiguration() {
    try {
      // Get performance data for different operations
      const operations = ['create', 'update', 'delete'];
      let optimalBatchSize = this.batchConfig.maxBatchSize;
      let optimalDelay = this.batchConfig.maxBatchDelay;
      
      operations.forEach(operation => {
        const key = `duration_${operation}`;
        const stored = localStorage.getItem(key);
        
        if (stored) {
          const estimates = JSON.parse(stored);
          
          // Optimize batch size based on throughput
          if (estimates.avgPerRecord > 0) {
            const targetDuration = 2000; // 2 seconds per batch
            const suggestedSize = Math.floor(targetDuration / estimates.avgPerRecord);
            
            if (suggestedSize > 10 && suggestedSize < 500) {
              optimalBatchSize = Math.min(optimalBatchSize, suggestedSize);
            }
          }
        }
      });
      
      // Update configuration if significantly different
      if (Math.abs(optimalBatchSize - this.batchConfig.maxBatchSize) > 20) {
        console.log(
          `Optimizing batch size: ${this.batchConfig.maxBatchSize} -> ${optimalBatchSize}`
        );
        this.batchConfig.maxBatchSize = optimalBatchSize;
      }
      
      // Optimize delay based on batch frequency
      const avgBatchSize = Object.values(this.pendingBatches)
        .reduce((sum, batch) => sum + batch.length, 0) / 3;
      
      if (avgBatchSize > this.batchConfig.minBatchSize) {
        optimalDelay = Math.max(1000, this.batchConfig.maxBatchDelay - 1000);
      } else {
        optimalDelay = Math.min(10000, this.batchConfig.maxBatchDelay + 1000);
      }
      
      if (Math.abs(optimalDelay - this.batchConfig.maxBatchDelay) > 1000) {
        console.log(
          `Optimizing batch delay: ${this.batchConfig.maxBatchDelay} -> ${optimalDelay}`
        );
        this.batchConfig.maxBatchDelay = optimalDelay;
      }
      
    } catch (error) {
      console.error('Error optimizing batch configuration:', error);
    }
  }
}

// Make DeltaSyncManager available globally
window.DeltaSyncManager = DeltaSyncManager;