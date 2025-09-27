# Comprehensive Troubleshooting Guide

## 🔍 Quick Diagnostic Checklist

Before diving into specific issues, run through this 2-minute diagnostic:

- [ ] **Environment Check**: Correct environment badge showing (PROD/TEST/DEV)?
- [ ] **Connectivity Status**: All green indicators in system status dashboard?
- [ ] **Browser Console**: Any red error messages? (Press F12 → Console)
- [ ] **Internet Connection**: Can you access other websites normally?
- [ ] **Scanner Hardware**: Is scanner connected and powered on?
- [ ] **Event Selection**: Is the correct event selected in dashboard?
- [ ] **Validation Mode**: Is appropriate validation mode active?

---

## 🌐 Connectivity and Environment Issues

### Environment Detection Problems

#### Issue: Wrong Environment Detected
**Symptoms:**
- Environment badge shows wrong environment (DEV instead of PROD)
- System connects to wrong Google Sheets
- Features available that shouldn't be (debug tools in production)

**Causes:**
- URL confusion between environments
- Browser cache storing wrong environment
- Environment configuration corruption

**Solutions:**
1. **Verify URL**: Check you're using correct URL for intended environment
   - Production: https://attendance.gurukul.org
   - Testing: Contact admin for correct URL
   - Development: Contact admin for correct URL

2. **Clear Browser Data**:
   ```
   1. Press Ctrl+Shift+Delete (Chrome/Edge) or Ctrl+Shift+Del (Firefox)
   2. Select "All time" for time range
   3. Check "Cookies and other site data" and "Cached images and files"
   4. Click "Clear data"
   5. Reload page and reconfigure
   ```

3. **Force Environment Switch**:
   - Go to Settings → Environment Configuration
   - Select correct environment from dropdown
   - Type environment name to confirm switch
   - Wait for validation to complete

4. **Check Browser Bookmarks**: Ensure bookmarks point to correct URLs

#### Issue: Environment Switching Fails
**Symptoms:**
- Environment switch dialog appears but nothing happens
- Error messages during environment switch
- System remains in old environment after switch attempt

**Causes:**
- Network connectivity issues during switch
- Authentication problems with target environment
- Browser storage corruption

**Solutions:**
1. **Check Connectivity**: Ensure stable internet connection
2. **Re-authenticate**: Clear authentication and log in again
3. **Manual Reset**:
   ```
   1. Clear all browser data for the site
   2. Close all browser tabs for the application
   3. Restart browser completely
   4. Navigate to correct environment URL
   5. Reconfigure from scratch
   ```

### Connectivity Validation Failures

#### Issue: Local Storage Unavailable
**Symptoms:**
- Red X next to "Local Storage" in status dashboard
- "Storage unavailable" error messages
- Data not saving between page refreshes

**Causes:**
- Browser privacy settings blocking storage
- Storage quota exceeded
- Browser in private/incognito mode
- Storage corruption

**Solutions:**
1. **Check Browser Mode**: Ensure not in private/incognito mode
2. **Browser Settings**:
   - Chrome: Settings → Privacy and security → Site Settings → Cookies and site data
   - Firefox: Settings → Privacy & Security → Cookies and Site Data
   - Ensure site is allowed to store data

3. **Clear Storage**:
   ```
   1. Press F12 to open developer tools
   2. Go to Application tab (Chrome) or Storage tab (Firefox)
   3. Select "Local Storage" → your site
   4. Right-click and "Clear"
   5. Refresh page
   ```

4. **Check Available Space**: Ensure device has sufficient storage space
5. **Try Different Browser**: Test with different browser to isolate issue

#### Issue: Cloud Sync Connectivity Failed
**Symptoms:**
- Red X next to "Cloud Sync" in status dashboard
- "Authentication failed" or "Network error" messages
- Data not syncing to Google Sheets

**Causes:**
- Internet connectivity problems
- Google Sheets API authentication expired
- API quota exceeded
- Google Sheets permissions changed

**Solutions:**
1. **Check Internet Connection**:
   - Test other websites
   - Check network stability
   - Try different network if available

2. **Re-authenticate with Google**:
   ```
   1. Go to Settings → Google Sheets Integration
   2. Click "Clear Authentication"
   3. Click "Authenticate with Google"
   4. Complete OAuth flow
   5. Test connection
   ```

