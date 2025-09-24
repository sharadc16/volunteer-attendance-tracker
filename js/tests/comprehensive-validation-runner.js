/**
 * Comprehensive Validation Test Runner
 * Orchestrates all final validation tests and generates consolidated reports
 */
class ComprehensiveValidationRunner {
  constructor() {
    this.testSuites = {};
    this.results = {};
    this.startTime = null;
    this.endTime = null;
    this.validationReport = null;
  }

  async runCompleteValidation(options = {}) {
    console.log('🚀 Starting Comprehensive Validation Suite');
    console.log('=' .repeat(60));
    console.log('This comprehensive test validates all aspects of the Google Sheets Sync implementation');
    console.log('including browser compatibility, performance, security, and requirements compliance.');
    console.log('=' .repeat(60));
    
    this.startTime = performance.now();
    
    try {
      // Initialize all test suites
      await this.initializeTestSuites();
      
      // 1. Browser Compatibility Validation
      if (options.browserCompatibility !== false) {
        await this.runBrowserCompatibilityValidation();
      }
      
      // 2. Performance Validation
      if (options.performance !== false) {
        await this.runPerformanceValidation();
      }
      
      // 3. Security Validation
      if (options.security !== false) {
        await this.runSecurityValidation();
      }
      
      // 4. Final Integration Validation
      if (options.integration !== false) {
        await this.runFinalValidationTests();
      }
      
      // 5. Requirements Compliance Check
      if (options.requirements !== false) {
        await this.runRequirementsValidation();
      }
      
      this.endTime = performance.now();
      
      // Generate comprehensive validation report
      this.validationReport = this.generateComprehensiveReport();
      
      // Display results
      this.displayValidationResults();
      
      // Save results
      this.saveValidationResults();
      
      return this.validationReport;
      
    } catch (error) {
      console.error('❌ Comprehensive validation failed:', error);
      throw error;
    }
  }

  async initializeTestSuites() {
    console.log('📋 Initializing validation test suites...');
    
    try {
      // Initialize Browser Compatibility Test Suite
      if (typeof BrowserCompatibilityTestSuite !== 'undefined') {
        this.testSuites.browserCompatibility = new BrowserCompatibilityTestSuite();
        console.log('✅ Browser Compatibility Test Suite initialized');
      }
      
      // Initialize Performance Validation Test Suite
      if (typeof PerformanceValidationTestSuite !== 'undefined') {
        this.testSuites.performance = new PerformanceValidationTestSuite();
        console.log('✅ Performance Validation Test Suite initialized');
      }
      
      // Initialize Security Validation Test Suite
      if (typeof SecurityValidationTestSuite !== 'undefined') {
        this.testSuites.security = new SecurityValidationTestSuite();
        console.log('✅ Security Validation Test Suite initialized');
      }
      
      // Initialize Final Validation Test Suite
      if (typeof FinalValidationTestSuite !== 'undefined') {
        this.testSuites.finalValidation = new FinalValidationTestSuite();
        console.log('✅ Final Validation Test Suite initialized');
      }
      
      // Initialize existing test suites
      if (typeof ComprehensiveTestRunner !== 'undefined') {
        this.testSuites.comprehensive = new ComprehensiveTestRunner();
        console.log('✅ Comprehensive Test Runner initialized');
      }
      
      const suiteCount = Object.keys(this.testSuites).length;
      console.log(`📊 Total test suites initialized: ${suiteCount}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize test suites:', error);
      throw error;
    }
  }

  async runBrowserCompatibilityValidation() {
    console.log('\n🌐 Running Browser Compatibility Validation...');
    console.log('-'.repeat(50));
    
    try {
      if (this.testSuites.browserCompatibility) {
        const results = await this.testSuites.browserCompatibility.runAllCompatibilityTests();
        this.results.browserCompatibility = results;
        
        console.log(`✅ Browser Compatibility: ${results.summary.overall.successRate}% success rate`);
        console.log(`   Browser: ${results.browserInfo.name} ${results.browserInfo.version}`);
        console.log(`   Compatibility Level: ${results.compatibilityVerdict.level}`);
        
        if (!results.compatibilityVerdict.compatible) {
          console.warn(`⚠️  Browser compatibility issues detected:`);
          results.compatibilityVerdict.issues.forEach(issue => {
            console.warn(`   • ${issue}`);
          });
        }
      } else {
        console.warn('⚠️  Browser Compatibility Test Suite not available');
        this.results.browserCompatibility = { skipped: true, reason: 'Test suite not available' };
      }
    } catch (error) {
      console.error('❌ Browser compatibility validation failed:', error);
      this.results.browserCompatibility = { error: error.message };
    }
  }

  async runPerformanceValidation() {
    console.log('\n⚡ Running Performance Validation...');
    console.log('-'.repeat(50));
    
    try {
      if (this.testSuites.performance) {
        const results = await this.testSuites.performance.runAllPerformanceTests();
        this.results.performance = results;
        
        console.log(`✅ Performance Validation: ${results.summary.overall.successRate}% success rate`);
        console.log(`   Duration: ${(results.duration / 1000).toFixed(2)}s`);
        
        // Display key performance metrics
        if (results.performanceMetrics) {
          const metrics = results.performanceMetrics;
          console.log('📊 Key Performance Metrics:');
          
          Object.entries(metrics).forEach(([key, metric]) => {
            if (metric.throughput) {
              console.log(`   • ${key}: ${metric.throughput.toFixed(0)} records/sec`);
            } else if (metric.duration) {
              console.log(`   • ${key}: ${metric.duration.toFixed(2)}ms`);
            }
          });
        }
        
        // Display memory usage if available
        if (results.memoryBaseline && performance.memory) {
          const currentMemory = performance.memory.usedJSHeapSize;
          const memoryIncrease = currentMemory - results.memoryBaseline.usedJSHeapSize;
          console.log(`🧠 Memory Usage: +${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        }
        
      } else {
        console.warn('⚠️  Performance Validation Test Suite not available');
        this.results.performance = { skipped: true, reason: 'Test suite not available' };
      }
    } catch (error) {
      console.error('❌ Performance validation failed:', error);
      this.results.performance = { error: error.message };
    }
  }

