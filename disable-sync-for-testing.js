/**
 * Disable Google Sheets sync for local testing
 * This prevents sync errors from interfering with the 7-day scanning window testing
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Disabling Google Sheets sync for local testing...');
    
    // Disable sync in storage manager after it initializes
    setTimeout(() => {
        if (window.StorageManager) {
            // Stop any existing sync timer to prevent automatic sync
            if (window.StorageManager.stopSyncTimer) {
                window.StorageManager.stopSyncTimer();
            }
            
            // Override auto-sync method only (keep manual sync working)
            if (window.StorageManager.autoSyncToGoogleSheets) {
                window.StorageManager.autoSyncToGoogleSheets = function() {
                    console.log('🔇 Auto-sync disabled for testing');
                    return Promise.resolve();
                };
            }
            
            // Keep queueForSync and syncPendingData working for manual operations
            console.log('✅ Automatic Google Sheets sync disabled, manual sync operations enabled');
        }
        
        // Disable SyncManager automatic sync timer but keep all sync methods working
        if (window.SyncManager) {
            if (window.SyncManager.stop) {
                window.SyncManager.stop();
            }
            
            // Keep all sync methods working - just stop the automatic timer
            console.log('✅ SyncManager automatic sync timer stopped, all manual sync methods enabled');
        }
        
    }, 2000); // Wait 2 seconds for everything to initialize
    
    // Keep sync buttons visible for manual testing
    setTimeout(() => {
        const googleSyncBtn = document.getElementById('googleSyncBtn');
        if (googleSyncBtn) {
            console.log('✅ Google Sync button kept visible for manual testing');
        }
        
        const forceSyncBtn = document.getElementById('forceSyncBtn');
        if (forceSyncBtn) {
            console.log('✅ Force Sync button kept visible for manual testing');
        }
        
        // Hide sync status indicators
        const syncStatus = document.querySelector('.sync-status');
        if (syncStatus) {
            syncStatus.style.display = 'none';
            console.log('🔇 Hidden sync status');
        }
        
    }, 1000);
});

// Override console errors related to Google Sheets
const originalError = console.error;
console.error = function(...args) {
    const message = args.join(' ');
    
    // Filter out Google Sheets sync errors
    if (message.includes('Google Sheets credentials') || 
        message.includes('sync failed') ||
        message.includes('Batch sync failed')) {
        console.log('🔇 Filtered sync error:', message);
        return;
    }
    
    // Allow other errors through
    originalError.apply(console, args);
};

console.log('🔧 Sync disabling script loaded');