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
            // Start with disabled state and show progress
            this.scannerInput.disabled = true;
            this.scannerInput.placeholder = 'Initializing system...';
            
            this.setupEventListeners();
            this.waitForStorageAndEnable();
        }
    }

    /**
     * Wait for storage to be ready and enable input
     */
    async waitForStorageAndEnable() {
        try {
            console.log('Scanner: Starting system initialization...');
            this.updatePlaceholder('Initializing system...');
            
            // Wait for storage manager with progress updates
            let attempts = 0;
            while (!window.StorageManager || !window.StorageManager.db) {
                if (attempts > 100) { // 10 seconds max
                    throw new Error('Storage initialization timeout after 10 seconds');
                }
                
                // Update progress every 20 attempts (2 seconds)
                if (attempts % 20 === 0 && attempts > 0) {
                    this.updatePlaceholder(`Loading storage... (${Math.round(attempts / 10)}s)`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            console.log('Scanner: Storage ready, waiting for connectivity validator...');
            this.updatePlaceholder('Checking system connectivity...');

            // Wait for connectivity validator to initialize
            let validatorAttempts = 0;
            while (!window.connectivityValidator || !window.connectivityValidator.isInitialized) {
                if (validatorAttempts > 50) { // 5 seconds max
                    console.warn('Connectivity validator not ready, proceeding without validation');
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                validatorAttempts++;
            }

            // Use connectivity validator to determine scanner readiness
            if (window.connectivityValidator && window.connectivityValidator.isInitialized) {
                console.log('Scanner: Using connectivity validator for readiness check');
                
                // Listen for connectivity status changes
                window.connectivityValidator.addStatusChangeListener((results) => {
                    this.handleConnectivityStatusChange(results);
                });
                
                // Check current status
                const isReady = window.connectivityValidator.isReadyToScan();
                if (isReady) {
                    this.enableScanner();
                } else {
                    this.updatePlaceholder('System not ready - check connectivity status');
                }
            } else {
                console.warn('Scanner: Connectivity validator not available, using fallback');
                this.enableScannerWithFallback();
            }
            
            console.log('Scanner: Initialization complete');
            
        } catch (error) {
            console.error('Scanner initialization failed:', error);
            this.updatePlaceholder('Initialization failed - scanner disabled for safety');
        }
    }

    /**
     * Update scanner placeholder with progress message
     */
    updatePlaceholder(message) {
        if (this.scannerInput) {
            this.scannerInput.placeholder = message;
        }
    }

    /**
     * Enable scanner when system is ready
     */
    enableScanner() {
        if (this.scannerInput) {
            this.scannerInput.disabled = false;
            this.scannerInput.placeholder = 'Scan badge or enter volunteer ID...';
            this.focusInput();
            
            // Notify connectivity validator that scanning is active
            if (window.connectivityValidator) {
                window.connectivityValidator.startRealTimeMonitoring();
            }
            
            // Dispatch scanner activated event
            document.dispatchEvent(new CustomEvent('scannerActivated'));
            
            console.log('Scanner: Enabled and ready for scanning');
        }
    }

    /**
     * Disable scanner when system is not ready
     */
    disableScanner() {
        if (this.scannerInput) {
            this.scannerInput.disabled = true;
            this.scannerInput.placeholder = 'System not ready - check connectivity';
            
            // Notify connectivity validator that scanning is inactive
            if (window.connectivityValidator) {
                window.connectivityValidator.stopRealTimeMonitoring();
            }
            
            // Dispatch scanner deactivated event
            document.dispatchEvent(new CustomEvent('scannerDeactivated'));
            
            console.log('Scanner: Disabled due to system not ready');
        }
    }

    /**
     * Handle connectivity status changes
     */
    handleConnectivityStatusChange(results) {
        const isReady = results.overall.readyToScan;
        
        if (isReady && this.scannerInput && this.scannerInput.disabled) {
            console.log('Scanner: System became ready, enabling scanner');
            this.enableScanner();
        } else if (!isReady && this.scannerInput && !this.scannerInput.disabled) {
            console.log('Scanner: System not ready, disabling scanner');
            this.disableScanner();
        }
    }

    /**
     * Enable scanner with fallback settings when initialization fails
     */
    enableScannerWithFallback() {
        if (this.scannerInput) {
            this.scannerInput.disabled = false;
            this.scannerInput.placeholder = 'Scan badge or enter volunteer ID...';
            this.focusInput();
            console.log('Scanner: Enabled with fallback settings');
        }
    }

    /**
     * Force enable scanner (bypass all checks)
     */
    forceEnable() {
        if (this.scannerInput) {
            this.scannerInput.disabled = false;
            this.scannerInput.placeholder = 'FORCE ENABLED: Scan badge or enter volunteer ID...';
            this.focusInput();
            console.log('Scanner: Force enabled - bypassing all checks');
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

        // Handle force enable button
        const forceEnableBtn = Utils.DOM.getElementById('forceEnableBtn');
        if (forceEnableBtn) {
            forceEnableBtn.addEventListener('click', () => {
                this.forceEnable();
            });
        }

        // Add keyboard shortcut to force enable scanner (Ctrl+Shift+S)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                console.log('Force enable scanner shortcut triggered');
                this.forceEnable();
            }
        });

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

            // Step 1: Check if scanning is allowed for current date/event
            const scanningStatus = await this.getScanningStatus();
            if (!scanningStatus.canScan) {
                throw new Error(scanningStatus.message);
            }

            // Debug logging
            console.log('Processing scan:', {
                original: originalId,
                cleaned: cleanId,
                length: cleanId.length,
                isString: typeof cleanId === 'string',
                currentEvent: scanningStatus.currentEvent?.eventName
            });

            // Step 2: Validate ID format
            const formatValidation = this.validateVolunteerIdFormat(cleanId);
            if (!formatValidation.isValid) {
                throw new Error(`Invalid volunteer ID format: ${formatValidation.error}`);
            }

            console.log('ID format validation passed for:', cleanId);

            // Step 3: Get volunteer from local directory
            let volunteer = await this.getVolunteerFromDirectory(cleanId);
            if (!volunteer) {
                // Try alternative ID formats if initial lookup fails
                const alternativeVolunteer = await this.tryAlternativeIdFormats(cleanId);
                if (alternativeVolunteer) {
                    volunteer = alternativeVolunteer;
                } else {
                    // Try syncing volunteers from Google Sheets as a last resort
                    console.log(`Volunteer ${cleanId} not found locally, attempting sync from Google Sheets...`);
                    const syncResult = await this.tryVolunteerSync(cleanId);
                    
                    if (syncResult.volunteer) {
                        volunteer = syncResult.volunteer;
                        this.showFeedback('info', `✅ Found volunteer ${volunteer.name} after sync`);
                    } else {
                        throw new Error(`Volunteer ID "${cleanId}" not found in directory${syncResult.syncAttempted ? ' (even after syncing from Google Sheets)' : ''}`);
                    }
                }
            }

            // Step 4: Validate volunteer status
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
     * Get current active event for scanning using enhanced 7-day window logic
     * Delegates to StorageManager's getCurrentScannableEvent for consistent logic
     */
    async getCurrentEvent() {
        console.log('🎯 ===== SCANNER GET CURRENT EVENT STARTED =====');
        
        try {
            // Use the enhanced logic from StorageManager
            const scannableEvent = await window.StorageManager.getCurrentScannableEvent();
            
            if (scannableEvent) {
                console.log('✅ Scanner found scannable event:', {
                    eventName: scannableEvent.eventName,
                    date: scannableEvent.date,
                    isToday: scannableEvent.scanningContext?.isToday,
                    isPastEvent: scannableEvent.scanningContext?.isPastEvent,
                    daysFromEventDate: scannableEvent.scanningContext?.daysFromEventDate,
                    displayMessage: scannableEvent.scanningContext?.displayMessage
                });
                
                console.log('🎯 ===== SCANNER GET CURRENT EVENT COMPLETED (Event found) =====');
                return scannableEvent;
            } else {
                console.log('❌ Scanner found no scannable events');
                console.log('🎯 ===== SCANNER GET CURRENT EVENT COMPLETED (No events) =====');
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error getting current scannable event:', error);
            console.log('🎯 ===== SCANNER GET CURRENT EVENT COMPLETED (Error) =====');
            return null;
        }
    }

    /**
     * Check if an event is scannable based on date restrictions
     * Events can only be scanned up to 7 days after the event date
     */
    isEventScannable(event, currentDate = new Date()) {
        if (!event || event.status !== 'Active') {
            return false;
        }
        
        const eventDate = new Date(event.date);
        const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        // Calculate days difference
        const daysDifference = Math.floor((currentDateOnly - eventDateOnly) / (1000 * 60 * 60 * 24));
        
        // Allow scanning on event day and up to 7 days after
        return daysDifference >= 0 && daysDifference <= 7;
    }

    /**
     * Update scanner input status based on scanning availability
     */
    async updateScannerStatus() {
        console.log('🔄 ===== SCANNER STATUS UPDATE STARTED =====');
        console.log('🔄 Current scanner input state:', {
            exists: !!this.scannerInput,
            disabled: this.scannerInput?.disabled,
            placeholder: this.scannerInput?.placeholder
        });
        
        try {
            console.log('🔍 Step 1: Checking production readiness...');
            
            // First check if production requirements are met
            const productionReadiness = checkProductionReadiness();
            console.log('🔍 Production readiness result:', productionReadiness);
            
            if (!productionReadiness.ready) {
                console.log('❌ Production requirements NOT met - disabling scanner');
                // Production requirements not met - keep scanner disabled
                if (this.scannerInput) {
                    const oldState = {
                        disabled: this.scannerInput.disabled,
                        placeholder: this.scannerInput.placeholder
                    };
                    
                    this.scannerInput.disabled = true;
                    this.scannerInput.placeholder = `${productionReadiness.reason} - ${productionReadiness.details}`;
                    
                    console.log('🔄 Scanner state changed:', {
                        from: oldState,
                        to: {
                            disabled: this.scannerInput.disabled,
                            placeholder: this.scannerInput.placeholder
                        }
                    });
                }
                
                // Update status indicator to show production issue
                this.updateScannerStatusIndicator({
                    canScan: false,
                    message: productionReadiness.reason,
                    type: 'production-safety'
                });
                
                console.log('🔄 ===== SCANNER STATUS UPDATE ENDED (Production not ready) =====');
                return;
            }
            
            console.log('✅ Production requirements met, proceeding to scanning status check...');
            console.log('🔍 Step 2: Getting scanning status...');
            
            const scanningStatus = await this.getScanningStatus();
            console.log('🔍 Scanning status result:', scanningStatus);
            
            if (this.scannerInput) {
                const oldState = {
                    disabled: this.scannerInput.disabled,
                    placeholder: this.scannerInput.placeholder
                };
                
                if (scanningStatus.canScan) {
                    console.log('✅ Scanning allowed - enabling scanner');
                    // All checks passed - enable scanner with context-aware placeholder
                    this.scannerInput.disabled = false;
                    
                    // Set placeholder based on scanning context (Requirements 8.4, 8.6)
                    const context = scanningStatus.scanningContext;
                    let placeholder;
                    
                    if (context?.isToday) {
                        placeholder = `📅 Scan for TODAY: ${scanningStatus.currentEvent.eventName}`;
                    } else if (context?.isPastEvent) {
                        const daysAgo = context.daysFromEventDate;
                        placeholder = `🔄 BACKFILL (${daysAgo}d ago): ${scanningStatus.currentEvent.eventName}`;
                    } else {
                        placeholder = `Scan badge for: ${scanningStatus.currentEvent.eventName}`;
                    }
                    
                    this.scannerInput.placeholder = placeholder;
                    this.focusInput();
                    console.log('✅ Scanner enabled with context:', {
                        event: scanningStatus.currentEvent.eventName,
                        isToday: context?.isToday,
                        isPastEvent: context?.isPastEvent,
                        daysFromEvent: context?.daysFromEventDate
                    });
                } else {
                    console.log('⚠️ No scannable events - checking development mode...');
                    console.log('🔍 Development mode check:', {
                        configExists: !!window.Config,
                        isDevelopment: window.Config?.isDevelopment,
                        environment: window.Config?.environment
                    });
                    
                    // For development, bypass event checks
                    if (window.Config && window.Config.isDevelopment) {
                        console.log('🔧 Development mode detected - enabling scanner despite no events');
                        this.scannerInput.disabled = false;
                        this.scannerInput.placeholder = 'DEV MODE: Scan badge or enter volunteer ID...';
                        this.focusInput();
                        console.log('✅ Scanner enabled in development mode');
                    } else {
                        console.log('🏭 Production mode - keeping scanner disabled (no events)');
                        // Production mode - keep disabled if no events
                        this.scannerInput.disabled = true;
                        this.scannerInput.placeholder = scanningStatus.message;
                        console.log('❌ Scanner disabled - no scannable events in production');
                    }
                }
                
                console.log('🔄 Final scanner state change:', {
                    from: oldState,
                    to: {
                        disabled: this.scannerInput.disabled,
                        placeholder: this.scannerInput.placeholder
                    }
                });
            } else {
                console.log('❌ Scanner input element not found!');
            }
            
            console.log('🔍 Step 3: Updating status indicator...');
            // Update status indicator
            this.updateScannerStatusIndicator(scanningStatus);
            
            console.log('🔄 ===== SCANNER STATUS UPDATE COMPLETED SUCCESSFULLY =====');
            
        } catch (error) {
            console.error('❌ ===== SCANNER STATUS UPDATE FAILED =====');
            console.error('❌ Error details:', error);
            console.error('❌ Error stack:', error.stack);
            
            // In case of error, keep scanner disabled for safety
            if (this.scannerInput) {
                const oldState = {
                    disabled: this.scannerInput.disabled,
                    placeholder: this.scannerInput.placeholder
                };
                
                this.scannerInput.disabled = true;
                this.scannerInput.placeholder = 'System error - scanner disabled for safety';
                
                console.log('🔄 Error recovery - scanner state changed:', {
                    from: oldState,
                    to: {
                        disabled: this.scannerInput.disabled,
                        placeholder: this.scannerInput.placeholder
                    }
                });
            }
            
            console.log('🔄 ===== SCANNER STATUS UPDATE ENDED (Error) =====');
        }
    }

    /**
     * Update scanner status indicator in the UI
     */
    updateScannerStatusIndicator(scanningStatus) {
        const statusIndicator = document.querySelector('.scanner-indicator');
        const statusText = document.querySelector('.scanner-status-text');
        
        if (statusIndicator && statusText) {
            if (scanningStatus.canScan) {
                statusIndicator.className = 'scanner-indicator ready';
                statusText.textContent = `Ready - ${scanningStatus.currentEvent.eventName}`;
            } else {
                statusIndicator.className = 'scanner-indicator disabled';
                statusText.textContent = 'Scanning Disabled';
            }
        }
    }

    /**
     * Try to sync volunteers from Google Sheets when a volunteer is not found
     */
    async tryVolunteerSync(volunteerId) {
        const result = {
            syncAttempted: false,
            volunteer: null,
            syncResult: null
        };

        try {
            // Check if Google Sheets service is available and configured
            if (!window.GoogleSheetsService) {
                console.log('Google Sheets service not available for volunteer sync');
                return result;
            }

            const status = window.GoogleSheetsService.getStatus();
            if (!status.hasCredentials || !status.isAuthenticated) {
                console.log('Google Sheets not configured or authenticated for volunteer sync');
                return result;
            }

            console.log(`Attempting to sync volunteers from Google Sheets to find ${volunteerId}...`);
            result.syncAttempted = true;

            // Sync volunteers from Google Sheets
            result.syncResult = await window.GoogleSheetsService.syncVolunteersFromSheets();
            console.log('Volunteer sync result:', result.syncResult);

            // Try to find the volunteer again after sync
            result.volunteer = await this.getVolunteerFromDirectory(volunteerId);
            
            if (result.volunteer) {
                console.log(`Found volunteer ${result.volunteer.name} (${volunteerId}) after sync`);
            } else {
                console.log(`Volunteer ${volunteerId} still not found after sync`);
            }

            return result;

        } catch (error) {
            console.error('Error during volunteer sync attempt:', error);
            result.syncAttempted = true; // Mark as attempted even if failed
            return result;
        }
    }

    /**
     * Get scanning status with enhanced 7-day window feedback
     * Provides detailed status messages based on event availability and scanning context
     */
    async getScanningStatus() {
        console.log('📅 ===== GET SCANNING STATUS STARTED =====');
        console.log('📅 Step 1: Getting current scannable event...');
        
        const currentEvent = await this.getCurrentEvent();
        console.log('📅 Current event result:', currentEvent);
        
        if (!currentEvent) {
            console.log('📅 No scannable event found, analyzing event situation...');
            
            // Get detailed event analysis for better user feedback
            const allEvents = await window.StorageManager.getAllEvents();
            const activeEvents = allEvents.filter(event => event.status === 'Active');
            
            console.log('📅 Event analysis:', {
                totalEvents: allEvents.length,
                activeEvents: activeEvents.length
            });
            
            if (activeEvents.length === 0) {
                const result = {
                    canScan: false,
                    message: 'No active events available. Please contact an administrator to create events.',
                    type: 'no-events',
                    details: 'No events have been created or all events are inactive.'
                };
                console.log('❌ No active events found:', result);
                return result;
            }
            
            // Analyze event timing to provide helpful feedback
            const today = new Date();
            const todayStr = today.getFullYear() + '-' + 
                            String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                            String(today.getDate()).padStart(2, '0');
            
            // Check for upcoming events
            const upcomingEvents = activeEvents.filter(event => new Date(event.date) > new Date(todayStr));
            upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (upcomingEvents.length > 0) {
                const nextEvent = upcomingEvents[0];
                const daysUntil = Math.ceil((new Date(nextEvent.date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                
                const result = {
                    canScan: false,
                    message: `Next event "${nextEvent.eventName}" is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Scanning will be available on the event date.`,
                    type: 'future-event',
                    nextEvent: nextEvent,
                    details: `Scanning becomes available on ${nextEvent.date} for ${nextEvent.eventName}.`
                };
                console.log('⏳ Future event found:', result);
                return result;
            }
            
            // Check for past events outside the 7-day window
            const pastEvents = activeEvents.filter(event => new Date(event.date) < new Date(todayStr));
            pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (pastEvents.length > 0) {
                const lastEvent = pastEvents[0];
                const daysAgo = Math.floor((new Date(todayStr) - new Date(lastEvent.date)) / (1000 * 60 * 60 * 24));
                
                const result = {
                    canScan: false,
                    message: `Last event "${lastEvent.eventName}" was ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago. Scanning window has expired.`,
                    type: 'expired-event',
                    lastEvent: lastEvent,
                    details: `Scanning is only available for 7 days after an event. The last event was on ${lastEvent.date}.`
                };
                console.log('📅 Expired event found:', result);
                return result;
            }
            
            const result = {
                canScan: false,
                message: 'No scannable events available.',
                type: 'no-scannable-events',
                details: 'No events are currently within the 7-day scanning window.'
            };
            console.log('❌ No scannable events:', result);
            return result;
        }
        
        // Event found - determine scanning context and provide appropriate message
        const scanningContext = currentEvent.scanningContext;
        let message, type, details;
        
        if (scanningContext?.isToday) {
            // Current day event (Requirement 8.1, 8.4)
            message = `Scanning for today's event: ${currentEvent.eventName}`;
            type = 'current-event';
            details = `Recording attendance for ${currentEvent.eventName} on ${currentEvent.date}.`;
        } else if (scanningContext?.isPastEvent) {
            // Past event within 7-day window (Requirement 8.2, 8.4, 8.6)
            const daysAgo = scanningContext.daysFromEventDate;
            message = `Backfilling attendance for: ${currentEvent.eventName} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`;
            type = 'backfill-event';
            details = `Manual backfilling available for ${currentEvent.eventName} from ${currentEvent.date}. Scanning window expires in ${7 - daysAgo} day${7 - daysAgo !== 1 ? 's' : ''}.`;
        } else {
            // Fallback for events without context metadata
            message = `Scanning available for: ${currentEvent.eventName}`;
            type = 'active-event';
            details = `Recording attendance for ${currentEvent.eventName}.`;
        }
        
        const result = {
            canScan: true,
            message: message,
            type: type,
            currentEvent: currentEvent,
            details: details,
            scanningContext: scanningContext
        };
        
        console.log('✅ Scannable event found:', result);
        console.log('📅 ===== GET SCANNING STATUS COMPLETED =====');
        return result;
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
                this.scannerInput.placeholder = 'Scan badge or enter volunteer ID...';
                this.focusInput();
            }
        }
    }

    /**
     * Force enable scanner (for debugging/manual override)
     */
    forceEnable() {
        console.log('Scanner: Force enabling scanner input');
        if (this.scannerInput) {
            this.scannerInput.disabled = false;
            this.scannerInput.placeholder = 'Scan badge or enter volunteer ID...';
            this.focusInput();
        }
    }

    /**
     * Get scanning status for connectivity validator
     * Returns detailed information about current scanning availability
     */
    async getScanningStatus() {
        try {
            const events = await window.StorageManager.getAllEvents();
            const today = new Date();
            const todayStr = today.getFullYear() + '-' + 
                            String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                            String(today.getDate()).padStart(2, '0');
            
            // Check for today's event
            const todayEvent = events.find(event => 
                event.date === todayStr && event.status === 'Active'
            );
            
            if (todayEvent) {
                return {
                    type: 'current-event',
                    canScan: true,
                    currentEvent: todayEvent,
                    message: `Today's event: ${todayEvent.eventName}`
                };
            }
            
            // Check for events within 7-day window
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const recentEvents = events
                .filter(event => {
                    const eventDate = new Date(event.date);
                    return eventDate < today && 
                           eventDate >= sevenDaysAgo && 
                           event.status === 'Active';
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (recentEvents.length > 0) {
                const mostRecentEvent = recentEvents[0];
                const daysAgo = Math.floor((today - new Date(mostRecentEvent.date)) / (1000 * 60 * 60 * 24));
                
                return {
                    type: 'backfill-event',
                    canScan: true,
                    currentEvent: mostRecentEvent,
                    daysAgo: daysAgo,
                    message: `Backfill mode: ${mostRecentEvent.eventName} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`
                };
            }
            
            // Check for future events
            const futureEvents = events
                .filter(event => {
                    const eventDate = new Date(event.date);
                    return eventDate > today && event.status === 'Active';
                })
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (futureEvents.length > 0) {
                const nextEvent = futureEvents[0];
                const daysUntil = Math.ceil((new Date(nextEvent.date) - today) / (1000 * 60 * 60 * 24));
                
                return {
                    type: 'future-event',
                    canScan: false,
                    nextEvent: nextEvent,
                    daysUntil: daysUntil,
                    message: `Next event in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}: ${nextEvent.eventName}`
                };
            }
            
            // Check for past events (outside 7-day window)
            const pastEvents = events
                .filter(event => {
                    const eventDate = new Date(event.date);
                    return eventDate < sevenDaysAgo && event.status === 'Active';
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (pastEvents.length > 0) {
                const lastEvent = pastEvents[0];
                const daysAgo = Math.floor((today - new Date(lastEvent.date)) / (1000 * 60 * 60 * 24));
                
                return {
                    type: 'expired-event',
                    canScan: false,
                    lastEvent: lastEvent,
                    daysAgo: daysAgo,
                    message: `Last event was ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago (outside 7-day window)`
                };
            }
            
            // No events found
            return {
                type: 'no-events',
                canScan: false,
                message: 'No events have been created'
            };
            
        } catch (error) {
            console.error('Error getting scanning status:', error);
            return {
                type: 'error',
                canScan: false,
                error: error.message,
                message: 'Error checking event status'
            };
        }
    }
}

// Create alias for compatibility with different naming conventions
window.VolunteerScanner = ScannerManager;

// Initialize scanner manager ONLY after DOM and ALL production dependencies are ready
function initializeScannerWhenReady() {
    // Check if basic dependencies are available
    if (document.readyState === 'complete' && 
        window.StorageManager && 
        window.StorageManager.db && 
        document.getElementById('scannerInput')) {
        
        console.log('🔧 Basic dependencies ready, initializing scanner...');
        window.ScannerManager = new ScannerManager();
        window.scanner = window.ScannerManager;
        
        // Development mode detected - enhanced debugging available but no automatic bypassing
        if (window.Config && window.Config.isDevelopment) {
            console.log('🔧 Development mode detected - enhanced debugging enabled, use force enable button for testing');
        }
        
        console.log('✅ Scanner initialized successfully');
        return true;
    }
    return false;
}

// Check if production requirements are met for scanner enablement
function checkProductionReadiness() {
    console.log('🔍 PRODUCTION READINESS CHECK - Starting detailed analysis...');
    
    // 1. Storage must be ready
    console.log('🔍 Step 1: Checking Storage System...');
    console.log('  - window.StorageManager exists:', !!window.StorageManager);
    console.log('  - window.StorageManager.db exists:', !!(window.StorageManager && window.StorageManager.db));
    
    if (!window.StorageManager || !window.StorageManager.db) {
        const result = {
            ready: false,
            reason: 'Storage system not ready',
            details: 'Local database not initialized'
        };
        console.log('❌ PRODUCTION CHECK FAILED - Storage:', result);
        return result;
    }
    console.log('✅ Storage system ready');
    
    // 2. Google Sheets connection should be established (in production)
    console.log('🔍 Step 2: Checking Google Sheets Service...');
    console.log('  - window.GoogleSheetsService exists:', !!window.GoogleSheetsService);
    
    if (window.GoogleSheetsService) {
        const status = window.GoogleSheetsService.getStatus();
        console.log('  - Google Sheets status:', status);
        console.log('  - hasCredentials:', status.hasCredentials);
        console.log('  - isAuthenticated:', status.isAuthenticated);
        console.log('  - spreadsheetId:', status.spreadsheetId);
        
        // Check if credentials are configured
        if (!status.hasCredentials) {
            const result = {
                ready: false,
                reason: 'Google Sheets not configured',
                details: 'API credentials not set up - data sync unavailable'
            };
            console.log('❌ PRODUCTION CHECK FAILED - No credentials:', result);
            return result;
        }
        console.log('✅ Google Sheets credentials configured');
        
        // Check development mode
        console.log('🔍 Step 3: Checking Environment Mode...');
        console.log('  - window.Config exists:', !!window.Config);
        console.log('  - window.Config.isDevelopment:', window.Config?.isDevelopment);
        
        // In production, require authentication
        if (!window.Config?.isDevelopment && !status.isAuthenticated) {
            const result = {
                ready: false,
                reason: 'Google Sheets not authenticated',
                details: 'Please authenticate with Google Sheets to prevent data loss'
            };
            console.log('❌ PRODUCTION CHECK FAILED - No authentication in production:', result);
            return result;
        }
        
        if (window.Config?.isDevelopment) {
            console.log('✅ Development mode - authentication not required');
        } else {
            console.log('✅ Production mode - authentication verified');
        }
        
    } else {
        const result = {
            ready: false,
            reason: 'Google Sheets service not available',
            details: 'Sync service not loaded - data may be lost'
        };
        console.log('❌ PRODUCTION CHECK FAILED - No Google Sheets service:', result);
        return result;
    }
    
    console.log('✅ Google Sheets system ready');
    
    const result = {
        ready: true,
        reason: 'All systems ready',
        details: 'Storage and sync systems operational'
    };
    console.log('🎉 PRODUCTION READINESS CHECK PASSED:', result);
    return result;
}

// Try to initialize immediately if everything is ready
if (!initializeScannerWhenReady()) {
    // If not ready, wait for DOM and try again
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📱 DOM loaded, attempting scanner initialization...');
            if (!initializeScannerWhenReady()) {
                // Still not ready, retry with delays
                let attempts = 0;
                const retryInit = () => {
                    attempts++;
                    console.log(`📱 Scanner init attempt ${attempts}...`);
                    
                    if (initializeScannerWhenReady()) {
                        console.log('✅ Scanner initialization successful after retries');
                        return;
                    }
                    
                    if (attempts < 20) { // Max 10 seconds of retries
                        setTimeout(retryInit, 500);
                    } else {
                        console.warn('⚠️ Scanner initialization failed after maximum retries');
                        // Create a minimal scanner for force enable functionality
                        window.scanner = {
                            forceEnable: function() {
                                const input = document.getElementById('scannerInput');
                                if (input) {
                                    input.disabled = false;
                                    input.placeholder = 'FORCE ENABLED: Scan badge or enter volunteer ID...';
                                    input.focus();
                                    console.log('Scanner force enabled via fallback');
                                }
                            }
                        };
                    }
                };
                setTimeout(retryInit, 500);
            }
        });
    } else {
        // DOM already loaded, retry with delays
        let attempts = 0;
        const retryInit = () => {
            attempts++;
            console.log(`📱 Scanner init attempt ${attempts} (DOM ready)...`);
            
            if (initializeScannerWhenReady()) {
                console.log('✅ Scanner initialization successful');
                return;
            }
            
            if (attempts < 20) { // Max 10 seconds of retries
                setTimeout(retryInit, 500);
            } else {
                console.warn('⚠️ Scanner initialization failed after maximum retries');
                // Create a minimal scanner for force enable functionality
                window.scanner = {
                    forceEnable: function() {
                        const input = document.getElementById('scannerInput');
                        if (input) {
                            input.disabled = false;
                            input.placeholder = 'FORCE ENABLED: Scan badge or enter volunteer ID...';
                            input.focus();
                            console.log('Scanner force enabled via fallback');
                        }
                    }
                };
            }
        };
        setTimeout(retryInit, 100);
    }
}