# 🔐 Credential Setup Guide

This guide explains how to securely store API keys and credentials for your Volunteer Attendance Tracker without having to enter them repeatedly.

## 🎯 Quick Start

1. **Open the app** in your browser
2. **Click the 🔐 Credentials button** (top-right corner)
3. **Create a master password** for your credential vault
4. **Add your API credentials** (Google Sheets API key, etc.)
5. **Done!** Your credentials are now stored securely and encrypted locally

## 🔒 Security Features

- **AES-256 encryption** - Your credentials are encrypted with military-grade security
- **Local storage only** - Credentials never leave your browser
- **Master password protection** - Only you can access your credentials
- **No server storage** - Everything stays on your device

## 📋 Required Credentials

### Google Sheets Integration
- **google_sheets_api_key** - Your Google Sheets API key
- **volunteer_spreadsheet_id** - The ID of your volunteer spreadsheet

### Optional Credentials
- **backup_spreadsheet_id** - Backup spreadsheet ID
- **notification_webhook** - Webhook URL for notifications
- **admin_email** - Admin email for alerts

## 🛠️ Setup Methods

### Method 1: Browser UI (Recommended)
1. Click **🔐 Credentials** button
2. Enter a strong master password
3. Add credentials one by one
4. Test connections

### Method 2: GitHub Secrets (for deployment)
1. Go to your repository **Settings > Secrets and variables > Actions**
2. Add these secrets:
   - `GOOGLE_SHEETS_API_KEY`
   - `VOLUNTEER_SPREADSHEET_ID`
3. Deploy - secrets will be automatically injected

### Method 3: Environment Variables (development)
```bash
# Create .env file (not committed to git)
echo "GOOGLE_SHEETS_API_KEY=your_api_key_here" > .env
echo "VOLUNTEER_SPREADSHEET_ID=your_spreadsheet_id" >> .env
```

## 🔧 Getting API Keys

### Google Sheets API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Create credentials > **API Key**
5. Restrict the key to Google Sheets API
6. Copy the API key

### Google Spreadsheet ID
1. Open your Google Sheet
2. Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. The ID is the long string between `/d/` and `/edit`

## 🚀 Usage Examples

### JavaScript API Calls
```javascript
// Get stored credential
const apiKey = await window.credentialManager.getCredential('google_sheets_api_key');

// Make API call with stored credentials
const result = await window.volunteerAPI.saveAttendance(attendanceData);

// Test connection
const test = await window.volunteerAPI.testGoogleSheetsConnection();
```

### Automatic Integration
The app automatically uses stored credentials for:
- Google Sheets sync
- Volunteer data loading
- Attendance saving
- Report generation

## 🔄 Backup & Restore

### Export Credentials (Encrypted)
1. Open Credential Manager
2. Click **Export (Encrypted)**
3. Save the `.json` file securely
4. File contains encrypted data - safe to store

### Import Credentials
1. Open Credential Manager
2. Click **Import**
3. Select your exported `.json` file
4. Enter your master password to decrypt

## 🛡️ Security Best Practices

### Master Password
- Use a **strong, unique password**
- Don't reuse passwords from other accounts
- Consider using a password manager
- Remember it - there's no recovery option

### API Keys
- **Restrict API keys** to only necessary services
- **Rotate keys regularly** (every 90 days)
- **Monitor usage** in Google Cloud Console
- **Revoke unused keys** immediately

### Browser Security
- Keep your browser **updated**
- Use **HTTPS only** (GitHub Pages uses HTTPS)
- Clear credentials if using **shared computers**
- **Lock your device** when away

## 🚨 Troubleshooting

### "Failed to unlock credentials"
- Check your master password
- Try creating a new vault
- Clear browser data if corrupted

### "Missing API credential"
- Open Credential Manager
- Add the missing credential
- Test the connection

### "API calls failing"
- Verify API key is correct
- Check API key restrictions
- Ensure spreadsheet is accessible
- Test with a simple API call

### "Credentials not persisting"
- Check if browser allows localStorage
- Disable private/incognito mode
- Clear browser cache and retry

## 📞 Support

If you need help:
1. Check the **🔧 Troubleshooting** section in Settings
2. Open browser console (F12) for error messages
3. Test with the built-in diagnostic tools
4. Verify your API keys in Google Cloud Console

## 🔄 Migration from Manual Entry

If you were entering credentials manually:
1. **Set up the credential manager** (one time)
2. **Add your existing API keys**
3. **Remove manual prompts** from your code
4. **Test thoroughly** before deploying

Your credentials will now be automatically loaded without any prompts!