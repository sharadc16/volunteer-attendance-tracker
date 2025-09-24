/**
 * Centralized Credential Management Utility
 * Handles loading, validation, storage, and debugging of Google API credentials
 */
class CredentialManager {
  constructor() {
    this.credentials = null;
    this.loadAttempted = false;
    this.validationRules = this.getValidationRules();
    this.secureStorage = new SecureCredentialStorage();
  }

  /**
   * Load credentials with proper priority: stored > environment > defaults
   */
  async loadCredentials() {
    if (this.loadAttempted && this.credentials) {
      return this.credentials;
    }

    this.loadAttempted = true;

    try {
      // 1. Load from environment (including local-env.js and Netlify)
      const envCredentials = await this.loadEnvironmentCredentials();
      console.log('Environment credentials loaded:', this.maskCredentials(envCredentials));

      // 2. Load from secure storage (user overrides)
      const storedCredentials = await this.secureStorage.getCredentials();
      console.log('Stored credentials loaded:', this.maskCredentials(storedCredentials));

      // 3. Merge with proper priority (stored overrides environment)
      this.credentials = {
        ...this.getDefaultCredentials(),
        ...envCredentials,
        ...storedCredentials
      };

      console.log('Final merged credentials:', this.maskCredentials(this.credentials));

      // 4. Validate the final credentials
      const validation = this.validateCredentials(this.credentials);
      console.log('Credential validation result:', validation);

      return this.credentials;

    } catch (error) {
      console.error('Failed to load credentials:', error);
      this.credentials = this.getDefaultCredentials();
      return this.credentials;
    }
  }

  /**
   * Load credentials from environment sources
   */
  async loadEnvironmentCredentials() {
    const credentials = {};
    const variableNames = this.getVariableNames();

    // Check window globals (from local-env.js and netlify-env.js)
    Object.keys(variableNames).forEach(credType => {
      for (const varName of variableNames[credType]) {
        if (window[varName]) {
          credentials[credType] = window[varName];
          console.log(`✅ Found ${varName} in window globals`);
          break;
        }
      }
    });

    // If no credentials found and we're on Netlify, try the Functions API
    if (Object.keys(credentials).length === 0 && window.NetlifyCredentialsLoader) {
      try {
        const netlifyCredentials = await window.NetlifyCredentialsLoader.loadFromAPI();
        Object.assign(credentials, netlifyCredentials);
        console.log('🌐 Loaded credentials from Netlify Functions API');
      } catch (error) {
        console.warn('⚠️ Failed to load from Netlify Functions API:', error);
      }
    }

    return credentials;
  }

  /**
   * Store credentials securely (for settings page)
   */
  async storeCredentials(credentials) {
    try {
      // Validate before storing
      const validation = this.validateCredentials(credentials);
      if (!validation.isValid) {
        throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
      }

      // Store in secure storage
      await this.secureStorage.storeCredentials(credentials);

      // Update current credentials
      this.credentials = {
        ...this.credentials,
        ...credentials
      };

      console.log('Credentials stored successfully');
      return true;

    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw error;
    }
  }

  /**
   * Clear stored credentials
   */
  async clearStoredCredentials() {
    try {
      await this.secureStorage.clearCredentials();
      
      // Reload from environment only
      this.loadAttempted = false;
      this.credentials = null;
      
      return await this.loadCredentials();
      
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      throw error;
    }
  }

  /**
   * Comprehensive credential validation
   */
  validateCredentials(credentials) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    if (!credentials) {
      result.isValid = false;
      result.errors.push('No credentials provided');
      return result;
    }

    // Validate each credential type
    Object.keys(this.validationRules).forEach(credType => {
      const value = credentials[credType];
      const rules = this.validationRules[credType];
      
      result.details[credType] = this.validateCredentialField(value, rules, credType);
      
      if (!result.details[credType].isValid) {
        result.isValid = false;
        result.errors.push(...result.details[credType].errors);
      }
      
      result.warnings.push(...result.details[credType].warnings);
    });

