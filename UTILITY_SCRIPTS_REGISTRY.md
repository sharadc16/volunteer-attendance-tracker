# 🛠️ Utility Scripts Registry

This document catalogs all utility, debug, and fix scripts in the project to prevent duplication and improve maintainability.

## 📋 **Core Utilities (Keep)**

### **Main Application**
- `index.html` - Main application entry point
- `js/app.js` - Core application logic
- `js/scanner.js` - Scanner functionality
- `js/storage.js` - Data storage management
- `js/google-sheets.js` - Google Sheets integration
- `js/sync-manager.js` - Sync system
- `js/utils.js` - Utility functions
- `css/styles.css` - Application styles

### **Essential Fix Scripts**
- `fix-event-date-mismatch.js` - Event date mismatch fixes
- `manual-scanner-fix.html` - Step-by-step scanner fixes
- `force-enable-scanner.html` - Emergency scanner enable

### **Documentation**
- `PROJECT_REQUIREMENTS.md` - Project requirements
- `GOOGLE_SHEETS_SETUP.md` - Google Sheets setup guide
- `DEPLOYMENT_WORKFLOW.md` - Deployment instructions
- `TESTING_GUIDE.md` - Testing procedures

## 🗑️ **Redundant Files (Remove)**

### **Duplicate Scanner Debug Tools**
- `debug-scanner-status.html` ❌ (duplicate of manual-scanner-fix.html)
- `debug-scanner-console.js` ❌ (functionality in fix-event-date-mismatch.js)
- `debug-scanner-initialization.html` ❌ (duplicate functionality)
- `debug-scanner-initialization-detailed.html` ❌ (duplicate functionality)
- `debug-scanner-comprehensive.html` ❌ (duplicate functionality)
- `debug-scanner-loop.html` ❌ (duplicate functionality)
- `simple-scanner-debug.html` ❌ (duplicate functionality)
- `trigger-scanner-debug.html` ❌ (duplicate functionality)
- `test-scanner-init.html` ❌ (duplicate functionality)
- `test-scanner-initialization-fix.html` ❌ (duplicate functionality)
- `test-scanner-validation.html` ❌ (duplicate functionality)

### **Duplicate Fix Tools**
- `permanent-scanner-fix.html` ❌ (use manual-scanner-fix.html instead)
- `permanent-scanner-fix-standalone.html` ❌ (use manual-scanner-fix.html instead)
- `fix-scanner-dev-mode.html` ❌ (functionality in manual-scanner-fix.html)
- `immediate-fix.html` ❌ (functionality in manual-scanner-fix.html)
- `one-click-fix.html` ❌ (functionality in manual-scanner-fix.html)
- `smart-initialization-status.html` ❌ (functionality in manual-scanner-fix.html)
- `fix-loading-event.html` ❌ (just created, merge into manual-scanner-fix.html)
- `diagnose-current-event.html` ❌ (just created, merge into manual-scanner-fix.html)

### **Duplicate Event Management**
- `debug-event-dates.html` ❌ (functionality in fix-event-date-mismatch.js)
- `debug-current-event.js` ❌ (functionality in fix-event-date-mismatch.js)
- `test-sep8-event.html` ❌ (functionality in fix-event-date-mismatch.js)
- `verify-sunday-events.html` ❌ (functionality in create-sunday-events-interface.html)
- `fix-saturday-events.html` ❌ (functionality in create-sunday-events-interface.html)

### **Duplicate Test Files**
- `test-complete-fix.html` ❌ (use manual-scanner-fix.html)
- `test-fixes.html` ❌ (use manual-scanner-fix.html)
- `test-production-safe-scanner.html` ❌ (use manual-scanner-fix.html)

### **Old Documentation**
- `SCANNER_INITIALIZATION_FIX.md` ❌ (outdated)
- `SCANNER_INITIALIZATION_FIX_SUMMARY.md` ❌ (outdated)
- `SCANNER_DEV_MODE_FIX.md` ❌ (outdated)
- `PRODUCTION_SAFE_SCANNER.md` ❌ (outdated)
- `SYNC_ISSUES_FIXES.md` ❌ (merge into SYNC_SYSTEM.md)
- `SYNC_FIXES_SUMMARY.md` ❌ (merge into SYNC_SYSTEM.md)

## 🎯 **Consolidated Utilities (Keep & Enhance)**

### **1. Universal Fix Tool**
- **File**: `manual-scanner-fix.html`
- **Purpose**: One-stop solution for all scanner and event issues
- **Features**: Step-by-step fixes, diagnostics, force enable

### **2. Event Management**
- **File**: `create-sunday-events-interface.html`
- **Purpose**: Comprehensive event creation and management
- **Script**: `create-sunday-events-2025-2026.js`

### **3. Core Fix Logic**
- **File**: `fix-event-date-mismatch.js`
- **Purpose**: All event date mismatch fixes and analysis

### **4. Testing & Validation**
- **File**: `test-event-management.html`
- **Purpose**: Event system testing
- **File**: `test-sync-system.html`
- **Purpose**: Sync system testing

## 📊 **File Count Reduction**

- **Before**: ~80 files (including many duplicates)
- **After**: ~35 core files
- **Reduction**: ~45 files (56% reduction)

## 🚀 **Usage Guide**

### **For Scanner Issues**
```bash
open manual-scanner-fix.html
```

### **For Event Management**
```bash
open create-sunday-events-interface.html
```

### **For Testing**
```bash
open test-event-management.html
open test-sync-system.html
```

### **For Development**
```bash
# Load fix functions in console
<script src="fix-event-date-mismatch.js"></script>
```

## 🔧 **Maintenance Rules**

1. **Before creating new utility**: Check this registry first
2. **One purpose, one file**: Don't duplicate functionality
3. **Update registry**: When adding/removing utilities
4. **Consolidate**: Merge similar tools instead of creating new ones
5. **Document**: Every utility must have clear purpose and usage

## 📝 **Next Steps**

1. Remove all redundant files listed above
2. Enhance `manual-scanner-fix.html` with consolidated functionality
3. Update documentation to reference consolidated tools
4. Create cleanup script for future maintenance