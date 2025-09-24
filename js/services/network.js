/**
 * Network Status Manager
 * Handles network connectivity detection and offline mode management
 */
class NetworkManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.offlineQueue = [];
    this.connectionCheckInterval = null;
    this.lastConnectionCheck = Date.now();
    this.connectionCheckFrequency = 30000; // 30 seconds
    
    // Bind methods
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    this.checkConnection = this.checkConnection.bind(this);
    
    this.init();
  }

  /**
   * Initialize network monitoring
   */
  init() {
    // Listen for browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Start periodic connection checks
    this.startConnectionChecks();
    
    // Initial connection check
    this.checkConnection();
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Network: Browser reports online');
    this.setOnlineStatus(true);
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Network: Browser reports offline');
    this.setOnlineStatus(false);
  }  
/**
   * Set online status and notify listeners
   */
  setOnlineStatus(isOnline) {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;
    
    if (wasOnline !== isOnline) {
      console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
      
      // Notify listeners
      this.notifyListeners(isOnline);
      
      // Emit global event
      window.dispatchEvent(new CustomEvent('networkStatusChange', {
        detail: { isOnline, wasOnline }
      }));
      
      // If back online, process offline queue
      if (isOnline && !wasOnline) {
        this.processOfflineQueue();
      }
    }
  }

  /**
   * Check actual network connectivity
   */
  async checkConnection() {
    try {
      // Try to fetch a small resource from Google
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If we get here, we have connectivity
      this.setOnlineStatus(true);
      this.lastConnectionCheck = Date.now();
      
    } catch (error) {
      console.warn('Network connectivity check failed:', error.message);
      
      // Only set offline if we haven't had a successful check recently
      const timeSinceLastCheck = Date.now() - this.lastConnectionCheck;
      if (timeSinceLastCheck > this.connectionCheckFrequency * 2) {
        this.setOnlineStatus(false);
      }
    }
  }

  /**
   * Start periodic connection checks
   */
  startConnectionChecks() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    this.connectionCheckInterval = setInterval(() => {
      // Only check if browser thinks we're online but we haven't verified recently
      if (navigator.onLine) {
        this.checkConnection();
      }
    }, this.connectionCheckFrequency);
  }

  /**
   * Stop periodic connection checks
   */
  stopConnectionChecks() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }  /**
  
 * Add network status listener
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove network status listener
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners(isOnline) {
    this.listeners.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Queue operation for when network is restored
   */
  queueOfflineOperation(operation) {
    this.offlineQueue.push({
      operation,
      timestamp: Date.now(),
      id: `offline_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    console.log(`Queued offline operation. Queue size: ${this.offlineQueue.length}`);
  }

  /**
   * Process queued offline operations
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) {
      return;
    }
    
    console.log(`Processing ${this.offlineQueue.length} queued offline operations`);
    
    const operations = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const queuedOp of operations) {
      try {
        await queuedOp.operation();
        console.log(`Successfully processed offline operation: ${queuedOp.id}`);
      } catch (error) {
        console.error(`Failed to process offline operation ${queuedOp.id}:`, error);
        
        // Re-queue if it's a network error
        if (this.isNetworkError(error)) {
          this.offlineQueue.push(queuedOp);
        }
      }
    }
    
    if (this.offlineQueue.length > 0) {
      console.log(`${this.offlineQueue.length} operations re-queued due to errors`);
    }
  } 
 /**
   * Check if error is network-related
   */
  isNetworkError(error) {
    const message = error.message?.toLowerCase() || '';
    
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('offline') ||
      error.name === 'NetworkError' ||
      error.code === 'NETWORK_ERROR'
    );
  }

  /**
   * Get current network status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      browserOnline: navigator.onLine,
      queueSize: this.offlineQueue.length,
      lastCheck: this.lastConnectionCheck
    };
  }

  /**
   * Force connection check
   */
  async forceConnectionCheck() {
    await this.checkConnection();
    return this.isOnline;
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue() {
    const clearedCount = this.offlineQueue.length;
    this.offlineQueue = [];
    console.log(`Cleared ${clearedCount} offline operations`);
    return clearedCount;
  }

  /**
   * Get offline queue info
   */
  getOfflineQueueInfo() {
    return this.offlineQueue.map(op => ({
      id: op.id,
      timestamp: op.timestamp,
      age: Date.now() - op.timestamp
    }));
  }

  /**
   * Cleanup resources
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.stopConnectionChecks();
    this.listeners = [];
    this.offlineQueue = [];
  }
}

// Global instance
window.NetworkManager = new NetworkManager();