/**
 * Conflict Resolution System
 * Handles data conflicts when the same record is modified in both local and remote locations
 */
class ConflictResolver {
  constructor() {
    this.conflictHistory = [];
    this.resolutionStrategies = {
      LAST_MODIFIED_WINS: 'last_modified_wins',
      KEEP_LOCAL: 'keep_local',
      KEEP_REMOTE: 'keep_remote',
      MERGE: 'merge',
      MANUAL: 'manual'
    };
    this.conflictTypes = {
      UPDATE_CONFLICT: 'update_conflict',
      DELETE_CONFLICT: 'delete_conflict',
      CREATE_CONFLICT: 'create_conflict',
      FIELD_CONFLICT: 'field_conflict'
    };
    this.conflictPriorities = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };
    this.auditLog = [];
    this.conflictListeners = [];
    
    // Bind methods
    this.resolveConflict = this.resolveConflict.bind(this);
    this.handleManualResolution = this.handleManualResolution.bind(this);
  }

  /**
   * Initialize conflict resolver
   */
  async init() {
    try {
      // Load conflict history from storage
      await this.loadConflictHistory();
      
      // Load audit log
      await this.loadAuditLog();
      
      // Set up event listeners for manual resolution UI
      this.setupEventListeners();
      
      console.log('ConflictResolver initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize ConflictResolver:', error);
      return false;
    }
  }

  /**
   * Detect conflicts between local and remote data
   * @param {Object} localRecord - Local data record
   * @param {Object} remoteRecord - Remote data record
   * @param {string} dataType - Type of data (volunteers, events, attendance)
   * @returns {Object|null} Conflict object or null if no conflict
   */
  detectConflicts(localRecord, remoteRecord, dataType) {
    if (!localRecord || !remoteRecord) {
      return null;
    }

    // Check if both records have been modified since last sync
    const localModified = new Date(localRecord.updatedAt || localRecord.createdAt);
    const remoteModified = new Date(remoteRecord.updatedAt || remoteRecord.createdAt);
    const lastSync = this.getLastSyncTime(dataType);

    // No conflict if only one side was modified since last sync
    if (lastSync) {
      const lastSyncDate = new Date(lastSync);
      const localModifiedSinceSync = localModified > lastSyncDate;
      const remoteModifiedSinceSync = remoteModified > lastSyncDate;

      if (!localModifiedSinceSync || !remoteModifiedSinceSync) {
        return null;
      }
    }

    // Analyze field-level conflicts
    const fieldConflicts = this.analyzeFieldConflicts(localRecord, remoteRecord, dataType);
    
    if (fieldConflicts.length === 0) {
      return null; // No actual conflicts found
    }

    // Create conflict object
    const conflict = {
      id: this.generateConflictId(),
      type: this.conflictTypes.UPDATE_CONFLICT,
      dataType: dataType,
      recordId: localRecord.id || remoteRecord.id,
      localRecord: { ...localRecord },
      remoteRecord: { ...remoteRecord },
      fieldConflicts: fieldConflicts,
      priority: this.calculateConflictPriority(fieldConflicts, dataType),
      detectedAt: new Date().toISOString(),
      status: 'pending',
      suggestedResolution: this.suggestResolution(localRecord, remoteRecord, fieldConflicts),
      metadata: {
        localModified: localModified.toISOString(),
        remoteModified: remoteModified.toISOString(),
        lastSync: lastSync
      }
    };

    // Log conflict detection
    this.logConflictDetection(conflict);

    return conflict;
  }

  /**
   * Analyze field-level conflicts between records
   */
  analyzeFieldConflicts(localRecord, remoteRecord, dataType) {
    const conflicts = [];
    const fieldsToCheck = this.getFieldsToCheck(dataType);

    for (const field of fieldsToCheck) {
      const localValue = localRecord[field];
      const remoteValue = remoteRecord[field];

      // Skip if values are the same
      if (this.areValuesEqual(localValue, remoteValue)) {
        continue;
      }

      // Determine conflict severity
      const severity = this.getFieldConflictSeverity(field, dataType);

      conflicts.push({
        field: field,
        localValue: localValue,
        remoteValue: remoteValue,
        severity: severity,
        canMerge: this.canFieldBeMerged(field, localValue, remoteValue, dataType)
      });
    }

    return conflicts;
  }

  /**
   * Get fields to check for conflicts based on data type
   */
  getFieldsToCheck(dataType) {
    const fieldMaps = {
      volunteers: ['name', 'email', 'committee', 'updatedAt'],
      events: ['name', 'date', 'startTime', 'endTime', 'status', 'description', 'updatedAt'],
      attendance: ['volunteerId', 'eventId', 'volunteerName', 'committee', 'date', 'dateTime', 'updatedAt']
    };

    return fieldMaps[dataType] || [];
  }

  /**
   * Check if two values are equal (handles different data types)
   */
  areValuesEqual(value1, value2) {
    // Handle null/undefined
    if (value1 == null && value2 == null) return true;
    if (value1 == null || value2 == null) return false;

    // Handle dates
    if (value1 instanceof Date && value2 instanceof Date) {
      return value1.getTime() === value2.getTime();
    }

    // Handle strings (case-insensitive for some fields)
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.trim() === value2.trim();
    }

    // Default comparison
    return value1 === value2;
  }

  /**
   * Get conflict severity for a specific field
   */
  getFieldConflictSeverity(field, dataType) {
    const highSeverityFields = {
      volunteers: ['name', 'email'],
      events: ['name', 'date', 'startTime', 'endTime'],
      attendance: ['volunteerId', 'eventId', 'date', 'dateTime']
    };

    const mediumSeverityFields = {
      volunteers: ['committee'],
      events: ['status', 'description'],
      attendance: ['volunteerName', 'committee']
    };

    if (highSeverityFields[dataType]?.includes(field)) {
      return 'high';
    } else if (mediumSeverityFields[dataType]?.includes(field)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Check if a field can be automatically merged
   */
  canFieldBeMerged(field, localValue, remoteValue, dataType) {
    // Description fields can often be merged
    if (field === 'description' && typeof localValue === 'string' && typeof remoteValue === 'string') {
      return true;
    }

    // Committee fields might be mergeable if they're related
    if (field === 'committee' && this.areCommitteesRelated(localValue, remoteValue)) {
      return true;
    }

    // Most other fields cannot be automatically merged
    return false;
  }

  /**
   * Check if committees are related (for merge possibility)
   */
  areCommitteesRelated(committee1, committee2) {
    if (!committee1 || !committee2) return false;
    
    const related = [
      ['Teaching', 'Education'],
      ['Kitchen', 'Food Service'],
      ['Maintenance', 'Facilities']
    ];

    return related.some(group => 
      group.includes(committee1) && group.includes(committee2)
    );
  }

  /**
   * Calculate overall conflict priority
   */
  calculateConflictPriority(fieldConflicts, dataType) {
    if (fieldConflicts.length === 0) return this.conflictPriorities.LOW;

    const hasHighSeverity = fieldConflicts.some(c => c.severity === 'high');
    const hasMediumSeverity = fieldConflicts.some(c => c.severity === 'medium');

    if (hasHighSeverity) return this.conflictPriorities.HIGH;
    if (hasMediumSeverity) return this.conflictPriorities.MEDIUM;
    return this.conflictPriorities.LOW;
  }

  /**
   * Suggest automatic resolution strategy
   */
  suggestResolution(localRecord, remoteRecord, fieldConflicts) {
    // If only low-severity conflicts, suggest last modified wins
    const hasHighSeverity = fieldConflicts.some(c => c.severity === 'high');
    if (!hasHighSeverity) {
      const localModified = new Date(localRecord.updatedAt || localRecord.createdAt);
      const remoteModified = new Date(remoteRecord.updatedAt || remoteRecord.createdAt);
      
      return {
        strategy: this.resolutionStrategies.LAST_MODIFIED_WINS,
        winner: localModified > remoteModified ? 'local' : 'remote',
        confidence: 'medium'
      };
    }

    // Check if merge is possible
    const canMergeAll = fieldConflicts.every(c => c.canMerge);
    if (canMergeAll) {
      return {
        strategy: this.resolutionStrategies.MERGE,
        confidence: 'high'
      };
    }

    // High-severity conflicts require manual resolution
    return {
      strategy: this.resolutionStrategies.MANUAL,
      confidence: 'high'
    };
  }

  /**
   * Resolve conflicts automatically where possible
   * @param {Array} conflicts - Array of conflict objects
   * @returns {Object} Resolution results
   */
  async autoResolve(conflicts) {
    const results = {
      resolved: [],
      requiresManual: [],
      errors: [],
      statistics: {
        total: conflicts.length,
        autoResolved: 0,
        manualRequired: 0,
        errors: 0,
        strategies: {}
      }
    };

    console.log(`Starting automatic resolution for ${conflicts.length} conflicts`);
    this.notifyConflictListeners('autoResolutionStarted', { total: conflicts.length });

    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      
      try {
        // Notify progress
        this.notifyConflictListeners('autoResolutionProgress', {
          current: i + 1,
          total: conflicts.length,
          conflictId: conflict.id
        });

        const resolution = await this.attemptAutoResolution(conflict);
        
        if (resolution.success) {
          results.resolved.push({
            conflict: conflict,
            resolution: resolution
          });
          
          // Update conflict status
          conflict.status = 'resolved';
          conflict.resolvedAt = new Date().toISOString();
          conflict.resolution = resolution;
          
          // Update statistics
          results.statistics.autoResolved++;
          results.statistics.strategies[resolution.strategy] = 
            (results.statistics.strategies[resolution.strategy] || 0) + 1;
          
          // Log resolution with detailed information
          this.logConflictResolution(conflict, resolution);
          
          // Create notification for successful auto-resolution
          this.createResolutionNotification(conflict, resolution, 'auto');
          
        } else {
          results.requiresManual.push(conflict);
          results.statistics.manualRequired++;
          
          // Log why manual resolution is required
          this.logManualResolutionRequired(conflict, resolution.reason);
        }
        
      } catch (error) {
        console.error('Error auto-resolving conflict:', error);
        results.errors.push({
          conflict: conflict,
          error: error.message
        });
        results.statistics.errors++;
        
        // Log error
        this.logConflictError(conflict, error);
      }
    }

    // Save updated conflict history
    await this.saveConflictHistory();

    // Log overall results
    this.logAutoResolutionSummary(results);

    // Notify listeners
    this.notifyConflictListeners('autoResolutionCompleted', results);

    console.log(`Auto-resolution completed: ${results.statistics.autoResolved} resolved, ${results.statistics.manualRequired} require manual resolution, ${results.statistics.errors} errors`);

    return results;
  }

  /**
   * Attempt automatic resolution for a single conflict
   */
  async attemptAutoResolution(conflict) {
    const suggestion = conflict.suggestedResolution;

    // Check if conflict can be auto-resolved based on configuration
    if (!this.canAutoResolve(conflict)) {
      return { 
        success: false, 
        reason: 'auto_resolution_disabled',
        details: 'Automatic resolution is disabled for this conflict type'
      };
    }

    // Apply resolution strategy with enhanced logic
    switch (suggestion.strategy) {
      case this.resolutionStrategies.LAST_MODIFIED_WINS:
        return await this.resolveLastModifiedWins(conflict, suggestion.winner);
        
      case this.resolutionStrategies.MERGE:
        return await this.resolveMerge(conflict);
        
      case this.resolutionStrategies.MANUAL:
        return { 
          success: false, 
          reason: 'requires_manual_resolution',
          details: 'Conflict contains high-priority fields requiring manual review'
        };
        
      default:
        // Try additional automatic strategies
        return await this.tryAlternativeResolution(conflict);
    }
  }

  /**
   * Check if conflict can be automatically resolved
   */
  canAutoResolve(conflict) {
    // Check global auto-resolution setting
    const autoResolveEnabled = window.Config?.sync?.autoResolveConflicts !== false;
    if (!autoResolveEnabled) {
      return false;
    }

    // Check if conflict priority allows auto-resolution
    if (conflict.priority === this.conflictPriorities.HIGH) {
      const allowHighPriorityAuto = window.Config?.sync?.autoResolveHighPriority === true;
      if (!allowHighPriorityAuto) {
        return false;
      }
    }

    // Check if data type allows auto-resolution
    const dataTypeSettings = window.Config?.sync?.autoResolveByType || {};
    if (dataTypeSettings[conflict.dataType] === false) {
      return false;
    }

    return true;
  }

  /**
   * Try alternative resolution strategies
   */
  async tryAlternativeResolution(conflict) {
    // Strategy 1: Field-by-field resolution
    const fieldResolution = await this.tryFieldByFieldResolution(conflict);
    if (fieldResolution.success) {
      return fieldResolution;
    }

    // Strategy 2: Smart merge based on data patterns
    const smartMerge = await this.trySmartMerge(conflict);
    if (smartMerge.success) {
      return smartMerge;
    }

    // Strategy 3: Confidence-based resolution
    const confidenceResolution = await this.tryConfidenceBasedResolution(conflict);
    if (confidenceResolution.success) {
      return confidenceResolution;
    }

    return { 
      success: false, 
      reason: 'no_suitable_strategy',
      details: 'No automatic resolution strategy could be applied'
    };
  }

  /**
   * Try field-by-field resolution
   */
  async tryFieldByFieldResolution(conflict) {
    try {
      const resolvedFields = {};
      let canResolveAll = true;

      for (const fieldConflict of conflict.fieldConflicts) {
        const fieldResolution = await this.resolveFieldConflict(fieldConflict, conflict);
        
        if (fieldResolution.success) {
          resolvedFields[fieldConflict.field] = fieldResolution.value;
        } else {
          canResolveAll = false;
          break;
        }
      }

      if (canResolveAll) {
        // Create merged record with resolved fields
        const mergedRecord = { ...conflict.localRecord };
        Object.assign(mergedRecord, resolvedFields);
        mergedRecord.updatedAt = new Date().toISOString();
        mergedRecord.syncedAt = new Date().toISOString();

        // Create backups
        const localBackup = await this.createBackup(conflict, conflict.localRecord, 'field_by_field_local');
        const remoteBackup = await this.createBackup(conflict, conflict.remoteRecord, 'field_by_field_remote');

        // Apply resolution
        const appliedRecord = await this.applyResolution(conflict, mergedRecord);

        return {
          success: true,
          strategy: 'field_by_field',
          appliedRecord: appliedRecord,
          backups: [localBackup, remoteBackup],
          resolvedFields: resolvedFields,
          timestamp: new Date().toISOString()
        };
      }

      return { success: false, reason: 'cannot_resolve_all_fields' };

    } catch (error) {
      console.error('Error in field-by-field resolution:', error);
      return { success: false, reason: 'field_resolution_error', error: error.message };
    }
  }

  /**
   * Resolve individual field conflict
   */
  async resolveFieldConflict(fieldConflict, conflict) {
    const { field, localValue, remoteValue, severity, canMerge } = fieldConflict;

    // Strategy 1: Use merge if possible
    if (canMerge) {
      try {
        const mergedValue = await this.mergeFieldValues(field, localValue, remoteValue, conflict.dataType);
        return { success: true, value: mergedValue, method: 'merge' };
      } catch (error) {
        console.warn(`Failed to merge field ${field}:`, error);
      }
    }

    // Strategy 2: Use data quality heuristics
    const qualityResolution = this.resolveByDataQuality(field, localValue, remoteValue);
    if (qualityResolution.success) {
      return qualityResolution;
    }

    // Strategy 3: Use timestamp for low-severity fields
    if (severity === 'low') {
      const localModified = new Date(conflict.localRecord.updatedAt || conflict.localRecord.createdAt);
      const remoteModified = new Date(conflict.remoteRecord.updatedAt || conflict.remoteRecord.createdAt);
      
      return {
        success: true,
        value: localModified > remoteModified ? localValue : remoteValue,
        method: 'timestamp_low_severity'
      };
    }

    return { success: false, reason: 'no_resolution_method' };
  }

  /**
   * Resolve field conflict based on data quality
   */
  resolveByDataQuality(field, localValue, remoteValue) {
    // Prefer non-empty values
    if (!localValue && remoteValue) {
      return { success: true, value: remoteValue, method: 'prefer_non_empty' };
    }
    if (localValue && !remoteValue) {
      return { success: true, value: localValue, method: 'prefer_non_empty' };
    }

    // For string fields, prefer longer, more descriptive values
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      if (localValue.length > remoteValue.length * 1.5) {
        return { success: true, value: localValue, method: 'prefer_longer_string' };
      }
      if (remoteValue.length > localValue.length * 1.5) {
        return { success: true, value: remoteValue, method: 'prefer_longer_string' };
      }
    }

    // For email fields, prefer valid email format
    if (field === 'email') {
      const localValid = this.isValidEmail(localValue);
      const remoteValid = this.isValidEmail(remoteValue);
      
      if (localValid && !remoteValid) {
        return { success: true, value: localValue, method: 'prefer_valid_email' };
      }
      if (remoteValid && !localValid) {
        return { success: true, value: remoteValue, method: 'prefer_valid_email' };
      }
    }

    // For date fields, prefer more recent dates (within reason)
    if (field.includes('Date') || field.includes('Time')) {
      try {
        const localDate = new Date(localValue);
        const remoteDate = new Date(remoteValue);
        const now = new Date();
        
        // Prefer dates that are not in the far future
        const localFuture = localDate > now;
        const remoteFuture = remoteDate > now;
        
        if (!localFuture && remoteFuture) {
          return { success: true, value: localValue, method: 'prefer_reasonable_date' };
        }
        if (!remoteFuture && localFuture) {
          return { success: true, value: remoteValue, method: 'prefer_reasonable_date' };
        }
      } catch (error) {
        // Invalid dates, can't resolve by quality
      }
    }

    return { success: false, reason: 'no_quality_preference' };
  }

  /**
   * Try smart merge based on data patterns
   */
  async trySmartMerge(conflict) {
    try {
      // Analyze data patterns to determine merge strategy
      const patterns = this.analyzeDataPatterns(conflict);
      
      if (patterns.canSmartMerge) {
        const mergedRecord = await this.performSmartMerge(conflict, patterns);
        
        // Create backups
        const localBackup = await this.createBackup(conflict, conflict.localRecord, 'smart_merge_local');
        const remoteBackup = await this.createBackup(conflict, conflict.remoteRecord, 'smart_merge_remote');

        // Apply resolution
        const appliedRecord = await this.applyResolution(conflict, mergedRecord);

        return {
          success: true,
          strategy: 'smart_merge',
          appliedRecord: appliedRecord,
          backups: [localBackup, remoteBackup],
          patterns: patterns,
          timestamp: new Date().toISOString()
        };
      }

      return { success: false, reason: 'smart_merge_not_applicable' };

    } catch (error) {
      console.error('Error in smart merge:', error);
      return { success: false, reason: 'smart_merge_error', error: error.message };
    }
  }

  /**
   * Analyze data patterns for smart merge
   */
  analyzeDataPatterns(conflict) {
    const patterns = {
      canSmartMerge: false,
      complementaryFields: [],
      redundantFields: [],
      conflictingFields: []
    };

    for (const fieldConflict of conflict.fieldConflicts) {
      const { field, localValue, remoteValue } = fieldConflict;

      // Check if fields are complementary (one adds info the other lacks)
      if (this.areFieldsComplementary(field, localValue, remoteValue)) {
        patterns.complementaryFields.push(field);
      }
      // Check if fields are redundant (same info, different format)
      else if (this.areFieldsRedundant(field, localValue, remoteValue)) {
        patterns.redundantFields.push(field);
      }
      // Otherwise, they're truly conflicting
      else {
        patterns.conflictingFields.push(field);
      }
    }

    // Can smart merge if most conflicts are complementary or redundant
    const totalConflicts = conflict.fieldConflicts.length;
    const resolvableConflicts = patterns.complementaryFields.length + patterns.redundantFields.length;
    
    patterns.canSmartMerge = (resolvableConflicts / totalConflicts) >= 0.7; // 70% threshold

    return patterns;
  }

  /**
   * Check if field values are complementary
   */
  areFieldsComplementary(field, localValue, remoteValue) {
    // One value is empty/null, other has content
    if ((!localValue && remoteValue) || (localValue && !remoteValue)) {
      return true;
    }

    // For description fields, check if they contain different information
    if (field === 'description' && typeof localValue === 'string' && typeof remoteValue === 'string') {
      const localWords = new Set(localValue.toLowerCase().split(/\s+/));
      const remoteWords = new Set(remoteValue.toLowerCase().split(/\s+/));
      const intersection = new Set([...localWords].filter(x => remoteWords.has(x)));
      
      // If less than 50% overlap, they're complementary
      return intersection.size / Math.max(localWords.size, remoteWords.size) < 0.5;
    }

    return false;
  }

  /**
   * Check if field values are redundant (same info, different format)
   */
  areFieldsRedundant(field, localValue, remoteValue) {
    if (!localValue || !remoteValue) return false;

    // For string fields, check if they're essentially the same
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      const localNormalized = localValue.toLowerCase().trim().replace(/\s+/g, ' ');
      const remoteNormalized = remoteValue.toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Check for exact match after normalization
      if (localNormalized === remoteNormalized) {
        return true;
      }
      
      // Check for abbreviations or common variations
      if (this.areStringVariations(localNormalized, remoteNormalized)) {
        return true;
      }
    }

    // For date fields, check if they represent the same date/time
    if (field.includes('Date') || field.includes('Time')) {
      try {
        const localDate = new Date(localValue);
        const remoteDate = new Date(remoteValue);
        return Math.abs(localDate.getTime() - remoteDate.getTime()) < 60000; // Within 1 minute
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  /**
   * Check if strings are variations of each other
   */
  areStringVariations(str1, str2) {
    // Common abbreviations
    const abbreviations = {
      'teaching': ['teach', 'education', 'edu'],
      'kitchen': ['food', 'cooking', 'culinary'],
      'maintenance': ['maint', 'facilities', 'facility']
    };

    for (const [full, abbrevs] of Object.entries(abbreviations)) {
      if ((str1.includes(full) && abbrevs.some(abbrev => str2.includes(abbrev))) ||
          (str2.includes(full) && abbrevs.some(abbrev => str1.includes(abbrev)))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Perform smart merge based on patterns
   */
  async performSmartMerge(conflict, patterns) {
    const merged = { ...conflict.localRecord };

    // Handle complementary fields
    for (const field of patterns.complementaryFields) {
      const fieldConflict = conflict.fieldConflicts.find(c => c.field === field);
      if (fieldConflict) {
        // Combine or choose the non-empty value
        if (!fieldConflict.localValue && fieldConflict.remoteValue) {
          merged[field] = fieldConflict.remoteValue;
        } else if (fieldConflict.localValue && !fieldConflict.remoteValue) {
          merged[field] = fieldConflict.localValue;
        } else if (field === 'description') {
          // Combine descriptions
          merged[field] = this.mergeDescriptions(fieldConflict.localValue, fieldConflict.remoteValue);
        }
      }
    }

    // Handle redundant fields (prefer local version by default)
    for (const field of patterns.redundantFields) {
      const fieldConflict = conflict.fieldConflicts.find(c => c.field === field);
      if (fieldConflict) {
        // Choose the better formatted version
        merged[field] = this.chooseBetterFormat(field, fieldConflict.localValue, fieldConflict.remoteValue);
      }
    }

    // For truly conflicting fields, use timestamp-based resolution
    for (const field of patterns.conflictingFields) {
      const fieldConflict = conflict.fieldConflicts.find(c => c.field === field);
      if (fieldConflict && fieldConflict.severity !== 'high') {
        const localModified = new Date(conflict.localRecord.updatedAt || conflict.localRecord.createdAt);
        const remoteModified = new Date(conflict.remoteRecord.updatedAt || conflict.remoteRecord.createdAt);
        
        merged[field] = localModified > remoteModified ? fieldConflict.localValue : fieldConflict.remoteValue;
      }
    }

    // Update metadata
    merged.updatedAt = new Date().toISOString();
    merged.syncedAt = new Date().toISOString();

    return merged;
  }

  /**
   * Choose better formatted version of field value
   */
  chooseBetterFormat(field, localValue, remoteValue) {
    // For email, prefer properly formatted one
    if (field === 'email') {
      if (this.isValidEmail(localValue) && !this.isValidEmail(remoteValue)) {
        return localValue;
      }
      if (this.isValidEmail(remoteValue) && !this.isValidEmail(localValue)) {
        return remoteValue;
      }
    }

    // For names, prefer proper case
    if (field === 'name' || field === 'volunteerName') {
      if (this.isProperCase(localValue) && !this.isProperCase(remoteValue)) {
        return localValue;
      }
      if (this.isProperCase(remoteValue) && !this.isProperCase(localValue)) {
        return remoteValue;
      }
    }

    // Default to local value
    return localValue;
  }

  /**
   * Try confidence-based resolution
   */
  async tryConfidenceBasedResolution(conflict) {
    try {
      const localConfidence = this.calculateRecordConfidence(conflict.localRecord, conflict.dataType);
      const remoteConfidence = this.calculateRecordConfidence(conflict.remoteRecord, conflict.dataType);

      // Only use confidence-based resolution if there's a significant difference
      const confidenceDiff = Math.abs(localConfidence - remoteConfidence);
      if (confidenceDiff < 0.2) { // 20% threshold
        return { success: false, reason: 'insufficient_confidence_difference' };
      }

      const winnerRecord = localConfidence > remoteConfidence ? conflict.localRecord : conflict.remoteRecord;
      const loserRecord = localConfidence > remoteConfidence ? conflict.remoteRecord : conflict.localRecord;
      const winner = localConfidence > remoteConfidence ? 'local' : 'remote';

      // Create backup
      const backup = await this.createBackup(conflict, loserRecord, `confidence_based_${winner}`);

      // Apply resolution
      const appliedRecord = await this.applyResolution(conflict, winnerRecord);

      return {
        success: true,
        strategy: 'confidence_based',
        winner: winner,
        localConfidence: localConfidence,
        remoteConfidence: remoteConfidence,
        appliedRecord: appliedRecord,
        backup: backup,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error in confidence-based resolution:', error);
      return { success: false, reason: 'confidence_calculation_error', error: error.message };
    }
  }

  /**
   * Calculate confidence score for a record
   */
  calculateRecordConfidence(record, dataType) {
    let confidence = 0;
    let maxScore = 0;

    const fieldsToCheck = this.getFieldsToCheck(dataType);

    for (const field of fieldsToCheck) {
      const value = record[field];
      const fieldWeight = this.getFieldWeight(field, dataType);
      maxScore += fieldWeight;

      if (value != null && value !== '') {
        let fieldScore = fieldWeight * 0.5; // Base score for having a value

        // Additional scoring based on value quality
        if (typeof value === 'string') {
          // Longer, more descriptive values get higher scores
          if (value.length > 10) fieldScore += fieldWeight * 0.2;
          if (value.length > 50) fieldScore += fieldWeight * 0.1;
          
          // Proper formatting gets bonus points
          if (field === 'email' && this.isValidEmail(value)) {
            fieldScore += fieldWeight * 0.2;
          }
          if ((field === 'name' || field === 'volunteerName') && this.isProperCase(value)) {
            fieldScore += fieldWeight * 0.1;
          }
        }

        confidence += fieldScore;
      }
    }

    return maxScore > 0 ? confidence / maxScore : 0;
  }

  /**
   * Get weight for field in confidence calculation
   */
  getFieldWeight(field, dataType) {
    const weights = {
      volunteers: {
        name: 1.0,
        email: 0.9,
        committee: 0.7,
        updatedAt: 0.3
      },
      events: {
        name: 1.0,
        date: 0.9,
        startTime: 0.8,
        endTime: 0.8,
        status: 0.6,
        description: 0.5,
        updatedAt: 0.3
      },
      attendance: {
        volunteerId: 1.0,
        eventId: 1.0,
        volunteerName: 0.8,
        date: 0.9,
        dateTime: 0.9,
        committee: 0.5,
        updatedAt: 0.3
      }
    };

    return weights[dataType]?.[field] || 0.5;
  }

  /**
   * Utility methods for data validation
   */
  isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isProperCase(str) {
    if (typeof str !== 'string') return false;
    return str === str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Resolve conflict using "last modified wins" strategy
   */
  async resolveLastModifiedWins(conflict, winner) {
    try {
      const winningRecord = winner === 'local' ? conflict.localRecord : conflict.remoteRecord;
      const losingRecord = winner === 'local' ? conflict.remoteRecord : conflict.localRecord;

      // Create backup of losing record
      const backup = await this.createBackup(conflict, losingRecord, `last_modified_wins_${winner}`);

      // Apply winning record
      const appliedRecord = await this.applyResolution(conflict, winningRecord);

      return {
        success: true,
        strategy: this.resolutionStrategies.LAST_MODIFIED_WINS,
        winner: winner,
        appliedRecord: appliedRecord,
        backup: backup,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error resolving last modified wins:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve conflict using merge strategy
   */
  async resolveMerge(conflict) {
    try {
      const mergedRecord = await this.mergeRecords(conflict.localRecord, conflict.remoteRecord, conflict.fieldConflicts);
      
      // Create backups of both original records
      const localBackup = await this.createBackup(conflict, conflict.localRecord, 'merge_local');
      const remoteBackup = await this.createBackup(conflict, conflict.remoteRecord, 'merge_remote');

      // Apply merged record
      const appliedRecord = await this.applyResolution(conflict, mergedRecord);

      return {
        success: true,
        strategy: this.resolutionStrategies.MERGE,
        appliedRecord: appliedRecord,
        backups: [localBackup, remoteBackup],
        mergeDetails: this.getMergeDetails(conflict.fieldConflicts),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error resolving merge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Merge two records based on field conflicts
   */
  async mergeRecords(localRecord, remoteRecord, fieldConflicts) {
    const merged = { ...localRecord };

    for (const fieldConflict of fieldConflicts) {
      if (fieldConflict.canMerge) {
        merged[fieldConflict.field] = await this.mergeFieldValues(
          fieldConflict.field,
          fieldConflict.localValue,
          fieldConflict.remoteValue,
          localRecord.dataType || 'unknown'
        );
      } else {
        // For non-mergeable fields, prefer the more recent value
        const localModified = new Date(localRecord.updatedAt || localRecord.createdAt);
        const remoteModified = new Date(remoteRecord.updatedAt || remoteRecord.createdAt);
        
        merged[fieldConflict.field] = localModified > remoteModified ? 
          fieldConflict.localValue : fieldConflict.remoteValue;
      }
    }

    // Update metadata
    merged.updatedAt = new Date().toISOString();
    merged.syncedAt = new Date().toISOString();

    return merged;
  }

  /**
   * Merge values for a specific field
   */
  async mergeFieldValues(field, localValue, remoteValue, dataType) {
    switch (field) {
      case 'description':
        return this.mergeDescriptions(localValue, remoteValue);
        
      case 'committee':
        return this.mergeCommittees(localValue, remoteValue);
        
      default:
        // Default to more recent value based on string length or alphabetical order
        if (typeof localValue === 'string' && typeof remoteValue === 'string') {
          return localValue.length > remoteValue.length ? localValue : remoteValue;
        }
        return localValue;
    }
  }

  /**
   * Merge description fields
   */
  mergeDescriptions(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    
    // Simple merge: combine unique sentences
    const localSentences = local.split('.').map(s => s.trim()).filter(s => s);
    const remoteSentences = remote.split('.').map(s => s.trim()).filter(s => s);
    
    const uniqueSentences = [...new Set([...localSentences, ...remoteSentences])];
    return uniqueSentences.join('. ') + (uniqueSentences.length > 0 ? '.' : '');
  }

  /**
   * Merge committee fields
   */
  mergeCommittees(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    
    // If committees are related, prefer the more specific one
    const relatedGroups = [
      ['Teaching', 'Education'],
      ['Kitchen', 'Food Service'],
      ['Maintenance', 'Facilities']
    ];
    
    for (const group of relatedGroups) {
      if (group.includes(local) && group.includes(remote)) {
        // Prefer the first (more general) term
        return group[0];
      }
    }
    
    // Default to local value
    return local;
  }

  /**
   * Get merge details for logging
   */
  getMergeDetails(fieldConflicts) {
    return fieldConflicts.map(conflict => ({
      field: conflict.field,
      strategy: conflict.canMerge ? 'merged' : 'last_modified_wins',
      severity: conflict.severity
    }));
  }

  /**
   * Present conflicts to user for manual resolution
   * @param {Array} conflicts - Array of conflicts requiring manual resolution
   */
  async presentConflicts(conflicts) {
    if (conflicts.length === 0) {
      return { success: true, resolved: [] };
    }

    console.log(`Presenting ${conflicts.length} conflicts for manual resolution`);

    // Show conflict resolution UI
    const resolutionPromises = conflicts.map(conflict => this.showConflictResolutionModal(conflict));
    
    try {
      const resolutions = await Promise.all(resolutionPromises);
      
      // Process manual resolutions
      const results = {
        resolved: [],
        cancelled: [],
        errors: []
      };

      for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        const resolution = resolutions[i];

        if (resolution.cancelled) {
          results.cancelled.push(conflict);
        } else {
          try {
            const appliedResolution = await this.applyManualResolution(conflict, resolution);
            results.resolved.push({
              conflict: conflict,
              resolution: appliedResolution
            });
          } catch (error) {
            console.error('Error applying manual resolution:', error);
            results.errors.push({
              conflict: conflict,
              error: error.message
            });
          }
        }
      }

      // Save updated conflict history
      await this.saveConflictHistory();

      // Notify listeners
      this.notifyConflictListeners('manualResolutionCompleted', results);

      return results;

    } catch (error) {
      console.error('Error in manual conflict resolution:', error);
      throw error;
    }
  }

  /**
   * Show conflict resolution modal for a single conflict
   */
  async showConflictResolutionModal(conflict) {
    return new Promise((resolve) => {
      // Create and show modal
      const modal = this.createConflictModal(conflict, resolve);
      document.body.appendChild(modal);
      
      // Show modal
      modal.style.display = 'block';
      modal.classList.add('show');
      
      // Focus on first button
      const firstButton = modal.querySelector('button');
      if (firstButton) {
        firstButton.focus();
      }
    });
  }

  /**
   * Create enhanced conflict resolution modal
   */
  createConflictModal(conflict, resolveCallback) {
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    modal.innerHTML = `
      <div class="conflict-modal-content">
        <div class="conflict-modal-header">
          <div class="conflict-header-main">
            <h3>Resolve Data Conflict</h3>
            <span class="conflict-priority priority-${conflict.priority === 3 ? 'high' : conflict.priority === 2 ? 'medium' : 'low'}">
              ${conflict.priority === 3 ? 'High' : conflict.priority === 2 ? 'Medium' : 'Low'} Priority
            </span>
          </div>
          <div class="conflict-header-details">
            <span class="conflict-detail">
              <i class="fas fa-database"></i>
              ${conflict.dataType.charAt(0).toUpperCase() + conflict.dataType.slice(1)}
            </span>
            <span class="conflict-detail">
              <i class="fas fa-tag"></i>
              ${conflict.recordId}
            </span>
            <span class="conflict-detail">
              <i class="fas fa-clock"></i>
              ${new Date(conflict.detectedAt).toLocaleString()}
            </span>
          </div>
        </div>
        
        <div class="conflict-modal-body">
          ${this.renderConflictSummary(conflict)}
          
          <div class="conflict-tabs">
            <div class="conflict-tab-buttons">
              <button class="conflict-tab-btn active" data-tab="comparison">
                <i class="fas fa-columns"></i>
                Side-by-Side
              </button>
              <button class="conflict-tab-btn" data-tab="field-by-field">
                <i class="fas fa-list"></i>
                Field-by-Field
              </button>
              <button class="conflict-tab-btn" data-tab="merge-preview">
                <i class="fas fa-code-branch"></i>
                Merge Preview
              </button>
            </div>
            
            <div class="conflict-tab-content">
              <div class="conflict-tab-pane active" data-tab="comparison">
                ${this.renderSideBySideComparison(conflict)}
              </div>
              
              <div class="conflict-tab-pane" data-tab="field-by-field">
                ${this.renderFieldByFieldComparison(conflict)}
              </div>
              
              <div class="conflict-tab-pane" data-tab="merge-preview">
                ${this.renderMergePreview(conflict)}
              </div>
            </div>
          </div>
          
          <div class="conflict-resolution-options">
            <h4>Resolution Options</h4>
            <div class="resolution-option-grid">
              <div class="resolution-option" data-action="keep-local">
                <div class="resolution-option-header">
                  <i class="fas fa-laptop"></i>
                  <span>Keep Local Version</span>
                </div>
                <p class="resolution-option-description">
                  Use the version from your local device. The remote version will be overwritten.
                </p>
                <div class="resolution-option-impact">
                  <strong>Impact:</strong> ${this.getResolutionImpact(conflict, 'local')}
                </div>
              </div>
              
              <div class="resolution-option" data-action="keep-remote">
                <div class="resolution-option-header">
                  <i class="fas fa-cloud"></i>
                  <span>Keep Remote Version</span>
                </div>
                <p class="resolution-option-description">
                  Use the version from Google Sheets. Your local changes will be overwritten.
                </p>
                <div class="resolution-option-impact">
                  <strong>Impact:</strong> ${this.getResolutionImpact(conflict, 'remote')}
                </div>
              </div>
              
              ${this.canMergeConflict(conflict) ? `
                <div class="resolution-option" data-action="merge">
                  <div class="resolution-option-header">
                    <i class="fas fa-code-branch"></i>
                    <span>Merge Both Versions</span>
                  </div>
                  <p class="resolution-option-description">
                    Combine information from both versions where possible.
                  </p>
                  <div class="resolution-option-impact">
                    <strong>Impact:</strong> ${this.getResolutionImpact(conflict, 'merge')}
                  </div>
                </div>
              ` : ''}
              
              <div class="resolution-option advanced-option" data-action="custom">
                <div class="resolution-option-header">
                  <i class="fas fa-cog"></i>
                  <span>Custom Resolution</span>
                </div>
                <p class="resolution-option-description">
                  Choose specific values for each conflicting field.
                </p>
                <div class="resolution-option-impact">
                  <strong>Impact:</strong> Full control over final result
                </div>
              </div>
            </div>
          </div>
          
          <div class="conflict-actions">
            <div class="conflict-actions-main">
              <button class="btn btn-primary" data-action="keep-local">
                <i class="fas fa-laptop"></i>
                Keep Local
              </button>
              <button class="btn btn-secondary" data-action="keep-remote">
                <i class="fas fa-cloud"></i>
                Keep Remote
              </button>
              ${this.canMergeConflict(conflict) ? `
                <button class="btn btn-success" data-action="merge">
                  <i class="fas fa-code-branch"></i>
                  Auto Merge
                </button>
              ` : ''}
            </div>
            <div class="conflict-actions-secondary">
              <button class="btn btn-outline" data-action="custom">
                <i class="fas fa-cog"></i>
                Custom...
              </button>
              <button class="btn btn-outline" data-action="cancel">
                <i class="fas fa-times"></i>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Set up event listeners
    this.setupModalEventListeners(modal, conflict, resolveCallback);

    return modal;
  }

  /**
   * Render conflict summary
   */
  renderConflictSummary(conflict) {
    const highSeverityFields = conflict.fieldConflicts.filter(c => c.severity === 'high').length;
    const mediumSeverityFields = conflict.fieldConflicts.filter(c => c.severity === 'medium').length;
    const lowSeverityFields = conflict.fieldConflicts.filter(c => c.severity === 'low').length;
    const mergeableFields = conflict.fieldConflicts.filter(c => c.canMerge).length;

    return `
      <div class="conflict-summary">
        <div class="conflict-summary-stats">
          <div class="conflict-stat">
            <span class="conflict-stat-number">${conflict.fieldConflicts.length}</span>
            <span class="conflict-stat-label">Conflicting Fields</span>
          </div>
          ${highSeverityFields > 0 ? `
            <div class="conflict-stat severity-high">
              <span class="conflict-stat-number">${highSeverityFields}</span>
              <span class="conflict-stat-label">High Priority</span>
            </div>
          ` : ''}
          ${mediumSeverityFields > 0 ? `
            <div class="conflict-stat severity-medium">
              <span class="conflict-stat-number">${mediumSeverityFields}</span>
              <span class="conflict-stat-label">Medium Priority</span>
            </div>
          ` : ''}
          ${lowSeverityFields > 0 ? `
            <div class="conflict-stat severity-low">
              <span class="conflict-stat-number">${lowSeverityFields}</span>
              <span class="conflict-stat-label">Low Priority</span>
            </div>
          ` : ''}
          ${mergeableFields > 0 ? `
            <div class="conflict-stat mergeable">
              <span class="conflict-stat-number">${mergeableFields}</span>
              <span class="conflict-stat-label">Auto-Mergeable</span>
            </div>
          ` : ''}
        </div>
        
        <div class="conflict-suggestion">
          <div class="conflict-suggestion-header">
            <i class="fas fa-lightbulb"></i>
            <span>Suggested Resolution</span>
          </div>
          <div class="conflict-suggestion-content">
            ${this.renderSuggestionContent(conflict.suggestedResolution)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render suggestion content
   */
  renderSuggestionContent(suggestion) {
    switch (suggestion.strategy) {
      case this.resolutionStrategies.LAST_MODIFIED_WINS:
        return `
          <p>Use the <strong>${suggestion.winner}</strong> version as it was modified more recently.</p>
          <div class="suggestion-confidence confidence-${suggestion.confidence}">
            Confidence: ${suggestion.confidence}
          </div>
        `;
        
      case this.resolutionStrategies.MERGE:
        return `
          <p>Merge both versions as the conflicts can be automatically resolved.</p>
          <div class="suggestion-confidence confidence-${suggestion.confidence}">
            Confidence: ${suggestion.confidence}
          </div>
        `;
        
      case this.resolutionStrategies.MANUAL:
        return `
          <p>Manual review required due to high-priority field conflicts.</p>
          <div class="suggestion-confidence confidence-${suggestion.confidence}">
            Confidence: ${suggestion.confidence}
          </div>
        `;
        
      default:
        return `<p>No automatic suggestion available.</p>`;
    }
  }

  /**
   * Render side-by-side comparison
   */
  renderSideBySideComparison(conflict) {
    return `
      <div class="conflict-comparison">
        <div class="conflict-side local-side">
          <h4>
            <i class="fas fa-laptop"></i>
            Local Version
          </h4>
          <div class="conflict-data">
            ${this.renderConflictData(conflict.localRecord, conflict.fieldConflicts, 'local')}
          </div>
          <p class="conflict-timestamp">
            <i class="fas fa-clock"></i>
            Modified: ${new Date(conflict.localRecord.updatedAt || conflict.localRecord.createdAt).toLocaleString()}
          </p>
        </div>
        
        <div class="conflict-side remote-side">
          <h4>
            <i class="fas fa-cloud"></i>
            Remote Version (Google Sheets)
          </h4>
          <div class="conflict-data">
            ${this.renderConflictData(conflict.remoteRecord, conflict.fieldConflicts, 'remote')}
          </div>
          <p class="conflict-timestamp">
            <i class="fas fa-clock"></i>
            Modified: ${new Date(conflict.remoteRecord.updatedAt || conflict.remoteRecord.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render field-by-field comparison
   */
  renderFieldByFieldComparison(conflict) {
    const html = conflict.fieldConflicts.map(fieldConflict => `
      <div class="field-conflict-item severity-${fieldConflict.severity}">
        <div class="field-conflict-header">
          <h5>${this.getFieldDisplayName(fieldConflict.field)}</h5>
          <div class="field-conflict-badges">
            <span class="severity-badge severity-${fieldConflict.severity}">
              ${fieldConflict.severity.toUpperCase()}
            </span>
            ${fieldConflict.canMerge ? '<span class="mergeable-badge">MERGEABLE</span>' : ''}
          </div>
        </div>
        
        <div class="field-conflict-comparison">
          <div class="field-value-container local-value">
            <div class="field-value-label">Local</div>
            <div class="field-value-content">
              ${this.formatFieldValue(fieldConflict.field, fieldConflict.localValue)}
            </div>
          </div>
          
          <div class="field-conflict-arrow">
            <i class="fas fa-exchange-alt"></i>
          </div>
          
          <div class="field-value-container remote-value">
            <div class="field-value-label">Remote</div>
            <div class="field-value-content">
              ${this.formatFieldValue(fieldConflict.field, fieldConflict.remoteValue)}
            </div>
          </div>
        </div>
        
        ${fieldConflict.canMerge ? `
          <div class="field-merge-preview">
            <div class="field-value-label">Merged Result</div>
            <div class="field-value-content merged-value">
              ${this.formatFieldValue(fieldConflict.field, this.previewMergedValue(fieldConflict, conflict.dataType))}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');

    return `
      <div class="field-by-field-comparison">
        ${html}
      </div>
    `;
  }

  /**
   * Preview merged value for a field
   */
  previewMergedValue(fieldConflict, dataType) {
    try {
      // This is a synchronous preview - use simple merge logic
      if (fieldConflict.field === 'description') {
        return this.mergeDescriptions(fieldConflict.localValue, fieldConflict.remoteValue);
      }
      
      if (fieldConflict.field === 'committee') {
        return this.mergeCommittees(fieldConflict.localValue, fieldConflict.remoteValue);
      }
      
      // Default to longer value
      if (typeof fieldConflict.localValue === 'string' && typeof fieldConflict.remoteValue === 'string') {
        return fieldConflict.localValue.length > fieldConflict.remoteValue.length ? 
          fieldConflict.localValue : fieldConflict.remoteValue;
      }
      
      return fieldConflict.localValue;
    } catch (error) {
      return fieldConflict.localValue;
    }
  }

  /**
   * Render merge preview
   */
  renderMergePreview(conflict) {
    if (!this.canMergeConflict(conflict)) {
      return `
        <div class="merge-preview-unavailable">
          <div class="merge-preview-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Automatic Merge Not Available</h4>
            <p>This conflict contains fields that cannot be automatically merged. Please choose a manual resolution option.</p>
          </div>
        </div>
      `;
    }

    // Create a preview of the merged record
    const mergedPreview = this.createMergePreview(conflict);

    return `
      <div class="merge-preview">
        <div class="merge-preview-header">
          <h4>
            <i class="fas fa-code-branch"></i>
            Merged Result Preview
          </h4>
          <p>This shows how the record will look after automatic merging:</p>
        </div>
        
        <div class="merge-preview-content">
          ${this.renderMergedRecord(mergedPreview, conflict.fieldConflicts)}
        </div>
        
        <div class="merge-preview-details">
          <h5>Merge Strategy Details</h5>
          <ul class="merge-strategy-list">
            ${conflict.fieldConflicts.map(fc => `
              <li class="merge-strategy-item">
                <strong>${this.getFieldDisplayName(fc.field)}:</strong>
                ${fc.canMerge ? 
                  '<span class="merge-action merge">Will be merged</span>' : 
                  '<span class="merge-action timestamp">Will use most recent value</span>'
                }
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Create merge preview
   */
  createMergePreview(conflict) {
    const merged = { ...conflict.localRecord };

    for (const fieldConflict of conflict.fieldConflicts) {
      if (fieldConflict.canMerge) {
        merged[fieldConflict.field] = this.previewMergedValue(fieldConflict, conflict.dataType);
      } else {
        // Use timestamp-based resolution for preview
        const localModified = new Date(conflict.localRecord.updatedAt || conflict.localRecord.createdAt);
        const remoteModified = new Date(conflict.remoteRecord.updatedAt || conflict.remoteRecord.createdAt);
        
        merged[fieldConflict.field] = localModified > remoteModified ? 
          fieldConflict.localValue : fieldConflict.remoteValue;
      }
    }

    merged.updatedAt = new Date().toISOString();
    return merged;
  }

  /**
   * Render merged record
   */
  renderMergedRecord(mergedRecord, fieldConflicts) {
    const conflictFields = fieldConflicts.map(c => c.field);
    const fieldsToShow = this.getFieldsToCheck(mergedRecord.dataType || 'unknown');
    
    const html = fieldsToShow.map(field => {
      const isConflicted = conflictFields.includes(field);
      const value = mergedRecord[field] || '';
      const displayValue = this.formatFieldValue(field, value);
      
      return `
        <div class="merged-field-row ${isConflicted ? 'was-conflicted' : ''}">
          <span class="field-label">${this.getFieldDisplayName(field)}:</span>
          <span class="field-value">${displayValue}</span>
          ${isConflicted ? '<span class="merge-indicator"><i class="fas fa-code-branch"></i></span>' : ''}
        </div>
      `;
    }).join('');

    return `<div class="merged-record-data">${html}</div>`;
  }

  /**
   * Get resolution impact description
   */
  getResolutionImpact(conflict, strategy) {
    const fieldCount = conflict.fieldConflicts.length;
    
    switch (strategy) {
      case 'local':
        return `${fieldCount} field${fieldCount > 1 ? 's' : ''} will be updated in Google Sheets`;
        
      case 'remote':
        return `${fieldCount} field${fieldCount > 1 ? 's' : ''} will be updated locally`;
        
      case 'merge':
        const mergeableCount = conflict.fieldConflicts.filter(c => c.canMerge).length;
        return `${mergeableCount} field${mergeableCount > 1 ? 's' : ''} will be merged, others resolved by timestamp`;
        
      default:
        return 'Custom resolution will be applied';
    }
  }

  /**
   * Set up modal event listeners
   */
  setupModalEventListeners(modal, conflict, resolveCallback) {
    // Tab switching
    modal.querySelectorAll('.conflict-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        this.switchConflictTab(modal, tabName);
      });
    });

    // Resolution option selection
    modal.querySelectorAll('.resolution-option').forEach(option => {
      option.addEventListener('click', (e) => {
        // Remove active class from all options
        modal.querySelectorAll('.resolution-option').forEach(opt => opt.classList.remove('active'));
        // Add active class to clicked option
        option.classList.add('active');
        
        const action = option.getAttribute('data-action');
        this.updateActionButtons(modal, action);
      });
    });

    // Main action buttons
    modal.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        
        if (action === 'custom') {
          this.showCustomResolutionDialog(conflict, resolveCallback, modal);
        } else {
          this.handleModalAction(action, conflict, resolveCallback, modal);
        }
      });
    });

    // Click outside modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.handleModalAction('cancel', conflict, resolveCallback, modal);
      }
    });

    // Keyboard support
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleModalAction('cancel', conflict, resolveCallback, modal);
      }
      
      // Tab navigation
      if (e.key === 'Tab' && e.ctrlKey) {
        e.preventDefault();
        const tabs = modal.querySelectorAll('.conflict-tab-btn');
        const activeTab = modal.querySelector('.conflict-tab-btn.active');
        const currentIndex = Array.from(tabs).indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        
        this.switchConflictTab(modal, tabs[nextIndex].getAttribute('data-tab'));
      }
    });
  }

  /**
   * Switch conflict resolution tab
   */
  switchConflictTab(modal, tabName) {
    // Update tab buttons
    modal.querySelectorAll('.conflict-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Update tab content
    modal.querySelectorAll('.conflict-tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.getAttribute('data-tab') === tabName);
    });
  }

  /**
   * Update action buttons based on selected resolution
   */
  updateActionButtons(modal, selectedAction) {
    modal.querySelectorAll('.conflict-actions .btn').forEach(btn => {
      const btnAction = btn.getAttribute('data-action');
      btn.classList.toggle('btn-primary', btnAction === selectedAction);
      btn.classList.toggle('btn-secondary', btnAction !== selectedAction && btnAction !== 'cancel');
    });
  }

  /**
   * Show custom resolution dialog
   */
  async showCustomResolutionDialog(conflict, resolveCallback, parentModal) {
    // Hide parent modal temporarily
    parentModal.style.display = 'none';

    const customModal = this.createCustomResolutionModal(conflict, (customResolution) => {
      // Remove custom modal
      customModal.remove();
      
      if (customResolution.cancelled) {
        // Show parent modal again
        parentModal.style.display = 'flex';
      } else {
        // Remove parent modal and resolve
        parentModal.remove();
        resolveCallback(customResolution);
      }
    });

    document.body.appendChild(customModal);
    customModal.style.display = 'flex';
    customModal.classList.add('show');
  }

  /**
   * Create custom resolution modal
   */
  createCustomResolutionModal(conflict, resolveCallback) {
    const modal = document.createElement('div');
    modal.className = 'conflict-modal custom-resolution-modal';
    
    const fieldChoices = conflict.fieldConflicts.map(fieldConflict => `
      <div class="custom-field-choice" data-field="${fieldConflict.field}">
        <div class="custom-field-header">
          <h5>${this.getFieldDisplayName(fieldConflict.field)}</h5>
          <span class="severity-badge severity-${fieldConflict.severity}">
            ${fieldConflict.severity.toUpperCase()}
          </span>
        </div>
        
        <div class="custom-field-options">
          <label class="custom-option">
            <input type="radio" name="field_${fieldConflict.field}" value="local" checked>
            <div class="custom-option-content">
              <div class="custom-option-label">Local</div>
              <div class="custom-option-value">
                ${this.formatFieldValue(fieldConflict.field, fieldConflict.localValue)}
              </div>
            </div>
          </label>
          
          <label class="custom-option">
            <input type="radio" name="field_${fieldConflict.field}" value="remote">
            <div class="custom-option-content">
              <div class="custom-option-label">Remote</div>
              <div class="custom-option-value">
                ${this.formatFieldValue(fieldConflict.field, fieldConflict.remoteValue)}
              </div>
            </div>
          </label>
          
          ${fieldConflict.canMerge ? `
            <label class="custom-option">
              <input type="radio" name="field_${fieldConflict.field}" value="merge">
              <div class="custom-option-content">
                <div class="custom-option-label">Merge</div>
                <div class="custom-option-value">
                  ${this.formatFieldValue(fieldConflict.field, this.previewMergedValue(fieldConflict, conflict.dataType))}
                </div>
              </div>
            </label>
          ` : ''}
          
          <label class="custom-option custom-input-option">
            <input type="radio" name="field_${fieldConflict.field}" value="custom">
            <div class="custom-option-content">
              <div class="custom-option-label">Custom</div>
              <input type="text" class="custom-value-input" 
                     placeholder="Enter custom value..." 
                     value="${fieldConflict.localValue || ''}"
                     disabled>
            </div>
          </label>
        </div>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="conflict-modal-content">
        <div class="conflict-modal-header">
          <h3>Custom Resolution</h3>
          <p>Choose the value to use for each conflicting field:</p>
        </div>
        
        <div class="conflict-modal-body">
          <div class="custom-resolution-fields">
            ${fieldChoices}
          </div>
          
          <div class="conflict-actions">
            <button class="btn btn-primary" data-action="apply-custom">
              Apply Custom Resolution
            </button>
            <button class="btn btn-outline" data-action="cancel">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    // Set up event listeners for custom modal
    this.setupCustomModalEventListeners(modal, conflict, resolveCallback);

    return modal;
  }

  /**
   * Set up custom modal event listeners
   */
  setupCustomModalEventListeners(modal, conflict, resolveCallback) {
    // Handle radio button changes
    modal.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const customInput = e.target.closest('.custom-field-choice').querySelector('.custom-value-input');
        customInput.disabled = e.target.value !== 'custom';
        
        if (e.target.value === 'custom') {
          customInput.focus();
        }
      });
    });

    // Handle custom input focus
    modal.querySelectorAll('.custom-value-input').forEach(input => {
      input.addEventListener('focus', () => {
        const radio = input.closest('.custom-input-option').querySelector('input[type="radio"]');
        radio.checked = true;
      });
    });

    // Handle action buttons
    modal.querySelector('[data-action="apply-custom"]').addEventListener('click', () => {
      const customResolution = this.collectCustomResolution(modal, conflict);
      resolveCallback(customResolution);
    });

    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      resolveCallback({ cancelled: true });
    });

    // Keyboard support
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        resolveCallback({ cancelled: true });
      }
    });
  }

  /**
   * Collect custom resolution choices
   */
  collectCustomResolution(modal, conflict) {
    const fieldResolutions = {};

    conflict.fieldConflicts.forEach(fieldConflict => {
      const fieldName = fieldConflict.field;
      const selectedRadio = modal.querySelector(`input[name="field_${fieldName}"]:checked`);
      
      if (selectedRadio) {
        const choice = selectedRadio.value;
        
        switch (choice) {
          case 'local':
            fieldResolutions[fieldName] = fieldConflict.localValue;
            break;
          case 'remote':
            fieldResolutions[fieldName] = fieldConflict.remoteValue;
            break;
          case 'merge':
            fieldResolutions[fieldName] = this.previewMergedValue(fieldConflict, conflict.dataType);
            break;
          case 'custom':
            const customInput = selectedRadio.closest('.custom-input-option').querySelector('.custom-value-input');
            fieldResolutions[fieldName] = customInput.value;
            break;
        }
      }
    });

    return {
      strategy: 'custom',
      fieldResolutions: fieldResolutions
    };
  }

  /**
   * Render conflict data for comparison
   */
  renderConflictData(record, fieldConflicts, side) {
    const conflictFields = fieldConflicts.map(c => c.field);
    const html = [];

    // Show all relevant fields, highlighting conflicts
    const fieldsToShow = this.getFieldsToCheck(record.dataType || 'unknown');
    
    for (const field of fieldsToShow) {
      const isConflicted = conflictFields.includes(field);
      const value = record[field] || '';
      const displayValue = this.formatFieldValue(field, value);
      
      html.push(`
        <div class="field-row ${isConflicted ? 'conflicted' : ''}">
          <span class="field-label">${this.getFieldDisplayName(field)}:</span>
          <span class="field-value">${displayValue}</span>
          ${isConflicted ? '<span class="conflict-indicator">⚠️</span>' : ''}
        </div>
      `);
    }

    return html.join('');
  }

  /**
   * Format field value for display
   */
  formatFieldValue(field, value) {
    if (value == null) return '<em>empty</em>';
    
    if (field.includes('Date') || field.includes('Time')) {
      try {
        return new Date(value).toLocaleString();
      } catch {
        return value;
      }
    }
    
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    
    return value.toString();
  }

  /**
   * Get display name for field
   */
  getFieldDisplayName(field) {
    const displayNames = {
      volunteerId: 'Volunteer ID',
      eventId: 'Event ID',
      volunteerName: 'Volunteer Name',
      startTime: 'Start Time',
      endTime: 'End Time',
      dateTime: 'Date & Time',
      updatedAt: 'Last Updated',
      createdAt: 'Created'
    };

    return displayNames[field] || field.charAt(0).toUpperCase() + field.slice(1);
  }

  /**
   * Check if conflict can be merged
   */
  canMergeConflict(conflict) {
    return conflict.fieldConflicts.some(c => c.canMerge);
  }

  /**
   * Handle modal action
   */
  handleModalAction(action, conflict, resolveCallback, modal) {
    // Remove modal
    modal.remove();

    // Resolve with action
    switch (action) {
      case 'keep-local':
        resolveCallback({
          strategy: this.resolutionStrategies.KEEP_LOCAL,
          selectedRecord: conflict.localRecord
        });
        break;
        
      case 'keep-remote':
        resolveCallback({
          strategy: this.resolutionStrategies.KEEP_REMOTE,
          selectedRecord: conflict.remoteRecord
        });
        break;
        
      case 'merge':
        resolveCallback({
          strategy: this.resolutionStrategies.MERGE,
          mergeInstructions: this.getMergeInstructions(conflict)
        });
        break;
        
      case 'cancel':
      default:
        resolveCallback({ cancelled: true });
        break;
    }
  }

  /**
   * Get merge instructions for manual merge
   */
  getMergeInstructions(conflict) {
    return conflict.fieldConflicts.map(fieldConflict => ({
      field: fieldConflict.field,
      action: fieldConflict.canMerge ? 'merge' : 'use_local',
      localValue: fieldConflict.localValue,
      remoteValue: fieldConflict.remoteValue
    }));
  }

  /**
   * Apply manual resolution
   */
  async applyManualResolution(conflict, resolution) {
    try {
      let resolvedRecord;

      switch (resolution.strategy) {
        case this.resolutionStrategies.KEEP_LOCAL:
          resolvedRecord = conflict.localRecord;
          break;
          
        case this.resolutionStrategies.KEEP_REMOTE:
          resolvedRecord = conflict.remoteRecord;
          break;
          
        case this.resolutionStrategies.MERGE:
          resolvedRecord = await this.applyMergeInstructions(
            conflict.localRecord,
            conflict.remoteRecord,
            resolution.mergeInstructions
          );
          break;
          
        case 'custom':
          resolvedRecord = await this.applyCustomResolution(
            conflict.localRecord,
            conflict.remoteRecord,
            resolution.fieldResolutions
          );
          break;
          
        default:
          throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
      }

      // Create backups
      const backups = [];
      if (resolution.strategy !== this.resolutionStrategies.KEEP_LOCAL) {
        backups.push(await this.createBackup(conflict, conflict.localRecord, `manual_${resolution.strategy}_local`));
      }
      if (resolution.strategy !== this.resolutionStrategies.KEEP_REMOTE) {
        backups.push(await this.createBackup(conflict, conflict.remoteRecord, `manual_${resolution.strategy}_remote`));
      }

      // Apply resolution
      const appliedRecord = await this.applyResolution(conflict, resolvedRecord);

      // Update conflict status
      conflict.status = 'resolved';
      conflict.resolvedAt = new Date().toISOString();
      conflict.resolution = {
        ...resolution,
        appliedRecord: appliedRecord,
        backups: backups,
        timestamp: new Date().toISOString()
      };

      // Log resolution
      this.logConflictResolution(conflict, conflict.resolution);

      // Create notification
      this.createResolutionNotification(conflict, conflict.resolution, 'manual');

      return conflict.resolution;

    } catch (error) {
      console.error('Error applying manual resolution:', error);
      throw error;
    }
  }

  /**
   * Apply custom resolution with specific field choices
   */
  async applyCustomResolution(localRecord, remoteRecord, fieldResolutions) {
    const resolved = { ...localRecord };

    // Apply custom field resolutions
    for (const [field, value] of Object.entries(fieldResolutions)) {
      resolved[field] = value;
    }

    // Update metadata
    resolved.updatedAt = new Date().toISOString();
    resolved.syncedAt = new Date().toISOString();

    return resolved;
  }

  /**
   * Apply merge instructions to create merged record
   */
  async applyMergeInstructions(localRecord, remoteRecord, mergeInstructions) {
    const merged = { ...localRecord };

    for (const instruction of mergeInstructions) {
      switch (instruction.action) {
        case 'merge':
          merged[instruction.field] = await this.mergeFieldValues(
            instruction.field,
            instruction.localValue,
            instruction.remoteValue,
            localRecord.dataType || 'unknown'
          );
          break;
          
        case 'use_local':
          merged[instruction.field] = instruction.localValue;
          break;
          
        case 'use_remote':
          merged[instruction.field] = instruction.remoteValue;
          break;
      }
    }

    // Update metadata
    merged.updatedAt = new Date().toISOString();
    merged.syncedAt = new Date().toISOString();

    return merged;
  }

  /**
   * Apply resolution by updating local storage
   */
  async applyResolution(conflict, resolvedRecord) {
    try {
      // Update local storage with resolved record
      switch (conflict.dataType) {
        case 'volunteers':
          await Storage.updateVolunteer(resolvedRecord.id, resolvedRecord);
          break;
          
        case 'events':
          await Storage.updateEvent(resolvedRecord.id, resolvedRecord);
          break;
          
        case 'attendance':
          await Storage.updateAttendance(resolvedRecord.id, resolvedRecord);
          break;
          
        default:
          throw new Error(`Unknown data type: ${conflict.dataType}`);
      }

      console.log(`Applied resolution for ${conflict.dataType} record ${resolvedRecord.id}`);
      return resolvedRecord;

    } catch (error) {
      console.error('Error applying resolution to storage:', error);
      throw error;
    }
  }

  /**
   * Create backup of conflicting data
   */
  async createBackup(conflict, record, reason) {
    try {
      const backup = {
        id: this.generateBackupId(),
        conflictId: conflict.id,
        dataType: conflict.dataType,
        recordId: record.id,
        record: { ...record },
        reason: reason,
        createdAt: new Date().toISOString()
      };

      // Store backup
      const backups = JSON.parse(localStorage.getItem('vat_conflict_backups') || '[]');
      backups.push(backup);
      
      // Keep only last 100 backups
      if (backups.length > 100) {
        backups.splice(0, backups.length - 100);
      }
      
      localStorage.setItem('vat_conflict_backups', JSON.stringify(backups));

      console.log(`Created backup ${backup.id} for conflict ${conflict.id}`);
      return backup;

    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  generateConflictId() {
    return 'conflict_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateBackupId() {
    return 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getLastSyncTime(dataType) {
    try {
      const lastSync = JSON.parse(localStorage.getItem('vat_last_sync') || '{}');
      return lastSync[dataType] || null;
    } catch {
      return null;
    }
  }

  /**
   * Enhanced logging and audit methods
   */
  logConflictDetection(conflict) {
    const logEntry = {
      type: 'conflict_detected',
      conflictId: conflict.id,
      dataType: conflict.dataType,
      recordId: conflict.recordId,
      priority: conflict.priority,
      fieldCount: conflict.fieldConflicts.length,
      fieldConflicts: conflict.fieldConflicts.map(fc => ({
        field: fc.field,
        severity: fc.severity,
        canMerge: fc.canMerge
      })),
      suggestedStrategy: conflict.suggestedResolution.strategy,
      timestamp: new Date().toISOString()
    };

    this.auditLog.push(logEntry);
    this.saveAuditLog();
    
    console.log('Conflict detected:', logEntry);
  }

  logConflictResolution(conflict, resolution) {
    const logEntry = {
      type: 'conflict_resolved',
      conflictId: conflict.id,
      dataType: conflict.dataType,
      recordId: conflict.recordId,
      strategy: resolution.strategy,
      resolutionMethod: resolution.method || 'automatic',
      winner: resolution.winner,
      backupIds: resolution.backup ? [resolution.backup.id] : 
                 resolution.backups ? resolution.backups.map(b => b.id) : [],
      timestamp: new Date().toISOString(),
      duration: conflict.resolvedAt ? 
        new Date(conflict.resolvedAt).getTime() - new Date(conflict.detectedAt).getTime() : null
    };

    this.auditLog.push(logEntry);
    this.saveAuditLog();
    
    console.log('Conflict resolved:', logEntry);
  }

  logManualResolutionRequired(conflict, reason) {
    const logEntry = {
      type: 'manual_resolution_required',
      conflictId: conflict.id,
      dataType: conflict.dataType,
      recordId: conflict.recordId,
      reason: reason,
      priority: conflict.priority,
      timestamp: new Date().toISOString()
    };

    this.auditLog.push(logEntry);
    this.saveAuditLog();
    
    console.log('Manual resolution required:', logEntry);
  }

  logConflictError(conflict, error) {
    const logEntry = {
      type: 'conflict_error',
      conflictId: conflict.id,
      dataType: conflict.dataType,
      recordId: conflict.recordId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    this.auditLog.push(logEntry);
    this.saveAuditLog();
    
    console.error('Conflict resolution error:', logEntry);
  }

  logAutoResolutionSummary(results) {
    const logEntry = {
      type: 'auto_resolution_summary',
      statistics: results.statistics,
      strategiesUsed: Object.keys(results.statistics.strategies),
      timestamp: new Date().toISOString()
    };

    this.auditLog.push(logEntry);
    this.saveAuditLog();
    
    console.log('Auto-resolution summary:', logEntry);
  }

  /**
   * Create resolution notifications
   */
  createResolutionNotification(conflict, resolution, type) {
    const notification = {
      id: this.generateNotificationId(),
      type: type, // 'auto' or 'manual'
      conflictId: conflict.id,
      dataType: conflict.dataType,
      recordId: conflict.recordId,
      strategy: resolution.strategy,
      message: this.getResolutionMessage(conflict, resolution, type),
      timestamp: new Date().toISOString(),
      read: false
    };

    // Store notification
    this.storeNotification(notification);

    // Emit event for UI
    window.dispatchEvent(new CustomEvent('conflictResolved', {
      detail: notification
    }));

    return notification;
  }

  getResolutionMessage(conflict, resolution, type) {
    const dataTypeLabel = conflict.dataType.charAt(0).toUpperCase() + conflict.dataType.slice(1, -1);
    const recordLabel = conflict.recordId;

    switch (resolution.strategy) {
      case this.resolutionStrategies.LAST_MODIFIED_WINS:
        return `${dataTypeLabel} "${recordLabel}" conflict resolved automatically using most recent version (${resolution.winner}).`;
        
      case this.resolutionStrategies.MERGE:
        return `${dataTypeLabel} "${recordLabel}" conflict resolved by merging both versions.`;
        
      case this.resolutionStrategies.KEEP_LOCAL:
        return `${dataTypeLabel} "${recordLabel}" conflict resolved by keeping local version.`;
        
      case this.resolutionStrategies.KEEP_REMOTE:
        return `${dataTypeLabel} "${recordLabel}" conflict resolved by keeping remote version.`;
        
      case 'field_by_field':
        return `${dataTypeLabel} "${recordLabel}" conflict resolved by analyzing each field individually.`;
        
      case 'smart_merge':
        return `${dataTypeLabel} "${recordLabel}" conflict resolved using intelligent merge strategy.`;
        
      case 'confidence_based':
        return `${dataTypeLabel} "${recordLabel}" conflict resolved based on data quality confidence (${resolution.winner} version chosen).`;
        
      default:
        return `${dataTypeLabel} "${recordLabel}" conflict resolved using ${resolution.strategy} strategy.`;
    }
  }

  generateNotificationId() {
    return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  storeNotification(notification) {
    try {
      const notifications = JSON.parse(localStorage.getItem('vat_conflict_notifications') || '[]');
      notifications.push(notification);
      
      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(0, notifications.length - 50);
      }
      
      localStorage.setItem('vat_conflict_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  /**
   * Get notifications
   */
  getNotifications(unreadOnly = false) {
    try {
      const notifications = JSON.parse(localStorage.getItem('vat_conflict_notifications') || '[]');
      return unreadOnly ? notifications.filter(n => !n.read) : notifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  markNotificationRead(notificationId) {
    try {
      const notifications = JSON.parse(localStorage.getItem('vat_conflict_notifications') || '[]');
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        localStorage.setItem('vat_conflict_notifications', JSON.stringify(notifications));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  clearNotifications() {
    try {
      localStorage.removeItem('vat_conflict_notifications');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Storage methods
   */
  async loadConflictHistory() {
    try {
      const stored = localStorage.getItem('vat_conflict_history');
      if (stored) {
        this.conflictHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading conflict history:', error);
      this.conflictHistory = [];
    }
  }

  async saveConflictHistory() {
    try {
      // Keep only last 50 conflicts
      if (this.conflictHistory.length > 50) {
        this.conflictHistory = this.conflictHistory.slice(-50);
      }
      
      localStorage.setItem('vat_conflict_history', JSON.stringify(this.conflictHistory));
    } catch (error) {
      console.error('Error saving conflict history:', error);
    }
  }

  async loadAuditLog() {
    try {
      const stored = localStorage.getItem('vat_conflict_audit');
      if (stored) {
        this.auditLog = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
      this.auditLog = [];
    }
  }

  async saveAuditLog() {
    try {
      // Keep only last 200 log entries
      if (this.auditLog.length > 200) {
        this.auditLog = this.auditLog.slice(-200);
      }
      
      localStorage.setItem('vat_conflict_audit', JSON.stringify(this.auditLog));
    } catch (error) {
      console.error('Error saving audit log:', error);
    }
  }

  /**
   * Event handling
   */
  setupEventListeners() {
    // Listen for sync events to detect conflicts
    if (window.SyncManager) {
      window.SyncManager.addSyncListener('conflictDetected', (data) => {
        this.handleSyncConflict(data);
      });
    }
  }

  handleSyncConflict(data) {
    console.log('Sync conflict detected:', data);
    // Add to conflict history
    this.conflictHistory.push(data.conflict);
    this.saveConflictHistory();
  }

  /**
   * Listener management
   */
  addConflictListener(callback) {
    this.conflictListeners.push(callback);
  }

  removeConflictListener(callback) {
    const index = this.conflictListeners.indexOf(callback);
    if (index > -1) {
      this.conflictListeners.splice(index, 1);
    }
  }

  notifyConflictListeners(event, data) {
    this.conflictListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in conflict listener:', error);
      }
    });
  }

  /**
   * Public API methods
   */
  getConflictHistory() {
    return [...this.conflictHistory];
  }

  getAuditLog() {
    return [...this.auditLog];
  }

  getConflictStats() {
    const total = this.conflictHistory.length;
    const resolved = this.conflictHistory.filter(c => c.status === 'resolved').length;
    const pending = this.conflictHistory.filter(c => c.status === 'pending').length;
    
    return {
      total,
      resolved,
      pending,
      resolutionRate: total > 0 ? (resolved / total * 100).toFixed(1) : 0
    };
  }

  clearConflictHistory() {
    this.conflictHistory = [];
    this.auditLog = [];
    localStorage.removeItem('vat_conflict_history');
    localStorage.removeItem('vat_conflict_audit');
    localStorage.removeItem('vat_conflict_backups');
  }

  /**
   * Main conflict resolution method
   * @param {Object} conflict - Conflict object to resolve
   * @param {string} strategy - Resolution strategy to use
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Resolution result
   */
  async resolveConflict(conflict, strategy = null, options = {}) {
    try {
      // Use provided strategy or get suggested strategy
      const resolutionStrategy = strategy || this.suggestResolution(
        conflict.localRecord, 
        conflict.remoteRecord, 
        conflict.fieldConflicts
      ).strategy;

      // Apply the resolution strategy
      let result;
      switch (resolutionStrategy) {
        case this.resolutionStrategies.LAST_MODIFIED_WINS:
          result = await this.resolveLastModifiedWins(conflict);
          break;
        case this.resolutionStrategies.KEEP_LOCAL:
          result = await this.resolveKeepLocal(conflict);
          break;
        case this.resolutionStrategies.KEEP_REMOTE:
          result = await this.resolveKeepRemote(conflict);
          break;
        case this.resolutionStrategies.MERGE:
          result = await this.resolveMerge(conflict);
          break;
        case this.resolutionStrategies.MANUAL:
          result = await this.handleManualResolution(conflict, options);
          break;
        default:
          throw new Error(`Unknown resolution strategy: ${resolutionStrategy}`);
      }

      // Update conflict status
      if (result.success) {
        conflict.status = 'resolved';
        conflict.resolvedAt = new Date().toISOString();
        conflict.resolution = result;
        
        // Log the resolution
        this.logConflictResolution(conflict, result);
      }

      return result;

    } catch (error) {
      console.error('Error resolving conflict:', error);
      return {
        success: false,
        error: error.message,
        strategy: strategy
      };
    }
  }

  /**
   * Handle manual resolution of conflicts
   * @param {Object} conflict - Conflict to resolve manually
   * @param {Object} options - Resolution options
   * @returns {Promise<Object>} Resolution result
   */
  async handleManualResolution(conflict, options = {}) {
    try {
      // If manual resolution data is provided in options, use it
      if (options.manualResolution) {
        const resolvedRecord = { ...conflict.localRecord, ...options.manualResolution };
        
        return {
          success: true,
          strategy: this.resolutionStrategies.MANUAL,
          resolvedRecord: resolvedRecord,
          method: 'manual_override',
          timestamp: new Date().toISOString()
        };
      }

      // Otherwise, mark as requiring manual intervention
      conflict.status = 'requires_manual';
      conflict.requiresManualAt = new Date().toISOString();
      
      // Notify listeners that manual resolution is needed
      this.notifyConflictListeners('manualResolutionRequired', {
        conflictId: conflict.id,
        conflict: conflict
      });

      return {
        success: false,
        requiresManual: true,
        strategy: this.resolutionStrategies.MANUAL,
        reason: 'Manual resolution required',
        conflict: conflict
      };

    } catch (error) {
      console.error('Error in manual resolution handling:', error);
      return {
        success: false,
        error: error.message,
        strategy: this.resolutionStrategies.MANUAL
      };
    }
  }

  /**
   * Resolve using last modified wins strategy
   */
  async resolveLastModifiedWins(conflict) {
    const localModified = new Date(conflict.localRecord.updatedAt || conflict.localRecord.createdAt);
    const remoteModified = new Date(conflict.remoteRecord.updatedAt || conflict.remoteRecord.createdAt);
    
    const winner = localModified > remoteModified ? 'local' : 'remote';
    const resolvedRecord = winner === 'local' ? conflict.localRecord : conflict.remoteRecord;
    
    return {
      success: true,
      strategy: this.resolutionStrategies.LAST_MODIFIED_WINS,
      resolvedRecord: resolvedRecord,
      winner: winner,
      method: 'timestamp_comparison',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Resolve by keeping local record
   */
  async resolveKeepLocal(conflict) {
    return {
      success: true,
      strategy: this.resolutionStrategies.KEEP_LOCAL,
      resolvedRecord: conflict.localRecord,
      method: 'keep_local',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Resolve by keeping remote record
   */
  async resolveKeepRemote(conflict) {
    return {
      success: true,
      strategy: this.resolutionStrategies.KEEP_REMOTE,
      resolvedRecord: conflict.remoteRecord,
      method: 'keep_remote',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Resolve by merging records
   */
  async resolveMerge(conflict) {
    try {
      const mergedRecord = { ...conflict.localRecord };
      
      // Merge each field conflict
      for (const fieldConflict of conflict.fieldConflicts) {
        if (fieldConflict.canMerge) {
          const mergedValue = await this.mergeFieldValues(
            fieldConflict.field,
            fieldConflict.localValue,
            fieldConflict.remoteValue,
            conflict.dataType
          );
          mergedRecord[fieldConflict.field] = mergedValue;
        } else {
          // Use last modified wins for non-mergeable fields
          const localModified = new Date(conflict.localRecord.updatedAt || conflict.localRecord.createdAt);
          const remoteModified = new Date(conflict.remoteRecord.updatedAt || conflict.remoteRecord.createdAt);
          
          if (remoteModified > localModified) {
            mergedRecord[fieldConflict.field] = fieldConflict.remoteValue;
          }
        }
      }
      
      // Update timestamp
      mergedRecord.updatedAt = new Date().toISOString();
      
      return {
        success: true,
        strategy: this.resolutionStrategies.MERGE,
        resolvedRecord: mergedRecord,
        method: 'field_merge',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error in merge resolution:', error);
      return {
        success: false,
        error: error.message,
        strategy: this.resolutionStrategies.MERGE
      };
    }
  }
}

// Global instance
window.ConflictResolver = new ConflictResolver();