/**
 * Unified Sync Manager
 * Single source of truth for all sync operations with intelligent sync strategy selection
 */
class UnifiedSyncManager {
  constructor() {
    this.isEnabled = false;
    this.isOnline = false;
    this.isSyncing = false;
    this.syncInterval = null;
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
    this.retryDelay = 5000;
    this.immediateSyncTimeout = null;

    // Change tracking for intelligent sync decisions
    this.changeTracking = {
      volunteers: new Map(),
      events: new Map(),
      attendance: new Map()
    };

    // Sync strategy thresholds
    this.syncThresholds = {
      fullSyncDays: 7, // Force full sync after 7 days
      deltaThreshold: 50, // Use delta sync if changes < 50
      batchSize: 100 // Process in batches of 100
    };

    // Bind methods
    this.performSync = this.performSync.bind(this);
    this.handleSyncError = this.handleSyncError.bind(this);
  }

  /**
   * Initialize unified sync manager
   */
  async init() {
    try {
      // Simple sync logic: sync is enabled if master switch is on AND Google Sheets is working
      const syncEnabled = window.Config?.sync?.enabled || false;
      const isAuthenticated = window.AuthManager?.isAuthenticatedUser() || false;
      const sheetsReady = window.SheetsManager?.isInitialized || false;

      this.isEnabled = syncEnabled && isAuthenticated && sheetsReady;

      this.syncInterval = window.Config?.sync?.interval || 300000; // 5 minutes default
      this.deltaSyncInterval = window.Config?.sync?.deltaInterval || 30000; // 30 seconds default

      // Load sync state
      await this.loadSyncState();
      await this.loadChangeTracking();

      // Set up change listeners
      this.setupChangeListeners();

      // Check authentication status
      this.isOnline = window.AuthManager?.isAuthenticatedUser() || false;

      // Update initial status
      await this.updateSyncStatus();

      // Start periodic sync if enabled
      if (this.isEnabled) {
        await this.startPeriodicSync();
      }

      console.log('UnifiedSyncManager initialized successfully');
      this.notifyListeners('initialized', {
        enabled: this.isEnabled,
        online: this.isOnline
      });

      return true;

    } catch (error) {
      console.error('Failed to initialize UnifiedSyncManager:', error);
      this.handleSyncError(error);
      return false;
    }
  }

  /**
   * Load sync state from storage
   */
  async loadSyncState() {
    try {
      // Load last sync timestamps
      const storedSync = localStorage.getItem('vat_unified_sync');
      if (storedSync) {
        this.lastSync = { ...this.lastSync, ...JSON.parse(storedSync) };
      }

      // Load sync statistics
      const storedStats = localStorage.getItem('vat_unified_sync_stats');
      if (storedStats) {
        this.syncStats = { ...this.syncStats, ...JSON.parse(storedStats) };
      }

    } catch (error) {
      console.error('Error loading sync state:', error);
      this.resetSyncState();
    }
  }

  /**
   * Save sync state to storage
   */
  async saveSyncState() {
    try {
      localStorage.setItem('vat_unified_sync', JSON.stringify(this.lastSync));
      localStorage.setItem('vat_unified_sync_stats', JSON.stringify(this.syncStats));
    } catch (error) {
      console.error('Error saving sync state:', error);
    }
  }

  /**
   * Reset sync state
   */
  resetSyncState() {
    this.lastSync = {
      timestamp: null,
      volunteers: null,
      events: null,
      attendance: null
    };

    try {
      localStorage.removeItem('vat_unified_sync');
      localStorage.removeItem('vat_unified_sync_stats');
    } catch (error) {
      console.error('Error resetting sync state:', error);
    }
  }

  /**
   * Load change tracking data
   */
  async loadChangeTracking() {
    try {
      const stored = localStorage.getItem('vat_unified_changes');
      if (stored) {
        const data = JSON.parse(stored);

        // Restore Maps from stored data
        Object.keys(this.changeTracking).forEach(dataType => {
          if (data[dataType]) {
            this.changeTracking[dataType] = new Map(data[dataType]);
          }
        });
      }

    } catch (error) {
      console.error('Error loading change tracking:', error);
      this.resetChangeTracking();
    }
  }

  /**
   * Save change tracking data
   */
  async saveChangeTracking() {
    try {
      const data = {};

      // Convert Maps to arrays for storage
      Object.keys(this.changeTracking).forEach(dataType => {
        data[dataType] = Array.from(this.changeTracking[dataType].entries());
      });

      localStorage.setItem('vat_unified_changes', JSON.stringify(data));

    } catch (error) {
      console.error('Error saving change tracking:', error);
    }
  }

  /**
   * Reset change tracking
   */
  resetChangeTracking() {
    Object.keys(this.changeTracking).forEach(dataType => {
      this.changeTracking[dataType].clear();
    });

    try {
      localStorage.removeItem('vat_unified_changes');
    } catch (error) {
      console.error('Error resetting change tracking:', error);
    }
  }

