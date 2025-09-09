/**
 * Utility functions for the Volunteer Attendance Tracker
 */

// Date and time utilities
const DateUtils = {
    /**
     * Format a date for display
     * @param {Date} date - The date to format
     * @param {string} format - Format type: 'short', 'long', 'time'
     * @returns {string} Formatted date string
     */
    format(date, format = 'short') {
        if (!date) return '';
        
        const options = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            datetime: { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit' 
            }
        };

        return new Intl.DateTimeFormat('en-US', options[format]).format(date);
    },

    /**
     * Get the start of today
     * @returns {Date} Start of today
     */
    getStartOfToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    },

    /**
     * Get the end of today
     * @returns {Date} End of today
     */
    getEndOfToday() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return today;
    },

    /**
     * Check if a date is today
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is today
     */
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
};

// DOM utilities
const DOMUtils = {
    /**
     * Get element by ID with error handling
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null
     */
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    /**
     * Show element
     * @param {HTMLElement|string} element - Element or ID
     */
    show(element) {
        const el = typeof element === 'string' ? this.getElementById(element) : element;
        if (el) {
            el.style.display = '';
            el.classList.remove('hidden');
        }
    },

    /**
     * Hide element
     * @param {HTMLElement|string} element - Element or ID
     */
    hide(element) {
        const el = typeof element === 'string' ? this.getElementById(element) : element;
        if (el) {
            el.style.display = 'none';
            el.classList.add('hidden');
        }
    },

    /**
     * Toggle element visibility
     * @param {HTMLElement|string} element - Element or ID
     */
    toggle(element) {
        const el = typeof element === 'string' ? this.getElementById(element) : element;
        if (el) {
            if (el.style.display === 'none' || el.classList.contains('hidden')) {
                this.show(el);
            } else {
                this.hide(el);
            }
        }
    },

    /**
     * Add class to element
     * @param {HTMLElement|string} element - Element or ID
     * @param {string} className - Class name to add
     */
    addClass(element, className) {
        const el = typeof element === 'string' ? this.getElementById(element) : element;
        if (el) {
            el.classList.add(className);
        }
    },

    /**
     * Remove class from element
     * @param {HTMLElement|string} element - Element or ID
     * @param {string} className - Class name to remove
     */
    removeClass(element, className) {
        const el = typeof element === 'string' ? this.getElementById(element) : element;
        if (el) {
            el.classList.remove(className);
        }
    },

    /**
     * Create element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string} content - Inner HTML content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'dataset') {
                Object.keys(attributes[key]).forEach(dataKey => {
                    element.dataset[dataKey] = attributes[key][dataKey];
                });
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        if (content) {
            element.innerHTML = content;
        }

        return element;
    }
};

// Validation utilities
const ValidationUtils = {
    /**
     * Validate volunteer ID format
     * @param {string} id - Volunteer ID to validate
     * @returns {boolean} True if valid
     */
    isValidVolunteerId(id) {
        if (!id || typeof id !== 'string') {
            console.log('Validation failed: ID is not a string or is empty', id);
            return false;
        }
        
        const trimmedId = id.trim();
        
        // Allow alphanumeric IDs, 1-20 characters (more flexible)
        // Common formats: V001, VOLUNTEER123, ABC123, 12345, etc.
        const pattern = /^[A-Za-z0-9]{1,20}$/;
        const isValid = pattern.test(trimmedId);
        
        console.log('ID validation:', {
            original: id,
            trimmed: trimmedId,
            length: trimmedId.length,
            pattern: pattern.toString(),
            isValid: isValid
        });
        
        return isValid;
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email.trim());
    },

    /**
     * Sanitize string input
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeString(input) {
        if (!input || typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .substring(0, 255); // Limit length
    }
};

// Event utilities
const EventUtils = {
    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Storage utilities
const StorageUtils = {
    /**
     * Get item from localStorage with JSON parsing
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Parsed value or default
     */
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error getting item from localStorage: ${key}`, error);
            return defaultValue;
        }
    },

    /**
     * Set item in localStorage with JSON stringification
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} True if successful
     */
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error setting item in localStorage: ${key}`, error);
            return false;
        }
    },

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} True if successful
     */
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing item from localStorage: ${key}`, error);
            return false;
        }
    }
};

// Export utilities for use in other modules
window.Utils = {
    Date: DateUtils,
    DOM: DOMUtils,
    Validation: ValidationUtils,
    Event: EventUtils,
    Storage: StorageUtils
};