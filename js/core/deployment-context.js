/**
 * Deployment Context Detection
 * Identifies which Netlify deployment context the app is running in
 * and dynamically loads the appropriate spreadsheet ID from Netlify environment variables
 */
class DeploymentContext {
  constructor() {
    this.context = this.detectContext();
    this.actualSpreadsheetId = null; // Will be loaded dynamically
  }

  /**
   * Detect if running with Netlify CLI (netlify dev)
   */
  detectNetlifyCLI() {
    // Netlify CLI typically runs on port 8888 by default
    const port = window.location.port;
    
    // Check for common Netlify CLI indicators
    const isNetlifyPort = port === '8888' || port === '3999';
    
    // Check if Netlify Functions are available (indicates Netlify CLI)
    const hasNetlifyFunctions = window.location.pathname.includes('/.netlify/') || 
                               document.querySelector('script[src*="/.netlify/"]');
    
    // Check for Netlify CLI specific headers or environment markers
    // (These would be set by the Netlify CLI development server)
    const hasNetlifyMarkers = document.querySelector('meta[name="netlify-cli"]') ||
                             window.NETLIFY_DEV === true;
    
    return isNetlifyPort || hasNetlifyFunctions || hasNetlifyMarkers;
  }

  /**
   * Detect the current deployment context based on Netlify configuration
   */
  detectContext() {
    const hostname = window.location.hostname;

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
      // Check if running with Netlify CLI (netlify dev)
      const isNetlifyCLI = this.detectNetlifyCLI();
      
      return {
        type: 'local',
        name: isNetlifyCLI ? 'Local Development (Netlify CLI)' : 'Local Development',
        description: isNetlifyCLI ? 
          'Running locally with Netlify CLI (netlify dev) - environment variables available' : 
          'Running locally with basic server - using fallback credentials',
        isProduction: false,
        netlifyContext: 'local-development',
        branch: 'local',
        expectedSpreadsheetContext: 'Local development (Netlify CLI)',
        hasNetlifyCLI: isNetlifyCLI
      };
    }

    // Netlify deployments
    if (hostname.includes('netlify.app')) {
      // Production deployment (main branch)
      if (hostname === 'gurukul-attendance.netlify.app') {
        return {
          type: 'production',
          name: 'Production',
          description: 'Main production deployment (main branch)',
          isProduction: true,
          netlifyContext: 'production',
          branch: 'main',
          expectedSpreadsheetContext: 'Production'
        };
      }

      // Deploy previews (pull requests against main/dev branches)
      if (hostname.includes('deploy-preview-')) {
        const prNumber = hostname.match(/deploy-preview-(\d+)/)?.[1];
        return {
          type: 'deploy-preview',
          name: 'Deploy Preview',
          description: `Pull request preview deployment${prNumber ? ` (PR #${prNumber})` : ''}`,
          isProduction: false,
          netlifyContext: 'deploy-previews',
          branch: 'pr-preview',
          prNumber: prNumber,
          expectedSpreadsheetContext: 'Deploy Previews'
        };
      }

      // Branch deploys (dev branch)
      if (hostname.includes('dev--') && hostname.includes('gurukul-attendance.netlify.app')) {
        return {
          type: 'branch-deploy',
          name: 'Branch Deploy (Dev)',
          description: 'Development branch deployment (dev branch)',
          isProduction: false,
          netlifyContext: 'branch-deploys',
          branch: 'dev',
          expectedSpreadsheetContext: 'Branch deploys'
        };
      }

      // Other branch deploys or Netlify deployments
      if (hostname.includes('--gurukul-attendance.netlify.app')) {
        const branchMatch = hostname.match(/^([^-]+)--/);
        const branchName = branchMatch ? branchMatch[1] : 'unknown';
        
        return {
          type: 'branch-deploy',
          name: `Branch Deploy (${branchName})`,
          description: `Feature branch deployment (${branchName} branch)`,
          isProduction: false,
          netlifyContext: 'branch-deploys',
          branch: branchName,
          expectedSpreadsheetContext: 'Branch deploys'
        };
      }

      // Other Netlify deployments (preview server, etc.)
      return {
        type: 'netlify-other',
        name: 'Netlify Deployment',
        description: 'Other Netlify deployment context',
        isProduction: false,
        netlifyContext: 'preview-server',
        branch: 'unknown',
        expectedSpreadsheetContext: 'Preview Server'
      };
    }

    // GitHub Pages (backup deployment)
    if (hostname.includes('github.io')) {
      return {
        type: 'github-pages',
        name: 'GitHub Pages',
        description: 'GitHub Pages deployment (backup)',
        isProduction: false,
        netlifyContext: null,
        branch: 'main',
        expectedSpreadsheetContext: null
      };
    }

    // Unknown deployment
    return {
      type: 'unknown',
      name: 'Unknown',
      description: 'Unknown deployment context',
      isProduction: false,
      netlifyContext: null,
      branch: 'unknown',
      expectedSpreadsheetContext: null
    };
  }

