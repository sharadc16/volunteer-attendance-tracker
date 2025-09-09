/**
 * Validation script for attendance analytics implementation
 * Run this in the browser console to validate the implementation
 */

async function validateAttendanceAnalytics() {
    console.log('🔍 Validating Attendance Analytics Implementation...\n');
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Helper function to add test result
    function addTest(name, passed, message = '') {
        results.tests.push({ name, passed, message });
        if (passed) {
            results.passed++;
            console.log(`✅ ${name}: PASSED ${message ? `(${message})` : ''}`);
        } else {
            results.failed++;
            console.log(`❌ ${name}: FAILED ${message ? `- ${message}` : ''}`);
        }
    }

    try {
        // Wait for storage manager
        let attempts = 0;
        while (!window.StorageManager?.db && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.StorageManager?.db) {
            throw new Error('Storage manager not initialized');
        }

        // Test 1: Check if new analytics methods exist
        const requiredMethods = [
            'getVolunteerAttendanceScores',
            'getCommitteeAttendanceStats', 
            'getAttendanceTrends',
            'getAllVolunteerAttendanceSummaries'
        ];

        for (const method of requiredMethods) {
            const exists = typeof window.StorageManager[method] === 'function';
            addTest(`Method ${method} exists`, exists);
        }

        // Test 2: Test volunteer attendance scores functionality
        try {
            const scores = await window.StorageManager.getVolunteerAttendanceScores();
            addTest('Get volunteer attendance scores', Array.isArray(scores), `Returned ${scores.length} scores`);
            
            if (scores.length > 0) {
                const firstScore = scores[0];
                const hasRequiredProps = ['volunteerName', 'committee', 'attendanceRate', 'engagementScore', 'tier'].every(prop => prop in firstScore);
                addTest('Volunteer scores have required properties', hasRequiredProps);
                
                const validTier = ['Platinum', 'Gold', 'Silver', 'Bronze'].includes(firstScore.tier);
                addTest('Valid performance tier assigned', validTier, `Tier: ${firstScore.tier}`);
            }
        } catch (error) {
            addTest('Get volunteer attendance scores', false, error.message);
        }

        // Test 3: Test committee statistics
        try {
            const stats = await window.StorageManager.getCommitteeAttendanceStats();
            addTest('Get committee attendance stats', Array.isArray(stats), `Found ${stats.length} committees`);
            
            if (stats.length > 0) {
                const firstStat = stats[0];
                const hasRequiredProps = ['committee', 'totalVolunteers', 'avgAttendanceRate', 'totalAttendances'].every(prop => prop in firstStat);
                addTest('Committee stats have required properties', hasRequiredProps);
            }
        } catch (error) {
            addTest('Get committee attendance stats', false, error.message);
        }

        // Test 4: Test attendance trends
        try {
            const trends = await window.StorageManager.getAttendanceTrends();
            addTest('Get attendance trends', Array.isArray(trends), `Found ${trends.length} trend periods`);
            
            if (trends.length > 0) {
                const firstTrend = trends[0];
                const hasRequiredProps = ['period', 'totalAttendances', 'uniqueVolunteers', 'totalEvents'].every(prop => prop in firstTrend);
                addTest('Attendance trends have required properties', hasRequiredProps);
            }
        } catch (error) {
            addTest('Get attendance trends', false, error.message);
        }

        // Test 5: Test sorting functionality
        try {
            const sortOptions = ['attendanceRate', 'engagementScore', 'totalAttendances', 'name', 'committee'];
            for (const sortBy of sortOptions) {
                const sortedScores = await window.StorageManager.getVolunteerAttendanceScores(null, sortBy);
                addTest(`Sort by ${sortBy}`, Array.isArray(sortedScores), `Sorted ${sortedScores.length} records`);
            }
        } catch (error) {
            addTest('Sorting functionality', false, error.message);
        }

        // Test 6: Check if app.js has updated reporting methods
        const appMethods = [
            'updateReports',
            'generateComprehensiveReport',
            'generateCommitteeComparisonSection',
            'generateVolunteerScoresSection',
            'sortVolunteerScores',
            'exportDetailedReport'
        ];

        for (const method of appMethods) {
            const exists = window.app && typeof window.app[method] === 'function';
            addTest(`App method ${method} exists`, exists);
        }

        // Test 7: Check CSS classes for new reporting styles
        const requiredStyles = [
            'report-header',
            'metrics-overview',
            'committee-performance', 
            'volunteer-scores',
            'scores-table',
            'performance-tiers',
            'trends-section'
        ];

        const styleSheet = Array.from(document.styleSheets).find(sheet => {
            try {
                return sheet.href && sheet.href.includes('styles.css');
            } catch (e) {
                return false;
            }
        });

        if (styleSheet) {
            try {
                const rules = Array.from(styleSheet.cssRules || styleSheet.rules || []);
                for (const className of requiredStyles) {
                    const hasStyle = rules.some(rule => rule.selectorText && rule.selectorText.includes(className));
                    addTest(`CSS class .${className} exists`, hasStyle);
                }
            } catch (error) {
                addTest('CSS validation', false, 'Cannot access stylesheet rules');
            }
        } else {
            addTest('CSS validation', false, 'styles.css not found');
        }

    } catch (error) {
        console.error('Validation error:', error);
        addTest('Overall validation', false, error.message);
    }

    // Summary
    console.log('\n📊 VALIDATION SUMMARY:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Attendance analytics system is fully implemented.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the implementation.');
    }

    return results;
}

// Auto-run validation if in browser
if (typeof window !== 'undefined') {
    // Wait for page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(validateAttendanceAnalytics, 1000);
        });
    } else {
        setTimeout(validateAttendanceAnalytics, 1000);
    }
}

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateAttendanceAnalytics };
}