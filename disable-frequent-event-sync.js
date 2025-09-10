/**
 * Disable Frequent Event Syncing
 * Events don't change frequently, so we only need to sync them:
 * 1. On page load (initial sync)
 * 2. When manually requested (force sync button)
 * 3. When events are created/modified locally
 */

(function() {
    'use strict';
    
    console.log('🔧 Loading event sync optimization...');
    
    // Configuration for event sync behavior
    const EVENT_SYNC_CONFIG = {
        // Disable automatic periodic event syncing
        disablePeriodicEventSync: true,
        
        // Only sync events on these triggers
        allowedEventSyncTriggers: [
            'page-load',
            'manual-force-sync',
            'local-event-created',
            'local-event-modified',
            'local-event-deleted'
        ],
        
        // Minimum time between event syncs (in milliseconds)
        minEventSyncInterval: 5 * 60 * 1000, // 5 minutes
        
        // Track last event sync time
        lastEventSyncTime: 0
    };
    
    // Store original functions
    let originalSyncEvents = null;
    let originalQueueForSync = null;
    
    /**
     * Check if event sync should be allowed
     */
    function shouldAllowEventSync(trigger = 'unknown') {
        const now = Date.now();
        const timeSinceLastSync = now - EVENT_SYNC_CONFIG.lastEventSyncTime;
        
        // Always allow manual force sync
        if (trigger === 'manual-force-sync') {
            console.log('✅ Event sync allowed: manual force sync');
            return true;
        }
        
        // Always allow page load sync
        if (trigger === 'page-load') {
            console.log('✅ Event sync allowed: page load');
            return true;
        }
        
        // Allow local changes to sync
        if (EVENT_SYNC_CONFIG.allowedEventSyncTriggers.includes(trigger)) {
            console.log(`✅ Event sync allowed: ${trigger}`);
            return true;
        }
        
        // Check minimum interval for other syncs
        if (timeSinceLastSync < EVENT_SYNC_CONFIG.minEventSyncInterval) {
            const remainingTime = Math.ceil((EVENT_SYNC_CONFIG.minEventSyncInterval - timeSinceLastSync) / 1000);
            console.log(`🛑 Event sync blocked: too frequent (${remainingTime}s remaining)`);
            return false;
        }
        
        console.log(`✅ Event sync allowed: ${trigger} (interval check passed)`);
        return true;
    }
    
    /**
     * Override SyncManager's syncEvents method
     */
    function overrideSyncManagerEventSync() {
        if (!window.SyncManager) {
            console.log('⚠️ SyncManager not available yet, will retry...');
            return false;
        }
        
        // Store original method if not already stored
        if (!originalSyncEvents && window.SyncManager.syncEvents) {
            originalSyncEvents = window.SyncManager.syncEvents.bind(window.SyncManager);
        }
        
        // Override syncEvents method
        window.SyncManager.syncEvents = function(items, operation, trigger = 'periodic') {
            if (EVENT_SYNC_CONFIG.disablePeriodicEventSync && !shouldAllowEventSync(trigger)) {
                console.log('🛑 Event sync skipped due to frequency optimization');
                return Promise.resolve();
            }
            
            // Update last sync time
            EVENT_SYNC_CONFIG.lastEventSyncTime = Date.now();
            
            console.log(`🔄 Event sync proceeding: ${trigger}`);
            
            // Call original method if it exists
            if (originalSyncEvents) {
                return originalSyncEvents(items, operation);
            } else {
                console.log('⚠️ Original syncEvents method not found');
                return Promise.resolve();
            }
        };
        
        console.log('✅ SyncManager event sync override installed');
        return true;
    }
    
    /**
     * Override SyncManager's queueForSync method to filter events
     */
    function overrideQueueForSync() {
        if (!window.SyncManager) {
            return false;
        }
        
        // Store original method if not already stored
        if (!originalQueueForSync && window.SyncManager.queueForSync) {
            originalQueueForSync = window.SyncManager.queueForSync.bind(window.SyncManager);
        }
        
        // Override queueForSync method
        window.SyncManager.queueForSync = function(operation, storeName, data, priority = 'normal') {
            // Filter out frequent event syncs
            if (storeName === 'events' && EVENT_SYNC_CONFIG.disablePeriodicEventSync) {
                const trigger = priority === 'high' ? 'local-event-modified' : 'periodic';
                
                if (!shouldAllowEventSync(trigger)) {
                    console.log(`🛑 Event sync queue blocked: ${operation} ${storeName} (${trigger})`);
                    return Promise.resolve('blocked');
                }
            }
            
            // Update last sync time for events
            if (storeName === 'events') {
                EVENT_SYNC_CONFIG.lastEventSyncTime = Date.now();
            }
            
            // Call original method
            if (originalQueueForSync) {
                return originalQueueForSync(operation, storeName, data, priority);
            } else {
                console.log('⚠️ Original queueForSync method not found');
                return Promise.resolve('no-original');
            }
        };
        
        console.log('✅ SyncManager queueForSync override installed');
        return true;
    }
    
    /**
     * Override StorageManager's syncEventsFromGoogleSheets to add trigger context
     */
    function overrideStorageManagerEventSync() {
        if (!window.StorageManager) {
            return false;
        }
        
        const originalSyncEventsFromGoogleSheets = window.StorageManager.syncEventsFromGoogleSheets;
        if (!originalSyncEventsFromGoogleSheets) {
            return false;
        }
        
        window.StorageManager.syncEventsFromGoogleSheets = function(trigger = 'unknown') {
            if (EVENT_SYNC_CONFIG.disablePeriodicEventSync && !shouldAllowEventSync(trigger)) {
                console.log(`🛑 StorageManager event sync blocked: ${trigger}`);
                return Promise.resolve();
            }
            
            // Update last sync time
            EVENT_SYNC_CONFIG.lastEventSyncTime = Date.now();
            
            console.log(`🔄 StorageManager event sync proceeding: ${trigger}`);
            return originalSyncEventsFromGoogleSheets.call(this);
        };
        
        console.log('✅ StorageManager event sync override installed');
        return true;
    }
    
    /**
     * Add manual force sync function for events
     */
    function addManualEventSyncFunction() {
        window.forceEventSync = async function() {
            console.log('🔧 Manual event sync requested');
            
            try {
                if (window.StorageManager && window.StorageManager.syncEventsFromGoogleSheets) {
                    await window.StorageManager.syncEventsFromGoogleSheets('manual-force-sync');
                    console.log('✅ Manual event sync completed');
                } else {
                    console.error('❌ StorageManager not available for manual event sync');
                }
            } catch (error) {
                console.error('❌ Manual event sync failed:', error);
            }
        };
        
        console.log('✅ Manual event sync function added (window.forceEventSync)');
    }
    
    /**
     * Add event sync controls to the Events page
     */
    function addEventSyncControls() {
        // Wait for DOM to be ready
        const addControls = () => {
            const eventsView = document.getElementById('eventsView');
            const viewHeader = eventsView?.querySelector('.view-header');
            const viewControls = viewHeader?.querySelector('.view-controls');
            
            if (!viewControls) {
                return false;
            }
            
            // Check if controls already exist
            if (document.getElementById('manualEventSyncBtn')) {
                return true;
            }
            
            // Create manual sync button
            const syncButton = document.createElement('button');
            syncButton.id = 'manualEventSyncBtn';
            syncButton.className = 'btn btn-secondary';
            syncButton.innerHTML = '🔄 Sync Events';
            syncButton.title = 'Manually sync events from Google Sheets';
            
            syncButton.addEventListener('click', async () => {
                syncButton.disabled = true;
                syncButton.innerHTML = '🔄 Syncing...';
                
                try {
                    await window.forceEventSync();
                    
                    // Refresh events view
                    if (window.app && window.app.updateEventsView) {
                        await window.app.updateEventsView();
                    }
                    
                    syncButton.innerHTML = '✅ Synced';
                    setTimeout(() => {
                        syncButton.innerHTML = '🔄 Sync Events';
                        syncButton.disabled = false;
                    }, 2000);
                    
                } catch (error) {
                    console.error('Manual event sync failed:', error);
                    syncButton.innerHTML = '❌ Failed';
                    setTimeout(() => {
                        syncButton.innerHTML = '🔄 Sync Events';
                        syncButton.disabled = false;
                    }, 3000);
                }
            });
            
            // Add to view controls (before the first button)
            viewControls.insertBefore(syncButton, viewControls.firstChild);
            
            console.log('✅ Manual event sync button added to Events page');
            return true;
        };
        
        // Try to add controls immediately
        if (!addControls()) {
            // If not ready, wait for DOM and try again
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', addControls);
            } else {
                setTimeout(addControls, 1000);
            }
        }
        
        // Also add when events view becomes active
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-view="events"]')) {
                setTimeout(addControls, 100);
            }
        });
    }
    
    /**
     * Initialize the event sync optimization
     */
    async function initializeEventSyncOptimization() {
        console.log('🚀 Initializing event sync optimization...');
        
        // Add manual sync function
        addManualEventSyncFunction();
        
        // Add UI controls
        addEventSyncControls();
        
        // Wait for managers to be ready and override their methods
        let retries = 0;
        const maxRetries = 20;
        
        const setupInterval = setInterval(() => {
            let setupComplete = true;
            
            if (!overrideSyncManagerEventSync()) {
                setupComplete = false;
            }
            
            if (!overrideQueueForSync()) {
                setupComplete = false;
            }
            
            if (!overrideStorageManagerEventSync()) {
                setupComplete = false;
            }
            
            if (setupComplete || retries >= maxRetries) {
                clearInterval(setupInterval);
                
                if (setupComplete) {
                    console.log('✅ Event sync optimization initialized successfully');
                    
                    // Show configuration
                    console.log('📋 Event sync configuration:', {
                        periodicSyncDisabled: EVENT_SYNC_CONFIG.disablePeriodicEventSync,
                        allowedTriggers: EVENT_SYNC_CONFIG.allowedEventSyncTriggers,
                        minInterval: `${EVENT_SYNC_CONFIG.minEventSyncInterval / 1000}s`
                    });
                    
                } else {
                    console.log('⚠️ Event sync optimization partially initialized');
                }
            }
            
            retries++;
        }, 500);
    }
    
    /**
     * Add configuration functions for debugging
     */
    function addConfigurationFunctions() {
        // Enable/disable periodic event sync
        window.setEventSyncEnabled = function(enabled) {
            EVENT_SYNC_CONFIG.disablePeriodicEventSync = !enabled;
            console.log(`📋 Periodic event sync ${enabled ? 'enabled' : 'disabled'}`);
        };
        
        // Set minimum sync interval
        window.setEventSyncInterval = function(seconds) {
            EVENT_SYNC_CONFIG.minEventSyncInterval = seconds * 1000;
            console.log(`📋 Event sync minimum interval set to ${seconds} seconds`);
        };
        
        // Get current configuration
        window.getEventSyncConfig = function() {
            return {
                ...EVENT_SYNC_CONFIG,
                timeSinceLastSync: Date.now() - EVENT_SYNC_CONFIG.lastEventSyncTime
            };
        };
        
        console.log('🔧 Event sync configuration functions added:');
        console.log('  - window.setEventSyncEnabled(true/false)');
        console.log('  - window.setEventSyncInterval(seconds)');
        console.log('  - window.getEventSyncConfig()');
        console.log('  - window.forceEventSync()');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeEventSyncOptimization();
            addConfigurationFunctions();
        });
    } else {
        initializeEventSyncOptimization();
        addConfigurationFunctions();
    }
    
    console.log('🔧 Event sync optimization script loaded');
    
})();