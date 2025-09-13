# 🔐 Server-Side Credential Setup

This guide shows how to store API keys and OAuth client IDs on the server so users never have to enter them.

## 🎯 Choose Your Deployment Method

### Option 1: GitHub Pages + Build-time Injection (Simplest)

**Best for:** Simple setup, no additional services needed

1. **Add GitHub Secrets:**
   - Go to your repository **Settings > Secrets and variables > Actions**
   - Add these secrets:
     - `GOOGLE_SHEETS_API_KEY` - Your Google Sheets API key
     - `GOOGLE_OAUTH_CLIENT_ID` - Your Google OAuth client ID
     - `VOLUNTEER_SPREADSHEET_ID` - Your spreadsheet ID
     - `BACKUP_SPREADSHEET_ID` - Backup spreadsheet ID (optional)

2. **Deploy:**
   - Push to `main` branch
   - GitHub Actions will inject credentials during build
   - Users get credentials automatically, no setup required

3. **Test:**
   - Visit your GitHub Pages URL
   - Credentials should load automatically
   - No user prompts for API keys

### Option 2: GitHub Pages + Vercel Backend

**Best for:** Maximum security, credentials never in client code

1. **Deploy Backend to Vercel:**
   ```bash
   # Clone your repo
   git clone your-repo-url
   cd volunteer-attendance-tracker
   
   # Deploy to Vercel
   npx vercel --prod
   ```

2. **Set Vercel Environment Variables:**
   - Go to Vercel dashboard > Your project > Settings > Environment Variables
   - Add:
     - `GOOGLE_SHEETS_API_KEY`
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `VOLUNTEER_SPREADSHEET_ID`
     - `BACKUP_SPREADSHEET_ID`

3. **Update Frontend:**
   ```javascript
   // In js/server-credential-manager.js, update the endpoint:
   getCredentialEndpoint() {
     return 'https://your-vercel-app.vercel.app/api/credentials';
   }
   ```

4. **Deploy Frontend:**
   - Push to GitHub Pages as usual
   - Frontend will fetch credentials from Vercel backend

### Option 3: GitHub Pages + Netlify Functions

**Best for:** Netlify users, integrated deployment

1. **Deploy to Netlify:**
   - Connect your GitHub repo to Netlify
   - Set build command: `echo "Static site"`
   - Set publish directory: `.`

2. **Set Netlify Environment Variables:**
   - Go to Netlify dashboard > Site settings > Environment variables
   - Add the same variables as above

3. **Update Frontend:**
   ```javascript
   // In js/server-credential-manager.js, update the endpoint:
   getCredentialEndpoint() {
     return 'https://your-netlify-site.netlify.app/.netlify/functions/credentials';
   }
   ```

## 🔧 Configuration

### Update Credential Endpoint

Edit `js/server-credential-manager.js`:

```javascript
getCredentialEndpoint() {
  // Production: Use your deployed backend
  if (window.location.hostname.includes('github.io')) {
    return 'https://your-backend-url/api/credentials';
  }
  
  // Development: Use local backend
  return 'http://localhost:3001/api/credentials';
}
```

### Security Configuration

Update allowed origins in your backend:

```javascript
const allowedOrigins = [
  'https://yourusername.github.io',
  'https://your-custom-domain.com',
  'http://localhost:8080'  // For development
];
```

## 🧪 Testing

### Test Server Credentials

1. **Open browser console** on your deployed site
2. **Run test commands:**
   ```javascript
   // Test server credential manager
   await window.serverCredentialManager.initialize();
   const apiKey = await window.serverCredentialManager.getCredential('google_sheets_api_key');
   console.log('API Key loaded:', !!apiKey);
   
   // Test API integration
   const credential = await window.apiManager.getAPICredential('google_sheets_api_key');
   console.log('Credential retrieved:', !!credential);
   ```

### Test Local Development

1. **Create `.env` file:**
   ```bash
   GOOGLE_SHEETS_API_KEY=your_api_key
   GOOGLE_OAUTH_CLIENT_ID=your_client_id
   VOLUNTEER_SPREADSHEET_ID=your_spreadsheet_id
   ```

2. **Start local server:**
   ```bash
   python3 -m http.server 8080
   ```

3. **Test in browser:**
   - Open `http://localhost:8080`
   - Credentials should load from environment

## 🔄 Migration from Manual Entry

### Before (Manual Entry)
```javascript
// User had to enter API key every time
const apiKey = prompt('Enter Google Sheets API key:');
```

### After (Server-side)
```javascript
// Automatic credential loading
const apiKey = await window.apiManager.getAPICredential('google_sheets_api_key');
// No user prompts!
```

## 🛡️ Security Benefits

1. **No Client Exposure:** API keys never appear in client-side code
2. **Origin Validation:** Backend validates request origins
3. **Environment Isolation:** Different keys for dev/staging/prod
4. **Audit Trail:** Server logs credential access
5. **Easy Rotation:** Update keys in one place (server environment)

## 🚨 Troubleshooting

### "Failed to load credentials from server"
- Check backend deployment status
- Verify environment variables are set
- Check CORS configuration
- Test backend endpoint directly

### "Credentials not loading"
- Check browser console for errors
- Verify credential endpoint URL
- Test with curl: `curl https://your-backend/api/credentials`

### "CORS errors"
- Add your domain to allowed origins
- Check CORS headers in backend response
- Verify preflight OPTIONS handling

## 📋 Deployment Checklist

- [ ] Backend deployed (Vercel/Netlify/etc.)
- [ ] Environment variables set on backend
- [ ] Frontend updated with correct endpoint URL
- [ ] CORS configured for your domain
- [ ] GitHub secrets added (if using build-time injection)
- [ ] Test credentials loading in production
- [ ] Verify no user prompts for API keys

## 🎉 Result

Users can now use your volunteer attendance tracker without ever seeing or entering API keys. Everything loads automatically from your secure server!