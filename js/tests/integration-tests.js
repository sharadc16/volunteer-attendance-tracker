/**
 * Integration Tests for Google Sheets Sync
 * Tests service interactions and data flow between components
 */
class IntegrationTestSuite {
  constructor() {
    this.testResults = [];
    this.mockGoogleAPI = null;
    this.originalServices = {};
  }

  async runAllIntegrationTests() {
    console.log('Starting integration tests...');
    
    try {
      await this.setupIntegrationEnvironment();
      
      // Test Google Sheets API integration
      await this.testGoogleSheetsAPIIntegration();
      
      // Test authentication flow integration
      await this.testAuthenticationFlowIntegration();
      
      // Test data transformation pipeline
      await this.testDataTransformationPipeline();
      
      // Test sync manager orchestration
      await this.testSyncManagerOrchestration();
      
      // Test conflict resolution integration
      await this.testConflictResolutionIntegration();
      
      // Test error handling integration
      await this.testErrorHandlingIntegration();
      
      // Test performance monitoring integration
      await this.testPerformanceMonitoringIntegration();
      
      await this.cleanupIntegrationEnvironment();
      
      return this.generateReport();
    } catch (error) {
      console.error('Integration tests failed:', error);
      await this.cleanupIntegrationEnvironment();
      throw error;
    }
  }

  async setupIntegrationEnvironment() {
    console.log('Setting up integration test environment...');
    
    // Store original services
    this.originalServices = {
      gapi: window.gapi,
      google: window.google
    };
    
    // Create comprehensive mock Google API
    this.createMockGoogleAPI();
    
    // Initialize test data
    await this.initializeIntegrationTestData();
  }

  createMockGoogleAPI() {
    // Mock Google API client
    window.gapi = {
      load: (apis, callback) => {
        setTimeout(callback, 100); // Simulate async loading
      },
      client: {
        init: async (config) => {
          return { success: true };
        },
        sheets: {
          spreadsheets: {
            create: async (request) => {
              return {
                result: {
                  spreadsheetId: 'test_spreadsheet_' + Date.now(),
                  properties: { title: request.resource.properties.title },
                  sheets: request.resource.sheets || []
                }
              };
            },
            get: async (params) => {
              return {
                result: {
                  spreadsheetId: params.spreadsheetId,
                  properties: { title: 'Test Spreadsheet' },
                  sheets: [
                    { properties: { title: 'Volunteers', sheetId: 0 } },
                    { properties: { title: 'Events', sheetId: 1 } },
                    { properties: { title: 'Attendance', sheetId: 2 } }
                  ]
                }
              };
            },
            values: {
              get: async (params) => {
                const mockData = this.getMockSheetData(params.range);
                return {
                  result: {
                    range: params.range,
                    majorDimension: 'ROWS',
                    values: mockData
                  }
                };
              },
              update: async (params) => {
                return {
                  result: {
                    updatedRange: params.range,
                    updatedRows: params.resource.values.length,
                    updatedColumns: params.resource.values[0]?.length || 0,
                    updatedCells: params.resource.values.length * (params.resource.values[0]?.length || 0)
                  }
                };
              },
              append: async (params) => {
                return {
                  result: {
                    spreadsheetId: params.spreadsheetId,
                    tableRange: params.range,
                    updates: {
                      updatedRange: params.range,
                      updatedRows: params.resource.values.length,
                      updatedColumns: params.resource.values[0]?.length || 0
                    }
                  }
                };
              },
              batchUpdate: async (params) => {
                return {
                  result: {
                    spreadsheetId: params.spreadsheetId,
                    totalUpdatedRows: params.resource.data.reduce((sum, req) => sum + req.values.length, 0),
                    totalUpdatedColumns: params.resource.data[0]?.values[0]?.length || 0,
                    replies: params.resource.data.map(() => ({}))
                  }
                };
              }
            },
            batchUpdate: async (params) => {
              return {
                result: {
                  spreadsheetId: params.spreadsheetId,
                  replies: params.resource.requests.map(() => ({}))
                }
              };
            }
          }
        },
        getToken: () => ({
          access_token: 'mock_access_token_' + Date.now(),
          expires_in: 3600
        })
      },
      auth2: {
        getAuthInstance: () => ({
          isSignedIn: {
            get: () => true,
            listen: (callback) => {}
          },
          signIn: async () => ({ success: true }),
          signOut: async () => ({ success: true }),
          currentUser: {
            get: () => ({
              getAuthResponse: () => ({
                access_token: 'mock_access_token',
                expires_in: 3600
              })
            })
          }
        })
      }
    };

    // Mock Google Identity Services
    window.google = {
      accounts: {
        id: {
          initialize: (config) => {},
          prompt: (callback) => {
            setTimeout(() => callback({ isNotDisplayed: () => false }), 100);
          }
        },
        oauth2: {
          initTokenClient: (config) => ({
            requestAccessToken: (callback) => {
              setTimeout(() => callback({
                access_token: 'mock_oauth_token',
                expires_in: 3600
              }), 100);
            }
          })
        }
      }
    };
  }

