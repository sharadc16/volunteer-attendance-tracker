/**
 * Test Validation Script
 * Validates that all test suites are properly implemented and can run
 */
class TestValidation {
  constructor() {
    this.validationResults = [];
  }

  async validateAllTestSuites() {
    console.log('🔍 Validating all test suites...');
    
    try {
      // Validate test suite classes exist
      await this.validateTestSuiteClasses();
      
      // Validate test suite structure
      await this.validateTestSuiteStructure();
      
      // Validate test runner
      await this.validateTestRunner();
      
      // Run quick smoke tests
      await this.runSmokeTests();
      
      // Generate validation report
      const report = this.generateValidationReport();
      this.displayValidationResults(report);
      
      return report;
      
    } catch (error) {
      console.error('❌ Test validation failed:', error);
      throw error;
    }
  }

  async validateTestSuiteClasses() {
    console.log('📋 Validating test suite classes...');
    
    const expectedClasses = [
      'UnitTestSuite',
      'IntegrationTestSuite', 
      'E2ETestSuite',
      'ErrorScenarioTestSuite',
      'SyncTestSuite',
      'ComprehensiveTestRunner'
    ];
    
    for (const className of expectedClasses) {
      const exists = typeof window[className] !== 'undefined';
      this.recordValidation(
        `Class ${className}`,
        exists,
        exists ? 'Class is available' : 'Class is missing'
      );
      
      if (exists) {
        // Check if class can be instantiated
        try {
          const instance = new window[className]();
          this.recordValidation(
            `${className} instantiation`,
            true,
            'Class can be instantiated'
          );
        } catch (error) {
          this.recordValidation(
            `${className} instantiation`,
            false,
            `Cannot instantiate: ${error.message}`
          );
        }
      }
    }
  }

  async validateTestSuiteStructure() {
    console.log('🏗️  Validating test suite structure...');
    
    const testSuites = [
      { name: 'UnitTestSuite', methods: ['runAllUnitTests', 'generateReport'] },
      { name: 'IntegrationTestSuite', methods: ['runAllIntegrationTests', 'generateReport'] },
      { name: 'E2ETestSuite', methods: ['runAllE2ETests', 'generateReport'] },
      { name: 'ErrorScenarioTestSuite', methods: ['runAllErrorScenarioTests', 'generateReport'] }
    ];
    
    for (const suite of testSuites) {
      if (typeof window[suite.name] !== 'undefined') {
        const instance = new window[suite.name]();
        
        for (const method of suite.methods) {
          const hasMethod = typeof instance[method] === 'function';
          this.recordValidation(
            `${suite.name}.${method}`,
            hasMethod,
            hasMethod ? 'Method exists' : 'Method missing'
          );
        }
      }
    }
  }

  async validateTestRunner() {
    console.log('🏃 Validating test runner...');
    
    if (typeof ComprehensiveTestRunner !== 'undefined') {
      const runner = new ComprehensiveTestRunner();
      
      // Check required methods
      const requiredMethods = [
        'runAllTests',
        'runUnitTests',
        'runIntegrationTests',
        'runE2ETests',
        'runErrorScenarioTests',
        'generateComprehensiveReport'
      ];
      
      for (const method of requiredMethods) {
        const hasMethod = typeof runner[method] === 'function';
        this.recordValidation(
          `TestRunner.${method}`,
          hasMethod,
          hasMethod ? 'Method exists' : 'Method missing'
        );
      }
      
      // Test initialization
      try {
        await runner.initializeTestSuites();
        this.recordValidation(
          'TestRunner initialization',
          true,
          'Test runner initializes successfully'
        );
      } catch (error) {
        this.recordValidation(
          'TestRunner initialization',
          false,
          `Initialization failed: ${error.message}`
        );
      }
    } else {
      this.recordValidation(
        'ComprehensiveTestRunner',
        false,
        'Test runner class not found'
      );
    }
  }

