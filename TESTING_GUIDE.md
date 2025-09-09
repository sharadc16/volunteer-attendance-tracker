# Volunteer Attendance Tracker - Testing Guide

This guide provides comprehensive testing instructions for the Volunteer Attendance Tracker application across different environments and features.

## 🌐 Environment URLs

### Local Development
- **URL**: `http://localhost:8080`
- **Setup**: `cd volunteer-attendance-tracker && python3 -m http.server 8080`
- **Features**: Latest code changes, full debugging, fastest iteration
- **Database**: `VolunteerAttendanceDB_Dev`
- **Visual Indicator**: Orange "DEV" badge

### Online Development (Separate Deployment)
- **URL**: `https://sharadc16.github.io/volunteer-attendance-tracker/dev/`
- **Setup**: Push changes to `dev` branch, GitHub Actions auto-deploys to `/dev/` path
- **Features**: Separate dev environment with latest dev branch code
- **Database**: `VolunteerAttendanceDB_Dev`
- **Visual Indicator**: Orange "DEV" badge + "[DEV]" in title
- **Deployment Time**: 2-3 minutes after push to dev branch

**Workflow**: Push to `dev` → Test at `/dev/` URL → Merge to `main` when ready

### Production
- **URL**: `https://sharadc16.github.io/volunteer-attendance-tracker/`
- **Setup**: Merge `dev` → `main` branch
- **Features**: Stable version for daily use
- **Database**: `VolunteerAttendanceDB`
- **Visual Indicator**: No badge (clean production interface)

## 🧪 Core Functionality Testing

### Scanner Input Testing
1. **Basic Scan Test**:
   - Type `V001` in scanner input
   - Press Enter or wait 3 seconds
   - **Expected**: "✓ John Doe checked in successfully"

2. **Multiple Volunteer Test**:
   - Test IDs: V001, V002, V003, V004, V005
   - **Expected**: Each shows different volunteer name
   - **Dashboard**: Updates with each scan

3. **Invalid ID Test**:
   - Type `INVALID` or `X999`
   - **Expected**: "✗ Volunteer not found" error

4. **Duplicate Scan Test**:
   - Scan same volunteer twice (e.g., V001)
   - **Expected**: "✗ Volunteer already checked in for this event"

### Dashboard Testing
1. **Real-time Updates**:
   - Scan volunteers and watch dashboard update
   - **Check**: Today's Scans count increases
   - **Check**: Recent Check-ins list updates
   - **Check**: Attendance Rate percentage updates

2. **Current Event Display**:
   - **Expected**: Shows current day and date (e.g., "Monday, Jan 8")
   - **Not**: "Sunday Service" (old format)

3. **Summary Statistics**:
   - **Total Checked In**: Should match number of scans
   - **Total Volunteers**: Should show 5 (dev) or 20 (prod)
   - **Attendance Rate**: Should calculate correctly

## 📊 Google Sheets Integration Testing

### Initial Setup Test
1. **Click "📊 Sync" button**
2. **If first time**: Should show credentials modal
3. **Enter credentials**:
   - API Key: `AIzaSyBJ6yBohxncBp9f_tevE1TY9lmWvD8rH00`
   - Client ID: `322543264011-o6f5egdc6n7htas0739kkfr7cj9vn1op.apps.googleusercontent.com`
   - Sheet ID: `1JHSyqJTC18D1d2IaawKyly8HjUxIF25h0w4rO8_4sEA`
4. **Expected**: Credentials saved, success message

### Authentication Test
1. **Click "📊 Sync" button** (after credentials are saved)
2. **Expected**: Google sign-in popup appears
3. **May show**: "Google hasn't verified this app" warning
4. **Click**: "Advanced" → "Go to [app] (unsafe)"
5. **Grant permissions** for Google Sheets access
6. **Expected**: Authentication successful

### Sync Functionality Test
1. **Manual Sync**:
   - Scan a few volunteers (V001, V002, V003)
   - Click "📊 Sync" button
   - **Expected**: "Data synced to Google Sheets successfully"
   - **Check Google Sheet**: New data should appear

2. **Automatic Sync**:
   - Scan a volunteer
   - **Expected**: Console shows "Auto-syncing to Google Sheets..."
   - **Check Google Sheet**: Data appears automatically

3. **Verify Google Sheet Structure**:
   - **Volunteers Sheet**: ID, Name, Committee, Status, Date Added
   - **Attendance Sheet**: ID, Volunteer ID, Name, Event ID, Event Name, Committee, Date/Time
   - **Events Sheet**: Event ID, Name, Date, Type, Status, Day of Week

### Connection Testing
1. **Basic API Test** (Console):
   ```javascript
   testGoogleSheetsBasic()
   ```
   **Expected**: Success message with sheet title

2. **Status Check** (Console):
   ```javascript
   window.GoogleSheetsService.getStatus()
   ```
   **Expected**: `{ isInitialized: true, hasCredentials: true, isAuthenticated: true }`

## 🔧 Settings Panel Testing

### Access Settings
1. **Click "Settings" button**
2. **Expected**: Modal opens with system information

### Google Sheets Status
- **Not Configured**: "❌ Not configured"
- **Configured**: "🔑 Configured (not authenticated)"
- **Connected**: "✅ Connected (Sheet: 1JHSyqJTC...)"