  /**
   * Set up change listeners for automatic tracking
   */
  setupChangeListeners() {
    if (!window.Storage) return;

    // Store original methods
    const originalMethods = {
      addVolunteer: window.Storage.addVolunteer,
      updateVolunteer: window.Storage.updateVolunteer,
      deleteVolunteer: window.Storage.deleteVolunteer,
      addEvent: window.Storage.addEvent,
      updateEvent: window.Storage.updateEvent,
      deleteEvent: window.Storage.deleteEvent,
      addAttendance: window.Storage.addAttendance,
      updateAttendance: window.Storage.updateAttendance,
      deleteAttendance: window.Storage.deleteAttendance
    };

    // Wrap storage methods to track changes
    const wrapMethod = (dataType, operation, originalMethod) => {
      return async (...args) => {
        const result = await originalMethod.apply(window.Storage, args);

        // Track the change
        const recordId = result?.id || args[0]; // For updates/deletes, ID is first arg
        this.trackChange(dataType, recordId, operation, result || { id: recordId });

        return result;
      };
    };

    // Wrap all methods
    window.Storage.addVolunteer = wrapMethod('volunteers', 'create', originalMethods.addVolunteer);
    window.Storage.updateVolunteer = wrapMethod('volunteers', 'update', originalMethods.updateVolunteer);
    window.Storage.deleteVolunteer = wrapMethod('volunteers', 'delete', originalMethods.deleteVolunteer);

    window.Storage.addEvent = wrapMethod('events', 'create', originalMethods.addEvent);
    window.Storage.updateEvent = wrapMethod('events', 'update', originalMethods.updateEvent);
    window.Storage.deleteEvent = wrapMethod('events', 'delete', originalMethods.deleteEvent);

    window.Storage.addAttendance = wrapMethod('attendance', 'create', originalMethods.addAttendance);
    window.Storage.updateAttendance = wrapMethod('attendance', 'update', originalMethods.updateAttendance);
    window.Storage.deleteAttendance = wrapMethod('attendance', 'delete', originalMethods.deleteAttendance);
  }

  /**
   * Track a change for intelligent sync decisions
   */
  trackChange(dataType, recordId, operation, data) {
    if (!this.changeTracking[dataType]) {
      console.warn(`Unknown data type for change tracking: ${dataType}`);
      return;
    }

    const timestamp = new Date().toISOString();
    const changeRecord = {
      id: recordId,
      operation, // 'create', 'update', 'delete'
      data,
      timestamp,
      synced: false
    };

    // Store the change
    this.changeTracking[dataType].set(recordId, changeRecord);

    // Save tracking data
    this.saveChangeTracking();

    console.log(`Tracked ${operation} change for ${dataType} record ${recordId}`);

    // Schedule immediate sync for critical changes
    this.scheduleImmediateSync(operation, dataType);
  }

  /**
   * Schedule immediate delta sync with debouncing to prevent excessive API calls
   */
  scheduleImmediateSync(operation, dataType) {
    // Clear existing timeout to debounce rapid changes
    if (this.immediateSyncTimeout) {
      clearTimeout(this.immediateSyncTimeout);
    }

    // Use delta sync interval for immediate sync delay
    const delay = Math.min(this.deltaSyncInterval / 2, 5000); // Half of delta interval, max 5 seconds

    console.log(`⚡ Scheduling delta sync in ${delay}ms for ${operation} ${dataType} (delta interval: ${this.deltaSyncInterval}ms)`);

    this.immediateSyncTimeout = setTimeout(async () => {
      if (this.isEnabled && !this.isSyncing) {
        console.log(`🚀 Triggering delta sync for ${operation} ${dataType}`);
        try {
          await this.performSync({
            reason: 'delta',
            trigger: `${operation}_${dataType}`,
            deltaOnly: true // Only sync changes, not full sync
          });
        } catch (error) {
          console.error('Delta sync failed:', error);
        }
      }
    }, delay);
  }

