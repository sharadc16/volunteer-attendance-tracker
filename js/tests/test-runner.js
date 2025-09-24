/**
 * Comprehensive Test Runner for Google Sheets Sync
 * Orchestrates all test suites and generates consolidated reports
 */
class ComprehensiveTestRunner {
  constructor() {
    this.testSuites = [];
    this.results = {};
    this.startTime = null;
    this.endTime = null;
  }

  async runAllTests(options = {}) {
    console.log('🚀 Starting Comprehensive Google Sheets Sync Test Suite');
    console.log('=' .repeat(60));
    
    this.startTime = performance.now();
    
    try {
      // Initialize test suites
      await this.initializeTestSuites();
      
      // Run test suites based on options
      if (options.unit !== false) {
        await this.runUnitTests();
      }
      
      if (options.integration !== false) {
        await this.runIntegrationTests();
      }
      
      if (options.e2e !== false) {
        await this.runE2ETests();
      }
      
      if (options.errorScenarios !== false) {
        await this.runErrorScenarioTests();
      }
      
      if (options.performance !== false) {
        await this.runPerformanceTests();
      }
      
      // Generate comprehensive report
      const report = this.generateComprehensiveReport();
      
      // Display results
      this.displayResults(report);
      
      // Save results if requested
      if (options.saveResults) {
        this.saveResults(report);
      }
      
      return report;
      
    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
      throw error;
    } finally {
      this.endTime = performance.now();
    }
  }

  async initializeTestSuites() {
    console.log('📋 Initializing test suites...');
    
    // Check if test suite classes are available
    const availableSuites = [];
    
    if (typeof UnitTestSuite !== 'undefined') {
      availableSuites.push({ name: 'Unit Tests', class: UnitTestSuite });
    }
    
    if (typeof IntegrationTestSuite !== 'undefined') {
      availableSuites.push({ name: 'Integration Tests', class: IntegrationTestSuite });
    }
    
    if (typeof E2ETestSuite !== 'undefined') {
      availableSuites.push({ name: 'End-to-End Tests', class: E2ETestSuite });
    }
    
    if (typeof ErrorScenarioTestSuite !== 'undefined') {
      availableSuites.push({ name: 'Error Scenario Tests', class: ErrorScenarioTestSuite });
    }
    
    if (typeof SyncTestSuite !== 'undefined') {
      availableSuites.push({ name: 'Existing Sync Tests', class: SyncTestSuite });
    }
    
    console.log(`✅ Found ${availableSuites.length} test suites`);
    this.testSuites = availableSuites;
  }