    return result;
  }

  /**
   * Validate individual credential field
   */
  validateCredentialField(value, rules, fieldName) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      hasValue: !!value,
      isPlaceholder: false,
      format: 'unknown'
    };

    if (!value) {
      if (rules.required) {
        result.isValid = false;
        result.errors.push(`${fieldName} is required`);
      }
      return result;
    }

    // Check if it's a placeholder
    if (rules.placeholders && rules.placeholders.includes(value)) {
      result.isPlaceholder = true;
      result.warnings.push(`${fieldName} is using placeholder value`);
      if (rules.required) {
        result.isValid = false;
        result.errors.push(`${fieldName} must be replaced with actual value`);
      }
    }

    // Validate format
    if (rules.pattern && !rules.pattern.test(value)) {
      result.isValid = false;
      result.errors.push(`${fieldName} format is invalid`);
    } else if (rules.pattern) {
      result.format = 'valid';
    }

    // Check length
    if (rules.minLength && value.length < rules.minLength) {
      result.isValid = false;
      result.errors.push(`${fieldName} is too short (minimum ${rules.minLength} characters)`);
    }

    return result;
  }

  /**
   * Get validation rules for each credential type
   */
  getValidationRules() {
    return {
      apiKey: {
        required: true,
        pattern: /^AIza[0-9A-Za-z_-]{35,}$/,
        minLength: 35,
        placeholders: ['YOUR_API_KEY_HERE', 'YOUR_ACTUAL_API_KEY', '']
      },
      clientId: {
        required: true,
        pattern: /^[0-9]+-[0-9A-Za-z_-]+\.apps\.googleusercontent\.com$/,
        minLength: 50,
        placeholders: ['YOUR_CLIENT_ID_HERE', 'YOUR_ACTUAL_CLIENT_ID', '']
      },
      spreadsheetId: {
        required: false,
        pattern: /^[a-zA-Z0-9-_]{44}$/,
        minLength: 44,
        placeholders: ['YOUR_SPREADSHEET_ID_HERE', '']
      }
    };
  }

  /**
   * Get variable names mapping
   */
  getVariableNames() {
    return {
      apiKey: ['GOOGLE_SHEETS_API_KEY'],
      clientId: ['GOOGLE_OAUTH_CLIENT_ID'],
      spreadsheetId: ['VOLUNTEER_SPREADSHEET_ID']
    };
  }

  /**
   * Get default credentials
   */
  getDefaultCredentials() {
    return {
      apiKey: '',
      clientId: '',
      spreadsheetId: '',
      discoveryDoc: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
      scopes: 'https://www.googleapis.com/auth/spreadsheets'
    };
  }

  /**
   * Mask credentials for logging (security)
   */
  maskCredentials(credentials) {
    if (!credentials) return null;
    
    const masked = {};
    Object.keys(credentials).forEach(key => {
      const value = credentials[key];
      if (!value) {
        masked[key] = value;
      } else if (key === 'apiKey' && value.length > 8) {
        masked[key] = value.substring(0, 8) + '...';
      } else if (key === 'clientId' && value.length > 20) {
        masked[key] = value.substring(0, 20) + '...';
      } else if (key === 'spreadsheetId' && value.length > 20) {
        masked[key] = value.substring(0, 20) + '...';
      } else {
        masked[key] = value;
      }
    });
    return masked;
  }

  /**
   * Check if credentials are ready for use
   */
  areCredentialsReady() {
    const validation = this.validateCredentials(this.credentials);
    return validation.isValid && 
           !validation.details.apiKey?.isPlaceholder && 
           !validation.details.clientId?.isPlaceholder;
  }

  /**
   * Get current credentials
   */
  getCredentials() {
    return this.credentials;
  }

  /**
   * Check if using environment vs stored credentials
   */
  isUsingStoredCredentials() {
    if (!this.credentials) return false;
    
    const envCredentials = this.loadEnvironmentCredentials();
    return envCredentials.apiKey !== this.credentials.apiKey ||
           envCredentials.clientId !== this.credentials.clientId;
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics() {
    return {
      loadAttempted: this.loadAttempted,
      hasCredentials: !!this.credentials,
      validation: this.validateCredentials(this.credentials),
      isUsingStored: this.isUsingStoredCredentials(),
      areReady: this.areCredentialsReady()
    };
  }
}

/**
 * Secure Credential Storage (extracted from environment.js)
 */
class SecureCredentialStorage {
  constructor() {
    this.storageKey = 'vat_google_credentials';
    this.encryptionKey = this.generateEncryptionKey();
  }

  generateEncryptionKey() {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|');
    
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  encrypt(text) {
    const key = this.encryptionKey;
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(result);
  }

  decrypt(encryptedText) {
    const key = this.encryptionKey;
    const text = atob(encryptedText);
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return result;
  }

  async storeCredentials(credentials) {
    try {
      const credentialsJson = JSON.stringify(credentials);
      const encrypted = this.encrypt(credentialsJson);
      
      localStorage.setItem(this.storageKey, encrypted);
      localStorage.setItem(this.storageKey + '_timestamp', Date.now().toString());
      
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw new Error('Failed to store credentials securely');
    }
  }

  async getCredentials() {
    try {
      const encrypted = localStorage.getItem(this.storageKey);
      if (!encrypted) {
        return {};
      }

      const decrypted = this.decrypt(encrypted);
      const credentials = JSON.parse(decrypted);
      
      // Check if credentials are too old (30 days)
      const timestamp = localStorage.getItem(this.storageKey + '_timestamp');
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        if (age > maxAge) {
          console.warn('Stored credentials are old, clearing...');
          await this.clearCredentials();
          return {};
        }
      }
      
      return credentials;
      
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      await this.clearCredentials();
      return {};
    }
  }

  async clearCredentials() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.storageKey + '_timestamp');
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }
}

// Global instance
window.CredentialManager = new CredentialManager();

console.log('CredentialManager initialized');