  async runSecurityValidation() {
    console.log('\n🔒 Running Security Validation...');
    console.log('-'.repeat(50));
    
    try {
      if (this.testSuites.security) {
        const results = await this.testSuites.security.runAllSecurityTests();
        this.results.security = results;
        
        console.log(`✅ Security Validation: ${results.summary.overall.successRate}% success rate`);
        console.log(`   Security Level: ${results.securityLevel}`);
        console.log(`   Vulnerabilities: ${results.vulnerabilities.length}`);
        
        // Display critical vulnerabilities
        const criticalVulns = results.vulnerabilities.filter(v => v.severity === 'HIGH');
        if (criticalVulns.length > 0) {
          console.warn(`🚨 Critical Security Issues (${criticalVulns.length}):`);
          criticalVulns.forEach(vuln => {
            console.warn(`   • ${vuln.testName}: ${vuln.message}`);
          });
        }
        
        // Display security recommendations
        if (results.recommendations && results.recommendations.length > 0) {
          console.log('💡 Security Recommendations:');
          results.recommendations.slice(0, 3).forEach(rec => {
            console.log(`   • [${rec.priority}] ${rec.message}`);
          });
        }
        
      } else {
        console.warn('⚠️  Security Validation Test Suite not available');
        this.results.security = { skipped: true, reason: 'Test suite not available' };
      }
    } catch (error) {
      console.error('❌ Security validation failed:', error);
      this.results.security = { error: error.message };
    }
  }

  async runFinalValidationTests() {
    console.log('\n🔍 Running Final Integration Validation...');
    console.log('-'.repeat(50));
    
    try {
      if (this.testSuites.finalValidation) {
        const results = await this.testSuites.finalValidation.runAllValidationTests();
        this.results.finalValidation = results;
        
        console.log(`✅ Final Validation: ${results.summary.overall.successRate}% success rate`);
        console.log(`   Production Ready: ${results.finalVerdict.readyForProduction ? 'YES' : 'NO'}`);
        console.log(`   Status: ${results.finalVerdict.status}`);
        
        if (results.finalVerdict.criticalIssues.length > 0) {
          console.warn(`🚨 Critical Issues (${results.finalVerdict.criticalIssues.length}):`);
          results.finalVerdict.criticalIssues.forEach(issue => {
            console.warn(`   • ${issue}`);
          });
        }
        
      } else {
        console.warn('⚠️  Final Validation Test Suite not available');
        this.results.finalValidation = { skipped: true, reason: 'Test suite not available' };
      }
    } catch (error) {
      console.error('❌ Final validation tests failed:', error);
      this.results.finalValidation = { error: error.message };
    }
  }