### Available Actions
- **📊 Sync Now**: Manual sync button
- **🔍 Test API Key**: Test basic connectivity
- **🔐 Test OAuth**: Test authenticated connection
- **🗑️ Clear Credentials**: Remove stored credentials
- **🔄 Reset Database**: Clear all local data

## 🗂️ Navigation Testing

### View Switching
1. **Click each navigation tab**:
   - Dashboard ✓
   - Volunteers ✓
   - Events ✓
   - Reports ✓

2. **Expected Behavior**:
   - Active tab highlighted
   - Correct view displayed
   - No JavaScript errors

### Responsive Design
1. **Resize browser window** to mobile size
2. **Expected**: Layout adapts properly
3. **Test on mobile device** if available
4. **Check**: Touch-friendly button sizes

## 🐛 Troubleshooting Tests

### Database Issues
1. **Reset Database** (Console):
   ```javascript
   resetAppDatabase()
   ```
   **Expected**: "Database deleted successfully"

2. **Clear App Data** (Console):
   ```javascript
   clearAppData()
   ```
   **Expected**: Data cleared and reloaded

### Browser Compatibility
1. **Test in different browsers**:
   - Chrome ✓
   - Firefox ✓
   - Safari ✓
   - Edge ✓

2. **Check browser console** for errors in each

### Network Issues
1. **Go offline** (disable internet)
2. **Scan volunteers**: Should work locally
3. **Go online**: Should auto-sync pending data

## 📋 Testing Checklist

### Pre-Testing Setup
- [ ] Local server running (`python3 -m http.server 8080`)
- [ ] Browser developer tools open (F12)
- [ ] Google Sheet accessible and shared properly
- [ ] Google Cloud Console OAuth configured

### Core Features
- [ ] Scanner input accepts volunteer IDs
- [ ] Dashboard updates in real-time
- [ ] Current event shows day/date format
- [ ] Navigation between views works
- [ ] Settings panel displays correctly

### Google Sheets Integration
- [ ] Credentials modal appears and accepts input
- [ ] Google authentication popup works
- [ ] Manual sync uploads data successfully
- [ ] Automatic sync works after scanning
- [ ] Google Sheet shows correct data structure
- [ ] Connection test functions work

### Error Handling
- [ ] Invalid volunteer IDs show error messages
- [ ] Duplicate scans are prevented
- [ ] Network errors are handled gracefully
- [ ] Authentication failures show helpful messages

### Performance
- [ ] App loads quickly (< 3 seconds)
- [ ] Scanner input is responsive
- [ ] Dashboard updates smoothly
- [ ] No memory leaks during extended use

## 🚨 Common Issues and Solutions

### "Volunteer not found" Error
- **Check**: Volunteer ID format (alphanumeric, 1-20 characters)
- **Try**: V001, V002, V003 (known test volunteers)
- **Solution**: Use valid volunteer IDs from sample data

### Google Sheets Authentication Fails
- **Check**: OAuth client ID has correct authorized origins
- **Add**: `http://localhost:8080` and `https://sharadc16.github.io`
- **Try**: Clear credentials and re-enter

### Scanner Input Not Responding
- **Check**: Browser console for JavaScript errors
- **Try**: Click in scanner input field to focus
- **Solution**: Refresh page if input is disabled

### Database Errors
- **Try**: `resetAppDatabase()` in console
- **Check**: Browser supports IndexedDB
- **Solution**: Use incognito mode for clean test

### Sync Fails
- **Check**: Internet connection
- **Verify**: Google Sheet is accessible
- **Try**: Manual sync first, then automatic

## 📊 Test Data

### Sample Volunteer IDs
- V001: John Doe (Events)
- V002: Jane Smith (Hospitality)
- V003: Bob Johnson (Setup)
- V004: Mary Williams (Hospitality)
- V005: David Brown (Events)

### Test Scenarios
1. **Single volunteer**: Scan V001
2. **Multiple volunteers**: Scan V001, V002, V003
3. **Different committees**: Mix Events, Hospitality, Setup volunteers
4. **Error cases**: Try INVALID, X999, empty input

## 🔄 Development Workflow Testing

### Local → Dev → Production
1. **Test locally**: `http://localhost:8080`
2. **Push to dev**: `git push origin dev`
3. **Test online dev**: `?env=dev` parameter
4. **Merge to main**: `git checkout main && git merge dev`
5. **Test production**: Main GitHub Pages URL

### Rollback Testing
1. **If issues found**: `git checkout dev`
2. **Fix problems**: Make corrections
3. **Test again**: Verify fixes work
4. **Re-deploy**: Push to dev, then merge to main

## 📝 Testing Log Template

```
Date: ___________
Tester: ___________
Environment: [ ] Local [ ] Dev [ ] Production
Browser: ___________

Core Features:
[ ] Scanner input works
[ ] Dashboard updates
[ ] Navigation works
[ ] Settings accessible

Google Sheets:
[ ] Authentication successful
[ ] Manual sync works
[ ] Automatic sync works
[ ] Data appears in sheet

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

## 🎯 Quick Test Commands

Copy and paste these into browser console for quick testing:

```javascript
// Test Google Sheets basic connection
testGoogleSheetsBasic()

// Check service status
window.GoogleSheetsService.getStatus()

// Check stored credentials
localStorage.getItem('googleSheetsCredentials')

// Reset database
resetAppDatabase()

// Clear all app data
clearAppData()
```

This testing guide should be referenced before any deployment and after any major changes to ensure the system works correctly across all environments.