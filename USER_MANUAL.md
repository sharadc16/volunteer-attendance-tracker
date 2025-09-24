# User Manual - Google Sheets Sync Features

This manual explains how to use the Google Sheets synchronization features in the Gurukul Volunteer Attendance Tracker.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Settings Configuration](#settings-configuration)
4. [Using Sync Features](#using-sync-features)
5. [Understanding Sync Status](#understanding-sync-status)
6. [Working with Google Sheets](#working-with-google-sheets)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Overview

The Google Sheets sync feature allows you to:
- **Automatically backup** your attendance data to Google Sheets
- **Access data from anywhere** using Google Sheets on any device
- **Share data** with team members and administrators
- **Create advanced reports** using Google Sheets features
- **Work offline** with automatic sync when connection is restored

### How It Works

The application continuously synchronizes three types of data:
1. **Volunteers**: Personal information and committee assignments
2. **Events**: Event details, dates, and times
3. **Attendance**: Check-in records linking volunteers to events

Data flows in both directions:
- **Upload**: Local changes are sent to Google Sheets
- **Download**: Changes made in Google Sheets are brought back to the app

## Getting Started

### Prerequisites

Before you can use Google Sheets sync, you need:
- A Google account
- Internet connection
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Initial Setup

1. **Open Settings**: Click the gear icon (⚙️) in the top-right corner
2. **Find Google Sheets Section**: Scroll to "Google Sheets Sync"
3. **Enable Sync**: Check "Enable Google Sheets synchronization"
4. **Configure Credentials**: Either use environment variables or enter manually
5. **Authenticate**: Click "Authenticate" and sign in with Google
6. **Save Settings**: Click "Save Settings"

The app will automatically create a spreadsheet called "Gurukul Attendance Tracker" in your Google Drive.

## Settings Configuration

### Basic Settings

#### Enable/Disable Sync
- **Toggle**: Use the checkbox to turn sync on or off
- **When Disabled**: Data stays local only
- **When Enabled**: Data syncs to Google Sheets

#### Sync Interval
- **Range**: 30 seconds to 10 minutes
- **Default**: 1 minute
- **Recommendation**: 
  - High activity: 30 seconds - 1 minute
  - Normal activity: 1-3 minutes
  - Low activity: 5-10 minutes

#### Spreadsheet ID (Optional)
- **Leave Blank**: App creates a new spreadsheet automatically
- **Enter ID**: Use an existing spreadsheet
- **Format**: Long string of letters and numbers from the Google Sheets URL

### Authentication

#### Environment Variables (Recommended)
If your system administrator has set up environment variables:
- Credentials are loaded automatically
- More secure than manual entry
- Shows "Using environment credentials"

#### Manual Entry
If environment variables aren't available:
- Enter your Google API Key
- Enter your Google Client ID
- Click "Test Credentials" to verify
- Shows "Using manual credentials"

#### Authentication Status
- **🟢 Authenticated**: Ready to sync
- **🔴 Not Authenticated**: Need to sign in
- **🟡 Expired**: Need to re-authenticate

### Advanced Settings

#### Credential Management
- **Test Credentials**: Verify API keys work
- **Clear Override**: Remove manually entered credentials
- **Sign Out**: Disconnect from Google account
- **Re-authenticate**: Sign in again

## Using Sync Features

### Automatic Sync

Once configured, sync happens automatically:
- **Periodic Sync**: Every sync interval (default: 1 minute)
- **Change Detection**: Only syncs modified data
- **Background Operation**: Doesn't interrupt your work
- **Status Updates**: Shows progress in sync indicator

### Manual Sync

Force immediate synchronization:
1. **Click Sync Button**: The refresh icon (🔄) in the header
2. **Wait for Completion**: Status shows "Syncing..." then "Online"
3. **Check Results**: Success message shows what was synced

### Offline Support

When internet is unavailable:
- **Continue Working**: App functions normally
- **Queue Changes**: Modifications are stored locally
- **Auto-Resume**: Sync resumes when connection returns
- **Status Indicator**: Shows "Offline" status

## Understanding Sync Status

### Status Indicator

Located in the top-right corner, shows current sync state:

#### 🟢 Online
- **Meaning**: Sync is working normally
- **Last Sync**: Hover to see last sync time
- **Action**: None needed

#### 🟡 Syncing
- **Meaning**: Sync operation in progress
- **Duration**: Usually 5-30 seconds
- **Action**: Wait for completion

#### 🔴 Offline
- **Meaning**: No internet or sync disabled
- **Causes**: Network issues, authentication problems
- **Action**: Check connection and settings

#### ⚫ Disabled
- **Meaning**: Sync is turned off
- **Action**: Enable in settings if desired

### Sync Progress

During sync operations, you may see:
- **Reading remote data**: Checking Google Sheets for changes
- **Uploading changes**: Sending local changes to Google Sheets
- **Downloading changes**: Getting changes from Google Sheets
- **Resolving conflicts**: Handling simultaneous edits

### Success Messages

After successful sync:
- **"Sync completed successfully!"**: Basic success
- **"Uploaded: X, Downloaded: Y"**: Shows data transfer counts
- **Warnings**: May appear for non-critical issues

## Working with Google Sheets

### Spreadsheet Structure

Your synced spreadsheet contains three sheets:

#### Volunteers Sheet
- **Columns**: ID, Name, Email, Committee, Created, Updated, Synced
- **Purpose**: Volunteer directory and contact information
- **Editing**: Can add/edit volunteers directly in sheets

#### Events Sheet
- **Columns**: ID, Name, Date, Start Time, End Time, Status, Description, Created, Updated, Synced
- **Purpose**: Event calendar and details
- **Editing**: Can create/modify events directly in sheets

#### Attendance Sheet
- **Columns**: ID, Volunteer ID, Event ID, Volunteer Name, Committee, Date, Time, Created, Updated, Synced
- **Purpose**: Attendance records and history
- **Editing**: Generally managed by the app, but can be edited if needed

### Making Changes in Google Sheets

You can edit data directly in Google Sheets:

#### Safe Edits
- **Add new volunteers**: Add rows to Volunteers sheet
- **Update volunteer info**: Modify name, email, committee
- **Add new events**: Add rows to Events sheet
- **Update event details**: Modify name, date, time, description

#### Cautions
- **Don't delete columns**: Keep all header columns intact
- **Maintain ID format**: Use consistent ID patterns (V001, E001, A001)
- **Date formats**: Use YYYY-MM-DD for dates, HH:MM for times
- **Avoid conflicts**: Don't edit during sync operations

#### What to Avoid
- **Deleting headers**: Will break sync
- **Changing sheet names**: Must be exactly "Volunteers", "Events", "Attendance"
- **Complex formulas**: May interfere with sync
- **Duplicate IDs**: Each ID must be unique

### Advanced Google Sheets Features

#### Reporting and Analytics
- **Pivot Tables**: Create attendance summaries by committee, date, etc.
- **Charts**: Visualize attendance trends over time
- **Conditional Formatting**: Highlight patterns in data
- **Filters**: Focus on specific time periods or volunteers

#### Sharing and Collaboration
- **Share Spreadsheet**: Give access to team members
- **Comments**: Add notes to specific cells
- **Version History**: See changes over time
- **Real-time Collaboration**: Multiple people can view simultaneously

#### Data Validation
- **Dropdown Lists**: Create consistent committee names
- **Date Validation**: Ensure proper date formats
- **Required Fields**: Mark essential fields
- **Custom Rules**: Implement business logic

## Troubleshooting

### Common Issues

#### Sync Not Working
1. Check internet connection
2. Verify sync is enabled in settings
3. Confirm authentication status
4. Try manual sync
5. Check browser console for errors

#### Authentication Problems
1. Clear browser cache and cookies
2. Try incognito/private browsing mode
3. Verify API credentials are correct
4. Check Google Cloud Console settings
5. Re-authenticate with Google

#### Data Not Appearing
1. Wait for sync to complete
2. Check correct spreadsheet is being used
3. Verify sheet names are correct
4. Look for error messages
5. Try refreshing the page

#### Conflicts and Duplicates
1. Avoid editing during sync operations
2. Use the app for primary data entry
3. Let conflict resolution handle duplicates
4. Check sync logs for resolution details

### Getting Help

If problems persist:
1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Look at browser console errors (F12 > Console)
3. Note exact error messages
4. Try with sample data
5. Contact support with details

## Best Practices

### Data Management

#### Regular Backups
- **Export Data**: Use "Export All Data" monthly
- **Configuration Backup**: Export settings before changes
- **Google Sheets**: Acts as automatic backup
- **Version Control**: Keep track of major changes

#### Data Quality
- **Consistent Naming**: Use standard formats for names, committees
- **Regular Cleanup**: Remove old or duplicate records
- **Validation**: Check data accuracy periodically
- **Documentation**: Keep notes about data changes

### Sync Optimization

#### Performance
- **Appropriate Intervals**: Don't sync too frequently
- **Clean Data**: Remove unnecessary old records
- **Stable Network**: Use reliable internet connection
- **Monitor Usage**: Watch for rate limiting

#### Security
- **Secure Credentials**: Use environment variables when possible
- **Regular Rotation**: Update API keys periodically
- **Access Control**: Limit spreadsheet sharing
- **Monitor Activity**: Check for unauthorized changes

### Workflow Integration

#### Team Coordination
- **Primary Entry Point**: Designate app as main data entry method
- **Sheet Access**: Give read-only access when possible
- **Communication**: Notify team of major changes
- **Training**: Ensure team understands sync behavior

#### Event Management
- **Advance Planning**: Create events before they occur
- **Status Updates**: Mark events as Active/Inactive appropriately
- **Bulk Creation**: Use "Create Sunday Events" for recurring events
- **Cleanup**: Archive old events periodically

### Monitoring and Maintenance

#### Regular Checks
- **Sync Status**: Monitor daily for issues
- **Data Accuracy**: Spot-check records weekly
- **Performance**: Watch sync times and success rates
- **Error Logs**: Review any error messages

#### Preventive Maintenance
- **Browser Updates**: Keep browser current
- **Cache Clearing**: Clear cache monthly
- **Credential Rotation**: Update API keys quarterly
- **Backup Verification**: Test restore procedures

This user manual should help you make the most of the Google Sheets sync features. For technical issues, refer to the [Troubleshooting Guide](TROUBLESHOOTING.md) or contact support.