# 🛠️ Utilities Guide

This guide provides comprehensive documentation for all utilities, debug tools, and maintenance scripts in the Volunteer Attendance Tracker project.

## 📋 Quick Access

- **Settings Page**: `settings.html` - Main hub for all utilities and configuration
- **Utility Manager**: `utility-manager.html` - Legacy utility manager (use settings.html instead)
- **Cleanup Script**: `cleanup-utilities.js` - Remove redundant files

## 🎯 Core Utilities

### 1. Universal Scanner Fix (`manual-scanner-fix.html`)
**Purpose**: One-stop solution for all scanner and event detection issues

**Features**:
- Step-by-step diagnostic process
- Automatic issue detection
- Force enable scanner functionality
- Event validation and fixes
- QR code scanner troubleshooting

**When to use**:
- Scanner not working
- Events not being detected
- QR code scanning issues
- General scanner problems

### 2. Event Management (`create-sunday-events-interface.html`)
**Purpose**: Comprehensive event creation and management system

**Features**:
- Create Sunday events for 2025-2026
- Validate existing events
- Fix date mismatches
- Bulk event operations
- Event structure validation

**When to use**:
- Setting up new events
- Fixing event date issues
- Bulk event management
- Event validation

### 3. Sync System Testing (`test-sync-system.html`)
**Purpose**: Test and debug Google Sheets synchronization

**Features**:
- Test Google Sheets connectivity
- Validate sync operations
- Debug sync failures
- Monitor sync performance
- Authentication testing

**When to use**:
- Sync not working
- Google Sheets connection issues
- Authentication problems
- Performance issues

### 4. Emergency Scanner (`force-enable-scanner.html`)
**Purpose**: Force enable scanner when all else fails

**Features**:
- Emergency scanner override
- Bypass initialization checks
- Direct scanner activation
- Immediate testing capability

**When to use**:
- All other fixes have failed
- Need immediate scanner access
- Testing in emergency situations
- Bypassing initialization issues

### 5. Connectivity Validator (`test-connectivity-validation.html`)
**Purpose**: Validate Google API connectivity and authentication

**Features**:
- Google API connectivity testing
- Authentication status validation
- Network connectivity checks
- API rate limit monitoring

**When to use**:
- API connection issues
- Authentication failures
- Network problems
- Rate limiting issues

### 6. Environment Manager (`test-environment-management.html`)
**Purpose**: Manage development and production environment settings

**Features**:
- Switch between dev/prod modes
- Environment configuration
- Debug mode toggle
- Settings validation

**When to use**:
- Switching environments
- Debug mode configuration
- Environment-specific issues
- Settings validation

## 🔧 Essential Scripts

### 1. Event Fix Functions (`fix-event-date-mismatch.js`)
**Purpose**: Core functions for fixing event-related issues

**Functions**:
- `fixEventDateMismatch()` - Fix date mismatches
- `validateEvents()` - Validate event structure
- `debugCurrentEvent()` - Debug current event issues
- `analyzeEventDates()` - Analyze event date patterns

**Usage**:
```javascript
// Load in browser console
<script src="fix-event-date-mismatch.js"></script>

// Use functions
fixEventDateMismatch();
validateEvents();
```

### 2. Sunday Events Creator (`create-sunday-events-2025-2026.js`)
**Purpose**: Create Sunday events for the specified period

**Usage**:
```javascript
// Load in browser console or HTML page
<script src="create-sunday-events-2025-2026.js"></script>

// Events are automatically created when loaded
```

### 3. Comprehensive Fix (`comprehensive-fix.js`)
**Purpose**: All-in-one fix for common issues

**Features**:
- Scanner fixes
- Event fixes
- Sync fixes
- UI fixes

**Usage**:
```javascript
// Load in browser console
<script src="comprehensive-fix.js"></script>
```

## ⚙️ Settings & Configuration

### Settings Page (`settings.html`)
The main settings page provides:

1. **Utilities Tab**: Access to all debug and fix tools
2. **Configuration Tab**: App configuration settings
3. **Maintenance Tab**: Project cleanup and maintenance
4. **Documentation Tab**: Links to all documentation
5. **Diagnostics Tab**: System health checks and diagnostics

### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| Google Sheets ID | Your Google Sheets document ID | - |
| API Key | Google Sheets API key | - |
| Scanning Window | Days to scan ahead for events | 7 days |
| Sync Interval | How often to sync with Google Sheets | 15 minutes |
| Debug Mode | Enable detailed logging | Disabled |

## 🧹 Project Maintenance

### Cleanup Script (`cleanup-utilities.js`)
**Purpose**: Remove redundant debug and fix files

**Usage**:
```bash
# Preview changes
node cleanup-utilities.js preview

# Run cleanup
node cleanup-utilities.js cleanup

# List all files
node cleanup-utilities.js list
```

**What it removes**:
- 45+ duplicate debug tools
- Redundant fix utilities
- Old documentation files
- Duplicate test files

**What it keeps**:
- Core application files
- Essential utilities
- Current documentation
- Active test files

### File Reduction
- **Before**: ~80 files
- **After**: ~35 files
- **Reduction**: 56% fewer files

## 🔍 Troubleshooting Guide

### Common Issues

#### Scanner Not Working
1. Open `manual-scanner-fix.html`
2. Follow step-by-step diagnostic
3. If still failing, use `force-enable-scanner.html`

#### Events Not Loading
1. Check `test-event-management.html`
2. Run event validation
3. Use `fix-event-date-mismatch.js` functions

#### Sync Issues
1. Test with `test-sync-system.html`
2. Check connectivity with `test-connectivity-validation.html`
3. Verify authentication status

#### General Issues
1. Run diagnostics from settings page
2. Check console for errors
3. Use comprehensive fix script

### Debug Mode
Enable debug mode in settings for:
- Detailed console logging
- Step-by-step operation tracking
- Error details and stack traces
- Performance monitoring

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PROJECT_REQUIREMENTS.md` | Project requirements and specifications |
| `GOOGLE_SHEETS_SETUP.md` | Google Sheets integration setup |
| `DEPLOYMENT_WORKFLOW.md` | Deployment instructions |
| `TESTING_GUIDE.md` | Testing procedures |
| `UTILITY_SCRIPTS_REGISTRY.md` | Complete utility catalog |
| `FIXES_SUMMARY.md` | Summary of all fixes |
| `UTILITIES_GUIDE.md` | This guide |

## 🚀 Best Practices

### Development Workflow
1. Use settings page for all utility access
2. Run diagnostics before making changes
3. Test fixes in development mode
4. Document any new utilities
5. Clean up redundant files regularly

### Maintenance
1. Review utility registry monthly
2. Remove duplicate tools
3. Update documentation
4. Test all utilities after changes
5. Keep only essential files

### Troubleshooting
1. Start with settings page diagnostics
2. Use specific utilities for specific issues
3. Check documentation first
4. Enable debug mode for complex issues
5. Document solutions for future reference

## 📞 Support

For issues not covered by utilities:
1. Check the troubleshooting guide
2. Review relevant documentation
3. Use diagnostic tools
4. Enable debug mode for detailed logs
5. Create new utility if needed (document in registry)

---

**Last Updated**: January 2025
**Version**: 2.0
**Maintainer**: Development Team