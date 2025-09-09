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

        // Handle clicks elsewhere to refocus
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.scanner-input-container')) {
                this.focusInput();
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.focusInput();
            }
        });
    }

    /**
     * Handle input events (for scanner detection)
     */
    handleInput(event) {
        const value = event.target.value;
        
        // Clear any existing timeout
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }

        // For manual typing: primarily use Enter key
        // For scanners: auto-process long inputs or after a pause
        
        // Auto-process very long inputs (definitely from scanner)
        if (value.length >= 10) {
            this.scanTimeout = setTimeout(() => {
                this.processScan(value);
            }, 50); // Very quick for obvious scanner input
        }
        // For shorter inputs, give plenty of time for manual typing
        else if (value.length >= 3) {
            this.scanTimeout = setTimeout(() => {
                // Only auto-process if input hasn't changed (user stopped typing)
                if (this.scannerInput.value === value && value.length >= 3) {
                    this.processScan(value);
                }
            }, 3000); // 3 seconds - plenty of time to finish typing
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
     * Process scanned volunteer ID
     */
    async processScan(volunteerId) {
        if (this.isProcessing) return;

        this.isProcessing = true;
        const cleanId = volunteerId.trim().toUpperCase();

        try {
            // Check if storage manager is ready
            if (!window.StorageManager || !window.StorageManager.db) {
                throw new Error('System is still initializing. Please wait a moment and try again.');
            }

            // Debug logging
            console.log('Processing scan:', {
                original: volunteerId,
                cleaned: cleanId,
                length: cleanId.length,
                isString: typeof cleanId === 'string'
            });

            // Validate ID format
            if (!Utils.Validation.isValidVolunteerId(cleanId)) {
                console.error('Validation failed for ID:', cleanId);
                throw new Error(`Invalid volunteer ID format: "${cleanId}"`);
            }

            console.log('ID validation passed for:', cleanId);

            // Get volunteer from storage
            const volunteer = await window.StorageManager.getVolunteer(cleanId);
            if (!volunteer) {
                throw new Error('Volunteer not found');
            }

            // Check if volunteer is active
            if (volunteer.status !== 'Active') {
                throw new Error('Volunteer is not active');
            }

            // Get current event
            const currentEvent = await this.getCurrentEvent();
            if (!currentEvent) {
                throw new Error('No active event found');
            }

            // Record attendance
            const attendanceRecord = {
                volunteerId: volunteer.id,
                eventId: currentEvent.eventId,
                eventName: currentEvent.eventName,
                committee: volunteer.committee,
                volunteerName: volunteer.name
            };

            await window.StorageManager.recordAttendance(attendanceRecord);

            // Show success feedback
            this.showFeedback('success', `✓ ${volunteer.name} checked in successfully`);

            // Update dashboard
            if (window.App && window.App.updateDashboard) {
                window.App.updateDashboard();
            }

            // Play success sound (if available)
            this.playSound('success');

        } catch (error) {
            console.error('Scan processing error:', error);
            this.showFeedback('error', `✗ ${error.message}`);
            this.playSound('error');
        } finally {
            this.clearInput();
            this.isProcessing = false;
            
            // Refocus input after a short delay
            setTimeout(() => this.focusInput(), 500);
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
     * Show scan feedback
     */
    showFeedback(type, message) {
        if (!this.scanFeedback) return;

        // Clear existing classes and content
        this.scanFeedback.className = 'scan-feedback';
        this.scanFeedback.textContent = message;

        // Add appropriate class
        this.scanFeedback.classList.add(type);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.clearFeedback();
        }, 3000);
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
     * Test scanner connectivity
     */
    async testScanner() {
        return new Promise((resolve) => {
            let testStarted = false;
            let testTimeout;

            const testMessage = 'Please scan a test barcode or enter "TEST123" and press Enter...';
            this.showFeedback('info', testMessage);

            const testHandler = (event) => {
                const value = event.target.value.trim();
                
                if (value && !testStarted) {
                    testStarted = true;
                    clearTimeout(testTimeout);
                    
                    // Remove test handler
                    this.scannerInput.removeEventListener('input', testHandler);
                    
                    // Clear input and feedback
                    this.clearInput();
                    this.clearFeedback();
                    
                    // Determine if input was from scanner (rapid input) or manual
                    const isScanner = value.length > 5; // Assume scanner if longer input
                    
                    resolve({
                        success: true,
                        inputMethod: isScanner ? 'scanner' : 'manual',
                        testValue: value
                    });
                }
            };

            // Add test handler
            this.scannerInput.addEventListener('input', testHandler);

            // Timeout after 30 seconds
            testTimeout = setTimeout(() => {
                this.scannerInput.removeEventListener('input', testHandler);
                this.clearFeedback();
                resolve({
                    success: false,
                    error: 'Test timeout - no input received'
                });
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