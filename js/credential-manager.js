/**
 * Credential Manager UI for Volunteer Attendance Tracker
 * Provides user interface for managing stored credentials
 */

class CredentialManager {
  constructor() {
    this.isUnlocked = false;
    this.credentials = {};
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for credential management
   */
  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      this.createCredentialUI();
      this.checkExistingCredentials();
    });
  }

  /**
   * Create credential management UI
   */
  createCredentialUI() {
    // Create credential modal
    const modal = document.createElement('div');
    modal.id = 'credentialModal';
    modal.className = 'credential-modal';
    modal.innerHTML = `
      <div class="credential-modal-content">
        <div class="credential-header">
          <h3>🔐 Credential Manager</h3>
          <button class="close-btn" onclick="credentialManager.closeModal()">&times;</button>
        </div>
        
        <div id="unlockSection" class="credential-section">
          <h4>Enter Master Password</h4>
          <p>Your master password encrypts all stored credentials locally.</p>
          <input type="password" id="masterPassword" placeholder="Master password">
          <div class="credential-buttons">
            <button onclick="credentialManager.unlock()">Unlock</button>
            <button onclick="credentialManager.createNewVault()">Create New Vault</button>
          </div>
        </div>

        <div id="manageSection" class="credential-section" style="display: none;">
          <h4>Manage Credentials</h4>
          
          <div class="add-credential">
            <h5>Add New Credential</h5>
            <input type="text" id="newCredKey" placeholder="Credential name (e.g., 'google_sheets_api_key')">
            <input type="password" id="newCredValue" placeholder="Credential value">
            <button onclick="credentialManager.addCredential()">Add Credential</button>
          </div>

          <div class="existing-credentials">
            <h5>Existing Credentials</h5>
            <div id="credentialList"></div>
          </div>

          <div class="credential-actions">
            <button onclick="credentialManager.exportCredentials()">Export (Encrypted)</button>
            <button onclick="credentialManager.importCredentials()">Import</button>
            <button class="danger" onclick="credentialManager.clearAllCredentials()">Clear All</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add credential button to main UI
    const credButton = document.createElement('button');
    credButton.id = 'credentialButton';
    credButton.className = 'credential-toggle-btn';
    credButton.innerHTML = '🔐 Credentials';
    credButton.onclick = () => this.openModal();
    
    // Add to header or create floating button
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header) {
      header.appendChild(credButton);
    } else {
      credButton.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        background: #007bff; color: white; border: none; padding: 10px 15px;
        border-radius: 5px; cursor: pointer; font-size: 14px;
      `;
      document.body.appendChild(credButton);
    }
  }

  /**
   * Check if credentials already exist
   */
  checkExistingCredentials() {
    if (window.secureStorage && window.secureStorage.hasCredentials()) {
      document.getElementById('credentialButton').innerHTML = '🔐 Credentials (Locked)';
    }
  }

  /**
   * Open credential modal
   */
  openModal() {
    document.getElementById('credentialModal').style.display = 'flex';
    
    if (this.isUnlocked) {
      this.showManageSection();
    } else {
      this.showUnlockSection();
    }
  }

  /**
   * Close credential modal
   */
  closeModal() {
    document.getElementById('credentialModal').style.display = 'none';
  }

  /**
   * Show unlock section
   */
  showUnlockSection() {
    document.getElementById('unlockSection').style.display = 'block';
    document.getElementById('manageSection').style.display = 'none';
  }

  /**
   * Show manage section
   */
  showManageSection() {
    document.getElementById('unlockSection').style.display = 'none';
    document.getElementById('manageSection').style.display = 'block';
    this.refreshCredentialList();
  }

  /**
   * Unlock credential vault
   */
  async unlock() {
    const password = document.getElementById('masterPassword').value;
    if (!password) {
      alert('Please enter your master password');
      return;
    }

    const success = await window.secureStorage.initialize(password);
    if (success) {
      this.isUnlocked = true;
      document.getElementById('credentialButton').innerHTML = '🔓 Credentials (Unlocked)';
      this.showManageSection();
      
      // Load credentials into memory for quick access
      await this.loadCredentials();
    } else {
      alert('Failed to unlock credentials. Check your password.');
    }
  }

  /**
   * Create new credential vault
   */
  async createNewVault() {
    const password = document.getElementById('masterPassword').value;
    if (!password) {
      alert('Please enter a master password for your new vault');
      return;
    }

    if (window.secureStorage.hasCredentials()) {
      if (!confirm('This will clear existing credentials. Continue?')) {
        return;
      }
      window.secureStorage.clearAll();
    }

    const success = await window.secureStorage.initialize(password);
    if (success) {
      this.isUnlocked = true;
      document.getElementById('credentialButton').innerHTML = '🔓 Credentials (Unlocked)';
      this.showManageSection();
      alert('New credential vault created successfully!');
    } else {
      alert('Failed to create credential vault');
    }
  }

  /**
   * Add new credential
   */
  async addCredential() {
    const key = document.getElementById('newCredKey').value;
    const value = document.getElementById('newCredValue').value;

    if (!key || !value) {
      alert('Please enter both credential name and value');
      return;
    }

    const success = await window.secureStorage.storeCredential(key, value);
    if (success) {
      this.credentials[key] = value;
      document.getElementById('newCredKey').value = '';
      document.getElementById('newCredValue').value = '';
      this.refreshCredentialList();
      alert('Credential added successfully!');
    } else {
      alert('Failed to add credential');
    }
  }

  /**
   * Load all credentials into memory
   */
  async loadCredentials() {
    const keys = window.secureStorage.listCredentials();
    this.credentials = {};
    
    for (const key of keys) {
      const value = await window.secureStorage.getCredential(key);
      if (value) {
        this.credentials[key] = value;
      }
    }
  }

  /**
   * Get credential value
   */
  getCredential(key) {
    return this.credentials[key] || null;
  }

  /**
   * Refresh credential list display
   */
  refreshCredentialList() {
    const listContainer = document.getElementById('credentialList');
    const keys = window.secureStorage.listCredentials();
    
    if (keys.length === 0) {
      listContainer.innerHTML = '<p>No credentials stored</p>';
      return;
    }

    listContainer.innerHTML = keys.map(key => `
      <div class="credential-item">
        <span class="credential-name">${key}</span>
        <button onclick="credentialManager.removeCredential('${key}')" class="remove-btn">Remove</button>
      </div>
    `).join('');
  }

  /**
   * Remove credential
   */
  async removeCredential(key) {
    if (confirm(`Remove credential "${key}"?`)) {
      window.secureStorage.removeCredential(key);
      delete this.credentials[key];
      this.refreshCredentialList();
    }
  }

  /**
   * Clear all credentials
   */
  clearAllCredentials() {
    if (confirm('This will permanently delete all stored credentials. Continue?')) {
      window.secureStorage.clearAll();
      this.credentials = {};
      this.isUnlocked = false;
      document.getElementById('credentialButton').innerHTML = '🔐 Credentials';
      this.closeModal();
      alert('All credentials cleared');
    }
  }

  /**
   * Export credentials (encrypted)
   */
  exportCredentials() {
    const data = localStorage.getItem('vat_secure_credentials');
    if (!data) {
      alert('No credentials to export');
      return;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vat-credentials-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import credentials
   */
  importCredentials() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          localStorage.setItem('vat_secure_credentials', JSON.stringify(data));
          alert('Credentials imported successfully! Please unlock to access them.');
          this.closeModal();
        } catch (error) {
          alert('Invalid credential file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}

// Global instance
window.credentialManager = new CredentialManager();