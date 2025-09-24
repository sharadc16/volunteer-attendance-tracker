/**
 * Centralized Status Management System
 * Manages application state and notifies UI components of changes
 */
window.StatusManager = {
  
  // Application state
  state: {
    sync: {
      enabled: false,
      online: false,
      authenticated: false,
      syncing: false,
      lastSync: null,
      lastError: null
    },
    network: {
      online: navigator.onLine || false,
      lastCheck: Date.now()
    },
    auth: {
      initialized: false,
      authenticated: false,
      hasCredentials: false
    }
  },
  
  // Event listeners for state changes
  listeners: {
    sync: [],
    network: [],
    auth: []
  },
  
  /**
   * Initialize status manager
   */
  init() {
    try {
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Initial state check
      this.checkInitialState();
      
      console.log('StatusManager initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize StatusManager:', error);
      return false;
    }
  },
  
  /**
   * Set up network connectivity monitoring
   */
  setupNetworkMonitoring() {
    const updateNetworkStatus = () => {
      const wasOnline = this.state.network.online;
      const isOnline = navigator.onLine;
      
      if (wasOnline !== isOnline) {
        this.updateNetworkStatus(isOnline);
      }
    };
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  },
  
  /**
   * Check initial application state
   */
  checkInitialState() {
    // Check network
    this.updateNetworkStatus(navigator.onLine);
    
    // Check auth state
    if (window.AuthManager) {
      this.updateAuthStatus({
        initialized: window.AuthManager.isInitialized || false,
        authenticated: window.AuthManager.isAuthenticatedUser?.() || false,
        hasCredentials: window.CredentialManager?.areCredentialsReady?.() || false
      });
    }
    
    // Check sync state
    if (window.Sync) {
      this.updateSyncStatus({
        enabled: window.Sync.isEnabled || false,
        online: window.Sync.isOnline || false  // Use SyncManager's online status directly
      });
    }
  },
  
  /**
   * Update sync status and notify listeners
   */
  updateSyncStatus(updates) {
    const oldState = { ...this.state.sync };
    Object.assign(this.state.sync, updates);
    
    // SIMPLIFIED: Use the online status provided by SyncManager
    // SyncManager determines online status based on successful sync operations
    // Don't override it with complex network + auth calculations
    if (updates.hasOwnProperty('online')) {
      // If SyncManager explicitly provided an online status, use it
      this.state.sync.online = updates.online;
    } else {
      // Fallback: online if enabled and authenticated (simplified connectivity)
      this.state.sync.online = this.state.sync.enabled && this.state.auth.authenticated;
    }
    
    // Notify listeners if state changed
    if (this.hasStateChanged(oldState, this.state.sync)) {
      this.notifyListeners('sync', this.state.sync);
    }
  },
  
  /**
   * Update network status and notify listeners
   */
  updateNetworkStatus(isOnline) {
    const oldState = { ...this.state.network };
    this.state.network.online = isOnline;
    this.state.network.lastCheck = Date.now();
    
    // Sync online status is managed by SyncManager directly
    // No need to update it based on network changes
    
    // Notify listeners if state changed
    if (this.hasStateChanged(oldState, this.state.network)) {
      this.notifyListeners('network', this.state.network);
    }
  },
  
  /**
   * Update authentication status and notify listeners
   */
  updateAuthStatus(updates) {
    const oldState = { ...this.state.auth };
    Object.assign(this.state.auth, updates);
    
    // Sync online status is managed by SyncManager directly
    // No need to update it based on auth changes
    
    // Notify listeners if state changed
    if (this.hasStateChanged(oldState, this.state.auth)) {
      this.notifyListeners('auth', this.state.auth);
    }
  },
  
  /**
   * Check if state has changed
   */
  hasStateChanged(oldState, newState) {
    return JSON.stringify(oldState) !== JSON.stringify(newState);
  },
  
  /**
   * Add event listener for state changes
   */
  addEventListener(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type].push(callback);
    }
  },
  
  /**
   * Remove event listener
   */
  removeEventListener(type, callback) {
    if (this.listeners[type]) {
      const index = this.listeners[type].indexOf(callback);
      if (index > -1) {
        this.listeners[type].splice(index, 1);
      }
    }
  },
  
  /**
   * Notify all listeners of state change
   */
  notifyListeners(type, state) {
    console.log(`StatusManager: Notifying ${this.listeners[type]?.length || 0} listeners for ${type}:`, state);
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error(`Error in ${type} status listener:`, error);
        }
      });
    }
  },
  
  /**
   * Check network connectivity with actual request
   */
  async checkConnectivity() {
    try {
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });
      
      const isOnline = response.ok;
      if (isOnline !== this.state.network.online) {
        this.updateNetworkStatus(isOnline);
      }
      
    } catch (error) {
      if (this.state.network.online) {
        this.updateNetworkStatus(false);
      }
    }
  },
  
  /**
   * Get current application state
   */
  getState() {
    return {
      sync: { ...this.state.sync },
      network: { ...this.state.network },
      auth: { ...this.state.auth }
    };
  },
  
  /**
   * Format duration for display
   */
  formatDuration(ms) {
    if (!ms || ms < 0) return '0ms';
    
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  },
  
  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.StatusManager.init();
  });
} else {
  window.StatusManager.init();
}