/**
 * Configuration Manager
 * Handles configuration validation, persistence, and import/export
 */
class ConfigManager {
  constructor() {
    this.validationRules = {
      scanner: {
        enabled: { type: 'boolean', required: true },
        timeout: { type: 'number', min: 1000, max: 30000 },
        prefix: { type: 'string', maxLength: 10 },
        suffix: { type: 'string', maxLength: 10 },
        autoFocus: { type: 'boolean', required: true }
      },
      sync: {
        enabled: { type: 'boolean', required: true },
        interval: { type: 'number', min: 30000, max: 600000 }, // 30 seconds to 10 minutes
        retryAttempts: { type: 'number', min: 1, max: 10 },
        retryDelay: { type: 'number', min: 1000, max: 60000 }
      },
      googleSheets: {
        enabled: { type: 'boolean', required: true },
        apiKey: { type: 'string', pattern: /^AIza[0-9A-Za-z-_]{35}$/, required: false },
        clientId: { type: 'string', pattern: /^[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com$/, required: false },
        spreadsheetId: { type: 'string', pattern: /^[a-zA-Z0-9-_]{44}$/, required: false },
        // syncInterval removed - using sync.interval for all sync operations
        retryAttempts: { type: 'number', min: 1, max: 10 },
        retryDelay: { type: 'number', min: 1000, max: 60000 },
        batchSize: { type: 'number', min: 10, max: 1000 }
      },
      ui: {
        recentAttendanceLimit: { type: 'number', min: 5, max: 100 },
        autoRefreshInterval: { type: 'number', min: 10000, max: 300000 },
        animationDuration: { type: 'number', min: 0, max: 1000 }
      },
      events: {
        scanningWindowDays: { type: 'number', min: 1, max: 30 },
        defaultDuration: { type: 'number', min: 30, max: 480 },
        autoCreateSundays: { type: 'boolean', required: true }
      }
    };
  }

  /**
   * Validate configuration object
   */
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    for (const [section, rules] of Object.entries(this.validationRules)) {
      if (!config[section]) {
        if (this.isRequiredSection(section)) {
          errors.push(`Missing required configuration section: ${section}`);
        }
        continue;
      }

      const sectionErrors = this.validateSection(config[section], rules, section);
      errors.push(...sectionErrors.errors);
      warnings.push(...sectionErrors.warnings);
    }

    // Cross-section validation
    const crossValidation = this.validateCrossSectionRules(config);
    errors.push(...crossValidation.errors);
    warnings.push(...crossValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a configuration section
   */
  validateSection(sectionConfig, rules, sectionName) {
    const errors = [];
    const warnings = [];

    for (const [key, rule] of Object.entries(rules)) {
      const value = sectionConfig[key];
      const fieldPath = `${sectionName}.${key}`;

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldPath} is required`);
        continue;
      }

      // Skip validation for optional empty values
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type && typeof value !== rule.type) {
        errors.push(`${fieldPath} must be of type ${rule.type}, got ${typeof value}`);
        continue;
      }

      // Number range validation
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${fieldPath} must be at least ${rule.min}, got ${value}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${fieldPath} must be at most ${rule.max}, got ${value}`);
        }
      }

