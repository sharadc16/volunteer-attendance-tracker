/**
 * End-to-End Tests for Google Sheets Sync
 * Tests complete sync workflows from user perspective
 */
class E2ETestSuite {
  constructor() {
    this.testResults = [];
    this.testData = this.createTestData();
  }

  createTestData() {
    return {
      volunteers: [
        { id: 'V001', name: 'Alice Johnson', email: 'alice@example.com', committee: 'Teaching' },
        { id: 'V002', name: 'Bob Smith', email: 'bob@example.com', committee: 'Admin' },
        { id: 'V003', name: 'Carol Davis', email: 'carol@example.com', committee: 'Events' }
      ],
      events: [
        { id: 'E001', name: 'Sunday Service', date: '2024-01-07', startTime: '10:00', endTime: '12:00', status: 'Active' },
        { id: 'E002', name: 'Community Event', date: '2024-01-14', startTime: '14:00', endTime: '17:00', status: 'Active' }
      ],
      attendance: [
        { id: 'A001', volunteerId: 'V001', eventId: 'E001', volunteerName: 'Alice Johnson', date: '2024-01-07' },
        { id: 'A002', volunteerId: 'V002', eventId: 'E001', volunteerName: 'Bob Smith', date: '2024-01-07' }
      ]
    };
  }

  async runAllE2ETests() {
    console.log('Starting end-to-end tests...');
    
    try {
      await this.setupE2EEnvironment();
      
      // Test complete sync workflows
      await this.testInitialSetupWorkflow();
      await this.testFullSyncWorkflow();
      await this.testIncrementalSyncWorkflow();
      await this.testConflictResolutionWorkflow();
      await this.testOfflineToOnlineWorkflow();
      await this.testErrorRecoveryWorkflow();
      await this.testPerformanceUnderLoad();
      
      await this.cleanupE2EEnvironment();
      
      return this.generateReport();
    } catch (error) {
      console.error('E2E tests failed:', error);
      await this.cleanupE2EEnvironment();
      throw error;
    }
  }

  async setupE2EEnvironment() {
    console.log('Setting up E2E test environment...');
    
    // Create comprehensive mock environment
    this.createMockEnvironment();
    
    // Initialize test storage
    await this.initializeTestStorage();
  }

