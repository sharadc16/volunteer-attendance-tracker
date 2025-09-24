/**
 * Error Scenario and Edge Case Tests for Google Sheets Sync
 * Tests error handling, edge cases, and boundary conditions
 */
class ErrorScenarioTestSuite {
  constructor() {
    this.testResults = [];
    this.errorScenarios = this.createErrorScenarios();
  }

  createErrorScenarios() {
    return {
      authentication: [
        { code: 401, message: 'Unauthorized', type: 'invalid_credentials' },
        { code: 403, message: 'Forbidden', type: 'insufficient_permissions' },
        { code: 'token_expired', message: 'Token expired', type: 'expired_token' }
      ],
      network: [
        { code: 'NETWORK_ERROR', message: 'Network timeout', type: 'timeout' },
        { code: 'ENOTFOUND', message: 'DNS resolution failed', type: 'dns_error' },
        { code: 'ECONNREFUSED', message: 'Connection refused', type: 'connection_error' }
      ],
      api: [
        { code: 429, message: 'Rate limit exceeded', type: 'rate_limit' },
        { code: 500, message: 'Internal server error', type: 'server_error' },
        { code: 503, message: 'Service unavailable', type: 'service_unavailable' },
        { code: 'QUOTA_EXCEEDED', message: 'Quota exceeded', type: 'quota_limit' }
      ],
      data: [
        { code: 'INVALID_DATA', message: 'Invalid data format', type: 'validation_error' },
        { code: 'MISSING_FIELD', message: 'Required field missing', type: 'missing_data' },
        { code: 'DATA_TOO_LARGE', message: 'Data exceeds size limit', type: 'size_limit' }
      ]
    };
  }

  async runAllErrorScenarioTests() {
    console.log('Starting error scenario and edge case tests...');
    
    try {
      await this.setupErrorTestEnvironment();
      
      // Test authentication errors
      await this.testAuthenticationErrors();
      
      // Test network errors
      await this.testNetworkErrors();
      
      // Test API errors
      await this.testAPIErrors();
      
      // Test data validation errors
      await this.testDataValidationErrors();
      
      // Test edge cases
      await this.testEdgeCases();
      
      // Test boundary conditions
      await this.testBoundaryConditions();
      
      // Test concurrent operation errors
      await this.testConcurrentOperationErrors();
      
      // Test recovery scenarios
      await this.testRecoveryScenarios();
      
      await this.cleanupErrorTestEnvironment();
      
      return this.generateReport();
    } catch (error) {
      console.error('Error scenario tests failed:', error);
      await this.cleanupErrorTestEnvironment();
      throw error;
    }
  }

  async setupErrorTestEnvironment() {
    console.log('Setting up error test environment...');
    
    // Create mock services that can simulate errors
    this.mockServices = this.createErrorSimulatingServices();
  }

  createErrorSimulatingServices() {
    return {
      auth: this.createErrorSimulatingAuth(),
      sheets: this.createErrorSimulatingSheets(),
      network: this.createErrorSimulatingNetwork(),
      validator: this.createDataValidator()
    };
  }  cr
eateErrorSimulatingAuth() {
    let shouldFail = false;
    let failureType = null;
    
    return {
      simulateError(type) {
        shouldFail = true;
        failureType = type;
      },
      
      clearError() {
        shouldFail = false;
        failureType = null;
      },
      
      async authenticate() {
        if (shouldFail) {
          switch (failureType) {
            case 'invalid_credentials':
              throw new Error('401 Unauthorized: Invalid credentials');
            case 'insufficient_permissions':
              throw new Error('403 Forbidden: Insufficient permissions');
            case 'expired_token':
              throw new Error('Token expired');
            default:
              throw new Error('Authentication failed');
          }
        }
        return { success: true, token: 'valid_token' };
      },
      
      async refreshToken() {
        if (shouldFail && failureType === 'expired_token') {
          throw new Error('Refresh token expired');
        }
        return { success: true, token: 'refreshed_token' };
      },
      
      isAuthenticated() {
        return !shouldFail;
      }
    };
  }

