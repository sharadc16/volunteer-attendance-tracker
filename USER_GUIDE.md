# Volunteer Attendance Tracker - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Validation Modes](#validation-modes)
3. [Scanning Guide](#scanning-guide)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

## Getting Started

### Initial Setup
1. **Configure Validation Mode**: Go to Settings and choose the appropriate validation mode for your event
2. **Set up Google Sheets** (optional): Configure Google Sheets integration for real-time data sync
3. **Import Volunteers**: Add volunteer records through the Volunteers section
4. **Create Events**: Set up events for attendance tracking
5. **Test Scanning**: Verify scanner functionality before your event

### Dashboard Overview
- **Scanner Card**: Main scanning interface with validation mode indicator
- **Recent Activity**: Shows latest check-ins with validation status
- **Summary Stats**: Real-time attendance statistics

## Validation Modes

### 🔒 Strict Validation Mode (Recommended)

**When to Use:**
- Regular events with pre-registered volunteers
- Security-sensitive environments
- Events with limited capacity or restricted access
- Corporate or formal events

**How It Works:**
- Only accepts IDs that match existing volunteer records
- Unknown IDs are rejected with clear error messages
- Provides highest data accuracy and security

**Benefits:**
- ✅ Maximum data accuracy
- ✅ Prevents unauthorized access
- ✅ Clean, reliable attendance records
- ✅ Easy to audit and verify

**Considerations:**
- ⚠️ Requires complete volunteer pre-registration
- ⚠️ Cannot handle walk-in volunteers without manual intervention

### ➕ Create If Not Found Mode

**When to Use:**
- Community events expecting walk-in volunteers
- Building volunteer database over time
- Mixed events with both registered and new volunteers
- Open registration events

**How It Works:**
- Checks for existing volunteers first
- Shows quick registration form for unknown IDs
- Creates new volunteer records during scanning
- Tracks validation status for all entries

**Benefits:**
- ✅ Handles both registered and new volunteers
- ✅ Streamlined registration process
- ✅ Builds comprehensive volunteer database
- ✅ Maintains data integrity with status tracking

**Considerations:**
- ⚠️ Requires staff training for registration process
- ⚠️ Slightly slower scanning for new volunteers
- ⚠️ Need to verify new volunteer information accuracy

### ⚠️ No Validation Mode

**When to Use:**
- Emergency situations or system failures
- Temporary events with unknown participant lists
- Testing or demonstration purposes
- When volunteer database is unavailable

**How It Works:**
- Accepts any scanned ID without verification
- Creates temporary attendance records
- No validation or data checking performed

**Benefits:**
- ✅ Fastest scanning process
- ✅ No setup required
- ✅ Works with any ID format
- ✅ Useful for emergency situations

**Considerations:**
- ❌ No data validation or verification
- ❌ Potential for duplicate or invalid entries
- ❌ Requires manual cleanup afterward
- ❌ Limited reporting capabilities

## Scanning Guide

### Basic Scanning Process
1. **Select Event**: Ensure the correct event is selected in the dashboard
2. **Check Mode**: Verify the validation mode indicator shows your intended setting
3. **Focus Scanner**: Click on the scanner input field to ensure it's active
4. **Scan Badge**: Use badge scanner or manually enter volunteer ID
5. **Follow Prompts**: Complete any additional steps based on validation mode

### Understanding Validation Status

| Status | Description | When It Appears |
|--------|-------------|-----------------|
| **ID Found** | Volunteer was pre-registered and successfully identified | Strict Mode or Create Mode with existing volunteer |
| **ID Created** | New volunteer was registered during scanning | Create Mode with new volunteer |
| **No Validation** | ID was accepted without verification | No Validation Mode |

### Scanner Input Tips
- The input field automatically focuses after each scan
- Press Enter or scan to process the ID
- Use the clear button (✕) to reset the input
- Scanner works with keyboard input for manual entry
- Wait for feedback before scanning the next volunteer

### Handling Different Scenarios

#### In Strict Mode:
- ✅ **Known volunteer**: Attendance recorded immediately with "ID Found" status
- ❌ **Unknown volunteer**: Error message displayed, no attendance recorded

#### In Create Mode:
- ✅ **Known volunteer**: Attendance recorded immediately with "ID Found" status
- ➕ **Unknown volunteer**: Registration form appears
  - Fill in required fields (Name and Committee)
  - Click "Register & Check In" to complete
  - Attendance recorded with "ID Created" status

#### In No Validation Mode:
- ✅ **Any ID**: Attendance recorded immediately with "No Validation" status
- ⚠️ **No verification**: System accepts all input without checking

## Best Practices

### Event Planning Phase
- **Start with Strict Mode** for maximum data accuracy
- **Pre-register volunteers** whenever possible
- **Test scanning setup** before the event begins
- **Train staff** on validation mode procedures and troubleshooting

### During Events
- **Monitor validation indicators** regularly
- **Switch modes as needed** based on volunteer flow
- **Document mode changes** and reasons for audit purposes
- **Verify critical attendees** manually if needed

### Mode Selection Guidelines

| Event Type | Recommended Mode | Reason |
|------------|------------------|---------|
| Corporate Events | Strict | Pre-registered lists, security requirements |
| Community Events | Create | Mix of registered and walk-in volunteers |
| Emergency Situations | No Validation | Speed over accuracy, clean up later |
| Testing/Training | No Validation | No real data impact |

### Data Management
- **Enable Google Sheets sync** for real-time updates
- **Perform manual sync** before and after events
- **Monitor sync status** throughout the event
- **Export data regularly** for backup and analysis

### Quality Assurance
- **Review attendance by validation status** after events
- **Verify new volunteer information** for accuracy
- **Check audit logs** for unexpected changes
- **Update volunteer database** with corrected information

## Troubleshooting

### Common Validation Issues

#### ❌ "Volunteer not found" error in Strict Mode
**Cause**: The scanned ID doesn't match any registered volunteer

**Solutions**:
1. Verify the volunteer is registered in the system
2. Check if the ID was entered correctly
3. Switch to Create Mode to register the volunteer
4. Manually add the volunteer in the Volunteers section

#### ➕ Registration form not appearing in Create Mode
**Cause**: JavaScript error or validation engine not properly initialized

**Solutions**:
1. Refresh the page and try again
2. Check browser console for error messages
3. Verify validation mode is properly set in Settings
4. Clear browser cache and reload

#### ⚠️ Validation mode not changing
**Cause**: Settings not saving properly or browser storage issues

**Solutions**:
1. Check that settings are saved successfully
2. Refresh the page after changing modes
3. Clear browser local storage and reconfigure
4. Check browser console for storage errors

### Scanner Issues

#### Scanner input not responding
**Solutions**:
1. Click on the scanner input field to focus it
2. Check if an event is selected
3. Refresh the page if input remains unresponsive
4. Try using keyboard input instead of scanning

#### Duplicate scans being recorded
**Solutions**:
1. Wait for scan feedback before scanning again
2. Check Recent Activity to verify attendance
3. Use the clear button between scans
4. Ensure scanner is not double-triggering

### Data Issues

#### Attendance records missing validation status
**Cause**: Records created before validation status feature was implemented

**Solutions**:
- Existing records are automatically marked as "ID Found"
- New scans will include proper validation status
- Check the audit log for validation mode history

#### Google Sheets sync not including validation status
**Solutions**:
1. Perform a full sync to update sheet structure
2. Check that Google Sheets integration is properly configured
3. Verify authentication with Google Sheets
4. Check sync status in the dashboard

### Emergency Procedures

If scanning fails completely:
1. **Switch to No Validation mode** temporarily
2. **Record attendance manually** and sync later
3. **Document any issues** for later investigation
4. **Contact system administrator** if problems persist

### Diagnostic Tools

- **Audit Log**: View validation mode changes in Settings
- **Browser Console**: Check for JavaScript errors (F12 → Console)
- **Sync Status**: Monitor Google Sheets synchronization
- **Validation Indicators**: Current mode display on dashboard

## FAQ

### General Questions

**Q: Can I change validation modes during an event?**
A: Yes, you can change modes at any time through Settings. The change takes effect immediately and is logged for audit purposes.

**Q: What happens to existing attendance data when I change modes?**
A: Existing data is preserved. Only new scans will use the updated validation mode. All records include validation status for tracking.

**Q: How do I know which validation mode is currently active?**
A: Check the validation mode indicator on the dashboard scanner card. It shows the current mode with an icon and description.

### Validation Mode Questions

**Q: Which validation mode should I use for my event?**
A: 
- **Corporate/Formal events**: Strict Mode
- **Community events with walk-ins**: Create Mode  
- **Emergency situations**: No Validation (temporarily)

**Q: Can volunteers be scanned multiple times?**
A: The system allows multiple scans but tracks them separately. Check Recent Activity to see all scan records.

**Q: What information is required when creating new volunteers?**
A: In Create Mode, only Name and Committee are required. Email is optional but recommended for future communications.

### Technical Questions

**Q: Does the system work offline?**
A: Yes, the system stores data locally and syncs when internet connection is restored. Google Sheets sync requires internet connectivity.

**Q: How do I export attendance data?**
A: Use the Export button in the Reports section to download attendance data as CSV files. Data includes validation status for filtering.

**Q: Can I undo a scan if it was recorded incorrectly?**
A: Currently, scans cannot be undone through the interface. Contact your system administrator for data corrections.

**Q: How long is audit log data retained?**
A: Audit logs are stored locally in the browser. Export logs regularly for long-term retention and compliance.

### Troubleshooting Questions

**Q: The scanner isn't responding to badge scans. What should I do?**
A: 
1. Ensure the scanner input field is focused (click on it)
2. Verify an event is selected
3. Try manual keyboard input to test
4. Refresh the page if issues persist

**Q: I'm getting "sync failed" errors. How do I fix this?**
A: 
1. Check internet connectivity
2. Verify Google Sheets authentication in Settings
3. Try manual sync from the dashboard
4. Check browser console for detailed error messages

**Q: Validation mode changes aren't being saved. What's wrong?**
A: 
1. Ensure you click "Save Settings" after making changes
2. Check for browser storage errors in console
3. Try clearing browser cache and reconfiguring
4. Verify you have proper permissions to modify settings

---

For additional support or to report issues, contact your system administrator or refer to the in-app help documentation.