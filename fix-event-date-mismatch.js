// 🔧 Event Date Mismatch Fix
// This script fixes the event ID/date inconsistency and prevents future issues

console.log('🔧 ===== EVENT DATE MISMATCH FIX =====');

// Function to analyze event date mismatches
async function analyzeEventMismatches() {
    console.log('🔍 Analyzing event date mismatches...');

    if (!window.StorageManager) {
        console.log('❌ StorageManager not available');
        return;
    }

    try {
        const allEvents = await window.StorageManager.getAllEvents();
        console.log(`📅 Analyzing ${allEvents.length} events...`);

        const mismatches = [];

        allEvents.forEach(event => {
            // Extract date from event ID (format: EYYYYMMDD)
            const idMatch = event.eventId.match(/^E(\d{4})(\d{2})(\d{2})$/);
            if (idMatch) {
                const [, year, month, day] = idMatch;
                const expectedDate = `${year}-${month}-${day}`;

                if (event.date !== expectedDate) {
                    mismatches.push({
                        eventId: event.eventId,
                        eventName: event.eventName,
                        storedDate: event.date,
                        expectedDate: expectedDate,
                        status: event.status
                    });
                }
            }
        });

        console.log(`🔍 Found ${mismatches.length} date mismatches:`);
        mismatches.forEach(mismatch => {
            console.log(`  - ${mismatch.eventId}: stored="${mismatch.storedDate}" expected="${mismatch.expectedDate}"`);
        });

        return mismatches;

    } catch (error) {
        console.error('❌ Error analyzing events:', error);
        return [];
    }
}

// Function to fix a specific event's date mismatch
async function fixEventMismatch(eventId, correctDate) {
    console.log(`🔧 Fixing event ${eventId} to date ${correctDate}...`);

    try {
        // Get the event
        const event = await window.StorageManager.getEvent(eventId);
        if (!event) {
            console.log(`❌ Event ${eventId} not found`);
            return false;
        }

        console.log(`📅 Current event: ${event.eventName} (${event.date})`);

        // Update the date
        const updatedEvent = {
            ...event,
            date: correctDate
        };

        await window.StorageManager.updateEvent(updatedEvent);
        console.log(`✅ Updated event ${eventId} date to ${correctDate}`);

        return true;

    } catch (error) {
        console.error(`❌ Error fixing event ${eventId}:`, error);
        return false;
    }
}