3. **Verify API Credentials**:
   - Check API key is valid and not expired
   - Verify OAuth Client ID is correct
   - Ensure APIs are enabled in Google Cloud Console

4. **Check Google Sheets Permissions**:
   - Open Google Sheets directly
   - Verify you have edit access to the spreadsheet
   - Check sharing settings

5. **API Quota Check**:
   - Go to Google Cloud Console → APIs & Services → Quotas
   - Check Google Sheets API usage
   - Wait if quota exceeded, or request increase

#### Issue: Environment Validation Failed
**Symptoms:**
- Red X next to "Environment" in status dashboard
- "Environment mismatch" warnings
- Cannot access expected Google Sheets

**Causes:**
- Environment configuration corruption
- Wrong credentials for environment
- Google Sheets access permissions

**Solutions:**
1. **Verify Environment Configuration**:
   - Check deployment-config.json is correct
   - Verify environment-specific credentials
   - Confirm Google Sheets IDs are correct

2. **Reset Environment Configuration**:
   ```
   1. Go to Settings → Environment Configuration
   2. Click "Reset to Defaults"
   3. Reconfigure environment settings
   4. Test connectivity
   ```

3. **Check Google Sheets Access**:
   - Manually open expected Google Sheets
   - Verify you have appropriate permissions
   - Check sheet structure matches requirements

### Network and Performance Issues

#### Issue: Slow Connectivity Response
**Symptoms:**
- Yellow warning next to "Cloud Sync"
- Slow response times (>5 seconds)
- Timeouts during sync operations

**Causes:**
- Poor internet connection
- Google API server issues
- Large dataset synchronization
- Network congestion

**Solutions:**
1. **Check Network Quality**:
   - Test internet speed (speedtest.net)
   - Check for network congestion
   - Try different network if available

2. **Optimize Sync Settings**:
   - Increase sync interval in Settings
   - Reduce batch size for large datasets
   - Schedule syncs during off-peak hours

3. **Reduce Data Load**:
   - Archive old attendance data
   - Limit volunteer database size
   - Clean up unnecessary records

#### Issue: Intermittent Connectivity
**Symptoms:**
- Connectivity status fluctuating between green and red
- Sync sometimes works, sometimes fails
- Inconsistent performance

**Causes:**
- Unstable internet connection
- Network firewall interference
- Browser connection limits

**Solutions:**
1. **Network Stability**:
   - Check for network interference
   - Use wired connection if possible
   - Contact network administrator

2. **Browser Optimization**:
   - Close unnecessary tabs and applications
   - Restart browser periodically
   - Clear browser cache regularly

3. **Firewall Configuration**:
   - Check corporate firewall settings
   - Ensure Google APIs are not blocked
   - Contact IT support if needed

---

## 🔧 Scanner and Hardware Issues

### Scanner Hardware Problems

#### Issue: Scanner Not Detected
**Symptoms:**
- Scanner input field not responding
- No data appears when scanning
- Scanner lights/sounds work but no input

**Diagnostic Steps:**
1. **Check Physical Connection**:
   - Verify USB cable is securely connected
   - Try different USB port
   - Check cable for damage

2. **Test Scanner Functionality**:
   - Open text editor (Notepad, TextEdit)
   - Try scanning into text editor
   - If works in text editor, issue is with application focus

3. **Check Scanner Configuration**:
   - Ensure scanner is in "keyboard emulation" mode
   - Check scanner manual for configuration instructions
   - Some scanners require programming for proper mode

**Solutions:**
1. **Application Focus**:
   - Click directly on scanner input field
   - Ensure no other applications have focus
   - Try Alt+Tab to ensure browser is active window

2. **Scanner Programming**:
   - Consult scanner manual for programming barcodes
   - Set scanner to "USB HID Keyboard" mode
   - Disable any automatic prefix/suffix characters

3. **Driver Issues**:
   - Check if scanner requires specific drivers
   - Update USB drivers if needed
   - Try scanner on different computer to isolate issue

#### Issue: Scanner Adding Extra Characters
**Symptoms:**
- Scanned IDs have extra characters at beginning or end
- IDs don't match expected format
- Consistent character additions across all scans

