#!/usr/bin/env node

/**
 * Utility Cleanup Script
 * Removes redundant debug and fix files while preserving essential utilities
 */

const fs = require('fs');
const path = require('path');

// Files to keep (essential utilities)
const KEEP_FILES = [
    // Core application
    'index.html',
    'settings.html',
    'js/app.js',
    'js/scanner.js',
    'js/storage.js',
    'js/google-sheets.js',
    'js/sync-manager.js',
    'js/utils.js',
    'js/environment-manager.js',
    'js/connectivity-validator.js',
    'css/styles.css',
    
    // Essential utilities
    'manual-scanner-fix.html',
    'force-enable-scanner.html',
    'create-sunday-events-interface.html',
    'test-event-management.html',
    'test-sync-system.html',
    'test-connectivity-validation.html',
    'test-environment-management.html',
    'utility-manager.html',
    
    // Essential scripts
    'fix-event-date-mismatch.js',
    'create-sunday-events-2025-2026.js',
    'comprehensive-fix.js',
    'fix-current-event-display.js',
    'cleanup-utilities.js',
    
    // Documentation
    'PROJECT_REQUIREMENTS.md',
    'GOOGLE_SHEETS_SETUP.md',
    'DEPLOYMENT_WORKFLOW.md',
    'TESTING_GUIDE.md',
    'UTILITY_SCRIPTS_REGISTRY.md',
    'FIXES_SUMMARY.md',
    'CONNECTIVITY_VALIDATION_IMPLEMENTATION.md',
    '7DAY_SCANNING_WINDOW_IMPLEMENTATION.md',
    'SCANNING_RESTRICTIONS_IMPLEMENTATION.md',
    'VOLUNTEERS_LOADING_FIX.md',
    'VOLUNTEER_SYNC_OPTIMIZATION.md',
    'EVENT_SYNC_OPTIMIZATION.md',
    'EVENT_MANAGEMENT_GUIDE.md',
    'SYNC_SYSTEM.md',
    'SUNDAY_EVENTS_PLAN.md',
    'GITHUB_ACTIONS_SETUP.md',
    'setup.md',
    
    // GitHub workflows
    '.github/workflows/deploy-simple.yml'
];

// Files to remove (redundant utilities)
const REMOVE_FILES = [
    // Duplicate scanner debug tools
    'debug-scanner-status.html',
    'debug-scanner-console.js',
    'debug-scanner-initialization.html',
    'debug-scanner-comprehensive.html',
    'simple-scanner-debug.html',
    'trigger-scanner-debug.html',
    'test-scanner-init.html',
    'test-scanner-initialization-fix.html',
    'test-scanner-validation.html',
    'debug-hamburger.html',
    'test-hamburger-menu.html',
    'test-hamburger-fix.html',
    
    // Duplicate fix tools
    'permanent-scanner-fix.html',
    'permanent-scanner-fix-standalone.html',
    'fix-scanner-dev-mode.html',
    'immediate-fix.html',
    'one-click-fix.html',
    'smart-initialization-status.html',
    'fix-loading-event.html',
    'diagnose-current-event.html',
    'quick-fix-loading-event.html',
    'fix-scanner-connectivity.html',
    'force-enable-scanner-fix.js',
    
    // Duplicate event management
    'debug-event-dates.html',
    'debug-current-event.js',
    'test-sep8-event.html',
    'verify-sunday-events.html',
    'fix-saturday-events.html',
    'debug-current-event.html',
    'debug-events-display.html',
    'debug-events-display-fix.html',
    'debug-events-loading.html',
    'fix-events-loading.html',
    'fix-events-display-main.js',
    'fix-event-names.html',
    'test-current-event-simple.html',
    'test-sunday-events.html',
    'create-sunday-events.js',
    'test-event-validation.js',
    
    // Duplicate test files
    'test-complete-fix.html',
    'test-fixes.html',
    'test-production-safe-scanner.html',
    'test-7day-logic-simple.js',
    'test-7day-scanning-window.html',
    'clean-7day-test.html',
    'test-scanning-restrictions.html',
    'test-sync-in-scanner.html',
    'test-improved-sizing.html',
    'test-force-single-row.html',
    'test-single-row.html',
    'test-mobile-compact.html',
    'test-attendance-analytics.html',
    'test-volunteers-fix.html',
    'test-volunteer-sync-optimization.html',
    'test-event-sync-optimization.html',
    'test-automatic-volunteers-fix.html',
    'test-sheets-sync-fix.html',
    'test-google-api-loading.html',
    'test-gapi-loading-fix.html',
    'test-google-auth-fix.html',
    'test-token-storage.html',
    'test-syntax-fix.html',
    'test-reload-fix.html',
    'test-gapi-initialization-fix.html',
    'test-banner-fix.html',
    'test-navigation.html',
    'test-google-auth-persistence.html',
    
    // Duplicate sync and loading tools
    'debug-google-sheets-sync.html',
    'fix-volunteers-loading.js',
    'optimize-volunteer-sync.js',
    'disable-frequent-event-sync.js',
    'add-volunteers-fix-button.js',
    'disable-sync-for-testing.js',
    'fix-sync-issues.html',
    
    // Duplicate comprehensive fixes
    'minimal-working-app.html',
    'comprehensive-app-fix.js',
    'console-fix.js',
    'quick-syntax-fix.js',
    'force-banner-fix.html',
    
    // Duplicate Google Sheets tools
    'load-events-from-google-sheets.html',
    'quick-google-sheets-setup.html',
    'google-sheets-environment-setup.html',
    
    // Duplicate UI fixes
    'fix-events-ui-loading.html',
    'enable-google-sync-fix.html',
    'quick-events-fix.html',
    'event-manager.html',
    'test-user-display-fix.html',
    
    // Old documentation (outdated)
    'SCANNER_INITIALIZATION_FIX.md',
    'SCANNER_INITIALIZATION_FIX_SUMMARY.md',
    'SCANNER_DEV_MODE_FIX.md',
    'PRODUCTION_SAFE_SCANNER.md'
];

