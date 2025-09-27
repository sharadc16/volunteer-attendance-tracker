/**
 * Validation Indicators Component - Shows current validation mode status
 */
window.ValidationIndicators = {
  currentMode: 'strict', // Default mode
  container: null,
  
  // Initialize validation indicators
  init() {
    this.setupEventListeners();
    this.loadCurrentMode();
    console.log('ValidationIndicators initialized');
  },
  
  // Setup event listeners
  setupEventListeners() {
    // Listen for validation mode changes
    Utils.Event.on('validationModeChanged', (e) => {
      console.log('ValidationIndicators: Received validationModeChanged event:', e.detail);
      this.updateMode(e.detail.newMode);
    });
    
    // Listen for config changes
    Utils.Event.on('configUpdated', () => {
      console.log('ValidationIndicators: Received configUpdated event');
      this.loadCurrentMode();
    });
    
    // Listen for ValidationEngine initialization
    Utils.Event.on('validationEngineInitialized', () => {
      console.log('ValidationIndicators: Received validationEngineInitialized event');
      this.loadCurrentMode();
    });
    
    // Listen for scanner updates
    Utils.Event.on('updateValidationIndicators', (e) => {
      console.log('ValidationIndicators: Received updateValidationIndicators event:', e.detail);
      if (e.detail && e.detail.mode) {
        this.updateMode(e.detail.mode);
      }
    });
  },
  
  // Load current validation mode from ValidationEngine (SINGLE SOURCE OF TRUTH)
  loadCurrentMode() {
    try {
      let mode = 'strict'; // Default fallback
      
      // ONLY use ValidationEngine - no more Config fallback
      if (window.ValidationEngine && window.ValidationEngine.isInitialized) {
        mode = window.ValidationEngine.getMode();
        console.log('ValidationIndicators: Loaded mode from ValidationEngine (single source):', mode);
      } else {
        console.log('ValidationIndicators: ValidationEngine not ready, using default mode:', mode);
      }
      
      this.updateMode(mode);
    } catch (error) {
      console.error('Error loading validation mode:', error);
      this.updateMode('strict'); // Fallback to strict mode
    }
  },
  
  // Update current mode and refresh display
  updateMode(mode) {
    if (this.currentMode !== mode) {
      console.log(`ValidationIndicators: Mode changed from '${this.currentMode}' to '${mode}'`);
      this.currentMode = mode;
      this.render();
    } else {
      console.log(`ValidationIndicators: Mode unchanged (${mode}), but forcing render`);
      // Force render even if mode hasn't changed to ensure UI is updated
      this.render();
    }
  },
  
  // Render validation indicators (now as subtle icon)
  render() {
    const iconElement = Utils.DOM.get('#validationModeIcon');
    
    if (!iconElement) {
      console.warn('Validation mode icon element not found');
      return;
    }
    
    const indicator = this.getModeIndicator();
    
    // Update the icon and tooltip
    iconElement.textContent = indicator.icon;
    iconElement.title = `${indicator.text}: ${indicator.description}`;
    iconElement.className = `validation-mode-icon ${indicator.class}`;
    
    console.log(`ValidationIndicators: Updated icon to ${indicator.icon} (${indicator.text})`);
    
    // Add click handler for mode details if not already added
    if (!iconElement.hasAttribute('data-click-handler')) {
      iconElement.addEventListener('click', () => {
        this.showModeDetails();
      });
      iconElement.setAttribute('data-click-handler', 'true');
    }
  },
  
  // Get mode indicator configuration
  getModeIndicator() {
    // Use ValidationEngine as the source of truth for mode descriptions
    if (window.ValidationEngine && window.ValidationEngine.isInitialized) {
      const engineInfo = window.ValidationEngine.getModeDescription(this.currentMode);
      
      // Add detailed descriptions for the modal
      const detailsMap = {
        'strict': 'Scanner will only accept IDs from registered volunteers. Unknown IDs will be rejected with an error message.',
        'no-validation': 'Scanner will accept any scanned ID without checking volunteer registration. Use with caution for open events.',
        'create-if-not-found': 'Scanner will check for existing volunteers and prompt to register new ones when unknown IDs are scanned.'
      };
      
      return {
        icon: engineInfo.icon,
        text: engineInfo.name,
        description: engineInfo.description,
        class: engineInfo.class,
        details: detailsMap[this.currentMode] || detailsMap['strict']
      };
    }
    
    // Fallback indicators if ValidationEngine is not available
    const fallbackIndicators = {
      'strict': {
        icon: '🔒',
        text: 'Strict Mode',
        description: 'Only registered volunteers',
        class: 'strict-mode',
        details: 'Scanner will only accept IDs from registered volunteers. Unknown IDs will be rejected with an error message.'
      },
      'no-validation': {
        icon: '⚠️',
        text: 'No Validation',
        description: 'Any ID accepted',
        class: 'no-validation-mode warning',
        details: 'Scanner will accept any scanned ID without checking volunteer registration. Use with caution for open events.'
      },
      'create-if-not-found': {
        icon: '➕',
        text: 'Create Mode',
        description: 'Auto-register new volunteers',
        class: 'create-mode',
        details: 'Scanner will check for existing volunteers and prompt to register new ones when unknown IDs are scanned.'
      }
    };
    
    return fallbackIndicators[this.currentMode] || fallbackIndicators['strict'];
  },
  
  // Show detailed mode information
  showModeDetails() {
    const indicator = this.getModeIndicator();
    
    UI.Modal.show(
      `${indicator.icon} ${indicator.text}`,
      `
        <div class="validation-mode-details">
          <p class="mode-description-full">${indicator.details}</p>
          <div class="mode-actions">
            <p><strong>Current Status:</strong> ${indicator.description}</p>
            <p><small>Click on Settings to change validation mode</small></p>
          </div>
        </div>
      `,
      [
        {
          text: 'Settings',
          class: 'btn-primary',
          handler: () => {
            UI.Modal.hide();
            // Navigate to settings
            Utils.Event.emit('viewChanged', { view: 'settings' });
          }
        },
        {
          text: 'Close',
          class: 'btn-secondary',
          handler: () => {
            UI.Modal.hide();
          }
        }
      ]
    );
  },
  
  // Create validation indicators HTML for integration
  createHTML() {
    return '<div id="validationIndicators" class="validation-indicators"></div>';
  },
  
  // Get current mode for external access
  getCurrentMode() {
    return this.currentMode;
  },
  
  // Check if current mode is strict
  isStrictMode() {
    return this.currentMode === 'strict';
  },
  
  // Check if current mode is no validation
  isNoValidationMode() {
    return this.currentMode === 'no-validation';
  },
  
  // Check if current mode is create mode
  isCreateMode() {
    return this.currentMode === 'create-if-not-found';
  },
  
  // Force refresh display
  refresh() {
    this.loadCurrentMode();
    this.render();
  }
};