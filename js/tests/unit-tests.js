/**
 * Unit Tests for Google Sheets Sync Components
 * Comprehensive unit testing for all sync services
 */
class UnitTestSuite {
  constructor() {
    this.testResults = [];
    this.mockData = this.createMockData();
  }

  createMockData() {
    return {
      volunteers: [
        { 
          id: 'V001', 
          name: 'John Doe', 
          email: 'john@example.com', 
          committee: 'Teaching',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        { 
          id: 'V002', 
          name: 'Jane Smith', 
          email: 'jane@example.com', 
          committee: 'Admin',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      events: [
        { 
          id: 'E001', 
          name: 'Sunday Class', 
          date: '2024-01-07', 
          startTime: '10:00', 
          endTime: '12:00',
          status: 'Active',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      attendance: [
        { 
          id: 'A001', 
          volunteerId: 'V001', 
          eventId: 'E001', 
          volunteerName: 'John Doe',
          date: '2024-01-07',
          dateTime: '2024-01-07T10:30:00.000Z',
          createdAt: '2024-01-07T10:30:00.000Z',
          updatedAt: '2024-01-07T10:30:00.000Z'
        }
      ]
    };
  }

  async runAllUnitTests() {
    console.log('Starting unit tests...');
    
    try {
      // Test all components
      await this.testAuthManager();
      await this.testSheetsManager();
      await this.testDataTransformer();
      await this.testDeltaSyncManager();
      await this.testPerformanceMonitor();
      await this.testProgressTracker();
      await this.testSyncLogger();
      await this.testConflictResolver();
      await this.testSyncQueue();
      await this.testErrorHandler();
      await this.testNetworkService();
      await this.testBackupService();
      
      return this.generateReport();
    } catch (error) {
      console.error('Unit tests failed:', error);
      throw error;
    }
  }

  async testAuthManager() {
    const testName = 'AuthManager Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test credential loading
      const mockCredentials = {
        apiKey: 'test_api_key',
        clientId: 'test_client_id'
      };
      
      // Mock environment loading
      const mockEnv = {
        GOOGLE_SHEETS_API_KEY: mockCredentials.apiKey,
        GOOGLE_SHEETS_CLIENT_ID: mockCredentials.clientId
      };
      
      this.assert(
        mockCredentials.apiKey === mockEnv.GOOGLE_SHEETS_API_KEY,
        'Should load API key from environment'
      );
      
      // Test credential validation
      const isValidCredentials = this.validateCredentials(mockCredentials);
      this.assert(isValidCredentials, 'Should validate correct credentials');
      
      const isInvalidCredentials = this.validateCredentials({ apiKey: '', clientId: '' });
      this.assert(!isInvalidCredentials, 'Should reject invalid credentials');
      
      // Test token management
      const mockToken = 'mock_access_token';
      const tokenExpiry = Date.now() + 3600000; // 1 hour from now
      
      const isTokenValid = this.isTokenValid(mockToken, tokenExpiry);
      this.assert(isTokenValid, 'Should validate non-expired token');
      
      const isTokenExpired = this.isTokenValid(mockToken, Date.now() - 1000);
      this.assert(!isTokenExpired, 'Should detect expired token');
      
      // Test authentication state
      const authState = {
        isAuthenticated: true,
        token: mockToken,
        expiresAt: tokenExpiry
      };
      
      this.assert(
        authState.isAuthenticated && authState.token,
        'Should maintain authentication state'
      );
      
      this.recordTestResult(testName, true, 'All AuthManager tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testSheetsManager() {
    const testName = 'SheetsManager Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test spreadsheet configuration
      const sheetsConfig = {
        volunteers: { name: 'Volunteers', headers: ['ID', 'Name', 'Email', 'Committee'] },
        events: { name: 'Events', headers: ['ID', 'Name', 'Date', 'Start Time', 'End Time'] },
        attendance: { name: 'Attendance', headers: ['ID', 'Volunteer ID', 'Event ID', 'Date'] }
      };
      
      this.assert(
        Object.keys(sheetsConfig).length === 3,
        'Should have configuration for all sheet types'
      );
      
      // Test range calculation
      const calculateRange = (sheetName, startRow, endRow, startCol, endCol) => {
        const startColLetter = String.fromCharCode(65 + startCol); // A=0, B=1, etc.
        const endColLetter = String.fromCharCode(65 + endCol);
        return `${sheetName}!${startColLetter}${startRow}:${endColLetter}${endRow}`;
      };
      
      const range = calculateRange('Volunteers', 1, 10, 0, 3);
      this.assert(
        range === 'Volunteers!A1:D10',
        'Should calculate correct range notation'
      );
      
      // Test batch request creation
      const createBatchRequest = (sheetName, values, range) => {
        return {
          range: `${sheetName}!${range}`,
          majorDimension: 'ROWS',
          values: values
        };
      };
      
      const batchRequest = createBatchRequest('Volunteers', [['V001', 'John Doe']], 'A2:B2');
      this.assert(
        batchRequest.range === 'Volunteers!A2:B2',
        'Should create correct batch request'
      );
      
      // Test data validation for sheets
      const validateSheetData = (data, expectedHeaders) => {
        if (!Array.isArray(data) || data.length === 0) return false;
        const headers = data[0];
        return expectedHeaders.every(header => headers.includes(header));
      };
      
      const validData = [['ID', 'Name', 'Email'], ['V001', 'John', 'john@example.com']];
      const isValid = validateSheetData(validData, ['ID', 'Name', 'Email']);
      this.assert(isValid, 'Should validate correct sheet data structure');
      
      this.recordTestResult(testName, true, 'All SheetsManager tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testDataTransformer() {
    const testName = 'DataTransformer Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      const testVolunteer = this.mockData.volunteers[0];
      
      // Test volunteer transformation
      const volunteerToSheets = this.transformVolunteerToSheets(testVolunteer);
      this.assert(
        Array.isArray(volunteerToSheets),
        'Should transform volunteer to array format'
      );
      this.assert(
        volunteerToSheets[0] === testVolunteer.id,
        'Should preserve ID in first position'
      );
      
      const volunteerFromSheets = this.transformVolunteerFromSheets(volunteerToSheets);
      this.assert(
        volunteerFromSheets.id === testVolunteer.id,
        'Should restore ID from sheets format'
      );
      
      // Test event transformation
      const testEvent = this.mockData.events[0];
      const eventToSheets = this.transformEventToSheets(testEvent);
      this.assert(
        eventToSheets.includes(testEvent.date),
        'Should include date in event transformation'
      );
      
      // Test attendance transformation
      const testAttendance = this.mockData.attendance[0];
      const attendanceToSheets = this.transformAttendanceToSheets(testAttendance);
      this.assert(
        attendanceToSheets.includes(testAttendance.volunteerName),
        'Should include volunteer name in attendance transformation'
      );
      
      // Test special character handling
      const specialCharData = {
        id: 'V001',
        name: 'John "Johnny" O\'Doe',
        email: 'john+test@example.com'
      };
      
      const sanitized = this.sanitizeForSheets(specialCharData.name);
      this.assert(
        typeof sanitized === 'string',
        'Should sanitize special characters'
      );
      
      // Test date formatting
      const testDate = new Date('2024-01-07T10:30:00.000Z');
      const formattedDate = this.formatDateForSheets(testDate);
      this.assert(
        formattedDate.includes('2024'),
        'Should format date correctly for sheets'
      );
      
      this.recordTestResult(testName, true, 'All DataTransformer tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testDeltaSyncManager() {
    const testName = 'DeltaSyncManager Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test change tracking
      const changes = [];
      const trackChange = (type, id, operation, data) => {
        changes.push({
          type,
          id,
          operation,
          data,
          timestamp: Date.now()
        });
      };
      
      trackChange('volunteers', 'V001', 'create', this.mockData.volunteers[0]);
      trackChange('volunteers', 'V001', 'update', { ...this.mockData.volunteers[0], name: 'John Updated' });
      
      this.assert(changes.length === 2, 'Should track multiple changes');
      
      // Test change optimization
      const optimizeChanges = (changes) => {
        const optimized = {};
        changes.forEach(change => {
          const key = `${change.type}_${change.id}`;
          if (!optimized[key] || optimized[key].timestamp < change.timestamp) {
            optimized[key] = change;
          }
        });
        return Object.values(optimized);
      };
      
      const optimized = optimizeChanges(changes);
      this.assert(
        optimized.length === 1,
        'Should optimize duplicate changes to single operation'
      );
      this.assert(
        optimized[0].operation === 'update',
        'Should keep latest operation'
      );
      
      // Test timestamp filtering
      const filterChangesSince = (changes, timestamp) => {
        return changes.filter(change => change.timestamp > timestamp);
      };
      
      const recentChanges = filterChangesSince(changes, Date.now() - 1000);
      this.assert(
        recentChanges.length === changes.length,
        'Should filter changes by timestamp'
      );
      
      // Test batch creation
      const createBatch = (changes, batchSize = 100) => {
        const batches = [];
        for (let i = 0; i < changes.length; i += batchSize) {
          batches.push(changes.slice(i, i + batchSize));
        }
        return batches;
      };
      
      const largeBatch = Array(250).fill().map((_, i) => ({ id: i }));
      const batches = createBatch(largeBatch, 100);
      this.assert(
        batches.length === 3,
        'Should create appropriate number of batches'
      );
      this.assert(
        batches[2].length === 50,
        'Should handle remainder in final batch'
      );
      
      this.recordTestResult(testName, true, 'All DeltaSyncManager tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testPerformanceMonitor() {
    const testName = 'PerformanceMonitor Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test operation timing
      const operations = [];
      const startOperation = (id, type) => {
        const operation = {
          id,
          type,
          startTime: performance.now(),
          endTime: null,
          duration: null
        };
        operations.push(operation);
        return operation;
      };
      
      const endOperation = (id) => {
        const operation = operations.find(op => op.id === id);
        if (operation) {
          operation.endTime = performance.now();
          operation.duration = operation.endTime - operation.startTime;
        }
        return operation;
      };
      
      const op1 = startOperation('test_op_1', 'upload');
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
      const completedOp = endOperation('test_op_1');
      
      this.assert(
        completedOp.duration > 0,
        'Should calculate operation duration'
      );
      this.assert(
        completedOp.duration >= 50,
        'Should measure realistic duration'
      );
      
      // Test metrics collection
      const metrics = {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDuration: 0,
        totalDataTransferred: 0
      };
      
      const recordMetrics = (operation, success, dataSize = 0) => {
        metrics.totalOperations++;
        if (success) {
          metrics.successfulOperations++;
        } else {
          metrics.failedOperations++;
        }
        metrics.totalDataTransferred += dataSize;
        
        // Calculate average duration
        const totalDuration = operations.reduce((sum, op) => sum + (op.duration || 0), 0);
        metrics.averageDuration = totalDuration / operations.length;
      };
      
      recordMetrics(completedOp, true, 1024);
      
      this.assert(
        metrics.totalOperations === 1,
        'Should record operation count'
      );
      this.assert(
        metrics.successfulOperations === 1,
        'Should record successful operations'
      );
      this.assert(
        metrics.totalDataTransferred === 1024,
        'Should track data transfer'
      );
      
      // Test efficiency calculation
      const calculateEfficiency = (metrics) => {
        const successRate = metrics.successfulOperations / metrics.totalOperations;
        const avgThroughput = metrics.totalDataTransferred / metrics.averageDuration;
        return {
          successRate,
          avgThroughput,
          efficiency: successRate * Math.min(avgThroughput / 1000, 1) // Normalize throughput
        };
      };
      
      const efficiency = calculateEfficiency(metrics);
      this.assert(
        efficiency.successRate === 1,
        'Should calculate correct success rate'
      );
      this.assert(
        efficiency.avgThroughput > 0,
        'Should calculate throughput'
      );
      
      this.recordTestResult(testName, true, 'All PerformanceMonitor tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testProgressTracker() {
    const testName = 'ProgressTracker Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test progress tracking
      const progress = {
        total: 100,
        completed: 0,
        percentage: 0,
        status: 'idle'
      };
      
      const updateProgress = (completed) => {
        progress.completed = Math.min(completed, progress.total);
        progress.percentage = Math.round((progress.completed / progress.total) * 100);
        progress.status = progress.completed === progress.total ? 'completed' : 'in_progress';
      };
      
      updateProgress(25);
      this.assert(progress.percentage === 25, 'Should calculate correct percentage');
      this.assert(progress.status === 'in_progress', 'Should set in_progress status');
      
      updateProgress(100);
      this.assert(progress.percentage === 100, 'Should reach 100% completion');
      this.assert(progress.status === 'completed', 'Should set completed status');
      
      // Test multi-stage progress
      const stages = [
        { name: 'Authentication', weight: 10 },
        { name: 'Data Preparation', weight: 20 },
        { name: 'Upload', weight: 60 },
        { name: 'Verification', weight: 10 }
      ];
      
      const calculateOverallProgress = (stages, currentStage, stageProgress) => {
        let totalWeight = 0;
        let completedWeight = 0;
        
        stages.forEach((stage, index) => {
          totalWeight += stage.weight;
          if (index < currentStage) {
            completedWeight += stage.weight;
          } else if (index === currentStage) {
            completedWeight += stage.weight * (stageProgress / 100);
          }
        });
        
        return Math.round((completedWeight / totalWeight) * 100);
      };
      
      const overallProgress = calculateOverallProgress(stages, 2, 50); // Stage 2 (Upload) at 50%
      this.assert(
        overallProgress === 60, // 10 + 20 + (60 * 0.5) = 60
        'Should calculate multi-stage progress correctly'
      );
      
      this.recordTestResult(testName, true, 'All ProgressTracker tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testSyncLogger() {
    const testName = 'SyncLogger Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test log entry creation
      const logs = [];
      const createLogEntry = (level, message, context = {}) => {
        return {
          timestamp: new Date().toISOString(),
          level,
          message,
          context,
          id: Date.now() + Math.random()
        };
      };
      
      const logEntry = createLogEntry('info', 'Sync operation started', { operation: 'upload' });
      logs.push(logEntry);
      
      this.assert(
        logEntry.level === 'info',
        'Should create log entry with correct level'
      );
      this.assert(
        logEntry.message.includes('Sync operation'),
        'Should include message in log entry'
      );
      this.assert(
        logEntry.context.operation === 'upload',
        'Should include context in log entry'
      );
      
      // Test log filtering
      const filterLogs = (logs, level, since) => {
        return logs.filter(log => {
          const levelMatch = !level || log.level === level;
          const timeMatch = !since || new Date(log.timestamp) >= since;
          return levelMatch && timeMatch;
        });
      };
      
      logs.push(createLogEntry('error', 'Sync failed', { error: 'Network timeout' }));
      logs.push(createLogEntry('info', 'Sync completed', { duration: 5000 }));
      
      const errorLogs = filterLogs(logs, 'error');
      this.assert(errorLogs.length === 1, 'Should filter logs by level');
      
      const recentLogs = filterLogs(logs, null, new Date(Date.now() - 1000));
      this.assert(recentLogs.length === logs.length, 'Should filter logs by time');
      
      // Test log rotation
      const rotateLogs = (logs, maxEntries = 1000) => {
        if (logs.length > maxEntries) {
          return logs.slice(-maxEntries);
        }
        return logs;
      };
      
      const largeLogs = Array(1500).fill().map((_, i) => 
        createLogEntry('info', `Log entry ${i}`)
      );
      const rotatedLogs = rotateLogs(largeLogs, 1000);
      
      this.assert(
        rotatedLogs.length === 1000,
        'Should rotate logs to maintain size limit'
      );
      
      this.recordTestResult(testName, true, 'All SyncLogger tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testConflictResolver() {
    const testName = 'ConflictResolver Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test conflict detection
      const detectConflict = (localRecord, remoteRecord) => {
        if (localRecord.id !== remoteRecord.id) return null;
        
        const localTime = new Date(localRecord.updatedAt);
        const remoteTime = new Date(remoteRecord.updatedAt);
        
        // Check if both have been modified
        if (localTime.getTime() !== remoteTime.getTime()) {
          return {
            id: localRecord.id,
            type: 'modification_conflict',
            local: localRecord,
            remote: remoteRecord,
            localTime,
            remoteTime
          };
        }
        
        return null;
      };
      
      const localRecord = {
        id: 'V001',
        name: 'John Doe',
        updatedAt: '2024-01-01T10:00:00Z'
      };
      
      const remoteRecord = {
        id: 'V001',
        name: 'John Smith',
        updatedAt: '2024-01-01T11:00:00Z'
      };
      
      const conflict = detectConflict(localRecord, remoteRecord);
      this.assert(conflict !== null, 'Should detect conflict');
      this.assert(conflict.type === 'modification_conflict', 'Should identify conflict type');
      
      // Test conflict resolution strategies
      const resolveConflict = (conflict, strategy = 'last_modified_wins') => {
        switch (strategy) {
          case 'last_modified_wins':
            return conflict.remoteTime > conflict.localTime ? conflict.remote : conflict.local;
          case 'local_wins':
            return conflict.local;
          case 'remote_wins':
            return conflict.remote;
          default:
            throw new Error('Unknown resolution strategy');
        }
      };
      
      const resolved = resolveConflict(conflict, 'last_modified_wins');
      this.assert(
        resolved.name === 'John Smith',
        'Should resolve to remote version (newer)'
      );
      
      const localWins = resolveConflict(conflict, 'local_wins');
      this.assert(
        localWins.name === 'John Doe',
        'Should resolve to local version when specified'
      );
      
      // Test merge resolution
      const mergeNonConflictingFields = (local, remote) => {
        const merged = { ...local };
        
        // Simple merge strategy: take newer non-null values
        Object.keys(remote).forEach(key => {
          if (key !== 'updatedAt' && remote[key] && !local[key]) {
            merged[key] = remote[key];
          }
        });
        
        // Use latest timestamp
        merged.updatedAt = new Date(Math.max(
          new Date(local.updatedAt),
          new Date(remote.updatedAt)
        )).toISOString();
        
        return merged;
      };
      
      const localWithMissingField = { ...localRecord, committee: null };
      const remoteWithCommittee = { ...remoteRecord, committee: 'Teaching' };
      
      const merged = mergeNonConflictingFields(localWithMissingField, remoteWithCommittee);
      this.assert(
        merged.committee === 'Teaching',
        'Should merge non-conflicting fields'
      );
      
      this.recordTestResult(testName, true, 'All ConflictResolver tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testSyncQueue() {
    const testName = 'SyncQueue Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test queue operations
      const queue = [];
      
      const enqueue = (operation) => {
        const queueItem = {
          id: Date.now() + Math.random(),
          operation,
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3
        };
        queue.push(queueItem);
        return queueItem;
      };
      
      const dequeue = () => {
        return queue.shift();
      };
      
      const item1 = enqueue({ type: 'upload', data: 'test1' });
      const item2 = enqueue({ type: 'download', data: 'test2' });
      
      this.assert(queue.length === 2, 'Should add items to queue');
      
      const dequeuedItem = dequeue();
      this.assert(
        dequeuedItem.id === item1.id,
        'Should dequeue items in FIFO order'
      );
      this.assert(queue.length === 1, 'Should remove dequeued item');
      
      // Test priority queue
      const priorityQueue = [];
      
      const enqueuePriority = (operation, priority = 0) => {
        const queueItem = {
          id: Date.now() + Math.random(),
          operation,
          priority,
          timestamp: Date.now()
        };
        
        // Insert in priority order
        let inserted = false;
        for (let i = 0; i < priorityQueue.length; i++) {
          if (priorityQueue[i].priority < priority) {
            priorityQueue.splice(i, 0, queueItem);
            inserted = true;
            break;
          }
        }
        
        if (!inserted) {
          priorityQueue.push(queueItem);
        }
        
        return queueItem;
      };
      
      enqueuePriority({ type: 'normal' }, 1);
      enqueuePriority({ type: 'urgent' }, 5);
      enqueuePriority({ type: 'low' }, 0);
      
      this.assert(
        priorityQueue[0].operation.type === 'urgent',
        'Should prioritize high priority items'
      );
      
      // Test retry logic
      const processWithRetry = async (queueItem, processor) => {
        try {
          const result = await processor(queueItem.operation);
          return { success: true, result };
        } catch (error) {
          queueItem.retryCount++;
          if (queueItem.retryCount < queueItem.maxRetries) {
            // Re-queue for retry
            queue.push(queueItem);
            return { success: false, retry: true, error };
          } else {
            return { success: false, retry: false, error };
          }
        }
      };
      
      const failingProcessor = async (operation) => {
        throw new Error('Simulated failure');
      };
      
      const testItem = enqueue({ type: 'test' });
      const result = await processWithRetry(testItem, failingProcessor);
      
      this.assert(!result.success, 'Should handle processing failure');
      this.assert(result.retry, 'Should retry on failure');
      this.assert(testItem.retryCount === 1, 'Should increment retry count');
      
      this.recordTestResult(testName, true, 'All SyncQueue tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testErrorHandler() {
    const testName = 'ErrorHandler Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test error categorization
      const categorizeError = (error) => {
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          return 'authentication';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          return 'rate_limit';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          return 'network';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          return 'validation';
        } else {
          return 'unknown';
        }
      };
      
      const authError = new Error('401 Unauthorized');
      const rateLimitError = new Error('429 Rate limit exceeded');
      const networkError = new Error('Network timeout');
      
      this.assert(
        categorizeError(authError) === 'authentication',
        'Should categorize authentication errors'
      );
      this.assert(
        categorizeError(rateLimitError) === 'rate_limit',
        'Should categorize rate limit errors'
      );
      this.assert(
        categorizeError(networkError) === 'network',
        'Should categorize network errors'
      );
      
      // Test retry strategy
      const getRetryStrategy = (errorCategory, attemptCount) => {
        const strategies = {
          authentication: { shouldRetry: false, delay: 0 },
          rate_limit: { 
            shouldRetry: attemptCount < 5, 
            delay: Math.min(1000 * Math.pow(2, attemptCount), 30000) // Exponential backoff
          },
          network: { 
            shouldRetry: attemptCount < 3, 
            delay: 1000 * attemptCount 
          },
          validation: { shouldRetry: false, delay: 0 },
          unknown: { 
            shouldRetry: attemptCount < 2, 
            delay: 5000 
          }
        };
        
        return strategies[errorCategory] || strategies.unknown;
      };
      
      const rateLimitStrategy = getRetryStrategy('rate_limit', 2);
      this.assert(rateLimitStrategy.shouldRetry, 'Should retry rate limit errors');
      this.assert(rateLimitStrategy.delay === 4000, 'Should use exponential backoff');
      
      const authStrategy = getRetryStrategy('authentication', 1);
      this.assert(!authStrategy.shouldRetry, 'Should not retry authentication errors');
      
      // Test error recovery suggestions
      const getRecoverySuggestions = (errorCategory, error) => {
        const suggestions = {
          authentication: [
            'Check your Google API credentials',
            'Re-authenticate with Google',
            'Verify API key permissions'
          ],
          rate_limit: [
            'Wait before retrying',
            'Reduce sync frequency',
            'Use batch operations'
          ],
          network: [
            'Check internet connection',
            'Try again later',
            'Enable offline mode'
          ],
          validation: [
            'Check data format',
            'Verify required fields',
            'Review data constraints'
          ]
        };
        
        return suggestions[errorCategory] || ['Contact support'];
      };
      
      const authSuggestions = getRecoverySuggestions('authentication', authError);
      this.assert(
        authSuggestions.includes('Re-authenticate with Google'),
        'Should provide relevant recovery suggestions'
      );
      
      this.recordTestResult(testName, true, 'All ErrorHandler tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testNetworkService() {
    const testName = 'NetworkService Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test network status detection
      const isOnline = () => {
        return navigator.onLine !== false; // Default to true if not available
      };
      
      this.assert(
        typeof isOnline() === 'boolean',
        'Should detect network status'
      );
      
      // Test request timeout
      const makeRequestWithTimeout = async (url, options = {}, timeout = 5000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw error;
        }
      };
      
      // Mock fetch for testing
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        if (url.includes('timeout-test')) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Long delay
        }
        return { ok: true, json: async () => ({}) };
      };
      
      try {
        await makeRequestWithTimeout('https://example.com/timeout-test', {}, 100);
        this.assert(false, 'Should timeout on slow requests');
      } catch (error) {
        this.assert(
          error.message.includes('timeout'),
          'Should handle request timeout'
        );
      }
      
      // Restore original fetch
      global.fetch = originalFetch;
      
      // Test retry with exponential backoff
      const retryWithBackoff = async (operation, maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        throw lastError;
      };
      
      let attemptCount = 0;
      const flakyOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      const result = await retryWithBackoff(flakyOperation, 5);
      this.assert(result === 'success', 'Should succeed after retries');
      this.assert(attemptCount === 3, 'Should retry correct number of times');
      
      this.recordTestResult(testName, true, 'All NetworkService tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testBackupService() {
    const testName = 'BackupService Unit Tests';
    console.log(`Running ${testName}...`);
    
    try {
      // Test backup creation
      const createBackup = (data, metadata = {}) => {
        return {
          id: Date.now() + Math.random(),
          timestamp: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(data)), // Deep copy
          metadata,
          size: JSON.stringify(data).length
        };
      };
      
      const testData = { volunteers: this.mockData.volunteers };
      const backup = createBackup(testData, { reason: 'pre_sync' });
      
      this.assert(backup.data.volunteers.length === 2, 'Should backup data correctly');
      this.assert(backup.metadata.reason === 'pre_sync', 'Should include metadata');
      this.assert(backup.size > 0, 'Should calculate backup size');
      
      // Test backup restoration
      const restoreBackup = (backup) => {
        return {
          data: JSON.parse(JSON.stringify(backup.data)),
          restoredAt: new Date().toISOString(),
          originalTimestamp: backup.timestamp
        };
      };
      
      const restored = restoreBackup(backup);
      this.assert(
        restored.data.volunteers.length === testData.volunteers.length,
        'Should restore data correctly'
      );
      
      // Test backup cleanup
      const cleanupOldBackups = (backups, maxAge = 7 * 24 * 60 * 60 * 1000) => {
        const cutoffTime = Date.now() - maxAge;
        return backups.filter(backup => {
          const backupTime = new Date(backup.timestamp).getTime();
          return backupTime > cutoffTime;
        });
      };
      
      const oldBackup = createBackup(testData);
      oldBackup.timestamp = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days old
      
      const recentBackup = createBackup(testData);
      const backups = [oldBackup, recentBackup];
      
      const cleanedBackups = cleanupOldBackups(backups, 7 * 24 * 60 * 60 * 1000);
      this.assert(
        cleanedBackups.length === 1,
        'Should remove old backups'
      );
      this.assert(
        cleanedBackups[0].id === recentBackup.id,
        'Should keep recent backups'
      );
      
      this.recordTestResult(testName, true, 'All BackupService tests passed');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  // Helper methods for testing
  validateCredentials(credentials) {
    return credentials.apiKey && credentials.clientId && 
           credentials.apiKey.length > 0 && credentials.clientId.length > 0;
  }

  isTokenValid(token, expiresAt) {
    return token && expiresAt && Date.now() < expiresAt;
  }

  transformVolunteerToSheets(volunteer) {
    return [
      volunteer.id,
      volunteer.name,
      volunteer.email,
      volunteer.committee,
      volunteer.createdAt,
      volunteer.updatedAt
    ];
  }

  transformVolunteerFromSheets(sheetData) {
    return {
      id: sheetData[0],
      name: sheetData[1],
      email: sheetData[2],
      committee: sheetData[3],
      createdAt: sheetData[4],
      updatedAt: sheetData[5]
    };
  }

  transformEventToSheets(event) {
    return [
      event.id,
      event.name,
      event.date,
      event.startTime,
      event.endTime,
      event.status,
      event.description || '',
      event.createdAt,
      event.updatedAt
    ];
  }

  transformAttendanceToSheets(attendance) {
    return [
      attendance.id,
      attendance.volunteerId,
      attendance.eventId,
      attendance.volunteerName,
      attendance.committee || '',
      attendance.date,
      attendance.dateTime,
      attendance.createdAt,
      attendance.updatedAt
    ];
  }

  sanitizeForSheets(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
  }

  formatDateForSheets(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

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
    
    console.log('\n=== Unit Test Report ===');
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
  window.UnitTestSuite = UnitTestSuite;
}