**Causes:**
- Scanner configured with automatic prefix/suffix
- Scanner in wrong emulation mode
- Scanner programming includes extra characters

**Solutions:**
1. **Configure Scanner Settings**:
   ```
   1. Go to Settings → Scanner Configuration
   2. Set "Remove Prefix" and "Remove Suffix" options
   3. Test with known volunteer ID
   4. Adjust settings until clean ID appears
   ```

2. **Reprogram Scanner**:
   - Use scanner programming manual
   - Scan configuration barcodes to remove prefix/suffix
   - Set scanner to send only scanned data

3. **Scanner Software**:
   - Check if scanner manufacturer provides configuration software
   - Use software to configure scanner settings
   - Save configuration to scanner memory

### Input Processing Issues

#### Issue: Duplicate Scans Recorded
**Symptoms:**
- Same volunteer appears multiple times in recent activity
- Multiple attendance records for single scan
- Scanner seems to "double-trigger"

**Causes:**
- Scanner sending multiple signals per scan
- Application processing same input multiple times
- Scanner sensitivity too high

**Solutions:**
1. **Scanner Adjustment**:
   - Adjust scanner sensitivity if possible
   - Check scanner manual for debounce settings
   - Try scanning more slowly and deliberately

2. **Application Settings**:
   - Check for duplicate detection settings
   - Ensure proper input debouncing
   - Clear scanner input field between scans

3. **Scanning Technique**:
   - Wait for feedback before scanning next volunteer
   - Use clear, single scan motions
   - Ensure badge is properly positioned

#### Issue: Scanner Input Lag
**Symptoms:**
- Delay between scan and system response
- Scanner input appears slowly or incompletely
- System seems to freeze during scanning

**Causes:**
- System performance issues
- Large volunteer database causing slow lookups
- Browser memory issues

**Solutions:**
1. **Performance Optimization**:
   - Close unnecessary browser tabs
   - Restart browser if memory usage high
   - Clear browser cache and cookies

2. **Database Optimization**:
   - Reduce volunteer database size if very large
   - Archive old attendance records
   - Optimize volunteer search indexing

3. **Hardware Considerations**:
   - Use dedicated device for scanning
   - Ensure sufficient RAM and CPU resources
   - Consider faster computer if consistently slow

---

## 📊 Data and Synchronization Issues

### Google Sheets Integration Problems

#### Issue: Data Not Syncing to Google Sheets
**Symptoms:**
- Local data exists but Google Sheets not updating
- "Sync failed" error messages
- Last sync time shows old timestamp

**Diagnostic Steps:**
1. **Check Sync Status**:
   - Look at sync indicator in navigation
   - Check last sync time in dashboard
   - Review any error messages

2. **Manual Sync Test**:
   - Click sync button (🔄) manually
   - Watch for error messages
   - Check if manual sync works

3. **Google Sheets Access**:
   - Open Google Sheets directly in browser
   - Verify you can edit the spreadsheet
   - Check if data appears when manually added

**Solutions:**
1. **Authentication Refresh**:
   ```
   1. Go to Settings → Google Sheets Integration
   2. Click "Re-authenticate"
   3. Complete Google OAuth flow
   4. Test sync functionality
   ```

2. **API Configuration**:
   - Verify API key is correct and active
   - Check OAuth Client ID configuration
   - Ensure Google Sheets API is enabled

3. **Permissions Check**:
   - Verify Google Sheets sharing permissions
   - Ensure service account has edit access
   - Check Google Drive permissions if using service account

#### Issue: Partial Data Sync
**Symptoms:**
- Some data syncs but not all
- Inconsistent sync results
- Missing records in Google Sheets

**Causes:**
- API rate limiting
- Large batch size causing timeouts
- Data validation errors in Google Sheets

**Solutions:**
1. **Batch Size Optimization**:
   - Reduce sync batch size in settings
   - Increase time between sync operations
   - Monitor API quota usage

2. **Data Validation**:
   - Check for invalid characters in volunteer names
   - Verify date formats are correct
   - Ensure all required fields are populated

3. **Incremental Sync**:
   - Use incremental sync instead of full sync
   - Sync only changed records
   - Monitor sync progress and errors

### Data Integrity Issues

