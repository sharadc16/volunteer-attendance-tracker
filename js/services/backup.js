/**
 * Data Backup Manager
 * Handles data backup, rollback, and recovery for critical data operations
 */
class DataBackupManager {
  constructor() {
    this.backups = new Map();
    this.maxBackups = 10;
    this.backupPrefix = 'vat_backup_';
    this.compressionEnabled = true;
    
    // Initialize from localStorage
    this.loadBackupsFromStorage();
  }

  /**
   * Create backup of data before critical operations
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} data - Data to backup
   * @param {Object} metadata - Additional metadata
   * @returns {string} Backup ID
   */
  createBackup(operationId, data, metadata = {}) {
    const backupId = `${operationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const backup = {
      id: backupId,
      operationId,
      timestamp: Date.now(),
      data: this.compressionEnabled ? this.compressData(data) : data,
      compressed: this.compressionEnabled,
      metadata: {
        ...metadata,
        dataSize: JSON.stringify(data).length,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    // Store in memory
    this.backups.set(backupId, backup);
    
    // Persist to localStorage
    this.saveBackupToStorage(backup);
    
    // Cleanup old backups
    this.cleanupOldBackups();
    
    console.log(`Created backup: ${backupId} for operation: ${operationId}`);
    return backupId;
  }

  /**
   * Restore data from backup
   * @param {string} backupId - Backup ID to restore
   * @returns {Object} Restored data
   */
  restoreBackup(backupId) {
    const backup = this.backups.get(backupId);
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    try {
      const restoredData = backup.compressed ? 
        this.decompressData(backup.data) : 
        backup.data;
      
      console.log(`Restored backup: ${backupId}`);
      
      // Log restoration event
      this.logBackupEvent('restore', backupId, backup.operationId);
      
      return restoredData;
      
    } catch (error) {
      console.error(`Failed to restore backup ${backupId}:`, error);
      
      // Handle backup corruption
      if (window.ErrorHandler) {
        window.ErrorHandler.handleError(error, {
          component: 'DataBackupManager',
          operation: 'restore_backup',
          backupId,
          operationId: backup.operationId
        });
      }
      
      throw error;
    }
  }  /**
   *
 Create automatic backup before data operations
   * @param {string} operation - Operation name
   * @param {Object} currentData - Current data state
   * @param {Object} context - Operation context
   * @returns {string} Backup ID
   */
  createAutoBackup(operation, currentData, context = {}) {
    const operationId = `auto_${operation}`;
    
    return this.createBackup(operationId, currentData, {
      ...context,
      automatic: true,
      operation,
      timestamp: Date.now()
    });
  }

  /**
   * Rollback to previous state using backup
   * @param {string} backupId - Backup to rollback to
   * @param {Function} applyFunction - Function to apply the restored data
   * @returns {boolean} Success status
   */
  async rollback(backupId, applyFunction) {
    try {
      const restoredData = this.restoreBackup(backupId);
      
      // Apply the restored data
      if (typeof applyFunction === 'function') {
        await applyFunction(restoredData);
      }
      
      console.log(`Successfully rolled back to backup: ${backupId}`);
      this.logBackupEvent('rollback', backupId);
      
      return true;
      
    } catch (error) {
      console.error(`Rollback failed for backup ${backupId}:`, error);
      
      if (window.ErrorHandler) {
        window.ErrorHandler.handleError(error, {
          component: 'DataBackupManager',
          operation: 'rollback',
          backupId
        });
      }
      
      return false;
    }
  }

  /**
   * Get backup information
   * @param {string} backupId - Backup ID
   * @returns {Object} Backup metadata
   */
  getBackupInfo(backupId) {
    const backup = this.backups.get(backupId);
    
    if (!backup) {
      return null;
    }

    return {
      id: backup.id,
      operationId: backup.operationId,
      timestamp: backup.timestamp,
      age: Date.now() - backup.timestamp,
      compressed: backup.compressed,
      metadata: backup.metadata
    };
  }

  /**
   * List all available backups
   * @param {string} operationId - Filter by operation ID (optional)
   * @returns {Array} List of backup info
   */
  listBackups(operationId = null) {
    const backups = Array.from(this.backups.values());
    
    const filtered = operationId ? 
      backups.filter(backup => backup.operationId === operationId) : 
      backups;
    
    return filtered
      .map(backup => this.getBackupInfo(backup.id))
      .sort((a, b) => b.timestamp - a.timestamp);
  }  /**
   *
 Delete backup
   * @param {string} backupId - Backup ID to delete
   * @returns {boolean} Success status
   */
  deleteBackup(backupId) {
    try {
      const backup = this.backups.get(backupId);
      
      if (!backup) {
        console.warn(`Backup not found for deletion: ${backupId}`);
        return false;
      }

      // Remove from memory
      this.backups.delete(backupId);
      
      // Remove from localStorage
      localStorage.removeItem(`${this.backupPrefix}${backupId}`);
      
      console.log(`Deleted backup: ${backupId}`);
      this.logBackupEvent('delete', backupId, backup.operationId);
      
      return true;
      
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
      return false;
    }
  }

  /**
   * Cleanup old backups to maintain storage limits
   */
  cleanupOldBackups() {
    const backups = Array.from(this.backups.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // Keep only the most recent backups
    const toDelete = backups.slice(this.maxBackups);
    
    toDelete.forEach(backup => {
      this.deleteBackup(backup.id);
    });
    
    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} old backups`);
    }
  }

  /**
   * Compress data for storage efficiency
   */
  compressData(data) {
    try {
      // Simple compression using JSON stringify with reduced whitespace
      const jsonString = JSON.stringify(data);
      
      // For larger data, we could implement LZ-string compression here
      // For now, just return the JSON string
      return jsonString;
      
    } catch (error) {
      console.warn('Data compression failed, storing uncompressed:', error);
      return data;
    }
  }

  /**
   * Decompress data
   */
  decompressData(compressedData) {
    try {
      // If it's a string, parse it as JSON
      if (typeof compressedData === 'string') {
        return JSON.parse(compressedData);
      }
      
      // Otherwise return as-is
      return compressedData;
      
    } catch (error) {
      console.error('Data decompression failed:', error);
      throw new Error('Backup data is corrupted and cannot be restored');
    }
  }  /
