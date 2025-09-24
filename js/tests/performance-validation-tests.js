/**
 * Performance Validation Test Suite
 * Tests sync performance with large datasets and various scenarios
 */
class PerformanceValidationTestSuite {
  constructor() {
    this.testResults = [];
    this.performanceMetrics = {};
    this.memoryBaseline = null;
    this.thresholds = {
      smallDataset: { volunteers: 100, events: 20, attendance: 500, maxTime: 2000 },
      mediumDataset: { volunteers: 1000, events: 100, attendance: 5000, maxTime: 5000 },
      largeDataset: { volunteers: 5000, events: 500, attendance: 25000, maxTime: 15000 },
      extraLargeDataset: { volunteers: 10000, events: 1000, attendance: 50000, maxTime: 30000 }
    };
  }

  async runAllPerformanceTests() {
    console.log('⚡ Starting Performance Validation Tests');
    console.log('=' .repeat(50));
    
    const startTime = performance.now();
    
    try {
      // Establish memory baseline
      this.establishMemoryBaseline();
      
      // 1. Data Generation Performance Tests
      await this.testDataGenerationPerformance();
      
      // 2. Data Transformation Performance Tests
      await this.testDataTransformationPerformance();
      
      // 3. Storage Performance Tests
      await this.testStoragePerformance();
      
      // 4. Sync Performance Tests
      await this.testSyncPerformance();
      
      // 5. Memory Usage Tests
      await this.testMemoryUsage();
      
      // 6. Concurrent Operations Tests
      await this.testConcurrentOperations();
      
      // 7. Network Performance Tests
      await this.testNetworkPerformance();
      
      // 8. UI Responsiveness Tests
      await this.testUIResponsiveness();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return this.generatePerformanceReport(duration);
      
    } catch (error) {
      console.error('❌ Performance validation tests failed:', error);
      throw error;
    }
  }

