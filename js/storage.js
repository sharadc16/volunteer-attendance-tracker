/**
 * Data storage and synchronization for the Volunteer Attendance Tracker
 * Handles local IndexedDB storage and cloud synchronization
 */

/**
 * Data validation utilities
 */
class DataValidator {
    static validateVolunteer(volunteer) {
        const errors = [];
        
        if (!volunteer.id || typeof volunteer.id !== 'string' || volunteer.id.trim() === '') {
            errors.push('Volunteer ID is required and must be a non-empty string');
        }
        
        if (!volunteer.name || typeof volunteer.name !== 'string' || volunteer.name.trim() === '') {
            errors.push('Volunteer name is required and must be a non-empty string');
        }
        
        if (volunteer.committee && typeof volunteer.committee !== 'string') {
            errors.push('Committee must be a string');
        }
        
        if (volunteer.status && !['Active', 'Inactive', 'Suspended'].includes(volunteer.status)) {
            errors.push('Status must be one of: Active, Inactive, Suspended');
        }
        
        if (volunteer.email && !this.isValidEmail(volunteer.email)) {
            errors.push('Email must be a valid email address');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    static validateAttendanceRecord(attendance) {
        const errors = [];
        
        if (!attendance.volunteerId || typeof attendance.volunteerId !== 'string') {
            errors.push('Volunteer ID is required and must be a string');
        }
        
        if (!attendance.eventId || typeof attendance.eventId !== 'string') {
            errors.push('Event ID is required and must be a string');
        }
        
        if (attendance.dateTime && !this.isValidISODate(attendance.dateTime)) {
            errors.push('DateTime must be a valid ISO date string');
        }
        
        if (attendance.eventName && typeof attendance.eventName !== 'string') {
            errors.push('Event name must be a string');
        }
        
        if (attendance.committee && typeof attendance.committee !== 'string') {
            errors.push('Committee must be a string');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    static validateEvent(event) {
        const errors = [];
        
        if (!event.eventId || typeof event.eventId !== 'string') {
            errors.push('Event ID is required and must be a string');
        }
        
        if (!event.eventName || typeof event.eventName !== 'string' || event.eventName.trim() === '') {
            errors.push('Event name is required and must be a non-empty string');
        }
        
        if (!event.date || !this.isValidDate(event.date)) {
            errors.push('Date is required and must be a valid date (YYYY-MM-DD format)');
        }
        
        if (event.type && !['Recurring', 'Special', 'Daily'].includes(event.type)) {
            errors.push('Type must be one of: Recurring, Special, Daily');
        }
        
        if (event.status && !['Active', 'Inactive', 'Cancelled'].includes(event.status)) {
            errors.push('Status must be one of: Active, Inactive, Cancelled');
        }
        
        if (event.recurringPattern && !['Weekly', 'Monthly', 'Daily'].includes(event.recurringPattern)) {
            errors.push('Recurring pattern must be one of: Weekly, Monthly, Daily');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static isValidISODate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString === date.toISOString();
    }
    
    static isValidDate(dateString) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) return false;
        
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
}

/**
 * Data models with default values and sanitization
 */
class DataModels {
    static createVolunteer(data) {
        return {
            id: data.id?.toString().trim() || '',
            name: data.name?.toString().trim() || '',
            committee: data.committee?.toString().trim() || 'General',
            status: data.status || 'Active',
            dateAdded: data.dateAdded || new Date().toISOString(),
            email: data.email?.toString().trim() || null
        };
    }
    
    static createAttendanceRecord(data) {
        return {
            id: data.id || `${data.volunteerId}_${data.eventId}_${Date.now()}`,
            volunteerId: data.volunteerId?.toString().trim() || '',
            eventId: data.eventId?.toString().trim() || '',
            dateTime: data.dateTime || new Date().toISOString(),
            eventName: data.eventName?.toString().trim() || '',
            committee: data.committee?.toString().trim() || '',
            scannerUsed: data.scannerUsed?.toString().trim() || 'Unknown'
        };
    }
    
    static createEvent(data) {
        return {
            eventId: data.eventId?.toString().trim() || '',
            eventName: data.eventName?.toString().trim() || '',
            date: data.date || new Date().toISOString().split('T')[0],
            type: data.type || 'Special',
            status: data.status || 'Active',
            recurringPattern: data.recurringPattern || null,
            dayOfWeek: data.dayOfWeek || null
        };
    }
    
    static createAttendanceSummary(data) {
        return {
            volunteerId: data.volunteerId?.toString().trim() || '',
            volunteerName: data.volunteerName?.toString().trim() || '',
            committee: data.committee?.toString().trim() || '',
            totalEvents: parseInt(data.totalEvents) || 0,
            attendedEvents: parseInt(data.attendedEvents) || 0,
            attendanceRate: parseFloat(data.attendanceRate) || 0,
            lastAttendance: data.lastAttendance || null,
            yearToDateAttendance: parseInt(data.yearToDateAttendance) || 0
        };
    }
}

/**
 * Enhanced IndexedDB wrapper with comprehensive error handling and validation
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
     * Check database health and integrity
     */
    async checkDatabaseHealth() {
        const health = {
            isHealthy: true,
            issues: [],
            stats: {},
            lastChecked: new Date().toISOString()
        };
        
        try {
            // Check if database is initialized
            if (!this.db) {
                health.isHealthy = false;
                health.issues.push('Database not initialized');
                return health;
            }
            
            // Check object stores
            const requiredStores = ['volunteers', 'attendance', 'events', 'syncQueue'];
            const existingStores = Array.from(this.db.objectStoreNames);
            
            for (const store of requiredStores) {
                if (!existingStores.includes(store)) {
                    health.isHealthy = false;
                    health.issues.push(`Missing object store: ${store}`);
                }
            }
            
            // Get basic statistics
            try {
                health.stats.volunteers = await this.getVolunteerCount();
                health.stats.attendance = await this.performTransaction('attendance', 'readonly', (store) => store.count());
                health.stats.events = await this.performTransaction('events', 'readonly', (store) => store.count());
                health.stats.syncQueue = await this.performTransaction('syncQueue', 'readonly', (store) => store.count());
            } catch (error) {
                health.isHealthy = false;
                health.issues.push(`Error getting statistics: ${error.message}`);
            }
            
            // Check for data integrity issues
            try {
                const volunteers = await this.getAllVolunteers();
                const attendance = await this.getAllAttendance();
                
                // Check for orphaned attendance records
                const orphanedAttendance = attendance.filter(record => 
                    !volunteers.some(volunteer => volunteer.id === record.volunteerId)
                );
                
                if (orphanedAttendance.length > 0) {
                    health.issues.push(`Found ${orphanedAttendance.length} orphaned attendance records`);
                }
                
                // Check for invalid volunteer data
                const invalidVolunteers = volunteers.filter(volunteer => {
                    const validation = DataValidator.validateVolunteer(volunteer);
                    return !validation.isValid;
                });
                
                if (invalidVolunteers.length > 0) {
                    health.issues.push(`Found ${invalidVolunteers.length} volunteers with invalid data`);
                }
                
            } catch (error) {
                health.isHealthy = false;
                health.issues.push(`Error checking data integrity: ${error.message}`);
            }
            
            // Update overall health status
            if (health.issues.length > 0) {
                health.isHealthy = false;
            }
            
            console.log('Database health check completed:', health);
            return health;
            
        } catch (error) {
            health.isHealthy = false;
            health.issues.push(`Health check failed: ${error.message}`);
            console.error('Database health check failed:', error);
            return health;
        }
    }
    
    /**
     * Repair database issues (where possible)
     */
    async repairDatabase() {
        const repairResults = {
            success: true,
            repaired: [],
            errors: []
        };
        
        try {
            const health = await this.checkDatabaseHealth();
            
            if (health.isHealthy) {
                console.log('Database is healthy, no repairs needed');
                return repairResults;
            }
            
            // Attempt to repair orphaned attendance records
            try {
                const volunteers = await this.getAllVolunteers();
                const attendance = await this.getAllAttendance();
                const volunteerIds = new Set(volunteers.map(v => v.id));
                
                const orphanedRecords = attendance.filter(record => 
                    !volunteerIds.has(record.volunteerId)
                );
                
                for (const record of orphanedRecords) {
                    await this.performTransaction('attendance', 'readwrite', (store) => {
                        return store.delete(record.id);
                    });
                }
                
                if (orphanedRecords.length > 0) {
                    repairResults.repaired.push(`Removed ${orphanedRecords.length} orphaned attendance records`);
                }
                
            } catch (error) {
                repairResults.errors.push(`Failed to repair orphaned records: ${error.message}`);
            }
            
            // Additional repair operations can be added here
            
            if (repairResults.errors.length > 0) {
                repairResults.success = false;
            }
            
            console.log('Database repair completed:', repairResults);
            return repairResults;
            
        } catch (error) {
            repairResults.success = false;
            repairResults.errors.push(`Repair failed: ${error.message}`);
            console.error('Database repair failed:', error);
            return repairResults;
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

    // Enhanced Volunteer operations with validation
    async addVolunteer(volunteerData) {
        try {
            // Create and validate volunteer model
            const volunteer = DataModels.createVolunteer(volunteerData);
            const validation = DataValidator.validateVolunteer(volunteer);
            
            if (!validation.isValid) {
                throw new Error(`Volunteer validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Check for duplicate ID
            const existing = await this.getVolunteer(volunteer.id);
            if (existing) {
                throw new Error(`Volunteer with ID ${volunteer.id} already exists`);
            }
            
            const result = await this.performTransaction('volunteers', 'readwrite', (store) => {
                return store.add(volunteer);
            });
            
            console.log(`Volunteer ${volunteer.name} (${volunteer.id}) added successfully`);
            return result;
            
        } catch (error) {
            console.error('Error adding volunteer:', error);
            throw error;
        }
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

    async updateVolunteer(volunteerData) {
        try {
            // Create and validate volunteer model
            const volunteer = DataModels.createVolunteer(volunteerData);
            const validation = DataValidator.validateVolunteer(volunteer);
            
            if (!validation.isValid) {
                throw new Error(`Volunteer validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Check if volunteer exists
            const existing = await this.getVolunteer(volunteer.id);
            if (!existing) {
                throw new Error(`Volunteer with ID ${volunteer.id} not found`);
            }
            
            const result = await this.performTransaction('volunteers', 'readwrite', (store) => {
                return store.put(volunteer);
            });
            
            console.log(`Volunteer ${volunteer.name} (${volunteer.id}) updated successfully`);
            return result;
            
        } catch (error) {
            console.error('Error updating volunteer:', error);
            throw error;
        }
    }

    async deleteVolunteer(id) {
        try {
            if (!id || typeof id !== 'string') {
                throw new Error('Volunteer ID is required and must be a string');
            }
            
            // Check if volunteer exists
            const existing = await this.getVolunteer(id);
            if (!existing) {
                throw new Error(`Volunteer with ID ${id} not found`);
            }
            
            // Check for existing attendance records
            const attendanceRecords = await this.getAttendanceByVolunteer(id);
            if (attendanceRecords.length > 0) {
                throw new Error(`Cannot delete volunteer ${id}: ${attendanceRecords.length} attendance records exist. Consider deactivating instead.`);
            }
            
            const result = await this.performTransaction('volunteers', 'readwrite', (store) => {
                return store.delete(id);
            });
            
            console.log(`Volunteer ${existing.name} (${id}) deleted successfully`);
            return result;
            
        } catch (error) {
            console.error('Error deleting volunteer:', error);
            throw error;
        }
    }

    async getVolunteerCount() {
        try {
            return this.performTransaction('volunteers', 'readonly', (store) => {
                return store.count();
            });
        } catch (error) {
            console.error('Error getting volunteer count:', error);
            throw error;
        }
    }
    
    async getVolunteersByCommittee(committee) {
        try {
            if (!committee || typeof committee !== 'string') {
                throw new Error('Committee is required and must be a string');
            }
            
            return this.performTransaction('volunteers', 'readonly', (store) => {
                const index = store.index('committee');
                return index.getAll(committee);
            });
            
        } catch (error) {
            console.error('Error getting volunteers by committee:', error);
            throw error;
        }
    }
    
    async getVolunteersByStatus(status) {
        try {
            if (!status || typeof status !== 'string') {
                throw new Error('Status is required and must be a string');
            }
            
            return this.performTransaction('volunteers', 'readonly', (store) => {
                const index = store.index('status');
                return index.getAll(status);
            });
            
        } catch (error) {
            console.error('Error getting volunteers by status:', error);
            throw error;
        }
    }
    
    async searchVolunteers(searchTerm) {
        try {
            if (!searchTerm || typeof searchTerm !== 'string') {
                throw new Error('Search term is required and must be a string');
            }
            
            const allVolunteers = await this.getAllVolunteers();
            const searchLower = searchTerm.toLowerCase();
            
            return allVolunteers.filter(volunteer => 
                volunteer.name.toLowerCase().includes(searchLower) ||
                volunteer.id.toLowerCase().includes(searchLower) ||
                volunteer.committee.toLowerCase().includes(searchLower)
            );
            
        } catch (error) {
            console.error('Error searching volunteers:', error);
            throw error;
        }
    }

    // Enhanced Attendance operations with validation
    async recordAttendance(attendanceData) {
        try {
            // Create and validate attendance record
            const attendance = DataModels.createAttendanceRecord(attendanceData);
            const validation = DataValidator.validateAttendanceRecord(attendance);
            
            if (!validation.isValid) {
                throw new Error(`Attendance validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Verify volunteer exists
            const volunteer = await this.getVolunteer(attendance.volunteerId);
            if (!volunteer) {
                throw new Error(`Volunteer with ID ${attendance.volunteerId} not found`);
            }
            
            // Verify volunteer is active
            if (volunteer.status !== 'Active') {
                throw new Error(`Volunteer ${volunteer.name} is ${volunteer.status} and cannot check in`);
            }
            
            // Verify event exists
            const event = await this.getEvent(attendance.eventId);
            if (!event) {
                throw new Error(`Event with ID ${attendance.eventId} not found`);
            }
            
            // Check for duplicate attendance
            const existing = await this.getAttendanceByVolunteerAndEvent(attendance.volunteerId, attendance.eventId);
            if (existing.length > 0) {
                throw new Error(`${volunteer.name} already checked in for ${event.eventName}`);
            }
            
            // Enrich attendance record with volunteer and event data
            attendance.eventName = event.eventName;
            attendance.committee = volunteer.committee;
            
            // Add to local storage
            const result = await this.performTransaction('attendance', 'readwrite', (store) => {
                return store.add(attendance);
            });

            // Queue for sync with high priority for real-time attendance
            await this.queueForSync('create', 'attendance', attendance, 'high');

            // Auto-sync to Google Sheets if enabled and authenticated
            this.autoSyncToGoogleSheets();
            
            console.log(`Attendance recorded for ${volunteer.name} at ${event.eventName}`);
            return result;
            
        } catch (error) {
            console.error('Error recording attendance:', error);
            throw error;
        }
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
        try {
            if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
                throw new Error('Start date and end date must be Date objects');
            }
            
            if (startDate > endDate) {
                throw new Error('Start date cannot be after end date');
            }
            
            return this.performTransaction('attendance', 'readonly', (store) => {
                const index = store.index('dateTime');
                const range = IDBKeyRange.bound(startDate.toISOString(), endDate.toISOString());
                return index.getAll(range);
            });
            
        } catch (error) {
            console.error('Error getting attendance by date range:', error);
            throw error;
        }
    }
    
    async getAttendanceByVolunteer(volunteerId) {
        try {
            if (!volunteerId || typeof volunteerId !== 'string') {
                throw new Error('Volunteer ID is required and must be a string');
            }
            
            return this.performTransaction('attendance', 'readonly', (store) => {
                const index = store.index('volunteerId');
                return index.getAll(volunteerId);
            });
            
        } catch (error) {
            console.error('Error getting attendance by volunteer:', error);
            throw error;
        }
    }
    
    async getAllAttendance() {
        try {
            return this.performTransaction('attendance', 'readonly', (store) => {
                return store.getAll();
            });
        } catch (error) {
            console.error('Error getting all attendance records:', error);
            throw error;
        }
    }

    // Enhanced Event operations with validation
    async addEvent(eventData) {
        try {
            // Create and validate event model
            const event = DataModels.createEvent(eventData);
            const validation = DataValidator.validateEvent(event);
            
            if (!validation.isValid) {
                throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Check for duplicate event ID
            const existing = await this.getEvent(event.eventId);
            if (existing) {
                throw new Error(`Event with ID ${event.eventId} already exists`);
            }
            
            const result = await this.performTransaction('events', 'readwrite', (store) => {
                return store.add(event);
            });
            
            // Queue for sync
            await this.queueForSync('create', 'events', event, 'normal');
            
            console.log(`Event ${event.eventName} (${event.eventId}) added successfully`);
            return result;
            
        } catch (error) {
            console.error('Error adding event:', error);
            throw error;
        }
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

    async updateEvent(eventData) {
        try {
            // Create and validate event model
            const event = DataModels.createEvent(eventData);
            const validation = DataValidator.validateEvent(event);
            
            if (!validation.isValid) {
                throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Check if event exists
            const existing = await this.getEvent(event.eventId);
            if (!existing) {
                throw new Error(`Event with ID ${event.eventId} not found`);
            }
            
            const result = await this.performTransaction('events', 'readwrite', (store) => {
                return store.put(event);
            });
            
            // Queue for sync
            await this.queueForSync('update', 'events', event, 'normal');
            
            console.log(`Event ${event.eventName} (${event.eventId}) updated successfully`);
            return result;
            
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    }
    
    async deleteEvent(eventId) {
        try {
            if (!eventId || typeof eventId !== 'string') {
                throw new Error('Event ID is required and must be a string');
            }
            
            // Check if event exists
            const existing = await this.getEvent(eventId);
            if (!existing) {
                throw new Error(`Event with ID ${eventId} not found`);
            }
            
            // Check for existing attendance records
            const attendanceRecords = await this.getAttendanceByEvent(eventId);
            if (attendanceRecords.length > 0) {
                throw new Error(`Cannot delete event ${eventId}: ${attendanceRecords.length} attendance records exist`);
            }
            
            const result = await this.performTransaction('events', 'readwrite', (store) => {
                return store.delete(eventId);
            });
            
            // Queue for sync
            await this.queueForSync('delete', 'events', existing, 'normal');
            
            console.log(`Event ${existing.eventName} (${eventId}) deleted successfully`);
            return result;
            
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    }
    
    async getAttendanceByEvent(eventId) {
        try {
            if (!eventId || typeof eventId !== 'string') {
                throw new Error('Event ID is required and must be a string');
            }
            
            return this.performTransaction('attendance', 'readonly', (store) => {
                const index = store.index('eventId');
                return index.getAll(eventId);
            });
            
        } catch (error) {
            console.error('Error getting attendance by event:', error);
            throw error;
        }
    }
    
    /**
     * Generate attendance summary for a volunteer
     */
    async getVolunteerAttendanceSummary(volunteerId, dateRange = null) {
        try {
            if (!volunteerId || typeof volunteerId !== 'string') {
                throw new Error('Volunteer ID is required and must be a string');
            }
            
            const volunteer = await this.getVolunteer(volunteerId);
            if (!volunteer) {
                throw new Error(`Volunteer with ID ${volunteerId} not found`);
            }
            
            let attendanceRecords;
            let totalEvents;
            
            if (dateRange) {
                attendanceRecords = await this.getAttendanceByDateRange(dateRange.start, dateRange.end);
                attendanceRecords = attendanceRecords.filter(record => record.volunteerId === volunteerId);
                
                // Get events in date range
                const allEvents = await this.getAllEvents();
                totalEvents = allEvents.filter(event => {
                    const eventDate = new Date(event.date);
                    return eventDate >= dateRange.start && eventDate <= dateRange.end;
                }).length;
            } else {
                attendanceRecords = await this.getAttendanceByVolunteer(volunteerId);
                totalEvents = (await this.getAllEvents()).length;
            }
            
            const attendedEvents = attendanceRecords.length;
            const attendanceRate = totalEvents > 0 ? (attendedEvents / totalEvents) * 100 : 0;
            
            const lastAttendance = attendanceRecords.length > 0 
                ? attendanceRecords.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))[0].dateTime
                : null;
            
            // Calculate year-to-date attendance
            const yearStart = new Date(new Date().getFullYear(), 0, 1);
            const yearEnd = new Date();
            const ytdAttendance = await this.getAttendanceByDateRange(yearStart, yearEnd);
            const yearToDateAttendance = ytdAttendance.filter(record => record.volunteerId === volunteerId).length;
            
            return DataModels.createAttendanceSummary({
                volunteerId: volunteer.id,
                volunteerName: volunteer.name,
                committee: volunteer.committee,
                totalEvents,
                attendedEvents,
                attendanceRate: Math.round(attendanceRate * 100) / 100,
                lastAttendance,
                yearToDateAttendance
            });
            
        } catch (error) {
            console.error('Error getting volunteer attendance summary:', error);
            throw error;
        }
    }
    
    /**
     * Get attendance summaries for all volunteers
     */
    async getAllVolunteerAttendanceSummaries(dateRange = null) {
        try {
            const volunteers = await this.getAllVolunteers();
            const summaries = [];
            
            for (const volunteer of volunteers) {
                try {
                    const summary = await this.getVolunteerAttendanceSummary(volunteer.id, dateRange);
                    summaries.push(summary);
                } catch (error) {
                    console.warn(`Error getting summary for volunteer ${volunteer.id}:`, error);
                }
            }
            
            return summaries.sort((a, b) => b.attendanceRate - a.attendanceRate);
            
        } catch (error) {
            console.error('Error getting all volunteer attendance summaries:', error);
            throw error;
        }
    }
    
    /**
     * Get committee attendance statistics
     */
    async getCommitteeAttendanceStats(dateRange = null) {
        try {
            const volunteers = await this.getAllVolunteers();
            const committees = [...new Set(volunteers.map(v => v.committee))];
            const stats = [];
            
            for (const committee of committees) {
                const committeeVolunteers = volunteers.filter(v => v.committee === committee);
                const summaries = [];
                
                for (const volunteer of committeeVolunteers) {
                    try {
                        const summary = await this.getVolunteerAttendanceSummary(volunteer.id, dateRange);
                        summaries.push(summary);
                    } catch (error) {
                        console.warn(`Error getting summary for volunteer ${volunteer.id}:`, error);
                    }
                }
                
                const totalVolunteers = summaries.length;
                const avgAttendanceRate = totalVolunteers > 0 
                    ? summaries.reduce((sum, s) => sum + s.attendanceRate, 0) / totalVolunteers
                    : 0;
                const totalAttendances = summaries.reduce((sum, s) => sum + s.attendedEvents, 0);
                const activeVolunteers = summaries.filter(s => s.attendedEvents > 0).length;
                const topPerformer = summaries.length > 0 
                    ? summaries.reduce((top, current) => current.attendanceRate > top.attendanceRate ? current : top)
                    : null;
                
                stats.push({
                    committee,
                    totalVolunteers,
                    activeVolunteers,
                    avgAttendanceRate: Math.round(avgAttendanceRate * 100) / 100,
                    totalAttendances,
                    topPerformer,
                    volunteers: summaries.sort((a, b) => b.attendanceRate - a.attendanceRate)
                });
            }
            
            return stats.sort((a, b) => b.avgAttendanceRate - a.avgAttendanceRate);
            
        } catch (error) {
            console.error('Error getting committee attendance stats:', error);
            throw error;
        }
    }

    /**
     * Get attendance trends over time periods
     */
    async getAttendanceTrends(volunteerId = null, periodType = 'month', periodsBack = 6) {
        try {
            const trends = [];
            const now = new Date();
            
            for (let i = periodsBack - 1; i >= 0; i--) {
                const periodStart = new Date(now);
                const periodEnd = new Date(now);
                
                switch (periodType) {
                    case 'week':
                        periodStart.setDate(now.getDate() - (i + 1) * 7);
                        periodEnd.setDate(now.getDate() - i * 7);
                        break;
                    case 'month':
                        periodStart.setMonth(now.getMonth() - (i + 1));
                        periodStart.setDate(1);
                        periodEnd.setMonth(now.getMonth() - i);
                        periodEnd.setDate(0); // Last day of previous month
                        break;
                    case 'quarter':
                        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
                        periodStart.setMonth(quarterStart - (i + 1) * 3);
                        periodStart.setDate(1);
                        periodEnd.setMonth(quarterStart - i * 3);
                        periodEnd.setDate(0);
                        break;
                }
                
                const attendance = await this.getAttendanceByDateRange(periodStart, periodEnd);
                const events = await this.getEventsByDateRange(periodStart, periodEnd);
                
                let periodAttendance = attendance;
                if (volunteerId) {
                    periodAttendance = attendance.filter(record => record.volunteerId === volunteerId);
                }
                
                const uniqueVolunteers = [...new Set(periodAttendance.map(record => record.volunteerId))];
                const totalEvents = events.filter(event => event.status === 'Active').length;
                
                trends.push({
                    period: this.formatPeriodLabel(periodStart, periodEnd, periodType),
                    startDate: periodStart.toISOString().split('T')[0],
                    endDate: periodEnd.toISOString().split('T')[0],
                    totalAttendances: periodAttendance.length,
                    uniqueVolunteers: uniqueVolunteers.length,
                    totalEvents,
                    avgAttendancePerEvent: totalEvents > 0 ? Math.round((periodAttendance.length / totalEvents) * 100) / 100 : 0
                });
            }
            
            return trends;
            
        } catch (error) {
            console.error('Error getting attendance trends:', error);
            throw error;
        }
    }

    /**
     * Format period label for trends
     */
    formatPeriodLabel(startDate, endDate, periodType) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        switch (periodType) {
            case 'week':
                return `${monthNames[startDate.getMonth()]} ${startDate.getDate()}-${endDate.getDate()}`;
            case 'month':
                return `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
            case 'quarter':
                const quarter = Math.floor(startDate.getMonth() / 3) + 1;
                return `Q${quarter} ${startDate.getFullYear()}`;
            default:
                return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        }
    }

    /**
     * Get events by date range
     */
    async getEventsByDateRange(startDate, endDate) {
        try {
            if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
                throw new Error('Start date and end date must be Date objects');
            }
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            return this.performTransaction('events', 'readonly', (store) => {
                const index = store.index('date');
                const range = IDBKeyRange.bound(startDateStr, endDateStr);
                return index.getAll(range);
            });
            
        } catch (error) {
            console.error('Error getting events by date range:', error);
            throw error;
        }
    }

    /**
     * Get volunteer attendance scores with detailed metrics
     */
    async getVolunteerAttendanceScores(dateRange = null, sortBy = 'attendanceRate') {
        try {
            const summaries = await this.getAllVolunteerAttendanceSummaries(dateRange);
            
            // Calculate additional scoring metrics
            const enhancedScores = summaries.map(summary => {
                // Consistency score (based on recent attendance pattern)
                const consistencyScore = this.calculateConsistencyScore(summary);
                
                // Engagement score (combination of attendance rate and consistency)
                const engagementScore = Math.round(
                    (summary.attendanceRate * 0.7 + consistencyScore * 0.3) * 100
                ) / 100;
                
                // Attendance tier
                let tier = 'Bronze';
                if (summary.attendanceRate >= 90) tier = 'Platinum';
                else if (summary.attendanceRate >= 80) tier = 'Gold';
                else if (summary.attendanceRate >= 70) tier = 'Silver';
                
                return {
                    ...summary,
                    consistencyScore,
                    engagementScore,
                    tier
                };
            });
            
            // Sort by specified criteria
            switch (sortBy) {
                case 'attendanceRate':
                    return enhancedScores.sort((a, b) => b.attendanceRate - a.attendanceRate);
                case 'engagementScore':
                    return enhancedScores.sort((a, b) => b.engagementScore - a.engagementScore);
                case 'consistencyScore':
                    return enhancedScores.sort((a, b) => b.consistencyScore - a.consistencyScore);
                case 'totalAttendances':
                    return enhancedScores.sort((a, b) => b.attendedEvents - a.attendedEvents);
                case 'name':
                    return enhancedScores.sort((a, b) => a.volunteerName.localeCompare(b.volunteerName));
                case 'committee':
                    return enhancedScores.sort((a, b) => a.committee.localeCompare(b.committee));
                default:
                    return enhancedScores.sort((a, b) => b.attendanceRate - a.attendanceRate);
            }
            
        } catch (error) {
            console.error('Error getting volunteer attendance scores:', error);
            throw error;
        }
    }

    /**
     * Calculate consistency score for a volunteer
     */
    calculateConsistencyScore(summary) {
        // For now, use a simple calculation based on attendance rate
        // In a more sophisticated implementation, this could analyze
        // attendance patterns over time
        if (summary.attendanceRate >= 95) return 100;
        if (summary.attendanceRate >= 85) return 90;
        if (summary.attendanceRate >= 75) return 80;
        if (summary.attendanceRate >= 65) return 70;
        if (summary.attendanceRate >= 50) return 60;
        return Math.max(summary.attendanceRate, 30);
    }

    // Sync operations - delegate to SyncManager
    async queueForSync(operation, storeName, data, priority = 'normal') {
        if (window.SyncManager) {
            return await window.SyncManager.queueForSync(operation, storeName, data, priority);
        } else {
            // Fallback to old method if SyncManager not available
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
    }

    async syncPendingData() {
        if (window.SyncManager) {
            return await window.SyncManager.syncPendingData();
        } else {
            // Fallback sync implementation
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

                console.log(`Syncing ${pendingItems.length} items...`);

                // Try to sync with Google Sheets if available
                if (window.GoogleSheetsService && window.GoogleSheetsService.getStatus().isAuthenticated) {
                    await window.GoogleSheetsService.syncAllData();
                }

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
    }

    /**
     * Perform IndexedDB transaction with enhanced error handling
     */
    performTransaction(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.db) {
                    reject(new Error('Database not initialized. Please wait for initialization to complete.'));
                    return;
                }

                if (!this.db.objectStoreNames.contains(storeName)) {
                    reject(new Error(`Object store '${storeName}' does not exist in database`));
                    return;
                }

                const transaction = this.db.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);

                transaction.onerror = () => {
                    const error = transaction.error || new Error('Unknown transaction error');
                    console.error(`Transaction failed on store '${storeName}':`, error);
                    reject(new Error(`Transaction failed: ${error.message}`));
                };

                transaction.onabort = () => {
                    console.error(`Transaction aborted on store '${storeName}'`);
                    reject(new Error('Transaction was aborted'));
                };

                transaction.oncomplete = () => {
                    // Transaction completed successfully
                    console.debug(`Transaction completed successfully on store '${storeName}'`);
                };

                try {
                    const request = operation(store);

                    if (request && typeof request === 'object' && 'onsuccess' in request) {
                        request.onsuccess = (event) => {
                            resolve(event.target.result);
                        };

                        request.onerror = () => {
                            const error = request.error || new Error('Unknown request error');
                            console.error(`Request failed on store '${storeName}':`, error);
                            reject(new Error(`Request failed: ${error.message}`));
                        };
                    } else {
                        // For operations that don't return a request (like store.clear())
                        resolve(request);
                    }
                } catch (operationError) {
                    console.error(`Operation failed on store '${storeName}':`, operationError);
                    reject(new Error(`Operation failed: ${operationError.message}`));
                }

            } catch (error) {
                console.error(`Transaction setup failed for store '${storeName}':`, error);
                reject(new Error(`Transaction setup failed: ${error.message}`));
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
    async importVolunteersFromCSV(csvContent, skipDuplicates = true) {
        try {
            const lines = csvContent.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('CSV file must have at least a header row and one data row');
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            const results = {
                success: 0,
                errors: 0,
                skipped: 0,
                errorDetails: []
            };

            // Validate headers
            const hasId = headers.some(h => ['id', 'volunteer id', 'volunteer_id'].includes(h));
            const hasName = headers.some(h => ['name', 'volunteer name', 'volunteer_name', 'full name', 'fullname'].includes(h));
            
            if (!hasId || !hasName) {
                throw new Error('CSV must have ID and Name columns. Found headers: ' + headers.join(', '));
            }

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                try {
                    // Handle CSV parsing with quoted values
                    const values = this.parseCSVLine(line);
                    const volunteer = {};

                    // Map headers to volunteer properties
                    headers.forEach((header, index) => {
                        const value = values[index] ? values[index].trim() : '';
                        
                        switch (header) {
                            case 'id':
                            case 'volunteer id':
                            case 'volunteer_id':
                                volunteer.id = value;
                                break;
                            case 'name':
                            case 'volunteer name':
                            case 'volunteer_name':
                            case 'full name':
                            case 'fullname':
                                volunteer.name = value;
                                break;
                            case 'committee':
                                volunteer.committee = value || 'General';
                                break;
                            case 'email':
                            case 'email address':
                            case 'email_address':
                                volunteer.email = value || null;
                                break;
                            case 'status':
                                volunteer.status = value || 'Active';
                                break;
                        }
                    });

                    // Validate required fields
                    if (!volunteer.id || !volunteer.name) {
                        results.errors++;
                        results.errorDetails.push(`Row ${i + 1}: Missing required fields (ID: "${volunteer.id || ''}", Name: "${volunteer.name || ''}")`);
                        continue;
                    }

                    // Check for existing volunteer
                    const existing = await this.getVolunteer(volunteer.id);
                    if (existing) {
                        if (skipDuplicates) {
                            results.skipped++;
                            continue;
                        } else {
                            // Update existing volunteer
                            volunteer.dateAdded = existing.dateAdded; // Keep original date
                            await this.updateVolunteer(volunteer);
                            results.success++;
                            continue;
                        }
                    }

                    // Set defaults for new volunteer
                    volunteer.status = volunteer.status || 'Active';
                    volunteer.committee = volunteer.committee || 'General';
                    volunteer.dateAdded = new Date().toISOString();

                    // Validate email if provided
                    if (volunteer.email && !DataValidator.isValidEmail(volunteer.email)) {
                        results.errors++;
                        results.errorDetails.push(`Row ${i + 1}: Invalid email address "${volunteer.email}"`);
                        continue;
                    }

                    // Add volunteer
                    await this.addVolunteer(volunteer);
                    results.success++;

                } catch (error) {
                    results.errors++;
                    results.errorDetails.push(`Row ${i + 1}: ${error.message}`);
                }
            }

            console.log('CSV import completed:', results);
            return results;

        } catch (error) {
            console.error('CSV import failed:', error);
            throw error;
        }
    }

    /**
     * Parse a CSV line handling quoted values
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
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