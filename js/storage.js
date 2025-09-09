/**
 * Data storage and synchronization for the Volunteer Attendance Tracker
 * Handles local IndexedDB storage and cloud synchronization
 */

class StorageManager {
    constructor() {
        this.dbName = window.Config ? window.Config.database.name : 'VolunteerAttendanceDB';
        this.dbVersion = window.Config ? window.Config.database.version : 1;
        this.db = null;
        this.syncInterval = window.Config ? window.Config.sync.interval : 60000;
        this.syncTimer = null;
        this.isOnline = navigator.onLine;
        this.pendingSync = [];

        this.init();
        this.setupEventListeners();
    }

    /**
     * Initialize the storage manager
     */
    async init() {
        try {
            console.log('Initializing storage manager...');
            await this.initIndexedDB();
            console.log('IndexedDB initialized');
            await this.loadInitialData();
            console.log('Initial data loaded');
            this.startSyncTimer();
            console.log('Storage manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize storage manager:', error);
            // Try to reinitialize after a delay
            setTimeout(() => {
                console.log('Retrying storage manager initialization...');
                this.init();
            }, 2000);
        }
    }

    /**
     * Initialize IndexedDB
     */
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Volunteers store
                if (!db.objectStoreNames.contains('volunteers')) {
                    const volunteerStore = db.createObjectStore('volunteers', { keyPath: 'id' });
                    volunteerStore.createIndex('name', 'name', { unique: false });
                    volunteerStore.createIndex('committee', 'committee', { unique: false });
                    volunteerStore.createIndex('status', 'status', { unique: false });
                }

                // Attendance store
                if (!db.objectStoreNames.contains('attendance')) {
                    const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                    attendanceStore.createIndex('volunteerId', 'volunteerId', { unique: false });
                    attendanceStore.createIndex('eventId', 'eventId', { unique: false });
                    attendanceStore.createIndex('dateTime', 'dateTime', { unique: false });
                    attendanceStore.createIndex('volunteerEvent', ['volunteerId', 'eventId'], { unique: false });
                }

                // Events store
                if (!db.objectStoreNames.contains('events')) {
                    const eventStore = db.createObjectStore('events', { keyPath: 'eventId' });
                    eventStore.createIndex('date', 'date', { unique: false });
                    eventStore.createIndex('type', 'type', { unique: false });
                    eventStore.createIndex('status', 'status', { unique: false });
                }

