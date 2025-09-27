/**
 * Validation Engine Service
 * Handles different validation modes for volunteer badge scanning
 */
class ValidationEngine {
  constructor() {
    this.mode = 'strict'; // Default mode as per requirements
    this.auditLogger = null; // Will be initialized when needed
    this.isInitialized = false;
    
    // Bind methods to preserve context
    this.validateScan = this.validateScan.bind(this);
    this.setMode = this.setMode.bind(this);
    this.strictValidation = this.strictValidation.bind(this);
    this.noValidation = this.noValidation.bind(this);
    this.createIfNotFoundValidation = this.createIfNotFoundValidation.bind(this);
  }

  /**
   * Initialize the validation engine
   */
  async init() {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🔄 ValidationEngine: Initializing as SINGLE SOURCE OF TRUTH...');
      
      // SIMPLIFIED PRIORITY: User preference > Environment default
      let validationMode = 'strict'; // Safe default
      
      // 1. Check user preference (highest priority)
      const userMode = await Storage.getItem('validationMode');
      if (userMode && this.isValidMode(userMode)) {
        validationMode = userMode;
        console.log(`✅ ValidationEngine: Using user preference: ${validationMode}`);
      } else {
        // 2. Use environment default (fallback)
        const envDefault = this.getEnvironmentDefault();
        validationMode = envDefault;
        console.log(`📋 ValidationEngine: Using environment default: ${validationMode}`);
        
        // Save the environment default as user preference for consistency
        await Storage.setItem('validationMode', validationMode);
        console.log(`💾 ValidationEngine: Saved environment default as user preference`);
      }
      
      // Clean up legacy storage
      await this.cleanupLegacyStorage();
      
      this.mode = validationMode;

      // Initialize audit logger
      if (window.AuditLogger) {
        this.auditLogger = new window.AuditLogger();
      } else {
        console.warn('AuditLogger not available, audit logging disabled');
      }

      this.isInitialized = true;
      console.log(`🎯 ValidationEngine: SINGLE SOURCE OF TRUTH initialized with mode: ${this.mode}`);
      
      // Emit initialization event for other components
      Utils.Event.emit('validationEngineInitialized', {
        mode: this.mode,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize ValidationEngine:', error);
      // Fallback to strict mode
      this.mode = 'strict';
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Main validation method - processes scanned volunteer ID
   * @param {string} volunteerId - The scanned volunteer ID
   * @param {string} eventId - The current event ID
   * @returns {Object} Validation result object
   */
  async validateScan(volunteerId, eventId) {
    if (!this.isInitialized) {
      await this.init();
    }

    // Initialize result object
    const result = {
      isValid: false,
      volunteer: null,
      status: null,
      requiresAction: false,
      actionType: null,
      errorMessage: null,
      mode: this.mode
    };

    try {
      // Validate inputs
      if (!volunteerId || typeof volunteerId !== 'string') {
        result.errorMessage = 'Invalid volunteer ID provided';
        return result;
      }

      if (!eventId) {
        result.errorMessage = 'No active event found';
        return result;
      }

      // Route to appropriate validation method based on current mode
      switch (this.mode) {
        case 'strict':
          return await this.strictValidation(volunteerId, eventId, result);
        case 'no-validation':
          return await this.noValidation(volunteerId, eventId, result);
        case 'create-if-not-found':
          return await this.createIfNotFoundValidation(volunteerId, eventId, result);
        default:
          result.errorMessage = `Unknown validation mode: ${this.mode}`;
          return result;
      }
    } catch (error) {
      console.error('Validation error:', error);
      result.errorMessage = error.message || 'Validation failed';
      return result;
    }
  }

  /**
   * Strict validation mode - only accepts registered volunteers
   * Requirements: 1.1, 1.2, 1.3
   */
  async strictValidation(volunteerId, eventId, result) {
    try {
      // Look up volunteer in database
      const volunteer = await Storage.getVolunteer(volunteerId);
      
      if (!volunteer) {
        // Volunteer not found - reject scan
        result.isValid = false;
        result.status = null;
        result.errorMessage = `Volunteer ID '${volunteerId}' not found. Only registered volunteers are allowed in strict mode.`;
        
        // Log the attempted scan for audit purposes
        if (this.auditLogger) {
          await this.auditLogger.logScanAttempt({
            volunteerId,
            eventId,
            mode: 'strict',
            result: 'rejected',
            reason: 'volunteer_not_found',
            timestamp: new Date().toISOString()
          });
        }
        
        return result;
      }

      // Volunteer found - accept scan
      result.isValid = true;
      result.volunteer = volunteer;
      result.status = 'ID Found';
      result.requiresAction = false;
      
      // Log successful validation
      if (this.auditLogger) {
        await this.auditLogger.logScanAttempt({
          volunteerId,
          eventId,
          volunteerName: volunteer.name,
          mode: 'strict',
          result: 'accepted',
          reason: 'volunteer_found',
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Strict validation error:', error);
      result.errorMessage = 'Error during strict validation';
      return result;
    }
  }

  /**
   * No validation mode - accepts any ID without checking
   * Requirements: 2.1, 2.2
   */
  async noValidation(volunteerId, eventId, result) {
    try {
      // Accept any ID without validation
      result.isValid = true;
      result.status = 'No Validation';
      result.requiresAction = false;
      
      // Try to get volunteer info if it exists, but don't require it
      let volunteer = null;
      try {
        volunteer = await Storage.getVolunteer(volunteerId);
      } catch (error) {
        // Ignore errors when looking up volunteer
      }
      
      if (volunteer) {
        result.volunteer = volunteer;
      } else {
        // Create temporary volunteer record for attendance
        result.volunteer = {
          id: volunteerId,
          name: `Unknown (${volunteerId})`,
          committee: 'Unknown',
          email: '',
          isTemporary: true
        };
      }
      
      // Log the scan
      if (this.auditLogger) {
        await this.auditLogger.logScanAttempt({
          volunteerId,
          eventId,
          volunteerName: result.volunteer.name,
          mode: 'no-validation',
          result: 'accepted',
          reason: 'no_validation_mode',
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('No validation error:', error);
      result.errorMessage = 'Error during no validation processing';
      return result;
    }
  }

  /**
   * Create-if-not-found validation mode - prompts for new volunteer creation
   * Requirements: 3.1, 3.2
   */
  async createIfNotFoundValidation(volunteerId, eventId, result) {
    try {
      // First check if volunteer exists
      const volunteer = await Storage.getVolunteer(volunteerId);
      
      if (volunteer) {
        // Volunteer exists - accept scan
        result.isValid = true;
        result.volunteer = volunteer;
        result.status = 'ID Found';
        result.requiresAction = false;
        
        // Log successful validation
        if (this.auditLogger) {
          await this.auditLogger.logScanAttempt({
            volunteerId,
            eventId,
            volunteerName: volunteer.name,
            mode: 'create-if-not-found',
            result: 'accepted',
            reason: 'volunteer_found',
            timestamp: new Date().toISOString()
          });
        }
        
        return result;
      }

      // Volunteer not found - require action to create new volunteer
      result.isValid = false; // Not valid yet, requires user action
      result.volunteer = null;
      result.status = null;
      result.requiresAction = true;
      result.actionType = 'create-volunteer';
      result.volunteerId = volunteerId; // Pass the ID for form pre-population
      
      // Log the creation prompt
      if (this.auditLogger) {
        await this.auditLogger.logScanAttempt({
          volunteerId,
          eventId,
          mode: 'create-if-not-found',
          result: 'creation_prompted',
          reason: 'volunteer_not_found',
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Create-if-not-found validation error:', error);
      result.errorMessage = 'Error during create-if-not-found validation';
      return result;
    }
  }

  /**
   * Set validation mode and emit event for UI updates
   * Requirements: 9.1 (audit logging)
   */
  async setMode(newMode) {
    if (!['strict', 'no-validation', 'create-if-not-found'].includes(newMode)) {
      throw new Error(`Invalid validation mode: ${newMode}`);
    }

    const oldMode = this.mode;
    
    if (oldMode === newMode) {
      console.log(`🔄 ValidationEngine.setMode(${newMode}): No change needed (already ${oldMode})`);
      return; // No change needed
    }

    try {
      console.log(`🔄 ValidationEngine.setMode(${newMode}): Changing from ${oldMode} to ${newMode}`);
      console.trace('ValidationEngine.setMode called from:'); // Show call stack
      
      // Update mode in ValidationEngine (SINGLE SOURCE OF TRUTH)
      this.mode = newMode;
      
      // Save to localStorage (only storage ValidationEngine manages)
      await Storage.setItem('validationMode', newMode);
      console.log(`💾 ValidationEngine: Saved mode '${newMode}' to localStorage`)
      
      // Log the mode change for audit
      if (this.auditLogger) {
        this.auditLogger.logModeChange(oldMode, newMode, 'user');
      }
      
      // Emit event for UI updates
      Utils.Event.emit('validationModeChanged', {
        oldMode,
        newMode,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Validation mode changed from '${oldMode}' to '${newMode}' (unified update)`);
      
    } catch (error) {
      // Revert mode on error
      this.mode = oldMode;
      console.error('Failed to set validation mode:', error);
      throw error;
    }
  }

  /**
   * Get current validation mode
   */
  getMode() {
    return this.mode;
  }

  /**
   * Check if a mode is valid
   */
  isValidMode(mode) {
    return ['strict', 'no-validation', 'create-if-not-found'].includes(mode);
  }

  /**
   * Get environment default validation mode
   */
  getEnvironmentDefault() {
    // Check deployment configuration for environment default
    if (window.DeploymentConfigLoader && window.DeploymentConfigLoader.isLoaded) {
      const envConfig = window.DeploymentConfigLoader.getEnvironmentConfig();
      if (envConfig && envConfig.googleSheets && envConfig.googleSheets.validationMode) {
        return envConfig.googleSheets.validationMode;
      }
    }
    
    // Note: No longer using Config.scanner.validationMode as fallback
    // ValidationEngine is now the single source of truth
    
    // Ultimate fallback to strict mode
    return 'strict';
  }

  /**
   * Clean up legacy storage keys
   */
  async cleanupLegacyStorage() {
    try {
      // Remove legacy prefixed storage
      await Storage.removeItem('vat_validationMode');
      console.log('🧹 ValidationEngine: Cleaned up legacy storage');
    } catch (error) {
      console.warn('Warning: Could not clean up legacy storage:', error);
    }
  }

  /**
   * Get mode description for UI display
   */
  getModeDescription(mode = null) {
    const targetMode = mode || this.mode;
    
    const descriptions = {
      'strict': {
        name: 'Strict Validation',
        description: 'Only registered volunteers allowed',
        icon: '🔒',
        class: 'strict-mode'
      },
      'no-validation': {
        name: 'No Validation',
        description: 'Any ID accepted (Use with caution)',
        icon: '⚠️',
        class: 'no-validation-mode warning'
      },
      'create-if-not-found': {
        name: 'Create If Not Found',
        description: 'Auto-register new volunteers',
        icon: '➕',
        class: 'create-mode'
      }
    };
    
    return descriptions[targetMode] || descriptions['strict'];
  }

  /**
   * Process volunteer creation result (called after user creates volunteer)
   * @param {Object} volunteerData - The created volunteer data
   * @param {string} eventId - The current event ID
   */
  async processVolunteerCreation(volunteerData, eventId) {
    try {
      // Create the volunteer record
      const volunteer = await Storage.addVolunteer(volunteerData);
      
      // Log the creation
      if (this.auditLogger) {
        await this.auditLogger.logVolunteerCreation({
          volunteerId: volunteer.id,
          volunteerName: volunteer.name,
          eventId,
          mode: 'create-if-not-found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Return success result for attendance recording
      return {
        isValid: true,
        volunteer: volunteer,
        status: 'ID Created',
        requiresAction: false,
        mode: this.mode
      };
      
    } catch (error) {
      console.error('Error processing volunteer creation:', error);
      return {
        isValid: false,
        volunteer: null,
        status: null,
        requiresAction: false,
        errorMessage: error.message || 'Failed to create volunteer',
        mode: this.mode
      };
    }
  }

  /**
   * Get validation statistics
   */
  async getValidationStats(period = 'today') {
    if (!this.auditLogger) {
      return null;
    }
    
    return await this.auditLogger.getValidationStats(period);
  }
}



// Global instance
window.ValidationEngine = new ValidationEngine();