  createErrorSimulatingSheets() {
    let shouldFail = false;
    let failureType = null;
    let failureCount = 0;
    let maxFailures = 1;
    
    return {
      simulateError(type, count = 1) {
        shouldFail = true;
        failureType = type;
        failureCount = 0;
        maxFailures = count;
      },
      
      clearError() {
        shouldFail = false;
        failureType = null;
        failureCount = 0;
      },
      
      async createSpreadsheet(title) {
        if (shouldFail && failureCount < maxFailures) {
          failureCount++;
          this.throwError(failureType);
        }
        return { spreadsheetId: 'test_spreadsheet_' + Date.now() };
      },
      
      async readSheet(spreadsheetId, sheetName) {
        if (shouldFail && failureCount < maxFailures) {
          failureCount++;
          this.throwError(failureType);
        }
        return [['ID', 'Name'], ['1', 'Test']];
      },
      
      async writeSheet(spreadsheetId, sheetName, data) {
        if (shouldFail && failureCount < maxFailures) {
          failureCount++;
          this.throwError(failureType);
        }
        return { success: true, updatedRows: data.length };
      },
      
      throwError(type) {
        switch (type) {
          case 'rate_limit':
            throw new Error('429 Rate limit exceeded');
          case 'server_error':
            throw new Error('500 Internal server error');
          case 'service_unavailable':
            throw new Error('503 Service unavailable');
          case 'quota_limit':
            throw new Error('Quota exceeded');
          case 'network_timeout':
            throw new Error('Network timeout');
          default:
            throw new Error('API error');
        }
      }
    };
  }

  createErrorSimulatingNetwork() {
    let isOnline = true;
    let shouldTimeout = false;
    let timeoutDuration = 5000;
    
    return {
      setOnline(online) {
        isOnline = online;
      },
      
      simulateTimeout(duration = 5000) {
        shouldTimeout = true;
        timeoutDuration = duration;
      },
      
      clearTimeout() {
        shouldTimeout = false;
      },
      
      isOnline() {
        return isOnline;
      },
      
      async makeRequest(url, options = {}) {
        if (!isOnline) {
          throw new Error('Network unavailable');
        }
        
        if (shouldTimeout) {
          await new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeoutDuration);
          });
        }
        
