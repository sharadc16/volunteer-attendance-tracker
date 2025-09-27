/**
 * Deployment Configuration Loader
 * Loads and applies environment-specific configuration
 */
class DeploymentConfigLoader {
  constructor() {
    this.config = null;
    this.currentEnvironment = null;
    this.isLoaded = false;
  }

  /**
   * Initialize deployment configuration
   */
  async initialize() {
    try {
      await this.loadConfiguration();
      this.detectEnvironment();
      this.applyEnvironmentConfiguration();
      this.isLoaded = true;
      
      console.log('🚀 Deployment Configuration Loader initialized');
      console.log(`📍 Environment: ${this.currentEnvironment}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize deployment configuration:', error);
      this.fallbackToDefaults();
    }
  }

  /**
   * Load deployment configuration from JSON file
   */
  async loadConfiguration() {
    try {
      const response = await fetch('./deployment-config.json');
      if (!response.ok) {
        throw new Error(`Failed to load deployment config: ${response.status}`);
      }
      
      this.config = await response.json();
      console.log('✅ Deployment configuration loaded');
      
    } catch (error) {
      console.warn('⚠️ Could not load deployment-config.json, using defaults');
      this.config = this.getDefaultConfiguration();
    }
  }

  /**
   * Detect current environment
   */
  detectEnvironment() {
    // Check for explicit environment configuration
    if (window.ENVIRONMENT_CONFIG && window.ENVIRONMENT_CONFIG.name) {
      this.currentEnvironment = window.ENVIRONMENT_CONFIG.name;
      console.log(`🎯 Environment detected from ENVIRONMENT_CONFIG: ${this.currentEnvironment}`);
      return;
    }

    // Check deployment context
    if (window.DeploymentContext) {
      const context = window.DeploymentContext.getContext();
      
      if (context.isProduction) {
        this.currentEnvironment = 'PRODUCTION';
      } else if (context.type === 'branch-deploy' && context.branch === 'test') {
        this.currentEnvironment = 'TESTING';
      } else if (context.type === 'branch-deploy' && context.branch === 'dev') {
        this.currentEnvironment = 'DEVELOPMENT';
      } else if (context.type === 'local' || context.type === 'netlify-other') {
        this.currentEnvironment = 'DEVELOPMENT';
      } else {
        this.currentEnvironment = 'PRODUCTION'; // Default fallback
      }
      
      console.log(`🎯 Environment detected from DeploymentContext: ${this.currentEnvironment}`);
      return;
    }

    // Fallback to URL-based detection
    const hostname = window.location.hostname;
    
    if (hostname.includes('test') || hostname.includes('staging')) {
      this.currentEnvironment = 'TESTING';
    } else if (hostname.includes('dev') || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      this.currentEnvironment = 'DEVELOPMENT';
    } else {
      this.currentEnvironment = 'PRODUCTION';
    }
    
    console.log(`🎯 Environment detected from hostname: ${this.currentEnvironment}`);
  }

  /**
   * Apply environment-specific configuration
   */
  applyEnvironmentConfiguration() {
    const envConfig = this.getEnvironmentConfig();
    
    if (!envConfig) {
      console.error(`❌ No configuration found for environment: ${this.currentEnvironment}`);
      return;
    }

    // Apply Google Sheets configuration
    this.applyGoogleSheetsConfig(envConfig.googleSheets);
    
    // Apply feature flags
    this.applyFeatureFlags(envConfig.features);
    
    // Apply UI configuration
    this.applyUIConfiguration(envConfig.ui);
    
    // Apply security configuration
    this.applySecurityConfiguration(envConfig.security);
    
    console.log(`✅ Applied ${envConfig.displayName} environment configuration`);
  }

  /**
   * Apply Google Sheets configuration
   */
  applyGoogleSheetsConfig(sheetsConfig) {
    if (!sheetsConfig || !window.Config) return;

    // Update sync interval
    if (window.Config.sync && sheetsConfig.syncInterval) {
      window.Config.sync.interval = sheetsConfig.syncInterval;
      console.log(`📊 Set sync interval to ${sheetsConfig.syncInterval / 1000}s`);
    }

    // Note: No longer setting validation mode here
    // ValidationEngine is now the single source of truth and handles environment defaults
    if (sheetsConfig.validationMode) {
      console.log(`📋 Environment default validation mode available: ${sheetsConfig.validationMode}`);
    }

    // Store template name for later use
    if (sheetsConfig.templateName) {
      window.ENVIRONMENT_SHEETS_TEMPLATE = sheetsConfig.templateName;
      console.log(`📋 Set sheets template: ${sheetsConfig.templateName}`);
    }
  }

  /**
   * Apply feature flags
   */
  applyFeatureFlags(features) {
    if (!features) return;

    // Set global feature flags
    window.FEATURE_FLAGS = {
      debugMode: features.debugMode || false,
      testFiles: features.testFiles || false,
      bypassMode: features.bypassMode || false,
      performanceMonitoring: features.performanceMonitoring || false,
      errorReporting: features.errorReporting || false,
      experimentalFeatures: features.experimentalFeatures || false
    };

    console.log('🎛️ Applied feature flags:', window.FEATURE_FLAGS);
  }

  /**
   * Apply UI configuration
   */
  applyUIConfiguration(uiConfig) {
    if (!uiConfig) return;

    // Set global UI configuration
    window.UI_CONFIG = {
      showEnvironmentBadge: uiConfig.showEnvironmentBadge || false,
      enableDebugFeatures: uiConfig.enableDebugFeatures || false,
      showTestFiles: uiConfig.showTestFiles || false,
      bannerColor: uiConfig.bannerColor || null,
      bannerText: uiConfig.bannerText || null
    };

    // Apply environment banner if configured
    if (uiConfig.showEnvironmentBadge && uiConfig.bannerText) {
      this.createEnvironmentBanner(uiConfig.bannerColor, uiConfig.bannerText);
    }

    console.log('🎨 Applied UI configuration:', window.UI_CONFIG);
  }

  /**
   * Apply security configuration
   */
  applySecurityConfiguration(securityConfig) {
    if (!securityConfig) return;

    // Set global security configuration
    window.SECURITY_CONFIG = {
      strictValidation: securityConfig.strictValidation || false,
      auditLogging: securityConfig.auditLogging || false,
      dataEncryption: securityConfig.dataEncryption || false
    };

    console.log('🔒 Applied security configuration:', window.SECURITY_CONFIG);
  }

  /**
   * Create environment banner
   */
  createEnvironmentBanner(color, text) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.insertEnvironmentBanner(color, text);
      });
    } else {
      this.insertEnvironmentBanner(color, text);
    }
  }

  /**
   * Insert environment banner into DOM
   */
  insertEnvironmentBanner(color, text) {
    // Check if banner already exists
    if (document.getElementById('environment-banner')) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'environment-banner';
    banner.style.cssText = `
      position: fixed; 
      top: 0; 
      left: 0; 
      right: 0; 
      z-index: 10000;
      background: ${color || '#ff6b35'}; 
      color: white; 
      text-align: center; 
      padding: 8px;
      font-family: Arial, sans-serif; 
      font-size: 14px; 
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    banner.innerHTML = text;
    
    document.body.insertBefore(banner, document.body.firstChild);
    document.body.style.paddingTop = '40px';
    
    console.log('🏷️ Environment banner created');
  }

  /**
   * Get current environment configuration
   */
  getEnvironmentConfig() {
    if (!this.config || !this.config.environments) {
      return null;
    }
    
    return this.config.environments[this.currentEnvironment.toLowerCase()] || 
           this.config.environments[this.currentEnvironment] ||
           this.config.environments.production;
  }

  /**
   * Get deployment pipeline configuration
   */
  getDeploymentPipeline() {
    return this.config?.deploymentPipeline || null;
  }

  /**
   * Get branch protection configuration
   */
  getBranchProtection() {
    return this.config?.branchProtection || null;
  }

  /**
   * Get environment variables configuration
   */
  getEnvironmentVariables() {
    if (!this.config?.environmentVariables) {
      return null;
    }
    
    return this.config.environmentVariables[this.currentEnvironment.toLowerCase()] || 
           this.config.environmentVariables[this.currentEnvironment] ||
           this.config.environmentVariables.production;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    if (!this.config?.monitoring) {
      return null;
    }
    
    return this.config.monitoring[this.currentEnvironment.toLowerCase()] || 
           this.config.monitoring[this.currentEnvironment] ||
           this.config.monitoring.production;
  }

  /**
   * Get current environment name
   */
  getCurrentEnvironment() {
    return this.currentEnvironment;
  }

  /**
   * Check if current environment is production
   */
  isProduction() {
    return this.currentEnvironment === 'PRODUCTION';
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureName) {
    return window.FEATURE_FLAGS?.[featureName] || false;
  }

  /**
   * Get default configuration
   */
  getDefaultConfiguration() {
    return {
      environments: {
        PRODUCTION: {
          name: 'PRODUCTION',
          displayName: 'Production',
          googleSheets: {
            syncInterval: 300000,
            validationMode: 'strict',
            backupEnabled: true
          },
          features: {
            debugMode: false,
            testFiles: false,
            bypassMode: false,
            performanceMonitoring: true
          },
          ui: {
            showEnvironmentBadge: false,
            enableDebugFeatures: false,
            showTestFiles: false
          }
        },
        DEVELOPMENT: {
          name: 'DEVELOPMENT',
          displayName: 'Development',
          googleSheets: {
            syncInterval: 60000,
            validationMode: 'strict',
            backupEnabled: true
          },
          features: {
            debugMode: true,
            testFiles: true,
            bypassMode: true,
            performanceMonitoring: true
          },
          ui: {
            showEnvironmentBadge: true,
            enableDebugFeatures: true,
            showTestFiles: true,
            bannerColor: '#ff6b35',
            bannerText: '🔧 DEVELOPMENT ENVIRONMENT'
          }
        }
      }
    };
  }

  /**
   * Fallback to default configuration
   */
  fallbackToDefaults() {
    this.config = this.getDefaultConfiguration();
    this.currentEnvironment = 'DEVELOPMENT';
    this.applyEnvironmentConfiguration();
    this.isLoaded = true;
    
    console.log('⚠️ Using fallback configuration');
  }

  /**
   * Get deployment information for display
   */
  getDeploymentInfo() {
    const envConfig = this.getEnvironmentConfig();
    
    return {
      environment: this.currentEnvironment,
      displayName: envConfig?.displayName || this.currentEnvironment,
      deployment: envConfig?.deployment || null,
      isProduction: this.isProduction(),
      features: window.FEATURE_FLAGS || {},
      ui: window.UI_CONFIG || {},
      security: window.SECURITY_CONFIG || {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export configuration for debugging
   */
  exportConfiguration() {
    return {
      config: this.config,
      currentEnvironment: this.currentEnvironment,
      environmentConfig: this.getEnvironmentConfig(),
      featureFlags: window.FEATURE_FLAGS,
      uiConfig: window.UI_CONFIG,
      securityConfig: window.SECURITY_CONFIG,
      isLoaded: this.isLoaded
    };
  }
}

// Global instance
window.DeploymentConfigLoader = new DeploymentConfigLoader();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.DeploymentConfigLoader.initialize();
  });
} else {
  window.DeploymentConfigLoader.initialize();
}

console.log('🚀 Deployment Configuration Loader ready');