#### Issue: Missing Attendance Records
**Symptoms:**
- Volunteers scanned but not appearing in reports
- Attendance count doesn't match expected numbers
- Records missing from Google Sheets

**Diagnostic Steps:**
1. **Check Local Storage**:
   - Go to Reports → Export Local Data
   - Verify records exist locally
   - Compare local count with expected count

2. **Sync History Review**:
   - Check sync logs for errors
   - Review last successful sync time
   - Look for partial sync failures

3. **Google Sheets Verification**:
   - Manually check Google Sheets for missing records
   - Verify sheet structure is correct
   - Check for data in wrong sheets or columns

**Solutions:**
1. **Force Full Sync**:
   ```
   1. Go to Settings → Google Sheets Integration
   2. Click "Force Full Sync"
   3. Wait for complete sync process
   4. Verify all data appears in Google Sheets
   ```

2. **Data Recovery**:
   - Export local data as backup
   - Manually add missing records to Google Sheets
   - Reconcile differences between local and cloud data

3. **Sync Configuration**:
   - Review sync settings and intervals
   - Ensure sync is enabled and configured correctly
   - Test sync with small dataset first

#### Issue: Duplicate Records in Google Sheets
**Symptoms:**
- Same volunteer appears multiple times
- Duplicate attendance entries
- Inflated attendance counts

**Causes:**
- Multiple sync operations creating duplicates
- ID conflicts or changes
- Sync process not detecting existing records

**Solutions:**
1. **Duplicate Detection**:
   - Use Google Sheets built-in duplicate detection
   - Sort by volunteer ID and timestamp
   - Manually remove obvious duplicates

2. **Sync Reset**:
   ```
   1. Export current data as backup
   2. Clear Google Sheets attendance data
   3. Perform fresh full sync from local data
   4. Verify no duplicates in result
   ```

3. **Prevention**:
   - Ensure unique ID constraints
   - Monitor sync operations for errors
   - Regular data quality checks

---

## 🔐 Validation and Security Issues

### Validation Mode Problems

#### Issue: Validation Mode Not Working
**Symptoms:**
- System behaves differently than expected validation mode
- Mode indicator shows one thing, behavior shows another
- Validation settings not saving

**Diagnostic Steps:**
1. **Verify Mode Setting**:
   - Check Settings → Scanner Configuration
   - Confirm correct mode is selected
   - Look for validation mode indicator on dashboard

2. **Test Mode Behavior**:
   - Try scanning known volunteer ID
   - Try scanning unknown/test ID
   - Compare behavior with expected mode behavior

3. **Check Browser Console**:
   - Press F12 → Console
   - Look for JavaScript errors
   - Check for validation engine errors

**Solutions:**
1. **Reset Validation Configuration**:
   ```
   1. Go to Settings → Scanner Configuration
   2. Select different mode, save
   3. Select intended mode, save again
   4. Refresh page and test
   ```

2. **Clear Application Data**:
   - Clear browser cache and local storage
   - Refresh page and reconfigure
   - Test validation mode functionality

3. **Browser Compatibility**:
   - Try different browser
   - Ensure JavaScript is enabled
   - Check for browser extensions interfering

#### Issue: Create Mode Registration Form Not Appearing
**Symptoms:**
- Unknown IDs show error instead of registration form
- Create mode behaving like strict mode
- No option to register new volunteers

**Causes:**
- JavaScript errors preventing form display
- Event not selected (required for registration)
- Validation engine not properly initialized

**Solutions:**
1. **Event Selection**:
   - Ensure an event is selected in dashboard
   - Create mode requires active event for registration
   - Select appropriate event if none selected

2. **JavaScript Debugging**:
   - Check browser console for errors
   - Look for validation engine initialization errors
   - Refresh page to reinitialize components

3. **Form Component Check**:
   - Test with simple unknown ID like "TEST123"
   - Try manual keyboard input instead of scanner
   - Check if form appears in different browser

### Authentication and Access Issues

#### Issue: Google Authentication Failing
**Symptoms:**
- "Authentication failed" errors
- Cannot connect to Google Sheets
- OAuth flow not completing

**Causes:**
- Expired authentication tokens
- Changed Google account passwords
- OAuth configuration issues

