/**
 * Scanner input handling for the Volunteer Attendance Tracker
 * Handles USB barcode scanners and keyboard input
 */

class ScannerManager {
    constructor() {
        this.scannerInput = null;
        this.scanFeedback = null;
        this.isProcessing = false;
        this.scanTimeout = null;
        this.scanBuffer = '';
        this.scanTimeoutDuration = 100; // ms between characters for scanner detection
        
        this.init();
    }

    /**
     * Initialize scanner manager
     */
    init() {
        this.scannerInput = Utils.DOM.getElementById('scannerInput');
        this.scanFeedback = Utils.DOM.getElementById('scanFeedback');

        if (this.scannerInput) {
            // Disable input until storage is ready
            this.scannerInput.disabled = true;
            this.scannerInput.placeholder = 'System initializing...';
            
            this.setupEventListeners();
            this.waitForStorageAndEnable();
        }
    }

    /**
     * Wait for storage to be ready and enable input
     */
    async waitForStorageAndEnable() {
        try {
            // Wait for storage manager
            let attempts = 0;
            while (!window.StorageManager || !window.StorageManager.db) {
                if (attempts > 100) { // 10 seconds max
                    throw new Error('Storage initialization timeout');
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            // Enable input
            if (this.scannerInput) {
                this.scannerInput.disabled = false;
                this.scannerInput.placeholder = 'Scan badge or enter volunteer ID...';
                this.focusInput();
            }

            console.log('Scanner ready for input');
        } catch (error) {
            console.error('Scanner initialization failed:', error);
            if (this.scannerInput) {
                this.scannerInput.placeholder = 'System initialization failed - please refresh';
            }
        }
    }

    /**
     * Setup event listeners for scanner input
     */
    setupEventListeners() {
        // Handle input events
        this.scannerInput.addEventListener('input', this.handleInput.bind(this));
        this.scannerInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.scannerInput.addEventListener('paste', this.handlePaste.bind(this));
        
        // Keep focus on scanner input
        this.scannerInput.addEventListener('blur', () => {
            setTimeout(() => this.focusInput(), 100);
        });

        // Handle clear input button
        const clearInputBtn = Utils.DOM.getElementById('clearInputBtn');
        if (clearInputBtn) {
            clearInputBtn.addEventListener('click', () => {
                this.clearInput();
                this.clearFeedback();
                this.focusInput();
            });
        }

        // Handle scanner test button
        const scannerTestBtn = Utils.DOM.getElementById('scannerTestBtn');
        if (scannerTestBtn) {
            scannerTestBtn.addEventListener('click', () => {
                this.testScanner();
            });
        }

        // Handle clicks elsewhere to refocus
        document.addEventListener('click', (event) => {
            // Don't refocus if clicking on modal or input elements
            if (event.target.closest('.modal-overlay') || 
                event.target.closest('.scanner-input-container') ||
                event.target.tagName === 'INPUT' ||
                event.target.tagName === 'TEXTAREA' ||
                event.target.tagName === 'BUTTON') {
                return;
            }
            this.focusInput();
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.focusInput();
            }
        });
    }

    /**
     * Handle input events with enhanced scanner detection
     */
    handleInput(event) {
        const value = event.target.value;
        const currentTime = Date.now();
        
        // Track input timing for scanner detection
        if (!this.inputStartTime) {
            this.inputStartTime = currentTime;
        }
        
        // Clear any existing timeout
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }

        // Detect if this is likely scanner input based on speed and length
        const inputDuration = currentTime - this.inputStartTime;
        const isLikelyScanner = this.detectScannerInput(value, inputDuration);

        if (isLikelyScanner) {
            // Scanner input detected - process quickly
            this.scanTimeout = setTimeout(() => {
                this.processScan(value);
                this.inputStartTime = null;
            }, 100); // Quick processing for scanner
        } else {
            // Manual input - wait longer or require Enter key
            if (value.length >= 3) {
                this.scanTimeout = setTimeout(() => {
                    // Only auto-process if input hasn't changed (user stopped typing)
                    if (this.scannerInput.value === value && value.length >= 3) {
                        this.processScan(value);
                        this.inputStartTime = null;
                    }
                }, 2000); // 2 seconds for manual input
            }
        }

        // Show real-time validation feedback for manual input
        if (!isLikelyScanner && value.length > 0) {
            this.showInputValidationFeedback(value);
        }
    }

