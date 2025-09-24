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
   * Detect the current deployment context based on Netlify configuration
   */
  detectContext() {
    const hostname = window.location.hostname;
    const url = window.location.href;

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
      return {
        type: 'local',
        name: 'Local Development',
        description: 'Running locally (localhost or local server)',
        isProduction: false,
        netlifyContext: 'local-development',
        branch: 'local',
        expectedSpreadsheetContext: 'Local development (Netlify CLI)'
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
      // Try to get from Netlify Functions API first
      if (window.NetlifyCredentialsLoader && this.context.type !== 'local') {
        const credentials = await window.NetlifyCredentialsLoader.loadFromAPI();
        if (credentials && credentials.spreadsheetId) {
          this.actualSpreadsheetId = credentials.spreadsheetId;
          console.log(`📋 Loaded spreadsheet ID from Netlify: ${this.actualSpreadsheetId.substring(0, 20)}...`);
          return this.actualSpreadsheetId;
        }
      }

      // Fallback to CredentialManager
      if (window.CredentialManager) {
        const credentials = await window.CredentialManager.loadCredentials();
        if (credentials && credentials.spreadsheetId) {
          this.actualSpreadsheetId = credentials.spreadsheetId;
          console.log(`📋 Loaded spreadsheet ID from CredentialManager: ${this.actualSpreadsheetId.substring(0, 20)}...`);
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

// Global instance
window.DeploymentContext = new DeploymentContext();

// Log context on initialization
window.DeploymentContext.logContext();

console.log('🌐 Deployment Context initialized');