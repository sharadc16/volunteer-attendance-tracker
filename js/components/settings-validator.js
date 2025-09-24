/**
 * Settings Form Validator
 * Provides real-time validation for settings form fields
 */
class SettingsValidator {
  constructor() {
    this.validationRules = null;
    this.validationTimeouts = new Map();
    this.validationResults = new Map();
  }

  /**
   * Initialize validator with ConfigManager rules
   */
  init() {
    if (window.ConfigManager) {
      this.validationRules = window.ConfigManager.getValidationRules();
      return true;
    }
    return false;
  }

  /**
   * Setup real-time validation for settings form
   */
  setupFormValidation() {
    if (!this.validationRules) {
      console.warn('Validation rules not available');
      return;
    }

    // Add validation to all form inputs
    this.setupFieldValidation('scannerPrefix', 'scanner', 'prefix');
    this.setupFieldValidation('scannerSuffix', 'scanner', 'suffix');
    this.setupFieldValidation('syncInterval', 'sync', 'interval', (value) => parseInt(value) * 1000);
    this.setupFieldValidation('googleApiKey', 'googleSheets', 'apiKey');
    this.setupFieldValidation('googleClientId', 'googleSheets', 'clientId');
    this.setupFieldValidation('googleSpreadsheetId', 'googleSheets', 'spreadsheetId');
    // googleSyncInterval removed - using single syncInterval for all sync operations
    this.setupFieldValidation('recentLimit', 'ui', 'recentAttendanceLimit', (value) => parseInt(value));
    this.setupFieldValidation('autoRefresh', 'ui', 'autoRefreshInterval', (value) => parseInt(value) * 1000);

    // Setup form submission validation
    this.setupFormSubmissionValidation();
  }

  /**
   * Setup validation for a specific field
   */
  setupFieldValidation(fieldId, section, field, transformer = null) {
    const input = window.UIUtils.DOM.get(`#${fieldId}`);
    if (!input) return;

    // Create validation feedback element
    const feedbackId = `${fieldId}Feedback`;
    let feedback = window.UIUtils.DOM.get(`#${feedbackId}`);
    
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.id = feedbackId;
      feedback.className = 'field-feedback';
      input.parentNode.insertBefore(feedback, input.nextSibling);
    }

