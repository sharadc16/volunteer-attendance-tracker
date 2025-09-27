/**
 * Loading Manager Service
 * Provides centralized loading indicators and progress feedback for long operations
 * Requirements: 1.3, 4.2, 5.4
 */
class LoadingManager {
  constructor() {
    this.activeLoaders = new Map();
    this.globalLoadingCount = 0;
    this.isInitialized = false;
    
    // Loading states
    this.loadingStates = {
      IDLE: 'idle',
      LOADING: 'loading',
      SUCCESS: 'success',
      ERROR: 'error'
    };
    
    // Default loading messages
    this.defaultMessages = {
      sync: 'Synchronizing data...',
      save: 'Saving...',
      load: 'Loading...',
      validate: 'Validating...',
      connect: 'Connecting...',
      process: 'Processing...',
      upload: 'Uploading...',
      download: 'Downloading...',
      authenticate: 'Authenticating...',
      scan: 'Processing scan...'
    };
    
    // Bind methods
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.update = this.update.bind(this);
  }

  /**
   * Initialize loading manager
   */
  async init() {
    if (this.isInitialized) return true;

    try {
      // Create global loading overlay if it doesn't exist
      this.createGlobalLoadingOverlay();
      
      // Set up styles
      this.injectLoadingStyles();
      
      this.isInitialized = true;
      console.log('LoadingManager initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize LoadingManager:', error);
      return false;
    }
  }

  /**
   * Show loading indicator
   * @param {string|Element} target - Target element or selector
   * @param {Object} options - Loading options
   */
  show(target, options = {}) {
    const config = {
      message: options.message || this.defaultMessages.load,
      type: options.type || 'spinner',
      overlay: options.overlay !== false,
      timeout: options.timeout || null,
      progress: options.progress || null,
      cancellable: options.cancellable || false,
      onCancel: options.onCancel || null,
      ...options
    };
    
    // Handle global loading
    if (target === 'global' || !target) {
      return this.showGlobalLoading(config);
    }
    
    // Handle element-specific loading
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) {
      console.warn('Loading target element not found:', target);
      return null;
    }
    
    const loaderId = this.generateLoaderId(target);
    
    // Store original state if not already stored
    if (!this.activeLoaders.has(loaderId)) {
      this.storeOriginalState(element, loaderId);
    }
    
    // Create and show loading indicator
    this.createLoadingIndicator(element, config, loaderId);
    
    // Set timeout if specified
    if (config.timeout) {
      setTimeout(() => {
        this.hide(target);
      }, config.timeout);
    }
    
