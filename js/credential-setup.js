class CredentialSetup {
  constructor() {
    this.credentialManager = new CredentialManager();
    this.isSetup = false;
    this.currentCredentials = null;
  }

  // Create the setup modal HTML
  createSetupModal() {
    const modal = document.createElement('div');
    modal.id = 'credential-setup-modal';
    modal.className = 'credential-modal';
    modal.innerHTML = `
      <div class="credential-modal-content">
        <div class="credential-header">
          <h3>🔐 Secure Credential Setup</h3>
          <p>Store your API keys and credentials securely in your browser</p>
        </div>
        
        <form id="credential-form">
          <div class="credential-section">
            <label for="master-password">Master Password:</label>
            <input type="password" id="master-password" placeholder="Create a secure password" required>
            <small>This password encrypts your credentials locally</small>
          </div>

          <div class="credential-section">
            <label for="api-key">API Key:</label>
            <input type="password" id="api-key" placeholder="Enter your API key" required>
          </div>

          <div class="credential-section">
            <label for="api-secret">API Secret:</label>
            <input type="password" id="api-secret" placeholder="Enter your API secret">
          </div>

          <div class="credential-section">
            <label for="service-url">Service URL:</label>
            <input type="url" id="service-url" placeholder="https://api.example.com" value="https://api.example.com">
          </div>

          <div class="credential-section">
            <label for="organization-id">Organization ID:</label>
            <input type="text" id="organization-id" placeholder="Your organization identifier">
          </div>

          <div class="credential-actions">
            <button type="submit" class="btn-primary">💾 Save Credentials</button>
            <button type="button" id="cancel-setup" class="btn-secondary">Cancel</button>
          </div>
        </form>

        <div class="credential-info">
          <h4>🛡️ Security Notes:</h4>
          <ul>
            <li>Credentials are encrypted and stored only in your browser</li>
            <li>Your master password is never stored anywhere</li>
            <li>Clear browser data will remove stored credentials</li>
            <li>Use a strong, unique master password</li>
          </ul>
        </div>
      </div>
    `;
    return modal;
  }

  // Create login modal for existing credentials
  createLoginModal() {
    const modal = document.createElement('div');
    modal.id = 'credential-login-modal';
    modal.className = 'credential-modal';
    modal.innerHTML = `
      <div class="credential-modal-content">
        <div class="credential-header">
          <h3>🔓 Enter Master Password</h3>
          <p>Unlock your stored credentials</p>
        </div>
        
        <form id="credential-login-form">
          <div class="credential-section">
            <label for="login-password">Master Password:</label>
            <input type="password" id="login-password" placeholder="Enter your master password" required>
          </div>

          <div class="credential-actions">
            <button type="submit" class="btn-primary">🔓 Unlock</button>
            <button type="button" id="reset-credentials" class="btn-danger">🗑️ Reset All</button>
          </div>
        </form>

        <div id="login-error" class="error-message" style="display: none;"></div>
      </div>
    `;
    return modal;
  }

  // Show setup or login modal
  async showCredentialModal() {
    return new Promise((resolve, reject) => {
      const hasCredentials = this.credentialManager.hasStoredCredentials();
      const modal = hasCredentials ? this.createLoginModal() : this.createSetupModal();
      
      document.body.appendChild(modal);
      
      // Handle setup form
      if (!hasCredentials) {
        const form = modal.querySelector('#credential-form');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const masterPassword = document.getElementById('master-password').value;
          const credentials = {
            apiKey: document.getElementById('api-key').value,
            apiSecret: document.getElementById('api-secret').value,
            serviceUrl: document.getElementById('service-url').value,
            organizationId: document.getElementById('organization-id').value,
            createdAt: new Date().toISOString()
          };

          const success = await this.credentialManager.storeCredentials(credentials, masterPassword);
          if (success) {
            this.currentCredentials = credentials;
            this.isSetup = true;
            document.body.removeChild(modal);
            resolve(credentials);
          } else {
            alert('Failed to store credentials. Please try again.');
          }
        });

        modal.querySelector('#cancel-setup').addEventListener('click', () => {
          document.body.removeChild(modal);
          reject(new Error('Setup cancelled'));
        });
      } else {
        // Handle login form
        const form = modal.querySelector('#credential-login-form');
        const errorDiv = modal.querySelector('#login-error');
        
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const masterPassword = document.getElementById('login-password').value;
          const credentials = await this.credentialManager.getCredentials(masterPassword);
          
          if (credentials) {
            this.currentCredentials = credentials;
            this.isSetup = true;
            document.body.removeChild(modal);
            resolve(credentials);
          } else {
            errorDiv.textContent = 'Invalid password. Please try again.';
            errorDiv.style.display = 'block';
          }
        });

        modal.querySelector('#reset-credentials').addEventListener('click', () => {
          if (confirm('Are you sure you want to delete all stored credentials? This cannot be undone.')) {
            this.credentialManager.clearCredentials();
            document.body.removeChild(modal);
            this.showCredentialModal().then(resolve).catch(reject);
          }
        });
      }
    });
  }

  // Initialize credentials (call this on app startup)
  async initialize() {
    if (!this.isSetup) {
      try {
        this.currentCredentials = await this.showCredentialModal();
        this.isSetup = true;
        return this.currentCredentials;
      } catch (error) {
        console.error('Credential setup failed:', error);
        throw error;
      }
    }
    return this.currentCredentials;
  }

  // Get current credentials
  getCredentials() {
    return this.currentCredentials;
  }

  // Check if setup is complete
  isReady() {
    return this.isSetup && this.currentCredentials !== null;
  }

  // Logout (clear in-memory credentials)
  logout() {
    this.currentCredentials = null;
    this.isSetup = false;
  }
}

// Export for use in other modules
window.CredentialSetup = CredentialSetup;