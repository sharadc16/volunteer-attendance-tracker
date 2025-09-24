# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Gurukul Volunteer Attendance Tracker, especially related to Google Sheets synchronization.

## Quick Diagnostics

### Check System Status

1. **Sync Status Indicator**: Look at the sync status in the top-right corner
   - 🟢 **Online**: Everything working normally
   - 🟡 **Syncing**: Sync in progress
   - 🔴 **Offline**: Connection or authentication issues
   - ⚫ **Disabled**: Sync is turned off

2. **Browser Console**: Press F12 and check the Console tab for error messages

3. **Network Connection**: Ensure you have a stable internet connection

## Google Sheets Sync Issues

### Authentication Problems

#### "User not authenticated" Error

**Symptoms:**
- Sync status shows "Not Authenticated"
- Manual sync fails with authentication error

**Solutions:**
1. Go to Settings > Google Sheets Sync
2. Click "Authenticate" button
3. Complete the Google OAuth flow
4. If still failing, try:
   - Clear browser cache and cookies
   - Use incognito/private browsing mode
   - Check if popup blockers are preventing the auth window

#### "Invalid credentials" Error

**Symptoms:**
- Cannot authenticate with Google
- "Test Credentials" fails

**Solutions:**
1. Verify API Key format: Should start with `AIza` and be 39 characters long
2. Verify Client ID format: Should end with `.apps.googleusercontent.com`
3. Check Google Cloud Console:
   - Ensure Google Sheets API is enabled
   - Verify OAuth client is configured correctly
   - Check authorized JavaScript origins

#### "Token expired" Error

**Symptoms:**
- Was working before, now shows authentication errors
- Sync fails intermittently

**Solutions:**
1. The app should automatically refresh tokens
2. If automatic refresh fails:
   - Go to Settings and click "Sign Out"
   - Click "Authenticate" again
3. Check browser console for specific error messages

### Sync Operation Issues

#### "Cannot access spreadsheet" Error

**Symptoms:**
- Authentication successful but sync fails
- Error mentions spreadsheet access

**Solutions:**
1. **Auto-created spreadsheet**: Clear the Spreadsheet ID field in settings
2. **Custom spreadsheet**: 
   - Verify the spreadsheet ID is correct
   - Ensure you have edit permissions
   - Check the spreadsheet hasn't been deleted
3. Try creating a new spreadsheet by clearing the ID field

#### "Rate limit exceeded" Error

**Symptoms:**
- Sync works sometimes but fails with rate limit errors
- Console shows "429" errors

**Solutions:**
1. Increase sync interval in settings (try 2-5 minutes)
2. Reduce data volume by cleaning up old records
3. Wait 100 seconds and try again
4. Check Google Cloud Console for quota usage

#### Sync appears stuck or slow

**Symptoms:**
- Sync status shows "Syncing" for a long time
- Data doesn't appear in Google Sheets

**Solutions:**
1. Check network connection stability
2. Try manual sync with the sync button
3. Check browser console for errors
4. Restart the application (refresh page)
5. Verify Google Sheets service status

### Data Synchronization Issues

#### Data not appearing in Google Sheets

**Symptoms:**
- Sync completes successfully but no data in sheets
- Spreadsheet exists but is empty

**Solutions:**
1. Check if the spreadsheet has the correct sheet names:
   - "Volunteers"
   - "Events" 
   - "Attendance"
2. Verify you're looking at the correct spreadsheet
3. Check if data exists locally (should show in the app)
4. Try a manual sync
5. Check for data transformation errors in console

#### Duplicate data in Google Sheets

**Symptoms:**
- Same records appear multiple times
- Data keeps getting re-added

**Solutions:**
1. This usually indicates a sync timestamp issue
2. Go to Settings > Configuration Management > Reset to Defaults
3. Re-authenticate and sync again
4. If problem persists, clear the spreadsheet and do a fresh sync

#### Conflicting data changes

**Symptoms:**
- Changes made in Google Sheets are overwritten
- Local changes don't sync to sheets

**Solutions:**
1. The app uses "last modified wins" conflict resolution
2. Make changes in the app rather than directly in Google Sheets
3. If you must edit in Google Sheets, avoid editing during sync intervals
4. Check the sync logs for conflict resolution messages

## Application Issues

### Scanner Not Working

**Symptoms:**
- Scanner input doesn't respond
- Badge scans not registering