**
   * Save backup to localStorage
   */
  saveBackupToStorage(backup) {
    try {
      const storageKey = `${this.backupPrefix}${backup.id}`;
      localStorage.setItem(storageKey, JSON.stringify(backup));
    } catch (error) {
      console.error('Failed to save backup to storage:', error);
      
      // If storage is full, try to cleanup and retry
      if (error.name === 'QuotaExceededError') {
        this.cleanupOldBackups();
        
        try {
          const storageKey = `${this.backupPrefix}${backup.id}`;
          localStorage.setItem(storageKey, JSON.stringify(backup));
        } catch (retryError) {
          console.error('Failed to save backup even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Load backups from localStorage
   */
  loadBackupsFromStorage() {
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(key => key.startsWith(this.backupPrefix));
      
      backupKeys.forEach(key => {
        try {
          const backupData = localStorage.getItem(key);
          const backup = JSON.parse(backupData);
          this.backups.set(backup.id, backup);
        } catch (error) {
          console.warn(`Failed to load backup from key ${key}:`, error);
          // Remove corrupted backup
          localStorage.removeItem(key);
        }
      });
      
      console.log(`Loaded ${this.backups.size} backups from storage`);
      
    } catch (error) {
      console.error('Failed to load backups from storage:', error);
    }
  }

  /**
   * Log backup events for audit trail
   */
  logBackupEvent(action, backupId, operationId = null) {
    const event = {
      action,
      backupId,
      operationId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };

    // Store in a simple log array in localStorage
    try {
      const logKey = 'vat_backup_log';
      const existingLog = JSON.parse(localStorage.getItem(logKey) || '[]');
      existingLog.unshift(event);
      
      // Keep only last 100 events
      const trimmedLog = existingLog.slice(0, 100);
      localStorage.setItem(logKey, JSON.stringify(trimmedLog));
      
    } catch (error) {
      console.warn('Failed to log backup event:', error);
    }
  }

  /**
   * Get backup statistics
   */
  getStats() {
    const backups = Array.from(this.backups.values());
    
    return {
      totalBackups: backups.length,
      oldestBackup: backups.length > 0 ? Math.min(...backups.map(b => b.timestamp)) : null,
      newestBackup: backups.length > 0 ? Math.max(...backups.map(b => b.timestamp)) : null,
      totalSize: backups.reduce((sum, backup) => {
        return sum + (backup.metadata?.dataSize || 0);
      }, 0),
      byOperation: this.getBackupsByOperation()
    };
  }

  /**
   * Get backups grouped by operation
   */
  getBackupsByOperation() {
    const backups = Array.from(this.backups.values());
    const grouped = {};
    
    backups.forEach(backup => {
      const op = backup.operationId;
      if (!grouped[op]) {
        grouped[op] = [];
      }
      grouped[op].push(backup.id);
    });
    
    return grouped;
  }

  /**
   * Clear all backups
   */
  clearAllBackups() {
    const backupIds = Array.from(this.backups.keys());
    
    backupIds.forEach(id => {
      this.deleteBackup(id);
    });
    
    console.log(`Cleared ${backupIds.length} backups`);
    return backupIds.length;
  }
}

// Global instance
window.DataBackupManager = new DataBackupManager();