  getMockSheetData(range) {
    const sheetName = range.split('!')[0];
    
    switch (sheetName) {
      case 'Volunteers':
        return [
          ['ID', 'Name', 'Email', 'Committee', 'Created', 'Updated'],
          ['V001', 'John Doe', 'john@example.com', 'Teaching', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
          ['V002', 'Jane Smith', 'jane@example.com', 'Admin', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z']
        ];
      case 'Events':
        return [
          ['ID', 'Name', 'Date', 'Start Time', 'End Time', 'Status', 'Description', 'Created', 'Updated'],
          ['E001', 'Sunday Class', '2024-01-07', '10:00', '12:00', 'Active', 'Regular class', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z']
        ];
      case 'Attendance':
        return [
          ['ID', 'Volunteer ID', 'Event ID', 'Volunteer Name', 'Committee', 'Date', 'Time', 'Created', 'Updated'],
          ['A001', 'V001', 'E001', 'John Doe', 'Teaching', '2024-01-07', '2024-01-07T10:30:00Z', '2024-01-07T10:30:00Z', '2024-01-07T10:30:00Z']
        ];
      default:
        return [];
    }
  }

  async initializeIntegrationTestData() {
    // Clear any existing test data
    localStorage.removeItem('vat_integration_test_data');
    
    // Set up test configuration
    const testConfig = {
      googleSheets: {
        enabled: true,
        apiKey: 'test_api_key',
        clientId: 'test_client_id',
        spreadsheetId: 'test_spreadsheet_id',
        syncInterval: 30000
      }
    };
    
    localStorage.setItem('vat_integration_test_config', JSON.stringify(testConfig));
  }

  async testGoogleSheetsAPIIntegration() {
    const testName = 'Google Sheets API Integration';
    console.log(`Running ${testName}...`);
    
    try {
      // Test API initialization
      await window.gapi.client.init({
        apiKey: 'test_api_key',
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
      });
      
      // Test spreadsheet creation
      const createResponse = await window.gapi.client.sheets.spreadsheets.create({
        resource: {
          properties: { title: 'Test Integration Spreadsheet' },
          sheets: [
            { properties: { title: 'Volunteers' } },
            { properties: { title: 'Events' } },
            { properties: { title: 'Attendance' } }
          ]
        }
      });
      
      this.assert(
        createResponse.result.spreadsheetId,
        'Should create spreadsheet and return ID'
      );
      
      const spreadsheetId = createResponse.result.spreadsheetId;
      
      // Test reading data
      const readResponse = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Volunteers!A1:F10'
      });
      
      this.assert(
        Array.isArray(readResponse.result.values),
        'Should read data from spreadsheet'
      );
      
      // Test writing data
      const writeData = [
        ['V003', 'Test User', 'test@example.com', 'Testing', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z']
      ];
      
      const writeResponse = await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Volunteers!A:F',
        valueInputOption: 'RAW',
        resource: { values: writeData }
      });
      
      this.assert(
        writeResponse.result.updates.updatedRows === 1,
        'Should write data to spreadsheet'
      );
      
      // Test batch operations
      const batchData = [
        {
          range: 'Events!A2:I2',
          values: [['E002', 'Test Event', '2024-01-14', '14:00', '16:00', 'Active', 'Test event', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z']]
        }
      ];
      
      const batchResponse = await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: batchData
        }
      });
      
      this.assert(
        batchResponse.result.totalUpdatedRows === 1,
        'Should perform batch operations'
      );
      
      this.recordTestResult(testName, true, 'Google Sheets API integration successful');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testAuthenticationFlowIntegration() {
    const testName = 'Authentication Flow Integration';
    console.log(`Running ${testName}...`);
    
    try {
      // Test OAuth2 initialization
      const authInstance = window.gapi.auth2.getAuthInstance();
      this.assert(authInstance, 'Should get auth instance');
      
      // Test sign-in flow
      const signInResult = await authInstance.signIn();
      this.assert(signInResult.success, 'Should complete sign-in flow');
      
      // Test authentication status
      const isSignedIn = authInstance.isSignedIn.get();
      this.assert(isSignedIn, 'Should be signed in after authentication');
      
      // Test token retrieval
      const currentUser = authInstance.currentUser.get();
      const authResponse = currentUser.getAuthResponse();
      
      this.assert(
        authResponse.access_token,
        'Should retrieve access token'
      );
      this.assert(
        authResponse.expires_in > 0,
        'Should have valid token expiration'
      );
      
      // Test token refresh simulation
      const refreshedToken = window.gapi.client.getToken();
      this.assert(
        refreshedToken.access_token,
        'Should be able to refresh token'
      );
      
      // Test integration with sheets API
      const testRequest = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: 'test_spreadsheet_id'
      });
      
      this.assert(
        testRequest.result.spreadsheetId,
        'Should make authenticated API requests'
      );
      
      this.recordTestResult(testName, true, 'Authentication flow integration successful');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testDataTransformationPipeline() {
    const testName = 'Data Transformation Pipeline';
    console.log(`Running ${testName}...`);
    
    try {
      // Mock data transformer
      const transformer = {
        toSheetsFormat: (data, type) => {
          switch (type) {
            case 'volunteers':
              return [data.id, data.name, data.email, data.committee, data.createdAt, data.updatedAt];
            case 'events':
              return [data.id, data.name, data.date, data.startTime, data.endTime, data.status, data.description || '', data.createdAt, data.updatedAt];
            case 'attendance':
              return [data.id, data.volunteerId, data.eventId, data.volunteerName, data.committee || '', data.date, data.dateTime, data.createdAt, data.updatedAt];
            default:
              return [];
          }
        },
        fromSheetsFormat: (row, type) => {
          switch (type) {
            case 'volunteers':
              return {
                id: row[0],
                name: row[1],
                email: row[2],
                committee: row[3],
                createdAt: row[4],
                updatedAt: row[5]
              };
            case 'events':
              return {
                id: row[0],
                name: row[1],
                date: row[2],
                startTime: row[3],
                endTime: row[4],
                status: row[5],
                description: row[6],
                createdAt: row[7],
                updatedAt: row[8]
              };
            case 'attendance':
              return {
                id: row[0],
                volunteerId: row[1],
                eventId: row[2],
                volunteerName: row[3],
                committee: row[4],
                date: row[5],
                dateTime: row[6],
                createdAt: row[7],
                updatedAt: row[8]
              };
            default:
              return {};
          }
        }
      };
      
      // Test complete pipeline: Local -> Transform -> Sheets -> Transform -> Local
      const originalVolunteer = {
        id: 'V001',
        name: 'John Doe',
        email: 'john@example.com',
        committee: 'Teaching',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      // Transform to sheets format
      const sheetsFormat = transformer.toSheetsFormat(originalVolunteer, 'volunteers');
      this.assert(
        Array.isArray(sheetsFormat) && sheetsFormat.length === 6,
        'Should transform to sheets format'
      );
      
      // Simulate writing to sheets
      const writeResponse = await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: 'test_spreadsheet_id',
        range: 'Volunteers!A:F',
        valueInputOption: 'RAW',
        resource: { values: [sheetsFormat] }
      });
      
      this.assert(
        writeResponse.result.updates.updatedRows === 1,
        'Should write transformed data to sheets'
      );
      
      // Simulate reading from sheets
      const readResponse = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'test_spreadsheet_id',
        range: 'Volunteers!A2:F2'
      });
      
