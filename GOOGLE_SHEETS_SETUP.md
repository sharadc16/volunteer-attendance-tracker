# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for the Volunteer Attendance Tracker.

## Overview

The Google Sheets integration allows you to:
- ✅ Automatically backup attendance data to Google Sheets
- ✅ Share attendance data with coordinators and administrators
- ✅ Create reports and analytics using Google Sheets features
- ✅ Access data from anywhere with internet connection

## Prerequisites

- Google account
- Access to Google Cloud Console
- Basic understanding of Google Sheets

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter project name: `volunteer-attendance-tracker`
4. Click "Create"

## Step 2: Enable Google Sheets API

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on "Google Sheets API"
4. Click "Enable"

## Step 3: Create API Credentials

### Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key (starts with `AIza...`)
4. Click "Restrict Key" (recommended)
5. Under "API restrictions", select "Google Sheets API"
6. Click "Save"

### Create OAuth 2.0 Client ID
1. Still in "Credentials", click "Create Credentials" → "OAuth client ID"
2. If prompted, configure OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, Developer email)
   - Add your domain to "Authorized domains" (e.g., `github.io`)
   - Save and continue through all steps
3. Choose "Web application" as application type
4. Add authorized JavaScript origins:
   - `https://sharadc16.github.io`
   - `http://localhost:8080` (for local development)
5. Click "Create"
6. Copy the Client ID (ends with `.googleusercontent.com`)

## Step 4: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Blank" to create a new spreadsheet
3. Rename it to "Volunteer Attendance Tracker"
4. Copy the Sheet ID from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - Sheet ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## Step 5: Configure the Application

1. Open your Volunteer Attendance Tracker application
2. Click the "📊 Sync" button in the header
3. Enter your credentials when prompted:
   - **API Key**: The key you created (starts with `AIza...`)
   - **OAuth Client ID**: The client ID (ends with `.googleusercontent.com`)
   - **Google Sheet ID**: The ID from your spreadsheet URL
4. Click "Save & Connect"

## Step 6: Authenticate and Test

1. The app will prompt you to sign in to Google
2. Grant permissions to access your Google Sheets
3. The app will automatically create the required sheets:
   - **Volunteers**: Volunteer directory
   - **Attendance**: Attendance records
   - **Events**: Event information
   - **Settings**: Configuration data

## Usage

### Manual Sync
- Click the "📊 Sync" button anytime to manually sync data
- All local data will be uploaded to Google Sheets

### Automatic Sync
- When enabled, attendance records are automatically synced after each scan
- Sync happens in the background without interrupting usage

### Viewing Data
- Open your Google Sheet to view and analyze data
- Create charts, pivot tables, and reports using Google Sheets features
- Share the sheet with coordinators for collaborative access

## Troubleshooting

### Common Issues

**"Authentication failed"**
- Check that OAuth Client ID is correct
- Verify authorized domains include your app's domain
- Try clearing credentials and re-entering them

**"Spreadsheet not found"**
- Verify the Google Sheet ID is correct
- Ensure the sheet is accessible with your Google account
- Check that the sheet hasn't been deleted

**"API quota exceeded"**
- Google Sheets API has usage limits
- Wait a few minutes and try again
- Consider reducing sync frequency for high-volume usage

**"Permission denied"**
- Ensure you've granted all required permissions during OAuth flow
- Check that the Google account has access to the spreadsheet

### Getting Help

1. Check browser console for detailed error messages
2. Verify all credentials are entered correctly
3. Test with a simple Google Sheet first
4. Ensure your Google Cloud project has the Sheets API enabled

## Security Notes

- API keys and credentials are stored locally in your browser
- Never share your API credentials publicly
- Use OAuth 2.0 for secure authentication
- Consider restricting API key usage to specific domains
- Regularly review and rotate credentials as needed

## Advanced Configuration

### Custom Sheet Names
You can modify the sheet names in the code by editing `js/google-sheets.js`:

```javascript
this.sheets = {
    volunteers: 'Volunteers',
    attendance: 'Attendance', 
    events: 'Events',
    settings: 'Settings'
};
```

### Sync Frequency
Adjust auto-sync behavior in `js/config.js`:

```javascript
sync: {
    interval: 60000, // 60 seconds
    batchSize: 20,
    retryAttempts: 5
}
```

### Data Filtering
By default, only today's attendance is synced. To sync all attendance data, modify the `syncAllData` method in `js/google-sheets.js`.

## Support

For additional help:
- Check the main README.md for general setup instructions
- Review browser console for technical error details
- Consult Google Cloud Console documentation for API setup issues