    return loaderId;
  }

  /**
   * Hide loading indicator
   * @param {string|Element} target - Target element or selector or loader ID
   */
  hide(target) {
    // Handle global loading
    if (target === 'global' || !target) {
      return this.hideGlobalLoading();
    }
    
    // Handle loader ID
    if (this.activeLoaders.has(target)) {
      return this.hideByLoaderId(target);
    }
    
    // Handle element target
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) {
      console.warn('Loading target element not found for hiding:', target);
      return false;
    }
    
    const loaderId = this.generateLoaderId(target);
    return this.hideByLoaderId(loaderId);
  }

  /**
   * Update loading indicator
   * @param {string} loaderId - Loader ID
   * @param {Object} updates - Updates to apply
   */
  update(loaderId, updates) {
    const loader = this.activeLoaders.get(loaderId);
    if (!loader) {
      console.warn('Loader not found for update:', loaderId);
      return false;
    }
    
    // Update message
    if (updates.message) {
      const messageEl = loader.element.querySelector('.loading-message');
      if (messageEl) {
        messageEl.textContent = updates.message;
      }
    }
    
    // Update progress
    if (updates.progress !== undefined) {
      this.updateProgress(loader.element, updates.progress);
    }
    
    // Update state
    if (updates.state) {
      this.updateState(loader.element, updates.state);
    }
    
    return true;
  }

  /**
   * Show progress for operation
   * @param {string|Element} target - Target element
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  showProgress(target, progress, message) {
    const loaderId = this.show(target, {
      type: 'progress',
      message: message || 'Processing...',
      progress: progress
    });
    
    return loaderId;
  }

  /**
   * Update progress
   * @param {string} loaderId - Loader ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Optional message update
   */
  updateProgress(loaderId, progress, message) {
    const loader = this.activeLoaders.get(loaderId);
    if (!loader) return false;
    
    const progressBar = loader.element.querySelector('.loading-progress-bar');
    const progressText = loader.element.querySelector('.loading-progress-text');
    
    if (progressBar) {
      progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }
    
    if (message) {
      this.update(loaderId, { message });
    }
    
    return true;
  }

  /**
   * Show success state
   * @param {string|Element} target - Target element
   * @param {string} message - Success message
   * @param {number} duration - How long to show success (ms)
   */
  showSuccess(target, message = 'Success!', duration = 2000) {
    const loaderId = this.show(target, {
      type: 'success',
      message: message,
      timeout: duration
    });
    
    return loaderId;
  }

  /**
   * Show error state
   * @param {string|Element} target - Target element
   * @param {string} message - Error message
   * @param {number} duration - How long to show error (ms)
   */
  showError(target, message = 'Error occurred', duration = 3000) {
    const loaderId = this.show(target, {
      type: 'error',
      message: message,
      timeout: duration
    });
    
    return loaderId;
  }

  /**
   * Wrap async operation with loading indicator
   * @param {string|Element} target - Target element
   * @param {Function} operation - Async operation to execute
   * @param {Object} options - Loading options
   */
  async wrapOperation(target, operation, options = {}) {
    const loaderId = this.show(target, options);
    
    try {
      const result = await operation((progress, message) => {
        // Allow operation to update progress
        if (progress !== undefined) {
          this.updateProgress(loaderId, progress, message);
        } else if (message) {
          this.update(loaderId, { message });
        }
      });
      
      // Show success briefly if configured
      if (options.showSuccess) {
        this.update(loaderId, {
          state: this.loadingStates.SUCCESS,
          message: options.successMessage || 'Success!'
        });
        
        setTimeout(() => this.hide(loaderId), options.successDuration || 1000);
      } else {
        this.hide(loaderId);
      }
      
      return { success: true, result };
      
    } catch (error) {
      // Show error briefly if configured
      if (options.showError) {
        this.update(loaderId, {
          state: this.loadingStates.ERROR,
          message: options.errorMessage || 'Error occurred'
        });
        
        setTimeout(() => this.hide(loaderId), options.errorDuration || 2000);
      } else {
        this.hide(loaderId);
      }
      
      return { success: false, error };
    }
  }

  /**
   * Generate unique loader ID
   */
  generateLoaderId(target) {
    if (typeof target === 'string') {
      return `loader_${target.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    }
    
    if (target && target.id) {
      return `loader_${target.id}_${Date.now()}`;
    }
    
    return `loader_${Utils.String.generateId()}`;
  }

  /**
   * Store original element state
   */
  storeOriginalState(element, loaderId) {
    const originalState = {
      element: element,
      innerHTML: element.innerHTML,
      className: element.className,
      disabled: element.disabled,
      style: {
        position: element.style.position,
        overflow: element.style.overflow
      }
    };
    
    this.activeLoaders.set(loaderId, originalState);
  }

  /**
   * Create loading indicator
   */
  createLoadingIndicator(element, config, loaderId) {
    const loader = this.activeLoaders.get(loaderId);
    if (!loader) return;
    
    // Set element styles for loading
    element.style.position = element.style.position || 'relative';
    element.classList.add('loading-container');
    
    // Create loading HTML based on type
    let loadingHTML = '';
    
    switch (config.type) {
      case 'spinner':
        loadingHTML = this.createSpinnerHTML(config);
        break;
      case 'progress':
        loadingHTML = this.createProgressHTML(config);
        break;
      case 'success':
        loadingHTML = this.createSuccessHTML(config);
        break;
      case 'error':
        loadingHTML = this.createErrorHTML(config);
        break;
      default:
        loadingHTML = this.createSpinnerHTML(config);
    }
    
    // Add overlay if requested
    if (config.overlay) {
      element.innerHTML = `
        <div class="loading-overlay">
          ${loadingHTML}
        </div>
        <div class="loading-original-content" style="opacity: 0.3; pointer-events: none;">
          ${loader.innerHTML}
        </div>
      `;
    } else {
      element.innerHTML = loadingHTML;
    }
    
    // Disable element if it's interactive
    if (element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
      element.disabled = true;
    }
  }

  /**
   * Create spinner HTML
   */
  createSpinnerHTML(config) {
    return `
      <div class="loading-indicator loading-spinner-container">
        <div class="loading-spinner"></div>
        <div class="loading-message">${config.message}</div>
        ${config.cancellable ? '<button class="loading-cancel-btn" onclick="window.LoadingManager.cancel(this)">Cancel</button>' : ''}
      </div>
    `;
  }

  /**
   * Create progress HTML
   */
  createProgressHTML(config) {
    const progress = config.progress || 0;
    
    return `
      <div class="loading-indicator loading-progress-container">
        <div class="loading-message">${config.message}</div>
        <div class="loading-progress">
          <div class="loading-progress-bar" style="width: ${progress}%"></div>
          <div class="loading-progress-text">${Math.round(progress)}%</div>
        </div>
        ${config.cancellable ? '<button class="loading-cancel-btn" onclick="window.LoadingManager.cancel(this)">Cancel</button>' : ''}
      </div>
    `;
  }

  /**
   * Create success HTML
   */
  createSuccessHTML(config) {
    return `
      <div class="loading-indicator loading-success-container">
        <div class="loading-success-icon">✅</div>
        <div class="loading-message">${config.message}</div>
      </div>
    `;
  }

  /**
   * Create error HTML
   */
  createErrorHTML(config) {
    return `
      <div class="loading-indicator loading-error-container">
        <div class="loading-error-icon">❌</div>
        <div class="loading-message">${config.message}</div>
      </div>
    `;
  }

  /**
   * Hide loader by ID
   */
  hideByLoaderId(loaderId) {
    const loader = this.activeLoaders.get(loaderId);
    if (!loader) return false;
    
    // Restore original state
    loader.element.innerHTML = loader.innerHTML;
    loader.element.className = loader.className;
    loader.element.disabled = loader.disabled;
    
    // Restore styles
    Object.assign(loader.element.style, loader.style);
    
    // Remove loading class
    loader.element.classList.remove('loading-container');
    
    // Remove from active loaders
    this.activeLoaders.delete(loaderId);
    
    return true;
  }

  /**
   * Show global loading overlay
   */
  showGlobalLoading(config) {
    this.globalLoadingCount++;
    
    const overlay = document.getElementById('globalLoadingOverlay');
    if (!overlay) return null;
    
    // Update message
    const messageEl = overlay.querySelector('.global-loading-message');
    if (messageEl) {
      messageEl.textContent = config.message;
    }
    
    // Show overlay
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    
    // Disable body scrolling
    document.body.style.overflow = 'hidden';
    
    const loaderId = `global_${Date.now()}`;
    this.activeLoaders.set(loaderId, { type: 'global', element: overlay });
    
    return loaderId;
  }

  /**
   * Hide global loading overlay
   */
  hideGlobalLoading() {
    this.globalLoadingCount = Math.max(0, this.globalLoadingCount - 1);
    
    if (this.globalLoadingCount === 0) {
      const overlay = document.getElementById('globalLoadingOverlay');
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
      }
      
      // Re-enable body scrolling
      document.body.style.overflow = '';
      
      // Remove global loaders
      for (const [loaderId, loader] of this.activeLoaders.entries()) {
        if (loader.type === 'global') {
          this.activeLoaders.delete(loaderId);
        }
      }
    }
    
    return true;
  }

  /**
   * Create global loading overlay
   */
  createGlobalLoadingOverlay() {
    // Check if overlay already exists
    if (document.getElementById('globalLoadingOverlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'globalLoadingOverlay';
    overlay.className = 'global-loading-overlay';
    overlay.innerHTML = `
      <div class="global-loading-content">
        <div class="global-loading-spinner"></div>
        <div class="global-loading-message">Loading...</div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  /**
   * Inject loading styles
   */
  injectLoadingStyles() {
    // Check if styles already injected
    if (document.getElementById('loadingManagerStyles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'loadingManagerStyles';
    styles.textContent = `
      /* Loading Container */
      .loading-container {
        position: relative !important;
      }
      
      /* Loading Overlay */
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        border-radius: inherit;
      }
      
      /* Loading Indicator */
      .loading-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px;
        text-align: center;
      }
      
      /* Spinner */
      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        animation: loadingSpinnerRotate 1s linear infinite;
      }
      
      @keyframes loadingSpinnerRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Loading Message */
      .loading-message {
        font-size: 14px;
        color: #666;
        font-weight: 500;
      }
      
      /* Progress Bar */
      .loading-progress {
        position: relative;
        width: 200px;
        height: 8px;
        background: #f0f0f0;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .loading-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #007bff, #0056b3);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .loading-progress-text {
        position: absolute;
        top: -20px;
        right: 0;
        font-size: 12px;
        color: #666;
      }
      
      /* Success/Error Icons */
      .loading-success-icon,
      .loading-error-icon {
        font-size: 32px;
      }
      
      .loading-success-container .loading-message {
        color: #28a745;
      }
      
      .loading-error-container .loading-message {
        color: #dc3545;
      }
      
      /* Cancel Button */
      .loading-cancel-btn {
        padding: 6px 12px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      
      .loading-cancel-btn:hover {
        background: #5a6268;
      }
      
      /* Global Loading Overlay */
      .global-loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      
      .global-loading-content {
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      
      .global-loading-spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: loadingSpinnerRotate 1s linear infinite;
      }
      
      .global-loading-message {
        font-size: 16px;
        color: #333;
        font-weight: 500;
      }
      
      /* Responsive Design */
      @media (max-width: 768px) {
        .loading-progress {
          width: 150px;
        }
        
        .global-loading-content {
          margin: 20px;
          padding: 30px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Cancel loading operation
   */
  cancel(buttonElement) {
    // Find the loader container
    const container = buttonElement.closest('.loading-indicator');
    if (!container) return;
    
    // Find the loader ID
    for (const [loaderId, loader] of this.activeLoaders.entries()) {
      if (loader.element.contains(container)) {
        // Call cancel handler if provided
        const cancelHandler = loader.onCancel;
        if (cancelHandler && typeof cancelHandler === 'function') {
          cancelHandler();
        }
        
        // Hide the loader
        this.hide(loaderId);
        break;
      }
    }
  }

  /**
   * Get active loaders count
   */
  getActiveLoadersCount() {
    return this.activeLoaders.size;
  }

  /**
   * Check if target is currently loading
   */
  isLoading(target) {
    if (target === 'global') {
      return this.globalLoadingCount > 0;
    }
    
    const loaderId = this.generateLoaderId(target);
    return this.activeLoaders.has(loaderId);
  }

  /**
   * Hide all active loaders
   */
  hideAll() {
    const loaderIds = Array.from(this.activeLoaders.keys());
    loaderIds.forEach(loaderId => this.hide(loaderId));
    
    // Also hide global loading
    this.hideGlobalLoading();
  }
}

// Global instance
window.LoadingManager = new LoadingManager();