                // Sync queue store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    /**
     * Setup event listeners for online/offline status
     */
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatus('online');
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus('offline');
        });

        // Update initial status
        this.updateSyncStatus(this.isOnline ? 'online' : 'offline');
    }

    /**
     * Update sync status indicator
     */
    updateSyncStatus(status) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');

        if (statusIndicator && statusText) {
            statusIndicator.className = `status-indicator ${status}`;
            statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    /**
     * Load initial data (sample volunteers and events)
     */
    async loadInitialData() {
        try {
            // Check if we already have data
            const volunteerCount = await this.getVolunteerCount();
            
            if (volunteerCount === 0) {
                // Load sample volunteers
                const sampleVolunteers = [
                    { id: 'V001', name: 'John Doe', committee: 'Events', status: 'Active', dateAdded: new Date().toISOString() },
                    { id: 'V002', name: 'Jane Smith', committee: 'Hospitality', status: 'Active', dateAdded: new Date().toISOString() },
                    { id: 'V003', name: 'Bob Johnson', committee: 'Setup', status: 'Active', dateAdded: new Date().toISOString() }
                ];

                for (const volunteer of sampleVolunteers) {
                    await this.addVolunteer(volunteer);
                }
            }

            // Check if we have today's event
            const today = new Date();
            const todayEventId = `E${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const todayEvent = await this.getEvent(todayEventId);

            if (!todayEvent) {
                // Create today's event with day and date
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                const dayName = dayNames[today.getDay()];
                const monthName = monthNames[today.getMonth()];
                const dayOfMonth = today.getDate();
                
                const event = {
                    eventId: todayEventId,
                    eventName: `${dayName}, ${monthName} ${dayOfMonth}`,
                    date: today.toISOString().split('T')[0],
                    type: 'Daily',
                    status: 'Active',
                    dayOfWeek: dayName
                };

                await this.addEvent(event);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    /**
     * Start sync timer
     */
    startSyncTimer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(() => {
            if (this.isOnline) {
                this.syncPendingData();
            }
        }, this.syncInterval);
    }

    /**
     * Stop sync timer
     */
    stopSyncTimer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    /**
     * Clear all data and reinitialize (for development/testing)
     */
    async clearAllData() {
        try {
            // Check if database is initialized
            if (!this.db) {
                console.log('Database not initialized, reinitializing...');
                await this.initIndexedDB();
            }

            // Check if stores exist
            const storeNames = ['volunteers', 'attendance', 'events', 'syncQueue'];
            const existingStores = Array.from(this.db.objectStoreNames);
            
            console.log('Available stores:', existingStores);
            
            // Clear only existing stores
            for (const storeName of storeNames) {
                if (existingStores.includes(storeName)) {
                    await this.performTransaction(storeName, 'readwrite', (store) => store.clear());
                    console.log(`Cleared ${storeName} store`);
                } else {
                    console.warn(`Store ${storeName} does not exist`);
                }
            }
            
            // Reload initial data
            await this.loadInitialData();
            
            console.log('All data cleared and reinitialized');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    // Volunteer operations
    async addVolunteer(volunteer) {
        return this.performTransaction('volunteers', 'readwrite', (store) => {
            return store.add(volunteer);
        });
    }

    async getVolunteer(id) {
        return this.performTransaction('volunteers', 'readonly', (store) => {
            return store.get(id);
        });
    }

    async getAllVolunteers() {
        return this.performTransaction('volunteers', 'readonly', (store) => {
            return store.getAll();
        });
    }

    async updateVolunteer(volunteer) {
        return this.performTransaction('volunteers', 'readwrite', (store) => {
            return store.put(volunteer);
        });
    }

    async deleteVolunteer(id) {
        return this.performTransaction('volunteers', 'readwrite', (store) => {
            return store.delete(id);
        });
    }

    async getVolunteerCount() {
        return this.performTransaction('volunteers', 'readonly', (store) => {
            return store.count();
        });
    }

    // Attendance operations
    async recordAttendance(attendance) {
        // Add timestamp and generate ID
        attendance.dateTime = new Date().toISOString();
        attendance.id = `${attendance.volunteerId}_${attendance.eventId}_${Date.now()}`;

        // Check for duplicate
        const existing = await this.getAttendanceByVolunteerAndEvent(attendance.volunteerId, attendance.eventId);
        if (existing.length > 0) {
            throw new Error('Volunteer already checked in for this event');
        }

        // Add to local storage
        const result = await this.performTransaction('attendance', 'readwrite', (store) => {
            return store.add(attendance);
        });

        // Queue for sync
        await this.queueForSync('attendance', 'add', attendance);

        // Auto-sync to Google Sheets if enabled and authenticated
        this.autoSyncToGoogleSheets();

        return result;
    }

    async getAttendanceByVolunteerAndEvent(volunteerId, eventId) {
        return this.performTransaction('attendance', 'readonly', (store) => {
            const index = store.index('volunteerEvent');
            return index.getAll([volunteerId, eventId]);
        });
    }

    async getTodayAttendance() {
        const today = Utils.Date.getStartOfToday();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.performTransaction('attendance', 'readonly', (store) => {
            const index = store.index('dateTime');
            const range = IDBKeyRange.bound(today.toISOString(), tomorrow.toISOString(), false, true);
            return index.getAll(range);
        });
    }

    async getAttendanceByDateRange(startDate, endDate) {
        return this.performTransaction('attendance', 'readonly', (store) => {
            const index = store.index('dateTime');
            const range = IDBKeyRange.bound(startDate.toISOString(), endDate.toISOString());
            return index.getAll(range);
        });
    }

    // Event operations
    async addEvent(event) {
        return this.performTransaction('events', 'readwrite', (store) => {
            return store.add(event);
        });
    }

    async getEvent(eventId) {
        return this.performTransaction('events', 'readonly', (store) => {
            return store.get(eventId);
        });
    }

    async getAllEvents() {
        return this.performTransaction('events', 'readonly', (store) => {
            return store.getAll();
        });
    }

    async updateEvent(event) {
        return this.performTransaction('events', 'readwrite', (store) => {
            return store.put(event);
        });
    }

    // Sync operations
    async queueForSync(storeName, operation, data) {
        const syncItem = {
            timestamp: new Date().toISOString(),
            type: `${storeName}_${operation}`,
            storeName,
            operation,
            data
        };

        return this.performTransaction('syncQueue', 'readwrite', (store) => {
            return store.add(syncItem);
        });
    }

    async syncPendingData() {
        if (!this.isOnline) return;

        try {
            this.updateSyncStatus('syncing');

            const pendingItems = await this.performTransaction('syncQueue', 'readonly', (store) => {
                return store.getAll();
            });

            if (pendingItems.length === 0) {
                this.updateSyncStatus('online');
                return;
            }

            // Here you would implement actual cloud sync
            // For now, we'll just simulate it and clear the queue
            console.log(`Syncing ${pendingItems.length} items...`);

            // Simulate sync delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Clear sync queue
            await this.performTransaction('syncQueue', 'readwrite', (store) => {
                return store.clear();
            });

            this.updateSyncStatus('online');
            console.log('Sync completed successfully');

        } catch (error) {
            console.error('Sync failed:', error);
            this.updateSyncStatus('online');
        }
    }

    /**
     * Perform IndexedDB transaction
     */
    performTransaction(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);

            transaction.onerror = () => {
                reject(new Error(`Transaction failed: ${transaction.error}`));
            };

            transaction.oncomplete = () => {
                // Transaction completed successfully
            };

            const request = operation(store);

            if (request && request.onsuccess !== undefined) {
                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };

                request.onerror = () => {
                    reject(new Error(`Request failed: ${request.error}`));
                };
            } else {
                // For operations that don't return a request (like store.clear())
                resolve(request);
            }
        });
    }

    /**
     * Export data to CSV format
     */
    async exportToCSV(type = 'attendance', dateRange = null) {
        let data = [];
        let headers = [];

        switch (type) {
            case 'volunteers':
                data = await this.getAllVolunteers();
                headers = ['ID', 'Name', 'Committee', 'Status', 'Date Added'];
                break;

            case 'attendance':
                if (dateRange) {
                    data = await this.getAttendanceByDateRange(dateRange.start, dateRange.end);
                } else {
                    data = await this.getTodayAttendance();
                }
                headers = ['Volunteer ID', 'Event ID', 'Date/Time', 'Event Name', 'Committee'];
                break;

            case 'events':
                data = await this.getAllEvents();
                headers = ['Event ID', 'Event Name', 'Date', 'Type', 'Status'];
                break;
        }

        // Convert to CSV
        const csvContent = this.convertToCSV(data, headers, type);
        return csvContent;
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data, headers, type) {
        const csvRows = [headers.join(',')];

        data.forEach(item => {
            let row = [];
            
            switch (type) {
                case 'volunteers':
                    row = [item.id, item.name, item.committee, item.status, item.dateAdded];
                    break;
                case 'attendance':
                    row = [item.volunteerId, item.eventId, item.dateTime, item.eventName, item.committee];
                    break;
                case 'events':
                    row = [item.eventId, item.eventName, item.date, item.type, item.status];
                    break;
            }

            // Escape commas and quotes in data
            const escapedRow = row.map(field => {
                if (field && field.toString().includes(',')) {
                    return `"${field.toString().replace(/"/g, '""')}"`;
                }
                return field || '';
            });

            csvRows.push(escapedRow.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Auto-sync to Google Sheets (non-blocking)
     */
    autoSyncToGoogleSheets() {
        // Don't block the main operation
        setTimeout(async () => {
            try {
                if (window.GoogleSheetsService && 
                    window.Config?.features?.googleSheetsSync &&
                    window.GoogleSheetsService.getStatus().isAuthenticated) {
                    
                    console.log('Auto-syncing to Google Sheets...');
                    await window.GoogleSheetsService.syncAllData();
                }
            } catch (error) {
                console.warn('Auto-sync to Google Sheets failed:', error.message);
                // Don't show error to user for auto-sync failures
            }
        }, 1000); // Delay to avoid blocking UI
    }

    /**
     * Import volunteers from CSV
     */
    async importVolunteersFromCSV(csvContent) {
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const results = {
            success: 0,
            errors: [],
            duplicates: 0
        };

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            try {
                const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const volunteer = {};

                headers.forEach((header, index) => {
                    switch (header) {
                        case 'id':
                        case 'volunteer id':
                            volunteer.id = values[index];
                            break;
                        case 'name':
                        case 'volunteer name':
                            volunteer.name = values[index];
                            break;
                        case 'committee':
                            volunteer.committee = values[index];
                            break;
                        case 'status':
                            volunteer.status = values[index] || 'Active';
                            break;
                    }
                });

                // Validate required fields
                if (!volunteer.id || !volunteer.name) {
                    results.errors.push(`Row ${i + 1}: Missing required fields (ID or Name)`);
                    continue;
                }

                // Check for existing volunteer
                const existing = await this.getVolunteer(volunteer.id);
                if (existing) {
                    results.duplicates++;
                    continue;
                }

                // Set defaults
                volunteer.status = volunteer.status || 'Active';
                volunteer.committee = volunteer.committee || 'General';
                volunteer.dateAdded = new Date().toISOString();

                await this.addVolunteer(volunteer);
                results.success++;

            } catch (error) {
                results.errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        return results;
    }
}

// Initialize storage manager
window.StorageManager = new StorageManager();

// Add global function for easy data reset (development/testing)
window.clearAppData = async function() {
    if (window.StorageManager) {
        const success = await window.StorageManager.clearAllData();
        if (success && window.App) {
            // Refresh the app display
            window.App.updateDashboard();
        }
        return success;
    }
    return false;
};

// Alternative: completely delete and recreate database
window.resetAppDatabase = async function() {
    try {
        // Close current database connection
        if (window.StorageManager && window.StorageManager.db) {
            window.StorageManager.db.close();
        }
        
        // Delete the entire database
        const deleteRequest = indexedDB.deleteDatabase('VolunteerAttendanceDB');
        
        return new Promise((resolve, reject) => {
            deleteRequest.onsuccess = async () => {
                console.log('Database deleted successfully');
                
                // Reinitialize storage manager
                window.StorageManager = new StorageManager();
                
                // Wait a bit for initialization
                setTimeout(() => {
                    if (window.App) {
                        window.App.updateDashboard();
                    }
                    resolve(true);
                }, 1000);
            };
            
            deleteRequest.onerror = () => {
                console.error('Error deleting database:', deleteRequest.error);
                reject(false);
            };
            
            deleteRequest.onblocked = () => {
                console.warn('Database deletion blocked - close all tabs with this app');
                reject(false);
            };
        });
    } catch (error) {
        console.error('Error resetting database:', error);
        return false;
    }
};