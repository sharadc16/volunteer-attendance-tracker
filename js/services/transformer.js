/**
 * DataTransformer - Handles bidirectional data transformation between local and Google Sheets formats
 * Provides format conversion, validation, and sanitization for all data types
 */
class DataTransformer {
    constructor() {
        this.dataTypes = {
            VOLUNTEER: 'volunteer',
            EVENT: 'event',
            ATTENDANCE: 'attendance'
        };

        // Define field mappings for each data type
        this.fieldMappings = {
            volunteer: {
                local: ['id', 'name', 'email', 'committee', 'createdAt', 'updatedAt', 'syncedAt'],
                sheets: ['ID', 'Name', 'Email', 'Committee', 'Created', 'Updated', 'Synced']
            },
            event: {
                local: ['id', 'name', 'date', 'startTime', 'endTime', 'status', 'description', 'createdAt', 'updatedAt', 'syncedAt'],
                sheets: ['ID', 'Name', 'Date', 'Start Time', 'End Time', 'Status', 'Description', 'Created', 'Updated', 'Synced']
            },
            attendance: {
                local: ['id', 'volunteerId', 'eventId', 'volunteerName', 'committee', 'date', 'dateTime', 'createdAt', 'updatedAt', 'syncedAt'],
                sheets: ['ID', 'Volunteer ID', 'Event ID', 'Volunteer Name', 'Committee', 'Date', 'Time', 'Created', 'Updated', 'Synced']
            }
        };

        // Required fields for each data type
        this.requiredFields = {
            volunteer: ['id', 'name'],
            event: ['id', 'name', 'date'],
            attendance: ['id', 'volunteerId', 'eventId', 'date']
        };
    }

    /**
     * Convert local data to Google Sheets format
     * @param {Object|Array} data - Local data to convert
     * @param {string} type - Data type (volunteer, event, attendance)
     * @returns {Array} Array of arrays suitable for Google Sheets
     */
    toSheetsFormat(data, type) {
        try {
            if (!this.validateDataType(type)) {
                throw new Error(`Invalid data type: ${type}`);
            }

            // Handle single object or array of objects
            const dataArray = Array.isArray(data) ? data : [data];
            const mapping = this.fieldMappings[type];
            
            const result = dataArray.map(item => {
                this.validateLocalData(item, type);
                return this.transformToSheetsRow(item, mapping, type);
            });

            return result;
        } catch (error) {
            console.error('Error converting to sheets format:', error);
            throw new Error(`Data transformation failed: ${error.message}`);
        }
    }

    /**
     * Convert Google Sheets data to local format
     * @param {Array} data - Sheets data (array of arrays)
     * @param {string} type - Data type (volunteer, event, attendance)
     * @returns {Array} Array of local data objects
     */
    fromSheetsFormat(data, type) {
        try {
            if (!this.validateDataType(type)) {
                throw new Error(`Invalid data type: ${type}`);
            }

            if (!Array.isArray(data) || data.length === 0) {
                return [];
            }

            const mapping = this.fieldMappings[type];
            
            const result = data.map((row, index) => {
                try {
                    return this.transformFromSheetsRow(row, mapping, type);
                } catch (error) {
                    console.warn(`Skipping invalid row ${index + 1}:`, error.message);
                    return null;
                }
            }).filter(item => item !== null);

            return result;
        } catch (error) {
            console.error('Error converting from sheets format:', error);
            throw new Error(`Data transformation failed: ${error.message}`);
        }
    }

    /**
     * Validate data for specific type and format
     * @param {Object} data - Data to validate
     * @param {string} type - Data type
     * @param {string} format - 'local' or 'sheets'
     * @returns {boolean} True if valid
     */
    validateData(data, type, format = 'local') {
        try {
            if (format === 'local') {
                this.validateLocalData(data, type);
            } else {
                this.validateSheetsData(data, type);
            }
            return true;
        } catch (error) {
            console.error('Data validation failed:', error);
            return false;
        }
    }

    /**
     * Transform single local data object to sheets row
     * @private
     */
    transformToSheetsRow(item, mapping, type) {
        const row = [];
        
        mapping.local.forEach((localField, index) => {
            let value = item[localField] || '';
            
            // Apply type-specific transformations
            value = this.formatValueForSheets(value, localField, type);
            
            row.push(value);
        });

        return row;
    }

    /**
     * Transform single sheets row to local data object
     * @private
     */
    transformFromSheetsRow(row, mapping, type) {
        const item = {};
        
        mapping.local.forEach((localField, index) => {
            const sheetsValue = row[index] || '';
            item[localField] = this.formatValueFromSheets(sheetsValue, localField, type);
        });

        // Validate the transformed data
        this.validateLocalData(item, type);
        
        return item;
    }