  establishMemoryBaseline() {
    if (performance.memory) {
      this.memoryBaseline = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        timestamp: performance.now()
      };
      console.log('📊 Memory baseline established:', this.memoryBaseline);
    }
  }

  async testDataGenerationPerformance() {
    console.log('🏭 Testing Data Generation Performance...');
    
    for (const [datasetName, config] of Object.entries(this.thresholds)) {
      const startTime = performance.now();
      const startMemory = this.getMemoryUsage();
      
      try {
        const testData = this.generateTestData(config);
        
        const endTime = performance.now();
        const endMemory = this.getMemoryUsage();
        const duration = endTime - startTime;
        const memoryUsed = endMemory ? endMemory.usedJSHeapSize - startMemory.usedJSHeapSize : 0;
        
        const success = duration < (config.maxTime / 4); // Generation should be much faster than processing
        
        this.performanceMetrics[`${datasetName}_generation`] = {
          duration,
          memoryUsed,
          recordCount: testData.volunteers.length + testData.events.length + testData.attendance.length,
          throughput: (testData.volunteers.length + testData.events.length + testData.attendance.length) / (duration / 1000)
        };
        
        this.addTestResult('Data Generation', `${datasetName} Generation`, success,
          `Generated ${testData.volunteers.length + testData.events.length + testData.attendance.length} records in ${duration.toFixed(2)}ms`);
        
      } catch (error) {
        this.addTestResult('Data Generation', `${datasetName} Generation`, false,
          `Error generating data: ${error.message}`);
      }
    }
  }

  async testDataTransformationPerformance() {
    console.log('🔄 Testing Data Transformation Performance...');
    
    for (const [datasetName, config] of Object.entries(this.thresholds)) {
      const testData = this.generateTestData(config);
      
      // Test volunteers transformation
      await this.testTransformationForType(datasetName, 'volunteers', testData.volunteers, config.maxTime);
      
      // Test events transformation
      await this.testTransformationForType(datasetName, 'events', testData.events, config.maxTime);
      
      // Test attendance transformation
      await this.testTransformationForType(datasetName, 'attendance', testData.attendance, config.maxTime);
    }
  }

  async testTransformationForType(datasetName, type, data, maxTime) {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      let transformedData;
      
      if (typeof window.DataTransformer !== 'undefined') {
        const transformer = window.DataTransformer;
        
        // Transform to sheets format
        const toSheetsStart = performance.now();
        transformedData = transformer.toSheetsFormat(data, type);
        const toSheetsTime = performance.now() - toSheetsStart;
        
        // Transform back to local format
        const fromSheetsStart = performance.now();
        const backTransformed = transformer.fromSheetsFormat(transformedData, type);
        const fromSheetsTime = performance.now() - fromSheetsStart;
        
        const totalTime = performance.now() - startTime;
        const endMemory = this.getMemoryUsage();
        const memoryUsed = endMemory ? endMemory.usedJSHeapSize - startMemory.usedJSHeapSize : 0;
        
        const success = totalTime < maxTime;
        
        this.performanceMetrics[`${datasetName}_${type}_transformation`] = {
          toSheetsTime,
          fromSheetsTime,
          totalTime,
          memoryUsed,
          recordCount: data.length,
          throughput: data.length / (totalTime / 1000)
        };
        
        this.addTestResult('Data Transformation', `${datasetName} ${type} Transformation`, success,
          `Transformed ${data.length} ${type} records in ${totalTime.toFixed(2)}ms (${(data.length / (totalTime / 1000)).toFixed(0)} records/sec)`);
        
      } else {
        this.addTestResult('Data Transformation', `${datasetName} ${type} Transformation`, false,
          'DataTransformer not available');
      }
      
    } catch (error) {
      this.addTestResult('Data Transformation', `${datasetName} ${type} Transformation`, false,
        `Transformation error: ${error.message}`);
    }
  }

  async testStoragePerformance() {
    console.log('💾 Testing Storage Performance...');
    
    for (const [datasetName, config] of Object.entries(this.thresholds)) {
      const testData = this.generateTestData(config);
      
      // Test IndexedDB storage performance
      await this.testIndexedDBPerformance(datasetName, testData, config.maxTime);
      
      // Test localStorage performance (for smaller datasets)
      if (config.volunteers <= 1000) {
        await this.testLocalStoragePerformance(datasetName, testData, config.maxTime);
      }
    }
  }

  async testIndexedDBPerformance(datasetName, testData, maxTime) {
    if (!('indexedDB' in window)) {
      this.addTestResult('Storage Performance', `${datasetName} IndexedDB`, false,
        'IndexedDB not available');
      return;
    }
    
    const dbName = `PerformanceTest_${datasetName}_${Date.now()}`;
    
    try {
      const startTime = performance.now();
      const startMemory = this.getMemoryUsage();
      
      // Open database
      const db = await this.openTestDatabase(dbName);
      
      // Write performance test
      const writeStart = performance.now();
      await this.writeDataToIndexedDB(db, testData);
      const writeTime = performance.now() - writeStart;
      
      // Read performance test
      const readStart = performance.now();
      const readData = await this.readDataFromIndexedDB(db);
      const readTime = performance.now() - readStart;
      
      db.close();
      
      const totalTime = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();
      const memoryUsed = endMemory ? endMemory.usedJSHeapSize - startMemory.usedJSHeapSize : 0;
      
      const totalRecords = testData.volunteers.length + testData.events.length + testData.attendance.length;
      const success = totalTime < maxTime;
      
      this.performanceMetrics[`${datasetName}_indexeddb`] = {
        writeTime,
        readTime,
        totalTime,
        memoryUsed,
        recordCount: totalRecords,
        writeThroughput: totalRecords / (writeTime / 1000),
        readThroughput: totalRecords / (readTime / 1000)
      };
      
      this.addTestResult('Storage Performance', `${datasetName} IndexedDB`, success,
        `Stored/Retrieved ${totalRecords} records in ${totalTime.toFixed(2)}ms (Write: ${writeTime.toFixed(2)}ms, Read: ${readTime.toFixed(2)}ms)`);
      
      // Clean up
      indexedDB.deleteDatabase(dbName);
      
    } catch (error) {
      this.addTestResult('Storage Performance', `${datasetName} IndexedDB`, false,
        `IndexedDB error: ${error.message}`);
    }
  }

  async testLocalStoragePerformance(datasetName, testData, maxTime) {
    try {
      const startTime = performance.now();
      const startMemory = this.getMemoryUsage();
      
      const dataString = JSON.stringify(testData);
      const key = `PerformanceTest_${datasetName}_${Date.now()}`;
      
      // Write test
      const writeStart = performance.now();
      localStorage.setItem(key, dataString);
      const writeTime = performance.now() - writeStart;
      
      // Read test
      const readStart = performance.now();
      const retrievedData = JSON.parse(localStorage.getItem(key));
      const readTime = performance.now() - readStart;
      
      const totalTime = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();
      const memoryUsed = endMemory ? endMemory.usedJSHeapSize - startMemory.usedJSHeapSize : 0;
      
      const totalRecords = testData.volunteers.length + testData.events.length + testData.attendance.length;
      const success = totalTime < maxTime && retrievedData !== null;
      
      this.performanceMetrics[`${datasetName}_localstorage`] = {
        writeTime,
        readTime,
        totalTime,
        memoryUsed,
        recordCount: totalRecords,
        dataSize: dataString.length
      };
      
      this.addTestResult('Storage Performance', `${datasetName} LocalStorage`, success,
        `Stored/Retrieved ${totalRecords} records (${(dataString.length / 1024).toFixed(2)}KB) in ${totalTime.toFixed(2)}ms`);
      
      // Clean up
      localStorage.removeItem(key);
      
    } catch (error) {
      this.addTestResult('Storage Performance', `${datasetName} LocalStorage`, false,
        `LocalStorage error: ${error.message}`);
    }
  }

  async testSyncPerformance() {
    console.log('🔄 Testing Sync Performance...');
    
    for (const [datasetName, config] of Object.entries(this.thresholds)) {
      const testData = this.generateTestData(config);
      
      // Test full sync simulation
      await this.testFullSyncPerformance(datasetName, testData, config.maxTime);
      
      // Test delta sync simulation
      await this.testDeltaSyncPerformance(datasetName, testData, config.maxTime);
    }
  }

  async testFullSyncPerformance(datasetName, testData, maxTime) {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      // Simulate full sync operations
      const operations = [];
      
      // Simulate data preparation
      const prepStart = performance.now();
      const preparedData = this.prepareDataForSync(testData);
      const prepTime = performance.now() - prepStart;
      
      // Simulate batch operations
      const batchStart = performance.now();
      const batches = this.createBatches(preparedData, 100); // 100 records per batch
      const batchTime = performance.now() - batchStart;
      
      // Simulate network operations (with artificial delay)
      const networkStart = performance.now();
      await this.simulateNetworkOperations(batches);
      const networkTime = performance.now() - networkStart;
      
      const totalTime = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();
      const memoryUsed = endMemory ? endMemory.usedJSHeapSize - startMemory.usedJSHeapSize : 0;
      
      const totalRecords = testData.volunteers.length + testData.events.length + testData.attendance.length;
      const success = totalTime < maxTime;
      
      this.performanceMetrics[`${datasetName}_full_sync`] = {
        prepTime,
        batchTime,
        networkTime,
        totalTime,
        memoryUsed,
        recordCount: totalRecords,
        batchCount: batches.length,
        throughput: totalRecords / (totalTime / 1000)
      };
      
      this.addTestResult('Sync Performance', `${datasetName} Full Sync`, success,
        `Synced ${totalRecords} records in ${batches.length} batches in ${totalTime.toFixed(2)}ms`);
      
    } catch (error) {
      this.addTestResult('Sync Performance', `${datasetName} Full Sync`, false,
        `Full sync error: ${error.message}`);
    }
  }

  async testDeltaSyncPerformance(datasetName, testData, maxTime) {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      // Simulate delta sync (only 10% of data changed)
      const changedData = {
        volunteers: testData.volunteers.slice(0, Math.ceil(testData.volunteers.length * 0.1)),
        events: testData.events.slice(0, Math.ceil(testData.events.length * 0.1)),
        attendance: testData.attendance.slice(0, Math.ceil(testData.attendance.length * 0.1))
      };
      
      // Simulate delta detection
      const deltaStart = performance.now();
      const deltaChanges = this.detectChanges(testData, changedData);
      const deltaTime = performance.now() - deltaStart;
      
      // Simulate delta sync operations
      const syncStart = performance.now();
      const preparedDelta = this.prepareDataForSync(changedData);
      const batches = this.createBatches(preparedDelta, 100);
      await this.simulateNetworkOperations(batches);
      const syncTime = performance.now() - syncStart;
      
      const totalTime = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();
      const memoryUsed = endMemory ? endMemory.usedJSHeapSize - startMemory.usedJSHeapSize : 0;
      
      const changedRecords = changedData.volunteers.length + changedData.events.length + changedData.attendance.length;
      const success = totalTime < (maxTime / 5); // Delta sync should be much faster
      
      this.performanceMetrics[`${datasetName}_delta_sync`] = {
        deltaTime,
        syncTime,
        totalTime,
        memoryUsed,
        changedRecords,
        batchCount: batches.length,
        efficiency: ((testData.volunteers.length + testData.events.length + testData.attendance.length - changedRecords) / (testData.volunteers.length + testData.events.length + testData.attendance.length)) * 100
      };
      
      this.addTestResult('Sync Performance', `${datasetName} Delta Sync`, success,
        `Delta synced ${changedRecords} changed records in ${totalTime.toFixed(2)}ms (${this.performanceMetrics[`${datasetName}_delta_sync`].efficiency.toFixed(1)}% efficiency gain)`);
      
    } catch (error) {
      this.addTestResult('Sync Performance', `${datasetName} Delta Sync`, false,
        `Delta sync error: ${error.message}`);
    }
  }

  async testMemoryUsage() {
    console.log('🧠 Testing Memory Usage...');
    
    if (!performance.memory) {
      this.addTestResult('Memory Usage', 'Memory API', false,
        'Memory API not available in this browser');
      return;
    }
    
    for (const [datasetName, config] of Object.entries(this.thresholds)) {
      const startMemory = performance.memory.usedJSHeapSize;
      
      try {
        // Generate and hold data in memory
        const testData = this.generateTestData(config);
        const afterGenerationMemory = performance.memory.usedJSHeapSize;
        
        // Transform data (additional memory usage)
        let transformedData = null;
        if (typeof window.DataTransformer !== 'undefined') {
          const transformer = window.DataTransformer;
          transformedData = {
            volunteers: transformer.toSheetsFormat(testData.volunteers, 'volunteers'),
            events: transformer.toSheetsFormat(testData.events, 'events'),
            attendance: transformer.toSheetsFormat(testData.attendance, 'attendance')
          };
        }
        const afterTransformMemory = performance.memory.usedJSHeapSize;
        
        // Calculate memory usage
        const generationMemory = afterGenerationMemory - startMemory;
        const transformationMemory = afterTransformMemory - afterGenerationMemory;
        const totalMemory = afterTransformMemory - startMemory;
        
        const totalRecords = testData.volunteers.length + testData.events.length + testData.attendance.length;
        const memoryPerRecord = totalMemory / totalRecords;
        
        // Memory usage thresholds (in bytes)
        const memoryThreshold = totalRecords * 1000; // 1KB per record threshold
        const success = totalMemory < memoryThreshold;
        
        this.performanceMetrics[`${datasetName}_memory`] = {
          generationMemory,
          transformationMemory,
          totalMemory,
          memoryPerRecord,
          recordCount: totalRecords
        };
        
        this.addTestResult('Memory Usage', `${datasetName} Memory Usage`, success,
          `Used ${(totalMemory / 1024 / 1024).toFixed(2)}MB for ${totalRecords} records (${(memoryPerRecord / 1024).toFixed(2)}KB per record)`);
        
        // Clean up references to allow garbage collection
        testData.volunteers = null;
        testData.events = null;
        testData.attendance = null;
        transformedData = null;
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
        
      } catch (error) {
        this.addTestResult('Memory Usage', `${datasetName} Memory Usage`, false,
          `Memory test error: ${error.message}`);
      }
    }
  }

  async testConcurrentOperations() {
    console.log('🔀 Testing Concurrent Operations...');
    
    const concurrentTests = [
      {
        name: 'Concurrent Data Generation',
        test: () => this.testConcurrentDataGeneration()
      },
      {
        name: 'Concurrent Storage Operations',
        test: () => this.testConcurrentStorageOperations()
      },
      {
        name: 'Concurrent Transformations',
        test: () => this.testConcurrentTransformations()
      }
    ];
    
    for (const test of concurrentTests) {
      try {
        const result = await test.test();
        this.addTestResult('Concurrent Operations', test.name, result.success, result.message);
      } catch (error) {
        this.addTestResult('Concurrent Operations', test.name, false,
          `Concurrent test error: ${error.message}`);
      }
    }
  }

  async testConcurrentDataGeneration() {
    const startTime = performance.now();
    
    try {
      // Generate multiple datasets concurrently
      const promises = Object.entries(this.thresholds).map(([name, config]) => 
        Promise.resolve(this.generateTestData(config))
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const totalRecords = results.reduce((sum, data) => 
        sum + data.volunteers.length + data.events.length + data.attendance.length, 0);
      
      return {
        success: duration < 10000, // Should complete within 10 seconds
        message: `Generated ${totalRecords} records across ${results.length} datasets concurrently in ${duration.toFixed(2)}ms`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Concurrent generation failed: ${error.message}`
      };
    }
  }

  async testConcurrentStorageOperations() {
    if (!('indexedDB' in window)) {
      return {
        success: false,
        message: 'IndexedDB not available for concurrent testing'
      };
    }
    
    const startTime = performance.now();
    
    try {
      const testData = this.generateTestData(this.thresholds.smallDataset);
      
      // Perform multiple storage operations concurrently
      const promises = [
        this.storeDataConcurrently('concurrent_test_1', testData),
        this.storeDataConcurrently('concurrent_test_2', testData),
        this.storeDataConcurrently('concurrent_test_3', testData)
      ];
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const allSuccessful = results.every(r => r.success);
      
      return {
        success: allSuccessful && duration < 5000,
        message: `Completed ${results.length} concurrent storage operations in ${duration.toFixed(2)}ms`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Concurrent storage failed: ${error.message}`
      };
    }
  }

  async testConcurrentTransformations() {
    if (typeof DataTransformer === 'undefined') {
      return {
        success: false,
        message: 'DataTransformer not available for concurrent testing'
      };
    }
    
    const startTime = performance.now();
    
    try {
      const testData = this.generateTestData(this.thresholds.mediumDataset);
      const transformer = window.DataTransformer;
      
      // Perform multiple transformations concurrently
      const promises = [
        Promise.resolve(transformer.toSheetsFormat(testData.volunteers, 'volunteers')),
        Promise.resolve(transformer.toSheetsFormat(testData.events, 'events')),
        Promise.resolve(transformer.toSheetsFormat(testData.attendance, 'attendance'))
      ];
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const allSuccessful = results.every(r => r && r.length > 0);
      
      return {
        success: allSuccessful && duration < 3000,
        message: `Completed ${results.length} concurrent transformations in ${duration.toFixed(2)}ms`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Concurrent transformation failed: ${error.message}`
      };
    }
  }

  async testNetworkPerformance() {
    console.log('🌐 Testing Network Performance...');
    
    const networkTests = [
      {
        name: 'Network Latency',
        test: () => this.testNetworkLatency()
      },
      {
        name: 'Batch Request Performance',
        test: () => this.testBatchRequestPerformance()
      },
      {
        name: 'Request Queuing',
        test: () => this.testRequestQueuing()
      }
    ];
    
    for (const test of networkTests) {
      try {
        const result = await test.test();
        this.addTestResult('Network Performance', test.name, result.success, result.message);
      } catch (error) {
        this.addTestResult('Network Performance', test.name, false,
          `Network test error: ${error.message}`);
      }
    }
  }

  async testNetworkLatency() {
    if (!navigator.onLine) {
      return {
        success: false,
        message: 'Browser is offline, cannot test network latency'
      };
    }
    
    try {
      const startTime = performance.now();
      const response = await fetch('https://httpbin.org/delay/0', {
        method: 'GET',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      
      const latency = endTime - startTime;
      const success = response.ok && latency < 5000; // 5 second threshold
      
      return {
        success,
        message: `Network latency: ${latency.toFixed(2)}ms (${response.status})`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Network latency test failed: ${error.message}`
      };
    }
  }

  async testBatchRequestPerformance() {
    if (!navigator.onLine) {
      return {
        success: false,
        message: 'Browser is offline, cannot test batch requests'
      };
    }
    
    try {
      const batchSize = 5;
      const startTime = performance.now();
      
      const promises = Array.from({ length: batchSize }, (_, i) =>
        fetch(`https://httpbin.org/delay/0?batch=${i}`, {
          method: 'GET',
          cache: 'no-cache'
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const successfulRequests = results.filter(r => r.ok).length;
      const success = successfulRequests === batchSize && duration < 10000;
      
      return {
        success,
        message: `Batch of ${batchSize} requests completed in ${duration.toFixed(2)}ms (${successfulRequests}/${batchSize} successful)`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Batch request test failed: ${error.message}`
      };
    }
  }

  async testRequestQueuing() {
    try {
      const queueSize = 10;
      const startTime = performance.now();
      
      // Simulate request queuing
      const queue = [];
      for (let i = 0; i < queueSize; i++) {
        queue.push({
          id: i,
          data: `request_${i}`,
          timestamp: performance.now()
        });
      }
      
      // Process queue sequentially (simulating rate limiting)
      const results = [];
      for (const request of queue) {
        const processStart = performance.now();
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing time
        const processEnd = performance.now();
        
        results.push({
          id: request.id,
          processingTime: processEnd - processStart,
          queueTime: processStart - request.timestamp
        });
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      
      const success = totalTime < 1000 && avgProcessingTime < 50;
      
      return {
        success,
        message: `Processed ${queueSize} queued requests in ${totalTime.toFixed(2)}ms (avg: ${avgProcessingTime.toFixed(2)}ms per request)`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Request queuing test failed: ${error.message}`
      };
    }
  }

  async testUIResponsiveness() {
    console.log('🖱️ Testing UI Responsiveness...');
    
    const responsivenessTests = [
      {
        name: 'Main Thread Blocking',
        test: () => this.testMainThreadBlocking()
      },
      {
        name: 'Animation Frame Rate',
        test: () => this.testAnimationFrameRate()
      },
      {
        name: 'Event Handler Performance',
        test: () => this.testEventHandlerPerformance()
      }
    ];
    
    for (const test of responsivenessTests) {
      try {
        const result = await test.test();
        this.addTestResult('UI Responsiveness', test.name, result.success, result.message);
      } catch (error) {
        this.addTestResult('UI Responsiveness', test.name, false,
          `UI responsiveness test error: ${error.message}`);
      }
    }
  }

  async testMainThreadBlocking() {
    try {
      const blockingDuration = 100; // 100ms of blocking work
      const startTime = performance.now();
      
      // Simulate blocking work
      const endBlockingTime = startTime + blockingDuration;
      while (performance.now() < endBlockingTime) {
        // Busy wait to block main thread
      }
      
      const actualDuration = performance.now() - startTime;
      const success = Math.abs(actualDuration - blockingDuration) < 20; // Within 20ms tolerance
      
      return {
        success,
        message: `Main thread blocked for ${actualDuration.toFixed(2)}ms (target: ${blockingDuration}ms)`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Main thread blocking test failed: ${error.message}`
      };
    }
  }

  async testAnimationFrameRate() {
    try {
      return new Promise((resolve) => {
        const frames = [];
        const duration = 1000; // 1 second test
        const startTime = performance.now();
        
        function measureFrame() {
          const currentTime = performance.now();
          frames.push(currentTime);
          
          if (currentTime - startTime < duration) {
            requestAnimationFrame(measureFrame);
          } else {
            const frameCount = frames.length;
            const actualDuration = currentTime - startTime;
            const fps = (frameCount / actualDuration) * 1000;
            
            const success = fps >= 30; // At least 30 FPS
            
            resolve({
              success,
              message: `Animation frame rate: ${fps.toFixed(1)} FPS over ${actualDuration.toFixed(0)}ms`
            });
          }
        }
        
        requestAnimationFrame(measureFrame);
      });
      
    } catch (error) {
      return {
        success: false,
        message: `Animation frame rate test failed: ${error.message}`
      };
    }
  }

  async testEventHandlerPerformance() {
    try {
      const eventCount = 100;
      const startTime = performance.now();
      
      // Create test element
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);
      
      let handlerExecutions = 0;
      const eventHandler = () => {
        handlerExecutions++;
        // Simulate some work
        const work = Math.random() * 1000;
      };
      
      testElement.addEventListener('click', eventHandler);
      
      // Trigger events
      for (let i = 0; i < eventCount; i++) {
        const event = new MouseEvent('click', { bubbles: true });
        testElement.dispatchEvent(event);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTimePerEvent = duration / eventCount;
      
      // Clean up
      testElement.removeEventListener('click', eventHandler);
      document.body.removeChild(testElement);
      
      const success = avgTimePerEvent < 1 && handlerExecutions === eventCount; // Less than 1ms per event
      
      return {
        success,
        message: `Processed ${handlerExecutions} events in ${duration.toFixed(2)}ms (${avgTimePerEvent.toFixed(3)}ms per event)`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Event handler performance test failed: ${error.message}`
      };
    }
  }

  // Helper methods
  generateTestData(config) {
    const volunteers = [];
    const events = [];
    const attendance = [];
    
    // Generate volunteers
    for (let i = 0; i < config.volunteers; i++) {
      volunteers.push({
        id: `V${String(i + 1).padStart(6, '0')}`,
        name: `Volunteer ${i + 1}`,
        email: `volunteer${i + 1}@example.com`,
        committee: ['Teaching', 'Kitchen', 'Maintenance', 'Admin', 'Security'][i % 5],
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Generate events
    for (let i = 0; i < config.events; i++) {
      const date = new Date();
      date.setDate(date.getDate() + (i % 90)); // Spread over 90 days
      
      events.push({
        id: `E${String(i + 1).padStart(6, '0')}`,
        name: `Event ${i + 1}`,
        date: date.toISOString().split('T')[0],
        startTime: `${8 + (i % 12)}:00`,
        endTime: `${10 + (i % 12)}:00`,
        status: ['Active', 'Completed', 'Cancelled'][i % 3],
        description: `Description for event ${i + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Generate attendance records
    for (let i = 0; i < config.attendance; i++) {
      const volunteer = volunteers[i % volunteers.length];
      const event = events[i % events.length];
      
      attendance.push({
        id: `A${String(i + 1).padStart(6, '0')}`,
        volunteerId: volunteer.id,
        eventId: event.id,
        volunteerName: volunteer.name,
        committee: volunteer.committee,
        date: event.date,
        dateTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    return { volunteers, events, attendance };
  }

  getMemoryUsage() {
    return performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : null;
  }

  prepareDataForSync(data) {
    return [
      ...data.volunteers.map(v => ({ type: 'volunteer', data: v })),
      ...data.events.map(e => ({ type: 'event', data: e })),
      ...data.attendance.map(a => ({ type: 'attendance', data: a }))
    ];
  }

  createBatches(data, batchSize) {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  async simulateNetworkOperations(batches) {
    for (const batch of batches) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
    }
  }

  detectChanges(originalData, changedData) {
    return {
      volunteers: changedData.volunteers.length,
      events: changedData.events.length,
      attendance: changedData.attendance.length
    };
  }

  async openTestDatabase(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('volunteers')) {
          db.createObjectStore('volunteers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
      };
    });
  }

  async writeDataToIndexedDB(db, testData) {
    const transaction = db.transaction(['volunteers', 'events', 'attendance'], 'readwrite');
    
    const promises = [
      ...testData.volunteers.map(v => this.addToStore(transaction.objectStore('volunteers'), v)),
      ...testData.events.map(e => this.addToStore(transaction.objectStore('events'), e)),
      ...testData.attendance.map(a => this.addToStore(transaction.objectStore('attendance'), a))
    ];
    
    await Promise.all(promises);
  }

  async readDataFromIndexedDB(db) {
    const transaction = db.transaction(['volunteers', 'events', 'attendance'], 'readonly');
    
    const [volunteers, events, attendance] = await Promise.all([
      this.getAllFromStore(transaction.objectStore('volunteers')),
      this.getAllFromStore(transaction.objectStore('events')),
      this.getAllFromStore(transaction.objectStore('attendance'))
    ]);
    
    return { volunteers, events, attendance };
  }

  addToStore(store, data) {
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  getAllFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async storeDataConcurrently(dbName, testData) {
    try {
      const db = await this.openTestDatabase(dbName);
      await this.writeDataToIndexedDB(db, testData);
      const readData = await this.readDataFromIndexedDB(db);
      db.close();
      indexedDB.deleteDatabase(dbName);
      
      return {
        success: readData.volunteers.length === testData.volunteers.length,
        dbName
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  addTestResult(category, testName, success, message) {
    this.testResults.push({
      category,
      testName,
      success,
      message,
      timestamp: new Date().toISOString()
    });
  }

  generatePerformanceReport(duration) {
    const categories = [...new Set(this.testResults.map(r => r.category))];
    const summary = {};
    
    // Calculate summary for each category
    categories.forEach(category => {
      const categoryTests = this.testResults.filter(r => r.category === category);
      summary[category] = {
        total: categoryTests.length,
        passed: categoryTests.filter(r => r.success).length,
        failed: categoryTests.filter(r => r.success === false).length,
        successRate: Math.round((categoryTests.filter(r => r.success).length / categoryTests.length) * 100)
      };
    });
    
    // Overall summary
    const overallSummary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.success).length,
      failed: this.testResults.filter(r => r.success === false).length,
      successRate: Math.round((this.testResults.filter(r => r.success).length / this.testResults.length) * 100)
    };
    
    return {
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        overall: overallSummary,
        categories: summary
      },
      results: this.testResults,
      performanceMetrics: this.performanceMetrics,
      memoryBaseline: this.memoryBaseline,
      thresholds: this.thresholds,
      recommendations: this.generatePerformanceRecommendations()
    };
  }

  generatePerformanceRecommendations() {
    const recommendations = [];
    
    // Check for memory issues
    if (this.memoryBaseline && performance.memory) {
      const currentMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = currentMemory - this.memoryBaseline.usedJSHeapSize;
      
      if (memoryIncrease > 50 * 1024 * 1024) { // 50MB increase
        recommendations.push('High memory usage detected. Consider implementing data pagination or cleanup.');
      }
    }
    
    // Check for slow operations
    const slowTests = this.testResults.filter(r => 
      r.message.includes('ms') && 
      parseFloat(r.message.match(/(\d+\.?\d*)ms/)?.[1] || 0) > 5000
    );
    
    if (slowTests.length > 0) {
      recommendations.push('Some operations are taking longer than 5 seconds. Consider optimization.');
    }
    
    // Check for failed performance tests
    const failedPerformanceTests = this.testResults.filter(r => !r.success);
    if (failedPerformanceTests.length > 0) {
      recommendations.push('Some performance tests failed. Review implementation for bottlenecks.');
    }
    
    // Browser-specific recommendations
    if (navigator.userAgent.includes('Safari')) {
      recommendations.push('Safari detected. Consider testing IndexedDB performance thoroughly.');
    }
    
    if (navigator.userAgent.includes('Firefox')) {
      recommendations.push('Firefox detected. Monitor memory usage during large dataset operations.');
    }
    
    return recommendations;
  }
}

// Export for use in test HTML files
if (typeof window !== 'undefined') {
  window.PerformanceValidationTestSuite = PerformanceValidationTestSuite;
}