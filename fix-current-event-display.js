/**
 * Fix for current event display functionality
 * This script provides a working updateCurrentEvent function
 */

// Wait for DOM and storage to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔧 Current event display fix loaded');
    
    // Wait for storage manager to be ready
    await waitForStorageManager();
    
    // Set up the current event update function
    setupCurrentEventUpdater();
    
    // Update current event display immediately
    updateCurrentEventDisplay();
    
    // Set up periodic updates
    setInterval(updateCurrentEventDisplay, 30000); // Update every 30 seconds
});

async function waitForStorageManager() {
    let attempts = 0;
    while (!window.StorageManager || !window.StorageManager.db) {
        if (attempts > 100) {
            console.error('Storage manager failed to initialize');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    console.log('✅ Storage manager ready');
}

function setupCurrentEventUpdater() {
    // Add the function to window for global access
    window.updateCurrentEventDisplay = updateCurrentEventDisplay;
    
    // If there's an existing app instance, add the method
    if (window.app && typeof window.app === 'object') {
        window.app.updateCurrentEvent = updateCurrentEventDisplay;
    }
}

/**
 * Update current event display with enhanced 7-day scanning window feedback
 */
async function updateCurrentEventDisplay() {
    const currentEventEl = document.getElementById('currentEvent');
    if (!currentEventEl) {
        console.log('Current event element not found');
        return;
    }

    try {
        console.log('🔄 Updating current event display...');
        
        // Get the current scannable event with enhanced metadata
        const currentScannableEvent = await window.StorageManager.getCurrentScannableEvent();
        
        if (currentScannableEvent) {
            const context = currentScannableEvent.scanningContext;
            
            if (context?.isToday) {
                // Today's event (Requirement 8.1, 8.4)
                currentEventEl.textContent = `📅 Today: ${currentScannableEvent.eventName}`;
                currentEventEl.className = 'current-event active today';
                currentEventEl.title = `Recording attendance for today's event: ${currentScannableEvent.eventName}`;
                console.log('✅ Current event (today):', currentScannableEvent.eventName);
                
            } else if (context?.isPastEvent) {
                // Past event for backfilling (Requirement 8.2, 8.4, 8.6)
                const daysAgo = context.daysFromEventDate;
                currentEventEl.textContent = `🔄 Backfill: ${currentScannableEvent.eventName} (${daysAgo}d ago)`;
                currentEventEl.className = 'current-event active backfill';
                currentEventEl.title = `Manual backfilling for ${currentScannableEvent.eventName} from ${currentScannableEvent.date} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`;
                console.log('✅ Current event (backfill):', currentScannableEvent.eventName, `${daysAgo} days ago`);
                
            } else {
                // Fallback for events without context
                currentEventEl.textContent = `📋 ${currentScannableEvent.eventName}`;
                currentEventEl.className = 'current-event active';
                currentEventEl.title = `Recording attendance for ${currentScannableEvent.eventName}`;
                console.log('✅ Current event (active):', currentScannableEvent.eventName);
            }
            
        } else {
            // No scannable event - get detailed status for better feedback (Requirement 8.3)
            console.log('❌ No scannable event found, checking for detailed status...');
            
            // Get basic event information for status
            const allEvents = await window.StorageManager.getAllEvents();
            const activeEvents = allEvents.filter(event => event.status === 'Active');
            
            if (activeEvents.length === 0) {
                currentEventEl.textContent = '❌ No events created';
                currentEventEl.className = 'current-event inactive no-events';
                currentEventEl.title = 'No events have been created. Contact an administrator.';
                
            } else {
                // Check for future or expired events
                const today = new Date();
                const todayStr = today.getFullYear() + '-' + 
                               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(today.getDate()).padStart(2, '0');
                
                const upcomingEvents = activeEvents.filter(event => new Date(event.date) > new Date(todayStr));
                const pastEvents = activeEvents.filter(event => new Date(event.date) < new Date(todayStr));
                
                if (upcomingEvents.length > 0) {
                    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
                    const nextEvent = upcomingEvents[0];
                    const daysUntil = Math.ceil((new Date(nextEvent.date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                    
                    currentEventEl.textContent = `⏳ Next: ${nextEvent.eventName} (${daysUntil}d)`;
                    currentEventEl.className = 'current-event inactive future';
                    currentEventEl.title = `Next event "${nextEvent.eventName}" is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
                    
                } else if (pastEvents.length > 0) {
                    pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
                    const lastEvent = pastEvents[0];
                    const daysAgo = Math.floor((new Date(todayStr) - new Date(lastEvent.date)) / (1000 * 60 * 60 * 24));
                    
                    currentEventEl.textContent = `⏰ Expired: ${lastEvent.eventName} (${daysAgo}d ago)`;
                    currentEventEl.className = 'current-event inactive expired';
                    currentEventEl.title = `Last event "${lastEvent.eventName}" was ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago (outside 7-day window)`;
                    
                } else {
                    currentEventEl.textContent = '❌ No scannable events';
                    currentEventEl.className = 'current-event inactive';
                    currentEventEl.title = 'No events are currently available for scanning';
                }
            }
        }

        console.log('✅ Current event display updated');

    } catch (error) {
        console.error('❌ Error updating current event:', error);
        currentEventEl.textContent = '⚠️ Error loading event';
        currentEventEl.className = 'current-event error';
        currentEventEl.title = 'Error loading event information. Please refresh the page.';
    }
}

// Export for testing
window.updateCurrentEventDisplay = updateCurrentEventDisplay;