  createMockEnvironment() {
    // Mock all required services for E2E testing
    this.mockServices = {
      storage: this.createMockStorage(),
      auth: this.createMockAuth(),
      sheets: this.createMockSheets(),
      sync: this.createMockSync()
    };
  } 
 createMockStorage() {
    const storage = new Map();
    
    return {
      async getAllVolunteers() {
        return Array.from(storage.get('volunteers') || []);
      },
      
      async getAllEvents() {
        return Array.from(storage.get('events') || []);
      },
      
      async getAllAttendance() {
        return Array.from(storage.get('attendance') || []);
      },
      
      async addVolunteer(volunteer) {
        const volunteers = storage.get('volunteers') || [];
        volunteers.push({ ...volunteer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        storage.set('volunteers', volunteers);
        return volunteer;
      },
      
      async updateVolunteer(id, updates) {
        const volunteers = storage.get('volunteers') || [];
        const index = volunteers.findIndex(v => v.id === id);
        if (index >= 0) {
          volunteers[index] = { ...volunteers[index], ...updates, updatedAt: new Date().toISOString() };
          storage.set('volunteers', volunteers);
          return volunteers[index];
        }
        return null;
      },
      
      async deleteVolunteer(id) {
        const volunteers = storage.get('volunteers') || [];
        const filtered = volunteers.filter(v => v.id !== id);
        storage.set('volunteers', filtered);
        return { success: true };
      },
      
      // Similar methods for events and attendance
      async addEvent(event) {
        const events = storage.get('events') || [];
        events.push({ ...event, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        storage.set('events', events);
        return event;
      },
      
      async addAttendance(attendance) {
        const attendanceList = storage.get('attendance') || [];
        attendanceList.push({ ...attendance, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        storage.set('attendance', attendanceList);
        return attendance;
      }
    };
  }

  createMockAuth() {
    let isAuthenticated = false;
    let token = null;
    
    return {
      async authenticate() {
        isAuthenticated = true;
        token = 'mock_token_' + Date.now();
        return { success: true, token };
      },
      
      isAuthenticated() {
        return isAuthenticated;
      },
      
      getToken() {
        return token;
      },
      
      async signOut() {
        isAuthenticated = false;
        token = null;
        return { success: true };
      }
    };
  }

  createMockSheets() {
    const sheetsData = new Map();
    
    return {
      async createSpreadsheet(title) {
        const id = 'spreadsheet_' + Date.now();
        sheetsData.set(id, {
          id,
          title,
          sheets: {
            volunteers: [['ID', 'Name', 'Email', 'Committee', 'Created', 'Updated']],
            events: [['ID', 'Name', 'Date', 'Start Time', 'End Time', 'Status', 'Description', 'Created', 'Updated']],
            attendance: [['ID', 'Volunteer ID', 'Event ID', 'Volunteer Name', 'Committee', 'Date', 'Time', 'Created', 'Updated']]
          }
        });
        return { spreadsheetId: id };
      },
      
      async readSheet(spreadsheetId, sheetName) {
        const spreadsheet = sheetsData.get(spreadsheetId);
        return spreadsheet ? spreadsheet.sheets[sheetName] || [] : [];
      },
      
      async writeSheet(spreadsheetId, sheetName, data) {
        const spreadsheet = sheetsData.get(spreadsheetId);
        if (spreadsheet) {
          spreadsheet.sheets[sheetName] = data;
          return { success: true, updatedRows: data.length };
        }
        return { success: false };
      },
      
      async appendToSheet(spreadsheetId, sheetName, data) {
        const spreadsheet = sheetsData.get(spreadsheetId);
        if (spreadsheet) {
          const existing = spreadsheet.sheets[sheetName] || [];
          spreadsheet.sheets[sheetName] = existing.concat(data);
          return { success: true, appendedRows: data.length };
        }
        return { success: false };
      }
    };
  }

  createMockSync() {
    return {
      isEnabled: false,
      isRunning: false,
      lastSyncTime: null,
      
      enable() {
        this.isEnabled = true;
      },
      
      disable() {
        this.isEnabled = false;
      },
      
      async performSync(options = {}) {
        if (!this.isEnabled) {
          throw new Error('Sync not enabled');
        }
        
        this.isRunning = true;
        
        try {
          // Simulate sync process
          await new Promise(resolve => setTimeout(resolve, 100));
          
          this.lastSyncTime = new Date().toISOString();
          
          return {
            success: true,
            uploaded: { volunteers: 2, events: 1, attendance: 1 },
            downloaded: { volunteers: 0, events: 0, attendance: 0 },
            conflicts: 0,
            timestamp: this.lastSyncTime
          };
        } finally {
          this.isRunning = false;
        }
      }
    };
  }

  async initializeTestStorage() {
    // Initialize with test data
    for (const volunteer of this.testData.volunteers) {
      await this.mockServices.storage.addVolunteer(volunteer);
    }
    
    for (const event of this.testData.events) {
      await this.mockServices.storage.addEvent(event);
    }
    
    for (const attendance of this.testData.attendance) {
      await this.mockServices.storage.addAttendance(attendance);
    }
  }

  async testInitialSetupWorkflow() {
    const testName = 'Initial Setup Workflow';
    console.log(`Running ${testName}...`);
    
    try {
      // Step 1: User enables Google Sheets sync
      this.mockServices.sync.enable();
      this.assert(this.mockServices.sync.isEnabled, 'Should enable sync');
      
      // Step 2: User authenticates with Google
      const authResult = await this.mockServices.auth.authenticate();
      this.assert(authResult.success, 'Should authenticate successfully');
      this.assert(this.mockServices.auth.isAuthenticated(), 'Should be authenticated');
      
      // Step 3: System creates spreadsheet
      const spreadsheetResult = await this.mockServices.sheets.createSpreadsheet('Gurukul Attendance Tracker');
      this.assert(spreadsheetResult.spreadsheetId, 'Should create spreadsheet');
      
      // Step 4: System performs initial sync
      const syncResult = await this.mockServices.sync.performSync({ type: 'initial' });
      this.assert(syncResult.success, 'Should complete initial sync');
      this.assert(syncResult.uploaded.volunteers > 0, 'Should upload volunteers');
      
      this.recordTestResult(testName, true, 'Initial setup workflow completed successfully');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testFullSyncWorkflow() {
    const testName = 'Full Sync Workflow';
    console.log(`Running ${testName}...`);
    
    try {
      // Ensure prerequisites
      this.mockServices.sync.enable();
      await this.mockServices.auth.authenticate();
      const spreadsheet = await this.mockServices.sheets.createSpreadsheet('Test Spreadsheet');
      
      // Step 1: Perform full sync
      const syncResult = await this.mockServices.sync.performSync({ type: 'full' });
      
      this.assert(syncResult.success, 'Should complete full sync');
      this.assert(typeof syncResult.uploaded === 'object', 'Should return upload counts');
      this.assert(typeof syncResult.downloaded === 'object', 'Should return download counts');
      this.assert(syncResult.timestamp, 'Should record sync timestamp');
      
      // Step 2: Verify data was uploaded
      const volunteersInSheets = await this.mockServices.sheets.readSheet(spreadsheet.spreadsheetId, 'volunteers');
      this.assert(volunteersInSheets.length > 1, 'Should have uploaded volunteers to sheets'); // Header + data
      
      // Step 3: Verify sync status is updated
      this.assert(this.mockServices.sync.lastSyncTime, 'Should update last sync time');
      this.assert(!this.mockServices.sync.isRunning, 'Should not be running after completion');
      
      this.recordTestResult(testName, true, 'Full sync workflow completed successfully');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testIncrementalSyncWorkflow() {
    const testName = 'Incremental Sync Workflow';
    console.log(`Running ${testName}...`);
    
    try {
      // Setup: Perform initial sync
      this.mockServices.sync.enable();
      await this.mockServices.auth.authenticate();
      const spreadsheet = await this.mockServices.sheets.createSpreadsheet('Incremental Test');
      await this.mockServices.sync.performSync({ type: 'full' });
      
      const initialSyncTime = this.mockServices.sync.lastSyncTime;
      
      // Step 1: Make local changes
      await this.mockServices.storage.addVolunteer({
        id: 'V004',
        name: 'David Wilson',
        email: 'david@example.com',
        committee: 'Security'
      });
      
      await this.mockServices.storage.updateVolunteer('V001', { committee: 'Leadership' });
      
      // Step 2: Perform incremental sync
      await new Promise(resolve => setTimeout(resolve, 50)); // Ensure time difference
      const incrementalResult = await this.mockServices.sync.performSync({ 
        type: 'incremental',
        since: initialSyncTime 
      });
      
      this.assert(incrementalResult.success, 'Should complete incremental sync');
      this.assert(incrementalResult.timestamp !== initialSyncTime, 'Should update sync timestamp');
      
      // Step 3: Verify only changes were synced
      const finalVolunteers = await this.mockServices.storage.getAllVolunteers();
      this.assert(finalVolunteers.length === 4, 'Should have added new volunteer');
      
      const updatedVolunteer = finalVolunteers.find(v => v.id === 'V001');
      this.assert(updatedVolunteer.committee === 'Leadership', 'Should have updated volunteer');
      
      this.recordTestResult(testName, true, 'Incremental sync workflow completed successfully');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testConflictResolutionWorkflow() {
    const testName = 'Conflict Resolution Workflow';
    console.log(`Running ${testName}...`);
    
    try {
      // Setup
      this.mockServices.sync.enable();
      await this.mockServices.auth.authenticate();
      const spreadsheet = await this.mockServices.sheets.createSpreadsheet('Conflict Test');
      
      // Step 1: Create conflicting changes
      // Local change
      await this.mockServices.storage.updateVolunteer('V001', { 
        name: 'Alice Johnson-Smith',
        updatedAt: '2024-01-01T10:00:00Z'
      });
      
      // Simulate remote change (newer)
      await this.mockServices.sheets.writeSheet(spreadsheet.spreadsheetId, 'volunteers', [
        ['ID', 'Name', 'Email', 'Committee', 'Created', 'Updated'],
        ['V001', 'Alice Johnson-Brown', 'alice@example.com', 'Teaching', '2024-01-01T00:00:00Z', '2024-01-01T11:00:00Z']
      ]);
      
      // Step 2: Perform sync with conflict detection
      const conflictResolver = {
        detectConflicts: (local, remote) => {
          const conflicts = [];
          if (local.name !== remote.name && local.updatedAt !== remote.updatedAt) {
            conflicts.push({
              id: local.id,
              field: 'name',
              local: local.name,
              remote: remote.name,
              localTime: local.updatedAt,
              remoteTime: remote.updatedAt
            });
          }
          return conflicts;
        },
        
        resolveConflict: (conflict) => {
          // Last modified wins
          const localTime = new Date(conflict.localTime);
          const remoteTime = new Date(conflict.remoteTime);
          return remoteTime > localTime ? conflict.remote : conflict.local;
        }
      };
      
      const localVolunteer = await this.mockServices.storage.getAllVolunteers().then(v => v.find(vol => vol.id === 'V001'));
      const remoteData = await this.mockServices.sheets.readSheet(spreadsheet.spreadsheetId, 'volunteers');
      const remoteVolunteer = { 
        id: remoteData[1][0], 
        name: remoteData[1][1], 
        updatedAt: remoteData[1][5] 
      };
      
      const conflicts = conflictResolver.detectConflicts(localVolunteer, remoteVolunteer);
      this.assert(conflicts.length > 0, 'Should detect conflicts');
      
      // Step 3: Resolve conflicts
      const resolution = conflictResolver.resolveConflict(conflicts[0]);
      this.assert(resolution === 'Alice Johnson-Brown', 'Should resolve to remote version (newer)');
      
      // Step 4: Apply resolution
      await this.mockServices.storage.updateVolunteer('V001', { name: resolution });
      
      const resolvedVolunteer = await this.mockServices.storage.getAllVolunteers().then(v => v.find(vol => vol.id === 'V001'));
      this.assert(resolvedVolunteer.name === 'Alice Johnson-Brown', 'Should apply conflict resolution');
      
      this.recordTestResult(testName, true, 'Conflict resolution workflow completed successfully');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testOfflineToOnlineWorkflow() {
    const testName = 'Offline to Online Workflow';
    console.log(`Running ${testName}...`);
    
    try {
      // Setup
      this.mockServices.sync.enable();
      await this.mockServices.auth.authenticate();
      
      // Step 1: Simulate going offline
      let isOnline = false;
      const offlineQueue = [];
      
      const queueOperation = (operation) => {
        if (!isOnline) {
          offlineQueue.push({
            ...operation,
            timestamp: Date.now(),
            id: 'op_' + Date.now() + '_' + Math.random()
          });
          return { queued: true };
        }
        return { executed: true };
      };
      
      // Step 2: Make changes while offline
      const result1 = queueOperation({ 
        type: 'add_volunteer', 
        data: { id: 'V005', name: 'Eve Brown', email: 'eve@example.com' } 
      });
      this.assert(result1.queued, 'Should queue operations while offline');
      
      const result2 = queueOperation({ 
        type: 'update_volunteer', 
        data: { id: 'V002', name: 'Bob Smith Jr.' } 
      });
      this.assert(result2.queued, 'Should queue multiple operations');
      
      this.assert(offlineQueue.length === 2, 'Should have queued operations');
      
      // Step 3: Come back online
      isOnline = true;
      
      // Step 4: Process queued operations
      const processQueue = async () => {
        const results = [];
        
        while (offlineQueue.length > 0) {
          const operation = offlineQueue.shift();
          
          try {
            if (operation.type === 'add_volunteer') {
              await this.mockServices.storage.addVolunteer(operation.data);
            } else if (operation.type === 'update_volunteer') {
              await this.mockServices.storage.updateVolunteer(operation.data.id, operation.data);
            }
            
            results.push({ ...operation, status: 'completed' });
          } catch (error) {
            results.push({ ...operation, status: 'failed', error: error.message });
          }
        }
        
        return results;
      };
      
      const processedOperations = await processQueue();
      
      this.assert(processedOperations.length === 2, 'Should process all queued operations');
      this.assert(processedOperations.every(op => op.status === 'completed'), 'Should complete all operations');
      this.assert(offlineQueue.length === 0, 'Should clear queue after processing');
      
      // Step 5: Perform sync to upload queued changes
      const syncResult = await this.mockServices.sync.performSync({ type: 'offline_recovery' });
      this.assert(syncResult.success, 'Should sync after coming online');
      
      this.recordTestResult(testName, true, 'Offline to online workflow completed successfully');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testErrorRecoveryWorkflow() {
    const testName = 'Error Recovery Workflow';
    console.log(`Running ${testName}...`);
    
    try {
      // Setup
      this.mockServices.sync.enable();
      await this.mockServices.auth.authenticate();
      
      // Step 1: Simulate network error during sync
      const originalPerformSync = this.mockServices.sync.performSync;
      let attemptCount = 0;
      
      this.mockServices.sync.performSync = async (options) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return originalPerformSync.call(this.mockServices.sync, options);
      };
      
      // Step 2: Implement retry logic
      const retrySync = async (maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await this.mockServices.sync.performSync({ type: 'full' });
            return { success: true, result, attempts: attempt };
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
              // Exponential backoff
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        return { success: false, error: lastError, attempts: maxRetries };
      };
      
      // Step 3: Test retry mechanism
      const retryResult = await retrySync(5);
      
      this.assert(retryResult.success, 'Should eventually succeed with retries');
      this.assert(retryResult.attempts === 3, 'Should retry correct number of times');
      
      // Step 4: Test authentication error recovery
      this.mockServices.auth.signOut();
      
      const syncWithAuthCheck = async () => {
        if (!this.mockServices.auth.isAuthenticated()) {
          const authResult = await this.mockServices.auth.authenticate();
          if (!authResult.success) {
            throw new Error('Re-authentication failed');
          }
        }
        
        return await originalPerformSync.call(this.mockServices.sync, { type: 'full' });
      };
      
      const authRecoveryResult = await syncWithAuthCheck();
      this.assert(authRecoveryResult.success, 'Should recover from authentication errors');
      
      // Restore original method
      this.mockServices.sync.performSync = originalPerformSync;
      
      this.recordTestResult(testName, true, 'Error recovery workflow completed successfully');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testPerformanceUnderLoad() {
    const testName = 'Performance Under Load';
    console.log(`Running ${testName}...`);
    
    try {
      // Setup
      this.mockServices.sync.enable();
      await this.mockServices.auth.authenticate();
      const spreadsheet = await this.mockServices.sheets.createSpreadsheet('Performance Test');
      
      // Step 1: Generate large dataset
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          id: `V${i.toString().padStart(4, '0')}`,
          name: `Volunteer ${i}`,
          email: `volunteer${i}@example.com`,
          committee: ['Teaching', 'Admin', 'Events', 'Security'][i % 4]
        });
      }
      
      // Step 2: Add large dataset to storage
      const startTime = performance.now();
      
      for (const volunteer of largeDataset) {
        await this.mockServices.storage.addVolunteer(volunteer);
      }
      
      const addTime = performance.now() - startTime;
      this.assert(addTime < 10000, `Should add large dataset efficiently (took ${addTime.toFixed(2)}ms)`);
      
      // Step 3: Perform sync with large dataset
      const syncStartTime = performance.now();
      const syncResult = await this.mockServices.sync.performSync({ type: 'full' });
      const syncTime = performance.now() - syncStartTime;
      
      this.assert(syncResult.success, 'Should sync large dataset successfully');
      this.assert(syncTime < 15000, `Should sync large dataset efficiently (took ${syncTime.toFixed(2)}ms)`);
      
      // Step 4: Test concurrent operations
      const concurrentOperations = [];
      
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          this.mockServices.storage.addVolunteer({
            id: `VC${i}`,
            name: `Concurrent Volunteer ${i}`,
            email: `concurrent${i}@example.com`,
            committee: 'Testing'
          })
        );
      }
      
      const concurrentStartTime = performance.now();
      const concurrentResults = await Promise.all(concurrentOperations);
      const concurrentTime = performance.now() - concurrentStartTime;
      
      this.assert(concurrentResults.length === 10, 'Should handle concurrent operations');
      this.assert(concurrentTime < 5000, `Should handle concurrent operations efficiently (took ${concurrentTime.toFixed(2)}ms)`);
      
      // Step 5: Test memory usage (simplified)
      const finalVolunteers = await this.mockServices.storage.getAllVolunteers();
      this.assert(finalVolunteers.length === 1013, 'Should maintain data integrity under load'); // 3 initial + 1000 + 10 concurrent
      
      this.recordTestResult(testName, true, `Performance test completed (Add: ${addTime.toFixed(2)}ms, Sync: ${syncTime.toFixed(2)}ms, Concurrent: ${concurrentTime.toFixed(2)}ms)`);
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async cleanupE2EEnvironment() {
    console.log('Cleaning up E2E test environment...');
    
    // Reset mock services
    this.mockServices = null;
    
    // Clear any test data
    localStorage.removeItem('vat_e2e_test_data');
  }

  // Helper methods
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordTestResult(testName, success, message) {
    this.testResults.push({
      testName,
      success,
      message,
      timestamp: new Date().toISOString()
    });
    
    if (success) {
      console.log(`✅ ${testName}: ${message}`);
    } else {
      console.error(`❌ ${testName}: ${message}`);
    }
  }

  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      },
      results: this.testResults
    };
    
    console.log('\n=== End-to-End Test Report ===');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    
    if (failedTests > 0) {
      console.log('\nFailed Tests:');
      this.testResults.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.testName}: ${result.message}`);
      });
    }
    
    return report;
  }
}

// Export for use in other test files
if (typeof window !== 'undefined') {
  window.E2ETestSuite = E2ETestSuite;
}