/**
 * Integration test for scanner functionality
 * Run this in the browser console to test scanner features
 */

// Test scanner validation functionality
function testScannerValidation() {
    console.log('🧪 Testing Scanner Validation...');
    
    // Test cases for ID validation
    const testIds = [
        'V001',      // Valid with prefix
        '12345',     // Valid numeric
        'ABC123',    // Valid alphanumeric
        'USER-001',  // Valid with hyphen
        'USER_001',  // Valid with underscore
        '',          // Invalid - empty
        'ID@123',    // Invalid - special chars
        'A'.repeat(25) // Invalid - too long
    ];
    
    testIds.forEach(id => {
        const validation = Utils.Validation.validateVolunteerIdDetailed(id);
        console.log(`ID: "${id}" -> Valid: ${validation.isValid}${validation.error ? `, Error: ${validation.error}` : ''}`);
    });
}

// Test scanner input detection
function testScannerDetection() {
    console.log('🔍 Testing Scanner Input Detection...');
    
    const testCases = [
        { input: 'V001', duration: 50, description: 'Short manual input' },
        { input: 'VOLUNTEER123', duration: 100, description: 'Long fast input (scanner)' },
        { input: 'VERYLONGBARCODE123456', duration: 200, description: 'Very long input (definitely scanner)' }
    ];
    
    testCases.forEach(test => {
        const isScanner = Utils.Validation.isScannerInput(test.input, test.duration);
        console.log(`${test.description}: "${test.input}" (${test.duration}ms) -> ${isScanner ? 'Scanner' : 'Manual'}`);
    });
}

// Test scanner manager functionality (if available)
function testScannerManager() {
    console.log('📱 Testing Scanner Manager...');
    
    if (typeof window.ScannerManager !== 'undefined') {
        const stats = window.ScannerManager.getStats();
        console.log('Scanner Stats:', stats);
        
        // Test validation methods
        const testId = 'V001';
        const validation = window.ScannerManager.validateVolunteerIdFormat(testId);
        console.log(`Validation for "${testId}":`, validation);
        
        const sanitized = window.ScannerManager.sanitizeVolunteerId('  v001@#$  ');
        console.log('Sanitized "  v001@#$  " ->', sanitized);
        
        console.log('✅ Scanner Manager tests completed');
    } else {
        console.log('❌ Scanner Manager not available');
    }
}

// Test duplicate detection logic
function testDuplicateDetection() {
    console.log('🔄 Testing Duplicate Detection Logic...');
    
    // Test time formatting
    if (typeof window.ScannerManager !== 'undefined') {
        const testTimes = [1000, 60000, 3600000]; // 1 sec, 1 min, 1 hour
        testTimes.forEach(ms => {
            const formatted = window.ScannerManager.formatTimeDifference(ms);
            console.log(`${ms}ms -> "${formatted}"`);
        });
    }
}

// Test error categorization
function testErrorCategorization() {
    console.log('🚨 Testing Error Categorization...');
    
    if (typeof window.ScannerManager !== 'undefined') {
        const testErrors = [
            new Error('Volunteer not found'),
            new Error('Already checked in 5 minutes ago'),
            new Error('Invalid volunteer ID format'),
            new Error('Volunteer is not active'),
            new Error('No active event found'),
            new Error('System is still initializing')
        ];
        
        testErrors.forEach(error => {
            const category = window.ScannerManager.categorizeError(error);
            const userMessage = window.ScannerManager.getUserFriendlyErrorMessage(error, category);
            console.log(`Error: "${error.message}" -> Category: ${category} -> User Message: "${userMessage}"`);
        });
    }
}

// Run all tests
function runAllTests() {
    console.log('🚀 Starting Scanner Integration Tests...\n');
    
    testScannerValidation();
    console.log('');
    
    testScannerDetection();
    console.log('');
    
    testScannerManager();
    console.log('');
    
    testDuplicateDetection();
    console.log('');
    
    testErrorCategorization();
    console.log('');
    
    console.log('✅ All scanner integration tests completed!');
}

// Export for browser console use
if (typeof window !== 'undefined') {
    window.testScannerIntegration = {
        runAllTests,
        testScannerValidation,
        testScannerDetection,
        testScannerManager,
        testDuplicateDetection,
        testErrorCategorization
    };
    
    console.log('Scanner integration tests loaded. Run testScannerIntegration.runAllTests() to test all functionality.');
}