    /**
     * Format value for Google Sheets
     * @private
     */
    formatValueForSheets(value, field, type) {
        if (value === null || value === undefined) {
            return '';
        }

        // Handle dates and timestamps
        if (field.includes('At') || field === 'date' || field === 'dateTime') {
            return this.formatDateForSheets(value);
        }

        // Handle time fields
        if (field.includes('Time')) {
            return this.formatTimeForSheets(value);
        }

        // Sanitize string values
        if (typeof value === 'string') {
            return this.sanitizeForSheets(value);
        }

        return String(value);
    }

    /**
     * Format value from Google Sheets
     * @private
     */
    formatValueFromSheets(value, field, type) {
        if (!value || value === '') {
            return field.includes('At') ? new Date().toISOString() : '';
        }

        // Handle dates and timestamps
        if (field.includes('At') || field === 'dateTime') {
            return this.parseDateFromSheets(value);
        }

        // Handle date fields
        if (field === 'date') {
            return this.parseDateOnlyFromSheets(value);
        }

        // Handle time fields
        if (field.includes('Time')) {
            return this.parseTimeFromSheets(value);
        }

        // Sanitize string values
        if (typeof value === 'string') {
            return this.sanitizeFromSheets(value);
        }

        return value;
    }

    /**
     * Format date for Google Sheets
     * @private
     */
    formatDateForSheets(dateValue) {
        if (!dateValue) return '';
        
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                return '';
            }
            return date.toISOString();
        } catch (error) {
            console.warn('Invalid date value:', dateValue);
            return '';
        }
    }

    /**
     * Format time for Google Sheets
     * @private
     */
    formatTimeForSheets(timeValue) {
        if (!timeValue) return '';
        
        // Handle HH:MM format
        if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
            return timeValue;
        }
        
        return String(timeValue);
    }

    /**
     * Parse date from Google Sheets
     * @private
     */
    parseDateFromSheets(value) {
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return new Date().toISOString();
            }
            return date.toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    /**
     * Parse date only from Google Sheets
     * @private
     */
    parseDateOnlyFromSheets(value) {
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return new Date().toISOString().split('T')[0];
            }
            return date.toISOString().split('T')[0];
        } catch (error) {
            return new Date().toISOString().split('T')[0];
        }
    }

    /**
     * Parse time from Google Sheets
     * @private
     */
    parseTimeFromSheets(value) {
        if (!value) return '';
        
        // Handle various time formats
        const timeStr = String(value).trim();
        
        // If already in HH:MM format
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
            const [hours, minutes] = timeStr.split(':');
            return `${hours.padStart(2, '0')}:${minutes}`;
        }
        
        return timeStr;
    }

    /**
     * Sanitize string for Google Sheets
     * @private
     */
    sanitizeForSheets(value) {
        if (typeof value !== 'string') {
            return String(value);
        }

        return value
            .replace(/[\r\n\t]/g, ' ')  // Replace line breaks and tabs with spaces
            .replace(/"/g, '""')        // Escape double quotes
            .trim();
    }

    /**
     * Sanitize string from Google Sheets
     * @private
     */
    sanitizeFromSheets(value) {
        if (typeof value !== 'string') {
            return String(value);
        }

        return value
            .replace(/""/g, '"')        // Unescape double quotes
            .trim();
    }

    /**
     * Validate local data structure
     * @private
     */
    validateLocalData(data, type) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be an object');
        }

        const required = this.requiredFields[type];
        for (const field of required) {
            if (!data[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Type-specific validations
        this.validateTypeSpecificData(data, type);
    }

    /**
     * Validate sheets data structure
     * @private
     */
    validateSheetsData(data, type) {
        if (!Array.isArray(data)) {
            throw new Error('Sheets data must be an array');
        }

        const mapping = this.fieldMappings[type];
        const minColumns = this.requiredFields[type].length;
        
        if (data.length < minColumns) {
            throw new Error(`Insufficient data columns. Expected at least ${minColumns}, got ${data.length}`);
        }
    }

    /**
     * Validate type-specific data requirements
     * @private
     */
    validateTypeSpecificData(data, type) {
        switch (type) {
            case 'volunteer':
                if (data.email && !this.isValidEmail(data.email)) {
                    throw new Error('Invalid email format');
                }
                break;
                
            case 'event':
                if (data.date && !this.isValidDate(data.date)) {
                    throw new Error('Invalid date format');
                }
                if (data.startTime && !this.isValidTime(data.startTime)) {
                    throw new Error('Invalid start time format');
                }
                if (data.endTime && !this.isValidTime(data.endTime)) {
                    throw new Error('Invalid end time format');
                }
                break;
                
            case 'attendance':
                if (data.date && !this.isValidDate(data.date)) {
                    throw new Error('Invalid attendance date format');
                }
                if (data.dateTime && !this.isValidDateTime(data.dateTime)) {
                    throw new Error('Invalid attendance datetime format');
                }
                break;
        }
    }

    /**
     * Validate data type
     * @private
     */
    validateDataType(type) {
        return Object.values(this.dataTypes).includes(type);
    }

    /**
     * Validate email format
     * @private
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate date format (YYYY-MM-DD)
     * @private
     */
    isValidDate(dateStr) {
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
    }

    /**
     * Validate time format (HH:MM or H:MM)
     * @private
     */
    isValidTime(timeStr) {
        return /^\d{1,2}:\d{2}$/.test(timeStr);
    }

    /**
     * Validate datetime format (ISO string)
     * @private
     */
    isValidDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        return !isNaN(date.getTime());
    }

    /**
     * Get headers for Google Sheets
     * @param {string} type - Data type
     * @returns {Array} Array of header strings
     */
    getSheetsHeaders(type) {
        if (!this.validateDataType(type)) {
            throw new Error(`Invalid data type: ${type}`);
        }
        
        return this.fieldMappings[type].sheets;
    }

    /**
     * Get field mapping for a data type
     * @param {string} type - Data type
     * @returns {Object} Field mapping object
     */
    getFieldMapping(type) {
        if (!this.validateDataType(type)) {
            throw new Error(`Invalid data type: ${type}`);
        }
        
        return this.fieldMappings[type];
    }

    /**
     * Enhanced data mapping and formatting methods
     */

    /**
     * Transform volunteer data with enhanced field conversion
     * @param {Object} volunteer - Volunteer data object
     * @param {string} direction - 'toSheets' or 'fromSheets'
     * @returns {Object|Array} Transformed data
     */
    transformVolunteerData(volunteer, direction = 'toSheets') {
        if (direction === 'toSheets') {
            return this.volunteerToSheetsFormat(volunteer);
        } else {
            return this.volunteerFromSheetsFormat(volunteer);
        }
    }

    /**
     * Transform event data with date and time handling
     * @param {Object} event - Event data object
     * @param {string} direction - 'toSheets' or 'fromSheets'
     * @returns {Object|Array} Transformed data
     */
    transformEventData(event, direction = 'toSheets') {
        if (direction === 'toSheets') {
            return this.eventToSheetsFormat(event);
        } else {
            return this.eventFromSheetsFormat(event);
        }
    }

    /**
     * Transform attendance data with name resolution
     * @param {Object} attendance - Attendance data object
     * @param {string} direction - 'toSheets' or 'fromSheets'
     * @param {Array} volunteers - Optional volunteers array for name resolution
     * @returns {Object|Array} Transformed data
     */
    transformAttendanceData(attendance, direction = 'toSheets', volunteers = []) {
        if (direction === 'toSheets') {
            return this.attendanceToSheetsFormat(attendance, volunteers);
        } else {
            return this.attendanceFromSheetsFormat(attendance);
        }
    }

    /**
     * Convert volunteer to sheets format with proper field conversion
     * @private
     */
    volunteerToSheetsFormat(volunteer) {
        const transformed = {
            id: this.sanitizeId(volunteer.id),
            name: this.sanitizeText(volunteer.name),
            email: this.sanitizeEmail(volunteer.email),
            committee: this.sanitizeText(volunteer.committee || ''),
            createdAt: this.formatTimestamp(volunteer.createdAt),
            updatedAt: this.formatTimestamp(volunteer.updatedAt),
            syncedAt: this.formatTimestamp(volunteer.syncedAt || new Date().toISOString())
        };

        return this.toSheetsFormat(transformed, 'volunteer');
    }

    /**
     * Convert volunteer from sheets format
     * @private
     */
    volunteerFromSheetsFormat(sheetsRow) {
        const [id, name, email, committee, created, updated, synced] = sheetsRow;
        
        return {
            id: this.parseId(id),
            name: this.parseText(name),
            email: this.parseEmail(email),
            committee: this.parseText(committee),
            createdAt: this.parseTimestamp(created),
            updatedAt: this.parseTimestamp(updated),
            syncedAt: this.parseTimestamp(synced)
        };
    }

    /**
     * Convert event to sheets format with date and time handling
     * @private
     */
    eventToSheetsFormat(event) {
        const transformed = {
            id: this.sanitizeId(event.id),
            name: this.sanitizeText(event.name),
            date: this.formatEventDate(event.date),
            startTime: this.formatEventTime(event.startTime),
            endTime: this.formatEventTime(event.endTime),
            status: this.sanitizeText(event.status || 'Active'),
            description: this.sanitizeText(event.description || ''),
            createdAt: this.formatTimestamp(event.createdAt),
            updatedAt: this.formatTimestamp(event.updatedAt),
            syncedAt: this.formatTimestamp(event.syncedAt || new Date().toISOString())
        };

        return this.toSheetsFormat(transformed, 'event');
    }

    /**
     * Convert event from sheets format
     * @private
     */
    eventFromSheetsFormat(sheetsRow) {
        const [id, name, date, startTime, endTime, status, description, created, updated, synced] = sheetsRow;
        
        return {
            id: this.parseId(id),
            name: this.parseText(name),
            date: this.parseEventDate(date),
            startTime: this.parseEventTime(startTime),
            endTime: this.parseEventTime(endTime),
            status: this.parseText(status) || 'Active',
            description: this.parseText(description),
            createdAt: this.parseTimestamp(created),
            updatedAt: this.parseTimestamp(updated),
            syncedAt: this.parseTimestamp(synced)
        };
    }

    /**
     * Convert attendance to sheets format with name resolution
     * @private
     */
    attendanceToSheetsFormat(attendance, volunteers = []) {
        // Resolve volunteer name if not provided
        let volunteerName = attendance.volunteerName;
        let committee = attendance.committee;
        
        if (!volunteerName && attendance.volunteerId && volunteers.length > 0) {
            const volunteer = volunteers.find(v => v.id === attendance.volunteerId);
            if (volunteer) {
                volunteerName = volunteer.name;
                committee = volunteer.committee;
            }
        }

        const transformed = {
            id: this.sanitizeId(attendance.id),
            volunteerId: this.sanitizeId(attendance.volunteerId),
            eventId: this.sanitizeId(attendance.eventId),
            volunteerName: this.sanitizeText(volunteerName || 'Unknown'),
            committee: this.sanitizeText(committee || ''),
            date: this.formatEventDate(attendance.date),
            dateTime: this.formatAttendanceDateTime(attendance.dateTime),
            createdAt: this.formatTimestamp(attendance.createdAt),
            updatedAt: this.formatTimestamp(attendance.updatedAt),
            syncedAt: this.formatTimestamp(attendance.syncedAt || new Date().toISOString())
        };

        return this.toSheetsFormat(transformed, 'attendance');
    }

    /**
     * Convert attendance from sheets format
     * @private
     */
    attendanceFromSheetsFormat(sheetsRow) {
        const [id, volunteerId, eventId, volunteerName, committee, date, dateTime, created, updated, synced] = sheetsRow;
        
        return {
            id: this.parseId(id),
            volunteerId: this.parseId(volunteerId),
            eventId: this.parseId(eventId),
            volunteerName: this.parseText(volunteerName),
            committee: this.parseText(committee),
            date: this.parseEventDate(date),
            dateTime: this.parseAttendanceDateTime(dateTime),
            createdAt: this.parseTimestamp(created),
            updatedAt: this.parseTimestamp(updated),
            syncedAt: this.parseTimestamp(synced)
        };
    }

    /**
     * Sanitize and format ID values
     * @private
     */
    sanitizeId(id) {
        if (!id) return '';
        return String(id).trim().replace(/[^\w-]/g, '');
    }

    /**
     * Sanitize text values with special character handling
     * @private
     */
    sanitizeText(text) {
        if (!text) return '';
        
        return String(text)
            .trim()
            .replace(/[\r\n\t]/g, ' ')     // Replace line breaks and tabs
            .replace(/\s+/g, ' ')          // Normalize whitespace
            .replace(/"/g, '""')           // Escape quotes for CSV
            .substring(0, 1000);           // Limit length
    }

    /**
     * Sanitize email addresses
     * @private
     */
    sanitizeEmail(email) {
        if (!email) return '';
        
        const sanitized = String(email).trim().toLowerCase();
        return this.isValidEmail(sanitized) ? sanitized : '';
    }

    /**
     * Format timestamp for sheets
     * @private
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return new Date().toISOString();
        
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                return new Date().toISOString();
            }
            return date.toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    /**
     * Format event date for sheets (YYYY-MM-DD)
     * @private
     */
    formatEventDate(date) {
        if (!date) return '';
        
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return '';
            }
            return dateObj.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    }

    /**
     * Format event time for sheets (HH:MM)
     * @private
     */
    formatEventTime(time) {
        if (!time) return '';
        
        // Handle various time formats
        const timeStr = String(time).trim();
        
        // If already in HH:MM format
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
            const [hours, minutes] = timeStr.split(':');
            return `${hours.padStart(2, '0')}:${minutes}`;
        }
        
        // If in HH:MM:SS format
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) {
            const [hours, minutes] = timeStr.split(':');
            return `${hours.padStart(2, '0')}:${minutes}`;
        }
        
        return timeStr;
    }

    /**
     * Format attendance datetime for sheets
     * @private
     */
    formatAttendanceDateTime(dateTime) {
        if (!dateTime) return new Date().toISOString();
        
        try {
            const date = new Date(dateTime);
            if (isNaN(date.getTime())) {
                return new Date().toISOString();
            }
            return date.toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    /**
     * Parse ID from sheets
     * @private
     */
    parseId(id) {
        return String(id || '').trim();
    }

    /**
     * Parse text from sheets
     * @private
     */
    parseText(text) {
        if (!text) return '';
        
        return String(text)
            .trim()
            .replace(/""/g, '"');  // Unescape quotes
    }

    /**
     * Parse email from sheets
     * @private
     */
    parseEmail(email) {
        const parsed = this.parseText(email).toLowerCase();
        return this.isValidEmail(parsed) ? parsed : '';
    }

    /**
     * Parse timestamp from sheets
     * @private
     */
    parseTimestamp(timestamp) {
        if (!timestamp) return new Date().toISOString();
        
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                return new Date().toISOString();
            }
            return date.toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    /**
     * Parse event date from sheets
     * @private
     */
    parseEventDate(date) {
        if (!date) return '';
        
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return '';
            }
            return dateObj.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    }

    /**
     * Parse event time from sheets
     * @private
     */
    parseEventTime(time) {
        if (!time) return '';
        
        const timeStr = String(time).trim();
        
        // Handle HH:MM format
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
            const [hours, minutes] = timeStr.split(':');
            return `${hours.padStart(2, '0')}:${minutes}`;
        }
        
        return timeStr;
    }

    /**
     * Parse attendance datetime from sheets
     * @private
     */
    parseAttendanceDateTime(dateTime) {
        return this.parseTimestamp(dateTime);
    }

    /**
     * Batch transform multiple records
     * @param {Array} data - Array of data objects
     * @param {string} type - Data type
     * @param {string} direction - 'toSheets' or 'fromSheets'
     * @param {Array} volunteers - Optional volunteers for attendance name resolution
     * @returns {Array} Transformed data array
     */
    batchTransform(data, type, direction = 'toSheets', volunteers = []) {
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array for batch transformation');
        }

        return data.map((item, index) => {
            try {
                switch (type) {
                    case 'volunteer':
                        return this.transformVolunteerData(item, direction);
                    case 'event':
                        return this.transformEventData(item, direction);
                    case 'attendance':
                        return this.transformAttendanceData(item, direction, volunteers);
                    default:
                        throw new Error(`Unknown data type: ${type}`);
                }
            } catch (error) {
                console.warn(`Batch transform error at index ${index}:`, error.message);
                return null;
            }
        }).filter(item => item !== null);
    }

    /**
     * Create sample data for testing
     * @param {string} type - Data type
     * @returns {Object} Sample data object
     */
    createSampleData(type) {
        const now = new Date().toISOString();
        const today = new Date().toISOString().split('T')[0];

        switch (type) {
            case 'volunteer':
                return {
                    id: 'V' + Date.now(),
                    name: 'Sample Volunteer',
                    email: 'volunteer@example.com',
                    committee: 'Teaching',
                    createdAt: now,
                    updatedAt: now,
                    syncedAt: now
                };

            case 'event':
                return {
                    id: 'E' + Date.now(),
                    name: 'Sample Event',
                    date: today,
                    startTime: '10:00',
                    endTime: '12:00',
                    status: 'Active',
                    description: 'Sample event description',
                    createdAt: now,
                    updatedAt: now,
                    syncedAt: now
                };

            case 'attendance':
                return {
                    id: 'A' + Date.now(),
                    volunteerId: 'V123',
                    eventId: 'E456',
                    volunteerName: 'Sample Volunteer',
                    committee: 'Teaching',
                    date: today,
                    dateTime: now,
                    createdAt: now,
                    updatedAt: now,
                    syncedAt: now
                };

            default:
                throw new Error(`Unknown data type: ${type}`);
        }
    }

    /**
     * Comprehensive Data Validation System
     */

    /**
     * Validate data integrity for all data types
     * @param {Object|Array} data - Data to validate
     * @param {string} type - Data type
     * @param {Object} options - Validation options
     * @returns {Object} Validation result with errors and warnings
     */
    validateDataIntegrity(data, type, options = {}) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            validatedData: null
        };

        try {
            // Handle array of data
            if (Array.isArray(data)) {
                return this.validateDataArray(data, type, options);
            }

            // Validate single data object
            this.validateRequiredFields(data, type, result);
            this.validateFieldTypes(data, type, result);
            this.validateFieldConstraints(data, type, result);
            this.validateBusinessRules(data, type, result, options);

            // If validation passed, store the validated data
            if (result.errors.length === 0) {
                result.validatedData = this.sanitizeValidatedData(data, type);
            } else {
                result.isValid = false;
                
                // Handle validation errors through ErrorHandler
                if (window.ErrorHandler && options.useErrorHandler !== false) {
                    this.handleValidationErrors(result, type, data, options);
                }
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`Validation error: ${error.message}`);
            
            // Handle critical validation errors
            if (window.ErrorHandler && options.useErrorHandler !== false) {
                window.ErrorHandler.handleError(error, {
                    component: 'DataTransformer',
                    operation: 'data_validation',
                    dataType: type,
                    data: data
                });
            }
        }

        return result;
    }

    /**
     * Handle validation errors through ErrorHandler
     */
    handleValidationErrors(validationResult, type, data, options) {
        const error = new Error(`Data validation failed for ${type}: ${validationResult.errors.join(', ')}`);
        
        window.ErrorHandler.handleError(error, {
            component: 'DataTransformer',
            operation: 'data_validation',
            dataType: type,
            validationErrors: validationResult.errors,
            validationWarnings: validationResult.warnings,
            data: data,
            context: options.context || {}
        });
    }

    /**
     * Validate array of data objects
     * @private
     */
    validateDataArray(dataArray, type, options) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            validatedData: [],
            itemResults: []
        };

        dataArray.forEach((item, index) => {
            const itemResult = this.validateDataIntegrity(item, type, options);
            result.itemResults.push(itemResult);

            if (!itemResult.isValid) {
                result.isValid = false;
                result.errors.push(`Item ${index + 1}: ${itemResult.errors.join(', ')}`);
            } else {
                result.validatedData.push(itemResult.validatedData);
            }

            result.warnings.push(...itemResult.warnings.map(w => `Item ${index + 1}: ${w}`));
        });

        return result;
    }

    /**
     * Validate required fields
     * @private
     */
    validateRequiredFields(data, type, result) {
        const required = this.requiredFields[type];
        
        for (const field of required) {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                result.errors.push(`Missing required field: ${field}`);
            }
        }

        // Additional required field checks based on type
        switch (type) {
            case 'volunteer':
                if (data.email && !this.isValidEmail(data.email)) {
                    result.errors.push('Invalid email format');
                }
                break;

            case 'event':
                if (!data.startTime || !data.endTime) {
                    result.warnings.push('Event times not specified');
                }
                break;

            case 'attendance':
                if (!data.volunteerName && !data.volunteerId) {
                    result.errors.push('Either volunteerName or volunteerId must be provided');
                }
                break;
        }
    }

    /**
     * Validate field types
     * @private
     */
    validateFieldTypes(data, type, result) {
        const typeValidations = {
            volunteer: {
                id: 'string',
                name: 'string',
                email: 'string',
                committee: 'string'
            },
            event: {
                id: 'string',
                name: 'string',
                date: 'date',
                startTime: 'time',
                endTime: 'time',
                status: 'string'
            },
            attendance: {
                id: 'string',
                volunteerId: 'string',
                eventId: 'string',
                date: 'date',
                dateTime: 'datetime'
            }
        };

        const validations = typeValidations[type];
        
        for (const [field, expectedType] of Object.entries(validations)) {
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                if (!this.validateFieldType(data[field], expectedType)) {
                    result.errors.push(`Invalid ${expectedType} format for field: ${field}`);
                }
            }
        }
    }

    /**
     * Validate individual field type
     * @private
     */
    validateFieldType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'date':
                return this.isValidDate(value);
            case 'time':
                return this.isValidTime(value);
            case 'datetime':
                return this.isValidDateTime(value);
            case 'email':
                return this.isValidEmail(value);
            default:
                return true;
        }
    }

    /**
     * Validate field constraints
     * @private
     */
    validateFieldConstraints(data, type, result) {
        // Length constraints
        const lengthConstraints = {
            volunteer: {
                name: { min: 1, max: 100 },
                email: { min: 5, max: 255 },
                committee: { max: 50 }
            },
            event: {
                name: { min: 1, max: 200 },
                description: { max: 1000 },
                status: { max: 20 }
            },
            attendance: {
                volunteerName: { min: 1, max: 100 }
            }
        };

        const constraints = lengthConstraints[type];
        
        for (const [field, constraint] of Object.entries(constraints)) {
            if (data[field]) {
                const value = String(data[field]);
                
                if (constraint.min && value.length < constraint.min) {
                    result.errors.push(`Field ${field} is too short (minimum ${constraint.min} characters)`);
                }
                
                if (constraint.max && value.length > constraint.max) {
                    result.errors.push(`Field ${field} is too long (maximum ${constraint.max} characters)`);
                }
            }
        }

        // Special constraints
        this.validateSpecialConstraints(data, type, result);
    }

    /**
     * Validate special constraints
     * @private
     */
    validateSpecialConstraints(data, type, result) {
        switch (type) {
            case 'event':
                // Validate start time is before end time
                if (data.startTime && data.endTime) {
                    if (!this.isTimeRangeValid(data.startTime, data.endTime)) {
                        result.errors.push('Start time must be before end time');
                    }
                }
                
                // Validate event date is not too far in the past
                if (data.date) {
                    const eventDate = new Date(data.date);
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                    
                    if (eventDate < oneYearAgo) {
                        result.warnings.push('Event date is more than one year in the past');
                    }
                }
                break;

            case 'attendance':
                // Validate attendance date matches event date if provided
                if (data.date && data.eventDate && data.date !== data.eventDate) {
                    result.warnings.push('Attendance date does not match event date');
                }
                
                // Validate attendance is not in the future
                if (data.dateTime) {
                    const attendanceTime = new Date(data.dateTime);
                    const now = new Date();
                    
                    if (attendanceTime > now) {
                        result.warnings.push('Attendance time is in the future');
                    }
                }
                break;
        }
    }

    /**
     * Validate business rules
     * @private
     */
    validateBusinessRules(data, type, result, options) {
        // Cross-reference validation if related data is provided
        if (options.volunteers && type === 'attendance') {
            this.validateAttendanceReferences(data, options.volunteers, result);
        }

        if (options.events && type === 'attendance') {
            this.validateAttendanceEventReference(data, options.events, result);
        }

        // Duplicate detection
        if (options.existingData) {
            this.validateDuplicates(data, type, options.existingData, result);
        }
    }

    /**
     * Validate attendance references to volunteers
     * @private
     */
    validateAttendanceReferences(attendance, volunteers, result) {
        if (attendance.volunteerId) {
            const volunteer = volunteers.find(v => v.id === attendance.volunteerId);
            if (!volunteer) {
                result.errors.push(`Volunteer with ID ${attendance.volunteerId} not found`);
            } else {
                // Check if volunteer name matches
                if (attendance.volunteerName && attendance.volunteerName !== volunteer.name) {
                    result.warnings.push('Volunteer name does not match volunteer ID');
                }
            }
        }
    }

    /**
     * Validate attendance event references
     * @private
     */
    validateAttendanceEventReference(attendance, events, result) {
        if (attendance.eventId) {
            const event = events.find(e => e.id === attendance.eventId);
            if (!event) {
                result.errors.push(`Event with ID ${attendance.eventId} not found`);
            } else {
                // Check if attendance date matches event date
                if (attendance.date && attendance.date !== event.date) {
                    result.warnings.push('Attendance date does not match event date');
                }
            }
        }
    }

    /**
     * Validate for duplicates
     * @private
     */
    validateDuplicates(data, type, existingData, result) {
        const duplicate = existingData.find(existing => {
            switch (type) {
                case 'volunteer':
                    return existing.email === data.email || existing.id === data.id;
                case 'event':
                    return existing.id === data.id || 
                           (existing.name === data.name && existing.date === data.date);
                case 'attendance':
                    return existing.id === data.id ||
                           (existing.volunteerId === data.volunteerId && 
                            existing.eventId === data.eventId);
                default:
                    return existing.id === data.id;
            }
        });

        if (duplicate) {
            result.warnings.push(`Potential duplicate ${type} detected`);
        }
    }

    /**
     * Validate time range
     * @private
     */
    isTimeRangeValid(startTime, endTime) {
        try {
            const start = this.parseTimeToMinutes(startTime);
            const end = this.parseTimeToMinutes(endTime);
            return start < end;
        } catch (error) {
            return false;
        }
    }

    /**
     * Parse time to minutes for comparison
     * @private
     */
    parseTimeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Sanitize validated data
     * @private
     */
    sanitizeValidatedData(data, type) {
        const sanitized = { ...data };

        // Apply type-specific sanitization
        switch (type) {
            case 'volunteer':
                sanitized.name = this.sanitizeText(sanitized.name);
                sanitized.email = this.sanitizeEmail(sanitized.email);
                sanitized.committee = this.sanitizeText(sanitized.committee);
                break;

            case 'event':
                sanitized.name = this.sanitizeText(sanitized.name);
                sanitized.description = this.sanitizeText(sanitized.description);
                sanitized.status = this.sanitizeText(sanitized.status);
                break;

            case 'attendance':
                sanitized.volunteerName = this.sanitizeText(sanitized.volunteerName);
                sanitized.committee = this.sanitizeText(sanitized.committee);
                break;
        }

        // Ensure timestamps are properly formatted
        const timestampFields = ['createdAt', 'updatedAt', 'syncedAt'];
        timestampFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = this.formatTimestamp(sanitized[field]);
            }
        });

        return sanitized;
    }

    /**
     * Create validation report
     * @param {Array} validationResults - Array of validation results
     * @returns {Object} Comprehensive validation report
     */
    createValidationReport(validationResults) {
        const report = {
            totalItems: validationResults.length,
            validItems: 0,
            invalidItems: 0,
            totalErrors: 0,
            totalWarnings: 0,
            errorSummary: {},
            warningSummary: {},
            details: validationResults
        };

        validationResults.forEach(result => {
            if (result.isValid) {
                report.validItems++;
            } else {
                report.invalidItems++;
            }

            report.totalErrors += result.errors.length;
            report.totalWarnings += result.warnings.length;

            // Categorize errors
            result.errors.forEach(error => {
                const category = this.categorizeError(error);
                report.errorSummary[category] = (report.errorSummary[category] || 0) + 1;
            });

            // Categorize warnings
            result.warnings.forEach(warning => {
                const category = this.categorizeWarning(warning);
                report.warningSummary[category] = (report.warningSummary[category] || 0) + 1;
            });
        });

        return report;
    }

    /**
     * Categorize error messages
     * @private
     */
    categorizeError(error) {
        if (error.includes('required field')) return 'Missing Required Fields';
        if (error.includes('Invalid') && error.includes('format')) return 'Format Errors';
        if (error.includes('too short') || error.includes('too long')) return 'Length Constraints';
        if (error.includes('not found')) return 'Reference Errors';
        return 'Other Errors';
    }

    /**
     * Categorize warning messages
     * @private
     */
    categorizeWarning(warning) {
        if (warning.includes('duplicate')) return 'Potential Duplicates';
        if (warning.includes('does not match')) return 'Data Inconsistencies';
        if (warning.includes('future') || warning.includes('past')) return 'Date/Time Issues';
        return 'Other Warnings';
    }

    /**
     * Get validation rules for a data type
     * @param {string} type - Data type
     * @returns {Object} Validation rules
     */
    getValidationRules(type) {
        return {
            requiredFields: this.requiredFields[type] || [],
            fieldMappings: this.fieldMappings[type] || {},
            constraints: this.getConstraintsForType(type)
        };
    }

    /**
     * Get constraints for a specific data type
     * @private
     */
    getConstraintsForType(type) {
        const constraints = {
            volunteer: {
                name: { required: true, minLength: 1, maxLength: 100 },
                email: { required: false, format: 'email', maxLength: 255 },
                committee: { required: false, maxLength: 50 }
            },
            event: {
                name: { required: true, minLength: 1, maxLength: 200 },
                date: { required: true, format: 'date' },
                startTime: { required: false, format: 'time' },
                endTime: { required: false, format: 'time' },
                description: { required: false, maxLength: 1000 }
            },
            attendance: {
                volunteerId: { required: true },
                eventId: { required: true },
                date: { required: true, format: 'date' },
                dateTime: { required: false, format: 'datetime' }
            }
        };

        return constraints[type] || {};
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataTransformer;
} else if (typeof window !== 'undefined') {
    window.DataTransformer = new DataTransformer();
    window.DataTransformerClass = DataTransformer;
}