  async runRequirementsValidation() {
    console.log('\n📋 Running Requirements Compliance Validation...');
    console.log('-'.repeat(50));
    
    try {
      // Run comprehensive test suite which includes requirements validation
      if (this.testSuites.comprehensive) {
        const results = await this.testSuites.comprehensive.runAllTests({
          unit: true,
          integration: true,
          e2e: true,
          errorScenarios: true,
          performance: true
        });
        
        this.results.requirements = results;
        
        console.log(`✅ Requirements Validation: ${results.summary.passed}/${results.summary.total} tests passed`);
        console.log(`   Success Rate: ${results.summary.successRate}%`);
        
        // Display coverage information
        if (results.coverage) {
          console.log('🎯 Requirements Coverage:');
          console.log(`   • Components: ${results.coverage.percentages.components}%`);
          console.log(`   • Scenarios: ${results.coverage.percentages.scenarios}%`);
          console.log(`   • API Integration: ${results.coverage.percentages.apiIntegration}%`);
          console.log(`   • Overall: ${results.coverage.percentages.overall}%`);
        }
        
      } else {
        console.warn('⚠️  Requirements validation test suite not available');
        this.results.requirements = { skipped: true, reason: 'Test suite not available' };
      }
    } catch (error) {
      console.error('❌ Requirements validation failed:', error);
      this.results.requirements = { error: error.message };
    }
  }

  generateComprehensiveReport() {
    const totalDuration = this.endTime - this.startTime;
    
    // Calculate overall statistics
    const overallStats = {
      totalTestSuites: Object.keys(this.results).length,
      completedSuites: Object.values(this.results).filter(r => !r.skipped && !r.error).length,
      skippedSuites: Object.values(this.results).filter(r => r.skipped).length,
      errorSuites: Object.values(this.results).filter(r => r.error).length,
      duration: totalDuration
    };
    
    // Aggregate test results
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    
    Object.values(this.results).forEach(result => {
      if (result.summary && result.summary.overall) {
        totalTests += result.summary.overall.total || 0;
        totalPassed += result.summary.overall.passed || 0;
        totalFailed += result.summary.overall.failed || 0;
      }
    });
    
    const overallSuccessRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    // Generate final verdict
    const finalVerdict = this.generateFinalVerdict({
      overallSuccessRate,
      totalTests,
      totalPassed,
      totalFailed,
      overallStats
    });
    
    // Compile critical issues
    const criticalIssues = this.compileCriticalIssues();
    
    // Generate recommendations
    const recommendations = this.generateFinalRecommendations();
    
    return {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      overallStats,
      testSummary: {
        totalTests,
        totalPassed,
        totalFailed,
        overallSuccessRate
      },
      suiteResults: this.results,
      finalVerdict,
      criticalIssues,
      recommendations,
      productionReadiness: this.assessProductionReadiness(),
      nextSteps: this.generateNextSteps()
    };
  }

  generateFinalVerdict(stats) {
    const verdict = {
      status: 'UNKNOWN',
      message: '',
      readyForProduction: false,
      confidence: 0
    };
    
    // Determine status based on success rate and critical issues
    const criticalIssues = this.compileCriticalIssues();
    const hasCriticalIssues = criticalIssues.length > 0;
    
    if (stats.overallSuccessRate >= 95 && !hasCriticalIssues) {
      verdict.status = 'EXCELLENT';
      verdict.message = 'All validation tests passed with excellent results. System is production-ready.';
      verdict.readyForProduction = true;
      verdict.confidence = 95;
    } else if (stats.overallSuccessRate >= 90 && !hasCriticalIssues) {
      verdict.status = 'VERY_GOOD';
      verdict.message = 'Most validation tests passed with very good results. Minor issues should be addressed.';
      verdict.readyForProduction = true;
      verdict.confidence = 85;
    } else if (stats.overallSuccessRate >= 80 && criticalIssues.length <= 2) {
      verdict.status = 'GOOD';
      verdict.message = 'Good test results with some issues. Address critical issues before production.';
      verdict.readyForProduction = false;
      verdict.confidence = 70;
    } else if (stats.overallSuccessRate >= 70) {
      verdict.status = 'NEEDS_IMPROVEMENT';
      verdict.message = 'Several validation tests failed. Significant improvements needed before production.';
      verdict.readyForProduction = false;
      verdict.confidence = 50;
    } else {
      verdict.status = 'NOT_READY';
      verdict.message = 'Many validation tests failed. System is not ready for production deployment.';
      verdict.readyForProduction = false;
      verdict.confidence = 25;
    }
    
    return verdict;
  }

