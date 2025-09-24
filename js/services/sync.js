/**
 * Bidirectional Sync Manager
 * Handles Google Sheets synchronization with timestamp tracking and conflict resolution
 */
class SyncManager {
  constructor() {
    this.isEnabled = false;
    this.isOnline = false;
    this.isSyncing = false;
    this.syncInterval = null;
    this.syncQueue = [];
    this.lastSync = {
      timestamp: null,
      volunteers: null,
      events: null,
      attendance: null
    };
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastError: null,
      uploadedRecords: 0,
      downloadedRecords: 0,
      conflictsResolved: 0
    };
    this.syncListeners = [];
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds

    // Bind methods
    this.performSync = this.performSync.bind(this);
    this.handleSyncError = this.handleSyncError.bind(this);
    // onNetworkChange binding removed - no longer using network monitoring
  }

  /**
   * Initialize sync manager
   */
  async init() {
    try {
      // Load sync configuration - only enable if both sync and Google Sheets are enabled
      this.isEnabled = (window.Config?.sync?.enabled || false) && (window.Config?.googleSheets?.enabled || false);
      this.syncInterval = window.Config?.sync?.interval || 300000; // 5 minutes default

      // Load last sync timestamps
      await this.loadLastSync();

      // Load sync statistics
      await this.loadSyncStats();

      // Initialize offline queue management
      await this.initializeQueue();

      // Sync is online if we're authenticated (Google Sheets API will handle connectivity)
      this.isOnline = window.AuthManager?.isAuthenticatedUser() || false;

      // Update initial status
      await this.updateSyncStatus();

      // Start periodic sync if enabled
      if (this.isEnabled) {
        await this.startPeriodicSync();
      }

      console.log('SyncManager initialized successfully');
      this.notifyListeners('initialized', {
        enabled: this.isEnabled,
        queueAvailable: !!window.SyncQueue
      });

      return true;

    } catch (error) {
      console.error('Failed to initialize SyncManager:', error);
      this.handleSyncError(error);
      return false;
    }
  }

  /**
   * Load last sync timestamps from storage
   */
  async loadLastSync() {
    try {
      const stored = localStorage.getItem('vat_last_sync');
      if (stored) {
        this.lastSync = JSON.parse(stored);
      }

      // Ensure all timestamp fields exist
      if (!this.lastSync.volunteers) this.lastSync.volunteers = null;
      if (!this.lastSync.events) this.lastSync.events = null;
      if (!this.lastSync.attendance) this.lastSync.attendance = null;
      if (!this.lastSync.timestamp) this.lastSync.timestamp = null;

    } catch (error) {
      console.error('Error loading last sync timestamps:', error);
      this.resetLastSync();
    }
  }

  /**
   * Save last sync timestamps to storage
   */
  async saveLastSync(dataType = null) {
    try {
      const now = new Date().toISOString();

      if (dataType) {
        this.lastSync[dataType] = now;
      } else {
        // Update all timestamps
        this.lastSync.volunteers = now;
        this.lastSync.events = now;
        this.lastSync.attendance = now;
      }

      this.lastSync.timestamp = now;

      localStorage.setItem('vat_last_sync', JSON.stringify(this.lastSync));

    } catch (error) {
      console.error('Error saving last sync timestamps:', error);
    }
  }

  /**
   * Reset last sync timestamps
   */
  resetLastSync() {
    this.lastSync = {
      timestamp: null,
      volunteers: null,
      events: null,
      attendance: null
    };

    try {
      localStorage.removeItem('vat_last_sync');
    } catch (error) {
      console.error('Error resetting last sync timestamps:', error);
    }
  }

  /**
   * Load sync statistics from storage
   */
  async loadSyncStats() {
    try {
      const stored = localStorage.getItem('vat_sync_stats');
      if (stored) {
        this.syncStats = { ...this.syncStats, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading sync statistics:', error);
    }
  }

  /**
   * Save sync statistics to storage
   */
  async saveSyncStats() {
    try {
      localStorage.setItem('vat_sync_stats', JSON.stringify(this.syncStats));
    } catch (error) {
      console.error('Error saving sync statistics:', error);
    }
  }
  /**
   * Update sync status and UI
   */
  async updateSyncStatus() {
    try {
      // For successful sync, isOnline should already be set to true
      // For failed sync or initial status, use authentication-based connectivity
      const isAuthenticated = window.AuthManager?.isAuthenticatedUser() || false;

      // If we're not syncing and haven't had a recent successful sync, use authentication status
      if (!this.isSyncing && (!this.lastSync.timestamp || !isAuthenticated)) {
        this.isOnline = isAuthenticated;
      }
      // Otherwise, keep the current isOnline status (which would be true after successful sync)

      // Update UI elements
      this.updateStatusUI();

      // Notify listeners
      this.notifyListeners('statusUpdate', {
        enabled: this.isEnabled,
        online: this.isOnline,
        authenticated: isAuthenticated,
        syncing: this.isSyncing,
        lastSync: this.lastSync,
        stats: this.syncStats
      });

      // Notify centralized StatusManager
      if (window.StatusManager) {
        window.StatusManager.updateSyncStatus({
          enabled: this.isEnabled,
          online: this.isOnline,
          authenticated: isAuthenticated,
          syncing: this.isSyncing,
          lastSync: this.lastSync.timestamp
        });
      }

    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * Update sync status UI elements
   */
  updateStatusUI() {
    const syncStatus = document.querySelector('#syncStatus');
    if (!syncStatus) return;

    const statusText = syncStatus.querySelector('.status-text');
    const statusIcon = syncStatus.querySelector('.status-icon');

    if (!statusText) return;

    // Remove all status classes
    syncStatus.classList.remove('online', 'offline', 'syncing', 'error');

    if (this.isSyncing) {
      syncStatus.classList.add('syncing');
      statusText.textContent = 'Syncing...';
      syncStatus.title = 'Synchronization in progress';
      if (statusIcon) statusIcon.className = 'status-icon fas fa-sync-alt fa-spin';
    } else if (this.isEnabled && this.isOnline) {
      syncStatus.classList.add('online');
      statusText.textContent = 'Online';
      const lastSyncText = this.lastSync.timestamp ?
        new Date(this.lastSync.timestamp).toLocaleString() : 'Never';
      syncStatus.title = `Last sync: ${lastSyncText}`;
      if (statusIcon) statusIcon.className = 'status-icon fas fa-cloud-upload-alt';
    } else if (this.isEnabled && !this.isOnline) {
      syncStatus.classList.add('offline');
      statusText.textContent = 'Offline';
      syncStatus.title = 'No internet connection - changes will sync when online';
      if (statusIcon) statusIcon.className = 'status-icon fas fa-cloud-download-alt';
    } else {
      syncStatus.classList.add('offline');
      statusText.textContent = 'Disabled';
      syncStatus.title = 'Google Sheets sync is disabled';
      if (statusIcon) statusIcon.className = 'status-icon fas fa-times-circle';
    }

    // Update sync statistics in UI
    this.updateSyncStatsUI();
  }

  /**
   * Update sync statistics in UI
   */
  updateSyncStatsUI() {
    const statsElements = {
      totalSyncs: document.querySelector('#syncTotalCount'),
      successfulSyncs: document.querySelector('#syncSuccessCount'),
      failedSyncs: document.querySelector('#syncFailedCount'),
      uploadedRecords: document.querySelector('#syncUploadedCount'),
      downloadedRecords: document.querySelector('#syncDownloadedCount'),
      conflictsResolved: document.querySelector('#syncConflictsCount')
    };

    Object.entries(statsElements).forEach(([key, element]) => {
      if (element && this.syncStats[key] !== undefined) {
        element.textContent = this.syncStats[key].toString();
      }
    });

    // Update last error display
    const lastErrorElement = document.querySelector('#syncLastError');
    if (lastErrorElement) {
      if (this.syncStats.lastError) {
        lastErrorElement.textContent = this.syncStats.lastError;
        lastErrorElement.style.display = 'block';
      } else {
        lastErrorElement.style.display = 'none';
      }
    }
  }
  /**
   * Start periodic sync with configurable interval
   */
  async startPeriodicSync() {
    if (!this.isEnabled) {
      console.log('Sync is disabled, not starting periodic sync');
      return;
    }

    if (!window.Config?.googleSheets?.enabled) {
      console.log('Google Sheets is disabled, not starting periodic sync');
      return;
    }

    // Clear existing interval
    this.stopPeriodicSync();

    console.log(`Starting periodic sync with ${this.syncInterval}ms interval`);

    // Perform initial sync with proper readiness check
    setTimeout(() => this.performSyncWhenReady(), 1000);

    // Set up periodic sync
    this.periodicSyncTimer = setInterval(() => {
      if (this.isEnabled && !this.isSyncing) {
        this.performSyncWhenReady();
      }
    }, this.syncInterval);

    this.notifyListeners('periodicSyncStarted', { interval: this.syncInterval });
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.periodicSyncTimer = null;
      console.log('Periodic sync stopped');
      this.notifyListeners('periodicSyncStopped');
    }
  }

  /**
   * Set sync interval and restart periodic sync if active
   */
  setSyncInterval(intervalMs) {
    this.syncInterval = Math.max(intervalMs, 120000); // Minimum 2 minutes

    if (this.isEnabled && this.periodicSyncTimer) {
      this.startPeriodicSync();
    }

    console.log(`Sync interval updated to ${this.syncInterval}ms`);
  }
  /**
   * Perform sync when Google Sheets is ready
   */
  async performSyncWhenReady() {
    // Check if Google Sheets is ready
    if (!Config.googleSheets.enabled) {
      console.log('Google Sheets sync is disabled');
      return;
    }

    // Wait for SheetsManager to be initialized
    if (!window.SheetsManager?.isInitialized) {
      console.log('SheetsManager not ready yet, waiting...');
      // Try again in 2 seconds
      setTimeout(() => this.performSyncWhenReady(), 2000);
      return;
    }

    // Check if user is authenticated
    if (!window.AuthManager?.isAuthenticatedUser()) {
      console.log('User not authenticated, skipping sync');
      return;
    }

    // Check if this is the first sync (no previous sync timestamps)
    const hasLastSync = await this.hasLastSyncTimestamps();
    if (!hasLastSync) {
      console.log('No previous sync found, performing initial full sync...');
      await this.performSync({ fullSync: true });
    } else {
      console.log('Google Sheets is ready, starting sync...');
      await this.performSync();
    }
  }

  /**
   * Check if we have last sync timestamps
   */
  async hasLastSyncTimestamps() {
    try {
      const lastSyncVolunteers = await Storage.getItem('last_sync_volunteers');
      const lastSyncEvents = await Storage.getItem('last_sync_events');
      const lastSyncAttendance = await Storage.getItem('last_sync_attendance');

      return !!(lastSyncVolunteers || lastSyncEvents || lastSyncAttendance);
    } catch (error) {
      console.error('Error checking last sync timestamps:', error);
      return false;
    }
  }

  /**
   * Reset sync timestamps to force full sync on next run
   */
  async resetSyncTimestamps() {
    try {
      await Storage.removeItem('last_sync_volunteers');
      await Storage.removeItem('last_sync_events');
      await Storage.removeItem('last_sync_attendance');
      await Storage.removeItem('sync_stats');

      console.log('Sync timestamps reset - next sync will be full sync');
      return true;
    } catch (error) {
      console.error('Error resetting sync timestamps:', error);
      return false;
    }
  }

  /**
   * Main sync orchestration method with timeout protection
   */
  async performSync(options = {}) {
    if (!this.isEnabled) {
      console.log('Sync is disabled');
      return { success: false, reason: 'disabled' };
    }

    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, reason: 'already_syncing' };
    }

    // Set up timeout protection to prevent stuck loading states
    const syncTimeout = options.timeout || window.Config?.sync?.timeout || 120000; // 2 minutes default
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sync operation timed out'));
      }, syncTimeout);
    });

    this.isSyncing = true;
    this.retryAttempts = 0;

    try {
      // Wrap sync logic with timeout protection
      const syncPromise = this.performSyncInternal(options);
      const result = await Promise.race([syncPromise, timeoutPromise]);
      
      this.isSyncing = false;
      return result;

    } catch (error) {
      this.isSyncing = false;
      this.isOnline = false;

      // Force hide any loading states on error/timeout
      if (window.Utils && window.Utils.Loading) {
        window.Utils.Loading.forceHide();
      }

      console.error('Sync failed:', error);

      // Handle timeout specifically
      if (error.message === 'Sync operation timed out') {
        this.syncStats.failedSyncs++;
        this.syncStats.lastError = 'Sync timeout';
        await this.saveSyncStats();
        
        this.notifyListeners('syncFailed', { error: 'Sync timeout', timestamp: new Date().toISOString() });
        await this.updateSyncStatus();
        
        return { success: false, error: 'Sync operation timed out' };
      }

      // Handle retries
      if (this.shouldRetry(error) && this.retryAttempts < this.maxRetries) {
        return await this.retrySync(error, options);
      }

      // Update error statistics
      this.syncStats.failedSyncs++;
      this.syncStats.lastError = error.message;
      await this.saveSyncStats();

      this.handleSyncError(error);
      this.notifyListeners('syncFailed', { error: error.message, timestamp: new Date().toISOString() });
      await this.updateSyncStatus();

      return { success: false, error: error.message };
    }
  }

  /**
   * Internal sync logic (separated for timeout handling)
   */
  async performSyncInternal(options = {}) {
    console.log('Starting bidirectional sync...');
    this.notifyListeners('syncStarted', { timestamp: new Date().toISOString() });
    await this.updateSyncStatus();

    // Step 1: Check prerequisites
    await this.checkSyncPrerequisites();

    // Step 2: Determine what needs to be synced
    const syncPlan = await this.createSyncPlan(options);

    // Step 3: Execute sync plan
    const syncResult = await this.executeSyncPlan(syncPlan);

    // Step 4: Update statistics and timestamps
    await this.updateSyncResults(syncResult);

    // Step 5: Process offline queue if any
    await this.processOfflineQueue();

    this.isOnline = true; // Successful sync proves we're online
    this.retryAttempts = 0;

    console.log('Sync completed successfully:', syncResult);
    this.notifyListeners('syncCompleted', syncResult);

    // Directly notify StatusManager with correct online status
    if (window.StatusManager) {
      window.StatusManager.updateSyncStatus({
        enabled: this.isEnabled,
        online: true, // We just successfully synced, so we're definitely online
        authenticated: window.AuthManager?.isAuthenticatedUser() || false,
        syncing: false,
        lastSync: this.lastSync.timestamp
      });
    }

    return { success: true, result: syncResult };
  }

  /**
   * Check sync prerequisites
   */
  async checkSyncPrerequisites() {
    // Check authentication - try to restore from storage first
    if (!window.AuthManager?.isAuthenticatedUser()) {
      // Try to restore authentication from stored token
      const restored = await window.AuthManager?.restoreAuthenticationFromStorage();
      if (!restored) {
        throw new Error('User not authenticated with Google');
      }
    }

    // Check if services are initialized
    if (!window.SheetsManager?.isInitialized) {
      throw new Error('Google Sheets service not initialized');
    }

    // Check if spreadsheet is configured
    if (!window.SheetsManager.isSpreadsheetConfigured()) {
      throw new Error('No Google Spreadsheet configured. Please set up a spreadsheet in Settings.');
    }

    // The real connectivity test: can we access the spreadsheet?
    if (!await window.SheetsManager.validateSpreadsheet(window.SheetsManager.spreadsheetId)) {
      throw new Error('Cannot access Google Spreadsheet - check permissions or spreadsheet ID');
    }
  }

  /**
   * Create sync plan based on timestamps and changes
   */
  async createSyncPlan(options = {}) {
    const plan = {
      upload: {
        volunteers: [],
        events: [],
        attendance: []
      },
      download: {
        volunteers: false,
        events: false,
        attendance: false
      },
      forceSync: options.force || false,
      fullSync: options.fullSync || false,
      syncTypes: options.types || ['volunteers', 'events', 'attendance']
    };

    try {
      // Determine what needs to be uploaded (local changes)
      for (const dataType of plan.syncTypes) {
        let localChanges;
        
        if (plan.fullSync) {
          // For full sync, get ALL local data, not just changes since last sync
          console.log(`Full sync requested - getting all local ${dataType} data`);
          localChanges = await this.getAllLocalData(dataType);
        } else {
          // For incremental sync, get only changes since last sync
          localChanges = await this.getLocalChangesSince(dataType, this.lastSync[dataType]);
        }
        
        if (localChanges.length > 0) {
          plan.upload[dataType] = localChanges;
          console.log(`Found ${localChanges.length} local ${dataType} ${plan.fullSync ? 'records' : 'changes'} to upload`);
        }
      }

      // Determine what needs to be downloaded (remote changes)
      for (const dataType of plan.syncTypes) {
        const hasRemoteChanges = await this.checkRemoteChanges(dataType, this.lastSync[dataType]);
        if (hasRemoteChanges || plan.forceSync || plan.fullSync) {
          plan.download[dataType] = true;
          console.log(`Remote ${dataType} changes detected, will download`);
        }
      }

      return plan;

    } catch (error) {
      console.error('Error creating sync plan:', error);
      throw new Error(`Failed to create sync plan: ${error.message}`);
    }
  }

  /**
   * Execute the sync plan
   */
  async executeSyncPlan(plan) {
    const result = {
      uploaded: { volunteers: 0, events: 0, attendance: 0 },
      downloaded: { volunteers: 0, events: 0, attendance: 0 },
      conflicts: [],
      errors: []
    };

    try {
      // Phase 1: Upload local changes
      for (const [dataType, changes] of Object.entries(plan.upload)) {
        if (changes.length > 0) {
          try {
            const uploadResult = await this.uploadChanges(dataType, changes);
            result.uploaded[dataType] = uploadResult.count;
            console.log(`Uploaded ${uploadResult.count} ${dataType} records`);
          } catch (error) {
            console.error(`Error uploading ${dataType}:`, error);
            result.errors.push({ type: 'upload', dataType, error: error.message });
          }
        }
      }

      // Phase 2: Download remote changes (PARALLEL OPTIMIZATION)
      const downloadPromises = Object.entries(plan.download)
        .filter(([dataType, shouldDownload]) => shouldDownload)
        .map(async ([dataType]) => {
          try {
            const downloadResult = await this.downloadChanges(dataType);
            result.downloaded[dataType] = downloadResult.count;
            result.conflicts.push(...downloadResult.conflicts);
            console.log(`Downloaded ${downloadResult.count} ${dataType} records`);
            return { dataType, success: true, result: downloadResult };
          } catch (error) {
            console.error(`Error downloading ${dataType}:`, error);
            result.errors.push({ type: 'download', dataType, error: error.message });
            return { dataType, success: false, error: error.message };
          }
        });

      // Execute all downloads in parallel
      if (downloadPromises.length > 0) {
        await Promise.all(downloadPromises);
      }

      return result;

    } catch (error) {
      console.error('Error executing sync plan:', error);
      throw new Error(`Sync execution failed: ${error.message}`);
    }
  }
  /**
   * Get local changes since last sync with delta sync optimization
   */
  async getLocalChangesSince(dataType, lastSyncTime) {
    try {
      // Use delta sync manager if available for optimized change detection (Requirement 9.2)
      if (window.DeltaSyncManager && window.syncPerformanceIntegration?.deltaSyncManager) {
        const deltaManager = window.syncPerformanceIntegration.deltaSyncManager;
        const modifiedData = await deltaManager.getModifiedRecordsSince(dataType, lastSyncTime);

        console.log(
          `Delta sync optimization: Found ${modifiedData.changeCount} modified ${dataType} records ` +
          `(${modifiedData.isFullSync ? 'full' : 'delta'} sync)`
        );

        return modifiedData.records;
      }

      // Fallback to traditional timestamp-based filtering
      let allRecords = [];

      switch (dataType) {
        case 'volunteers':
          allRecords = await Storage.getAllVolunteers();
          break;
        case 'events':
          allRecords = await Storage.getAllEvents();
          break;
        case 'attendance':
          allRecords = await Storage.getAllAttendance();
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      if (!lastSyncTime) {
        // First sync - return all records
        return allRecords;
      }

      // Filter records modified since last sync
      const lastSyncDate = new Date(lastSyncTime);
      return allRecords.filter(record => {
        const updatedAt = new Date(record.updatedAt || record.createdAt);
        return updatedAt > lastSyncDate;
      });

    } catch (error) {
      console.error(`Error getting local changes for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Get all local data for full sync (ignores timestamps)
   */
  async getAllLocalData(dataType) {
    try {
      let allRecords = [];

      switch (dataType) {
        case 'volunteers':
          allRecords = await Storage.getAllVolunteers();
          break;
        case 'events':
          allRecords = await Storage.getAllEvents();
          break;
        case 'attendance':
          allRecords = await Storage.getAllAttendance();
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      console.log(`Retrieved ${allRecords.length} total ${dataType} records for full sync`);
      return allRecords;

    } catch (error) {
      console.error(`Error getting all local data for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Check if there are remote changes since last sync
   */
  async checkRemoteChanges(dataType, lastSyncTime) {
    try {
      if (!lastSyncTime) {
        return true; // First sync
      }

      // Get sheet configuration
      const sheetConfig = window.SheetsManager.sheetsConfig[dataType];
      if (!sheetConfig) {
        throw new Error(`No sheet configuration for ${dataType}`);
      }

      // Read the 'Updated' column from the sheet to check for changes
      const updatedColumnIndex = sheetConfig.headers.indexOf('Updated');
      const updatedColumn = String.fromCharCode(65 + updatedColumnIndex); // Convert to letter (A=0, B=1, etc.)
      const updatedColumnRange = `${sheetConfig.name}!${updatedColumn}:${updatedColumn}`;
      const updatedValues = await window.SheetsManager.readSheet(sheetConfig.name, updatedColumnRange);

      if (updatedValues.length === 0) {
        return false;
      }

      const lastSyncDate = new Date(lastSyncTime);

      // Check if any record was updated after last sync
      return updatedValues.some(row => {
        if (row[0] && row[0] !== 'Updated') { // Skip header
          const updatedAt = new Date(row[0]);
          return updatedAt > lastSyncDate;
        }
        return false;
      });

    } catch (error) {
      console.error(`Error checking remote changes for ${dataType}:`, error);
      // If we can't check, assume there are changes to be safe
      return true;
    }
  }

  /**
   * Upload local changes to Google Sheets with progress tracking
   */
  async uploadChanges(dataType, changes, options = {}) {
    try {
      if (!changes || changes.length === 0) {
        return { count: 0, conflicts: [], skipped: 0 };
      }

      console.log(`Uploading ${changes.length} ${dataType} changes...`);

      // Notify upload started
      this.notifyListeners('uploadStarted', {
        dataType,
        totalRecords: changes.length
      });

      // Convert plural dataType to singular for transformer
      const singularDataType = dataType.endsWith('s') ? dataType.slice(0, -1) : dataType;

      // Transform data to sheets format with batch processing (PERFORMANCE OPTIMIZATION)
      const transformer = window.DataTransformer;
      let transformedData = [];
      
      try {
        // Use batch transformation for better performance
        const batchResult = transformer.batchTransform(changes, singularDataType, 'toSheets');
        
        // Flatten the result since batchTransform returns nested arrays
        transformedData = batchResult.flat();
        
        this.notifyListeners('uploadProgress', {
          dataType,
          processed: changes.length,
          total: changes.length,
          phase: 'transforming'
        });
        
        console.log(`Batch transformed ${changes.length} ${dataType} records in one operation`);
      } catch (error) {
        console.error(`Error in batch transformation for ${dataType}:`, error);
        
        // Fallback to individual transformation if batch fails
        console.log('Falling back to individual record transformation...');
        transformedData = [];
        for (let i = 0; i < changes.length; i++) {
          try {
            const transformed = transformer.toSheetsFormat(changes[i], singularDataType);
            transformedData.push(...transformed);

            // Report progress every 10 records
            if (i % 10 === 0 || i === changes.length - 1) {
              this.notifyListeners('uploadProgress', {
                dataType,
                processed: i + 1,
                total: changes.length,
                phase: 'transforming'
              });
            }
          } catch (error) {
            console.error(`Error transforming ${dataType} record:`, error);
            // Skip invalid records but continue processing
          }
        }
      }

      if (transformedData.length === 0) {
        console.warn(`No valid ${dataType} records to upload after transformation`);
        return { count: 0, conflicts: [], skipped: changes.length };
      }

      // Get existing data from sheets to check for conflicts
      this.notifyListeners('uploadProgress', {
        dataType,
        phase: 'reading_remote'
      });

      const existingData = await window.SheetsManager.readSheet(
        window.SheetsManager.sheetsConfig[dataType].name
      );

      // Analyze changes and detect conflicts
      const analysisResult = await this.analyzeUploadChanges(
        transformedData,
        changes,
        existingData,
        singularDataType
      );

      // Execute upload operations
      const uploadResult = await this.executeUploadOperations(
        analysisResult,
        dataType
      );

      // Update sync timestamp for this data type
      await this.saveLastSync(dataType);

      // Notify upload completed
      this.notifyListeners('uploadCompleted', {
        dataType,
        ...uploadResult
      });

      return uploadResult;

    } catch (error) {
      console.error(`Error uploading ${dataType} changes:`, error);

      // Notify upload failed
      this.notifyListeners('uploadFailed', {
        dataType,
        error: error.message
      });

      // Queue for retry if network-related error
      if (this.isNetworkError(error)) {
        await this.queueUploadForRetry(dataType, changes);
      }

      throw new Error(`Upload failed for ${dataType}: ${error.message}`);
    }
  }

  /**
   * Analyze upload changes and detect conflicts
   */
  async analyzeUploadChanges(transformedData, originalChanges, existingData, dataType) {
    const newRecords = [];
    const updateRecords = [];
    const conflicts = [];
    const skipped = [];

    for (let i = 0; i < transformedData.length; i++) {
      const record = transformedData[i];
      const originalRecord = originalChanges[i];

      if (!record || !record[0]) {
        skipped.push(originalRecord);
        continue;
      }

      // Find existing record by ID
      const existingIndex = existingData.findIndex(row => row[0] === record[0]);

      if (existingIndex === -1) {
        // New record
        newRecords.push({
          data: record,
          original: originalRecord
        });
      } else {
        // Check for conflicts
        const existingRecord = existingData[existingIndex];
        const conflict = this.detectUploadConflict(originalRecord, existingRecord, dataType);

        if (conflict) {
          conflicts.push(conflict);
        } else {
          updateRecords.push({
            data: record,
            original: originalRecord,
            row: existingIndex + 2, // +2 for header and 0-based index
            existingData: existingRecord
          });
        }
      }
    }

    return {
      newRecords,
      updateRecords,
      conflicts,
      skipped
    };
  }

  /**
   * Execute upload operations with batch processing
   */
  async executeUploadOperations(analysisResult, dataType) {
    const { newRecords, updateRecords, conflicts, skipped } = analysisResult;
    let uploadedCount = 0;

    // Batch size for operations
    const batchSize = 50;

    try {
      // Process new records in batches
      if (newRecords.length > 0) {
        console.log(`Appending ${newRecords.length} new ${dataType} records...`);

        for (let i = 0; i < newRecords.length; i += batchSize) {
          const batch = newRecords.slice(i, i + batchSize);
          const batchData = batch.map(item => item.data);

          await window.SheetsManager.appendToSheet(
            window.SheetsManager.sheetsConfig[dataType].name,
            batchData
          );

          uploadedCount += batch.length;

          // Report progress
          this.notifyListeners('uploadProgress', {
            dataType,
            processed: Math.min(i + batchSize, newRecords.length),
            total: newRecords.length + updateRecords.length,
            phase: 'uploading_new'
          });

          // Small delay between batches to avoid rate limits
          if (i + batchSize < newRecords.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        console.log(`Successfully appended ${newRecords.length} new ${dataType} records`);
      }

      // Process updates in batches
      if (updateRecords.length > 0) {
        console.log(`Updating ${updateRecords.length} existing ${dataType} records...`);

        // Group updates by row ranges for batch operations
        const batchUpdates = this.groupUpdatesByRange(updateRecords, dataType);

        for (let i = 0; i < batchUpdates.length; i++) {
          const batch = batchUpdates[i];

          if (batch.isRange) {
            // Batch update for consecutive rows (OPTIMIZED)
            await window.SheetsManager.writeSheet(
              window.SheetsManager.sheetsConfig[dataType].name,
              batch.data,
              batch.range
            );
          } else {
            // Use parallel individual updates for better reliability (PERFORMANCE FIX)
            const updatePromises = batch.updates.map(update => {
              const range = `${window.SheetsManager.sheetsConfig[dataType].name}!A${update.row}:J${update.row}`;
              return window.SheetsManager.writeSheet(
                window.SheetsManager.sheetsConfig[dataType].name,
                [update.data],
                range
              );
            });
            
            // Execute all updates in parallel instead of sequentially
            await Promise.all(updatePromises);
          }

          uploadedCount += batch.count;

          // Report progress
          this.notifyListeners('uploadProgress', {
            dataType,
            processed: newRecords.length + Math.min((i + 1) * batchSize, updateRecords.length),
            total: newRecords.length + updateRecords.length,
            phase: 'uploading_updates'
          });

          // Small delay between batches
          if (i + 1 < batchUpdates.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        console.log(`Successfully updated ${updateRecords.length} existing ${dataType} records`);
      }

      return {
        count: uploadedCount,
        conflicts,
        skipped: skipped.length,
        newRecords: newRecords.length,
        updatedRecords: updateRecords.length
      };

    } catch (error) {
      console.error(`Error executing upload operations for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Group update operations by row ranges for batch processing
   */
  groupUpdatesByRange(updateRecords, dataType) {
    if (updateRecords.length === 0) return [];

    // Sort by row number
    const sorted = updateRecords.sort((a, b) => a.row - b.row);
    const batches = [];
    let currentBatch = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = sorted[i - 1];

      // If rows are consecutive, add to current batch
      if (current.row === previous.row + 1 && currentBatch.length < 50) {
        currentBatch.push(current);
      } else {
        // Process current batch and start new one
        batches.push(this.createBatchUpdate(currentBatch, dataType));
        currentBatch = [current];
      }
    }

    // Process final batch
    if (currentBatch.length > 0) {
      batches.push(this.createBatchUpdate(currentBatch, dataType));
    }

    return batches;
  }

  /**
   * Create batch update object
   */
  createBatchUpdate(updates, dataType) {
    if (updates.length === 1) {
      return {
        isRange: false,
        updates: updates,
        count: 1
      };
    }

    // Create range update for consecutive rows
    const startRow = updates[0].row;
    const endRow = updates[updates.length - 1].row;
    const sheetName = window.SheetsManager.sheetsConfig[dataType].name;

    return {
      isRange: true,
      range: `${sheetName}!A${startRow}:J${endRow}`,
      data: updates.map(update => update.data),
      count: updates.length
    };
  }

  /**
   * Queue upload for retry when network fails
   */
  async queueUploadForRetry(dataType, changes) {
    try {
      if (window.SyncQueue) {
        await window.SyncQueue.enqueue({
          type: 'upload',
          dataType,
          data: changes,
          reason: 'network_error'
        });

        console.log(`Queued ${changes.length} ${dataType} records for retry`);
      }
    } catch (error) {
      console.error('Error queuing upload for retry:', error);
    }
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error) {
    if (!error) {
      return false;
    }

    // Handle different error object structures
    let message = '';
    if (error.message) {
      message = error.message.toLowerCase();
    } else if (error.body && typeof error.body === 'string') {
      message = error.body.toLowerCase();
    } else if (error.result && error.result.error && error.result.error.message) {
      message = error.result.error.message.toLowerCase();
    } else {
      return false;
    }

    const networkErrorPatterns = [
      'network',
      'timeout',
      'connection',
      'offline',
      'unreachable',
      'dns',
      'fetch'
    ];

    return networkErrorPatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Download remote changes from Google Sheets with progress tracking
   */
  async downloadChanges(dataType, options = {}) {
    try {
      console.log(`Downloading ${dataType} changes...`);

      // Notify download started
      this.notifyListeners('downloadStarted', { dataType });

      // Read all data from the sheet with progress tracking
      this.notifyListeners('downloadProgress', {
        dataType,
        phase: 'reading_remote'
      });

      const sheetData = await window.SheetsManager.readSheet(
        window.SheetsManager.sheetsConfig[dataType].name
      );

      if (sheetData.length === 0) {
        console.log(`No ${dataType} data found in remote sheet`);
        this.notifyListeners('downloadCompleted', {
          dataType,
          count: 0,
          conflicts: [],
          skipped: 0
        });
        return { count: 0, conflicts: [], skipped: 0 };
      }

      console.log(`Found ${sheetData.length} ${dataType} records in remote sheet`);

      // Transform and validate data from sheets format
      this.notifyListeners('downloadProgress', {
        dataType,
        phase: 'transforming',
        total: sheetData.length
      });

      const transformationResult = await this.transformRemoteData(sheetData, dataType);

      if (transformationResult.validRecords.length === 0) {
        console.warn(`No valid ${dataType} records after transformation`);
        return {
          count: 0,
          conflicts: [],
          skipped: transformationResult.invalidRecords.length
        };
      }

      // Get existing local data
      this.notifyListeners('downloadProgress', {
        dataType,
        phase: 'reading_local'
      });

      const existingLocalData = await this.getLocalData(dataType);

      // Analyze changes and detect conflicts
      const analysisResult = await this.analyzeDownloadChanges(
        transformationResult.validRecords,
        existingLocalData,
        dataType
      );

      // Execute download operations
      const downloadResult = await this.executeDownloadOperations(
        analysisResult,
        dataType
      );

      // Update sync timestamp for this data type
      await this.saveLastSync(dataType);

      // Notify download completed
      this.notifyListeners('downloadCompleted', {
        dataType,
        ...downloadResult,
        skipped: transformationResult.invalidRecords.length
      });

      return {
        ...downloadResult,
        skipped: transformationResult.invalidRecords.length
      };

    } catch (error) {
      console.error(`Error downloading ${dataType} changes:`, error);

      // Notify download failed
      this.notifyListeners('downloadFailed', {
        dataType,
        error: error.message
      });

      throw new Error(`Download failed for ${dataType}: ${error.message}`);
    }
  }

  /**
   * Transform remote data with validation and error handling (PERFORMANCE OPTIMIZED)
   */
  async transformRemoteData(sheetData, dataType) {
    const validRecords = [];
    const invalidRecords = [];

    // Convert plural dataType to singular for transformer
    const singularDataType = dataType.endsWith('s') ? dataType.slice(0, -1) : dataType;

    try {
      // Try batch transformation first for better performance
      const batchTransformed = window.DataTransformer.batchTransform(sheetData, singularDataType, 'fromSheets');
      
      // Validate batch results
      for (let i = 0; i < batchTransformed.length; i++) {
        if (this.validateRemoteRecord(batchTransformed[i], singularDataType)) {
          validRecords.push(batchTransformed[i]);
        } else {
          invalidRecords.push({
            row: i + 2, // +2 for header and 0-based index
            data: sheetData[i],
            reason: 'validation_failed'
          });
        }
      }
      
      this.notifyListeners('downloadProgress', {
        dataType,
        processed: sheetData.length,
        total: sheetData.length,
        phase: 'transforming'
      });
      
      console.log(`Batch transformed ${sheetData.length} remote ${dataType} records in one operation`);
      
    } catch (batchError) {
      console.warn(`Batch transformation failed for ${dataType}, falling back to individual processing:`, batchError);
      
      // Fallback to individual transformation
      for (let i = 0; i < sheetData.length; i++) {
        try {
          const transformed = window.DataTransformer.fromSheetsFormat([sheetData[i]], singularDataType);
          const record = transformed && transformed.length > 0 ? transformed[0] : null;

          if (record && this.validateRemoteRecord(record, singularDataType)) {
            validRecords.push(record);
          } else {
            invalidRecords.push({
              row: i + 2, // +2 for header and 0-based index
              data: sheetData[i],
              reason: 'validation_failed'
            });
          }

          // Report progress every 50 records
          if (i % 50 === 0 || i === sheetData.length - 1) {
            this.notifyListeners('downloadProgress', {
              dataType,
              processed: i + 1,
              total: sheetData.length,
              phase: 'transforming'
            });
          }

        } catch (error) {
          console.error(`Error transforming remote ${dataType} record at row ${i + 2}:`, error);
          invalidRecords.push({
            row: i + 2,
            data: sheetData[i],
            reason: 'transformation_error',
            error: error.message
          });
        }
      }
    }

    console.log(`Transformed ${validRecords.length} valid and ${invalidRecords.length} invalid ${dataType} records`);

    return { validRecords, invalidRecords };
  }

  /**
   * Validate remote record
   */
  validateRemoteRecord(record, dataType) {
    if (!record || !record.id) {
      return false;
    }

    switch (dataType) {
      case 'volunteers':
        return record.name && record.name.trim().length > 0;
      case 'events':
        return record.name && record.date && record.name.trim().length > 0;
      case 'attendance':
        return record.volunteerId && record.eventId && record.date;
      default:
        return true;
    }
  }

  /**
   * Get local data for comparison
   */
  async getLocalData(dataType) {
    switch (dataType) {
      case 'volunteers':
        return await Storage.getAllVolunteers();
      case 'events':
        return await Storage.getAllEvents();
      case 'attendance':
        return await Storage.getAllAttendance();
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  /**
   * Analyze download changes and detect conflicts
   */
  async analyzeDownloadChanges(remoteRecords, localRecords, dataType) {
    const newRecords = [];
    const updateRecords = [];
    const conflicts = [];
    const unchanged = [];

    // Create lookup map for local records
    const localMap = new Map(localRecords.map(record => [record.id, record]));

    for (const remoteRecord of remoteRecords) {
      const localRecord = localMap.get(remoteRecord.id);

      if (!localRecord) {
        // New record from remote
        newRecords.push(remoteRecord);
      } else {
        // Check for conflicts
        const conflict = this.detectDownloadConflict(localRecord, remoteRecord, dataType);

        if (conflict) {
          conflicts.push(conflict);
        } else if (this.shouldUpdateLocal(localRecord, remoteRecord)) {
          // Update needed
          updateRecords.push({
            remote: remoteRecord,
            local: localRecord
          });
        } else {
          // No changes needed
          unchanged.push(remoteRecord);
        }
      }
    }

    // Check for deleted records (exist locally but not remotely)
    const remoteIds = new Set(remoteRecords.map(record => record.id));
    const deletedRecords = localRecords.filter(local => !remoteIds.has(local.id));

    return {
      newRecords,
      updateRecords,
      conflicts,
      unchanged,
      deletedRecords
    };
  }

  /**
   * Execute download operations with progress tracking
   */
  async executeDownloadOperations(analysisResult, dataType) {
    const { newRecords, updateRecords, conflicts, deletedRecords } = analysisResult;
    let downloadedCount = 0;
    const errors = [];

    try {
      // Process new records
      if (newRecords.length > 0) {
        console.log(`Adding ${newRecords.length} new ${dataType} records...`);

        for (let i = 0; i < newRecords.length; i++) {
          try {
            await this.addLocalRecord(dataType, newRecords[i]);
            downloadedCount++;

            // Report progress every 10 records
            if (i % 10 === 0 || i === newRecords.length - 1) {
              this.notifyListeners('downloadProgress', {
                dataType,
                processed: i + 1,
                total: newRecords.length + updateRecords.length,
                phase: 'adding_new'
              });
            }
          } catch (error) {
            console.error(`Error adding new ${dataType} record:`, error);
            errors.push({
              type: 'add',
              record: newRecords[i],
              error: error.message
            });
          }
        }

        console.log(`Successfully added ${downloadedCount} new ${dataType} records`);
      }

      // Process updates
      if (updateRecords.length > 0) {
        console.log(`Updating ${updateRecords.length} existing ${dataType} records...`);

        let updatedCount = 0;
        for (let i = 0; i < updateRecords.length; i++) {
          try {
            await this.updateLocalRecord(dataType, updateRecords[i].remote);
            updatedCount++;
            downloadedCount++;

            // Report progress every 10 records
            if (i % 10 === 0 || i === updateRecords.length - 1) {
              this.notifyListeners('downloadProgress', {
                dataType,
                processed: newRecords.length + i + 1,
                total: newRecords.length + updateRecords.length,
                phase: 'updating_existing'
              });
            }
          } catch (error) {
            console.error(`Error updating ${dataType} record:`, error);
            errors.push({
              type: 'update',
              record: updateRecords[i].remote,
              error: error.message
            });
          }
        }

        console.log(`Successfully updated ${updatedCount} existing ${dataType} records`);
      }

      // Handle deleted records (optional - based on sync strategy)
      if (deletedRecords.length > 0) {
        console.log(`Found ${deletedRecords.length} ${dataType} records that exist locally but not remotely`);
        // For now, we don't automatically delete local records
        // This could be configurable in the future
      }

      return {
        count: downloadedCount,
        conflicts,
        errors,
        newRecords: newRecords.length,
        updatedRecords: updateRecords.length,
        deletedRecords: deletedRecords.length
      };

    } catch (error) {
      console.error(`Error executing download operations for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Check for remote changes since last sync (optimized)
   */
  async hasRemoteChanges(dataType, lastSyncTime) {
    try {
      if (!lastSyncTime) {
        return true; // First sync
      }

      // Get sheet configuration
      const sheetConfig = window.SheetsManager.sheetsConfig[dataType];
      if (!sheetConfig) {
        throw new Error(`No sheet configuration for ${dataType}`);
      }

      // Read only the 'Updated' column to check for changes efficiently
      const updatedColumnIndex = sheetConfig.headers.indexOf('Updated');
      const updatedColumn = String.fromCharCode(65 + updatedColumnIndex); // Convert to letter (A=0, B=1, etc.)
      const updatedColumnRange = `${sheetConfig.name}!${updatedColumn}:${updatedColumn}`;
      const updatedValues = await window.SheetsManager.readSheet(sheetConfig.name, updatedColumnRange);

      if (updatedValues.length === 0) {
        return false;
      }

      const lastSyncDate = new Date(lastSyncTime);

      // Check if any record was updated after last sync
      return updatedValues.some(row => {
        if (row[0] && row[0] !== 'Updated') { // Skip header
          try {
            const updatedAt = new Date(row[0]);
            return updatedAt > lastSyncDate;
          } catch (error) {
            // Invalid date format, assume changed
            return true;
          }
        }
        return false;
      });

    } catch (error) {
      console.error(`Error checking remote changes for ${dataType}:`, error);
      // If we can't check, assume there are changes to be safe
      return true;
    }
  }

  /**
   * Get remote change summary without downloading all data
   */
  async getRemoteChangeSummary(dataType, lastSyncTime) {
    try {
      if (!lastSyncTime) {
        // First sync - get total count
        const sheetData = await window.SheetsManager.readSheet(
          window.SheetsManager.sheetsConfig[dataType].name,
          `${window.SheetsManager.sheetsConfig[dataType].name}!A:A`
        );
        return {
          totalRecords: sheetData.length,
          hasChanges: true,
          isFirstSync: true
        };
      }

      // Get update timestamps
      const sheetConfig = window.SheetsManager.sheetsConfig[dataType];
      const updatedColumnIndex = sheetConfig.headers.indexOf('Updated');
      const updatedColumn = String.fromCharCode(65 + updatedColumnIndex); // Convert to letter (A=0, B=1, etc.)
      const updatedValues = await window.SheetsManager.readSheet(
        sheetConfig.name,
        `${sheetConfig.name}!${updatedColumn}:${updatedColumn}`
      );

      const lastSyncDate = new Date(lastSyncTime);
      let changedRecords = 0;

      updatedValues.forEach(row => {
        if (row[0] && row[0] !== 'Updated') {
          try {
            const updatedAt = new Date(row[0]);
            if (updatedAt > lastSyncDate) {
              changedRecords++;
            }
          } catch (error) {
            // Invalid date, count as changed
            changedRecords++;
          }
        }
      });

      return {
        totalRecords: updatedValues.length,
        changedRecords,
        hasChanges: changedRecords > 0,
        isFirstSync: false
      };

    } catch (error) {
      console.error(`Error getting remote change summary for ${dataType}:`, error);
      return {
        totalRecords: 0,
        changedRecords: 0,
        hasChanges: true, // Assume changes on error
        isFirstSync: false,
        error: error.message
      };
    }
  }
  /**
   * Detect upload conflicts (local vs remote)
   */
  detectUploadConflict(localRecord, remoteRecord, dataType) {
    try {
      // Convert plural dataType to singular for transformer
      const singularDataType = dataType.endsWith('s') ? dataType.slice(0, -1) : dataType;

      // Convert remote record from sheets format for comparison
      const transformer = window.DataTransformer;
      const remoteConvertedArray = transformer.fromSheetsFormat([remoteRecord], singularDataType);
      const remoteConverted = remoteConvertedArray && remoteConvertedArray.length > 0 ? remoteConvertedArray[0] : null;

      if (!remoteConverted) {
        return null; // Can't compare, proceed with upload
      }

      // Compare update timestamps
      const localUpdated = new Date(localRecord.updatedAt || localRecord.createdAt);
      const remoteUpdated = new Date(remoteConverted.updatedAt || remoteConverted.createdAt);
      const lastSyncTime = this.lastSync[dataType] ? new Date(this.lastSync[dataType]) : new Date(0);

      // Check if local record was modified in current session
      const isCurrentSessionChange = this.isModifiedInCurrentSession(localRecord);

      // Enhanced conflict detection with session-based precedence
      if (remoteUpdated > lastSyncTime && remoteUpdated > localUpdated) {
        // Potential conflict detected
        
        if (isCurrentSessionChange) {
          // Local wins - user made changes in this session
          console.log(`Session-based resolution: Local wins for ${localRecord.id} (modified in current session)`);
          return null; // No conflict, proceed with local upload
        }
        
        // Remote is newer and no current session changes - this is a conflict
        return {
          type: 'upload_conflict',
          dataType,
          recordId: localRecord.id,
          localRecord,
          remoteRecord: remoteConverted,
          localUpdated,
          remoteUpdated,
          sessionBased: false,
          resolution: 'remote_wins' // Default to remote unless user intervenes
        };
      }

      return null;

    } catch (error) {
      console.error('Error detecting upload conflict:', error);
      return null;
    }
  }

  /**
   * Detect download conflicts (remote vs local)
   */
  detectDownloadConflict(localRecord, remoteRecord, dataType) {
    try {
      // Compare update timestamps
      const localUpdated = new Date(localRecord.updatedAt || localRecord.createdAt);
      const remoteUpdated = new Date(remoteRecord.updatedAt || remoteRecord.createdAt);
      const lastSyncTime = this.lastSync[dataType] ? new Date(this.lastSync[dataType]) : new Date(0);

      // Check if local record was modified in current session
      const isCurrentSessionChange = this.isModifiedInCurrentSession(localRecord);

      // If both were updated after our last sync, there's a potential conflict
      if (localUpdated > lastSyncTime && remoteUpdated > lastSyncTime) {
        // Check if the records are actually different
        if (this.recordsAreDifferent(localRecord, remoteRecord, dataType)) {
          
          if (isCurrentSessionChange) {
            // Local wins - user made changes in this session
            console.log(`Session-based resolution: Local wins for ${localRecord.id} (modified in current session)`);
            return null; // No conflict, keep local version
          }
          
          // Both changed but no current session changes - this is a conflict
          return {
            type: 'download_conflict',
            dataType,
            recordId: localRecord.id,
            localRecord,
            remoteRecord,
            localUpdated,
            remoteUpdated
          };
        }
      }

      return null;

    } catch (error) {
      console.error('Error detecting download conflict:', error);
      return null;
    }
  }

  /**
   * Check if two records are different (excluding timestamps)
   */
  recordsAreDifferent(record1, record2, dataType) {
    const fieldsToCompare = this.getComparableFields(dataType);

    return fieldsToCompare.some(field => {
      const val1 = record1[field];
      const val2 = record2[field];

      // Handle null/undefined values
      if (val1 == null && val2 == null) return false;
      if (val1 == null || val2 == null) return true;

      // Compare values
      return val1.toString() !== val2.toString();
    });
  }

  /**
   * Check if a record was modified in the current session
   */
  isModifiedInCurrentSession(record) {
    try {
      // Get current session start time
      const sessionStartTime = this.getSessionStartTime();
      if (!sessionStartTime) {
        return false; // Can't determine session, assume not current session
      }

      // Check if record was updated after session started
      const recordUpdated = new Date(record.updatedAt || record.createdAt);
      return recordUpdated >= sessionStartTime;

    } catch (error) {
      console.error('Error checking session modification:', error);
      return false;
    }
  }

  /**
   * Get current session start time
   */
  getSessionStartTime() {
    try {
      // Try to get from sync logger
      if (window.SyncLogger && window.SyncLogger.sessionInfo && window.SyncLogger.sessionInfo.startTime) {
        return new Date(window.SyncLogger.sessionInfo.startTime);
      }

      // Fallback: use app initialization time (stored in localStorage)
      const appStartTime = localStorage.getItem('app_session_start');
      if (appStartTime) {
        return new Date(appStartTime);
      }

      // Last fallback: assume session started when page loaded
      const pageLoadTime = localStorage.getItem('page_load_time');
      if (pageLoadTime) {
        return new Date(pageLoadTime);
      }

      return null;

    } catch (error) {
      console.error('Error getting session start time:', error);
      return null;
    }
  }

  /**
   * Get fields to compare for conflict detection
   */
  getComparableFields(dataType) {
    switch (dataType) {
      case 'volunteers':
        return ['name', 'email', 'committee'];
      case 'events':
        return ['name', 'date', 'startTime', 'endTime', 'status', 'description'];
      case 'attendance':
        return ['volunteerId', 'eventId', 'volunteerName', 'committee', 'date'];
      default:
        return [];
    }
  }

  /**
   * Check if local record should be updated with remote data
   */
  shouldUpdateLocal(localRecord, remoteRecord) {
    const localUpdated = new Date(localRecord.updatedAt || localRecord.createdAt);
    const remoteUpdated = new Date(remoteRecord.updatedAt || remoteRecord.createdAt);

    // Update if remote is newer
    return remoteUpdated > localUpdated;
  }

  /**
   * Add a new local record
   */
  async addLocalRecord(dataType, record) {
    switch (dataType) {
      case 'volunteers':
        return await Storage.addVolunteer(record);
      case 'events':
        return await Storage.addEvent(record);
      case 'attendance':
        return await Storage.addAttendance(record);
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  /**
   * Update an existing local record
   */
  async updateLocalRecord(dataType, record) {
    switch (dataType) {
      case 'volunteers':
        return await Storage.updateVolunteer(record);
      case 'events':
        return await Storage.updateEvent(record);
      case 'attendance':
        return await Storage.updateAttendance(record);
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  /**
   * Force sync (ignore timestamps)
   */
  async forceSync(types = null) {
    console.log('Starting forced sync...');
    this.notifyListeners('forceSyncStarted');

    const options = {
      force: true,
      types: types || ['volunteers', 'events', 'attendance']
    };

    return await this.performSync(options);
  }
  /**
   * Process offline queue when network is restored
   */
  async processOfflineQueue() {
    try {
      if (!window.SyncQueue) {
        console.warn('SyncQueue not available');
        return { processed: 0, failed: 0 };
      }

      const queueStatus = window.SyncQueue.getQueueStatus();
      if (queueStatus.totalOperations === 0) {
        console.log('No operations in queue to process');
        return { processed: 0, failed: 0 };
      }

      console.log(`Processing ${queueStatus.totalOperations} queued operations...`);
      this.notifyListeners('queueProcessingStarted', queueStatus);

      // Process the queue
      const result = await window.SyncQueue.processQueue();

      console.log(`Queue processing completed: ${result.processed} processed, ${result.failed} failed`);
      this.notifyListeners('queueProcessingCompleted', result);

      return result;

    } catch (error) {
      console.error('Error processing offline queue:', error);
      this.notifyListeners('queueProcessingFailed', { error: error.message });
      throw error;
    }
  }

  /**
   * Add operation to offline queue
   */
  async queueOperation(operation) {
    try {
      if (!window.SyncQueue) {
        console.warn('SyncQueue not available, cannot queue operation');
        return null;
      }

      const operationId = await window.SyncQueue.enqueue(operation);
      console.log(`Queued operation: ${operation.type} for ${operation.dataType} (ID: ${operationId})`);

      // Update queue length for status
      const queueStatus = window.SyncQueue.getQueueStatus();
      this.notifyListeners('operationQueued', {
        operationId,
        operation,
        queueLength: queueStatus.totalOperations
      });

      return operationId;

    } catch (error) {
      console.error('Error queuing operation:', error);
      throw error;
    }
  }

  /**
   * Get queue status and statistics
   */
  getQueueStatus() {
    if (!window.SyncQueue) {
      return {
        available: false,
        totalOperations: 0,
        isProcessing: false
      };
    }

    return {
      available: true,
      ...window.SyncQueue.getQueueStatus(),
      statistics: window.SyncQueue.getStatistics()
    };
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    try {
      if (!window.SyncQueue) {
        console.warn('SyncQueue not available');
        return;
      }

      await window.SyncQueue.clearQueue();
      console.log('Sync queue cleared');
      this.notifyListeners('queueCleared');

    } catch (error) {
      console.error('Error clearing sync queue:', error);
      throw error;
    }
  }

  /**
   * Retry failed operations in queue
   */
  async retryFailedOperations() {
    try {
      if (!window.SyncQueue) {
        console.warn('SyncQueue not available');
        return { processed: 0, failed: 0 };
      }

      console.log('Retrying failed operations...');
      this.notifyListeners('retryStarted');

      const result = await window.SyncQueue.retryFailedOperations();

      console.log(`Retry completed: ${result.processed} processed, ${result.failed} failed`);
      this.notifyListeners('retryCompleted', result);

      return result;

    } catch (error) {
      console.error('Error retrying failed operations:', error);
      this.notifyListeners('retryFailed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize queue management
   */
  async initializeQueue() {
    try {
      if (window.SyncQueue) {
        await window.SyncQueue.init();
        console.log('Sync queue initialized');

        // Set up queue event listeners
        this.setupQueueEventListeners();

        return true;
      } else {
        console.warn('SyncQueue class not available');
        return false;
      }
    } catch (error) {
      console.error('Error initializing sync queue:', error);
      return false;
    }
  }

  /**
   * Set up queue event listeners
   */
  setupQueueEventListeners() {
    // Listen for queue events and forward to sync listeners
    const queueEvents = [
      'operationQueued',
      'queueProcessed',
      'queueCleared',
      'operationRemoved'
    ];

    queueEvents.forEach(eventName => {
      window.addEventListener(`syncQueue${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`, (event) => {
        this.notifyListeners(`queue${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`, event.detail);
      });
    });
  }

  /**
   * Enable sync
   */
  async enable() {
    try {
      // Only enable if Google Sheets is also enabled
      if (!window.Config?.googleSheets?.enabled) {
        console.log('Cannot enable sync: Google Sheets is disabled');
        return false;
      }

      this.isEnabled = true;

      // Update configuration
      if (window.Config && window.Config.sync) {
        window.Config.sync.enabled = true;
      }

      // Start periodic sync
      await this.startPeriodicSync();

      // Update status
      await this.updateSyncStatus();

      console.log('Sync enabled');
      this.notifyListeners('syncEnabled');

      // Show user notification
      if (window.Utils?.Notify) {
        window.Utils.Notify.success('Google Sheets sync enabled');
      }

    } catch (error) {
      console.error('Error enabling sync:', error);
      throw error;
    }
  }

  /**
   * Disable sync
   */
  async disable() {
    try {
      this.isEnabled = false;

      // Update configuration
      if (window.Config && window.Config.sync) {
        window.Config.sync.enabled = false;
      }

      // Stop periodic sync
      this.stopPeriodicSync();

      // Cancel any ongoing sync
      this.isSyncing = false;

      // Update status
      await this.updateSyncStatus();

      console.log('Sync disabled');
      this.notifyListeners('syncDisabled');

      // Show user notification
      if (window.Utils?.Notify) {
        window.Utils.Notify.info('Google Sheets sync disabled');
      }

    } catch (error) {
      console.error('Error disabling sync:', error);
      throw error;
    }
  }
  /**
   * Check if we can connect to Google Sheets (the only connectivity that matters)
   * SIMPLIFIED: Authentication = connectivity for Google Sheets API
   */
  async checkConnectivity() {
    // For Google Sheets sync, "online" simply means "authenticated with Google"
    // The Google Sheets API will handle all network connectivity details
    return window.AuthManager?.isAuthenticatedUser() || false;
  }

  /**
   * Handle sync errors with retry logic
   */
  handleSyncError(error) {
    console.error('Sync error:', error);

    // Update error statistics
    this.syncStats.lastError = error.message;
    this.saveSyncStats();

    // Emit error event for UI handling
    this.notifyListeners('syncError', {
      error: error.message,
      timestamp: new Date().toISOString(),
      retryAttempts: this.retryAttempts
    });
  }

  /**
   * Check if error should trigger a retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      'network',
      'timeout',
      'rate limit',
      'service unavailable',
      'internal server error'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Retry sync with exponential backoff
   */
  async retrySync(error, options) {
    this.retryAttempts++;
    const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1);

    console.log(`Retrying sync in ${delay}ms (attempt ${this.retryAttempts}/${this.maxRetries})`);

    this.notifyListeners('syncRetry', {
      attempt: this.retryAttempts,
      maxRetries: this.maxRetries,
      delay,
      error: error.message
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    return await this.performSync(options);
  }

  /**
   * Update sync results and statistics
   */
  async updateSyncResults(result) {
    // Update statistics
    this.syncStats.totalSyncs++;
    this.syncStats.successfulSyncs++;
    this.syncStats.uploadedRecords += Object.values(result.uploaded).reduce((sum, count) => sum + count, 0);
    this.syncStats.downloadedRecords += Object.values(result.downloaded).reduce((sum, count) => sum + count, 0);
    this.syncStats.conflictsResolved += result.conflicts.length;
    this.syncStats.lastError = null; // Clear last error on success

    // Save statistics
    await this.saveSyncStats();

    // Update sync timestamps
    await this.saveLastSync();

    // Notify StatusManager of successful sync completion
    if (window.StatusManager) {
      window.StatusManager.updateSyncStatus({
        lastSync: this.lastSync.timestamp,
        syncing: false
      });
    }
  }
  /**
   * Get comprehensive sync status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      online: this.isOnline,
      syncing: this.isSyncing,
      authenticated: window.AuthManager?.isAuthenticatedUser() || false,
      lastSync: this.lastSync,
      nextSync: this.isEnabled && this.periodicSyncTimer ?
        new Date(Date.now() + this.syncInterval).toISOString() : null,
      syncInterval: this.syncInterval,
      queueLength: this.syncQueue.length,
      statistics: this.syncStats,
      retryAttempts: this.retryAttempts,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Add sync event listener
   */
  addSyncListener(callback) {
    if (typeof callback === 'function') {
      this.syncListeners.push(callback);
    }
  }

  /**
   * Remove sync event listener
   */
  removeSyncListener(callback) {
    const index = this.syncListeners.indexOf(callback);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Add sync event listener
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.syncListeners.push(callback);
      return true;
    }
    return false;
  }

  /**
   * Remove sync event listener
   */
  removeListener(callback) {
    const index = this.syncListeners.indexOf(callback);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Notify all sync listeners
   */
  notifyListeners(event, data = {}) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });

    // Also emit as window event for broader compatibility
    window.dispatchEvent(new CustomEvent(`sync${event.charAt(0).toUpperCase() + event.slice(1)}`, {
      detail: data
    }));
  }

  /**
   * Reset sync statistics
   */
  async resetStatistics() {
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastError: null,
      uploadedRecords: 0,
      downloadedRecords: 0,
      conflictsResolved: 0
    };

    await this.saveSyncStats();
    console.log('Sync statistics reset');
    this.notifyListeners('statisticsReset');
  }

  /**
   * Get sync history (last N sync operations)
   */
  getSyncHistory(limit = 10) {
    // This would typically be stored in a more persistent way
    // For now, return basic information from current session
    return {
      totalSyncs: this.syncStats.totalSyncs,
      successfulSyncs: this.syncStats.successfulSyncs,
      failedSyncs: this.syncStats.failedSyncs,
      lastSync: this.lastSync.timestamp,
      lastError: this.syncStats.lastError
    };
  }

  /**
   * Validate sync configuration
   */
  validateConfiguration() {
    const issues = [];

    if (!window.AuthManager) {
      issues.push('AuthManager not available');
    } else if (!window.AuthManager.isInitialized) {
      issues.push('AuthManager not initialized');
    }

    if (!window.SheetsManager) {
      issues.push('SheetsManager not available');
    } else if (!window.SheetsManager.isInitialized) {
      issues.push('SheetsManager not initialized');
    }

    if (!window.DataTransformer) {
      issues.push('DataTransformer not available');
    }

    if (!window.Storage) {
      issues.push('Storage not available');
    } else if (!window.Storage.isReady) {
      issues.push('Storage not ready');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop periodic sync
    this.stopPeriodicSync();

    // Network event listeners removed - no longer using network monitoring

    // Clear listeners
    this.syncListeners = [];

    console.log('SyncManager cleanup completed');
  }
}

// Create global instance
window.SyncManager = new SyncManager();

// Legacy compatibility - maintain the old Sync interface
window.Sync = {
  // Delegate to new SyncManager
  init: () => window.SyncManager.init(),
  performSync: () => window.SyncManager.performSync(),
  forceSync: () => window.SyncManager.forceSync(),
  enable: () => window.SyncManager.enable(),
  disable: () => window.SyncManager.disable(),
  getStatus: () => window.SyncManager.getStatus(),

  // Legacy properties (getters)
  get isEnabled() { return window.SyncManager.isEnabled; },
  get isOnline() { return window.SyncManager.isOnline; },
  get lastSync() { return window.SyncManager.lastSync.timestamp; },

  // Export data for sync (legacy compatibility)
  exportData: () => window.SyncManager.exportData?.() || window.SyncManager.getStatus(),

  // Import data from sync (legacy compatibility)
  importData: (data) => window.SyncManager.importData?.(data),

  // Backup data locally (legacy compatibility)
  backupData: () => window.SyncManager.backupData?.(),

  // Restore data from backup (legacy compatibility)
  restoreData: (file) => window.SyncManager.restoreData?.(file),

  // Update status (legacy compatibility)
  updateStatus: () => window.SyncManager.updateSyncStatus(),

  // Check connectivity (legacy compatibility)
  checkConnectivity: () => window.SyncManager.checkConnectivity(),

  // Set sync interval (legacy compatibility)
  setSyncInterval: (intervalMs) => window.SyncManager.setSyncInterval(intervalMs)
};