**Solutions:**
1. **Re-authenticate**:
   ```
   1. Go to Settings → Google Sheets Integration
   2. Click "Clear Authentication"
   3. Click "Authenticate with Google"
   4. Complete OAuth flow in popup window
   5. Test connection
   ```

2. **Check OAuth Configuration**:
   - Verify OAuth Client ID is correct
   - Check authorized domains in Google Cloud Console
   - Ensure redirect URIs are properly configured

3. **Account Issues**:
   - Try different Google account
   - Check if account has necessary permissions
   - Verify account is not suspended or restricted

#### Issue: Insufficient Permissions
**Symptoms:**
- "Permission denied" errors
- Cannot edit Google Sheets
- Read-only access when edit needed

**Causes:**
- Google Sheets sharing permissions
- Service account permissions
- Changed ownership of spreadsheet

**Solutions:**
1. **Check Sheet Permissions**:
   - Open Google Sheets directly
   - Check sharing settings
   - Ensure your account has edit permissions

2. **Re-share Spreadsheet**:
   - Have spreadsheet owner re-share with your account
   - Ensure "Editor" permissions are granted
   - Test access by manually editing sheet

3. **Service Account Setup**:
   - If using service account, check service account permissions
   - Ensure service account email is shared on spreadsheet
   - Verify service account key is valid

---

## 🚨 Emergency Procedures

### Complete System Failure

#### When System Won't Start
**Immediate Actions:**
1. **Switch to Manual Process**:
   - Use paper attendance sheets
   - Document failure time and circumstances
   - Continue event without interruption

2. **Quick Diagnostics**:
   - Try different browser
   - Try different device
   - Check if other users experiencing same issue

3. **Communication**:
   - Notify system administrator immediately
   - Inform event staff of backup procedures
   - Document all troubleshooting attempts

#### When Scanning Stops Working Mid-Event
**Immediate Actions:**
1. **Quick Fixes**:
   - Refresh browser page
   - Check scanner connection
   - Try manual keyboard input

2. **Mode Switching**:
   - Switch to No Validation mode temporarily
   - Continue scanning with reduced validation
   - Document mode change and reason

3. **Backup Procedures**:
   - Implement manual attendance tracking
   - Assign staff to manual process
   - Continue event operations

### Data Recovery Procedures

#### When Data Appears Lost
**Assessment Steps:**
1. **Check Local Storage**:
   - Go to Reports → Export Local Data
   - Verify what data exists locally
   - Export immediately as backup

2. **Check Google Sheets**:
   - Open Google Sheets directly
   - Check for recent data
   - Look in revision history for lost data

3. **Check Browser History**:
   - Look for cached data in browser
   - Check if data exists in different browser tabs
   - Review browser crash recovery options

**Recovery Actions:**
1. **Local Data Recovery**:
   - Export all available local data
   - Save multiple copies in different formats
   - Document what data is available

2. **Cloud Data Recovery**:
   - Check Google Sheets revision history
   - Look for automatic backups
   - Contact Google support if needed

3. **Manual Reconstruction**:
   - Use paper backup records if available
   - Reconstruct from staff memory and notes
   - Cross-reference with other data sources

### Communication During Emergencies

#### Internal Communication
1. **Immediate Notification**:
   - System Administrator: [Contact Info]
   - Event Coordinator: [Contact Info]
   - Technical Support: [Contact Info]

2. **Status Updates**:
   - Regular updates every 15 minutes during crisis
   - Clear communication of workarounds
   - Documentation of all actions taken

#### User Communication
1. **Staff Notification**:
   - Clear instructions for backup procedures
   - Regular updates on resolution progress
   - Training on manual processes if needed

2. **Volunteer Communication**:
   - Minimal disruption to volunteer experience
   - Clear instructions if manual process needed
   - Apology and explanation if significant delays

---

## 🔍 Advanced Diagnostics

### Browser Developer Tools

#### Using Browser Console
1. **Open Developer Tools**: Press F12
2. **Console Tab**: Look for red error messages
3. **Common Error Types**:
   - JavaScript errors: Code problems
   - Network errors: Connectivity issues
   - Storage errors: Local storage problems

#### Network Tab Analysis
1. **Monitor Requests**: Watch API calls to Google Sheets
2. **Check Response Codes**:
   - 200: Success
   - 401: Authentication error
   - 403: Permission denied
   - 429: Rate limit exceeded
   - 500: Server error

