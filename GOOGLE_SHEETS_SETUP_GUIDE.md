# Google Sheets Integration Setup Guide

## Overview

This guide walks you through setting up Google Sheets synchronization for the Volunteer Attendance Tracker. The integration allows you to sync your volunteer, event, and attendance data with Google Sheets for backup, reporting, and collaboration purposes.

## Prerequisites

Before setting up Google Sheets integration, ensure you have:

1. A Google account with access to Google Sheets
2. The Volunteer Attendance Tracker application running
3. Administrative access to configure API credentials (if deploying for others)

## Setup Methods

There are two ways to configure Google Sheets integration:

### Method 1: Environment Variables (Recommended for Deployment)

For production deployments or when setting up for multiple users, configure environment variables:

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Sheets API

2. **Create API Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key for later use
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Configure the OAuth consent screen if prompted
   - Set application type to "Web application"
   - Add your domain to authorized origins (e.g., `https://yourdomain.com`)
   - Copy the Client ID for later use

3. **Set Environment Variables**
   ```bash
   export GOOGLE_SHEETS_API_KEY="your_api_key_here"
   export GOOGLE_SHEETS_CLIENT_ID="your_client_id_here"
   ```

   Or add to your deployment configuration:
   ```javascript
   // In your hosting platform (Netlify, Vercel, etc.)
   GOOGLE_SHEETS_API_KEY=your_api_key_here
   GOOGLE_SHEETS_CLIENT_ID=your_client_id_here
   ```

### Method 2: Settings Page Configuration (User-Friendly)

For individual users or when environment variables aren't available:

1. **Open Application Settings**
   - Launch the Volunteer Attendance Tracker
   - Click the hamburger menu (☰) in the top-left corner
   - Select "Settings" from the menu

2. **Navigate to Google Sheets Section**
   - Scroll down to the "Google Sheets Integration" section
   - You'll see options to configure API credentials

3. **Enter API Credentials**
   - Enter your Google Sheets API Key
   - Enter your Google OAuth2 Client ID
   - Click "Validate Credentials" to test the configuration

4. **Enable Sync**
   - Toggle "Enable Google Sheets Sync" to ON
   - Configure sync interval (default: 1 minute)
   - Click "Save Settings"

## First-Time Authentication

After configuring credentials, you'll need to authenticate with Google:

1. **Initiate Authentication**
   - The first time sync runs, you'll see a "Sign in with Google" prompt
   - Click the button to start the OAuth flow

2. **Grant Permissions**
   - A Google sign-in window will open
   - Sign in with your Google account
   - Review the permissions requested:
     - "See, edit, create, and delete your spreadsheets in Google Drive"
   - Click "Allow" to grant permissions

3. **Verify Connection**
   - After successful authentication, you'll see "Connected to Google Sheets"
   - The sync status indicator will show "Ready to sync"

## Spreadsheet Creation

The application will automatically create a Google Spreadsheet for your data:

1. **Automatic Creation**
   - On first sync, a new spreadsheet named "Gurukul Attendance Tracker" is created
   - The spreadsheet contains three sheets:
     - **Volunteers**: Volunteer information and contact details
     - **Events**: Event schedules and descriptions
     - **Attendance**: Attendance records with timestamps

2. **Manual Spreadsheet Configuration**
   - If automatic creation fails, you can manually specify a spreadsheet
   - Create a new Google Spreadsheet
   - Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
   - In Settings > Google Sheets, enter the Spreadsheet ID
   - The application will set up the required sheets automatically

## Verification Steps

To verify your setup is working correctly:

1. **Check Sync Status**
   - Look for the sync status indicator in the top-right corner
   - It should show "Synced" with a timestamp when working correctly

2. **Test Data Sync**
   - Add a new volunteer in the application
   - Wait for the next sync cycle (or trigger manual sync)
   - Check your Google Spreadsheet to see the new volunteer appear

3. **Test Bidirectional Sync**
   - Edit a volunteer's name directly in Google Sheets
   - Wait for sync or refresh the application
   - Verify the change appears in the application

## Configuration Options

### Sync Settings

- **Sync Interval**: How often to check for changes (30 seconds to 10 minutes)
- **Auto Sync**: Enable/disable automatic synchronization
- **Manual Sync**: Button to trigger immediate synchronization

### Advanced Settings

- **Batch Size**: Number of records to sync at once (default: 100)
- **Retry Attempts**: Number of times to retry failed operations (default: 3)
- **Conflict Resolution**: How to handle conflicts (Last Modified Wins, User Choice)

## Security Considerations

### Credential Security
- API keys and tokens are stored securely in browser storage
- Credentials are encrypted and never logged
- Tokens are automatically refreshed when expired

### Data Privacy
- Only authorized users can access your spreadsheets
- Data is transmitted over HTTPS
- No sensitive data is stored in application logs

### Access Control
- You control who has access to your Google Spreadsheet
- Revoke access anytime through Google Account settings
- Application respects Google Sheets sharing permissions

## Next Steps

After successful setup:

1. **Configure Sync Preferences**: Adjust sync interval and conflict resolution
2. **Set Up Sharing**: Share your Google Spreadsheet with team members if needed
3. **Create Backups**: Consider creating periodic backups of your spreadsheet
4. **Monitor Sync Status**: Regularly check sync status for any issues

## Troubleshooting

If you encounter issues during setup, refer to the [Troubleshooting Guide](TROUBLESHOOTING.md) for common problems and solutions.

## Support

For additional help:
- Check the [User Manual](USER_MANUAL.md) for detailed feature documentation
- Review [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues
- Contact your system administrator if using organizational deployment