**Solutions:**
1. Check if scanner is enabled in Settings
2. Verify the scanner input has focus (click on it)
3. Test with manual ID entry
4. Check scanner prefix/suffix settings
5. Ensure current event is active

### Data Not Saving Locally

**Symptoms:**
- Added volunteers/events disappear after refresh
- Changes don't persist

**Solutions:**
1. Check browser storage permissions
2. Clear browser cache and reload
3. Check if running in private/incognito mode (may limit storage)
4. Verify sufficient disk space
5. Try a different browser

### Performance Issues

**Symptoms:**
- App loads slowly
- Sync takes a long time
- Browser becomes unresponsive

**Solutions:**
1. **Large datasets**: 
   - Export old data and clear from app
   - Increase sync intervals
   - Use data cleanup utilities
2. **Browser issues**:
   - Close other tabs
   - Restart browser
   - Clear browser cache
   - Update browser to latest version
3. **Network issues**:
   - Check internet speed
   - Try different network connection

## Environment-Specific Issues

### Local Development

**Common Issues:**
- CORS errors when accessing Google APIs
- Localhost not in authorized origins

**Solutions:**
1. Add `http://localhost:8080` (or your port) to OAuth authorized origins
2. Use a local web server, not file:// protocol
3. Check browser security settings

### Production Deployment

**Common Issues:**
- Environment variables not loading
- HTTPS required for OAuth

**Solutions:**
1. Verify environment variables are set correctly
2. Ensure HTTPS is enabled for production
3. Update OAuth authorized origins with production domain
4. Check server logs for deployment issues

## Error Code Reference

### HTTP Status Codes

- **400 Bad Request**: Invalid API request format
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Spreadsheet or resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Google API service error

### Application Error Codes

- **AUTH_001**: Invalid API credentials
- **AUTH_002**: OAuth flow failed
- **AUTH_003**: Token refresh failed
- **SYNC_001**: Spreadsheet access denied
- **SYNC_002**: Data transformation error
- **SYNC_003**: Network timeout
- **DATA_001**: Local storage error
- **DATA_002**: Data validation failed

## Getting Detailed Logs

### Browser Console Logs

1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for error messages (red text)
4. Copy error messages for support

### Sync Operation Logs

1. Go to Settings
2. Look for sync statistics and last error
3. Check sync history if available
4. Note timestamps and error patterns

### Network Activity

1. In Developer Tools, go to Network tab
2. Perform the failing operation
3. Look for failed requests (red status codes)
4. Check request/response details

## When to Contact Support

Contact support if you experience:

1. **Persistent authentication failures** after trying all solutions
2. **Data corruption or loss** that cannot be recovered
3. **Consistent API errors** that don't match known issues
4. **Performance problems** that don't improve with optimization
5. **Security concerns** about data handling

### Information to Include

When contacting support, provide:

1. **Error messages** from browser console
2. **Steps to reproduce** the issue
3. **Browser and version** you're using
4. **Approximate time** when issue started
5. **Screenshots** of error messages
6. **Network conditions** (slow, fast, mobile, etc.)

## Prevention Tips

### Regular Maintenance

1. **Monitor sync status** regularly
2. **Update browser** to latest version
3. **Clear cache** periodically
4. **Export data** as backup
5. **Review error logs** weekly

### Best Practices

1. **Stable network**: Use reliable internet connection for sync
2. **Regular backups**: Export data regularly
3. **Credential security**: Rotate API keys periodically
4. **Data cleanup**: Remove old records to improve performance
5. **Testing**: Test changes in a development environment first

### Monitoring

1. **Sync frequency**: Adjust based on usage patterns
2. **Error patterns**: Watch for recurring issues
3. **Performance metrics**: Monitor sync times and success rates
4. **User feedback**: Address user-reported issues promptly

## Recovery Procedures

### Complete System Reset

If all else fails:

1. **Export all data** first (if possible)
2. Go to Settings > Configuration Management > Reset to Defaults
3. Go to Settings > Data Management > Clear All Data
4. Refresh the browser page
5. Reconfigure Google Sheets integration
6. Import data back if needed

### Data Recovery

If data is lost:

1. Check Google Sheets for backed up data
2. Look for exported data files
3. Check browser local storage backup
4. Contact support for recovery assistance

This troubleshooting guide should help resolve most common issues. For complex problems, don't hesitate to seek additional support.