    /**
     * Detect if input is likely from a scanner based on timing and characteristics
     */
    detectScannerInput(value, inputDuration) {
        // Scanner characteristics:
        // 1. Fast input (typically < 500ms for full input)
        // 2. Longer strings (usually 5+ characters)
        // 3. No pauses in typing
        
        const isFastInput = inputDuration < 500 && value.length >= 5;
        const isLongInput = value.length >= 10; // Very long inputs are almost certainly scanner
        const hasTypicalScannerLength = value.length >= 5 && value.length <= 20;
        
        return isFastInput || isLongInput || (hasTypicalScannerLength && inputDuration < 1000);
    }

    /**
     * Show real-time input validation feedback
     */
    showInputValidationFeedback(value) {
        const validation = this.validateVolunteerIdFormat(value);
        
        if (!validation.isValid && value.length >= 3) {
            // Show validation error for longer inputs
            this.showFeedback('warning', `⚠️ ${validation.error}`);
        } else if (validation.isValid && value.length >= 3) {
            // Show that format is valid
            this.showFeedback('info', '✓ Valid ID format - press Enter to scan');
        }
    }

    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        // Handle Enter key for manual input
        if (event.key === 'Enter') {
            event.preventDefault();
            const value = this.scannerInput.value.trim();
            if (value) {
                this.processScan(value);
            }
        }

