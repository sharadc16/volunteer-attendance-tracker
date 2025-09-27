/**
 * Sync System Initialization
 * Handles migration and initialization of the unified sync system
 */
class SyncInitializer {
  constructor() {
    this.initialized = false;
    this.migrationCompleted = false;
    this.unifiedSyncManager = null;
  }

  /**
   * Initialize the sync system
   */
  async init() {
    try {
      console.log('Initializing sync system...');

      // Step 1: Check if migration is needed
      const migration = new SyncMigration();
      const migrationStatus = migration.getMigrationStatus();

      if (migrationStatus.needsMigration && !migrationStatus.completed) {
        console.log('Migration needed, performing sync system migration...');
        
        // Perform migration
        const migrationResult = await migration.migrate();
        
        if (!migrationResult.success) {
          throw new Error(`Migration failed: ${migrationResult.error}`);
        }

        // Validate migration
        const validation = await migration.validateMigration();
        if (!validation.valid) {
          throw new Error('Migration validation failed');
        }

        this.migrationCompleted = true;
        console.log('Migration completed successfully');
      } else if (migrationStatus.completed) {
        console.log('Migration already completed');
        this.migrationCompleted = true;
      } else {
        console.log('No migration needed');
        this.migrationCompleted = true;
      }

      // Step 2: Initialize unified sync manager
      this.unifiedSyncManager = new UnifiedSyncManager();
      const initResult = await this.unifiedSyncManager.init();

      if (!initResult) {
        throw new Error('Failed to initialize UnifiedSyncManager');
      }

      // Step 3: Set up global references
      this.setupGlobalReferences();

      // Step 4: Clean up old sync managers if they exist
      this.cleanupOldSyncManagers();

      this.initialized = true;
      console.log('Sync system initialization completed successfully');

      // Notify that sync system is ready
      this.notifyInitializationComplete();

      return { success: true, migrated: this.migrationCompleted };

    } catch (error) {
      console.error('Sync system initialization failed:', error);
      
      // Attempt fallback initialization
      await this.fallbackInitialization();
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up global references for the unified sync system
   */
  setupGlobalReferences() {
    // Replace old SyncManager with unified one
    window.SyncManager = this.unifiedSyncManager;
    
    // Also set up window.Sync for legacy compatibility
    window.Sync = this.unifiedSyncManager;
    
    // Provide backward compatibility methods
    this.setupBackwardCompatibility();
    
    // Set up sync performance integration
    this.setupSyncPerformanceIntegration();
    
    // Prevent old sync system from overwriting our unified system
    this.preventOldSyncOverwrite();
  }

  /**
   * Set up backward compatibility for existing code
   */
  setupBackwardCompatibility() {
    const syncManager = this.unifiedSyncManager;

    // Ensure all expected methods exist
    if (!syncManager.startPeriodicSync) {
      syncManager.startPeriodicSync = syncManager.startPeriodicSync.bind(syncManager);
    }

    if (!syncManager.stopPeriodicSync) {
      syncManager.stopPeriodicSync = syncManager.stopPeriodicSync.bind(syncManager);
    }

    if (!syncManager.performSync) {
      syncManager.performSync = syncManager.performSync.bind(syncManager);
    }

    // Add compatibility aliases
    syncManager.forceSync = () => syncManager.forceFullSync();
    syncManager.getSyncStats = () => syncManager.getSyncStatus();
  }

  /**
   * Set up sync performance integration
   */
  setupSyncPerformanceIntegration() {
    // Create integration object for performance optimizations
    window.syncPerformanceIntegration = {
      unifiedSyncManager: this.unifiedSyncManager,
      
      // Provide access to change tracking for performance queries
      getChangesSince: (dataType, timestamp) => {
        return this.unifiedSyncManager.getLocalChangesSince(dataType, timestamp);
      },
      
      // Provide access to sync strategy information
      getLastSyncStrategy: () => {
        return this.unifiedSyncManager.lastSyncStrategy || 'unknown';
      },
      
      // Performance metrics
      getPerformanceMetrics: () => {
        const status = this.unifiedSyncManager.getSyncStatus();
        return {
          totalSyncs: status.stats.totalSyncs,
          successRate: status.stats.totalSyncs > 0 ? 
            (status.stats.successfulSyncs / status.stats.totalSyncs) * 100 : 0,
          averageRecordsPerSync: status.stats.totalSyncs > 0 ?
            (status.stats.uploadedRecords + status.stats.downloadedRecords) / status.stats.totalSyncs : 0,
          changeTrackingEfficiency: status.changeCount
        };
      }
    };
  }

  /**
   * Clean up old sync managers
   */
  cleanupOldSyncManagers() {
    // Remove old DeltaSyncManager if it exists
    if (window.DeltaSyncManager) {
      try {
        // Stop any running processes
        if (typeof window.DeltaSyncManager.pause === 'function') {
          window.DeltaSyncManager.pause('system-migration');
        }
        
        // Clear any timers
        if (window.DeltaSyncManager.batchTimers) {
          window.DeltaSyncManager.batchTimers.forEach(timer => clearTimeout(timer));
        }
        
        console.log('Old DeltaSyncManager cleaned up');
      } catch (error) {
        console.warn('Error cleaning up DeltaSyncManager:', error);
      }
      
      // Remove reference
      delete window.DeltaSyncManager;
    }

    // Note: We keep window.SyncManager but replace it with UnifiedSyncManager
    // This maintains backward compatibility
  }

  /**
   * Prevent old sync system from overwriting our unified system
   */
  preventOldSyncOverwrite() {
    // Create a protective wrapper that prevents overwriting
    const originalSyncManager = window.SyncManager;
    const originalSync = window.Sync;
    
    // Define property descriptors that prevent overwriting
    Object.defineProperty(window, 'SyncManager', {
      get: () => originalSyncManager,
      set: (value) => {
        if (value !== originalSyncManager) {
          console.warn('Attempt to overwrite UnifiedSyncManager prevented');
        }
      },
      configurable: false
    });
    
    Object.defineProperty(window, 'Sync', {
      get: () => originalSync,
      set: (value) => {
        if (value !== originalSync) {
          console.warn('Attempt to overwrite unified Sync interface prevented');
        }
      },
      configurable: false
    });
    
    console.log('Protected unified sync system from being overwritten');
  }

  /**
   * Fallback initialization if main initialization fails
   */
  async fallbackInitialization() {
    try {
      console.log('Attempting fallback initialization...');
      
      // Try to initialize with minimal configuration
      this.unifiedSyncManager = new UnifiedSyncManager();
      
      // Override some settings for fallback mode
      this.unifiedSyncManager.isEnabled = false; // Disable sync in fallback mode
      
      await this.unifiedSyncManager.init();
      
      // Set up minimal global references
      window.SyncManager = this.unifiedSyncManager;
      
      console.log('Fallback initialization completed - sync disabled');
      
    } catch (error) {
      console.error('Fallback initialization also failed:', error);
      
      // Create a minimal stub to prevent errors
      window.SyncManager = {
        isEnabled: false,
        isOnline: false,
        isSyncing: false,
        performSync: () => Promise.resolve({ success: false, reason: 'initialization_failed' }),
        init: () => Promise.resolve(false),
        getSyncStatus: () => ({ enabled: false, error: 'Initialization failed' })
      };
    }
  }

  /**
   * Notify that initialization is complete
   */
  notifyInitializationComplete() {
    // Dispatch custom event
    const event = new CustomEvent('syncSystemReady', {
      detail: {
        migrated: this.migrationCompleted,
        manager: this.unifiedSyncManager,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(event);

    // Also notify through console for debugging
    console.log('🔄 Sync system ready:', {
      migrated: this.migrationCompleted,
      enabled: this.unifiedSyncManager.isEnabled,
      online: this.unifiedSyncManager.isOnline
    });
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      migrationCompleted: this.migrationCompleted,
      syncEnabled: this.unifiedSyncManager?.isEnabled || false,
      syncOnline: this.unifiedSyncManager?.isOnline || false,
      manager: this.unifiedSyncManager
    };
  }

  /**
   * Reinitialize the sync system (for testing or recovery)
   */
  async reinitialize() {
    try {
      console.log('Reinitializing sync system...');
      
      // Stop current sync manager
      if (this.unifiedSyncManager) {
        this.unifiedSyncManager.stopPeriodicSync();
      }
      
      // Reset state
      this.initialized = false;
      this.migrationCompleted = false;
      this.unifiedSyncManager = null;
      
      // Reinitialize
      return await this.init();
      
    } catch (error) {
      console.error('Reinitialization failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for other core services to be ready
  const waitForServices = () => {
    return new Promise((resolve) => {
      const checkServices = () => {
        if (window.Config && window.Storage && window.AuthManager) {
          resolve();
        } else {
          setTimeout(checkServices, 100);
        }
      };
      checkServices();
    });
  };

  await waitForServices();

  // Initialize sync system
  const initializer = new SyncInitializer();
  window.syncInitializer = initializer;
  
  const result = await initializer.init();
  
  if (result.success) {
    console.log('✅ Sync system initialized successfully');
    if (result.migrated) {
      console.log('📦 Migration from old sync system completed');
    }
  } else {
    console.error('❌ Sync system initialization failed:', result.error);
  }
});

// Export for manual initialization if needed
window.SyncInitializer = SyncInitializer;