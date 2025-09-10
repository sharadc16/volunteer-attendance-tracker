// Comprehensive fix for events display in main app
// This script fixes the events display issue by ensuring proper event loading

console.log('🔧 Loading events display fix...');

// Fix for events display issue
async function fixEventsDisplay() {
    console.log('📅 Fixing events display...');
    
    try {
        // Ensure StorageManager is available
        if (!window.StorageManager) {
            console.log('❌ StorageManager not available');
            return;
        }
        
        // Get the events list element
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) {
            console.log('❌ eventsList element not found');
            return;
        }
        
        console.log('✅ Found eventsList element');
        
        // Show loading state
        eventsList.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
                    <p>Loading events...</p>
                </div>
            </div>
        `;
        
        // Get all events
        const events = await window.StorageManager.getAllEvents();
        console.log(`📊 Retrieved ${events.length} events`);
        
        if (events.length === 0) {
            eventsList.innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-icon">📅</div>
                        <h3>No Events Found</h3>
                        <p>Events may need to be synced from Google Sheets.</p>
                        <button class="btn btn-primary" onclick="handleGoogleSync()">Sync from Google Sheets</button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Fix any events with undefined names
        let fixedCount = 0;
        for (const event of events) {
            if (!event.eventName || event.eventName === 'undefined') {
                const originalName = event.eventName;
                
                // Generate a name from available data
                if (event.type && event.date) {
                    event.eventName = `${event.type} Event - ${event.date}`;
                } else if (event.date) {
                    event.eventName = `Event - ${event.date}`;
                } else {
                    event.eventName = `Event ${event.eventId || 'Unknown'}`;
                }
                
                try {
                    await window.StorageManager.updateEvent(event.eventId, event);
                    fixedCount++;
                    console.log(`✅ Fixed event name: "${originalName}" → "${event.eventName}"`);
                } catch (error) {
                    console.warn(`⚠️ Failed to update event ${event.eventId}:`, error);
                }
            }
        }
        
        if (fixedCount > 0) {
            console.log(`✅ Fixed ${fixedCount} event names`);
        }
        
        // Separate events into categories
        const today = new Date();
        const todayStr = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');

        const activeEvents = events.filter(event => event.status === 'Active');
        const upcomingEvents = activeEvents.filter(event => event.date >= todayStr);
        const pastEvents = activeEvents.filter(event => event.date < todayStr);

        // Sort events by date
        upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

        let eventsHTML = '';

        // Upcoming Events
        if (upcomingEvents.length > 0) {
            eventsHTML += `
                <div class="card events-section">
                    <div class="section-header">
                        <h3>📅 Upcoming Events</h3>
                        <span class="event-count">${upcomingEvents.length} event(s)</span>
                    </div>
                    <div class="events-grid">
            `;
            
            upcomingEvents.forEach(event => {
                const eventDate = new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                const isToday = event.date === todayStr;
                const statusIcon = isToday ? '🟢' : '📅';
                const typeIcon = event.type === 'Recurring' ? '🔄' : '⭐';
                
                eventsHTML += `
                    <div class="event-card upcoming ${isToday ? 'today' : ''}" data-event-id="${event.eventId}">
                        <div class="event-header">
                            <div class="event-title">
                                <h4>${event.eventName || 'Unnamed Event'}</h4>
                                <div class="event-badges">
                                    <span class="badge status-badge">${statusIcon} ${event.status}</span>
                                    <span class="badge type-badge">${typeIcon} ${event.type}</span>
                                </div>
                            </div>
                        </div>
                        <div class="event-details">
                            <div class="event-date">
                                <span class="date-icon">📅</span>
                                <span class="date-text">${eventDate}</span>
                                ${isToday ? '<span class="today-indicator">Today</span>' : ''}
                            </div>
                            <div class="event-location">
                                <span class="location-icon">📍</span>
                                <span class="location-text">${event.location || 'Location TBD'}</span>
                            </div>
                            <div class="event-committee">
                                <span class="committee-icon">👥</span>
                                <span class="committee-text">${event.committee || 'All Committees'}</span>
                            </div>
                        </div>
                        <div class="event-actions">
                            <button class="btn btn-sm btn-secondary" onclick="editEvent('${event.eventId}')">
                                ✏️ Edit
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="viewEventAttendance('${event.eventId}')">
                                👥 Attendance
                            </button>
                        </div>
                    </div>
                `;
            });
            
            eventsHTML += `
                    </div>
                </div>
            `;
        }

        // Past Events (Limited to last 10)
        if (pastEvents.length > 0) {
            const recentPastEvents = pastEvents.slice(0, 10);
            eventsHTML += `
                <div class="card events-section">
                    <div class="section-header">
                        <h3>📋 Recent Past Events</h3>
                        <span class="event-count">Showing ${recentPastEvents.length} of ${pastEvents.length}</span>
                    </div>
                    <div class="events-grid">
            `;
            
            recentPastEvents.forEach(event => {
                const eventDate = new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                
                eventsHTML += `
                    <div class="event-card past" data-event-id="${event.eventId}">
                        <div class="event-header">
                            <div class="event-title">
                                <h4>${event.eventName || 'Unnamed Event'}</h4>
                                <div class="event-badges">
                                    <span class="badge status-badge">✅ Completed</span>
                                </div>
                            </div>
                        </div>
                        <div class="event-details">
                            <div class="event-date">
                                <span class="date-icon">📅</span>
                                <span class="date-text">${eventDate}</span>
                            </div>
                            <div class="event-committee">
                                <span class="committee-icon">👥</span>
                                <span class="committee-text">${event.committee || 'All Committees'}</span>
                            </div>
                        </div>
                        <div class="event-actions">
                            <button class="btn btn-sm btn-secondary" onclick="viewEventAttendance('${event.eventId}')">
                                📊 View Results
                            </button>
                        </div>
                    </div>
                `;
            });
            
            eventsHTML += `
                    </div>
                </div>
            `;
        }

        // If no active events
        if (upcomingEvents.length === 0 && pastEvents.length === 0) {
            eventsHTML = `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-icon">📅</div>
                        <h3>No Active Events</h3>
                        <p>All events are inactive or there are no events to display.</p>
                        <button class="btn btn-primary" onclick="handleGoogleSync()">Sync from Google Sheets</button>
                    </div>
                </div>
            `;
        }

        // Update the events list
        eventsList.innerHTML = eventsHTML;
        console.log('✅ Events display updated successfully');
        
    } catch (error) {
        console.error('❌ Error fixing events display:', error);
        
        const eventsList = document.getElementById('eventsList');
        if (eventsList) {
            eventsList.innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-icon">❌</div>
                        <h3>Error Loading Events</h3>
                        <p>Failed to load events: ${error.message}</p>
                        <button class="btn btn-secondary" onclick="fixEventsDisplay()">Retry</button>
                    </div>
                </div>
            `;
        }
    }
}