      // String length validation
      if (rule.type === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`${fieldPath} must be at least ${rule.minLength} characters long`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`${fieldPath} must be at most ${rule.maxLength} characters long`);
        }
      }

      // Pattern validation
      if (rule.pattern && rule.type === 'string' && value) {
        if (!rule.pattern.test(value)) {
          errors.push(`${fieldPath} format is invalid`);
        }
      }

      // Custom validation warnings
      if (sectionName === 'sync' && key === 'interval' && value < 120000) {
        warnings.push(`${fieldPath}: Intervals less than 2 minutes may cause sync overlaps`);
      }

      if (sectionName === 'googleSheets' && key === 'batchSize' && value > 500) {
        warnings.push(`${fieldPath}: Large batch sizes may cause timeouts`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate cross-section rules
   */
  validateCrossSectionRules(config) {
    const errors = [];
    const warnings = [];

    // Google Sheets validation
    if (config.googleSheets?.enabled) {
      // Check if credentials are provided (either in config or environment)
      const hasApiKey = config.googleSheets.apiKey || window.EnvironmentManager?.hasEnvironmentCredentials();
      const hasClientId = config.googleSheets.clientId || window.EnvironmentManager?.hasEnvironmentCredentials();

      if (!hasApiKey) {
        errors.push('Google Sheets is enabled but no API key is provided');
      }

      if (!hasClientId) {
        errors.push('Google Sheets is enabled but no Client ID is provided');
      }

      // Sync interval consistency check removed - using single sync.interval

      // Validate spreadsheet ID format if provided
      if (config.googleSheets.spreadsheetId && config.googleSheets.spreadsheetId.trim()) {
        const spreadsheetIdPattern = /^[a-zA-Z0-9-_]{44}$/;
        if (!spreadsheetIdPattern.test(config.googleSheets.spreadsheetId)) {
          errors.push('Google Sheets spreadsheet ID format is invalid');
        }
      }

      // Validate API key format if provided
      if (config.googleSheets.apiKey && config.googleSheets.apiKey.trim()) {
        const apiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
        if (!apiKeyPattern.test(config.googleSheets.apiKey)) {
          errors.push('Google API key format is invalid');
        }
      }

      // Validate client ID format if provided
      if (config.googleSheets.clientId && config.googleSheets.clientId.trim()) {
        const clientIdPattern = /^[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com$/;
        if (!clientIdPattern.test(config.googleSheets.clientId)) {
          errors.push('Google Client ID format is invalid');
        }
      }
    }

    // Sync validation
    if (config.sync?.enabled && !config.googleSheets?.enabled) {
      warnings.push('Sync is enabled but no sync targets are configured');
    }

    // Scanner validation
    if (config.scanner?.enabled) {
      if (config.scanner.prefix && config.scanner.suffix && 
          config.scanner.prefix === config.scanner.suffix) {
        warnings.push('Scanner prefix and suffix are identical, which may cause scanning issues');
      }
    }

    // UI validation
    if (config.ui?.autoRefreshInterval && config.sync?.interval) {
      if (config.ui.autoRefreshInterval < config.sync.interval) {
        warnings.push('UI auto-refresh is faster than sync interval, which may cause unnecessary updates');
      }
    }

    return { errors, warnings };
  }

  /**
   * Check if a configuration section is required
   */
  isRequiredSection(section) {
    const requiredSections = ['scanner', 'sync', 'ui'];
    return requiredSections.includes(section);
  }

  /**
   * Sanitize configuration values
   */
  sanitizeConfig(config) {
    const sanitized = JSON.parse(JSON.stringify(config)); // Deep clone

    // Sanitize numeric values
    for (const [section, rules] of Object.entries(this.validationRules)) {
      if (!sanitized[section]) continue;

      for (const [key, rule] of Object.entries(rules)) {
        const value = sanitized[section][key];

        if (rule.type === 'number' && typeof value === 'number') {
          // Clamp to valid range
          if (rule.min !== undefined) {
            sanitized[section][key] = Math.max(value, rule.min);
          }
          if (rule.max !== undefined) {
            sanitized[section][key] = Math.min(sanitized[section][key], rule.max);
          }
        }

        if (rule.type === 'string' && typeof value === 'string') {
          // Trim whitespace
          sanitized[section][key] = value.trim();

          // Truncate if too long
          if (rule.maxLength !== undefined) {
            sanitized[section][key] = sanitized[section][key].substring(0, rule.maxLength);
          }
        }
      }
    }

    return sanitized;
  }

  /**
   * Export configuration
   */
  exportConfig(includeCredentials = false) {
    const config = {
      scanner: Config.scanner,
      sync: Config.sync,
      googleSheets: Config.googleSheets,
      ui: Config.ui,
      events: Config.events,
      exportedAt: new Date().toISOString(),
      version: Config.version,
      exportType: includeCredentials ? 'full' : 'safe'
    };

    // Remove sensitive data unless explicitly requested
    const exportConfig = JSON.parse(JSON.stringify(config));
    if (!includeCredentials && exportConfig.googleSheets) {
      delete exportConfig.googleSheets.apiKey;
      delete exportConfig.googleSheets.clientId;
    }

    return exportConfig;
  }

  /**
   * Create configuration backup
   */
  createBackup() {
    const backup = {
      ...this.exportConfig(false),
      backupType: 'automatic',
      backupId: `backup_${Date.now()}`
    };

    // Store backup in localStorage
    const backups = this.getStoredBackups();
    backups.unshift(backup);
    
    // Keep only last 5 backups
    const trimmedBackups = backups.slice(0, 5);
    
    try {
      localStorage.setItem('vat_config_backups', JSON.stringify(trimmedBackups));
      console.log('Configuration backup created:', backup.backupId);
      return backup.backupId;
    } catch (error) {
      console.warn('Failed to store configuration backup:', error);
      return null;
    }
  }

  /**
   * Get stored configuration backups
   */
  getStoredBackups() {
    try {
      const stored = localStorage.getItem('vat_config_backups');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load configuration backups:', error);
      return [];
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId) {
    const backups = this.getStoredBackups();
    const backup = backups.find(b => b.backupId === backupId);
    
    if (!backup) {
      throw new Error('Backup not found');
    }

    try {
      await this.importConfig(backup);
      console.log('Configuration restored from backup:', backupId);
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw new Error('Failed to restore configuration from backup');
    }
  }

  /**
   * Import configuration
   */
  async importConfig(importData) {
    try {
      // Validate import data structure
      if (!importData || typeof importData !== 'object') {
        throw new Error('Invalid configuration format');
      }

      // Check version compatibility
      if (importData.version && this.isVersionIncompatible(importData.version)) {
        throw new Error(`Configuration version ${importData.version} is not compatible with current version ${Config.version}`);
      }

      // Validate configuration
      const validation = this.validateConfig(importData);
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Sanitize configuration
      const sanitizedConfig = this.sanitizeConfig(importData);

      // Apply configuration
      await this.applyConfig(sanitizedConfig);

      return {
        success: true,
        warnings: validation.warnings
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply configuration to the application
   */
  async applyConfig(config) {
    try {
      // Store backup of current config before applying changes
      const backupConfig = {
        scanner: { ...Config.scanner },
        sync: { ...Config.sync },
        googleSheets: { ...Config.googleSheets },
        ui: { ...Config.ui },
        events: { ...Config.events }
      };

      // Update Config object
      Object.assign(Config.scanner, config.scanner || {});
      Object.assign(Config.sync, config.sync || {});
      Object.assign(Config.googleSheets, config.googleSheets || {});
      Object.assign(Config.ui, config.ui || {});
      Object.assign(Config.events, config.events || {});

      // Save to storage
      await this.saveConfig();

      // Notify application of config changes
      this.notifyConfigChange();

      // Store backup for potential rollback
      this.lastBackup = backupConfig;
      this.lastBackupTimestamp = Date.now();

    } catch (error) {
      console.error('Failed to apply configuration:', error);
      throw new Error('Failed to apply configuration changes');
    }
  }

  /**
   * Rollback to previous configuration
   */
  async rollbackConfig() {
    if (!this.lastBackup) {
      throw new Error('No backup configuration available for rollback');
    }

    // Check if backup is recent (within 5 minutes)
    const backupAge = Date.now() - (this.lastBackupTimestamp || 0);
    if (backupAge > 5 * 60 * 1000) {
      throw new Error('Backup configuration is too old for rollback');
    }

    try {
      await this.applyConfig(this.lastBackup);
      console.log('Configuration rolled back successfully');
    } catch (error) {
      console.error('Failed to rollback configuration:', error);
      throw new Error('Failed to rollback configuration');
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfig() {
    try {
      const configToSave = {
        scanner: Config.scanner,
        sync: Config.sync,
        googleSheets: Config.googleSheets,
        ui: Config.ui,
        events: Config.events,
        lastModified: new Date().toISOString(),
        version: Config.version
      };

      // Try new Storage system first
      if (window.Storage && typeof window.Storage.setItem === 'function') {
        try {
          await window.Storage.setItem('config', configToSave);
          console.log('Configuration saved to new Storage system');
        } catch (error) {
          console.warn('Failed to save to new Storage system:', error);
          // Fallback to old system
          Utils.Storage.set(Config.storageKeys.settings, configToSave);
          console.log('Configuration saved to localStorage (fallback)');
        }
      } else {
        // Fallback to old localStorage system
        Utils.Storage.set(Config.storageKeys.settings, configToSave);
        console.log('Configuration saved to localStorage');
      }

    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw new Error('Failed to save configuration to storage');
    }
  }

  /**
   * Load configuration from storage
   */
  async loadConfig() {
    try {
      // Try new Storage system first
      let savedConfig = null;
      
      if (window.Storage && typeof window.Storage.getItem === 'function') {
        try {
          savedConfig = await window.Storage.getItem('config');
          console.log('Loaded config from new Storage system');
        } catch (error) {
          console.warn('Failed to load from new Storage system:', error);
        }
      }
      
      // Fallback to old localStorage system
      if (!savedConfig) {
        try {
          savedConfig = Utils.Storage.get(Config.storageKeys.settings);
          if (savedConfig) {
            console.log('Loaded config from old localStorage system');
          }
        } catch (error) {
          console.warn('Failed to load from localStorage:', error);
        }
      }
      
      if (savedConfig) {
        // Validate loaded configuration
        const validation = this.validateConfig(savedConfig);
        if (validation.warnings.length > 0) {
          console.warn('Configuration warnings:', validation.warnings);
        }

        if (validation.isValid) {
          // Migrate old sync interval values to new default if needed
          if (savedConfig.sync && savedConfig.sync.interval && savedConfig.sync.interval < 120000) {
            console.log(`Migrating old sync interval ${savedConfig.sync.interval}ms to new default 300000ms`);
            savedConfig.sync.interval = 300000; // Update to new 5-minute default
          }
          
          // Remove deprecated googleSheets.syncInterval if it exists
          if (savedConfig.googleSheets && savedConfig.googleSheets.syncInterval) {
            console.log('Removing deprecated googleSheets.syncInterval');
            delete savedConfig.googleSheets.syncInterval;
          }
          
          // Apply loaded configuration
          Object.assign(Config.scanner, savedConfig.scanner || {});
          Object.assign(Config.sync, savedConfig.sync || {});
          Object.assign(Config.googleSheets, savedConfig.googleSheets || {});
          Object.assign(Config.ui, savedConfig.ui || {});
          Object.assign(Config.events, savedConfig.events || {});

          console.log('Configuration loaded and applied successfully');
          return true;
        } else {
          console.error('Invalid stored configuration:', validation.errors);
          return false;
        }
      }

      console.log('No saved configuration found, using defaults');
      return false;

    } catch (error) {
      console.error('Failed to load configuration:', error);
      return false;
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig() {
    // Reset to default values (defined in config.js)
    const defaultConfig = {
      scanner: {
        enabled: true,
        timeout: 5000,
        prefix: '',
        suffix: '',
        autoFocus: true
      },
      sync: {
        enabled: true,
        interval: 60000,
        retryAttempts: 3,
        retryDelay: 5000
      },
      googleSheets: {
        enabled: false,
        spreadsheetId: '',
        apiKey: '',
        clientId: '',
        discoveryDoc: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
        // syncInterval removed - using sync.interval
        retryAttempts: 3,
        retryDelay: 5000,
        batchSize: 100
      },
      ui: {
        recentAttendanceLimit: 10,
        autoRefreshInterval: 30000,
        animationDuration: 200
      },
      events: {
        scanningWindowDays: 7,
        defaultDuration: 120,
        autoCreateSundays: false
      }
    };

    Object.assign(Config, defaultConfig);
    this.saveConfig();
    this.notifyConfigChange();
  }

  /**
   * Check if version is incompatible
   */
  isVersionIncompatible(importVersion) {
    const currentMajor = parseInt(Config.version.split('.')[0]);
    const importMajor = parseInt(importVersion.split('.')[0]);
    
    // Major version differences are incompatible
    return currentMajor !== importMajor;
  }

  /**
   * Notify application of configuration changes
   */
  notifyConfigChange() {
    window.dispatchEvent(new CustomEvent('configChanged', {
      detail: {
        config: {
          scanner: Config.scanner,
          sync: Config.sync,
          googleSheets: Config.googleSheets,
          ui: Config.ui,
          events: Config.events
        }
      }
    }));
  }

  /**
   * Get validation rules for UI
   */
  getValidationRules() {
    return this.validationRules;
  }

  /**
   * Validate single field
   */
  validateField(section, field, value) {
    const rule = this.validationRules[section]?.[field];
    if (!rule) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const tempConfig = { [section]: { [field]: value } };
    const validation = this.validateSection(tempConfig[section], { [field]: rule }, section);
    
    return {
      isValid: validation.errors.length === 0,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  /**
   * Perform configuration health check
   */
  performHealthCheck() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      issues: [],
      recommendations: [],
      score: 100
    };

    try {
      // Validate current configuration
      const currentConfig = {
        scanner: Config.scanner,
        sync: Config.sync,
        googleSheets: Config.googleSheets,
        ui: Config.ui,
        events: Config.events
      };

      const validation = this.validateConfig(currentConfig);

      // Check for errors
      if (!validation.isValid) {
        healthCheck.overall = 'unhealthy';
        healthCheck.issues.push(...validation.errors);
        healthCheck.score -= validation.errors.length * 20;
      }

      // Check for warnings
      if (validation.warnings.length > 0) {
        if (healthCheck.overall === 'healthy') {
          healthCheck.overall = 'warning';
        }
        healthCheck.recommendations.push(...validation.warnings);
        healthCheck.score -= validation.warnings.length * 5;
      }

      // Check storage health
      try {
        const testKey = 'vat_health_check_test';
        Utils.Storage.set(testKey, 'test');
        const testValue = Utils.Storage.get(testKey);
        Utils.Storage.remove(testKey);
        
        if (testValue !== 'test') {
          healthCheck.issues.push('Storage system not functioning correctly');
          healthCheck.overall = 'unhealthy';
          healthCheck.score -= 30;
        }
      } catch (error) {
        healthCheck.issues.push('Storage system error: ' + error.message);
        healthCheck.overall = 'unhealthy';
        healthCheck.score -= 30;
      }

      // Check Google Sheets configuration if enabled
      if (Config.googleSheets.enabled) {
        if (!window.AuthManager || !window.AuthManager.isInitialized) {
          healthCheck.recommendations.push('Google Sheets is enabled but AuthManager is not initialized');
          healthCheck.score -= 10;
        }

        if (!Config.googleSheets.apiKey && !window.EnvironmentManager?.hasEnvironmentCredentials()) {
          healthCheck.issues.push('Google Sheets enabled but no API key configured');
          if (healthCheck.overall === 'healthy') {
            healthCheck.overall = 'warning';
          }
          healthCheck.score -= 15;
        }
      }

      // Ensure score doesn't go below 0
      healthCheck.score = Math.max(0, healthCheck.score);

      return healthCheck;

    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        overall: 'error',
        issues: ['Health check failed: ' + error.message],
        recommendations: ['Check browser console for detailed error information'],
        score: 0
      };
    }
  }

  /**
   * Get configuration statistics
   */
  getConfigurationStats() {
    const stats = {
      totalSections: Object.keys(this.validationRules).length,
      enabledFeatures: 0,
      configuredFields: 0,
      defaultFields: 0,
      lastModified: null,
      backupCount: 0
    };

    try {
      // Count enabled features
      if (Config.scanner.enabled) stats.enabledFeatures++;
      if (Config.sync.enabled) stats.enabledFeatures++;
      if (Config.googleSheets.enabled) stats.enabledFeatures++;

      // Count configured vs default fields
      const defaultConfig = {
        scanner: { enabled: true, timeout: 5000, prefix: '', suffix: '', autoFocus: true },
        sync: { enabled: true, interval: 300000, retryAttempts: 3, retryDelay: 5000 },
        googleSheets: { enabled: false, apiKey: '', clientId: '', spreadsheetId: '', retryAttempts: 3, retryDelay: 5000, batchSize: 100 },
        ui: { recentAttendanceLimit: 10, autoRefreshInterval: 30000, animationDuration: 200 },
        events: { scanningWindowDays: 7, defaultDuration: 120, autoCreateSundays: false }
      };

      for (const [section, sectionConfig] of Object.entries(Config)) {
        if (defaultConfig[section]) {
          for (const [key, value] of Object.entries(sectionConfig)) {
            if (defaultConfig[section][key] !== undefined) {
              if (value === defaultConfig[section][key]) {
                stats.defaultFields++;
              } else {
                stats.configuredFields++;
              }
            }
          }
        }
      }

      // Get backup count
      stats.backupCount = this.getStoredBackups().length;

      // Get last modified time from storage
      const stored = Utils.Storage.get(Config.storageKeys.settings);
      if (stored && stored.lastModified) {
        stats.lastModified = stored.lastModified;
      }

    } catch (error) {
      console.error('Failed to generate configuration stats:', error);
    }

    return stats;
  }
}

// Global instance
window.ConfigManager = new ConfigManager();