  async runSmokeTests() {
    console.log('💨 Running smoke tests...');
    
    // Test basic functionality of each suite
    const smokeTests = [
      {
        name: 'Unit Test Smoke Test',
        test: async () => {
          if (typeof UnitTestSuite === 'undefined') return false;
          const suite = new UnitTestSuite();
          // Just check if we can create mock data
          return suite.createMockData && typeof suite.createMockData === 'function';
        }
      },
      {
        name: 'Integration Test Smoke Test',
        test: async () => {
          if (typeof IntegrationTestSuite === 'undefined') return false;
          const suite = new IntegrationTestSuite();
          // Check if we can set up environment
          return typeof suite.setupIntegrationEnvironment === 'function';
        }
      },
      {
        name: 'E2E Test Smoke Test',
        test: async () => {
          if (typeof E2ETestSuite === 'undefined') return false;
          const suite = new E2ETestSuite();
          // Check if we can create test data
          return suite.createTestData && typeof suite.createTestData === 'function';
        }
      },
      {
        name: 'Error Scenario Smoke Test',
        test: async () => {
          if (typeof ErrorScenarioTestSuite === 'undefined') return false;
          const suite = new ErrorScenarioTestSuite();
          // Check if we can create error scenarios
          return suite.createErrorScenarios && typeof suite.createErrorScenarios === 'function';
        }
      }
    ];
    
    for (const smokeTest of smokeTests) {
      try {
        const result = await smokeTest.test();
        this.recordValidation(
          smokeTest.name,
          result,
          result ? 'Smoke test passed' : 'Smoke test failed'
        );
      } catch (error) {
        this.recordValidation(
          smokeTest.name,
          false,
          `Smoke test error: ${error.message}`
        );
      }
    }
  }

  recordValidation(testName, success, message) {
    this.validationResults.push({
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

  generateValidationReport() {
    const totalValidations = this.validationResults.length;
    const passedValidations = this.validationResults.filter(r => r.success).length;
    const failedValidations = totalValidations - passedValidations;
    
    const report = {
      summary: {
        total: totalValidations,
        passed: passedValidations,
        failed: failedValidations,
        successRate: totalValidations > 0 ? Math.round((passedValidations / totalValidations) * 100) : 0
      },
      results: this.validationResults,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedResults = this.validationResults.filter(r => !r.success);
    
    if (failedResults.length > 0) {
      recommendations.push({
        type: 'critical',
        message: `${failedResults.length} validation(s) failed. Review missing components.`
      });
    }
    
    // Check for missing test suites
    const missingClasses = failedResults.filter(r => r.testName.includes('Class') && r.message.includes('missing'));
    if (missingClasses.length > 0) {
      recommendations.push({
        type: 'error',
        message: 'Missing test suite classes. Ensure all test files are loaded.'
      });
    }
    
    // Check for missing methods
    const missingMethods = failedResults.filter(r => r.message.includes('Method missing'));
    if (missingMethods.length > 0) {
      recommendations.push({
        type: 'warning',
        message: 'Some test suite methods are missing. Check implementation completeness.'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'All validations passed. Test suite is ready for execution.'
      });
    }
    
    return recommendations;
  }

  displayValidationResults(report) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST VALIDATION RESULTS');
    console.log('='.repeat(50));
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total Validations: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed} ✅`);
    console.log(`   Failed: ${report.summary.failed} ❌`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);
    
    if (report.summary.failed > 0) {
      console.log(`\n❌ Failed Validations:`);
      report.results.filter(r => !r.success).forEach(result => {
        console.log(`   • ${result.testName}: ${result.message}`);
      });
    }
    
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach(rec => {
      const icon = rec.type === 'critical' ? '🚨' : 
                   rec.type === 'error' ? '❌' : 
                   rec.type === 'warning' ? '⚠️' : '✅';
      console.log(`   ${icon} ${rec.message}`);
    });
    
    console.log('\n' + '='.repeat(50));
    
    if (report.summary.successRate >= 95) {
      console.log('🎉 EXCELLENT! Test suite validation passed with high success rate.');
    } else if (report.summary.successRate >= 80) {
      console.log('✅ GOOD! Most validations passed. Address failing items for improvement.');
    } else {
      console.log('⚠️  NEEDS ATTENTION! Several validations failed. Review implementation.');
    }
    
    console.log('='.repeat(50));
  }

  // Quick validation method for use in HTML
  static async quickValidate() {
    const validator = new TestValidation();
    return await validator.validateAllTestSuites();
  }
}

// Export for use in test files
if (typeof window !== 'undefined') {
  window.TestValidation = TestValidation;
}

// Auto-validate if in test environment
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
  window.addEventListener('load', async () => {
    setTimeout(async () => {
      try {
        console.log('🔍 Auto-validating test suite...');
        await TestValidation.quickValidate();
      } catch (error) {
        console.error('Auto-validation failed:', error);
      }
    }, 500);
  });
}