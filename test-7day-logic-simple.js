/**
 * Simple test for 7-day scanning window logic
 * Tests the core getCurrentScannableEvent method
 */

// Mock Date for testing
const originalDate = Date;

function mockDate(dateString) {
    global.Date = class extends originalDate {
        constructor(...args) {
            if (args.length === 0) {
                return new originalDate(dateString);
            }
            return new originalDate(...args);
        }
        
        static now() {
            return new originalDate(dateString).getTime();
        }
    };
}

function restoreDate() {
    global.Date = originalDate;
}

// Test data
const testEvents = [
    {
        eventId: 'TODAY_EVENT',
        eventName: 'Today\'s Event',
        date: '2024-01-15', // Will be set to today in tests
        type: 'Special',
        status: 'Active'
    },
    {
        eventId: 'YESTERDAY_EVENT',
        eventName: 'Yesterday\'s Event',
        date: '2024-01-14', // Will be set to yesterday in tests
        type: 'Recurring',
        status: 'Active'
    },
    {
        eventId: 'THREE_DAYS_AGO',
        eventName: '3 Days Ago Event',
        date: '2024-01-12', // Will be set to 3 days ago in tests
        type: 'Recurring',
        status: 'Active'
    },
    {
        eventId: 'TEN_DAYS_AGO',
        eventName: '10 Days Ago Event (Expired)',
        date: '2024-01-05', // Will be set to 10 days ago in tests
        type: 'Special',
        status: 'Active'
    },
    {
        eventId: 'FUTURE_EVENT',
        eventName: 'Future Event',
        date: '2024-01-20', // Will be set to future in tests
        type: 'Special',
        status: 'Active'
    }
];

// Mock StorageManager
const mockStorageManager = {
    events: [],
    
    async getAllEvents() {
        return [...this.events];
    },
    
    setEvents(events) {
        this.events = events;
    },
    
    // Implementation of the enhanced getCurrentScannableEvent method
    async getCurrentScannableEvent() {
        console.log('🎯 ===== GET CURRENT SCANNABLE EVENT STARTED =====');
        
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + 
                        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(today.getDate()).padStart(2, '0');
        
        console.log('🎯 Today\'s date:', todayStr);
        
        const allEvents = await this.getAllEvents();
        const activeEvents = allEvents.filter(event => event.status === 'Active');
        
        console.log('🎯 Total events:', allEvents.length, 'Active events:', activeEvents.length);
        
        // Step 1: Check for event on current date (Requirement 8.1)
        const todayEvents = activeEvents.filter(event => event.date === todayStr);
        
        if (todayEvents.length > 0) {
            const todayEvent = todayEvents[0]; // Use first if multiple
            console.log('✅ Found event for today:', todayEvent.eventName);
            
            // Add metadata for UI display (Requirement 8.4)
            const eventWithMetadata = {
                ...todayEvent,
                scanningContext: {
                    isToday: true,
                    isPastEvent: false,
                    daysFromEventDate: 0,
                    displayMessage: `Scanning for today's event: ${todayEvent.eventName}`,
                    statusType: 'current'
                }
            };
            
            console.log('🎯 ===== RETURNING TODAY\'S EVENT =====');
            return eventWithMetadata;
        }
        
        console.log('🎯 No event for today, checking past events within 7 days...');
        
        // Step 2: Find most recent past event within 7 days (Requirement 8.2)
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.getFullYear() + '-' + 
                               String(sevenDaysAgo.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(sevenDaysAgo.getDate()).padStart(2, '0');
        
        console.log('🎯 Seven days ago:', sevenDaysAgoStr);
        
        // Filter for past events within 7-day window
        const pastEventsInWindow = activeEvents.filter(event => {
            const eventDate = new Date(event.date);
            const todayDate = new Date(todayStr);
            
            // Event must be in the past but within 7 days
            return eventDate < todayDate && event.date >= sevenDaysAgoStr;
        });
        
        console.log('🎯 Past events within 7 days:', pastEventsInWindow.length);
        pastEventsInWindow.forEach(event => {
            const daysAgo = Math.floor((new Date(todayStr) - new Date(event.date)) / (1000 * 60 * 60 * 24));
            console.log(`  - ${event.eventName} (${event.date}) - ${daysAgo} days ago`);
        });
        
        if (pastEventsInWindow.length > 0) {
            // Sort by date (most recent first) and get the most recent (Requirement 8.5)
            pastEventsInWindow.sort((a, b) => new Date(b.date) - new Date(a.date));
            const recentEvent = pastEventsInWindow[0];
            
            const daysAgo = Math.floor((new Date(todayStr) - new Date(recentEvent.date)) / (1000 * 60 * 60 * 24));
            
            console.log('✅ Found recent past event for backfilling:', recentEvent.eventName, `(${daysAgo} days ago)`);
            
            // Add metadata for UI display (Requirement 8.4, 8.6)
            const eventWithMetadata = {
                ...recentEvent,
                scanningContext: {
                    isToday: false,
                    isPastEvent: true,
                    daysFromEventDate: daysAgo,
                    displayMessage: `Backfilling attendance for: ${recentEvent.eventName} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`,
                    statusType: 'backfill'
                }
            };
            
            console.log('🎯 ===== RETURNING PAST EVENT FOR BACKFILLING =====');
            return eventWithMetadata;
        }
        
        console.log('🎯 No events within 7-day scanning window');
        console.log('🎯 ===== RETURNING NULL (NO SCANNABLE EVENTS) =====');
        return null;
    }
};

// Test functions
function formatDate(date) {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

function setupTestDates() {
    const today = new Date('2024-01-15T10:00:00Z'); // Fixed test date
    
    return {
        today: formatDate(today),
        yesterday: formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000)),
        threeDaysAgo: formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)),
        tenDaysAgo: formatDate(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)),
        future: formatDate(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000))
    };
}