// Function to create a new event with correct ID for today
async function createTodayEvent() {
    console.log('📅 Creating event for today...');

    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

    const todayEventId = `E${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    console.log(`📅 Today: ${todayStr}, Event ID: ${todayEventId}`);

    // Check if event already exists
    try {
        const existingEvent = await window.StorageManager.getEvent(todayEventId);
        if (existingEvent) {
            console.log('✅ Event for today already exists:', existingEvent.eventName);
            return existingEvent;
        }
    } catch (error) {
        // Event doesn't exist, continue to create
    }

    // Create new event for today
    const newEvent = {
        eventId: todayEventId,
        eventName: `Event for ${today.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        })}`,
        date: todayStr,
        type: 'Regular',
        status: 'Active',
        description: 'Auto-created event for today'
    };

    try {
        await window.StorageManager.addEvent(newEvent);
        console.log('✅ Created new event for today:', newEvent.eventName);
        return newEvent;
    } catch (error) {
        console.error('❌ Error creating today\'s event:', error);
        return null;
    }
}

// Function to fix the specific Sep 8/9 mismatch
async function fixSep8Mismatch() {
    console.log('🔧 Fixing September 8/9 mismatch...');

    try {
        // Get the problematic event
        const event = await window.StorageManager.getEvent('E20250908');
        if (!event) {
            console.log('❌ Event E20250908 not found');
            return false;
        }

        console.log('📅 Found event:', event);

        // Check what the correct date should be based on the name
        if (event.eventName.includes('Sep 8') || event.eventName.includes('Monday')) {
            // Event name suggests Sep 8, so fix the date to match the ID
            console.log('🔧 Event name suggests Sep 8, fixing date to 2025-09-08');
            await fixEventMismatch('E20250908', '2025-09-08');
        } else {
            // Event date is Sep 9, so we need to create a new event with correct ID
            console.log('🔧 Event date is Sep 9, creating new event with correct ID');

            // Create new event with correct ID for Sep 9
            const newEvent = {
                eventId: 'E20250909',
                eventName: event.eventName.replace('Sep 8', 'Sep 9').replace('Monday', 'Tuesday'),
                date: '2025-09-09',
                type: event.type,
                status: event.status,
                description: event.description || 'Corrected event for September 9'
            };

            await window.StorageManager.addEvent(newEvent);
            console.log('✅ Created corrected event for Sep 9');
        }

        return true;

    } catch (error) {
        console.error('❌ Error fixing Sep 8/9 mismatch:', error);
        return false;
    }
}

// Function to run complete fix
async function runCompleteFix() {
    console.log('🔧 ===== RUNNING COMPLETE EVENT DATE FIX =====');

    // Step 1: Analyze all mismatches
    const mismatches = await analyzeEventMismatches();
    console.log(`📊 Initial analysis: ${mismatches.length} mismatches found`);

    // Step 2: Fix the specific Sep 8/9 issue
    await fixSep8Mismatch();

    // Step 3: Create today's event if needed
    await createTodayEvent();

    // Step 4: Re-analyze to confirm fixes
    console.log('🔍 Re-analyzing after fixes...');
    const remainingMismatches = await analyzeEventMismatches();

    if (remainingMismatches.length === 0) {
        console.log('✅ All event date mismatches fixed!');
    } else {
        console.log(`⚠️ ${remainingMismatches.length} mismatches remain`);
    }

    // Step 5: Test scanner after fix
    console.log('🔄 Testing scanner after fix...');
    if (window.scanner && typeof window.scanner.updateScannerStatus === 'function') {
        await window.scanner.updateScannerStatus();

        const scannerInput = document.getElementById('scannerInput');
        if (scannerInput) {
            console.log('📱 Scanner state after fix:', {
                disabled: scannerInput.disabled,
                placeholder: scannerInput.placeholder
            });
        }
    }

    console.log('🔧 ===== COMPLETE FIX FINISHED =====');
    return {
        initialMismatches: mismatches.length,
        remainingMismatches: remainingMismatches.length,
        fixed: mismatches.length - remainingMismatches.length
    };
}

// Function to prevent future mismatches by improving event creation
function patchEventCreation() {
    console.log('🔧 Patching event creation to prevent future mismatches...');

    if (window.StorageManager && window.StorageManager.addEvent) {
        const originalAddEvent = window.StorageManager.addEvent;

        window.StorageManager.addEvent = async function (eventData) {
            // Validate event ID matches date
            const idMatch = eventData.eventId.match(/^E(\d{4})(\d{2})(\d{2})$/);
            if (idMatch) {
                const [, year, month, day] = idMatch;
                const expectedDate = `${year}-${month}-${day}`;

                if (eventData.date !== expectedDate) {
                    console.warn(`⚠️ Event ID/date mismatch detected: ID=${eventData.eventId} Date=${eventData.date}`);
                    console.warn(`⚠️ Expected date: ${expectedDate}`);

                    // Auto-fix the date to match the ID
                    eventData.date = expectedDate;
                    console.log(`🔧 Auto-corrected date to ${expectedDate}`);
                }
            }

            return originalAddEvent.call(this, eventData);
        };

        console.log('✅ Event creation patched to prevent future mismatches');
    }
}

// Make functions globally available
window.analyzeEventMismatches = analyzeEventMismatches;
window.fixEventMismatch = fixEventMismatch;
window.createTodayEvent = createTodayEvent;
window.fixSep8Mismatch = fixSep8Mismatch;
window.runCompleteFix = runCompleteFix;
window.patchEventCreation = patchEventCreation;

console.log('🔧 ===== EVENT DATE FIX FUNCTIONS LOADED =====');
console.log('Available functions:');
console.log('  - analyzeEventMismatches() - Find all date/ID mismatches');
console.log('  - fixSep8Mismatch() - Fix the specific Sep 8/9 issue');
console.log('  - createTodayEvent() - Create event for today');
console.log('  - runCompleteFix() - Run complete fix process');
console.log('  - patchEventCreation() - Prevent future mismatches');
console.log('');
console.log('🚀 Quick start: Run runCompleteFix() to fix all issues');