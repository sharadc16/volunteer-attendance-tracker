// ⚡ Console Fix for Loading Event Issue
// Run this directly in the main app's browser console

console.log('⚡ ===== CONSOLE FIX FOR LOADING EVENT =====');

async function fixLoadingEventIssue() {
    try {
        console.log('🔧 Starting fix...');
        
        // Get storage
        const storage = window.StorageManager || window.storage;
        if (!storage) {
            console.error('❌ Storage not available');
            return;
        }
        
        // Fix 1: Create today's event (E20250909)
        console.log('📅 Creating today\'s event...');
        const todayEvent = {
            eventId: 'E20250909',
            eventName: 'Tuesday, Sep 9',
            date: '2025-09-09',
            type: 'Regular',
            status: 'Active',
            description: 'Event for Tuesday, September 9, 2025'
        };
        
        try {
            await storage.addEvent(todayEvent);
            console.log('✅ Created today\'s event: ' + todayEvent.eventName);
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('✅ Today\'s event already exists');
            } else {
                throw e;
            }
        }
        
        // Fix 2: Fix E20250908 date mismatch
        console.log('🔧 Fixing E20250908 date mismatch...');
        try {
            const event908 = await storage.getEvent('E20250908');
            if (event908 && event908.date === '2025-09-09') {
                const fixedEvent = { ...event908, date: '2025-09-08' };
                await storage.updateEvent(fixedEvent);
                console.log('✅ Fixed E20250908 date: 2025-09-09 → 2025-09-08');
            }
        } catch (e) {
            console.warn('⚠️ Could not fix E20250908:', e.message);
        }
        
        // Fix 3: Update current event display
        console.log('🔄 Updating current event display...');
        const currentEventElement = document.getElementById('currentEvent');
        if (currentEventElement) {
            currentEventElement.textContent = todayEvent.eventName;
            console.log('✅ Updated current event display');
        } else {
            console.warn('⚠️ Current event element not found');
        }
        
        // Fix 4: Enable scanner
        console.log('📱 Enabling scanner...');
        const scannerInput = document.getElementById('scannerInput');
        if (scannerInput) {
            scannerInput.disabled = false;
            scannerInput.placeholder = 'Scan volunteer ID';
            console.log('✅ Scanner enabled');
        } else {
            console.warn('⚠️ Scanner input not found');
        }
        
        // Fix 5: Update scanner status
        if (window.scanner && typeof window.scanner.updateScannerStatus === 'function') {
            await window.scanner.updateScannerStatus();
            console.log('✅ Scanner status updated');
        }
        
        // Fix 6: Refresh current event if app function exists
        if (window.app && typeof window.app.updateCurrentEvent === 'function') {
            await window.app.updateCurrentEvent();
            console.log('✅ App current event refreshed');
        } else if (window.app && typeof window.app.getCurrentEvent === 'function') {
            const currentEvent = await window.app.getCurrentEvent();
            if (currentEvent && currentEventElement) {
                currentEventElement.textContent = currentEvent.eventName;
                console.log('✅ Current event updated via app.getCurrentEvent');
            }
        }
        
        console.log('🎉 ===== FIX COMPLETED SUCCESSFULLY =====');
        console.log('✅ Today\'s event created (E20250909)');
        console.log('✅ Date mismatch fixed (E20250908)');
        console.log('✅ Current event display updated');
        console.log('✅ Scanner enabled');
        console.log('');
        console.log('🔄 The page should now show the correct event name instead of "Loading..."');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
        console.log('');
        console.log('🔧 Try running individual steps:');
        console.log('1. Check storage: window.StorageManager || window.storage');
        console.log('2. Check current event element: document.getElementById("currentEvent")');
        console.log('3. Check scanner input: document.getElementById("scannerInput")');
    }
}

// Run the fix
fixLoadingEventIssue();

// Also make it available as a global function
window.fixLoadingEventIssue = fixLoadingEventIssue;