  /**
   * Get current deployment context
   */
  getContext() {
    return this.context;
  }

  /**
   * Check if running in production
   */
  isProduction() {
    return this.context.isProduction;
  }

  /**
   * Load actual spreadsheet ID from Netlify environment variables
   */
  async loadActualSpreadsheetId() {
    try {
      // For Netlify CLI local development, try Functions API first
      if (window.NetlifyCredentialsLoader && (this.context.type !== 'local' || this.context.hasNetlifyCLI)) {
        try {
          const credentials = await window.NetlifyCredentialsLoader.loadFromAPI();
          if (credentials && credentials.spreadsheetId) {
            this.actualSpreadsheetId = credentials.spreadsheetId;
            console.log(`📋 Loaded spreadsheet ID from Netlify Functions: ${this.actualSpreadsheetId.substring(0, 20)}...`);
            return this.actualSpreadsheetId;
          }
        } catch (error) {
          console.log('⚠️ Netlify Functions API not available, trying fallback methods');
        }
      }

      // Fallback to CredentialManager (includes local-env.js)
      if (window.CredentialManager) {
        const credentials = await window.CredentialManager.loadCredentials();
        if (credentials && credentials.spreadsheetId) {
          this.actualSpreadsheetId = credentials.spreadsheetId;
          const source = this.context.hasNetlifyCLI ? 'Netlify CLI environment' : 'local fallback';
          console.log(`📋 Loaded spreadsheet ID from ${source}: ${this.actualSpreadsheetId.substring(0, 20)}...`);
          return this.actualSpreadsheetId;
        }
      }

      console.log('⚠️ No spreadsheet ID found in environment variables');
      return null;

    } catch (error) {
      console.warn('Error loading spreadsheet ID:', error);
      return null;
    }
  }

  /**
   * Get actual spreadsheet ID (loads if not already loaded)
   */
  async getActualSpreadsheetId() {
    if (!this.actualSpreadsheetId) {
      await this.loadActualSpreadsheetId();
    }
    return this.actualSpreadsheetId;
  }

  /**
   * Get deployment context information including actual spreadsheet ID
   */
  async getContextWithSpreadsheet() {
    const spreadsheetId = await this.getActualSpreadsheetId();
    
    return {
      ...this.context,
      actualSpreadsheetId: spreadsheetId,
      hasSpreadsheetId: !!spreadsheetId
    };
  }

  /**
   * Get deployment info for display
   */
  getDeploymentInfo() {
    return {
      context: this.context,
      url: window.location.href,
      hostname: window.location.hostname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100) + '...'
    };
  }

  /**
   * Log deployment context information
   */
  async logContext() {
    console.log('🌐 Deployment Context Detection:');
    console.log(`📍 Context: ${this.context.name} (${this.context.type})`);
    console.log(`📝 Description: ${this.context.description}`);
    console.log(`🔒 Production: ${this.context.isProduction ? 'Yes' : 'No'}`);
    console.log(`🏷️ Netlify Context: ${this.context.netlifyContext || 'None'}`);
    console.log(`� Bran ch: ${this.context.branch || 'Unknown'}`);
    console.log(`📊 Expected Spreadsheet Context: ${this.context.expectedSpreadsheetContext || 'None'}`);
    console.log(`🌍 URL: ${window.location.href}`);
    
    // Load and display actual spreadsheet ID
    const spreadsheetId = await this.getActualSpreadsheetId();
    if (spreadsheetId) {
      console.log(`📋 Actual Spreadsheet ID: ${spreadsheetId.substring(0, 20)}...`);
      console.log(`✅ Spreadsheet loaded from Netlify environment variables`);
    } else {
      console.log(`📋 Spreadsheet ID: Not configured`);
      console.log(`⚠️ Check Netlify environment variables for VOLUNTEER_SPREADSHEET_ID`);
    }
  }

  /**
   * Get context info for display (async version)
   */
  async getContextInfo() {
    const spreadsheetId = await this.getActualSpreadsheetId();
    
    return {
      context: this.context,
      spreadsheetId: spreadsheetId,
      hasSpreadsheet: !!spreadsheetId,
      url: window.location.href,
      hostname: window.location.hostname,
      timestamp: new Date().toISOString()
    };
  }
}

// Global instance (prevent multiple instantiations)
if (!window.DeploymentContext) {
  window.DeploymentContext = new DeploymentContext();
  
  // Log context on initialization
  window.DeploymentContext.logContext();
  
  console.log('🌐 Deployment Context initialized');
} else {
  console.log('🌐 Deployment Context already initialized, skipping');
}