        return { success: true, data: {} };
      }
    };
  }

  createDataValidator() {
    return {
      validateVolunteer(volunteer) {
        const errors = [];
        
        if (!volunteer.id) errors.push('ID is required');
        if (!volunteer.name) errors.push('Name is required');
        // Email is optional - only validate format if provided
        if (volunteer.email && !this.isValidEmail(volunteer.email)) {
          errors.push('Invalid email format');
        }
        
        return { valid: errors.length === 0, errors };
      },
      
      validateEvent(event) {
        const errors = [];
        
        if (!event.id) errors.push('ID is required');
        if (!event.name) errors.push('Name is required');
        if (!event.date) errors.push('Date is required');
        if (event.date && !this.isValidDate(event.date)) {
          errors.push('Invalid date format');
        }
        
        return { valid: errors.length === 0, errors };
      },
      
      validateAttendance(attendance) {
        const errors = [];
        
        if (!attendance.id) errors.push('ID is required');
        if (!attendance.volunteerId) errors.push('Volunteer ID is required');
        if (!attendance.eventId) errors.push('Event ID is required');
        if (!attendance.date) errors.push('Date is required');
        
        return { valid: errors.length === 0, errors };
      },
      
      isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      
      isValidDate(date) {
        return !isNaN(Date.parse(date));
      },
      
      checkDataSize(data) {
        const size = JSON.stringify(data).length;
        const maxSize = 1024 * 1024; // 1MB
        return { valid: size <= maxSize, size, maxSize };
      }
    };
  }

  async testAuthenticationErrors() {
    const testName = 'Authentication Error Handling';
    console.log(`Running ${testName}...`);
    
    try {
      // Test invalid credentials
      this.mockServices.auth.simulateError('invalid_credentials');
      
      try {
        await this.mockServices.auth.authenticate();
        this.assert(false, 'Should throw authentication error');
      } catch (error) {
        this.assert(
          error.message.includes('401'),
          'Should handle invalid credentials error'
        );
      }
      
      // Test insufficient permissions
      this.mockServices.auth.simulateError('insufficient_permissions');
      
      try {
        await this.mockServices.auth.authenticate();
        this.assert(false, 'Should throw permission error');
      } catch (error) {
        this.assert(
          error.message.includes('403'),
          'Should handle insufficient permissions error'
        );
      }
      
      // Test token expiration
      this.mockServices.auth.simulateError('expired_token');
      
      try {
        await this.mockServices.auth.refreshToken();
        this.assert(false, 'Should throw token expiration error');
      } catch (error) {
        this.assert(
          error.message.includes('expired'),
          'Should handle token expiration error'
        );
      }
      
      // Test recovery from authentication errors
      this.mockServices.auth.clearError();
      const recoveryResult = await this.mockServices.auth.authenticate();
      this.assert(recoveryResult.success, 'Should recover from authentication errors');
      
      this.recordTestResult(testName, true, 'All authentication error scenarios handled correctly');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testNetworkErrors() {
    const testName = 'Network Error Handling';
    console.log(`Running ${testName}...`);
    
    try {
      // Test offline scenario
      this.mockServices.network.setOnline(false);
      
      try {
        await this.mockServices.network.makeRequest('https://example.com');
        this.assert(false, 'Should throw network unavailable error');
      } catch (error) {
        this.assert(
          error.message.includes('unavailable'),
          'Should handle offline scenario'
        );
      }
      
      // Test timeout scenario
      this.mockServices.network.setOnline(true);
      this.mockServices.network.simulateTimeout(100);
      
      try {
        await this.mockServices.network.makeRequest('https://example.com');
        this.assert(false, 'Should throw timeout error');
      } catch (error) {
        this.assert(
          error.message.includes('timeout'),
          'Should handle request timeout'
        );
      }
      
      // Test network recovery
      this.mockServices.network.clearTimeout();
      const recoveryResult = await this.mockServices.network.makeRequest('https://example.com');
      this.assert(recoveryResult.success, 'Should recover from network errors');
      
      // Test retry logic with exponential backoff
      const retryWithBackoff = async (operation, maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
              const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000); // Shortened for test
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        throw lastError;
      };
      
      // Simulate intermittent network issues
      let attemptCount = 0;
      const flakyNetworkOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return { success: true };
      };
      
      const retryResult = await retryWithBackoff(flakyNetworkOperation, 5);
      this.assert(retryResult.success, 'Should succeed with retry logic');
      this.assert(attemptCount === 3, 'Should retry correct number of times');
      
      this.recordTestResult(testName, true, 'All network error scenarios handled correctly');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testAPIErrors() {
    const testName = 'API Error Handling';
    console.log(`Running ${testName}...`);
    
    try {
      // Test rate limiting
      this.mockServices.sheets.simulateError('rate_limit', 2);
      
      let rateLimitHit = false;
      try {
        await this.mockServices.sheets.readSheet('test', 'sheet1');
        this.assert(false, 'Should throw rate limit error');
      } catch (error) {
        rateLimitHit = error.message.includes('429');
        this.assert(rateLimitHit, 'Should handle rate limit error');
      }
      
      // Test rate limit recovery after retry
      try {
        await this.mockServices.sheets.readSheet('test', 'sheet1');
        this.assert(false, 'Should still be rate limited');
      } catch (error) {
        this.assert(error.message.includes('429'), 'Should still be rate limited');
      }
      
      // Third attempt should succeed
      const recoveryResult = await this.mockServices.sheets.readSheet('test', 'sheet1');
      this.assert(Array.isArray(recoveryResult), 'Should recover after rate limit period');
      
      // Test server errors
      this.mockServices.sheets.simulateError('server_error');
      
      try {
        await this.mockServices.sheets.writeSheet('test', 'sheet1', []);
        this.assert(false, 'Should throw server error');
      } catch (error) {
        this.assert(
          error.message.includes('500'),
          'Should handle server error'
        );
      }
      
      // Test service unavailable
      this.mockServices.sheets.simulateError('service_unavailable');
      
      try {
        await this.mockServices.sheets.createSpreadsheet('test');
        this.assert(false, 'Should throw service unavailable error');
      } catch (error) {
        this.assert(
          error.message.includes('503'),
          'Should handle service unavailable error'
        );
      }
      
      // Test quota exceeded
      this.mockServices.sheets.simulateError('quota_limit');
      
      try {
        await this.mockServices.sheets.writeSheet('test', 'sheet1', []);
        this.assert(false, 'Should throw quota exceeded error');
      } catch (error) {
        this.assert(
          error.message.includes('Quota'),
          'Should handle quota exceeded error'
        );
      }
      
      this.mockServices.sheets.clearError();
      
      this.recordTestResult(testName, true, 'All API error scenarios handled correctly');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testDataValidationErrors() {
    const testName = 'Data Validation Error Handling';
    console.log(`Running ${testName}...`);
    
    try {
      // Test invalid volunteer data
      const invalidVolunteer = { name: 'John Doe' }; // Missing required fields
      const volunteerValidation = this.mockServices.validator.validateVolunteer(invalidVolunteer);
      
      this.assert(!volunteerValidation.valid, 'Should reject invalid volunteer data');
      this.assert(volunteerValidation.errors.includes('ID is required'), 'Should identify missing ID');
      // Email is now optional, so we don't check for this error
      
      // Test invalid email format
      const invalidEmailVolunteer = {
        id: 'V001',
        name: 'John Doe',
        email: 'invalid-email'
      };
      const emailValidation = this.mockServices.validator.validateVolunteer(invalidEmailVolunteer);
      
      this.assert(!emailValidation.valid, 'Should reject invalid email format');
      this.assert(emailValidation.errors.includes('Invalid email format'), 'Should identify invalid email');
      
      // Test valid volunteer data
      const validVolunteer = {
        id: 'V001',
        name: 'John Doe',
        email: 'john@example.com',
        committee: 'Teaching'
      };
      const validValidation = this.mockServices.validator.validateVolunteer(validVolunteer);
      
      this.assert(validValidation.valid, 'Should accept valid volunteer data');
      this.assert(validValidation.errors.length === 0, 'Should have no validation errors');
      
      // Test invalid event data
      const invalidEvent = { name: 'Test Event' }; // Missing required fields
      const eventValidation = this.mockServices.validator.validateEvent(invalidEvent);
      
      this.assert(!eventValidation.valid, 'Should reject invalid event data');
      this.assert(eventValidation.errors.includes('ID is required'), 'Should identify missing event ID');
      this.assert(eventValidation.errors.includes('Date is required'), 'Should identify missing date');
      
      // Test invalid date format
      const invalidDateEvent = {
        id: 'E001',
        name: 'Test Event',
        date: 'invalid-date'
      };
      const dateValidation = this.mockServices.validator.validateEvent(invalidDateEvent);
      
      this.assert(!dateValidation.valid, 'Should reject invalid date format');
      this.assert(dateValidation.errors.includes('Invalid date format'), 'Should identify invalid date');
      
      // Test data size validation
      const largeData = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
      const sizeValidation = this.mockServices.validator.checkDataSize(largeData);
      
      this.assert(!sizeValidation.valid, 'Should reject oversized data');
      this.assert(sizeValidation.size > sizeValidation.maxSize, 'Should calculate correct size');
      
      this.recordTestResult(testName, true, 'All data validation error scenarios handled correctly');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testEdgeCases() {
    const testName = 'Edge Case Handling';
    console.log(`Running ${testName}...`);
    
    try {
      // Test empty data sets
      const emptyValidation = this.mockServices.validator.validateVolunteer({});
      this.assert(!emptyValidation.valid, 'Should handle empty objects');
      
      // Test null/undefined values
      const nullValidation = this.mockServices.validator.validateVolunteer(null);
      this.assert(!nullValidation.valid, 'Should handle null values');
      
      // Test special characters in data
      const specialCharVolunteer = {
        id: 'V001',
        name: 'John "Johnny" O\'Doe',
        email: 'john+test@example.com',
        committee: 'Teaching & Learning'
      };
      const specialCharValidation = this.mockServices.validator.validateVolunteer(specialCharVolunteer);
      this.assert(specialCharValidation.valid, 'Should handle special characters');
      
      // Test very long strings
      const longStringVolunteer = {
        id: 'V001',
        name: 'A'.repeat(1000),
        email: 'test@example.com',
        committee: 'Teaching'
      };
      const longStringValidation = this.mockServices.validator.validateVolunteer(longStringVolunteer);
      this.assert(longStringValidation.valid, 'Should handle long strings');
      
      // Test Unicode characters
      const unicodeVolunteer = {
        id: 'V001',
        name: 'José María García-López',
        email: 'jose@example.com',
        committee: 'Enseñanza'
      };
      const unicodeValidation = this.mockServices.validator.validateVolunteer(unicodeVolunteer);
      this.assert(unicodeValidation.valid, 'Should handle Unicode characters');
      
      // Test date edge cases
      const edgeDateEvent = {
        id: 'E001',
        name: 'Edge Date Event',
        date: '2024-02-29' // Leap year
      };
      const edgeDateValidation = this.mockServices.validator.validateEvent(edgeDateEvent);
      this.assert(edgeDateValidation.valid, 'Should handle leap year dates');
      
      // Test invalid leap year
      const invalidLeapEvent = {
        id: 'E002',
        name: 'Invalid Leap Event',
        date: '2023-02-29' // Not a leap year
      };
      const invalidLeapValidation = this.mockServices.validator.validateEvent(invalidLeapEvent);
      this.assert(!invalidLeapValidation.valid, 'Should reject invalid leap year dates');
      
      this.recordTestResult(testName, true, 'All edge cases handled correctly');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testBoundaryConditions() {
    const testName = 'Boundary Condition Testing';
    console.log(`Running ${testName}...`);
    
    try {
      // Test maximum data limits
      const maxVolunteers = [];
      for (let i = 0; i < 10000; i++) {
        maxVolunteers.push({
          id: `V${i.toString().padStart(5, '0')}`,
          name: `Volunteer ${i}`,
          email: `volunteer${i}@example.com`,
          committee: 'Testing'
        });
      }
      
      // Test processing large dataset
      const startTime = performance.now();
      let validCount = 0;
      
      for (const volunteer of maxVolunteers.slice(0, 1000)) { // Test subset for performance
        const validation = this.mockServices.validator.validateVolunteer(volunteer);
        if (validation.valid) validCount++;
      }
      
      const processingTime = performance.now() - startTime;
      
      this.assert(validCount === 1000, 'Should validate all volunteers in large dataset');
      this.assert(processingTime < 5000, `Should process large dataset efficiently (${processingTime.toFixed(2)}ms)`);
      
      // Test minimum data requirements
      const minimalVolunteer = {
        id: 'V',
        name: 'A',
        email: 'a@b.c'
      };
      const minimalValidation = this.mockServices.validator.validateVolunteer(minimalVolunteer);
      this.assert(minimalValidation.valid, 'Should accept minimal valid data');
      
      // Test boundary email formats
      const boundaryEmails = [
        'a@b.co',           // Shortest valid
        'test+tag@example.com',  // With plus
        'user.name@example.com', // With dot
        'user_name@example.com', // With underscore
        'user-name@example.com'  // With dash
      ];
      
      for (const email of boundaryEmails) {
        const emailTest = this.mockServices.validator.isValidEmail(email);
        this.assert(emailTest, `Should accept valid email format: ${email}`);
      }
      
      // Test invalid boundary emails
      const invalidEmails = [
        'a@b',              // No TLD
        '@example.com',     // No local part
        'user@',            // No domain
        'user space@example.com', // Space in local part
        'user@exam ple.com' // Space in domain
      ];
      
      for (const email of invalidEmails) {
        const emailTest = this.mockServices.validator.isValidEmail(email);
        this.assert(!emailTest, `Should reject invalid email format: ${email}`);
      }
      
      // Test date boundaries
      const dateBoundaries = [
        '1900-01-01',       // Very old date
        '2099-12-31',       // Far future date
        '2024-01-01',       // Normal date
        '2024-12-31'        // End of year
      ];
      
      for (const date of dateBoundaries) {
        const dateTest = this.mockServices.validator.isValidDate(date);
        this.assert(dateTest, `Should accept valid date: ${date}`);
      }
      
      this.recordTestResult(testName, true, 'All boundary conditions handled correctly');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testConcurrentOperationErrors() {
    const testName = 'Concurrent Operation Error Handling';
    console.log(`Running ${testName}...`);
    
    try {
      // Test concurrent API calls with rate limiting
      this.mockServices.sheets.simulateError('rate_limit', 5);
      
      const concurrentOperations = [];
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          this.mockServices.sheets.readSheet('test', 'sheet1').catch(error => ({ error: error.message }))
        );
      }
      
      const results = await Promise.all(concurrentOperations);
      
      const errorCount = results.filter(r => r.error).length;
      const successCount = results.filter(r => !r.error).length;
      
      this.assert(errorCount > 0, 'Should encounter rate limit errors');
      this.assert(successCount > 0, 'Should have some successful operations');
      
      // Test concurrent authentication attempts
      this.mockServices.auth.simulateError('invalid_credentials');
      
      const authOperations = [];
      for (let i = 0; i < 5; i++) {
        authOperations.push(
          this.mockServices.auth.authenticate().catch(error => ({ error: error.message }))
        );
      }
      
      const authResults = await Promise.all(authOperations);
      const authErrors = authResults.filter(r => r.error).length;
      
      this.assert(authErrors === 5, 'Should handle concurrent authentication failures');
      
      // Test recovery from concurrent errors
      this.mockServices.auth.clearError();
      this.mockServices.sheets.clearError();
      
      const recoveryAuth = await this.mockServices.auth.authenticate();
      const recoverySheet = await this.mockServices.sheets.readSheet('test', 'sheet1');
      
      this.assert(recoveryAuth.success, 'Should recover from concurrent auth errors');
      this.assert(Array.isArray(recoverySheet), 'Should recover from concurrent API errors');
      
      this.recordTestResult(testName, true, 'Concurrent operation errors handled correctly');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testRecoveryScenarios() {
    const testName = 'Error Recovery Scenarios';
    console.log(`Running ${testName}...`);
    
    try {
      // Test recovery from multiple consecutive errors
      const errorSequence = ['rate_limit', 'server_error', 'network_timeout'];
      let currentErrorIndex = 0;
      
      const resilientOperation = async (maxRetries = 5) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (currentErrorIndex < errorSequence.length) {
              this.mockServices.sheets.simulateError(errorSequence[currentErrorIndex]);
              currentErrorIndex++;
            } else {
              this.mockServices.sheets.clearError();
            }
            
            const result = await this.mockServices.sheets.readSheet('test', 'sheet1');
            return { success: true, result, attempts: attempt };
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }
            
            // Exponential backoff
            const delay = Math.min(50 * Math.pow(2, attempt - 1), 500); // Shortened for test
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };
      
      const recoveryResult = await resilientOperation();
      
      this.assert(recoveryResult.success, 'Should recover from multiple consecutive errors');
      this.assert(recoveryResult.attempts === 4, 'Should retry through all error types'); // 3 errors + 1 success
      
      // Test partial failure recovery
      const batchOperation = async (items) => {
        const results = [];
        const failures = [];
        
        for (let i = 0; i < items.length; i++) {
          try {
            // Simulate intermittent failures
            if (i % 3 === 1) {
              throw new Error('Simulated failure');
            }
            
            const result = await this.mockServices.sheets.writeSheet('test', 'sheet1', [items[i]]);
            results.push({ index: i, result });
          } catch (error) {
            failures.push({ index: i, error: error.message });
          }
        }
        
        return { results, failures };
      };
      
      const testItems = ['item1', 'item2', 'item3', 'item4', 'item5'];
      const batchResult = await batchOperation(testItems);
      
      this.assert(batchResult.results.length > 0, 'Should have some successful operations');
      this.assert(batchResult.failures.length > 0, 'Should track failed operations');
      this.assert(
        batchResult.results.length + batchResult.failures.length === testItems.length,
        'Should account for all operations'
      );
      
      // Test retry of failed operations
      const retryFailures = async (failures) => {
        const retryResults = [];
        
        for (const failure of failures) {
          try {
            // Simulate success on retry
            const result = await this.mockServices.sheets.writeSheet('test', 'sheet1', [testItems[failure.index]]);
            retryResults.push({ index: failure.index, result });
          } catch (error) {
            retryResults.push({ index: failure.index, error: error.message });
          }
        }
        
        return retryResults;
      };
      
      const retryResults = await retryFailures(batchResult.failures);
      const retrySuccesses = retryResults.filter(r => !r.error).length;
      
      this.assert(retrySuccesses > 0, 'Should recover some failed operations on retry');
      
      this.recordTestResult(testName, true, 'All recovery scenarios handled correctly');
      
    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  async cleanupErrorTestEnvironment() {
    console.log('Cleaning up error test environment...');
    
    // Reset all mock services
    if (this.mockServices) {
      this.mockServices.auth.clearError();
      this.mockServices.sheets.clearError();
      this.mockServices.network.setOnline(true);
      this.mockServices.network.clearTimeout();
    }
    
    this.mockServices = null;
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
      results: this.testResults,
      errorScenarios: {
        authentication: this.errorScenarios.authentication.length,
        network: this.errorScenarios.network.length,
        api: this.errorScenarios.api.length,
        data: this.errorScenarios.data.length
      }
    };
    
    console.log('\n=== Error Scenario Test Report ===');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    console.log(`Error Scenarios Tested: ${Object.values(report.errorScenarios).reduce((a, b) => a + b, 0)}`);
    
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
  window.ErrorScenarioTestSuite = ErrorScenarioTestSuite;
}