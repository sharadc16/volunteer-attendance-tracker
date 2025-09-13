/**
 * Secure Storage Manager for Volunteer Attendance Tracker
 * Handles encrypted storage of API keys and credentials in browser
 */

class SecureStorage {
  constructor() {
    this.storageKey = 'vat_secure_credentials';
    this.encryptionKey = null;
    this.isInitialized = false;
  }

  /**
   * Initialize secure storage with user's master password
   * @param {string} masterPassword - User's master password for encryption
   */
  async initialize(masterPassword) {
    try {
      // Create encryption key from master password
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(masterPassword),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive actual encryption key
      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('volunteer-attendance-tracker-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize secure storage:', error);
      return false;
    }
  }

  /**
   * Store encrypted credential
   * @param {string} key - Credential identifier
   * @param {string} value - Credential value
   */
  async storeCredential(key, value) {
    if (!this.isInitialized) {
      throw new Error('Secure storage not initialized');
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ key, value, timestamp: Date.now() }));
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        data
      );

      // Store encrypted data with IV
      const storageData = {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedData))
      };

      const existingData = this.getStoredData();
      existingData[key] = storageData;
      
      localStorage.setItem(this.storageKey, JSON.stringify(existingData));
      return true;
    } catch (error) {
      console.error('Failed to store credential:', error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt credential
   * @param {string} key - Credential identifier
   */
  async getCredential(key) {
    if (!this.isInitialized) {
      throw new Error('Secure storage not initialized');
    }

    try {
      const storedData = this.getStoredData();
      const credentialData = storedData[key];
      
      if (!credentialData) {
        return null;
      }

      // Reconstruct IV and encrypted data
      const iv = new Uint8Array(credentialData.iv);
      const encryptedData = new Uint8Array(credentialData.data);

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encryptedData
      );

      const decoder = new TextDecoder();
      const result = JSON.parse(decoder.decode(decryptedData));
      
      return result.value;
    } catch (error) {
      console.error('Failed to retrieve credential:', error);
      return null;
    }
  }

  /**
   * Remove credential
   * @param {string} key - Credential identifier
   */
  removeCredential(key) {
    const storedData = this.getStoredData();
    delete storedData[key];
    localStorage.setItem(this.storageKey, JSON.stringify(storedData));
  }

  /**
   * List all stored credential keys
   */
  listCredentials() {
    const storedData = this.getStoredData();
    return Object.keys(storedData);
  }

  /**
   * Clear all credentials
   */
  clearAll() {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get raw stored data
   */
  getStoredData() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Check if credentials exist
   */
  hasCredentials() {
    return Object.keys(this.getStoredData()).length > 0;
  }
}

// Global instance
window.secureStorage = new SecureStorage();