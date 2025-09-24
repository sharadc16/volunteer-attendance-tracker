/**
 * Environment Variable Loading System
 * Handles loading credentials from environment variables with fallback mechanisms
 * Now uses the centralized CredentialManager
 */
class EnvironmentManager {
  constructor() {
    this.credentials = null;
    this.loadAttempted = false;
    this.secureStorage = null; // Will be initialized when needed
  }

  /**
   * Load environment variables and credentials
   */
  async loadEnvironment() {
    if (this.loadAttempted && this.credentials) {
      return this.credentials;
    }

    this.loadAttempted = true;
    
    try {
      // Use the centralized CredentialManager
      this.credentials = await window.CredentialManager.loadCredentials();
      
      console.log('Environment loaded successfully via CredentialManager');
      return this.credentials;
      
    } catch (error) {
      console.error('Failed to load environment:', error);
      this.credentials = this.getDefaultCredentials();
      return this.credentials;
    }
  }

  /**
   * Load credentials from environment variables
   */
  loadFromEnvironment() {
    const credentials = {};
    const variableNames = window.EnvironmentConfig.getVariableNames();
    
    // Check for environment variables in various formats
    const envSources = [
      // Netlify build-time environment variables (most common for static sites)
      () => this.loadFromNetlifyEnvironment(variableNames),
      
      // Standard environment variables (Node.js/server-side)
      () => this.loadFromProcessEnv(variableNames),

      // Window-based environment (for build systems)
      () => this.loadFromWindowGlobals(variableNames),
      
      // Meta tags (for static deployments)
      () => this.loadFromMetaTags()
    ];

    // Try each source
    for (const source of envSources) {
      try {
        const envVars = source();
        Object.keys(envVars).forEach(key => {
          if (envVars[key] && !credentials[key]) {
            credentials[key] = envVars[key];
          }
        });
      } catch (error) {
        // Continue to next source
      }
    }

    return credentials;
  }

  /**
   * Load from Netlify build-time environment variables
   */
  loadFromNetlifyEnvironment(variableNames) {
    const netlifyEnv = {};
    
    // Check window globals (build-time injection)
    Object.keys(variableNames).forEach(credType => {
      for (const varName of variableNames[credType]) {
        if (typeof window !== 'undefined' && window[varName]) {
          netlifyEnv[credType] = window[varName];
          break;
        }
      }
    });
    
    // Check process.env if available (build-time injection)
    if (typeof process !== 'undefined' && process.env) {
      Object.keys(variableNames).forEach(credType => {
        if (!netlifyEnv[credType]) {
          for (const varName of variableNames[credType]) {
            if (process.env[varName]) {
              netlifyEnv[credType] = process.env[varName];
              break;
            }
          }
        }
      });
    }
    
    return netlifyEnv;
  }

  /**
   * Load from process.env (Node.js/server-side)
   */
  loadFromProcessEnv(variableNames) {
    const processEnv = {};
    
    if (typeof process !== 'undefined' && process.env) {
      Object.keys(variableNames).forEach(credType => {
        for (const varName of variableNames[credType]) {
          if (process.env[varName]) {
            processEnv[credType] = process.env[varName];
            break;
          }
        }
      });
    }
    
    return processEnv;
  }

  /**
   * Load from window globals (build systems)
   */
  loadFromWindowGlobals(variableNames) {
    const windowEnv = {};
    
    if (typeof window !== 'undefined') {
      Object.keys(variableNames).forEach(credType => {
        for (const varName of variableNames[credType]) {
          if (window[varName]) {
            windowEnv[credType] = window[varName];
            break;
          }
        }
      });
    }
    
    return windowEnv;
  }

  /**
   * Load credentials from meta tags
   */
  loadFromMetaTags() {
    const credentials = {};
    const metaMap = window.EnvironmentConfig.getMetaTagMappings();

    Object.keys(metaMap).forEach(metaName => {
      const metaTag = document.querySelector(`meta[name="${metaName}"]`);
      if (metaTag && !credentials[metaMap[metaName]]) {
        credentials[metaMap[metaName]] = metaTag.getAttribute('content');
      }
    });

    return credentials;
  }

  /**
   * Get default credentials configuration
   */
  getDefaultCredentials() {
    return window.EnvironmentConfig.getDefaults();
  }

  /**
   * Validate loaded credentials
   */
  validateCredentials() {
    if (!this.credentials) {
      throw new Error('No credentials loaded');
    }

    const required = window.EnvironmentConfig.getRequiredFields();
    const missing = required.filter(key => !this.credentials[key]);
    
    if (missing.length > 0) {
      console.warn(`Missing required credentials: ${missing.join(', ')}`);
      // Don't throw error - allow fallback to manual configuration
    }

    // Validate format using centralized validation
    const warnings = window.EnvironmentConfig.validateCredentialFormat(this.credentials);
    warnings.forEach(warning => console.warn(warning));
  }

  /**
   * Initialize secure storage if needed
   */
  initializeSecureStorage() {
    if (!this.secureStorage && window.CredentialManager) {
      this.secureStorage = window.CredentialManager;
    }
  }

  /**
   * Store user-provided credentials
   */
  async storeCredentials(credentials) {
    try {
      this.initializeSecureStorage();
      
      if (!this.secureStorage) {
        throw new Error('CredentialManager not available');
      }
      
      await this.secureStorage.storeCredentials(credentials);
      
      // Update current credentials
      this.credentials = {
        ...this.credentials,
        ...credentials
      };
      
      this.validateCredentials();
      return true;
      
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw error;
    }
  }

  /**
   * Clear stored credentials (fallback to environment)
   */
  async clearStoredCredentials() {
    try {
      this.initializeSecureStorage();
      
      if (!this.secureStorage) {
        throw new Error('CredentialManager not available');
      }
      
      await this.secureStorage.clearCredentials();
      
      // Reload from environment only
      this.loadAttempted = false;
      this.credentials = null;
      
      return await this.loadEnvironment();
      
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      throw error;
    }
  }

  /**
   * Check if credentials are available
   */
  hasValidCredentials() {
    return this.credentials && 
           this.credentials.apiKey && 
           this.credentials.clientId;
  }

  /**
   * Get current credentials
   */
  getCredentials() {
    return this.credentials;
  }

  /**
   * Check if credentials are from environment vs user input
   */
  isUsingEnvironmentCredentials() {
    const envCredentials = this.loadFromEnvironment();
    return envCredentials.apiKey === this.credentials?.apiKey &&
           envCredentials.clientId === this.credentials?.clientId;
  }
}

// Global instance
window.EnvironmentManager = new EnvironmentManager();