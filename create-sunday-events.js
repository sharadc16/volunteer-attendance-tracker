/**
 * Script to create Regular Class events from Sep 14, 2025 to May 17, 2026
 * Excludes: 11/30, 12/21, 12/28, 02/15, 04/12
 */

async function createSundayEvents() {
    console.log('🗓️ Creating Regular Class events...');
    
    try {
        // Wait for storage manager to be ready
        if (!window.StorageManager || !window.StorageManager.db) {
            console.log('⏳ Waiting for storage manager...');
            await new Promise(resolve => {
                const checkStorage = () => {
                    if (window.StorageManager && window.StorageManager.db) {
                        resolve();
                    } else {
                        setTimeout(checkStorage, 100);
                    }
                };
                checkStorage();
            });
        }
        
        // Define the date range (using local PST timezone)
        // Create dates using year, month, day to avoid timezone conversion
        const startDate = new Date(2025, 8, 14); // September 14, 2025 (Sunday) - month is 0-indexed
        const endDate = new Date(2026, 4, 17);   // May 17, 2026 (Sunday)
        
        // Define exception dates (no events on these dates)
        const exceptionDates = [
            '2025-11-30', // November 30, 2025
            '2025-12-21', // December 21, 2025
            '2025-12-28', // December 28, 2025
            '2026-02-15', // February 15, 2026
            '2026-04-12'  // April 12, 2026
        ];
        
        console.log(`📅 Start Date: ${startDate.toDateString()}`);
        console.log(`📅 End Date: ${endDate.toDateString()}`);
        console.log(`🚫 Exception Dates: ${exceptionDates.join(', ')}`);
        
        // Verify start date is actually a Sunday
        const startDayOfWeek = startDate.getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`🔍 Start date validation: ${startDate.toDateString()} is a ${dayNames[startDayOfWeek]} (day ${startDayOfWeek})`);
        
        if (startDayOfWeek !== 0) {
            console.error(`❌ Start date ${startDate.toDateString()} is not a Sunday! It's a ${dayNames[startDayOfWeek]} (day ${startDayOfWeek})`);
            throw new Error(`Start date must be a Sunday, but ${startDate.toDateString()} is a ${dayNames[startDayOfWeek]}`);
        }
        
        console.log(`✅ Start date validation passed: ${startDate.toDateString()} is a Sunday`);
        
        // Generate all Sunday dates
        const events = [];
        let currentDate = new Date(startDate);
        let totalSundays = 0;
        let createdEvents = 0;
        let skippedEvents = 0;
        
        while (currentDate <= endDate) {
            totalSundays++;
            const dateString = currentDate.toISOString().split('T')[0];
            
            // Check if this date should be skipped
            if (exceptionDates.includes(dateString)) {
                console.log(`⏭️ Skipping ${dateString} (exception date)`);
                skippedEvents++;
            } else {
                // Create event for this Sunday
                const eventId = `E${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
                
                const event = {
                    eventId: eventId,
                    eventName: 'Regular Class',
                    date: dateString,
                    type: 'Recurring',
                    status: 'Active',
                    recurringPattern: 'Weekly',
                    dayOfWeek: 'Sunday',
                    description: 'Weekly Regular Class - Volunteer Attendance Tracking'
                };
                
                events.push(event);
                createdEvents++;
            }
            
            // Move to next Sunday (add 7 days)
            currentDate.setDate(currentDate.getDate() + 7);
        }
        
        console.log(`📊 Summary:`);
        console.log(`   Total Sundays in range: ${totalSundays}`);
        console.log(`   Events to create: ${createdEvents}`);
        console.log(`   Skipped (exceptions): ${skippedEvents}`);
        
        // Create all events in the database
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const event of events) {
            try {
                await window.StorageManager.addEvent(event);
                successCount++;
                console.log(`✅ Created: ${event.eventName} on ${event.date}`);
            } catch (error) {
                errorCount++;
                const errorMsg = `❌ Failed to create event for ${event.date}: ${error.message}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }
        
        // Final summary
        console.log(`\n🎉 Event Creation Complete!`);
        console.log(`✅ Successfully created: ${successCount} events`);
        console.log(`❌ Failed to create: ${errorCount} events`);
        
        if (errors.length > 0) {
            console.log(`\n⚠️ Errors encountered:`);
            errors.forEach(error => console.log(error));
        }
        
        // Show first few and last few events created
        if (successCount > 0) {
            console.log(`\n📋 Sample Events Created:`);
            const sampleEvents = events.slice(0, 3).concat(events.slice(-3));
            sampleEvents.forEach(event => {
                console.log(`   ${event.date} - ${event.eventName}`);
            });
        }
        
        // Refresh the events view if the app is available
        if (window.app && typeof window.app.updateEventsView === 'function') {
            console.log('🔄 Refreshing events view...');
            await window.app.updateEventsView();
        }
        
        return {
            totalSundays,
            createdEvents: successCount,
            skippedEvents,
            errorCount,
            errors
        };
        
    } catch (error) {
        console.error('💥 Fatal error creating Sunday events:', error);
        throw error;
    }
}