3. **Response Times**: Look for slow or failed requests

#### Application Tab (Chrome)
1. **Local Storage**: Check stored data
2. **Session Storage**: Check temporary data
3. **Cookies**: Verify authentication cookies
4. **Service Workers**: Check for caching issues

### System Performance Analysis

#### Performance Monitoring
1. **Response Times**: Monitor scan processing speed
2. **Memory Usage**: Check browser memory consumption
3. **CPU Usage**: Monitor system resource usage
4. **Network Usage**: Check bandwidth consumption

#### Bottleneck Identification
1. **Slow Scans**: Usually database lookup or validation issues
2. **Sync Delays**: Network or API rate limiting
3. **UI Lag**: Browser performance or memory issues
4. **Data Issues**: Usually storage or sync problems

### Log Analysis

#### Browser Console Logs
- Look for patterns in error messages
- Check timestamps for error correlation
- Monitor for recurring issues

#### Sync Operation Logs
- Check sync success/failure patterns
- Monitor API response times
- Look for data consistency issues

#### Audit Trail Review
- Check validation mode changes
- Review user actions before issues
- Look for configuration changes

---

## 📚 Reference Information

### Error Code Reference

| Error Code | Description | Common Causes | Solutions |
|------------|-------------|---------------|-----------|
| **CONN_001** | Local storage unavailable | Browser settings, private mode | Check browser settings, exit private mode |
| **CONN_002** | Google Sheets authentication failed | Expired tokens, wrong credentials | Re-authenticate with Google |
| **CONN_003** | Network connectivity error | Internet issues, firewall | Check network, contact IT |
| **VAL_001** | Validation mode error | Configuration corruption | Reset validation settings |
| **VAL_002** | Volunteer not found | Missing from database | Check registration, switch modes |
| **SYNC_001** | Sync operation failed | API limits, permissions | Check quotas, verify permissions |
| **SYNC_002** | Partial sync completed | Large dataset, timeouts | Reduce batch size, retry |
| **ENV_001** | Environment mismatch | Wrong URL, configuration | Verify environment, switch if needed |

### Browser Compatibility Matrix

| Browser | Version | Compatibility | Notes |
|---------|---------|---------------|-------|
| **Chrome** | 90+ | ✅ Full | Recommended browser |
| **Firefox** | 88+ | ✅ Good | Some advanced features limited |
| **Safari** | 14+ | ✅ Good | macOS and iOS support |
| **Edge** | 90+ | ✅ Full | Similar to Chrome |
| **Mobile Chrome** | Latest | ✅ Good | Android and iOS |
| **Mobile Safari** | Latest | ✅ Good | iOS devices |

### System Requirements

#### Minimum Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **RAM**: 4GB system RAM, 1GB available
- **Storage**: 100MB available browser storage
- **Network**: Stable internet connection for sync
- **Display**: 1024x768 minimum resolution

#### Recommended Requirements
- **Browser**: Latest Chrome for best performance
- **RAM**: 8GB system RAM, 2GB available
- **Storage**: 1GB available browser storage
- **Network**: High-speed internet, wired connection preferred
- **Display**: 1920x1080 or higher resolution
- **Device**: Dedicated device for scanning operations

### Contact Information

#### Support Levels

**Level 1 - Self Service**
- User Manual and documentation
- In-application help system
- Troubleshooting guides
- FAQ and knowledge base

**Level 2 - User Support**
- Email: [support-email]
- Phone: [support-phone]
- Hours: [support-hours]
- Response: Within 4 hours

**Level 3 - Technical Support**
- Email: [tech-support-email]
- Phone: [tech-support-phone]
- Hours: [tech-hours]
- Response: Within 2 hours

**Level 4 - Emergency Support**
- Phone: [emergency-phone]
- Available: 24/7 during events
- Response: Within 30 minutes

#### Escalation Procedures
1. **Start with Self-Service**: Check documentation first
2. **User Support**: For general questions and basic issues
3. **Technical Support**: For system errors and complex issues
4. **Emergency Support**: For critical failures during events

---

*Last Updated: January 2024 | Version 1.0*  
*Next Review: July 2024*