/**
 * Create Sunday Events for 2025-2026 School Year
 * Creates events for each Sunday from Sep 7, 2025 to May 16, 2026
 * Excludes certain holidays and breaks
 */

class SundayEventCreator {
    constructor() {
        this.events = [];
        this.excludedDates = [
            '2025-11-30', // Thanksgiving weekend
            '2025-12-21', // Winter break start
            '2025-12-28', // Winter break
            '2026-02-15', // Presidents Day weekend
            '2026-04-12'  // Easter/Spring break
        ];
        
        this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }

    /**
     * Generate all Sunday events from Sep 7, 2025 to May 16, 2026
     */
    generateEvents() {
        const startDate = new Date('2025-09-07'); // First Sunday
        const endDate = new Date('2026-05-16');   // Last Sunday
        
        console.log(`Generating Sunday events from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        
        let currentDate = new Date(startDate);
        let eventCount = 0;
        
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            
            // Check if this date should be excluded
            if (!this.excludedDates.includes(dateString)) {
                const event = this.createSundayEvent(currentDate);
                this.events.push(event);
                eventCount++;
                console.log(`Created event ${eventCount}: ${event.eventName} (${event.date})`);
            } else {
                console.log(`Skipped excluded date: ${dateString}`);
            }
            
            // Move to next Sunday (add 7 days)
            currentDate.setDate(currentDate.getDate() + 7);
        }
        
        console.log(`Generated ${this.events.length} Sunday events`);
        return this.events;
    }

    /**
     * Create a single Sunday event
     */
    createSundayEvent(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const monthName = this.monthNames[date.getMonth()];
        
        return {
            eventId: `E${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`,
            eventName: `Sunday, ${monthName} ${day}`,
            date: date.toISOString().split('T')[0],
            type: 'Recurring',
            status: 'Active',
            dayOfWeek: 'Sunday',
            recurringPattern: 'Weekly',
            description: 'Regular Sunday class session'
        };
    }

    /**
     * Save events to storage
     */
    async saveEvents() {
        if (!window.StorageManager) {
            throw new Error('StorageManager not available');
        }

        let savedCount = 0;
        let skippedCount = 0;
        const errors = [];

        for (const event of this.events) {
            try {
                // Check if event already exists
                const existing = await window.StorageManager.getEvent(event.eventId);
                if (existing) {
                    console.log(`Event ${event.eventId} already exists, skipping`);
                    skippedCount++;
                    continue;
                }

                // Save the event
                await window.StorageManager.addEvent(event);
                savedCount++;
                console.log(`Saved event: ${event.eventName}`);

            } catch (error) {
                console.error(`Failed to save event ${event.eventId}:`, error);
                errors.push(`${event.eventId}: ${error.message}`);
            }
        }

        return {
            total: this.events.length,
            saved: savedCount,
            skipped: skippedCount,
            errors: errors
        };
    }

    /**
     * Get events summary by month
     */
    getEventsSummary() {
        const summary = {};
        
        this.events.forEach(event => {
            const date = new Date(event.date);
            const monthYear = `${this.monthNames[date.getMonth()]} ${date.getFullYear()}`;
            
            if (!summary[monthYear]) {
                summary[monthYear] = [];
            }
            
            summary[monthYear].push({
                date: event.date,
                name: event.eventName
            });
        });

        return summary;
    }

    /**
     * Export events as JSON
     */
    exportAsJSON() {
        return JSON.stringify(this.events, null, 2);
    }

    /**
     * Export events as CSV
     */
    exportAsCSV() {
        const headers = ['Event ID', 'Event Name', 'Date', 'Day of Week', 'Type', 'Status', 'Description'];
        const rows = this.events.map(event => [
            event.eventId,
            event.eventName,
            event.date,
            event.dayOfWeek,
            event.type,
            event.status,
            event.description || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }
}

// Global function to create and save Sunday events
async function createSundayEvents() {
    try {
        console.log('Starting Sunday events creation...');
        
        const creator = new SundayEventCreator();
        const events = creator.generateEvents();
        
        console.log('\nEvents Summary by Month:');
        const summary = creator.getEventsSummary();
        Object.entries(summary).forEach(([month, events]) => {
            console.log(`\n${month}: ${events.length} events`);
            events.forEach(event => {
                console.log(`  - ${event.name} (${event.date})`);
            });
        });

        // Save to storage if available
        if (window.StorageManager) {
            console.log('\nSaving events to storage...');
            const result = await creator.saveEvents();
            
            console.log('\nSave Results:');
            console.log(`Total events: ${result.total}`);
            console.log(`Saved: ${result.saved}`);
            console.log(`Skipped (already exist): ${result.skipped}`);
            console.log(`Errors: ${result.errors.length}`);
            
            if (result.errors.length > 0) {
                console.log('\nErrors:');
                result.errors.forEach(error => console.log(`  - ${error}`));
            }

            return result;
        } else {
            console.log('StorageManager not available, events generated but not saved');
            return { events: events, saved: false };
        }

    } catch (error) {
        console.error('Failed to create Sunday events:', error);
        throw error;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SundayEventCreator, createSundayEvents };
}

// Make available globally
window.SundayEventCreator = SundayEventCreator;
window.createSundayEvents = createSundayEvents;