function cleanupUtilities() {
    console.log('🧹 Starting utility cleanup...\n');
    
    let removedCount = 0;
    let keptCount = 0;
    let notFoundCount = 0;
    
    // Remove redundant files
    console.log('❌ Removing redundant files:');
    REMOVE_FILES.forEach(file => {
        const filePath = path.join(__dirname, file);
        
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`   ❌ ${file}`);
                removedCount++;
            } catch (error) {
                console.log(`   ⚠️  Failed to remove ${file}: ${error.message}`);
            }
        } else {
            console.log(`   ℹ️  ${file} (not found)`);
            notFoundCount++;
        }
    });
    
    console.log('\n✅ Essential files kept:');
    KEEP_FILES.forEach(file => {
        const filePath = path.join(__dirname, file);
        
        if (fs.existsSync(filePath)) {
            console.log(`   ✅ ${file}`);
            keptCount++;
        } else {
            console.log(`   ⚠️  ${file} (missing)`);
        }
    });
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Files removed: ${removedCount}`);
    console.log(`   Files kept: ${keptCount}`);
    console.log(`   Files not found: ${notFoundCount}`);
    console.log(`   Total reduction: ${removedCount} files`);
    
    if (removedCount > 0) {
        console.log('\n✅ Cleanup completed successfully!');
        console.log('💡 Project is now more maintainable with fewer duplicate files.');
    } else {
        console.log('\n⚠️  No files were removed. They may have already been cleaned up.');
    }
}

function previewCleanup() {
    console.log('📋 Cleanup Preview:\n');
    
    console.log('❌ Files to be REMOVED:');
    REMOVE_FILES.forEach(file => {
        const filePath = path.join(__dirname, file);
        const exists = fs.existsSync(filePath) ? '✓' : '✗';
        console.log(`   [${exists}] ${file}`);
    });
    
    console.log('\n✅ Files to be KEPT:');
    KEEP_FILES.forEach(file => {
        const filePath = path.join(__dirname, file);
        const exists = fs.existsSync(filePath) ? '✓' : '✗';
        console.log(`   [${exists}] ${file}`);
    });
    
    const existingRemoveFiles = REMOVE_FILES.filter(file => 
        fs.existsSync(path.join(__dirname, file))
    ).length;
    
    const existingKeepFiles = KEEP_FILES.filter(file => 
        fs.existsSync(path.join(__dirname, file))
    ).length;
    
    console.log('\n📊 Preview Summary:');
    console.log(`   Files to remove: ${existingRemoveFiles}`);
    console.log(`   Files to keep: ${existingKeepFiles}`);
    console.log(`   Estimated reduction: ${existingRemoveFiles} files`);
}

function listAllFiles() {
    console.log('📁 All files in project:\n');
    
    const files = fs.readdirSync(__dirname)
        .filter(file => fs.statSync(path.join(__dirname, file)).isFile())
        .sort();
    
    files.forEach(file => {
        const isKeep = KEEP_FILES.includes(file);
        const isRemove = REMOVE_FILES.includes(file);
        
        if (isKeep) {
            console.log(`   ✅ ${file} (keep)`);
        } else if (isRemove) {
            console.log(`   ❌ ${file} (remove)`);
        } else {
            console.log(`   ❓ ${file} (unclassified)`);
        }
    });
}

// Command line interface
const command = process.argv[2];

switch (command) {
    case 'preview':
        previewCleanup();
        break;
    case 'cleanup':
        cleanupUtilities();
        break;
    case 'list':
        listAllFiles();
        break;
    default:
        console.log('🛠️  Utility Cleanup Script');
        console.log('');
        console.log('Usage:');
        console.log('  node cleanup-utilities.js preview  - Preview changes');
        console.log('  node cleanup-utilities.js cleanup  - Run cleanup');
        console.log('  node cleanup-utilities.js list     - List all files');
        console.log('');
        console.log('⚠️  Make sure to commit your changes before running cleanup!');
}