  compileCriticalIssues() {
    const criticalIssues = [];
    
    // Browser compatibility issues
    if (this.results.browserCompatibility && !this.results.browserCompatibility.compatibilityVerdict?.compatible) {
      criticalIssues.push({
        category: 'Browser Compatibility',
        issue: 'Browser compatibility issues detected',
        severity: 'HIGH'
      });
    }
    
    // Security vulnerabilities
    if (this.results.security && this.results.security.vulnerabilities) {
      const highSeverityVulns = this.results.security.vulnerabilities.filter(v => v.severity === 'HIGH');
      if (highSeverityVulns.length > 0) {
        criticalIssues.push({
          category: 'Security',
          issue: `${highSeverityVulns.length} high severity security vulnerabilities`,
          severity: 'CRITICAL'
        });
      }
    }
    
    // Performance issues
    if (this.results.performance && this.results.performance.summary?.overall.successRate < 70) {
      criticalIssues.push({
        category: 'Performance',
        issue: 'Performance validation failed multiple tests',
        severity: 'HIGH'
      });
    }
    
    // Final validation issues
    if (this.results.finalValidation && this.results.finalValidation.finalVerdict?.criticalIssues?.length > 0) {
      this.results.finalValidation.finalVerdict.criticalIssues.forEach(issue => {
        criticalIssues.push({
          category: 'Final Validation',
          issue,
          severity: 'HIGH'
        });
      });
    }
    
    return criticalIssues;
  }

  generateFinalRecommendations() {
    const recommendations = [];
    
    // Browser compatibility recommendations
    if (this.results.browserCompatibility?.recommendations) {
      recommendations.push(...this.results.browserCompatibility.recommendations.map(rec => ({
        category: 'Browser Compatibility',
        recommendation: rec,
        priority: 'MEDIUM'
      })));
    }
    
    // Security recommendations
    if (this.results.security?.recommendations) {
      recommendations.push(...this.results.security.recommendations.map(rec => ({
        category: 'Security',
        recommendation: rec.message || rec,
        priority: rec.priority || 'MEDIUM'
      })));
    }
    
    // Performance recommendations
    if (this.results.performance?.recommendations) {
      recommendations.push(...this.results.performance.recommendations.map(rec => ({
        category: 'Performance',
        recommendation: rec,
        priority: 'MEDIUM'
      })));
    }
    
    // General recommendations
    recommendations.push({
      category: 'General',
      recommendation: 'Implement continuous integration testing to catch issues early',
      priority: 'LOW'
    });
    
    recommendations.push({
      category: 'General',
      recommendation: 'Set up monitoring and alerting for production deployment',
      priority: 'MEDIUM'
    });
    
    return recommendations;
  }

  assessProductionReadiness() {
    const readiness = {
      overall: false,
      categories: {},
      blockers: [],
      warnings: []
    };
    
    // Assess each category
    Object.entries(this.results).forEach(([category, result]) => {
      if (result.skipped || result.error) {
        readiness.categories[category] = 'UNKNOWN';
        readiness.warnings.push(`${category} validation was skipped or failed`);
        return;
      }
      
      const successRate = result.summary?.overall?.successRate || 0;
      
      if (successRate >= 90) {
        readiness.categories[category] = 'READY';
      } else if (successRate >= 75) {
        readiness.categories[category] = 'MOSTLY_READY';
        readiness.warnings.push(`${category} has some issues but is mostly ready`);
      } else {
        readiness.categories[category] = 'NOT_READY';
        readiness.blockers.push(`${category} validation failed too many tests`);
      }
    });
    
    // Overall readiness
    const categoryReadiness = Object.values(readiness.categories);
    const readyCount = categoryReadiness.filter(status => status === 'READY').length;
    const totalCount = categoryReadiness.length;
    
    readiness.overall = readyCount >= Math.ceil(totalCount * 0.8) && readiness.blockers.length === 0;
    
    return readiness;
  }

  generateNextSteps() {
    const nextSteps = [];
    
    const criticalIssues = this.compileCriticalIssues();
    
    if (criticalIssues.length > 0) {
      nextSteps.push({
        priority: 1,
        action: 'Address Critical Issues',
        description: `Resolve ${criticalIssues.length} critical issues before proceeding`,
        details: criticalIssues.map(issue => `${issue.category}: ${issue.issue}`)
      });
    }
    
    if (this.validationReport?.finalVerdict.readyForProduction) {
      nextSteps.push({
        priority: 2,
        action: 'Prepare for Production Deployment',
        description: 'System is ready for production deployment',
        details: [
          'Set up production environment',
          'Configure monitoring and alerting',
          'Prepare rollback procedures',
          'Schedule deployment window'
        ]
      });
    } else {
      nextSteps.push({
        priority: 2,
        action: 'Continue Development',
        description: 'Address remaining issues before production deployment',
        details: [
          'Fix failing tests',
          'Implement missing features',
          'Optimize performance',
          'Enhance security measures'
        ]
      });
    }
    
    nextSteps.push({
      priority: 3,
      action: 'Ongoing Maintenance',
      description: 'Establish ongoing maintenance procedures',
      details: [
        'Set up automated testing pipeline',
        'Implement continuous monitoring',
        'Plan regular security audits',
        'Establish update procedures'
      ]
    });
    
    return nextSteps;
  }