        // Handle Escape key to clear input
        if (event.key === 'Escape') {
            this.clearInput();
            this.clearFeedback();
        }
    }

    /**
     * Handle paste events
     */
    handlePaste(event) {
        event.preventDefault();
        const pastedData = (event.clipboardData || window.clipboardData).getData('text');
        const cleanData = pastedData.trim();
        
        if (cleanData) {
            this.scannerInput.value = cleanData;
            setTimeout(() => this.processScan(cleanData), 50);
        }
    }

    /**
     * Process scanned volunteer ID with comprehensive validation
     */
    async processScan(volunteerId) {
        if (this.isProcessing) {
            console.log('Scan already in progress, ignoring duplicate');
            return;
        }

        this.isProcessing = true;
        const originalId = volunteerId;
        const cleanId = this.sanitizeVolunteerId(volunteerId);

        try {
            // Check if storage manager is ready
            if (!window.StorageManager || !window.StorageManager.db) {
                throw new Error('System is still initializing. Please wait a moment and try again.');
            }

            // Show processing feedback
            this.showFeedback('processing', '⏳ Processing scan...');

            // Debug logging
            console.log('Processing scan:', {
                original: originalId,
                cleaned: cleanId,
                length: cleanId.length,
                isString: typeof cleanId === 'string'
            });

            // Step 1: Validate ID format
            const formatValidation = this.validateVolunteerIdFormat(cleanId);
            if (!formatValidation.isValid) {
                throw new Error(`Invalid volunteer ID format: ${formatValidation.error}`);
            }

            console.log('ID format validation passed for:', cleanId);

            // Step 2: Get volunteer from local directory
            const volunteer = await this.getVolunteerFromDirectory(cleanId);
            if (!volunteer) {
                // Try alternative ID formats if initial lookup fails
                const alternativeVolunteer = await this.tryAlternativeIdFormats(cleanId);
                if (!alternativeVolunteer) {
                    throw new Error(`Volunteer ID "${cleanId}" not found in directory`);
                }
                // Use the found volunteer
                Object.assign(volunteer, alternativeVolunteer);
            }

            // Step 3: Validate volunteer status
            if (volunteer.status !== 'Active') {
                throw new Error(`Volunteer ${volunteer.name} is ${volunteer.status.toLowerCase()} and cannot check in`);
            }

            // Step 4: Get current event
            const currentEvent = await this.getCurrentEvent();
            if (!currentEvent) {
                throw new Error('No active event found for today');
            }

            // Step 5: Check for duplicate scan (same volunteer, same event)
            const duplicateCheck = await this.checkForDuplicateAttendance(volunteer.id, currentEvent.eventId);
            if (duplicateCheck.isDuplicate) {
                const timeSinceLastScan = duplicateCheck.timeSinceLastScan;
                const timeString = this.formatTimeDifference(timeSinceLastScan);
                throw new Error(`${volunteer.name} already checked in ${timeString} ago`);
            }

            // Step 6: Record attendance
            const attendanceRecord = {
                volunteerId: volunteer.id,
                eventId: currentEvent.eventId,
                eventName: currentEvent.eventName,
                committee: volunteer.committee,
                volunteerName: volunteer.name,
                scannerUsed: this.getScannerIdentifier()
            };

            await window.StorageManager.recordAttendance(attendanceRecord);

            // Step 7: Show success feedback with detailed information
            const successMessage = `✓ ${volunteer.name} (${volunteer.committee}) checked in successfully`;
            this.showFeedback('success', successMessage);

            // Step 8: Update dashboard and statistics
            if (window.App && window.App.updateDashboard) {
                window.App.updateDashboard();
            }

            // Step 9: Play success sound
            this.playSound('success');

            // Step 10: Log successful scan
            console.log('Scan processed successfully:', {
                volunteerId: volunteer.id,
                volunteerName: volunteer.name,
                eventId: currentEvent.eventId,
                eventName: currentEvent.eventName,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Scan processing error:', error);
            
            // Categorize error for better user feedback
            const errorCategory = this.categorizeError(error);
            const userFriendlyMessage = this.getUserFriendlyErrorMessage(error, errorCategory);
            
            this.showFeedback('error', `✗ ${userFriendlyMessage}`);
            this.playSound('error');

            // Log error details for debugging
            console.error('Detailed scan error:', {
                originalId,
                cleanId,
                errorMessage: error.message,
                errorCategory,
                timestamp: new Date().toISOString()
            });

        } finally {
            this.clearInput();
            this.isProcessing = false;
            
            // Refocus input after a short delay
            setTimeout(() => this.focusInput(), 500);
        }
    }

    /**
     * Sanitize volunteer ID input
     */
    sanitizeVolunteerId(id) {
        if (!id || typeof id !== 'string') {
            return '';
        }
        
        // Remove common scanner artifacts and normalize
        return id
            .trim()
            .toUpperCase()
            .replace(/[\r\n\t]/g, '') // Remove line breaks and tabs
            .replace(/[^\w\-]/g, '') // Keep only alphanumeric, underscore, and hyphen
            .substring(0, 50); // Limit length to prevent abuse
    }

    /**
     * Validate volunteer ID format with detailed feedback
     */
    validateVolunteerIdFormat(id) {
        if (!id || typeof id !== 'string') {
            return {
                isValid: false,
                error: 'ID is required and must be a string'
            };
        }

        const trimmedId = id.trim();
        
        if (trimmedId.length === 0) {
            return {
                isValid: false,
                error: 'ID cannot be empty'
            };
        }

        if (trimmedId.length < 1) {
            return {
                isValid: false,
                error: 'ID is too short (minimum 1 character)'
            };
        }

        if (trimmedId.length > 20) {
            return {
                isValid: false,
                error: 'ID is too long (maximum 20 characters)'
            };
        }

        // Allow alphanumeric characters, hyphens, and underscores
        const pattern = /^[A-Za-z0-9\-_]+$/;
        if (!pattern.test(trimmedId)) {
            return {
                isValid: false,
                error: 'ID contains invalid characters (only letters, numbers, hyphens, and underscores allowed)'
            };
        }

        return {
            isValid: true,
            error: null
        };
    }

    /**
     * Get volunteer from local directory with enhanced lookup
     */
    async getVolunteerFromDirectory(id) {
        try {
            // Direct lookup first
            let volunteer = await window.StorageManager.getVolunteer(id);
            if (volunteer) {
                return volunteer;
            }

            // If not found, try case-insensitive search
            const allVolunteers = await window.StorageManager.getAllVolunteers();
            volunteer = allVolunteers.find(v => v.id.toUpperCase() === id.toUpperCase());
            
            return volunteer || null;
        } catch (error) {
            console.error('Error getting volunteer from directory:', error);
            throw new Error('Failed to access volunteer directory');
        }
    }

    /**
     * Try alternative ID formats if initial lookup fails
     */
    async tryAlternativeIdFormats(originalId) {
        const alternatives = [
            originalId.toLowerCase(),
            `V${originalId}`, // Add V prefix
            originalId.replace(/^V/i, ''), // Remove V prefix
            originalId.padStart(3, '0'), // Pad with zeros
            originalId.replace(/^0+/, '') // Remove leading zeros
        ];

        for (const altId of alternatives) {
            if (altId !== originalId) {
                try {
                    const volunteer = await this.getVolunteerFromDirectory(altId);
                    if (volunteer) {
                        console.log(`Found volunteer using alternative format: ${originalId} -> ${altId}`);
                        return volunteer;
                    }
                } catch (error) {
                    // Continue trying other formats
                    continue;
                }
            }
        }

        return null;
    }

    /**
     * Check for duplicate attendance with timing information
     */
    async checkForDuplicateAttendance(volunteerId, eventId) {
        try {
            const existingAttendance = await window.StorageManager.getAttendanceByVolunteerAndEvent(volunteerId, eventId);
            
            if (existingAttendance && existingAttendance.length > 0) {
                const lastAttendance = existingAttendance[existingAttendance.length - 1];
                const lastScanTime = new Date(lastAttendance.dateTime);
                const now = new Date();
                const timeDifference = now - lastScanTime;

                return {
                    isDuplicate: true,
                    lastScanTime,
                    timeSinceLastScan: timeDifference,
                    attendanceRecord: lastAttendance
                };
            }

            return {
                isDuplicate: false,
                lastScanTime: null,
                timeSinceLastScan: 0,
                attendanceRecord: null
            };
        } catch (error) {
            console.error('Error checking for duplicate attendance:', error);
            // If we can't check, assume no duplicate to avoid blocking valid scans
            return {
                isDuplicate: false,
                lastScanTime: null,
                timeSinceLastScan: 0,
                attendanceRecord: null
            };
        }
    }

    /**
     * Format time difference for user display
     */
    formatTimeDifference(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Get scanner identifier for logging
     */
    getScannerIdentifier() {
        // Try to identify the scanner type based on input characteristics
        // This is a simple heuristic and could be enhanced
        return `Scanner_${new Date().getTime()}`;
    }

    /**
     * Categorize errors for better handling
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('not found') || message.includes('directory')) {
            return 'VOLUNTEER_NOT_FOUND';
        } else if (message.includes('already checked in') || message.includes('duplicate')) {
            return 'DUPLICATE_SCAN';
        } else if (message.includes('invalid') || message.includes('format')) {
            return 'INVALID_FORMAT';
        } else if (message.includes('not active') || message.includes('inactive') || message.includes('suspended')) {
            return 'VOLUNTEER_INACTIVE';
        } else if (message.includes('no active event') || message.includes('event')) {
            return 'NO_EVENT';
        } else if (message.includes('initializing') || message.includes('storage')) {
            return 'SYSTEM_NOT_READY';
        } else {
            return 'UNKNOWN_ERROR';
        }
    }

    /**
     * Get user-friendly error messages
     */
    getUserFriendlyErrorMessage(error, category) {
        switch (category) {
            case 'VOLUNTEER_NOT_FOUND':
                return 'Volunteer ID not found. Please check the ID and try again.';
            case 'DUPLICATE_SCAN':
                return error.message; // Already user-friendly
            case 'INVALID_FORMAT':
                return 'Invalid ID format. Please scan a valid volunteer badge.';
            case 'VOLUNTEER_INACTIVE':
                return error.message; // Already includes volunteer name and status
            case 'NO_EVENT':
                return 'No active event found. Please contact an administrator.';
            case 'SYSTEM_NOT_READY':
                return 'System is still loading. Please wait a moment and try again.';
            default:
                return 'Scan failed. Please try again or contact support.';
        }
    }

    /**
     * Get current active event
     */
    async getCurrentEvent() {
        // For now, return today's event
        const today = new Date();
        const todayEventId = `E${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        
        return await window.StorageManager.getEvent(todayEventId);
    }

    /**
     * Show scan feedback with enhanced visual and accessibility features
     */
    showFeedback(type, message) {
        if (!this.scanFeedback) return;

        // Clear any existing timeout
        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
        }

        // Clear existing classes and content
        this.scanFeedback.className = 'scan-feedback';
        this.scanFeedback.textContent = message;

        // Add appropriate class
        this.scanFeedback.classList.add(type);

        // Update scanner status indicator
        this.updateScannerStatus(type, message);

        // Set ARIA live region for screen readers
        this.scanFeedback.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        // Auto-hide based on message type
        const hideDelay = this.getFeedbackHideDelay(type);
        this.feedbackTimeout = setTimeout(() => {
            this.clearFeedback();
        }, hideDelay);

        // Log feedback for debugging
        console.log(`Scanner feedback [${type}]: ${message}`);
    }

    /**
     * Get appropriate hide delay based on feedback type
     */
    getFeedbackHideDelay(type) {
        switch (type) {
            case 'processing':
                return 1000; // Short delay for processing messages
            case 'success':
                return 3000; // Standard delay for success
            case 'error':
                return 5000; // Longer delay for errors so users can read them
            case 'info':
                return 4000; // Medium delay for info messages
            default:
                return 3000;
        }
    }

    /**
     * Update scanner status indicator
     */
    updateScannerStatus(type, message) {
        const statusIndicator = document.querySelector('.scanner-indicator');
        const statusText = document.querySelector('.scanner-text');

        if (statusIndicator && statusText) {
            // Remove existing status classes
            statusIndicator.className = 'scanner-indicator';
            
            // Add new status class
            switch (type) {
                case 'processing':
                    statusIndicator.classList.add('processing');
                    statusText.textContent = 'Processing...';
                    break;
                case 'success':
                    statusIndicator.classList.add('success');
                    statusText.textContent = 'Scan successful';
                    // Reset to ready after delay
                    setTimeout(() => {
                        statusIndicator.className = 'scanner-indicator ready';
                        statusText.textContent = 'Ready to scan';
                    }, 2000);
                    break;
                case 'error':
                    statusIndicator.classList.add('error');
                    statusText.textContent = 'Scan failed';
                    // Reset to ready after delay
                    setTimeout(() => {
                        statusIndicator.className = 'scanner-indicator ready';
                        statusText.textContent = 'Ready to scan';
                    }, 3000);
                    break;
                default:
                    statusIndicator.classList.add('ready');
                    statusText.textContent = 'Ready to scan';
            }
        }
    }

    /**
     * Clear scan feedback
     */
    clearFeedback() {
        if (this.scanFeedback) {
            this.scanFeedback.className = 'scan-feedback';
            this.scanFeedback.textContent = '';
        }
    }

    /**
     * Clear scanner input
     */
    clearInput() {
        if (this.scannerInput) {
            this.scannerInput.value = '';
        }
    }

    /**
     * Focus scanner input
     */
    focusInput() {
        // Don't focus if a modal is open
        if (document.querySelector('.modal-overlay.active')) {
            return;
        }
        
        // Don't focus if user is typing in another input
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return;
        }
        
        if (this.scannerInput && document.activeElement !== this.scannerInput) {
            this.scannerInput.focus();
        }
    }

    /**
     * Play feedback sound
     */
    playSound(type) {
        try {
            // Create audio context for sound feedback
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configure sound based on type
            if (type === 'success') {
                // Success: Two ascending tones
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            } else if (type === 'error') {
                // Error: Lower tone
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (error) {
            // Audio not supported or blocked, fail silently
            console.log('Audio feedback not available:', error.message);
        }
    }

    /**
     * Test scanner connectivity with enhanced feedback
     */
    async testScanner() {
        return new Promise((resolve) => {
            let testStarted = false;
            let testTimeout;
            let inputStartTime;

            const testMessage = '🔧 Scanner Test: Please scan a barcode or enter "TEST123" and press Enter...';
            this.showFeedback('info', testMessage);

            // Disable normal processing during test
            const originalProcessing = this.isProcessing;
            this.isProcessing = true;

            const testHandler = (event) => {
                const value = event.target.value.trim();
                const currentTime = Date.now();
                
                if (!inputStartTime && value.length > 0) {
                    inputStartTime = currentTime;
                }
                
                if (value && !testStarted) {
                    testStarted = true;
                    clearTimeout(testTimeout);
                    
                    // Calculate input characteristics
                    const inputDuration = currentTime - inputStartTime;
                    const isLikelyScanner = this.detectScannerInput(value, inputDuration);
                    
                    // Remove test handler
                    this.scannerInput.removeEventListener('input', testHandler);
                    
                    // Restore original processing state
                    this.isProcessing = originalProcessing;
                    
                    // Clear input
                    this.clearInput();
                    
                    // Show test results
                    const inputMethod = isLikelyScanner ? 'Scanner' : 'Manual';
                    const resultMessage = `✅ Test successful! Input method: ${inputMethod} (${value.length} chars in ${inputDuration}ms)`;
                    this.showFeedback('success', resultMessage);
                    
                    resolve({
                        success: true,
                        inputMethod: inputMethod.toLowerCase(),
                        testValue: value,
                        inputDuration,
                        isLikelyScanner,
                        characterCount: value.length
                    });
                }
            };

            const keyHandler = (event) => {
                if (event.key === 'Escape') {
                    // Cancel test
                    testStarted = true;
                    clearTimeout(testTimeout);
                    
                    this.scannerInput.removeEventListener('input', testHandler);
                    this.scannerInput.removeEventListener('keydown', keyHandler);
                    
                    this.isProcessing = originalProcessing;
                    this.clearInput();
                    this.showFeedback('info', '❌ Scanner test cancelled');
                    
                    resolve({
                        success: false,
                        error: 'Test cancelled by user'
                    });
                }
            };

            // Add test handlers
            this.scannerInput.addEventListener('input', testHandler);
            this.scannerInput.addEventListener('keydown', keyHandler);

            // Focus input for test
            this.focusInput();

            // Timeout after 30 seconds
            testTimeout = setTimeout(() => {
                if (!testStarted) {
                    this.scannerInput.removeEventListener('input', testHandler);
                    this.scannerInput.removeEventListener('keydown', keyHandler);
                    
                    this.isProcessing = originalProcessing;
                    this.showFeedback('error', '⏰ Scanner test timeout - no input received within 30 seconds');
                    
                    resolve({
                        success: false,
                        error: 'Test timeout - no input received'
                    });
                }
            }, 30000);
        });
    }

    /**
     * Get scanner statistics
     */
    getStats() {
        return {
            isProcessing: this.isProcessing,
            hasInput: this.scannerInput && this.scannerInput.value.length > 0,
            isFocused: document.activeElement === this.scannerInput
        };
    }

    /**
     * Enable/disable scanner
     */
    setEnabled(enabled) {
        if (this.scannerInput) {
            this.scannerInput.disabled = !enabled;
            if (enabled) {
                this.focusInput();
            }
        }
    }
}

// Initialize scanner manager
window.ScannerManager = new ScannerManager();