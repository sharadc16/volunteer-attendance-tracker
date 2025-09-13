/**
 * Integration fix for server credential manager with existing Google Sheets code
 * This ensures the banner doesn't show when server credentials are available
 */

class CredentialIntegrationFix {
  constructor() {
    this.initialized = false;
    this.credentialsReady = false;
  }

  /**
   * Initialize the integration fix
   */
  async init() {
    if (this.initialized) return;
    
    console.log('🔧 Initializing credential integration fix...');
    
    try {
      // Wait for server credential manager to initialize
      if (window.serverCredentialManager) {
        await window.serverCredentialManager.initialize();
        this.credentialsReady = window.serverCredentialManager.hasCredentials();
        console.log('🔐 Server credentials ready:', this.credentialsReady);
      }

      // If we have server credentials, remove any existing banner
      if (this.credentialsReady) {
        this.removeBannerIfExists();
        
        // Clear any dismissal flags so banner logic works correctly
        sessionStorage.removeItem('googleSheetsBannerDismissed');
        
        // Update the Google Sheets status
        if (window.StorageManager) {
          await window.StorageManager.checkAndUpdateGoogleSheetsStatus();
        }
      }

      this.initialized = true;
      console.log('✅ Credential integration fix initialized');
      
    } catch (error) {
      console.error('❌ Credential integration fix failed:', error);
    }
  }

  /**
   * Remove the Google Sheets banner if it exists
   */
  removeBannerIfExists() {
    const banner = document.getElementById('googleSheetsSetupBanner');
    if (banner) {
      banner.remove();
      console.log('🗑️ Removed Google Sheets setup banner (server credentials available)');
    }
  }

  /**
   * Override the showGoogleSheetsSetupPrompt to check server credentials first
   */
  overrideShowPrompt() {
    if (!window.StorageManager) return;

    const originalShowPrompt = window.StorageManager.showGoogleSheetsSetupPrompt;
    
    window.StorageManager.showGoogleSheetsSetupPrompt = async () => {
      // Check server credentials first
      if (window.serverCredentialManager) {
        try {
          if (!window.serverCredentialManager.isInitialized) {
            await window.serverCredentialManager.initialize();
          }
          
          if (window.serverCredentialManager.hasCredentials()) {
            console.log('🔐 Server credentials available, not showing setup prompt');
            return;
          }
        } catch (error) {
          console.warn('❌ Error checking server credentials:', error);
        }
      }

      // If no server credentials, show the original prompt
      originalShowPrompt.call(window.StorageManager);
    };

    console.log('🔧 Overridden showGoogleSheetsSetupPrompt to check server credentials');
  }

  /**
   * Start monitoring for banner and remove it if server credentials are available
   */
  startBannerMonitoring() {
    const checkAndRemoveBanner = () => {
      if (this.credentialsReady) {
        this.removeBannerIfExists();
      }
    };

    // Check immediately
    checkAndRemoveBanner();

    // Monitor for banner creation
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.id === 'googleSheetsSetupBanner' && this.credentialsReady) {
            console.log('🔍 Detected banner creation, removing (server credentials available)');
            setTimeout(() => this.removeBannerIfExists(), 100);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('👁️ Started banner monitoring');
  }
}

// Global instance
window.credentialIntegrationFix = new CredentialIntegrationFix();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(async () => {
    await window.credentialIntegrationFix.init();
    window.credentialIntegrationFix.overrideShowPrompt();
    window.credentialIntegrationFix.startBannerMonitoring();
  }, 1000); // Give other scripts time to load
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading, event listener will handle it
} else {
  // DOM is already loaded
  setTimeout(async () => {
    await window.credentialIntegrationFix.init();
    window.credentialIntegrationFix.overrideShowPrompt();
    window.credentialIntegrationFix.startBannerMonitoring();
  }, 1000);
}