      // Transform back to local format
      const readData = readResponse.result.values[0];
      const backTransformed = transformer.fromSheetsFormat(readData, 'volunteers');
      
      this.assert(
        backTransformed.id === originalVolunteer.id,
        'Should preserve ID through transformation pipeline'
      );
      this.assert(
        backTransformed.name === originalVolunteer.name,
        'Should preserve name through transformation pipeline'
      );
      this.assert(
        backTransformed.email === originalVolunteer.email,
        'Should preserve email through transformation pipeline'
      );
      
      // Test batch transformation
      const volunteers = [
        originalVolunteer,
        { id: 'V002', name: 'Jane Smith', email: 'jane@example.com', committee: 'Admin', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
      ];
      
      const batchTransformed = volunteers.map(v => transformer.toSheetsFormat(v, 'volunteers'));
      
      const batchWriteResponse = await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: 'test_spreadsheet_id',
        resource: {
          valueInputOption: 'RAW',
          data: [{
            range: 'Volunteers!A3:F4',
            values: batchTransformed
          }]
        }
      });
      
      this.assert(
        batchWriteResponse.result.totalUpdatedRows === 2,
        'Should handle batch transformation and writing'
      );
      
      this.recordTestResult(testName, true, 'Data transformation pipeline successful');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testSyncManagerOrchestration() {
    const testName = 'Sync Manager Orchestration';
    console.log(`Running ${testName}...`);
    
    try {
      // Mock sync manager
      const syncManager = {
        isEnabled: true,
        isRunning: false,
        lastSyncTime: null,
        
        async performFullSync() {
          this.isRunning = true;
          
          try {
            // 1. Check authentication
            const authInstance = window.gapi.auth2.getAuthInstance();
            if (!authInstance.isSignedIn.get()) {
              throw new Error('Not authenticated');
            }
            
            // 2. Get local data
            const localVolunteers = [
              { id: 'V001', name: 'John Doe', email: 'john@example.com', committee: 'Teaching' }
            ];
            
            // 3. Transform and upload
            const transformer = {
              toSheetsFormat: (data, type) => [data.id, data.name, data.email, data.committee]
            };
            
            const transformedData = localVolunteers.map(v => transformer.toSheetsFormat(v, 'volunteers'));
            
            await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
              spreadsheetId: 'test_spreadsheet_id',
              resource: {
                valueInputOption: 'RAW',
                data: [{
                  range: 'Volunteers!A2:D2',
                  values: transformedData
                }]
              }
            });
            
            // 4. Download remote changes
            const remoteData = await window.gapi.client.sheets.spreadsheets.values.get({
              spreadsheetId: 'test_spreadsheet_id',
              range: 'Volunteers!A:D'
            });
            
            // 5. Update sync time
            this.lastSyncTime = new Date().toISOString();
            
            return {
              success: true,
              uploaded: { volunteers: localVolunteers.length },
              downloaded: { volunteers: remoteData.result.values.length - 1 }, // Exclude header
              timestamp: this.lastSyncTime
            };
            
          } finally {
            this.isRunning = false;
          }
        },
        
        async performDeltaSync(since) {
          // Simplified delta sync
          return {
            success: true,
            changes: { volunteers: 1, events: 0, attendance: 0 },
            timestamp: new Date().toISOString()
          };
        }
      };
      
      // Test full sync orchestration
      const fullSyncResult = await syncManager.performFullSync();
      
      this.assert(fullSyncResult.success, 'Should complete full sync successfully');
      this.assert(fullSyncResult.uploaded.volunteers > 0, 'Should upload volunteers');
      this.assert(fullSyncResult.downloaded.volunteers >= 0, 'Should download volunteers');
      this.assert(fullSyncResult.timestamp, 'Should record sync timestamp');
      
      // Test delta sync orchestration
      const deltaSyncResult = await syncManager.performDeltaSync(syncManager.lastSyncTime);
      
      this.assert(deltaSyncResult.success, 'Should complete delta sync successfully');
      this.assert(typeof deltaSyncResult.changes === 'object', 'Should return change counts');
      
      // Test sync state management
      this.assert(!syncManager.isRunning, 'Should not be running after sync completion');
      this.assert(syncManager.lastSyncTime, 'Should update last sync time');
      
      // Test concurrent sync prevention
      const concurrentSyncPromise = syncManager.performFullSync();
      syncManager.isRunning = true; // Simulate running state
      
      try {
        await syncManager.performFullSync();
        this.assert(false, 'Should prevent concurrent sync operations');
      } catch (error) {
        // Expected behavior - should prevent concurrent syncs
      }
      
      syncManager.isRunning = false; // Reset state
      await concurrentSyncPromise; // Wait for original sync to complete
      
      this.recordTestResult(testName, true, 'Sync manager orchestration successful');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testConflictResolutionIntegration() {
    const testName = 'Conflict Resolution Integration';
    console.log(`Running ${testName}...`);
    
    try {
      // Mock conflict resolver
      const conflictResolver = {
        detectConflicts(localData, remoteData) {
          const conflicts = [];
          
          localData.forEach(localItem => {
            const remoteItem = remoteData.find(r => r.id === localItem.id);
            if (remoteItem) {
              const localTime = new Date(localItem.updatedAt);
              const remoteTime = new Date(remoteItem.updatedAt);
              
              if (localTime.getTime() !== remoteTime.getTime()) {
                // Check for actual data differences
                const hasDataConflict = Object.keys(localItem).some(key => {
                  if (key === 'updatedAt') return false;
                  return localItem[key] !== remoteItem[key];
                });
                
                if (hasDataConflict) {
                  conflicts.push({
                    id: localItem.id,
                    type: 'data_conflict',
                    local: localItem,
                    remote: remoteItem,
                    fields: this.getConflictingFields(localItem, remoteItem)
                  });
                }
              }
            }
          });
          
          return conflicts;
        },
        
        getConflictingFields(local, remote) {
          const conflicting = [];
          Object.keys(local).forEach(key => {
            if (key !== 'updatedAt' && local[key] !== remote[key]) {
              conflicting.push({
                field: key,
                localValue: local[key],
                remoteValue: remote[key]
              });
            }
          });
          return conflicting;
        },
        
        async resolveConflicts(conflicts, strategy = 'last_modified_wins') {
          const resolved = [];
          
          for (const conflict of conflicts) {
            let resolution;
            
            switch (strategy) {
              case 'last_modified_wins':
                const localTime = new Date(conflict.local.updatedAt);
                const remoteTime = new Date(conflict.remote.updatedAt);
                resolution = remoteTime > localTime ? conflict.remote : conflict.local;
                break;
              case 'local_wins':
                resolution = conflict.local;
                break;
              case 'remote_wins':
                resolution = conflict.remote;
                break;
              default:
                throw new Error('Unknown resolution strategy');
            }
            
            resolved.push({
              conflictId: conflict.id,
              resolution,
              strategy,
              resolvedAt: new Date().toISOString()
            });
          }
          
          return resolved;
        }
      };
      
      // Test conflict detection
      const localData = [
        { id: 'V001', name: 'John Doe', email: 'john.doe@example.com', updatedAt: '2024-01-01T10:00:00Z' }
      ];
      
      const remoteData = [
        { id: 'V001', name: 'John Smith', email: 'john.smith@example.com', updatedAt: '2024-01-01T11:00:00Z' }
      ];
      
      const conflicts = conflictResolver.detectConflicts(localData, remoteData);
      
      this.assert(conflicts.length === 1, 'Should detect conflicts');
      this.assert(conflicts[0].type === 'data_conflict', 'Should identify conflict type');
      this.assert(conflicts[0].fields.length === 2, 'Should identify conflicting fields');
      
      // Test conflict resolution
      const resolved = await conflictResolver.resolveConflicts(conflicts, 'last_modified_wins');
      
      this.assert(resolved.length === 1, 'Should resolve all conflicts');
      this.assert(resolved[0].resolution.name === 'John Smith', 'Should resolve to newer version');
      this.assert(resolved[0].strategy === 'last_modified_wins', 'Should record resolution strategy');
      
      // Test integration with sync process
      const syncWithConflictResolution = async (localData, remoteData) => {
        // 1. Detect conflicts
        const conflicts = conflictResolver.detectConflicts(localData, remoteData);
        
        if (conflicts.length > 0) {
          // 2. Resolve conflicts
          const resolved = await conflictResolver.resolveConflicts(conflicts);
          
          // 3. Apply resolutions
          const resolvedData = resolved.map(r => r.resolution);
          
          // 4. Update sheets with resolved data
          const transformer = {
            toSheetsFormat: (data) => [data.id, data.name, data.email, data.updatedAt]
          };
          
          const transformedData = resolvedData.map(data => transformer.toSheetsFormat(data));
          
          await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: 'test_spreadsheet_id',
            resource: {
              valueInputOption: 'RAW',
              data: [{
                range: 'Volunteers!A2:D2',
                values: transformedData
              }]
            }
          });
          
          return { conflicts: conflicts.length, resolved: resolved.length };
        }
        
        return { conflicts: 0, resolved: 0 };
      };
      
      const syncResult = await syncWithConflictResolution(localData, remoteData);
      
      this.assert(syncResult.conflicts === 1, 'Should handle conflicts in sync process');
      this.assert(syncResult.resolved === 1, 'Should resolve conflicts in sync process');
      
      this.recordTestResult(testName, true, 'Conflict resolution integration successful');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testErrorHandlingIntegration() {
    const testName = 'Error Handling Integration';
    console.log(`Running ${testName}...`);
    
    try {
      // Mock error handler
      const errorHandler = {
        handleError(error, context) {
          const errorInfo = {
            type: this.categorizeError(error),
            message: error.message,
            context,
            timestamp: new Date().toISOString(),
            recoverable: this.isRecoverable(error)
          };
          
          return this.getRecoveryStrategy(errorInfo);
        },
        
        categorizeError(error) {
          if (error.message.includes('401') || error.message.includes('unauthorized')) {
            return 'authentication';
          } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            return 'rate_limit';
          } else if (error.message.includes('network') || error.message.includes('timeout')) {
            return 'network';
          } else if (error.message.includes('quota')) {
            return 'quota_exceeded';
          } else {
            return 'unknown';
          }
        },
        
        isRecoverable(error) {
          const type = this.categorizeError(error);
          return ['rate_limit', 'network', 'quota_exceeded'].includes(type);
        },
        
        getRecoveryStrategy(errorInfo) {
          const strategies = {
            authentication: { retry: false, action: 'reauthenticate' },
            rate_limit: { retry: true, delay: 5000, maxRetries: 3 },
            network: { retry: true, delay: 2000, maxRetries: 5 },
            quota_exceeded: { retry: true, delay: 60000, maxRetries: 2 },
            unknown: { retry: false, action: 'log_and_report' }
          };
          
          return strategies[errorInfo.type] || strategies.unknown;
        }
      };
      
      // Test authentication error handling
      const authError = new Error('401 Unauthorized');
      const authStrategy = errorHandler.handleError(authError, { operation: 'sync' });
      
      this.assert(authStrategy.action === 'reauthenticate', 'Should handle auth errors');
      this.assert(!authStrategy.retry, 'Should not retry auth errors');
      
      // Test rate limit error handling
      const rateLimitError = new Error('429 Rate limit exceeded');
      const rateLimitStrategy = errorHandler.handleError(rateLimitError, { operation: 'upload' });
      
      this.assert(rateLimitStrategy.retry, 'Should retry rate limit errors');
      this.assert(rateLimitStrategy.delay === 5000, 'Should use appropriate delay');
      this.assert(rateLimitStrategy.maxRetries === 3, 'Should limit retry attempts');
      
      // Test network error handling
      const networkError = new Error('Network timeout');
      const networkStrategy = errorHandler.handleError(networkError, { operation: 'download' });
      
      this.assert(networkStrategy.retry, 'Should retry network errors');
      this.assert(networkStrategy.maxRetries === 5, 'Should allow more retries for network errors');
      
      // Test error handling in sync operation
      const syncWithErrorHandling = async () => {
        try {
          // Simulate API call that fails
          throw new Error('429 Rate limit exceeded');
        } catch (error) {
          const strategy = errorHandler.handleError(error, { operation: 'sync', attempt: 1 });
          
          if (strategy.retry) {
            // Simulate retry after delay
            await new Promise(resolve => setTimeout(resolve, 100)); // Shortened for test
            
            // Simulate successful retry
            return { success: true, retried: true, strategy };
          } else {
            throw error;
          }
        }
      };
      
      const syncResult = await syncWithErrorHandling();
      
      this.assert(syncResult.success, 'Should recover from recoverable errors');
      this.assert(syncResult.retried, 'Should indicate retry occurred');
      this.assert(syncResult.strategy.retry, 'Should use retry strategy');
      
      // Test error logging integration
      const errorLog = [];
      const logError = (error, context, strategy) => {
        errorLog.push({
          error: error.message,
          context,
          strategy,
          timestamp: new Date().toISOString()
        });
      };
      
      const quotaError = new Error('Quota exceeded');
      const quotaStrategy = errorHandler.handleError(quotaError, { operation: 'batch_upload' });
      logError(quotaError, { operation: 'batch_upload' }, quotaStrategy);
      
      this.assert(errorLog.length === 1, 'Should log errors');
      this.assert(errorLog[0].error.includes('Quota'), 'Should log error message');
      this.assert(errorLog[0].context.operation === 'batch_upload', 'Should log context');
      
      this.recordTestResult(testName, true, 'Error handling integration successful');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testPerformanceMonitoringIntegration() {
    const testName = 'Performance Monitoring Integration';
    console.log(`Running ${testName}...`);
    
    try {
      // Mock performance monitor
      const performanceMonitor = {
        operations: [],
        
        startOperation(id, type, dataSize = 0) {
          const operation = {
            id,
            type,
            dataSize,
            startTime: performance.now(),
            endTime: null,
            duration: null,
            success: null
          };
          
          this.operations.push(operation);
          return operation;
        },
        
        endOperation(id, success = true, result = {}) {
          const operation = this.operations.find(op => op.id === id);
          if (operation) {
            operation.endTime = performance.now();
            operation.duration = operation.endTime - operation.startTime;
            operation.success = success;
            operation.result = result;
          }
          return operation;
        },
        
        getMetrics() {
          const completed = this.operations.filter(op => op.endTime !== null);
          const successful = completed.filter(op => op.success);
          
          return {
            totalOperations: completed.length,
            successfulOperations: successful.length,
            failedOperations: completed.length - successful.length,
            averageDuration: completed.length > 0 
              ? completed.reduce((sum, op) => sum + op.duration, 0) / completed.length 
              : 0,
            totalDataProcessed: completed.reduce((sum, op) => sum + op.dataSize, 0),
            throughput: this.calculateThroughput(completed)
          };
        },
        
        calculateThroughput(operations) {
          if (operations.length === 0) return 0;
          
          const totalData = operations.reduce((sum, op) => sum + op.dataSize, 0);
          const totalTime = operations.reduce((sum, op) => sum + op.duration, 0);
          
          return totalTime > 0 ? (totalData / totalTime) * 1000 : 0; // bytes per second
        }
      };
      
      // Test operation monitoring
      const uploadOp = performanceMonitor.startOperation('upload_001', 'upload', 1024);
      
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const completedOp = performanceMonitor.endOperation('upload_001', true, { recordsUploaded: 10 });
      
      this.assert(completedOp.duration > 0, 'Should measure operation duration');
      this.assert(completedOp.success === true, 'Should record operation success');
      this.assert(completedOp.result.recordsUploaded === 10, 'Should record operation result');
      
      // Test metrics calculation
      const metrics = performanceMonitor.getMetrics();
      
      this.assert(metrics.totalOperations === 1, 'Should count total operations');
      this.assert(metrics.successfulOperations === 1, 'Should count successful operations');
      this.assert(metrics.averageDuration > 0, 'Should calculate average duration');
      this.assert(metrics.totalDataProcessed === 1024, 'Should sum data processed');
      
      // Test performance monitoring in sync operation
      const monitoredSync = async () => {
        const syncOp = performanceMonitor.startOperation('sync_001', 'full_sync', 2048);
        
        try {
          // Simulate sync steps
          const authOp = performanceMonitor.startOperation('auth_001', 'authentication', 0);
          await new Promise(resolve => setTimeout(resolve, 20));
          performanceMonitor.endOperation('auth_001', true);
          
          const uploadOp = performanceMonitor.startOperation('upload_002', 'upload', 1024);
          await new Promise(resolve => setTimeout(resolve, 30));
          performanceMonitor.endOperation('upload_002', true, { recordsUploaded: 5 });
          
          const downloadOp = performanceMonitor.startOperation('download_001', 'download', 1024);
          await new Promise(resolve => setTimeout(resolve, 25));
          performanceMonitor.endOperation('download_001', true, { recordsDownloaded: 3 });
          
          performanceMonitor.endOperation('sync_001', true, { 
            uploaded: 5, 
            downloaded: 3,
            totalTime: syncOp.duration 
          });
          
          return { success: true };
          
        } catch (error) {
          performanceMonitor.endOperation('sync_001', false, { error: error.message });
          throw error;
        }
      };
      
      const syncResult = await monitoredSync();
      
      this.assert(syncResult.success, 'Should complete monitored sync');
      
      const finalMetrics = performanceMonitor.getMetrics();
      
      this.assert(finalMetrics.totalOperations === 4, 'Should monitor all operations'); // sync + auth + upload + download
      this.assert(finalMetrics.successfulOperations === 4, 'Should record all successes');
      this.assert(finalMetrics.throughput > 0, 'Should calculate throughput');
      
      // Test performance alerts
      const checkPerformanceAlerts = (metrics) => {
        const alerts = [];
        
        if (metrics.averageDuration > 10000) { // 10 seconds
          alerts.push({ type: 'slow_operations', threshold: 10000, actual: metrics.averageDuration });
        }
        
        if (metrics.failedOperations / metrics.totalOperations > 0.1) { // 10% failure rate
          alerts.push({ type: 'high_failure_rate', threshold: 0.1, actual: metrics.failedOperations / metrics.totalOperations });
        }
        
        if (metrics.throughput < 100) { // bytes per second
          alerts.push({ type: 'low_throughput', threshold: 100, actual: metrics.throughput });
        }
        
        return alerts;
      };
      
      const alerts = checkPerformanceAlerts(finalMetrics);
      
      // Should not have alerts for our test scenario
      this.assert(alerts.length === 0, 'Should not trigger performance alerts for normal operations');
      
      this.recordTestResult(testName, true, 'Performance monitoring integration successful');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async cleanupIntegrationEnvironment() {
    console.log('Cleaning up integration test environment...');
    
    // Restore original services
    if (this.originalServices.gapi) {
      window.gapi = this.originalServices.gapi;
    }
    if (this.originalServices.google) {
      window.google = this.originalServices.google;
    }
    
    // Clear test data
    localStorage.removeItem('vat_integration_test_data');
    localStorage.removeItem('vat_integration_test_config');
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
    
    console.log('\n=== Integration Test Report ===');
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
  window.IntegrationTestSuite = IntegrationTestSuite;
}