  displayValidationResults() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE VALIDATION RESULTS');
    console.log('='.repeat(80));
    
    const report = this.validationReport;
    
    // Overall statistics
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log(`   Test Suites: ${report.overallStats.completedSuites}/${report.overallStats.totalTestSuites} completed`);
    console.log(`   Total Tests: ${report.testSummary.totalTests}`);
    console.log(`   Passed: ${report.testSummary.totalPassed} ✅`);
    console.log(`   Failed: ${report.testSummary.totalFailed} ❌`);
    console.log(`   Success Rate: ${report.testSummary.overallSuccessRate}%`);
    
    // Final verdict
    console.log(`\n🎯 Final Verdict:`);
    console.log(`   Status: ${report.finalVerdict.status}`);
    console.log(`   Production Ready: ${report.finalVerdict.readyForProduction ? 'YES' : 'NO'}`);
    console.log(`   Confidence: ${report.finalVerdict.confidence}%`);
    console.log(`   Message: ${report.finalVerdict.message}`);
    
    // Critical issues
    if (report.criticalIssues.length > 0) {
      console.log(`\n🚨 Critical Issues (${report.criticalIssues.length}):`);
      report.criticalIssues.forEach(issue => {
        console.log(`   • [${issue.severity}] ${issue.category}: ${issue.issue}`);
      });
    }
    
    // Production readiness
    console.log(`\n🚀 Production Readiness:`);
    console.log(`   Overall Ready: ${report.productionReadiness.overall ? 'YES' : 'NO'}`);
    console.log(`   Blockers: ${report.productionReadiness.blockers.length}`);
    console.log(`   Warnings: ${report.productionReadiness.warnings.length}`);
    
    // Next steps
    console.log(`\n📋 Next Steps:`);
    report.nextSteps.forEach(step => {
      console.log(`   ${step.priority}. ${step.action}`);
      console.log(`      ${step.description}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Final message
    if (report.finalVerdict.readyForProduction) {
      console.log('🎉 CONGRATULATIONS! The Google Sheets Sync implementation has passed');
      console.log('   comprehensive validation and is ready for production deployment.');
    } else {
      console.log('⚠️  The Google Sheets Sync implementation requires additional work');
      console.log('   before it can be deployed to production. Please address the issues above.');
    }
    
    console.log('='.repeat(80));
  }

  saveValidationResults() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsKey = 'comprehensive_validation_results';
      const historicalKey = `validation_results_${timestamp}`;
      
      // Save current results
      localStorage.setItem(resultsKey, JSON.stringify(this.validationReport));
      
      // Save historical results
      localStorage.setItem(historicalKey, JSON.stringify(this.validationReport));
      
      console.log(`💾 Validation results saved:`);
      console.log(`   Current: ${resultsKey}`);
      console.log(`   Historical: ${historicalKey}`);
      
    } catch (error) {
      console.error('❌ Failed to save validation results:', error.message);
    }
  }

  // Method to export results for external analysis
  exportResults(format = 'json') {
    if (!this.validationReport) {
      throw new Error('No validation results to export. Run validation first.');
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    let filename, content, mimeType;
    
    switch (format.toLowerCase()) {
      case 'json':
        filename = `validation-results-${timestamp}.json`;
        content = JSON.stringify(this.validationReport, null, 2);
        mimeType = 'application/json';
        break;
        
      case 'csv':
        filename = `validation-results-${timestamp}.csv`;
        content = this.convertToCSV(this.validationReport);
        mimeType = 'text/csv';
        break;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
    
    console.log(`📊 Validation results exported as ${filename}`);
  }

  convertToCSV(report) {
    const rows = [];
    
    // Header
    rows.push(['Category', 'Test Name', 'Status', 'Message', 'Timestamp']);
    
    // Add results from each suite
    Object.entries(report.suiteResults).forEach(([suiteName, suite]) => {
      if (suite.results) {
        suite.results.forEach(result => {
          rows.push([
            result.category || suiteName,
            result.testName,
            result.success ? 'PASS' : 'FAIL',
            result.message,
            result.timestamp
          ]);
        });
      }
    });
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}

// Export for use in test HTML files
if (typeof window !== 'undefined') {
  window.ComprehensiveValidationRunner = ComprehensiveValidationRunner;
}