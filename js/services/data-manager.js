/**
 * Centralized Data Management Service
 * Handles all data operations including clear, reset, export, and import
 */
class DataManager {
  static isInitialized = false;

  /**
   * Initialize the data manager
   */
  static async init() {
    if (DataManager.isInitialized) return;
    
    // Ensure required dependencies are available
    if (!window.Storage) {
      throw new Error('Storage service not available');
    }
    
    DataManager.isInitialized = true;
    console.log('✅ DataManager initialized');
  }

  /**
   * Clear all data with confirmation
   */
  static async clearAllData() {
    return new Promise((resolve, reject) => {
      // Check if UI components are available
      if (!window.UI || !window.UI.Modal) {
        Utils.Notify.error('UI components not loaded');
        reject(new Error('UI components not available'));
        return;
      }
      
      UI.Modal.confirm(
        'Clear All Data',
        'This will permanently delete all volunteers, events, and attendance records. This action cannot be undone. Continue?',
        async () => {
          try {
            Utils.Loading.show('Clearing data...');
            
            // Clear IndexedDB data (but preserve config)
            await Storage.clearVolunteers();
            await Storage.clearEvents();
            await Storage.clearAttendance();
            
            // Also clear any localStorage items that might contain cached data
            // BUT preserve authentication tokens
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('gurukul_') || key.startsWith('vat_'))) {
                // Preserve authentication token
                if (key !== 'vat_google_token') {
                  keysToRemove.push(key);
                }
              }
            }
            
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
              console.log(`Cleared localStorage key: ${key}`);
            });
            
            Utils.Loading.hide();
            Utils.Notify.success('All data cleared successfully');
            
            // Refresh current view if app is available
            if (window.app && typeof window.app.refreshCurrentView === 'function') {
              window.app.refreshCurrentView();
            } else {
              // If no app available, reload the page to reset the UI
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
            
            resolve(true);
            
          } catch (error) {
            Utils.Loading.hide();
            Utils.Notify.error('Failed to clear data: ' + error.message);
            reject(error);
          }
        },
        () => {
          resolve(false); // User cancelled
        }
      );
    });
  }

  /**
   * Clear all data including configuration
   */
  static async clearAllIncludingConfig() {
    return new Promise((resolve, reject) => {
      // Check if UI components are available
      if (!window.UI || !window.UI.Modal) {
        Utils.Notify.error('UI components not loaded');
        reject(new Error('UI components not available'));
        return;
      }
      
      UI.Modal.confirm(
        'Clear All Data & Settings',
        'This will permanently delete all data AND configuration settings. This action cannot be undone. Continue?',
        async () => {
          try {
            Utils.Loading.show('Clearing all data and settings...');
            
            // Clear everything including config
            await Storage.clearAll();
            
            // Also clear localStorage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('gurukul_') || key.startsWith('vat_'))) {
                keysToRemove.push(key);
              }
            }
            
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
              console.log(`Cleared localStorage key: ${key}`);
            });
            
            Utils.Loading.hide();
            Utils.Notify.success('All data and settings cleared successfully');
            
            // Force page reload since config is cleared
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            resolve(true);
            
          } catch (error) {
            Utils.Loading.hide();
            Utils.Notify.error('Failed to clear data: ' + error.message);
            reject(error);
          }
        },
        () => {
          resolve(false); // User cancelled
        }
      );
    });
  }

  /**
   * Reset local data and sync fresh from Google Sheets
   */
  static async resetAndSyncFromSheets() {
    return new Promise((resolve, reject) => {
      // Check if UI components are available
      if (!window.UI || !window.UI.Modal) {
        Utils.Notify.error('UI components not loaded');
        reject(new Error('UI components not available'));
        return;
      }
      
      // Check if sync system is available
      if (!window.SyncManager) {
        Utils.Notify.error('Sync system not available. Please refresh the page.');
        reject(new Error('Sync system not available'));
        return;
      }

      // Check if Google Sheets is configured
      if (!window.AuthManager?.isAuthenticated || !window.SheetsManager?.isInitialized) {
        Utils.Notify.warning('Google Sheets not configured or authenticated. Please set up Google Sheets first.');
        reject(new Error('Google Sheets not configured'));
        return;
      }

      UI.Modal.confirm(
        'Reset & Sync from Google Sheets',
        '🚨 WARNING: This will permanently delete all local data and sync fresh from Google Sheets.\n\nAll local volunteers, events, and attendance data will be deleted and replaced with data from Google Sheets.\n\nThis action cannot be undone. Continue?',
        async () => {
          try {
            Utils.Loading.show('Resetting and syncing from Google Sheets...');
            
            // Check if method exists
            if (typeof window.SyncManager.resetAndSyncFromSheets !== 'function') {
              throw new Error('Reset functionality not available in current sync system');
            }

            // Perform the reset
            const result = await window.SyncManager.resetAndSyncFromSheets();
            
            Utils.Loading.hide();
            
            // Show success message with details
            const downloaded = result.result?.downloaded || {};
            const totalDownloaded = (downloaded.volunteers || 0) + (downloaded.events || 0) + (downloaded.attendance || 0);
            
            if (totalDownloaded > 0) {
              Utils.Notify.success(`Reset complete! Downloaded ${totalDownloaded} records from Google Sheets.`);
            } else {
              Utils.Notify.success('Reset complete! No data found in Google Sheets.');
            }
            
            // Refresh current view if app is available
            if (window.app && typeof window.app.refreshCurrentView === 'function') {
              window.app.refreshCurrentView();
            }
            
            resolve(result);
            
          } catch (error) {
            Utils.Loading.hide();
            console.error('Reset and sync failed:', error);
            Utils.Notify.error('Failed to reset and sync: ' + error.message);
            reject(error);
          }
        },
        () => {
          resolve(false); // User cancelled
        }
      );
    });
  }

  /**
   * Export all data to JSON file
   */
  static async exportAllData() {
    try {
      Utils.Loading.show('Exporting data...');
      
      const data = {
        volunteers: await Storage.getAllVolunteers(),
        events: await Storage.getAllEvents(),
        attendance: await Storage.getAllAttendance(),
        config: Config,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `volunteer-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      Utils.Loading.hide();
      Utils.Notify.success('Data exported successfully');
      
      return true;
      
    } catch (error) {
      Utils.Loading.hide();
      Utils.Notify.error('Failed to export data: ' + error.message);
      throw error;
    }
  }

  /**
   * Import data from JSON file
   */
  static async importData() {
    return new Promise((resolve, reject) => {
      // Check if UI components are available
      if (!window.UI || !window.UI.Modal) {
        Utils.Notify.error('UI components not loaded');
        reject(new Error('UI components not available'));
        return;
      }
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) {
          resolve(false);
          return;
        }
        
        try {
          Utils.Loading.show('Importing data...');
          
          const text = await file.text();
          const data = JSON.parse(text);
          
          // Validate data structure
          if (!data.volunteers || !data.events || !data.attendance) {
            throw new Error('Invalid data format. Missing required sections.');
          }
          
          // Confirm import
          UI.Modal.confirm(
            'Import Data',
            `This will import ${data.volunteers.length} volunteers, ${data.events.length} events, and ${data.attendance.length} attendance records. Existing data will be merged. Continue?`,
            async () => {
              try {
                // Import data
                if (data.volunteers.length > 0) {
                  for (const volunteer of data.volunteers) {
                    await Storage.saveVolunteer(volunteer);
                  }
                }
                
                if (data.events.length > 0) {
                  for (const event of data.events) {
                    await Storage.saveEvent(event);
                  }
                }
                
                if (data.attendance.length > 0) {
                  for (const record of data.attendance) {
                    await Storage.saveAttendance(record);
                  }
                }
                
                Utils.Loading.hide();
                Utils.Notify.success('Data imported successfully');
                
                // Refresh current view if app is available
                if (window.app && typeof window.app.refreshCurrentView === 'function') {
                  window.app.refreshCurrentView();
                }
                
                resolve(true);
                
              } catch (error) {
                Utils.Loading.hide();
                Utils.Notify.error('Failed to import data: ' + error.message);
                reject(error);
              }
            },
            () => {
              Utils.Loading.hide();
              resolve(false);
            }
          );
          
        } catch (error) {
          Utils.Loading.hide();
          Utils.Notify.error('Failed to read file: ' + error.message);
          reject(error);
        }
      };
      
      input.click();
    });
  }

  /**
   * Get data statistics
   */
  static async getDataStats() {
    try {
      const volunteers = await Storage.getAllVolunteers();
      const events = await Storage.getAllEvents();
      const attendance = await Storage.getAllAttendance();
      
      return {
        volunteers: volunteers.length,
        events: events.length,
        attendance: attendance.length,
        totalRecords: volunteers.length + events.length + attendance.length
      };
    } catch (error) {
      console.error('Failed to get data stats:', error);
      return {
        volunteers: 0,
        events: 0,
        attendance: 0,
        totalRecords: 0
      };
    }
  }
}

// Expose the class globally
window.DataManager = DataManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    DataManager.init().catch(console.error);
  });
} else {
  DataManager.init().catch(console.error);
}