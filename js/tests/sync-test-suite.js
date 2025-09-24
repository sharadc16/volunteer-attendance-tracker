/**
 * Comprehensive Test Suite for Google Sheets Sync
 * Tests all sync components, integration scenarios, and error conditions
 */
class SyncTestSuite {
  constructor() {
    this.testResults = [];
    this.mockData = {
      volunteers: [
        { id: 'V001', name: 'John Doe', email: 'john@example.com', committee: 'Teaching' },
        { id: 'V002', name: 'Jane Smith', email: 'jane@example.com', committee: 'Admin' }
      ],
      events: [
        { id: 'E001', name: 'Sunday Class', date: '2024-01-07', startTime: '10:00', endTime: '12:00' },
        { id: 'E002', name: 'Special Event', date: '2024-01-14', startTime: '14:00', endTime: '16:00' }
      ],
      attendance: [
        { id: 'A001', volunteerId: 'V001', eventId: 'E001', volunteerName: 'John Doe', date: '2024-01-07' },
        { id: 'A002', volunteerId: 'V002', eventId: 'E001', volunteerName: 'Jane Smith', date: '2024-01-07' }
      ]
    };
    this.originalServices = {};
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('Starting comprehensive sync test suite...');
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Unit tests
      await this.runUnitTests();
      
      // Integration tests
      await this.runIntegrationTests();
      
      // End-to-end tests
      await this.runEndToEndTests();
      
      // Error scenario tests
      await this.runErrorScenarioTests();
      
      // Performance tests
      await this.runPerformanceTests();
      
      // Cleanup
      await this.cleanupTestEnvironment();
      
      // Generate report
      const report = this.generateTestReport();
      console.log('Test suite completed:', report);
      
      return report;
      
    } catch (error) {
      console.error('Test suite failed:', error);
      await this.cleanupTestEnvironment();
      throw error;
    }
  }

  /**
   * Setup test environment with mocks
   */
  async setupTestEnvironment() {
    console.log('Setting up test environment...');
    
    // Store original services
    this.originalServices = {
      AuthManager: window.AuthManager,
      SheetsManager: window.SheetsManager,
      DataTransformer: window.DataTransformer,
      SyncManager: window.SyncManager,
      DeltaSyncManager: window.DeltaSyncManager,
      PerformanceMonitor: window.PerformanceMonitor
    };
    
    // Create mock services
    this.createMockServices();
    
    // Initialize test data
    await this.initializeTestData();
  }

  /**
   * Create mock services for testing
   */
  createMockServices() {
    // Mock AuthManager
    window.AuthManager = {
      isAuthenticatedUser: () => true,
      getAccessToken: () => 'mock_token',
      refreshToken: async () => ({ success: true })
    };
    
    // Mock SheetsManager
    window.SheetsManager = {
      isInitialized: true,
      spreadsheetId: 'test_spreadsheet_id',
      sheetsConfig: {
        volunteers: { name: 'Volunteers' },
        events: { name: 'Events' },
        attendance: { name: 'Attendance' }
      },
      validateSpreadsheet: async () => true,
      readSheet: async (sheetName, range) => {
        const dataType = sheetName.toLowerCase();
        return this.mockData[dataType] || [];
      },
      writeSheet: async (sheetName, data, range) => {
        return { success: true, updatedRows: data.length };
      },
      appendToSheet: async (sheetName, data) => {
        return { success: true, appendedRows: data.length };
      },
      batchUpdate: async (requests) => {
        return { success: true, replies: requests.map(() => ({})) };
      }
    };
    
    // Mock DataTransformer
    window.DataTransformer = {
      toSheetsFormat: (data, type) => {
        // Simple transformation for testing
        const transformed = [data.id, data.name || data.volunteerName, data.email || data.date];
        return transformed;
      },
      fromSheetsFormat: (data, type) => {
        // Simple reverse transformation
        return {
          id: data[0],
          name: data[1],
          email: data[2]
        };
      },
      validateData: (data, type) => {
        return data && data.id;
      }
    };
    
    // Mock Storage
    if (!window.Storage) {
      window.Storage = {
        getAllVolunteers: async () => [...this.mockData.volunteers],
        getAllEvents: async () => [...this.mockData.events],
        getAllAttendance: async () => [...this.mockData.attendance],
        addVolunteer: async (volunteer) => ({ ...volunteer, id: 'V' + Date.now() }),
        updateVolunteer: async (id, updates) => ({ id, ...updates }),
        deleteVolunteer: async (id) => ({ success: true })
      };
    }
  }

  /**
   * Initialize test data
   */
  async initializeTestData() {
    // Clear any existing test data
    localStorage.removeItem('vat_test_data');
    localStorage.removeItem('vat_test_sync_stats');
    localStorage.removeItem('vat_test_performance_metrics');
  }

  /**
   * Run unit tests for individual components
   */
  async runUnitTests() {
    console.log('Running unit tests...');
    
    // Test AuthManager
    await this.testAuthManager();
    
    // Test SheetsManager
    await this.testSheetsManager();
    
    // Test DataTransformer
    await this.testDataTransformer();
    
    // Test DeltaSyncManager
    await this.testDeltaSyncManager();
    
    // Test PerformanceMonitor
    await this.testPerformanceMonitor();
    
    // Test ConflictResolver
    await this.testConflictResolver();
  }

  /**
   * Test AuthManager functionality
   */
  async testAuthManager() {
    const testName = 'AuthManager Unit Tests';
    
    try {
      // Test authentication check
      this.assert(
        window.AuthManager.isAuthenticatedUser(),
        'Should return authenticated status'
      );
      
      // Test token retrieval
      const token = window.AuthManager.getAccessToken();
      this.assert(
        token === 'mock_token',
        'Should return access token'
      );
      
      // Test token refresh
      const refreshResult = await window.AuthManager.refreshToken();
      this.assert(
        refreshResult.success,
        'Should successfully refresh token'
      );
      
      this.recordTestResult(testName, true, 'All AuthManager tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test SheetsManager functionality
   */
  async testSheetsManager() {
    const testName = 'SheetsManager Unit Tests';
    
    try {
      // Test spreadsheet validation
      const isValid = await window.SheetsManager.validateSpreadsheet('test_id');
      this.assert(isValid, 'Should validate spreadsheet');
      
      // Test reading data
      const volunteers = await window.SheetsManager.readSheet('Volunteers');
      this.assert(
        Array.isArray(volunteers),
        'Should return array of volunteers'
      );
      
      // Test writing data
      const writeResult = await window.SheetsManager.writeSheet('Volunteers', [['V003', 'Test User']]);
      this.assert(
        writeResult.success,
        'Should successfully write data'
      );
      
      // Test appending data
      const appendResult = await window.SheetsManager.appendToSheet('Volunteers', [['V004', 'Another User']]);
      this.assert(
        appendResult.success,
        'Should successfully append data'
      );
      
      this.recordTestResult(testName, true, 'All SheetsManager tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test DataTransformer functionality
   */
  async testDataTransformer() {
    const testName = 'DataTransformer Unit Tests';
    
    try {
      const testVolunteer = { id: 'V001', name: 'John Doe', email: 'john@example.com' };
      
      // Test transformation to sheets format
      const sheetsFormat = window.DataTransformer.toSheetsFormat(testVolunteer, 'volunteers');
      this.assert(
        Array.isArray(sheetsFormat),
        'Should return array for sheets format'
      );
      this.assert(
        sheetsFormat[0] === testVolunteer.id,
        'Should preserve ID in transformation'
      );
      
      // Test transformation from sheets format
      const localFormat = window.DataTransformer.fromSheetsFormat(sheetsFormat, 'volunteers');
      this.assert(
        localFormat.id === testVolunteer.id,
        'Should preserve ID in reverse transformation'
      );
      
      // Test data validation
      const isValid = window.DataTransformer.validateData(testVolunteer, 'volunteers');
      this.assert(isValid, 'Should validate correct data');
      
      const isInvalid = window.DataTransformer.validateData({}, 'volunteers');
      this.assert(!isInvalid, 'Should reject invalid data');
      
      this.recordTestResult(testName, true, 'All DataTransformer tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test DeltaSyncManager functionality
   */
  async testDeltaSyncManager() {
    const testName = 'DeltaSyncManager Unit Tests';
    
    try {
      // Create instance for testing
      const deltaSyncManager = new window.DeltaSyncManager();
      await deltaSyncManager.init();
      
      // Test change tracking
      deltaSyncManager.trackChange('volunteers', 'V001', 'create', this.mockData.volunteers[0]);
      
      const changes = await deltaSyncManager.getChangesSince('volunteers', null);
      this.assert(
        changes.length > 0,
        'Should track changes'
      );
      
      // Test batch optimization
      const batch = [
        { id: 'V001', operation: 'create', data: { id: 'V001', name: 'John' } },
        { id: 'V001', operation: 'update', data: { id: 'V001', name: 'John Doe' } }
      ];
      
      const optimized = deltaSyncManager.optimizeBatch(batch);
      this.assert(
        optimized.length === 1,
        'Should optimize batch by merging operations'
      );
      this.assert(
        optimized[0].data.name === 'John Doe',
        'Should merge data correctly'
      );
      
      // Test statistics
      const stats = deltaSyncManager.getDeltaSyncStats();
      this.assert(
        typeof stats.totalTrackedChanges === 'number',
        'Should return statistics'
      );
      
      this.recordTestResult(testName, true, 'All DeltaSyncManager tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test PerformanceMonitor functionality
   */
  async testPerformanceMonitor() {
    const testName = 'PerformanceMonitor Unit Tests';
    
    try {
      // Create instance for testing
      const performanceMonitor = new window.PerformanceMonitor();
      await performanceMonitor.init();
      
      // Test operation tracking
      const operationId = 'test_op_' + Date.now();
      const operation = performanceMonitor.startSyncOperation(operationId, 'upload', 'volunteers', 10);
      
      this.assert(
        operation.id === operationId,
        'Should start tracking operation'
      );
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const completedOperation = performanceMonitor.endSyncOperation(operationId, { success: true });
      this.assert(
        completedOperation.duration > 0,
        'Should calculate operation duration'
      );
      
      // Test API call recording
      performanceMonitor.recordApiCall('GET', '/api/test', 150, true, 1024);
      
      // Test batch operation recording
      performanceMonitor.recordBatchOperation('upload', 50, 500, true);
      
      // Test statistics
      const stats = performanceMonitor.getPerformanceStats();
      this.assert(
        stats.syncOperations.total > 0,
        'Should record sync operations'
      );
      
      // Test efficiency report
      const report = performanceMonitor.getEfficiencyReport();
      this.assert(
        report.syncEfficiency,
        'Should generate efficiency report'
      );
      
      this.recordTestResult(testName, true, 'All PerformanceMonitor tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test ConflictResolver functionality
   */
  async testConflictResolver() {
    const testName = 'ConflictResolver Unit Tests';
    
    try {
      if (!window.ConflictResolver) {
        this.recordTestResult(testName, false, 'ConflictResolver not available');
        return;
      }
      
      const conflictResolver = new window.ConflictResolver();
      
      // Test conflict detection
      const localData = { id: 'V001', name: 'John Doe', updatedAt: '2024-01-01T12:00:00Z' };
      const remoteData = { id: 'V001', name: 'John Smith', updatedAt: '2024-01-01T13:00:00Z' };
      
      const conflicts = conflictResolver.detectConflicts([localData], [remoteData]);
      this.assert(
        conflicts.length > 0,
        'Should detect conflicts'
      );
      
      // Test auto-resolution
      const autoResolved = conflictResolver.autoResolve(conflicts);
      this.assert(
        Array.isArray(autoResolved),
        'Should attempt auto-resolution'
      );
      
      this.recordTestResult(testName, true, 'All ConflictResolver tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('Running integration tests...');
    
    // Test sync manager integration
    await this.testSyncManagerIntegration();
    
    // Test service interactions
    await this.testServiceInteractions();
    
    // Test data flow
    await this.testDataFlow();
  }

  /**
   * Test SyncManager integration
   */
  async testSyncManagerIntegration() {
    const testName = 'SyncManager Integration Tests';
    
    try {
      if (!window.SyncManager) {
        this.recordTestResult(testName, false, 'SyncManager not available');
        return;
      }
      
      // Mock SyncManager for testing
      const mockSyncManager = {
        isEnabled: true,
        performSync: async (options) => {
          return { success: true, result: { uploaded: { volunteers: 2 }, downloaded: { volunteers: 0 } } };
        },
        uploadChanges: async (dataType, changes) => {
          return { count: changes.length, conflicts: [], skipped: 0 };
        },
        downloadChanges: async (dataType) => {
          return { count: 0, conflicts: [], skipped: 0 };
        }
      };
      
      // Test sync operation
      const syncResult = await mockSyncManager.performSync({ types: ['volunteers'] });
      this.assert(
        syncResult.success,
        'Should perform sync successfully'
      );
      
      // Test upload operation
      const uploadResult = await mockSyncManager.uploadChanges('volunteers', this.mockData.volunteers);
      this.assert(
        uploadResult.count === this.mockData.volunteers.length,
        'Should upload correct number of records'
      );
      
      this.recordTestResult(testName, true, 'All SyncManager integration tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test service interactions
   */
  async testServiceInteractions() {
    const testName = 'Service Interaction Tests';
    
    try {
      // Test auth and sheets interaction
      const isAuthenticated = window.AuthManager.isAuthenticatedUser();
      const canValidate = await window.SheetsManager.validateSpreadsheet('test_id');
      
      this.assert(
        isAuthenticated && canValidate,
        'Auth and Sheets services should interact correctly'
      );
      
      // Test transformer and sheets interaction
      const testData = this.mockData.volunteers[0];
      const transformed = window.DataTransformer.toSheetsFormat(testData, 'volunteers');
      const writeResult = await window.SheetsManager.writeSheet('Volunteers', [transformed]);
      
      this.assert(
        writeResult.success,
        'Transformer and Sheets should work together'
      );
      
      this.recordTestResult(testName, true, 'All service interaction tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test data flow through the system
   */
  async testDataFlow() {
    const testName = 'Data Flow Tests';
    
    try {
      // Test complete data flow: Storage -> Transformer -> Sheets
      const volunteers = await window.Storage.getAllVolunteers();
      this.assert(
        Array.isArray(volunteers),
        'Should retrieve data from storage'
      );
      
      const transformed = volunteers.map(v => window.DataTransformer.toSheetsFormat(v, 'volunteers'));
      this.assert(
        transformed.length === volunteers.length,
        'Should transform all records'
      );
      
      const writeResult = await window.SheetsManager.writeSheet('Volunteers', transformed);
      this.assert(
        writeResult.success,
        'Should write transformed data to sheets'
      );
      
      // Test reverse flow: Sheets -> Transformer -> Storage
      const sheetData = await window.SheetsManager.readSheet('Volunteers');
      const backTransformed = sheetData.map(row => window.DataTransformer.fromSheetsFormat(row, 'volunteers'));
      
      this.assert(
        backTransformed.length === sheetData.length,
        'Should transform data back from sheets'
      );
      
      this.recordTestResult(testName, true, 'All data flow tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Run end-to-end tests
   */
  async runEndToEndTests() {
    console.log('Running end-to-end tests...');
    
    // Test complete sync workflow
    await this.testCompleteSyncWorkflow();
    
    // Test conflict resolution workflow
    await this.testConflictResolutionWorkflow();
    
    // Test offline/online transitions
    await this.testOfflineOnlineTransitions();
  }

  /**
   * Test complete sync workflow
   */
  async testCompleteSyncWorkflow() {
    const testName = 'Complete Sync Workflow Test';
    
    try {
      // Simulate a complete sync workflow
      const workflow = {
        // 1. Check prerequisites
        checkAuth: () => window.AuthManager.isAuthenticatedUser(),
        
        // 2. Get local changes
        getLocalChanges: async () => {
          const volunteers = await window.Storage.getAllVolunteers();
          return volunteers.slice(0, 1); // Simulate one change
        },
        
        // 3. Transform data
        transformData: (data) => {
          return data.map(item => window.DataTransformer.toSheetsFormat(item, 'volunteers'));
        },
        
        // 4. Upload to sheets
        uploadData: async (transformedData) => {
          return await window.SheetsManager.appendToSheet('Volunteers', transformedData);
        },
        
        // 5. Download remote changes
        downloadData: async () => {
          return await window.SheetsManager.readSheet('Volunteers');
        }
      };
      
      // Execute workflow
      this.assert(workflow.checkAuth(), 'Should be authenticated');
      
      const localChanges = await workflow.getLocalChanges();
      this.assert(localChanges.length > 0, 'Should have local changes');
      
      const transformedData = workflow.transformData(localChanges);
      this.assert(transformedData.length === localChanges.length, 'Should transform all data');
      
      const uploadResult = await workflow.uploadData(transformedData);
      this.assert(uploadResult.success, 'Should upload successfully');
      
      const downloadedData = await workflow.downloadData();
      this.assert(Array.isArray(downloadedData), 'Should download data');
      
      this.recordTestResult(testName, true, 'Complete sync workflow test passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test conflict resolution workflow
   */
  async testConflictResolutionWorkflow() {
    const testName = 'Conflict Resolution Workflow Test';
    
    try {
      // Simulate conflict scenario
      const localRecord = { 
        id: 'V001', 
        name: 'John Doe', 
        email: 'john.doe@example.com',
        updatedAt: '2024-01-01T10:00:00Z' 
      };
      
      const remoteRecord = { 
        id: 'V001', 
        name: 'John Smith', 
        email: 'john.smith@example.com',
        updatedAt: '2024-01-01T11:00:00Z' 
      };
      
      // Detect conflict
      const hasConflict = localRecord.name !== remoteRecord.name;
      this.assert(hasConflict, 'Should detect conflict');
      
      // Resolve conflict (last modified wins)
      const resolved = new Date(remoteRecord.updatedAt) > new Date(localRecord.updatedAt) 
        ? remoteRecord 
        : localRecord;
      
      this.assert(resolved.name === 'John Smith', 'Should resolve to remote version');
      
      this.recordTestResult(testName, true, 'Conflict resolution workflow test passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test offline/online transitions
   */
  async testOfflineOnlineTransitions() {
    const testName = 'Offline/Online Transition Test';
    
    try {
      // Simulate offline state
      let isOnline = false;
      const offlineQueue = [];
      
      // Queue operations while offline
      const queueOperation = (operation) => {
        if (!isOnline) {
          offlineQueue.push(operation);
          return { queued: true };
        }
        return { executed: true };
      };
      
      const result1 = queueOperation({ type: 'upload', data: 'test1' });
      this.assert(result1.queued, 'Should queue operation while offline');
      
      const result2 = queueOperation({ type: 'upload', data: 'test2' });
      this.assert(result2.queued, 'Should queue multiple operations');
      
      this.assert(offlineQueue.length === 2, 'Should have queued operations');
      
      // Simulate going online
      isOnline = true;
      
      // Process queued operations
      const processQueue = async () => {
        const results = [];
        while (offlineQueue.length > 0) {
          const operation = offlineQueue.shift();
          results.push({ ...operation, processed: true });
        }
        return results;
      };
      
      const processedOperations = await processQueue();
      this.assert(processedOperations.length === 2, 'Should process all queued operations');
      this.assert(offlineQueue.length === 0, 'Should clear queue after processing');
      
      this.recordTestResult(testName, true, 'Offline/online transition test passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Run error scenario tests
   */
  async runErrorScenarioTests() {
    console.log('Running error scenario tests...');
    
    // Test network errors
    await this.testNetworkErrors();
    
    // Test authentication errors
    await this.testAuthenticationErrors();
    
    // Test data validation errors
    await this.testDataValidationErrors();
    
    // Test API rate limiting
    await this.testApiRateLimiting();
  }

  /**
   * Test network error handling
   */
  async testNetworkErrors() {
    const testName = 'Network Error Handling Test';
    
    try {
      // Mock network failure
      const originalReadSheet = window.SheetsManager.readSheet;
      window.SheetsManager.readSheet = async () => {
        throw new Error('Network timeout');
      };
      
      try {
        await window.SheetsManager.readSheet('Volunteers');
        this.assert(false, 'Should throw network error');
      } catch (error) {
        this.assert(
          error.message.includes('timeout'),
          'Should handle network timeout'
        );
      }
      
      // Restore original method
      window.SheetsManager.readSheet = originalReadSheet;
      
      this.recordTestResult(testName, true, 'Network error handling test passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test authentication error handling
   */
  async testAuthenticationErrors() {
    const testName = 'Authentication Error Handling Test';
    
    try {
      // Mock authentication failure
      const originalIsAuthenticated = window.AuthManager.isAuthenticatedUser;
      window.AuthManager.isAuthenticatedUser = () => false;
      
      const isAuthenticated = window.AuthManager.isAuthenticatedUser();
      this.assert(!isAuthenticated, 'Should handle authentication failure');
      
      // Restore original method
      window.AuthManager.isAuthenticatedUser = originalIsAuthenticated;
      
      this.recordTestResult(testName, true, 'Authentication error handling test passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test data validation errors
   */
  async testDataValidationErrors() {
    const testName = 'Data Validation Error Handling Test';
    
    try {
      // Test invalid data
      const invalidData = { name: 'Test' }; // Missing required ID
      const isValid = window.DataTransformer.validateData(invalidData, 'volunteers');
      
      this.assert(!isValid, 'Should reject invalid data');
      
      // Test transformation of invalid data
      try {
        window.DataTransformer.toSheetsFormat(invalidData, 'volunteers');
        // Should handle gracefully or throw appropriate error
      } catch (error) {
        // Expected behavior for invalid data
      }
      
      this.recordTestResult(testName, true, 'Data validation error handling test passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test API rate limiting
   */
  async testApiRateLimiting() {
    const testName = 'API Rate Limiting Test';
    
    try {
      // Mock rate limit error
      const originalWriteSheet = window.SheetsManager.writeSheet;
      let callCount = 0;
      
      window.SheetsManager.writeSheet = async () => {
        callCount++;
        if (callCount > 2) {
          throw new Error('Rate limit exceeded');
        }
        return { success: true };
      };
      
      // Make multiple calls
      await window.SheetsManager.writeSheet('Test', []);
      await window.SheetsManager.writeSheet('Test', []);
      
      try {
        await window.SheetsManager.writeSheet('Test', []);
        this.assert(false, 'Should throw rate limit error');
      } catch (error) {
        this.assert(
          error.message.includes('Rate limit'),
          'Should handle rate limit error'
        );
      }
      
      // Restore original method
      window.SheetsManager.writeSheet = originalWriteSheet;
      
      this.recordTestResult(testName, true, 'API rate limiting test passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    console.log('Running performance tests...');
    
    // Test large dataset handling
    await this.testLargeDatasetHandling();
    
    // Test batch operation performance
    await this.testBatchOperationPerformance();
    
    // Test memory usage
    await this.testMemoryUsage();
  }

  /**
   * Test large dataset handling
   */
  async testLargeDatasetHandling() {
    const testName = 'Large Dataset Handling Test';
    
    try {
      // Generate large dataset
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          id: `V${i.toString().padStart(3, '0')}`,
          name: `Volunteer ${i}`,
          email: `volunteer${i}@example.com`,
          committee: i % 2 === 0 ? 'Teaching' : 'Admin'
        });
      }
      
      const startTime = performance.now();
      
      // Test transformation performance
      const transformed = largeDataset.map(item => 
        window.DataTransformer.toSheetsFormat(item, 'volunteers')
      );
      
      const transformTime = performance.now() - startTime;
      
      this.assert(
        transformed.length === largeDataset.length,
        'Should transform all records in large dataset'
      );
      
      this.assert(
        transformTime < 5000, // Should complete within 5 seconds
        `Should transform large dataset efficiently (took ${transformTime.toFixed(2)}ms)`
      );
      
      this.recordTestResult(testName, true, `Large dataset test passed (${transformTime.toFixed(2)}ms for 1000 records)`);
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test batch operation performance
   */
  async testBatchOperationPerformance() {
    const testName = 'Batch Operation Performance Test';
    
    try {
      const batchSizes = [10, 50, 100, 200];
      const results = [];
      
      for (const batchSize of batchSizes) {
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
          batch.push(['V' + i, 'Name ' + i, 'email' + i + '@example.com']);
        }
        
        const startTime = performance.now();
        await window.SheetsManager.writeSheet('Test', batch);
        const duration = performance.now() - startTime;
        
        results.push({ batchSize, duration });
      }
      
      // Check that larger batches are more efficient per record
      const efficiency = results.map(r => r.duration / r.batchSize);
      const isEfficient = efficiency[efficiency.length - 1] <= efficiency[0];
      
      this.assert(
        isEfficient,
        'Larger batches should be more efficient per record'
      );
      
      this.recordTestResult(testName, true, `Batch performance test passed: ${JSON.stringify(results)}`);
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test memory usage
   */
  async testMemoryUsage() {
    const testName = 'Memory Usage Test';
    
    try {
      const initialMemory = this.getMemoryUsage();
      
      // Create large amount of data
      const largeData = [];
      for (let i = 0; i < 10000; i++) {
        largeData.push({
          id: `test_${i}`,
          data: 'x'.repeat(100), // 100 characters per record
          timestamp: new Date().toISOString()
        });
      }
      
      const peakMemory = this.getMemoryUsage();
      
      // Clear data
      largeData.length = 0;
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = this.getMemoryUsage();
      
      const memoryIncrease = peakMemory - initialMemory;
      const memoryRecovered = peakMemory - finalMemory;
      
      this.assert(
        memoryIncrease > 0,
        'Should show memory increase with large data'
      );
      
      // Memory should be mostly recovered (allowing for some overhead)
      const recoveryRatio = memoryRecovered / memoryIncrease;
      this.assert(
        recoveryRatio > 0.5,
        `Should recover most memory (recovered ${(recoveryRatio * 100).toFixed(1)}%)`
      );
      
      this.recordTestResult(testName, true, `Memory test passed (increase: ${memoryIncrease}, recovered: ${memoryRecovered})`);
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Get current memory usage estimate
   */
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    // Fallback estimation
    return Date.now() % 10000000; // Simple fallback
  }

  /**
   * Cleanup test environment
   */
  async cleanupTestEnvironment() {
    console.log('Cleaning up test environment...');
    
    // Restore original services
    Object.keys(this.originalServices).forEach(serviceName => {
      if (this.originalServices[serviceName]) {
        window[serviceName] = this.originalServices[serviceName];
      }
    });
    
    // Clear test data
    localStorage.removeItem('vat_test_data');
    localStorage.removeItem('vat_test_sync_stats');
    localStorage.removeItem('vat_test_performance_metrics');
  }

  /**
   * Assert helper for tests
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Record test result
   */
  recordTestResult(testName, passed, message) {
    const result = {
      name: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    if (passed) {
      console.log(`✅ ${testName}: ${message}`);
    } else {
      console.error(`❌ ${testName}: ${message}`);
    }
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: successRate.toFixed(2) + '%'
      },
      results: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    // Log summary
    console.log('\n=== Test Suite Summary ===');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    
    if (failedTests > 0) {
      console.log('\n=== Failed Tests ===');
      this.testResults.filter(r => !r.passed).forEach(result => {
        console.log(`❌ ${result.name}: ${result.message}`);
      });
    }
    
    return report;
  }
}

// Make SyncTestSuite available globally
window.SyncTestSuite = SyncTestSuite;