// Function to verify the created events
async function verifySundayEvents() {
    console.log('🔍 Verifying created Regular Class events...');
    
    try {
        const allEvents = await window.StorageManager.getAllEvents();
        const sundayEvents = allEvents.filter(event => 
            event.eventName === 'Regular Class' && 
            event.dayOfWeek === 'Sunday'
        );
        
        // Sort by date
        sundayEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        console.log(`📊 Found ${sundayEvents.length} Regular Class events`);
        
        if (sundayEvents.length > 0) {
            console.log(`📅 Date range: ${sundayEvents[0].date} to ${sundayEvents[sundayEvents.length - 1].date}`);
            
            // Check for any events on exception dates
            const exceptionDates = ['2025-11-30', '2025-12-21', '2025-12-28', '2026-02-15', '2026-04-12'];
            const eventsOnExceptionDates = sundayEvents.filter(event => 
                exceptionDates.includes(event.date)
            );
            
            if (eventsOnExceptionDates.length > 0) {
                console.log(`⚠️ WARNING: Found ${eventsOnExceptionDates.length} events on exception dates:`);
                eventsOnExceptionDates.forEach(event => {
                    console.log(`   ${event.date} - ${event.eventName}`);
                });
            } else {
                console.log(`✅ No events found on exception dates - correct!`);
            }
        }
        
        return sundayEvents;
        
    } catch (error) {
        console.error('❌ Error verifying events:', error);
        throw error;
    }
}

// Function to clean up Sunday events (for testing)
async function cleanupSundayEvents() {
    console.log('🧹 Cleaning up Regular Class events...');
    
    try {
        const allEvents = await window.StorageManager.getAllEvents();
        const sundayEvents = allEvents.filter(event => 
            event.eventName === 'Regular Class' && 
            event.dayOfWeek === 'Sunday'
        );
        
        let deletedCount = 0;
        for (const event of sundayEvents) {
            try {
                await window.StorageManager.deleteEvent(event.eventId);
                deletedCount++;
                console.log(`🗑️ Deleted: ${event.eventName} on ${event.date}`);
            } catch (error) {
                console.error(`❌ Failed to delete event ${event.eventId}:`, error);
            }
        }
        
        console.log(`✅ Cleanup complete: Deleted ${deletedCount} Regular Class events`);
        
        // Refresh the events view
        if (window.app && typeof window.app.updateEventsView === 'function') {
            await window.app.updateEventsView();
        }
        
        return deletedCount;
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// Auto-run when script is loaded (with delay to ensure page is ready)
if (typeof window !== 'undefined') {
    console.log('📝 Sunday Events Script Loaded');
    console.log('🚀 Run createSundayEvents() to create all Regular Class events');
    console.log('🔍 Run verifySundayEvents() to verify created events');
    console.log('🧹 Run cleanupSundayEvents() to remove all Regular Class events');
    
    // Optionally auto-create events after a delay
    // setTimeout(() => {
    //     createSundayEvents().then(result => {
    //         console.log('✅ Auto-creation completed:', result);
    //     }).catch(error => {
    //         console.error('❌ Auto-creation failed:', error);
    //     });
    // }, 3000);
}

// Export functions for manual use
window.createSundayEvents = createSundayEvents;
window.verifySundayEvents = verifySundayEvents;
window.cleanupSundayEvents = cleanupSundayEvents;