  /**
   * Main sync method with intelligent strategy selection
   */
  async performSync(options = {}) {
    if (!this.isEnabled && !options.bypassEnabledCheck) {
      console.log('Sync is disabled');
      return { success: false, reason: 'disabled' };
    }

    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, reason: 'already_syncing' };
    }

    this.isSyncing = true;
    this.retryAttempts = 0;

    try {
      console.log('Starting unified sync...');
      this.notifyListeners('syncStarted', { timestamp: new Date().toISOString() });
      await this.updateSyncStatus();

      // Step 1: Check prerequisites
      await this.checkSyncPrerequisites();

      // Step 2: Analyze data and determine sync strategy
      const syncStrategy = await this.determineSyncStrategy(options);
      console.log(`Selected sync strategy: ${syncStrategy.type}`, syncStrategy);

      // Step 3: Execute sync based on strategy
      const syncResult = await this.executeSyncStrategy(syncStrategy, options);

      // Step 4: Update state and statistics
      await this.updateSyncResults(syncResult);

      this.isOnline = true;
      this.retryAttempts = 0;

      console.log('Unified sync completed successfully:', syncResult);
      this.notifyListeners('syncCompleted', syncResult);

      return { success: true, result: syncResult };

    } catch (error) {
      this.isOnline = false;
      console.error('Unified sync failed:', error);

      // Use centralized error handler if available
      if (window.ErrorHandler) {
        await window.ErrorHandler.handleError(error, {
          type: 'sync',
          operation: 'unified_sync',
          syncStrategy: options.syncStrategy
        }, {
          allowRetry: this.shouldRetry(error) && this.retryAttempts < this.maxRetries,
          retryFunction: () => this.performSync(options),
          targetElement: '.sync-status-indicator'
        });
      }

      // Handle retries
      if (this.shouldRetry(error) && this.retryAttempts < this.maxRetries) {
        return await this.retrySync(error, options);
      }

      // Update error statistics
      this.syncStats.failedSyncs++;
      this.syncStats.lastError = error.message;
      await this.saveSyncState();

      this.handleSyncError(error);
      this.notifyListeners('syncFailed', { error: error.message, timestamp: new Date().toISOString() });

      return { success: false, error: error.message };

    } finally {
      this.isSyncing = false;
      await this.updateSyncStatus();
    }
  }

  /**
   * Intelligent sync strategy determination
   */
  async determineSyncStrategy(options = {}) {
    const strategy = {
      type: 'delta', // 'full', 'delta', or 'smart'
      dataTypes: ['volunteers', 'events', 'attendance'],
      operations: {
        upload: {},
        download: {}
      },
      reason: ''
    };

    // Force full sync if requested
    if (options.fullSync) {
      strategy.type = 'full';
      strategy.reason = 'Requested by user';
      return this.buildFullSyncStrategy(strategy);
    }

    // Check if this is the first sync
    if (!this.lastSync.timestamp) {
      strategy.type = 'full';
      strategy.reason = 'First sync - no previous sync data';
      return this.buildFullSyncStrategy(strategy);
    }

    // Check if last sync was too long ago
    const daysSinceLastSync = this.getDaysSinceLastSync();
    if (daysSinceLastSync > this.syncThresholds.fullSyncDays) {
      strategy.type = 'full';
      strategy.reason = `Last sync was ${daysSinceLastSync} days ago`;
      return this.buildFullSyncStrategy(strategy);
    }

    // Analyze changes for each data type
    const changeAnalysis = await this.analyzeChanges();

    // Determine if we should use delta or smart sync
    const totalChanges = Object.values(changeAnalysis.localChanges)
      .reduce((sum, changes) => sum + changes.length, 0);

    if (totalChanges === 0 && !changeAnalysis.hasRemoteChanges) {
      strategy.type = 'none';
      strategy.reason = 'No changes detected';
      return strategy;
    }

    if (totalChanges < this.syncThresholds.deltaThreshold) {
      strategy.type = 'delta';
      strategy.reason = `Small number of changes (${totalChanges})`;
      return this.buildDeltaSyncStrategy(strategy, changeAnalysis);
    }

    // Use smart sync for moderate changes
    strategy.type = 'smart';
    strategy.reason = `Moderate changes detected (${totalChanges})`;
    return this.buildSmartSyncStrategy(strategy, changeAnalysis);
  }

  /**
   * Build full sync strategy
   */
  async buildFullSyncStrategy(strategy) {
    for (const dataType of strategy.dataTypes) {
      // Upload all local data
      strategy.operations.upload[dataType] = await this.getAllLocalData(dataType);

      // Download all remote data
      strategy.operations.download[dataType] = true;
    }

    return strategy;
  }

  /**
   * Build delta sync strategy
   */
  async buildDeltaSyncStrategy(strategy, changeAnalysis) {
    for (const dataType of strategy.dataTypes) {
      // Upload only changed records
      strategy.operations.upload[dataType] = changeAnalysis.localChanges[dataType] || [];

      // Download only if remote changes detected
      strategy.operations.download[dataType] = changeAnalysis.remoteChanges[dataType] || false;
    }

    return strategy;
  }

  /**
   * Build smart sync strategy (hybrid approach)
   */
  async buildSmartSyncStrategy(strategy, changeAnalysis) {
    for (const dataType of strategy.dataTypes) {
      const localChanges = changeAnalysis.localChanges[dataType] || [];

      // If many changes, do full sync for this data type
      if (localChanges.length > this.syncThresholds.deltaThreshold / 3) {
        strategy.operations.upload[dataType] = await this.getAllLocalData(dataType);
        strategy.operations.download[dataType] = true;
      } else {
        // Use delta sync for this data type
        strategy.operations.upload[dataType] = localChanges;
        strategy.operations.download[dataType] = changeAnalysis.remoteChanges[dataType] || false;
      }
    }

    return strategy;
  }

  /**
   * Analyze changes since last sync
   */
  async analyzeChanges() {
    const analysis = {
      localChanges: {},
      remoteChanges: {},
      hasRemoteChanges: false
    };

    for (const dataType of ['volunteers', 'events', 'attendance']) {
      // Get local changes since last sync
      analysis.localChanges[dataType] = await this.getLocalChangesSince(
        dataType,
        this.lastSync[dataType]
      );

      // Check for remote changes
      analysis.remoteChanges[dataType] = await this.checkRemoteChanges(
        dataType,
        this.lastSync[dataType]
      );

      if (analysis.remoteChanges[dataType]) {
        analysis.hasRemoteChanges = true;
      }
    }

    return analysis;
  }

  /**
   * Get local changes since last sync using change tracking
   */
  async getLocalChangesSince(dataType, lastSyncTime) {
    try {
      const changes = [];
      const trackedChanges = this.changeTracking[dataType];

      if (trackedChanges && trackedChanges.size > 0) {
        // Use tracked changes for efficiency
        const sinceDate = lastSyncTime ? new Date(lastSyncTime) : new Date(0);

        trackedChanges.forEach((change) => {
          if (!change.synced && new Date(change.timestamp) > sinceDate) {
            changes.push(change.data);
          }
        });
      } else {
        // Fallback to timestamp-based detection
        const allRecords = await this.getAllLocalData(dataType);

        if (!lastSyncTime) {
          return allRecords; // First sync
        }

        const sinceDate = new Date(lastSyncTime);
        return allRecords.filter(record => {
          const updatedAt = new Date(record.updatedAt || record.createdAt);
          return updatedAt > sinceDate;
        });
      }

      return changes;

    } catch (error) {
      console.error(`Error getting local changes for ${dataType}:`, error);
      return [];
    }
  }

  /**
   * Get all local data for a data type
   */
  async getAllLocalData(dataType) {
    try {
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
    } catch (error) {
      console.error(`Error getting all local data for ${dataType}:`, error);
      return [];
    }
  }

  /**
   * Check for remote changes
   */
  async checkRemoteChanges(dataType, lastSyncTime) {
    try {
      if (!lastSyncTime) {
        return true; // First sync
      }

      // Get sheet configuration
      const sheetConfig = window.SheetsManager.sheetsConfig[dataType];
      if (!sheetConfig) {
        return false;
      }

      // Check if sheet has data
      const sheetData = await window.SheetsManager.readSheet(sheetConfig.name);
      return sheetData && sheetData.length > 0;

    } catch (error) {
      console.error(`Error checking remote changes for ${dataType}:`, error);
      return true; // Assume changes to be safe
    }
  }

  /**
   * Execute sync strategy
   */
  async executeSyncStrategy(strategy, options = {}) {
    if (strategy.type === 'none') {
      return {
        uploaded: { volunteers: 0, events: 0, attendance: 0 },
        downloaded: { volunteers: 0, events: 0, attendance: 0 },
        conflicts: [],
        errors: [],
        strategy: strategy.type
      };
    }

    const result = {
      uploaded: { volunteers: 0, events: 0, attendance: 0 },
      downloaded: { volunteers: 0, events: 0, attendance: 0 },
      conflicts: [],
      errors: [],
      strategy: strategy.type
    };

    try {
      // Phase 1: Upload changes (skip if downloadOnly)
      if (!options.downloadOnly) {
        for (const [dataType, changes] of Object.entries(strategy.operations.upload)) {
          if (changes && changes.length > 0) {
            try {
              const uploadResult = await this.uploadChanges(dataType, changes);
              result.uploaded[dataType] = uploadResult.count;
              result.conflicts.push(...uploadResult.conflicts);
            } catch (error) {
              console.error(`Error uploading ${dataType}:`, error);
              result.errors.push({ type: 'upload', dataType, error: error.message });
            }
          }
        }
      } else {
        console.log('📥 Skipping upload phase (download-only mode)');
      }

      // Phase 2: Download changes
      for (const [dataType, shouldDownload] of Object.entries(strategy.operations.download)) {
        if (shouldDownload) {
          try {
            const downloadResult = await this.downloadChanges(dataType);
            result.downloaded[dataType] = downloadResult.count;
            result.conflicts.push(...downloadResult.conflicts);
          } catch (error) {
            console.error(`Error downloading ${dataType}:`, error);
            result.errors.push({ type: 'download', dataType, error: error.message });
          }
        }
      }

      return result;

    } catch (error) {
      console.error('Error executing sync strategy:', error);
      throw error;
    }
  }  /*
*
   * Upload changes to Google Sheets
   */
  async uploadChanges(dataType, changes) {
    try {
      if (!changes || changes.length === 0) {
        return { count: 0, conflicts: [] };
      }

      console.log(`Uploading ${changes.length} ${dataType} changes...`);

      // Transform data to sheets format
      const transformer = window.DataTransformer;
      const singularDataType = dataType.endsWith('s') ? dataType.slice(0, -1) : dataType;

      let transformedData = [];
      try {
        transformedData = transformer.batchTransform(changes, singularDataType, 'toSheets').flat();
      } catch (error) {
        console.error(`Batch transform failed for ${dataType}, using individual transform:`, error);
        transformedData = changes.map(change =>
          transformer.toSheetsFormat(change, singularDataType)
        ).flat();
      }

      if (transformedData.length === 0) {
        console.warn(`No valid ${dataType} records to upload after transformation`);
        return { count: 0, conflicts: [] };
      }

      // Get existing data for conflict detection
      const existingData = await window.SheetsManager.readSheet(
        window.SheetsManager.sheetsConfig[dataType].name
      );

      // Process uploads with conflict detection
      const uploadResult = await this.processUploads(
        transformedData,
        existingData,
        dataType
      );

      // Mark changes as synced
      this.markChangesAsSynced(dataType, changes);

      return uploadResult;

    } catch (error) {
      console.error(`Error uploading ${dataType} changes:`, error);
      throw error;
    }
  }

  /**
   * Process uploads with conflict detection
   */
  async processUploads(transformedData, existingData, dataType) {
    const newRecords = [];
    const updateRecords = [];
    const conflicts = [];

    // Analyze each record
    for (const record of transformedData) {
      if (!record || !record[0]) continue;

      const recordId = record[0];
      const existingIndex = existingData.findIndex(row =>
        String(row[0]) === String(recordId)
      );

      if (existingIndex === -1) {
        // New record
        newRecords.push(record);
      } else {
        // Update existing record
        updateRecords.push({ index: existingIndex + 2, data: record }); // +2 for header row and 1-based indexing
      }
    }

    let uploadCount = 0;

    // Process new records
    if (newRecords.length > 0) {
      await window.SheetsManager.appendToSheet(
        window.SheetsManager.sheetsConfig[dataType].name,
        newRecords
      );
      uploadCount += newRecords.length;
      console.log(`Added ${newRecords.length} new ${dataType} records`);
    }

    // Process updates - use writeSheet with specific range for each update
    for (const update of updateRecords) {
      const sheetName = window.SheetsManager.sheetsConfig[dataType].name;
      const rowNumber = update.index + 2; // +1 for 0-based index, +1 for header row
      const columnCount = window.SheetsManager.sheetsConfig[dataType].headers.length;
      const columnLetter = window.SheetsManager.getColumnLetter(columnCount);
      const range = `${sheetName}!A${rowNumber}:${columnLetter}${rowNumber}`;

      await window.SheetsManager.writeSheet(sheetName, [update.data], range);
      uploadCount++;
    }

    if (updateRecords.length > 0) {
      console.log(`Updated ${updateRecords.length} existing ${dataType} records`);
    }

    return { count: uploadCount, conflicts };
  }

  /**
   * Download changes from Google Sheets
   */
  async downloadChanges(dataType) {
    try {
      console.log(`Downloading ${dataType} changes...`);

      // Read data from sheet
      const sheetData = await window.SheetsManager.readSheet(
        window.SheetsManager.sheetsConfig[dataType].name
      );

      if (!sheetData || sheetData.length === 0) {
        return { count: 0, conflicts: [] };
      }

      // Transform sheet data to local format
      const transformer = window.DataTransformer;
      const singularDataType = dataType.endsWith('s') ? dataType.slice(0, -1) : dataType;

      const transformedData = transformer.fromSheetsFormat(sheetData, singularDataType);

      // Update local storage efficiently
      const updateResult = await this.updateLocalStorage(dataType, transformedData);

      console.log(`Downloaded ${updateResult.count} ${dataType} records`);
      return updateResult;

    } catch (error) {
      console.error(`Error downloading ${dataType} changes:`, error);
      throw error;
    }
  }

  /**
   * Update local storage efficiently
   */
  async updateLocalStorage(dataType, remoteData) {
    try {
      let localData = await this.getAllLocalData(dataType);
      const localMap = new Map(localData.map(item => [item.id, item]));
      const remoteMap = new Map(remoteData.map(item => [item.id, item]));

      let createdCount = 0;
      let updatedCount = 0;

      // Process remote data
      for (const [id, remoteItem] of remoteMap) {
        const localItem = localMap.get(id);

        if (!localItem) {
          // Create new record
          await this.createLocalRecord(dataType, remoteItem);
          createdCount++;
        } else {
          // Check if update needed
          if (this.needsUpdate(localItem, remoteItem)) {
            await this.updateLocalRecord(dataType, id, remoteItem);
            updatedCount++;
          }
        }
      }

      return {
        count: createdCount + updatedCount,
        created: createdCount,
        updated: updatedCount,
        conflicts: []
      };

    } catch (error) {
      console.error(`Error updating local storage for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Check if local record needs update
   */
  needsUpdate(localItem, remoteItem) {
    const localTimestamp = new Date(localItem.updatedAt || localItem.createdAt);
    const remoteTimestamp = new Date(remoteItem.updatedAt || remoteItem.createdAt);

    return remoteTimestamp > localTimestamp;
  }

  /**
   * Create local record
   */
  async createLocalRecord(dataType, data) {
    switch (dataType) {
      case 'volunteers':
        return await window.Storage.addVolunteer(data);
      case 'events':
        return await window.Storage.addEvent(data);
      case 'attendance':
        // Ensure backward compatibility for validation status fields
        const attendanceData = {
          ...data,
          validationStatus: data.validationStatus || 'ID Found',
          scannerMode: data.scannerMode || 'strict'
        };
        return await window.Storage.addAttendance(attendanceData);
    }
  }

  /**
   * Update local record
   */
  async updateLocalRecord(dataType, id, data) {
    switch (dataType) {
      case 'volunteers':
        return await window.Storage.updateVolunteer(id, data);
      case 'events':
        return await window.Storage.updateEvent(id, data);
      case 'attendance':
        // Ensure backward compatibility for validation status fields
        const attendanceData = {
          ...data,
          validationStatus: data.validationStatus || 'ID Found',
          scannerMode: data.scannerMode || 'strict'
        };
        return await window.Storage.updateAttendance(id, attendanceData);
    }
  }

  /**
   * Mark changes as synced in tracking
   */
  markChangesAsSynced(dataType, changes) {
    const trackedChanges = this.changeTracking[dataType];
    if (!trackedChanges) return;

    changes.forEach(change => {
      const tracked = trackedChanges.get(change.id);
      if (tracked) {
        tracked.synced = true;
        tracked.syncedAt = new Date().toISOString();
      }
    });

    this.saveChangeTracking();
  }

  /**
   * Update sync results and statistics
   */
  async updateSyncResults(syncResult) {
    const now = new Date().toISOString();

    // Update last sync timestamps
    this.lastSync.timestamp = now;
    this.lastSync.volunteers = now;
    this.lastSync.events = now;
    this.lastSync.attendance = now;

    // Update statistics
    this.syncStats.totalSyncs++;
    this.syncStats.successfulSyncs++;
    this.syncStats.lastError = null;

    this.syncStats.uploadedRecords += Object.values(syncResult.uploaded)
      .reduce((sum, count) => sum + count, 0);
    this.syncStats.downloadedRecords += Object.values(syncResult.downloaded)
      .reduce((sum, count) => sum + count, 0);
    this.syncStats.conflictsResolved += syncResult.conflicts.length;

    // Save state
    await this.saveSyncState();
  }

  /**
   * Get days since last sync
   */
  getDaysSinceLastSync() {
    if (!this.lastSync.timestamp) return Infinity;

    const lastSync = new Date(this.lastSync.timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - lastSync);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check sync prerequisites
   */
  async checkSyncPrerequisites() {
    // Check authentication
    if (!window.AuthManager?.isAuthenticatedUser()) {
      const restored = await window.AuthManager?.restoreAuthenticationFromStorage();
      if (!restored) {
        throw new Error('User not authenticated with Google');
      }
    }

    // Check services
    if (!window.SheetsManager?.isInitialized) {
      throw new Error('Google Sheets service not initialized');
    }

    if (!window.SheetsManager.isSpreadsheetConfigured()) {
      throw new Error('No Google Spreadsheet configured');
    }

    // Validate spreadsheet access
    if (!await window.SheetsManager.validateSpreadsheet(window.SheetsManager.spreadsheetId)) {
      throw new Error('Cannot access Google Spreadsheet');
    }
  }

  /**
   * Start periodic sync
   */
  async startPeriodicSync() {
    if (!this.isEnabled) return;

    this.stopPeriodicSync();

    console.log(`Starting periodic sync with ${this.syncInterval}ms interval`);

    // Initial sync after delay
    setTimeout(() => this.performSyncWhenReady(), 1000);

    // Set up periodic sync
    this.periodicSyncTimer = setInterval(() => {
      if (this.isEnabled && !this.isSyncing) {
        this.performSyncWhenReady();
      }
    }, this.syncInterval);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.periodicSyncTimer = null;
    }
  }

  /**
   * Perform sync when ready
   */
  async performSyncWhenReady() {
    if (!window.Config?.googleSheets?.enabled) return;
    if (!window.SheetsManager?.isInitialized) {
      setTimeout(() => this.performSyncWhenReady(), 2000);
      return;
    }
    if (!window.AuthManager?.isAuthenticatedUser()) return;

    await this.performSync();
  }

  /**
   * Update sync status and UI
   */
  /**
   * Re-evaluate sync enabled state based on current configuration
   */
  evaluateSyncEnabledState() {
    const syncEnabled = window.Config?.sync?.enabled || false;
    const isAuthenticated = window.AuthManager?.isAuthenticatedUser() || false;
    const sheetsReady = window.SheetsManager?.isInitialized || false;

    // Simple logic: all three must be true
    const shouldBeEnabled = syncEnabled && isAuthenticated && sheetsReady;

    console.log('🔍 Evaluating sync enabled state:', {
      syncEnabled,
      isAuthenticated,
      sheetsReady,
      currentlyEnabled: this.isEnabled,
      shouldBeEnabled
    });

    if (shouldBeEnabled !== this.isEnabled) {
      console.log(`🔄 Sync enabled state changed: ${this.isEnabled} -> ${shouldBeEnabled}`);
      this.isEnabled = shouldBeEnabled;

      if (this.isEnabled) {
        this.isOnline = isAuthenticated;
        console.log('✅ Sync enabled - starting periodic sync if authenticated');
        if (isAuthenticated) {
          this.startPeriodicSync();
        }
      } else {
        this.isOnline = false;
        console.log('❌ Sync disabled - stopping periodic sync');
        this.stopPeriodicSync();
      }
    }

    return this.isEnabled;
  }

  async updateSyncStatus() {
    try {
      // Re-evaluate sync enabled state first
      this.evaluateSyncEnabledState();

      const isAuthenticated = window.AuthManager?.isAuthenticatedUser() || false;

      if (!this.isSyncing && (!this.lastSync.timestamp || !isAuthenticated)) {
        this.isOnline = isAuthenticated;
      }

      this.updateStatusUI();

      this.notifyListeners('statusUpdate', {
        enabled: this.isEnabled,
        online: this.isOnline,
        authenticated: isAuthenticated,
        syncing: this.isSyncing,
        lastSync: this.lastSync,
        stats: this.syncStats
      });

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
   * Update status UI elements
   */
  updateStatusUI() {
    const syncStatus = document.querySelector('#syncStatus');
    if (!syncStatus) return;

    const statusText = syncStatus.querySelector('.status-text');
    const statusIcon = syncStatus.querySelector('.status-icon');
    if (!statusText) return;

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
      syncStatus.title = 'No internet connection';
      if (statusIcon) statusIcon.className = 'status-icon fas fa-cloud-download-alt';
    } else {
      syncStatus.classList.add('offline');
      statusText.textContent = 'Disabled';
      syncStatus.title = 'Google Sheets sync is disabled';
      if (statusIcon) statusIcon.className = 'status-icon fas fa-times-circle';
    }

    this.updateSyncStatsUI();
  }

  /**
   * Update sync statistics UI
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
   * Handle sync errors
   */
  handleSyncError(error) {
    console.error('Sync error:', error);
    this.syncStats.lastError = error.message;
  }

  /**
   * Check if error should trigger retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      'network',
      'timeout',
      'rate limit',
      'temporary'
    ];

    return retryableErrors.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Retry sync with backoff
   */
  async retrySync(error, options) {
    this.retryAttempts++;
    const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1);

    console.log(`Retrying sync in ${delay}ms (attempt ${this.retryAttempts}/${this.maxRetries})`);

    await new Promise(resolve => setTimeout(resolve, delay));
    return this.performSync(options);
  }

  /**
   * Add sync listener
   */
  addSyncListener(listener) {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync listener
   */
  removeSyncListener(listener) {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Add listener (compatibility method for old sync-status component)
   */
  addListener(event, callback) {
    // Store event-specific listeners
    if (!this.eventListeners) {
      this.eventListeners = new Map();
    }

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }

    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove listener (compatibility method)
   */
  removeListener(event, callback) {
    if (!this.eventListeners || !this.eventListeners.has(event)) {
      return;
    }

    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Notify sync listeners
   */
  notifyListeners(event, data) {
    // Notify general sync listeners
    this.syncListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });

    // Notify event-specific listeners (for compatibility)
    if (this.eventListeners && this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Force full sync
   */
  async forceFullSync() {
    return this.performSync({ fullSync: true });
  }

  /**
   * Reset all sync data
   */
  async resetSync() {
    this.stopPeriodicSync();
    this.resetSyncState();
    this.resetChangeTracking();
    await this.updateSyncStatus();

    if (this.isEnabled) {
      await this.startPeriodicSync();
    }
  }

  /**
   * Clear local storage and sync fresh from Google Sheets
   * Simple, clean implementation - single source of truth
   */
  async resetAndSyncFromSheets() {
    try {
      console.log('🔄 Starting reset and sync from Google Sheets...');

      // Step 1: Verify prerequisites
      if (!window.SheetsManager || !window.SheetsManager.isInitialized) {
        throw new Error('Google Sheets not available - please check authentication and configuration');
      }

      if (!window.AuthManager || !window.AuthManager.isAuthenticatedUser()) {
        throw new Error('Not authenticated with Google - please sign in first');
      }

      // Step 2: Stop any ongoing sync and mark as syncing
      this.stopPeriodicSync();
      this.isSyncing = true;
      await this.updateSyncStatus();

      // Step 3: Clear all local data (preserving config)
      console.log('🗑️ Clearing local data...');
      await window.Storage.clearAllData();

      // Step 4: Download fresh data from Google Sheets
      console.log('📥 Downloading from Google Sheets...');
      const volunteers = await window.SheetsManager.getVolunteers();
      const events = await window.SheetsManager.getEvents();
      const attendance = await window.SheetsManager.getAttendance();

      // Step 5: Store data locally
      console.log('💾 Storing data locally...');
      let totalStored = 0;

      if (volunteers && volunteers.length > 0) {
        for (const volunteer of volunteers) {
          await window.Storage.saveVolunteer(volunteer);
          totalStored++;
        }
      }

      if (events && events.length > 0) {
        for (const event of events) {
          await window.Storage.saveEvent(event);
          totalStored++;
        }
      }

      if (attendance && attendance.length > 0) {
        for (const record of attendance) {
          await window.Storage.saveAttendance(record);
          totalStored++;
        }
      }

      // Step 6: Update sync state
      this.lastSync.timestamp = new Date().toISOString();
      this.lastSync.volunteers = this.lastSync.timestamp;
      this.lastSync.events = this.lastSync.timestamp;
      this.lastSync.attendance = this.lastSync.timestamp;

      this.syncStats.totalSyncs++;
      this.syncStats.successfulSyncs++;
      this.syncStats.downloadedRecords += totalStored;

      await this.saveSyncState();

      // Step 7: Reset change tracking and restart sync
      this.resetChangeTracking();
      this.isSyncing = false;

      if (this.isEnabled) {
        await this.startPeriodicSync();
      }

      await this.updateSyncStatus();

      console.log(`✅ Reset and sync completed: ${totalStored} records downloaded`);

      // Notify listeners
      this.notifyListeners('resetCompleted', {
        timestamp: new Date().toISOString(),
        totalDownloaded: totalStored,
        volunteers: volunteers?.length || 0,
        events: events?.length || 0,
        attendance: attendance?.length || 0
      });

      return {
        success: true,
        totalDownloaded: totalStored,
        volunteers: volunteers?.length || 0,
        events: events?.length || 0,
        attendance: attendance?.length || 0
      };

    } catch (error) {
      console.error('❌ Reset and sync failed:', error);

      // Restore sync state
      this.isSyncing = false;
      this.syncStats.failedSyncs++;
      this.syncStats.lastError = error.message;

      if (this.isEnabled) {
        await this.startPeriodicSync();
      }

      await this.updateSyncStatus();

      return { success: false, error: error.message };
    }
  }





  /**
   * Download-only sync (doesn't upload local changes)
   */
  async downloadOnlySync() {
    console.log('📥 Starting download-only sync...');

    const result = {
      downloaded: { volunteers: 0, events: 0, attendance: 0 },
      errors: []
    };

    try {
      // Download all data types
      for (const dataType of ['volunteers', 'events', 'attendance']) {
        try {
          const downloadResult = await this.downloadChanges(dataType);
          result.downloaded[dataType] = downloadResult.count || downloadResult.created || 0;
          console.log(`📥 Downloaded ${result.downloaded[dataType]} ${dataType} records`);
        } catch (error) {
          console.error(`❌ Error downloading ${dataType}:`, error);
          result.errors.push({ type: 'download', dataType, error: error.message });
        }
      }

      return result;

    } catch (error) {
      console.error('❌ Download-only sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      enabled: this.isEnabled,
      online: this.isOnline,
      syncing: this.isSyncing,
      lastSync: this.lastSync,
      stats: this.syncStats,
      changeCount: Object.values(this.changeTracking)
        .reduce((sum, changes) => sum + changes.size, 0)
    };
  }

  /**
   * Enable sync (compatibility method)
   */
  async enable() {
    console.log('Sync enable requested - unified sync system handles this automatically');
    this.isEnabled = true;
    await this.updateSyncStatus();

    // Start periodic sync if not already started
    if (this.isEnabled && !this.periodicSyncTimer) {
      await this.startPeriodicSync();
    }

    return Promise.resolve();
  }

  /**
   * Re-evaluate sync enabled status (called after Google Sheets initialization)
   */
  async reevaluateEnabledStatus() {
    console.log('🔄 Re-evaluating sync enabled status...');
    this.evaluateSyncEnabledState();
    await this.updateSyncStatus();
    console.log('🔄 Sync status re-evaluation completed');
  }

  /**
   * Disable sync (compatibility method)
   */
  async disable() {
    console.log('Sync disable requested - unified sync system handles this automatically');
    this.isEnabled = false;
    await this.updateSyncStatus();
    return Promise.resolve();
  }

  /**
   * Get status (alias for getSyncStatus)
   */
  getStatus() {
    return this.getSyncStatus();
  }
}

// Export for global use
window.UnifiedSyncManager = UnifiedSyncManager;