    // Add event listeners
    window.UIUtils.Events.on(input, 'input', () => this.validateField(fieldId, section, field, transformer));
    window.UIUtils.Events.on(input, 'blur', () => this.validateField(fieldId, section, field, transformer));
    window.UIUtils.Events.on(input, 'focus', () => this.clearFieldFeedback(fieldId));
  }

  /**
   * Validate a single field
   */
  async validateField(fieldId, section, field, transformer = null) {
    const input = window.UIUtils.DOM.get(`#${fieldId}`);
    const feedback = window.UIUtils.DOM.get(`#${fieldId}Feedback`);
    
    if (!input || !feedback) return;

    // Clear previous timeout
    if (this.validationTimeouts.has(fieldId)) {
      clearTimeout(this.validationTimeouts.get(fieldId));
    }

    // Debounce validation
    const timeout = setTimeout(async () => {
      try {
        let value = input.value;
        
        // Apply transformer if provided
        if (transformer && value) {
          value = transformer(value);
        }

        // Validate using ConfigManager
        const result = window.ConfigManager.validateField(section, field, value);
        
        // Store result
        this.validationResults.set(fieldId, result);
        
        // Update UI
        this.updateFieldFeedback(fieldId, result);
        
        // Update form validation state
        this.updateFormValidationState();
        
      } catch (error) {
        console.error(`Validation error for ${fieldId}:`, error);
        this.showFieldError(fieldId, 'Validation error');
      }
    }, 300);

    this.validationTimeouts.set(fieldId, timeout);
  }

  /**
   * Update field feedback UI
   */
  updateFieldFeedback(fieldId, result) {
    const input = window.UIUtils.DOM.get(`#${fieldId}`);
    const feedback = window.UIUtils.DOM.get(`#${fieldId}Feedback`);
    
    if (!input || !feedback) return;

    // Clear previous classes
    input.classList.remove('field-valid', 'field-invalid', 'field-warning');
    feedback.className = 'field-feedback';
    feedback.innerHTML = '';

    if (!result.isValid && result.errors.length > 0) {
      // Show errors
      input.classList.add('field-invalid');
      feedback.classList.add('field-feedback-error');
      feedback.innerHTML = result.errors.map(error => 
        `<div class="feedback-message error">${error}</div>`
      ).join('');
    } else if (result.warnings && result.warnings.length > 0) {
      // Show warnings
      input.classList.add('field-warning');
      feedback.classList.add('field-feedback-warning');
      feedback.innerHTML = result.warnings.map(warning => 
        `<div class="feedback-message warning">${warning}</div>`
      ).join('');
    } else if (result.isValid && input.value.trim()) {
      // Show success for non-empty valid fields
      input.classList.add('field-valid');
      feedback.classList.add('field-feedback-success');
      feedback.innerHTML = '<div class="feedback-message success">✓ Valid</div>';
    }
  }

  /**
   * Clear field feedback
   */
  clearFieldFeedback(fieldId) {
    const input = document.getElementById(fieldId);
    const feedback = document.getElementById(`${fieldId}Feedback`);
    
    if (input) {
      input.classList.remove('field-valid', 'field-invalid', 'field-warning');
    }
    
    if (feedback) {
      feedback.className = 'field-feedback';
      feedback.innerHTML = '';
    }
  }

  /**
   * Show field error
   */
  showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const feedback = document.getElementById(`${fieldId}Feedback`);
    
    if (input) {
      input.classList.add('field-invalid');
    }
    
    if (feedback) {
      feedback.className = 'field-feedback field-feedback-error';
      feedback.innerHTML = `<div class="feedback-message error">${message}</div>`;
    }
  }

  /**
   * Setup form submission validation
   */
  setupFormSubmissionValidation() {
    // Find save button
    const saveButton = document.querySelector('.modal-footer .btn-primary');
    if (!saveButton) return;

    // Store original handler
    const originalHandler = saveButton.onclick;
    
    // Replace with validation wrapper
    saveButton.onclick = async (e) => {
      e.preventDefault();
      
      try {
        const isValid = await this.validateForm();
        
        if (isValid) {
          // Show validation summary for user confirmation
          const summary = this.getValidationSummary();
          if (summary.warningFields > 0) {
            const proceed = await this.showValidationWarnings(summary.warnings);
            if (!proceed) {
              return;
            }
          }
          
          // Call original handler
          if (originalHandler) {
            originalHandler.call(saveButton, e);
          }
        } else {
          const summary = this.getValidationSummary();
          this.showValidationErrors(summary.errors);
        }
      } catch (error) {
        console.error('Form validation error:', error);
        Utils.Notify.error('Validation failed: ' + error.message);
      }
    };
  }

  /**
   * Show validation warnings to user
   */
  async showValidationWarnings(warnings) {
    return new Promise((resolve) => {
      const warningList = warnings.map(w => `• ${w}`).join('\n');
      const message = `Settings have warnings:\n\n${warningList}\n\nDo you want to continue saving?`;
      
      if (window.UI && window.UI.Modal && window.UI.Modal.confirm) {
        window.UI.Modal.confirm('Settings Warnings', message, 
          () => resolve(true), 
          () => resolve(false)
        );
      } else {
        resolve(confirm(message));
      }
    });
  }

  /**
   * Show validation errors to user
   */
  showValidationErrors(errors) {
    const errorList = errors.slice(0, 5).map(e => `• ${e}`).join('\n');
    const message = errors.length > 5 ? 
      `${errorList}\n... and ${errors.length - 5} more errors` : 
      errorList;
    
    if (window.Utils && window.Utils.Notify) {
      window.Utils.Notify.error(`Please fix validation errors:\n${message}`);
    } else {
      alert(`Please fix validation errors:\n${message}`);
    }
  }

  /**
   * Validate entire form
   */
  async validateForm() {
    // Trigger validation for all fields
    const fieldValidations = [
      this.validateField('scannerPrefix', 'scanner', 'prefix'),
      this.validateField('scannerSuffix', 'scanner', 'suffix'),
      this.validateField('syncInterval', 'sync', 'interval', (value) => parseInt(value) * 1000),
      this.validateField('googleApiKey', 'googleSheets', 'apiKey'),
      this.validateField('googleClientId', 'googleSheets', 'clientId'),
      this.validateField('googleSpreadsheetId', 'googleSheets', 'spreadsheetId'),
      // googleSyncInterval removed - using single syncInterval
      this.validateField('recentLimit', 'ui', 'recentAttendanceLimit', (value) => parseInt(value)),
      this.validateField('autoRefresh', 'ui', 'autoRefreshInterval', (value) => parseInt(value) * 1000)
    ];

    // Wait for all validations to complete
    await Promise.all(fieldValidations);

    // Check if any field has errors
    let hasErrors = false;
    for (const [fieldId, result] of this.validationResults) {
      if (!result.isValid) {
        hasErrors = true;
        break;
      }
    }

    return !hasErrors;
  }

  /**
   * Update form validation state
   */
  updateFormValidationState() {
    const saveButton = document.querySelector('.modal-footer .btn-primary');
    if (!saveButton) return;

    // Check if any field has errors
    let hasErrors = false;
    for (const [fieldId, result] of this.validationResults) {
      if (!result.isValid) {
        hasErrors = true;
        break;
      }
    }

    // Update button state
    if (hasErrors) {
      saveButton.classList.add('btn-disabled');
      saveButton.title = 'Fix validation errors before saving';
    } else {
      saveButton.classList.remove('btn-disabled');
      saveButton.title = 'Save settings';
    }
  }

  /**
   * Get validation summary
   */
  getValidationSummary() {
    const summary = {
      totalFields: this.validationResults.size,
      validFields: 0,
      invalidFields: 0,
      warningFields: 0,
      errors: [],
      warnings: [],
      fieldDetails: new Map()
    };

    for (const [fieldId, result] of this.validationResults) {
      const fieldDetail = {
        fieldId,
        isValid: result.isValid,
        errors: result.errors || [],
        warnings: result.warnings || []
      };

      summary.fieldDetails.set(fieldId, fieldDetail);

      if (!result.isValid) {
        summary.invalidFields++;
        summary.errors.push(...result.errors);
      } else {
        summary.validFields++;
      }

      if (result.warnings && result.warnings.length > 0) {
        summary.warningFields++;
        summary.warnings.push(...result.warnings);
      }
    }

    return summary;
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    const summary = this.getValidationSummary();
    
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        isValid: summary.invalidFields === 0,
        totalFields: summary.totalFields,
        validFields: summary.validFields,
        invalidFields: summary.invalidFields,
        warningFields: summary.warningFields
      },
      errors: summary.errors,
      warnings: summary.warnings,
      fieldDetails: Object.fromEntries(summary.fieldDetails)
    };

    return report;
  }

  /**
   * Clear all validation results
   */
  clearValidation() {
    // Clear timeouts
    for (const timeout of this.validationTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.validationTimeouts.clear();

    // Clear results
    this.validationResults.clear();

    // Clear UI feedback
    const feedbacks = document.querySelectorAll('.field-feedback');
    feedbacks.forEach(feedback => {
      feedback.className = 'field-feedback';
      feedback.innerHTML = '';
    });

    const inputs = document.querySelectorAll('.field-valid, .field-invalid, .field-warning');
    inputs.forEach(input => {
      input.classList.remove('field-valid', 'field-invalid', 'field-warning');
    });
  }
}

// Global instance
window.SettingsValidator = new SettingsValidator();