  async runUnitTests() {
    console.log('\n🔬 Running Unit Tests...');
    console.log('-'.repeat(40));
    
    try {
      const unitTestSuite = new UnitTestSuite();
      const results = await unitTestSuite.runAllUnitTests();
      
      this.results.unit = {
        suite: 'Unit Tests',
        ...results,
        duration: this.calculateDuration()
      };
      
      console.log(`✅ Unit Tests completed: ${results.summary.passed}/${results.summary.total} passed`);
      
    } catch (error) {
      console.error('❌ Unit Tests failed:', error.message);
      this.results.unit = {
        suite: 'Unit Tests',
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1, successRate: 0 }
      };
    }
  }

  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...');
    console.log('-'.repeat(40));
    
    try {
      const integrationTestSuite = new IntegrationTestSuite();
      const results = await integrationTestSuite.runAllIntegrationTests();
      
      this.results.integration = {
        suite: 'Integration Tests',
        ...results,
        duration: this.calculateDuration()
      };
      
      console.log(`✅ Integration Tests completed: ${results.summary.passed}/${results.summary.total} passed`);
      
    } catch (error) {
      console.error('❌ Integration Tests failed:', error.message);
      this.results.integration = {
        suite: 'Integration Tests',
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1, successRate: 0 }
      };
    }
  }

  async runE2ETests() {
    console.log('\n🎯 Running End-to-End Tests...');
    console.log('-'.repeat(40));
    
    try {
      const e2eTestSuite = new E2ETestSuite();
      const results = await e2eTestSuite.runAllE2ETests();
      
      this.results.e2e = {
        suite: 'End-to-End Tests',
        ...results,
        duration: this.calculateDuration()
      };
      
      console.log(`✅ E2E Tests completed: ${results.summary.passed}/${results.summary.total} passed`);
      
    } catch (error) {
      console.error('❌ E2E Tests failed:', error.message);
      this.results.e2e = {
        suite: 'End-to-End Tests',
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1, successRate: 0 }
      };
    }
  }

  async runErrorScenarioTests() {
    console.log('\n⚠️  Running Error Scenario Tests...');
    console.log('-'.repeat(40));
    
    try {
      const errorTestSuite = new ErrorScenarioTestSuite();
      const results = await errorTestSuite.runAllErrorScenarioTests();
      
      this.results.errorScenarios = {
        suite: 'Error Scenario Tests',
        ...results,
        duration: this.calculateDuration()
      };
      
      console.log(`✅ Error Scenario Tests completed: ${results.summary.passed}/${results.summary.total} passed`);
      
    } catch (error) {
      console.error('❌ Error Scenario Tests failed:', error.message);
      this.results.errorScenarios = {
        suite: 'Error Scenario Tests',
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1, successRate: 0 }
      };
    }
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    console.log('-'.repeat(40));
    
    try {
      // Run existing sync test suite which includes performance tests
      if (typeof SyncTestSuite !== 'undefined') {
        const syncTestSuite = new SyncTestSuite();
        const results = await syncTestSuite.runAllTests();
        
        this.results.performance = {
          suite: 'Performance Tests',
          summary: results.summary,
          results: results.results.filter(r => r.testName.toLowerCase().includes('performance')),
          duration: this.calculateDuration()
        };
        
        console.log(`✅ Performance Tests completed`);
      } else {
        console.log('⚠️  Performance Tests skipped (SyncTestSuite not available)');
        this.results.performance = {
          suite: 'Performance Tests',
          summary: { total: 0, passed: 0, failed: 0, successRate: 100 },
          skipped: true
        };
      }
      
    } catch (error) {
      console.error('❌ Performance Tests failed:', error.message);
      this.results.performance = {
        suite: 'Performance Tests',
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1, successRate: 0 }
      };
    }
  }

  generateComprehensiveReport() {
    const totalDuration = this.endTime - this.startTime;
    
    // Calculate overall statistics
    const overallStats = {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      overallSuccessRate: 0,
      duration: totalDuration,
      suiteCount: Object.keys(this.results).length
    };
    
    // Aggregate results from all suites
    Object.values(this.results).forEach(result => {
      if (result.summary) {
        overallStats.totalTests += result.summary.total || 0;
        overallStats.totalPassed += result.summary.passed || 0;
        overallStats.totalFailed += result.summary.failed || 0;
      }
      if (result.skipped) {
        overallStats.totalSkipped++;
      }
    });
    
    overallStats.overallSuccessRate = overallStats.totalTests > 0 
      ? Math.round((overallStats.totalPassed / overallStats.totalTests) * 100)
      : 0;
    
    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      overall: overallStats,
      suites: this.results,
      coverage: this.calculateCoverage(),
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  calculateCoverage() {
    // Calculate test coverage across different areas
    const coverage = {
      components: {
        authManager: this.hasTestsFor('AuthManager'),
        sheetsManager: this.hasTestsFor('SheetsManager'),
        dataTransformer: this.hasTestsFor('DataTransformer'),
        syncManager: this.hasTestsFor('SyncManager'),
        conflictResolver: this.hasTestsFor('ConflictResolver'),
        errorHandler: this.hasTestsFor('ErrorHandler'),
        performanceMonitor: this.hasTestsFor('PerformanceMonitor'),
        progressTracker: this.hasTestsFor('ProgressTracker'),
        syncLogger: this.hasTestsFor('SyncLogger'),
        syncQueue: this.hasTestsFor('SyncQueue')
      },
      scenarios: {
        authentication: this.hasTestsFor('authentication'),
        dataSync: this.hasTestsFor('sync'),
        conflictResolution: this.hasTestsFor('conflict'),
        errorHandling: this.hasTestsFor('error'),
        performance: this.hasTestsFor('performance'),
        offline: this.hasTestsFor('offline'),
        recovery: this.hasTestsFor('recovery')
      },
      apiIntegration: {
        googleSheets: this.hasTestsFor('Google Sheets'),
        oauth: this.hasTestsFor('OAuth'),
        rateLimiting: this.hasTestsFor('rate limit'),
        batchOperations: this.hasTestsFor('batch')
      }
    };
    
    // Calculate coverage percentages
    const componentCoverage = Object.values(coverage.components).filter(Boolean).length / Object.keys(coverage.components).length * 100;
    const scenarioCoverage = Object.values(coverage.scenarios).filter(Boolean).length / Object.keys(coverage.scenarios).length * 100;
    const apiCoverage = Object.values(coverage.apiIntegration).filter(Boolean).length / Object.keys(coverage.apiIntegration).length * 100;
    
    return {
      ...coverage,
      percentages: {
        components: Math.round(componentCoverage),
        scenarios: Math.round(scenarioCoverage),
        apiIntegration: Math.round(apiCoverage),
        overall: Math.round((componentCoverage + scenarioCoverage + apiCoverage) / 3)
      }
    };
  }

  hasTestsFor(keyword) {
    const allResults = Object.values(this.results);
    return allResults.some(suite => {
      if (suite.results) {
        return suite.results.some(test => 
          test.testName.toLowerCase().includes(keyword.toLowerCase())
        );
      }
      return false;
    });
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check overall success rate
    const overallSuccessRate = this.results.overall?.overallSuccessRate || 0;
    if (overallSuccessRate < 90) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: `Overall success rate is ${overallSuccessRate}%. Consider investigating failing tests.`
      });
    }
    
    // Check for missing test suites
    const expectedSuites = ['unit', 'integration', 'e2e', 'errorScenarios'];
    const missingSuites = expectedSuites.filter(suite => !this.results[suite]);
    if (missingSuites.length > 0) {
      recommendations.push({
        type: 'coverage',
        priority: 'medium',
        message: `Missing test suites: ${missingSuites.join(', ')}`
      });
    }
    
    // Check for performance issues
    if (this.results.performance && this.results.performance.duration > 30000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Performance tests are taking longer than expected. Consider optimization.'
      });
    }
    
    // Check error handling coverage
    if (!this.hasTestsFor('error') || !this.hasTestsFor('recovery')) {
      recommendations.push({
        type: 'robustness',
        priority: 'high',
        message: 'Insufficient error handling and recovery test coverage.'
      });
    }
    
    // Check API integration coverage
    if (!this.hasTestsFor('Google Sheets') || !this.hasTestsFor('OAuth')) {
      recommendations.push({
        type: 'integration',
        priority: 'high',
        message: 'Missing critical API integration tests.'
      });
    }
    
    return recommendations;
  }

  displayResults(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(60));
    
    // Overall statistics
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Tests: ${report.overall.totalTests}`);
    console.log(`   Passed: ${report.overall.totalPassed} ✅`);
    console.log(`   Failed: ${report.overall.totalFailed} ❌`);
    console.log(`   Success Rate: ${report.overall.overallSuccessRate}%`);
    console.log(`   Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log(`   Test Suites: ${report.overall.suiteCount}`);
    
    // Suite breakdown
    console.log(`\n📋 Suite Breakdown:`);
    Object.entries(report.suites).forEach(([key, suite]) => {
      const status = suite.error ? '❌' : '✅';
      const rate = suite.summary ? suite.summary.successRate : 0;
      console.log(`   ${status} ${suite.suite}: ${rate}% (${suite.summary?.passed || 0}/${suite.summary?.total || 0})`);
    });
    
    // Coverage report
    console.log(`\n🎯 Test Coverage:`);
    console.log(`   Components: ${report.coverage.percentages.components}%`);
    console.log(`   Scenarios: ${report.coverage.percentages.scenarios}%`);
    console.log(`   API Integration: ${report.coverage.percentages.apiIntegration}%`);
    console.log(`   Overall Coverage: ${report.coverage.percentages.overall}%`);
    
    // Recommendations
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${priority} ${rec.message}`);
      });
    }
    
    // Failed tests summary
    const failedTests = this.getFailedTests();
    if (failedTests.length > 0) {
      console.log(`\n❌ Failed Tests (${failedTests.length}):`);
      failedTests.forEach(test => {
        console.log(`   • ${test.suite}: ${test.testName}`);
        console.log(`     ${test.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Final verdict
    if (report.overall.overallSuccessRate >= 95) {
      console.log('🎉 EXCELLENT! All tests are passing with high success rate.');
    } else if (report.overall.overallSuccessRate >= 85) {
      console.log('✅ GOOD! Most tests are passing. Address failing tests for improvement.');
    } else if (report.overall.overallSuccessRate >= 70) {
      console.log('⚠️  NEEDS ATTENTION! Several tests are failing. Investigation required.');
    } else {
      console.log('🚨 CRITICAL! Many tests are failing. Immediate attention required.');
    }
    
    console.log('='.repeat(60));
  }

  getFailedTests() {
    const failedTests = [];
    
    Object.entries(this.results).forEach(([suiteKey, suite]) => {
      if (suite.results) {
        suite.results.filter(test => !test.success).forEach(test => {
          failedTests.push({
            suite: suite.suite,
            testName: test.testName,
            message: test.message
          });
        });
      }
    });
    
    return failedTests;
  }

  saveResults(report) {
    try {
      const resultsKey = 'vat_comprehensive_test_results';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const historicalKey = `vat_test_results_${timestamp}`;
      
      // Save current results
      localStorage.setItem(resultsKey, JSON.stringify(report));
      
      // Save historical results
      localStorage.setItem(historicalKey, JSON.stringify(report));
      
      console.log(`💾 Test results saved to localStorage`);
      console.log(`   Current: ${resultsKey}`);
      console.log(`   Historical: ${historicalKey}`);
      
    } catch (error) {
      console.error('❌ Failed to save test results:', error.message);
    }
  }

  calculateDuration() {
    return this.endTime ? this.endTime - this.startTime : 0;
  }

  // Utility method to run specific test suite
  async runSpecificSuite(suiteName, options = {}) {
    console.log(`🎯 Running specific test suite: ${suiteName}`);
    
    const suiteMap = {
      'unit': () => this.runUnitTests(),
      'integration': () => this.runIntegrationTests(),
      'e2e': () => this.runE2ETests(),
      'error': () => this.runErrorScenarioTests(),
      'performance': () => this.runPerformanceTests()
    };
    
    if (suiteMap[suiteName]) {
      this.startTime = performance.now();
      await suiteMap[suiteName]();
      this.endTime = performance.now();
      
      const report = this.generateComprehensiveReport();
      this.displayResults(report);
      
      return report;
    } else {
      throw new Error(`Unknown test suite: ${suiteName}`);
    }
  }

  // Method to get test results summary
  getResultsSummary() {
    return {
      timestamp: new Date().toISOString(),
      suites: Object.keys(this.results),
      totalTests: Object.values(this.results).reduce((sum, suite) => sum + (suite.summary?.total || 0), 0),
      totalPassed: Object.values(this.results).reduce((sum, suite) => sum + (suite.summary?.passed || 0), 0),
      totalFailed: Object.values(this.results).reduce((sum, suite) => sum + (suite.summary?.failed || 0), 0),
      overallSuccessRate: this.calculateOverallSuccessRate()
    };
  }

  calculateOverallSuccessRate() {
    const totalTests = Object.values(this.results).reduce((sum, suite) => sum + (suite.summary?.total || 0), 0);
    const totalPassed = Object.values(this.results).reduce((sum, suite) => sum + (suite.summary?.passed || 0), 0);
    
    return totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  }
}

// Export for use in test HTML files
if (typeof window !== 'undefined') {
  window.ComprehensiveTestRunner = ComprehensiveTestRunner;
}

// Auto-run tests if in test environment
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
  // Wait for DOM and other test suites to load
  window.addEventListener('load', async () => {
    // Small delay to ensure all test suites are loaded
    setTimeout(async () => {
      try {
        const testRunner = new ComprehensiveTestRunner();
        await testRunner.runAllTests({ saveResults: true });
      } catch (error) {
        console.error('Auto-run test execution failed:', error);
      }
    }, 1000);
  });
}