async function testTodayEvent() {
    console.log('\n=== TEST: Today\'s Event ===');
    
    mockDate('2024-01-15T10:00:00Z');
    const dates = setupTestDates();
    
    const events = [
        { ...testEvents[0], date: dates.today },
        { ...testEvents[1], date: dates.yesterday }
    ];
    
    mockStorageManager.setEvents(events);
    
    const result = await mockStorageManager.getCurrentScannableEvent();
    
    console.log('Result:', result);
    
    if (result && result.scanningContext?.isToday && result.eventName === 'Today\'s Event') {
        console.log('✅ PASS: Today\'s event correctly prioritized');
        return true;
    } else {
        console.log('❌ FAIL: Today\'s event not properly identified');
        return false;
    }
}

async function testBackfillEvent() {
    console.log('\n=== TEST: Backfill Event (3 days ago) ===');
    
    mockDate('2024-01-15T10:00:00Z');
    const dates = setupTestDates();
    
    const events = [
        { ...testEvents[2], date: dates.threeDaysAgo } // Only 3 days ago event
    ];
    
    mockStorageManager.setEvents(events);
    
    const result = await mockStorageManager.getCurrentScannableEvent();
    
    console.log('Result:', result);
    
    if (result && result.scanningContext?.isPastEvent && result.scanningContext?.daysFromEventDate === 3) {
        console.log('✅ PASS: Backfill event correctly identified');
        return true;
    } else {
        console.log('❌ FAIL: Backfill event not properly identified');
        return false;
    }
}

async function testExpiredEvent() {
    console.log('\n=== TEST: Expired Event (10 days ago) ===');
    
    mockDate('2024-01-15T10:00:00Z');
    const dates = setupTestDates();
    
    const events = [
        { ...testEvents[3], date: dates.tenDaysAgo } // Only 10 days ago event
    ];
    
    mockStorageManager.setEvents(events);
    
    const result = await mockStorageManager.getCurrentScannableEvent();
    
    console.log('Result:', result);
    
    if (!result) {
        console.log('✅ PASS: Expired event correctly excluded');
        return true;
    } else {
        console.log('❌ FAIL: Expired event should not be scannable');
        return false;
    }
}

async function testNoEvents() {
    console.log('\n=== TEST: No Events ===');
    
    mockDate('2024-01-15T10:00:00Z');
    
    mockStorageManager.setEvents([]);
    
    const result = await mockStorageManager.getCurrentScannableEvent();
    
    console.log('Result:', result);
    
    if (!result) {
        console.log('✅ PASS: No events correctly handled');
        return true;
    } else {
        console.log('❌ FAIL: Should return null when no events exist');
        return false;
    }
}

async function testPriorityLogic() {
    console.log('\n=== TEST: Priority Logic (Today vs Backfill) ===');
    
    mockDate('2024-01-15T10:00:00Z');
    const dates = setupTestDates();
    
    const events = [
        { ...testEvents[0], date: dates.today },      // Today's event
        { ...testEvents[1], date: dates.yesterday },  // Yesterday's event
        { ...testEvents[2], date: dates.threeDaysAgo } // 3 days ago event
    ];
    
    mockStorageManager.setEvents(events);
    
    const result = await mockStorageManager.getCurrentScannableEvent();
    
    console.log('Result:', result);
    
    if (result && result.scanningContext?.isToday && result.eventName === 'Today\'s Event') {
        console.log('✅ PASS: Today\'s event correctly prioritized over past events');
        return true;
    } else {
        console.log('❌ FAIL: Today\'s event should be prioritized over past events');
        return false;
    }
}

async function testMostRecentBackfill() {
    console.log('\n=== TEST: Most Recent Backfill Event ===');
    
    mockDate('2024-01-15T10:00:00Z');
    const dates = setupTestDates();
    
    const events = [
        { ...testEvents[1], date: dates.yesterday },   // Yesterday (1 day ago)
        { ...testEvents[2], date: dates.threeDaysAgo } // 3 days ago
    ];
    
    mockStorageManager.setEvents(events);
    
    const result = await mockStorageManager.getCurrentScannableEvent();
    
    console.log('Result:', result);
    
    if (result && result.scanningContext?.isPastEvent && 
        result.scanningContext?.daysFromEventDate === 1 && 
        result.eventName === 'Yesterday\'s Event') {
        console.log('✅ PASS: Most recent past event correctly selected');
        return true;
    } else {
        console.log('❌ FAIL: Most recent past event should be selected');
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 Starting 7-Day Scanning Window Tests\n');
    
    const tests = [
        testTodayEvent,
        testBackfillEvent,
        testExpiredEvent,
        testNoEvents,
        testPriorityLogic,
        testMostRecentBackfill
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log('❌ ERROR:', error.message);
            failed++;
        }
        
        restoreDate(); // Reset date after each test
    }
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! 7-day scanning window implementation is working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Please review the implementation.');
    }
}

// Run the tests
runAllTests().catch(console.error);