// Global function for Google Sheets sync
window.handleGoogleSync = async function() {
    console.log('📊 Handling Google Sheets sync...');
    
    try {
        if (!window.googleSheetsService) {
            window.googleSheetsService = new GoogleSheetsService();
        }
        
        const service = window.googleSheetsService;
        
        // Ensure authentication
        await service.ensureAuthenticated();
        
        // Sync events from Google Sheets
        if (window.StorageManager && window.StorageManager.syncEventsFromGoogleSheets) {
            await window.StorageManager.syncEventsFromGoogleSheets();
            console.log('✅ Events synced from Google Sheets');
            
            // Refresh the display
            await fixEventsDisplay();
        } else {
            console.log('❌ Sync method not available');
        }
        
    } catch (error) {
        console.error('❌ Google Sheets sync failed:', error);
        alert(`Sync failed: ${error.message}`);
    }
};

// Global functions for event actions
window.editEvent = function(eventId) {
    console.log('✏️ Edit event:', eventId);
    alert(`Edit event functionality would open for event: ${eventId}`);
};

window.viewEventAttendance = function(eventId) {
    console.log('👥 View attendance for event:', eventId);
    alert(`Attendance view would open for event: ${eventId}`);
};

// Make the fix function globally available
window.fixEventsDisplay = fixEventsDisplay;

// Auto-fix when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(fixEventsDisplay, 1000);
    });
} else {
    setTimeout(fixEventsDisplay, 1000);
}

console.log('✅ Events display fix loaded');