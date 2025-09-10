/**
 * Optimize Volunteer Data Syncing
 * Volunteers are mostly static data, so we only need to sync them:
 * 1. On page load (initial sync)
 * 2. When manually requested (force sync button)
 * 3. When volunteers are created/modified locally
 * 4. When scanning fails to find a volunteer (smart fallback)
 */

(function() {
    'use strict';
    
    console.log('🔧 Loading volunteer sync optimization...');
    
    // Configuration for volunteer sync behavior
    const VOLUNTEER_SYNC_CONFIG = {
        // Disable automatic periodic volunteer syncing
        disablePeriodicVolunteerSync: true,
        
        // Only sync volunteers on these triggers
        allowedVolunteerSyncTriggers: [
            'page-load',
            'manual-force-sync',
            'local-volunteer-created',
            'local-volunteer-modified',
            'local-volunteer-deleted',
            'volunteer-not-found', // Smart fallback when scanning
            'import-volunteers'
        ],
        
        // Minimum time between volunteer syncs (in milliseconds)
        minVolunteerSyncInterval: 10 * 60 * 1000, // 10 minutes
        
        // Track last volunteer sync time
        lastVolunteerSyncTime: 0,
        
        // Track volunteer not found syncs (limit these)
        volunteerNotFoundSyncs: 0,
        maxVolunteerNotFoundSyncs: 3, // Max 3 "not found" syncs per session
        lastVolunteerNotFoundSync: 0
    };
    
    // Store original functions
    let originalSyncVolunteers = null;
    let originalSyncVolunteersFromSheets = null;
    let originalQueueForSyncVolunteers = null;
    
    /**
     * Check if volunteer sync should be allowed
     */
    function shouldAllowVolunteerSync(trigger = 'unknown', volunteerId = null) {
        const now = Date.now();
        const timeSinceLastSync = now - VOLUNTEER_SYNC_CONFIG.lastVolunteerSyncTime;
        
        // Always allow manual force sync
        if (trigger === 'manual-force-sync') {
            console.log('✅ Volunteer sync allowed: manual force sync');
            return true;
        }
        
        // Always allow page load sync
        if (trigger === 'page-load') {
            console.log('✅ Volunteer sync allowed: page load');
            return true;
        }
        
        // Allow local changes to sync immediately
        if (['local-volunteer-created', 'local-volunteer-modified', 'local-volunteer-deleted', 'import-volunteers'].includes(trigger)) {
            console.log(`✅ Volunteer sync allowed: ${trigger}`);
            return true;
        }
        
        // Special handling for "volunteer not found" syncs
        if (trigger === 'volunteer-not-found') {
            const timeSinceLastNotFoundSync = now - VOLUNTEER_SYNC_CONFIG.lastVolunteerNotFoundSync;
            
            // Limit frequency of "not found" syncs
            if (VOLUNTEER_SYNC_CONFIG.volunteerNotFoundSyncs >= VOLUNTEER_SYNC_CONFIG.maxVolunteerNotFoundSyncs) {
                console.log(`🛑 Volunteer sync blocked: too many "not found" syncs (${VOLUNTEER_SYNC_CONFIG.volunteerNotFoundSyncs}/${VOLUNTEER_SYNC_CONFIG.maxVolunteerNotFoundSyncs})`);
                return false;
            }
            
            // Minimum 2 minutes between "not found" syncs
            if (timeSinceLastNotFoundSync < 2 * 60 * 1000) {
                const remainingTime = Math.ceil((2 * 60 * 1000 - timeSinceLastNotFoundSync) / 1000);
                console.log(`🛑 Volunteer sync blocked: too frequent "not found" sync (${remainingTime}s remaining)`);
                return false;
            }
            
            console.log(`✅ Volunteer sync allowed: ${trigger} for ${volunteerId} (${VOLUNTEER_SYNC_CONFIG.volunteerNotFoundSyncs + 1}/${VOLUNTEER_SYNC_CONFIG.maxVolunteerNotFoundSyncs})`);
            VOLUNTEER_SYNC_CONFIG.volunteerNotFoundSyncs++;
            VOLUNTEER_SYNC_CONFIG.lastVolunteerNotFoundSync = now;
            return true;
        }
        
        // Check minimum interval for other syncs
        if (timeSinceLastSync < VOLUNTEER_SYNC_CONFIG.minVolunteerSyncInterval) {
            const remainingTime = Math.ceil((VOLUNTEER_SYNC_CONFIG.minVolunteerSyncInterval - timeSinceLastSync) / 1000);
            console.log(`🛑 Volunteer sync blocked: too frequent (${remainingTime}s remaining)`);
            return false;
        }
        
        console.log(`✅ Volunteer sync allowed: ${trigger} (interval check passed)`);
        return true;
    }
    
    /**
     * Override SyncManager's syncVolunteers method
     */
    function overrideSyncManagerVolunteerSync() {
        if (!window.SyncManager) {
            console.log('⚠️ SyncManager not available yet, will retry...');
            return false;
        }
        
        // Store original method if not already stored
        if (!originalSyncVolunteers && window.SyncManager.syncVolunteers) {
            originalSyncVolunteers = window.SyncManager.syncVolunteers.bind(window.SyncManager);
        }
        
        // Override syncVolunteers method
        window.SyncManager.syncVolunteers = function(items, operation, trigger = 'periodic') {
            if (VOLUNTEER_SYNC_CONFIG.disablePeriodicVolunteerSync && !shouldAllowVolunteerSync(trigger)) {
                console.log('🛑 Volunteer sync skipped due to frequency optimization');
                return Promise.resolve();
            }
            
            // Update last sync time
            VOLUNTEER_SYNC_CONFIG.lastVolunteerSyncTime = Date.now();
            
            console.log(`🔄 Volunteer sync proceeding: ${trigger}`);
            
            // Call original method if it exists
            if (originalSyncVolunteers) {
                return originalSyncVolunteers(items, operation);
            } else {
                console.log('⚠️ Original syncVolunteers method not found');
                return Promise.resolve();
            }
        };
        
        console.log('✅ SyncManager volunteer sync override installed');
        return true;
    }
    
    /**
     * Override SyncManager's queueForSync method to filter volunteers
     */
    function overrideQueueForSyncVolunteers() {
        if (!window.SyncManager) {
            return false;
        }
        
        // Store original method if not already stored
        if (!originalQueueForSyncVolunteers && window.SyncManager.queueForSync) {
            originalQueueForSyncVolunteers = window.SyncManager.queueForSync.bind(window.SyncManager);
        }
        
        // Override queueForSync method
        window.SyncManager.queueForSync = function(operation, storeName, data, priority = 'normal') {
            // Filter out frequent volunteer syncs
            if (storeName === 'volunteers' && VOLUNTEER_SYNC_CONFIG.disablePeriodicVolunteerSync) {
                const trigger = priority === 'high' ? 'local-volunteer-modified' : 'periodic';
                
                if (!shouldAllowVolunteerSync(trigger)) {
                    console.log(`🛑 Volunteer sync queue blocked: ${operation} ${storeName} (${trigger})`);
                    return Promise.resolve('blocked');
                }
            }
            
            // Update last sync time for volunteers
            if (storeName === 'volunteers') {
                VOLUNTEER_SYNC_CONFIG.lastVolunteerSyncTime = Date.now();
            }
            
            // Call original method
            if (originalQueueForSyncVolunteers) {
                return originalQueueForSyncVolunteers(operation, storeName, data, priority);
            } else {
                console.log('⚠️ Original queueForSync method not found');
                return Promise.resolve('no-original');
            }
        };
        
        console.log('✅ SyncManager queueForSync volunteer override installed');
        return true;
    }
    
    /**
     * Override GoogleSheetsService's syncVolunteersFromSheets to add trigger context
     */
    function overrideGoogleSheetsVolunteerSync() {
        if (!window.GoogleSheetsService) {
            return false;
        }
        
        const originalSyncVolunteersFromSheets = window.GoogleSheetsService.syncVolunteersFromSheets;
        if (!originalSyncVolunteersFromSheets) {
            return false;
        }
        
        window.GoogleSheetsService.syncVolunteersFromSheets = function(trigger = 'unknown', volunteerId = null) {
            if (VOLUNTEER_SYNC_CONFIG.disablePeriodicVolunteerSync && !shouldAllowVolunteerSync(trigger, volunteerId)) {
                console.log(`🛑 GoogleSheets volunteer sync blocked: ${trigger}`);
                return Promise.resolve({ success: false, reason: 'blocked-by-optimization' });
            }
            
            // Update last sync time
            VOLUNTEER_SYNC_CONFIG.lastVolunteerSyncTime = Date.now();
            
            console.log(`🔄 GoogleSheets volunteer sync proceeding: ${trigger}${volunteerId ? ` (${volunteerId})` : ''}`);
            return originalSyncVolunteersFromSheets.call(this);
        };
        
        console.log('✅ GoogleSheetsService volunteer sync override installed');
        return true;
    }
    
    /**
     * Override Scanner's volunteer sync for "not found" cases
     */
    function overrideScannerVolunteerSync() {
        if (!window.scanner) {
            return false;
        }
        
        // Find the method that triggers volunteer sync in scanner
        // This is typically in the volunteer lookup process
        const originalMethods = {};
        
        // Override any method that might trigger volunteer sync
        if (window.scanner.findVolunteerWithSync) {
            originalMethods.findVolunteerWithSync = window.scanner.findVolunteerWithSync.bind(window.scanner);
            
            window.scanner.findVolunteerWithSync = async function(volunteerId) {
                console.log(`🔍 Scanner looking for volunteer: ${volunteerId}`);
                
                // Try local lookup first
                let result = await this.getVolunteerFromDirectory(volunteerId);
                
                if (!result && window.GoogleSheetsService) {
                    // Only sync if allowed
                    if (shouldAllowVolunteerSync('volunteer-not-found', volunteerId)) {
                        console.log(`📊 Syncing volunteers from sheets to find ${volunteerId}...`);
                        await window.GoogleSheetsService.syncVolunteersFromSheets('volunteer-not-found', volunteerId);
                        
                        // Try again after sync
                        result = await this.getVolunteerFromDirectory(volunteerId);
                    } else {
                        console.log(`🛑 Skipping volunteer sync for ${volunteerId} due to frequency limits`);
                    }
                }
                
                return result;
            };
        }
        
        console.log('✅ Scanner volunteer sync override installed');
        return true;
    }
    
    /**
     * Add manual force sync function for volunteers
     */
    function addManualVolunteerSyncFunction() {
        window.forceVolunteerSync = async function() {
            console.log('🔧 Manual volunteer sync requested');
            
            try {
                if (window.GoogleSheetsService && window.GoogleSheetsService.syncVolunteersFromSheets) {
                    const result = await window.GoogleSheetsService.syncVolunteersFromSheets('manual-force-sync');
                    console.log('✅ Manual volunteer sync completed:', result);
                    return result;
                } else {
                    console.error('❌ GoogleSheetsService not available for manual volunteer sync');
                    return { success: false, error: 'Service not available' };
                }
            } catch (error) {
                console.error('❌ Manual volunteer sync failed:', error);
                return { success: false, error: error.message };
            }
        };
        
        console.log('✅ Manual volunteer sync function added (window.forceVolunteerSync)');
    }
    
    /**
     * Add volunteer sync controls to the Volunteers page
     */
    function addVolunteerSyncControls() {
        // Wait for DOM to be ready
        const addControls = () => {
            const volunteersView = document.getElementById('volunteersView');
            const viewHeader = volunteersView?.querySelector('.view-header');
            const viewControls = viewHeader?.querySelector('.view-controls');
            
            if (!viewControls) {
                return false;
            }
            
            // Check if controls already exist
            if (document.getElementById('manualVolunteerSyncBtn')) {
                return true;
            }
            
            // Create manual sync button
            const syncButton = document.createElement('button');
            syncButton.id = 'manualVolunteerSyncBtn';
            syncButton.className = 'btn btn-secondary';
            syncButton.innerHTML = '🔄 Sync Volunteers';
            syncButton.title = 'Manually sync volunteers from Google Sheets';
            
            syncButton.addEventListener('click', async () => {
                syncButton.disabled = true;
                syncButton.innerHTML = '🔄 Syncing...';
                
                try {
                    const result = await window.forceVolunteerSync();
                    
                    if (result && result.success !== false) {
                        // Refresh volunteers view
                        if (window.app && window.app.updateVolunteersView) {
                            await window.app.updateVolunteersView();
                        }
                        
                        syncButton.innerHTML = '✅ Synced';
                        setTimeout(() => {
                            syncButton.innerHTML = '🔄 Sync Volunteers';
                            syncButton.disabled = false;
                        }, 2000);
                    } else {
                        throw new Error(result?.error || 'Sync failed');
                    }
                    
                } catch (error) {
                    console.error('Manual volunteer sync failed:', error);
                    syncButton.innerHTML = '❌ Failed';
                    setTimeout(() => {
                        syncButton.innerHTML = '🔄 Sync Volunteers';
                        syncButton.disabled = false;
                    }, 3000);
                }
            });
            
            // Add to view controls (before the search input)
            const searchInput = viewControls.querySelector('#volunteerSearch');
            if (searchInput) {
                viewControls.insertBefore(syncButton, searchInput);
            } else {
                viewControls.insertBefore(syncButton, viewControls.firstChild);
            }
            
            console.log('✅ Manual volunteer sync button added to Volunteers page');
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
        
        // Also add when volunteers view becomes active
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-view="volunteers"]')) {
                setTimeout(addControls, 100);
            }
        });
    }
    
    /**
     * Hook into volunteer creation/modification to trigger immediate sync
     */
    function hookVolunteerChanges() {
        // Override StorageManager methods for volunteers
        if (window.StorageManager) {
            const originalAddVolunteer = window.StorageManager.addVolunteer;
            const originalUpdateVolunteer = window.StorageManager.updateVolunteer;
            const originalDeleteVolunteer = window.StorageManager.deleteVolunteer;
            
            if (originalAddVolunteer) {
                window.StorageManager.addVolunteer = async function(volunteer) {
                    const result = await originalAddVolunteer.call(this, volunteer);
                    
                    // Trigger immediate sync for local changes
                    if (window.SyncManager && window.SyncManager.queueForSync) {
                        await window.SyncManager.queueForSync('create', 'volunteers', volunteer, 'high');
                    }
                    
                    return result;
                };
            }
            
            if (originalUpdateVolunteer) {
                window.StorageManager.updateVolunteer = async function(volunteer) {
                    const result = await originalUpdateVolunteer.call(this, volunteer);
                    
                    // Trigger immediate sync for local changes
                    if (window.SyncManager && window.SyncManager.queueForSync) {
                        await window.SyncManager.queueForSync('update', 'volunteers', volunteer, 'high');
                    }
                    
                    return result;
                };
            }
            
            if (originalDeleteVolunteer) {
                window.StorageManager.deleteVolunteer = async function(volunteerId) {
                    const volunteer = await this.getVolunteer(volunteerId);
                    const result = await originalDeleteVolunteer.call(this, volunteerId);
                    
                    // Trigger immediate sync for local changes
                    if (volunteer && window.SyncManager && window.SyncManager.queueForSync) {
                        await window.SyncManager.queueForSync('delete', 'volunteers', volunteer, 'high');
                    }
                    
                    return result;
                };
            }
            
            console.log('✅ Volunteer change hooks installed');
        }
    }
    
    /**
     * Initialize the volunteer sync optimization
     */
    async function initializeVolunteerSyncOptimization() {
        console.log('🚀 Initializing volunteer sync optimization...');
        
        // Add manual sync function
        addManualVolunteerSyncFunction();
        
        // Add UI controls
        addVolunteerSyncControls();
        
        // Hook volunteer changes
        setTimeout(hookVolunteerChanges, 1000);
        
        // Wait for managers to be ready and override their methods
        let retries = 0;
        const maxRetries = 20;
        
        const setupInterval = setInterval(() => {
            let setupComplete = true;
            
            if (!overrideSyncManagerVolunteerSync()) {
                setupComplete = false;
            }
            
            if (!overrideQueueForSyncVolunteers()) {
                setupComplete = false;
            }
            
            if (!overrideGoogleSheetsVolunteerSync()) {
                setupComplete = false;
            }
            
            if (!overrideScannerVolunteerSync()) {
                setupComplete = false;
            }
            
            if (setupComplete || retries >= maxRetries) {
                clearInterval(setupInterval);
                
                if (setupComplete) {
                    console.log('✅ Volunteer sync optimization initialized successfully');
                    
                    // Show configuration
                    console.log('📋 Volunteer sync configuration:', {
                        periodicSyncDisabled: VOLUNTEER_SYNC_CONFIG.disablePeriodicVolunteerSync,
                        allowedTriggers: VOLUNTEER_SYNC_CONFIG.allowedVolunteerSyncTriggers,
                        minInterval: `${VOLUNTEER_SYNC_CONFIG.minVolunteerSyncInterval / 1000}s`,
                        maxNotFoundSyncs: VOLUNTEER_SYNC_CONFIG.maxVolunteerNotFoundSyncs
                    });
                    
                } else {
                    console.log('⚠️ Volunteer sync optimization partially initialized');
                }
            }
            
            retries++;
        }, 500);
    }
    
    /**
     * Add configuration functions for debugging
     */
    function addVolunteerConfigurationFunctions() {
        // Enable/disable periodic volunteer sync
        window.setVolunteerSyncEnabled = function(enabled) {
            VOLUNTEER_SYNC_CONFIG.disablePeriodicVolunteerSync = !enabled;
            console.log(`📋 Periodic volunteer sync ${enabled ? 'enabled' : 'disabled'}`);
        };
        
        // Set minimum sync interval
        window.setVolunteerSyncInterval = function(seconds) {
            VOLUNTEER_SYNC_CONFIG.minVolunteerSyncInterval = seconds * 1000;
            console.log(`📋 Volunteer sync minimum interval set to ${seconds} seconds`);
        };
        
        // Reset "not found" sync counter
        window.resetVolunteerNotFoundCounter = function() {
            VOLUNTEER_SYNC_CONFIG.volunteerNotFoundSyncs = 0;
            VOLUNTEER_SYNC_CONFIG.lastVolunteerNotFoundSync = 0;
            console.log('📋 Volunteer "not found" sync counter reset');
        };
        
        // Get current configuration
        window.getVolunteerSyncConfig = function() {
            return {
                ...VOLUNTEER_SYNC_CONFIG,
                timeSinceLastSync: Date.now() - VOLUNTEER_SYNC_CONFIG.lastVolunteerSyncTime,
                timeSinceLastNotFoundSync: Date.now() - VOLUNTEER_SYNC_CONFIG.lastVolunteerNotFoundSync
            };
        };
        
        console.log('🔧 Volunteer sync configuration functions added:');
        console.log('  - window.setVolunteerSyncEnabled(true/false)');
        console.log('  - window.setVolunteerSyncInterval(seconds)');
        console.log('  - window.resetVolunteerNotFoundCounter()');
        console.log('  - window.getVolunteerSyncConfig()');
        console.log('  - window.forceVolunteerSync()');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeVolunteerSyncOptimization();
            addVolunteerConfigurationFunctions();
        });
    } else {
        initializeVolunteerSyncOptimization();
        addVolunteerConfigurationFunctions();
    }
    
    console.log('🔧 Volunteer sync optimization script loaded');
    
})();