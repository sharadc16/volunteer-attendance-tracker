/**
 * Comprehensive Sync Manager for Volunteer Attendance Tracker
 * Handles local-to-cloud synchronization with batching, conflict resolution, and offline support
 */

class SyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncInterval = window.Config?.sync?.interval || 60000; // 60 seconds default
        this.batchSize = window.Config?.sync?.batchSize || 20;
        this.retryAttempts = window.Config?.sync?.retryAttempts || 3;
        this.syncTimer = null;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncQueue = [];
        this.conflictResolutionStrategy = 'local-wins'; // 'local-wins', 'remote-wins', 'merge'
        
        // Sync statistics
        this.stats = {
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            lastSyncDuration: 0,
            itemsSynced: 0,
            conflictsResolved: 0
        };

        this.init();
    }

    /**
     * Initialize the sync manager
     */
    async init() {
        try {
            console.log('Initializing Sync Manager...');
            
            // Wait for storage manager to be ready
            await this.waitForStorageManager();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load sync queue from storage
            await this.loadSyncQueue();
            
            // Start sync timer
            this.startSyncTimer();
            
            // Update sync status
            this.updateSyncStatus();
            
            console.log('Sync Manager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Sync Manager:', error);
        }
    }

    /**
     * Wait for storage manager to be ready
     */
    async waitForStorageManager() {
        let attempts = 0;
        const maxAttempts = 100;

        while (!window.StorageManager || !window.StorageManager.db) {
            if (attempts >= maxAttempts) {
                throw new Error('Storage manager not available');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    /**
     * Setup event listeners for online/offline status
     */
    setupEventListeners() {
        // Online/offline status
        window.addEventListener('online', () => {
            console.log('Connection restored - resuming sync');
            this.isOnline = true;
            this.updateSyncStatus();
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost - entering offline mode');
            this.isOnline = false;
            this.updateSyncStatus();
        });

        // Page visibility changes (resume sync when page becomes visible)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                this.syncPendingData();
            }
        });

        // Before page unload, try to sync pending data
        window.addEventListener('beforeunload', () => {
            if (this.syncQueue.length > 0) {
                // Try to sync immediately (best effort)
                this.syncPendingData(true);
            }
        });
    }

    /**
     * Queue data for synchronization
     */
    async queueForSync(operation, storeName, data, priority = 'normal') {
        const syncItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            operation, // 'create', 'update', 'delete'
            storeName, // 'volunteers', 'attendance', 'events'
            data,
            priority, // 'high', 'normal', 'low'
            attempts: 0,
            lastAttempt: null,
            status: 'pending' // 'pending', 'syncing', 'completed', 'failed'
        };

        try {
            // Add to local sync queue
            this.syncQueue.push(syncItem);
            
            // Persist to IndexedDB
            await window.StorageManager.performTransaction('syncQueue', 'readwrite', (store) => {
                return store.add(syncItem);
            });

            console.log(`Queued for sync: ${operation} ${storeName}`, syncItem);

            // If high priority and online, sync immediately
            if (priority === 'high' && this.isOnline && !this.isSyncing) {
                setTimeout(() => this.syncPendingData(), 100);
            }

            return syncItem.id;

        } catch (error) {
            console.error('Failed to queue item for sync:', error);
            throw error;
        }
    }

    /**
     * Load sync queue from storage
     */
    async loadSyncQueue() {
        try {
            const storedQueue = await window.StorageManager.performTransaction('syncQueue', 'readonly', (store) => {
                return store.getAll();
            });

            // Filter out completed items and sort by priority and timestamp
            this.syncQueue = storedQueue
                .filter(item => item.status !== 'completed')
                .sort((a, b) => {
                    // Sort by priority first (high > normal > low)
                    const priorityOrder = { high: 3, normal: 2, low: 1 };
                    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                    if (priorityDiff !== 0) return priorityDiff;
                    
                    // Then by timestamp (older first)
                    return new Date(a.timestamp) - new Date(b.timestamp);
                });

            console.log(`Loaded ${this.syncQueue.length} items from sync queue`);

        } catch (error) {
            console.error('Failed to load sync queue:', error);
            this.syncQueue = [];
        }
    }

    /**
     * Start sync timer
     */
    startSyncTimer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(() => {
            if (this.isOnline && !this.isSyncing && this.syncQueue.length > 0) {
                // Check if Google Sheets sync is disabled or authentication is cancelled
                if (window.GoogleSheetsService) {
                    const status = window.GoogleSheetsService.getStatus();
                    if (status.syncDisabled) {
                        console.log(`Sync skipped: Google Sheets sync disabled after ${status.cancelCount} cancellations.`);
                        return;
                    }
                    if (status.authenticationCancelled && status.inCooldown) {
                        console.log(`Sync skipped: Google Sheets authentication cancelled. ${status.cooldownRemaining} minutes remaining.`);
                        return;
                    }
                }
                this.syncPendingData();
            }
        }, this.syncInterval);

        console.log(`Sync timer started with ${this.syncInterval}ms interval`);
    }

    /**
     * Stop sync timer
     */
    stopSyncTimer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('Sync timer stopped');
        }
    }

    /**
     * Sync pending data to cloud
     */
    async syncPendingData(immediate = false) {
        if (!this.isOnline) {
            console.log('Offline - skipping sync');
            return;
        }

        if (this.isSyncing && !immediate) {
            console.log('Sync already in progress - skipping');
            return;
        }

        if (this.syncQueue.length === 0) {
            console.log('No items to sync');
            return;
        }

        this.isSyncing = true;
        const syncStartTime = Date.now();
        
        try {
            this.updateSyncStatus('syncing');
            console.log(`Starting sync of ${this.syncQueue.length} items...`);

            // Get items to sync (batch processing)
            const itemsToSync = this.syncQueue
                .filter(item => item.status === 'pending' || item.status === 'failed')
                .slice(0, this.batchSize);

            if (itemsToSync.length === 0) {
                console.log('No pending items to sync');
                return;
            }

            // Group items by store and operation for batch processing
            const batches = this.groupItemsForBatching(itemsToSync);
            
            let syncedCount = 0;
            let failedCount = 0;

            // Process each batch
            for (const batch of batches) {
                try {
                    await this.processBatch(batch);
                    syncedCount += batch.items.length;
                    
                    // Mark items as completed
                    for (const item of batch.items) {
                        item.status = 'completed';
                        await this.updateSyncQueueItem(item);
                    }
                    
                } catch (error) {
                    console.error(`Batch sync failed for ${batch.storeName} ${batch.operation}:`, error);
                    failedCount += batch.items.length;
                    
                    // Mark items as failed and increment attempt count
                    for (const item of batch.items) {
                        item.status = 'failed';
                        item.attempts++;
                        item.lastAttempt = new Date().toISOString();
                        item.error = error.message;
                        await this.updateSyncQueueItem(item);
                    }
                }
            }

            // Update statistics
            this.stats.totalSyncs++;
            this.stats.itemsSynced += syncedCount;
            this.stats.lastSyncDuration = Date.now() - syncStartTime;
            
            if (failedCount === 0) {
                this.stats.successfulSyncs++;
            } else {
                this.stats.failedSyncs++;
            }

            // Remove completed items from queue
            this.syncQueue = this.syncQueue.filter(item => item.status !== 'completed');
            
            // Clean up completed items from storage
            await this.cleanupCompletedItems();

            this.lastSyncTime = new Date().toISOString();
            
            console.log(`Sync completed: ${syncedCount} synced, ${failedCount} failed, ${this.stats.lastSyncDuration}ms`);

        } catch (error) {
            console.error('Sync process failed:', error);
            this.stats.failedSyncs++;
        } finally {
            this.isSyncing = false;
            this.updateSyncStatus();
        }
    }

    /**
     * Group items for efficient batch processing
     */
    groupItemsForBatching(items) {
        const batches = new Map();

        for (const item of items) {
            const key = `${item.storeName}_${item.operation}`;
            
            if (!batches.has(key)) {
                batches.set(key, {
                    storeName: item.storeName,
                    operation: item.operation,
                    items: []
                });
            }
            
            batches.get(key).items.push(item);
        }

        return Array.from(batches.values());
    }

    /**
     * Process a batch of sync items
     */
    async processBatch(batch) {
        const { storeName, operation, items } = batch;
        
        console.log(`Processing batch: ${operation} ${items.length} ${storeName} items`);

        // Check if Google Sheets service is available and authenticated
        if (!window.GoogleSheetsService) {
            throw new Error('Google Sheets service not available');
        }

        const sheetsService = window.GoogleSheetsService;
        const status = sheetsService.getStatus();

        if (!status.hasCredentials) {
            throw new Error('Google Sheets credentials not configured');
        }

        if (status.syncDisabled) {
            throw new Error(`Google Sheets sync has been disabled after ${status.cancelCount} authentication cancellations. Please re-enable in settings.`);
        }

        if (!status.isAuthenticated) {
            // Check if authentication was cancelled and we're in cooldown
            if (status.authenticationCancelled && status.inCooldown) {
                throw new Error(`Google Sheets authentication was cancelled. Please wait ${status.cooldownRemaining} minutes before trying again.`);
            }
            
            console.log('Authenticating with Google Sheets...');
            await sheetsService.authenticate();
        }

        // Process based on store type and operation
        switch (storeName) {
            case 'volunteers':
                await this.syncVolunteers(items, operation);
                break;
            case 'attendance':
                await this.syncAttendance(items, operation);
                break;
            case 'events':
                await this.syncEvents(items, operation);
                break;
            default:
                throw new Error(`Unknown store type: ${storeName}`);
        }
    }

    /**
     * Sync volunteers to Google Sheets
     */
    async syncVolunteers(items, operation) {
        const sheetsService = window.GoogleSheetsService;
        
        switch (operation) {
            case 'create':
            case 'update':
                const volunteers = items.map(item => item.data);
                await sheetsService.uploadVolunteers(volunteers);
                break;
            case 'delete':
                // For deletes, we might need to implement a different approach
                // For now, we'll mark them as inactive in the sheet
                const inactiveVolunteers = items.map(item => ({
                    ...item.data,
                    status: 'Deleted'
                }));
                await sheetsService.uploadVolunteers(inactiveVolunteers);
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Sync attendance records to Google Sheets
     */
    async syncAttendance(items, operation) {
        const sheetsService = window.GoogleSheetsService;
        
        switch (operation) {
            case 'create':
                const attendanceRecords = items.map(item => {
                    const record = item.data;
                    // Ensure we have volunteer name for the sheet
                    return {
                        ...record,
                        volunteerName: record.volunteerName || record.volunteerId
                    };
                });
                await sheetsService.uploadAttendance(attendanceRecords);
                break;
            case 'update':
            case 'delete':
                // Attendance records are typically append-only
                // Updates and deletes might require special handling
                console.warn(`${operation} operation not fully supported for attendance records`);
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Sync events to Google Sheets
     */
    async syncEvents(items, operation) {
        const sheetsService = window.GoogleSheetsService;
        
        switch (operation) {
            case 'create':
            case 'update':
                const events = items.map(item => item.data);
                await sheetsService.uploadEvents(events);
                break;
            case 'delete':
                // Mark events as cancelled
                const cancelledEvents = items.map(item => ({
                    ...item.data,
                    status: 'Cancelled'
                }));
                await sheetsService.uploadEvents(cancelledEvents);
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Update sync queue item in storage
     */
    async updateSyncQueueItem(item) {
        try {
            await window.StorageManager.performTransaction('syncQueue', 'readwrite', (store) => {
                return store.put(item);
            });
        } catch (error) {
            console.error('Failed to update sync queue item:', error);
        }
    }

    /**
     * Clean up completed items from storage
     */
    async cleanupCompletedItems() {
        try {
            const completedItems = await window.StorageManager.performTransaction('syncQueue', 'readonly', (store) => {
                return store.getAll();
            });

            const itemsToDelete = completedItems.filter(item => item.status === 'completed');
            
            if (itemsToDelete.length > 0) {
                await window.StorageManager.performTransaction('syncQueue', 'readwrite', (store) => {
                    const deletePromises = itemsToDelete.map(item => store.delete(item.id));
                    return Promise.all(deletePromises);
                });
                
                console.log(`Cleaned up ${itemsToDelete.length} completed sync items`);
            }

        } catch (error) {
            console.error('Failed to cleanup completed items:', error);
        }
    }

    /**
     * Handle conflict resolution
     */
    async resolveConflict(localData, remoteData, conflictType) {
        this.stats.conflictsResolved++;
        
        console.log(`Resolving conflict: ${conflictType}`, { localData, remoteData });

        switch (this.conflictResolutionStrategy) {
            case 'local-wins':
                console.log('Conflict resolved: local data wins');
                return localData;
                
            case 'remote-wins':
                console.log('Conflict resolved: remote data wins');
                return remoteData;
                
            case 'merge':
                // Implement merge logic based on timestamps and data type
                const merged = this.mergeData(localData, remoteData);
                console.log('Conflict resolved: data merged', merged);
                return merged;
                
            default:
                console.warn('Unknown conflict resolution strategy, defaulting to local wins');
                return localData;
        }
    }

    /**
     * Merge conflicting data
     */
    mergeData(localData, remoteData) {
        // Simple merge strategy: use most recent timestamp for each field
        const merged = { ...localData };
        
        // If remote data has more recent timestamp, use remote values
        if (remoteData.lastModified && localData.lastModified) {
            if (new Date(remoteData.lastModified) > new Date(localData.lastModified)) {
                Object.assign(merged, remoteData);
            }
        }
        
        return merged;
    }

    /**
     * Update sync status indicator in UI
     */
    updateSyncStatus(status = null) {
        const currentStatus = status || (this.isSyncing ? 'syncing' : 
                                       this.isOnline ? 'online' : 'offline');
        
        const statusIndicator = document.querySelector('.sync-status-indicator');
        const statusText = document.querySelector('.sync-status-text');
        const syncInfo = document.querySelector('.sync-info');

        if (statusIndicator) {
            statusIndicator.className = `sync-status-indicator ${currentStatus}`;
        }

        if (statusText) {
            const statusMessages = {
                online: 'Online',
                offline: 'Offline',
                syncing: 'Syncing...',
                error: 'Sync Error'
            };
            statusText.textContent = statusMessages[currentStatus] || 'Unknown';
        }

        if (syncInfo) {
            const queueCount = this.syncQueue.filter(item => item.status === 'pending').length;
            const lastSync = this.lastSyncTime ? 
                new Date(this.lastSyncTime).toLocaleTimeString() : 'Never';
            
            syncInfo.innerHTML = `
                <div class="sync-detail">Queue: ${queueCount} items</div>
                <div class="sync-detail">Last sync: ${lastSync}</div>
                <div class="sync-detail">Success rate: ${this.getSuccessRate()}%</div>
            `;
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('syncStatusChanged', {
            detail: {
                status: currentStatus,
                isOnline: this.isOnline,
                isSyncing: this.isSyncing,
                queueLength: this.syncQueue.length,
                stats: this.stats
            }
        }));
    }

    /**
     * Get sync success rate
     */
    getSuccessRate() {
        if (this.stats.totalSyncs === 0) return 100;
        return Math.round((this.stats.successfulSyncs / this.stats.totalSyncs) * 100);
    }

    /**
     * Force immediate sync
     */
    async forcSync() {
        console.log('Force sync requested');
        await this.syncPendingData(true);
    }

    /**
     * Clear sync queue (for testing/debugging)
     */
    async clearSyncQueue() {
        try {
            this.syncQueue = [];
            await window.StorageManager.performTransaction('syncQueue', 'readwrite', (store) => {
                return store.clear();
            });
            console.log('Sync queue cleared');
            this.updateSyncStatus();
        } catch (error) {
            console.error('Failed to clear sync queue:', error);
        }
    }

    /**
     * Get sync statistics
     */
    getStats() {
        return {
            ...this.stats,
            queueLength: this.syncQueue.length,
            pendingItems: this.syncQueue.filter(item => item.status === 'pending').length,
            failedItems: this.syncQueue.filter(item => item.status === 'failed').length,
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            successRate: this.getSuccessRate()
        };
    }

    /**
     * Set conflict resolution strategy
     */
    setConflictResolutionStrategy(strategy) {
        const validStrategies = ['local-wins', 'remote-wins', 'merge'];
        if (validStrategies.includes(strategy)) {
            this.conflictResolutionStrategy = strategy;
            console.log(`Conflict resolution strategy set to: ${strategy}`);
        } else {
            console.error(`Invalid strategy: ${strategy}. Valid options: ${validStrategies.join(', ')}`);
        }
    }

    /**
     * Retry failed sync items
     */
    async retryFailedItems() {
        const failedItems = this.syncQueue.filter(item => 
            item.status === 'failed' && item.attempts < this.retryAttempts
        );

        if (failedItems.length === 0) {
            console.log('No failed items to retry');
            return;
        }

        console.log(`Retrying ${failedItems.length} failed items`);
        
        // Reset status to pending for retry
        for (const item of failedItems) {
            item.status = 'pending';
            await this.updateSyncQueueItem(item);
        }

        // Trigger sync
        await this.syncPendingData();
    }

    /**
     * Cleanup old failed items that exceeded retry attempts
     */
    async cleanupFailedItems() {
        const expiredItems = this.syncQueue.filter(item => 
            item.status === 'failed' && item.attempts >= this.retryAttempts
        );

        if (expiredItems.length === 0) {
            return;
        }

        console.log(`Cleaning up ${expiredItems.length} expired failed items`);
        
        // Remove from queue and storage
        this.syncQueue = this.syncQueue.filter(item => !expiredItems.includes(item));
        
        await window.StorageManager.performTransaction('syncQueue', 'readwrite', (store) => {
            const deletePromises = expiredItems.map(item => store.delete(item.id));
            return Promise.all(deletePromises);
        });
    }

    /**
     * Destroy sync manager
     */
    destroy() {
        this.stopSyncTimer();
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        console.log('Sync Manager destroyed');
    }
}

// Initialize sync manager
window.SyncManager = new SyncManager();

// Add global functions for debugging
window.forcSync = () => window.SyncManager?.forcSync();
window.getSyncStats = () => window.SyncManager?.getStats();
window.clearSyncQueue = () => window.SyncManager?.clearSyncQueue();
window.retryFailedSync = () => window.SyncManager?.retryFailedItems();