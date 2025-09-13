# 🔒 Secure Credential Deployment Guide

## ❌ Why Client-Side Injection is Insecure

**Never do this:**
```javascript
// This exposes your API keys to anyone who views source!
window.APP_CREDENTIALS = {
  google_sheets_api_key: 'AIzaSyC-dK_x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x',
  google_oauth_client_id: '123456789-abcdefg.apps.googleusercontent.com'
};
```

Anyone can:
- View page source and see your keys
- Use browser dev tools to access `window.APP_CREDENTIALS`
- Copy your keys and abuse your API quotas
- Access your Google Sheets data

## ✅ Secure Solutions

### Option 1: Vercel Serverless (Recommended)

**Step 1: Deploy Backend to Vercel**

1. **Create Vercel account** at [vercel.com](https://vercel.com)
2. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```
3. **Deploy from your project directory:**
   ```bash
   cd volunteer-attendance-tracker
   vercel --prod
   ```
4. **Set environment variables in Vercel dashboard:**
   - `GOOGLE_SHEETS_API_KEY`
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `VOLUNTEER_SPREADSHEET_ID`

**Step 2: Update Frontend Configuration**

```javascript
// In js/server-credential-manager.js
getCredentialEndpoint() {
  if (window.location.hostname.includes('github.io')) {
    return 'https://your-app-name.vercel.app/api/credentials';
  }
  return 'http://localhost:3001/api/credentials'; // Development
}
```

**Step 3: Test Security**
- Visit your GitHub Pages site
- Open browser dev tools
- Check Network tab - credentials come from Vercel API
- Check Sources tab - no API keys in JavaScript files ✅

### Option 2: Netlify Functions

**Step 1: Deploy to Netlify**

1. **Connect GitHub repo** to Netlify
2. **Set build settings:**
   - Build command: `echo "Static site"`
   - Publish directory: `.`
3. **Add environment variables** in Netlify dashboard

**Step 2: Update Frontend**

```javascript
// In js/server-credential-manager.js
getCredentialEndpoint() {
  if (window.location.hostname.includes('github.io')) {
    return 'https://your-site-name.netlify.app/.netlify/functions/credentials';
  }
  return 'http://localhost:3001/api/credentials';
}
```

### Option 3: AWS Lambda + API Gateway

**Step 1: Create Lambda Function**

```javascript
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://yourusername.github.io',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      google_sheets_api_key: process.env.GOOGLE_SHEETS_API_KEY,
      google_oauth_client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      volunteer_spreadsheet_id: process.env.VOLUNTEER_SPREADSHEET_ID
    })
  };
};
```

**Step 2: Set Environment Variables in AWS Lambda**

**Step 3: Update Frontend**

```javascript
getCredentialEndpoint() {
  return 'https://your-api-id.execute-api.region.amazonaws.com/prod/credentials';
}
```

## 🔐 Security Best Practices

### 1. Origin Validation
```javascript
// In your backend
const allowedOrigins = [
  'https://yourusername.github.io',
  'https://your-custom-domain.com'
];

if (!allowedOrigins.includes(origin)) {
  return { statusCode: 403, body: 'Forbidden' };
}
```

### 2. Rate Limiting
```javascript
// Limit requests per IP
const rateLimit = new Map();
const clientIP = event.headers['x-forwarded-for'];

if (rateLimit.get(clientIP) > 10) {
  return { statusCode: 429, body: 'Too many requests' };
}
```

### 3. API Key Restrictions
In Google Cloud Console:
- **Restrict by HTTP referrer:** `https://yourusername.github.io/*`
- **Restrict by API:** Only enable Google Sheets API
- **Set quotas:** Limit requests per day/minute

### 4. Environment Separation
```javascript
// Different keys for different environments
const credentials = {
  google_sheets_api_key: process.env.NODE_ENV === 'production' 
    ? process.env.PROD_GOOGLE_SHEETS_API_KEY 
    : process.env.DEV_GOOGLE_SHEETS_API_KEY
};
```

## 🧪 Testing Security

### Test 1: Source Code Inspection
```bash
# Check that no API keys are in your deployed files
curl -s https://yourusername.github.io/js/server-credential-manager.js | grep -i "api.*key"
# Should return nothing
```

### Test 2: Network Monitoring
1. Open your site in browser
2. Open Dev Tools > Network tab
3. Refresh page
4. Verify credentials come from your backend API, not inline JavaScript

### Test 3: CORS Validation
```bash
# Test from unauthorized origin (should fail)
curl -H "Origin: https://malicious-site.com" \
     https://your-backend.vercel.app/api/credentials
```

## 🚨 Security Checklist

- [ ] No API keys in client-side JavaScript files
- [ ] Credentials served only from secure backend
- [ ] CORS configured for your domain only
- [ ] API keys restricted in Google Cloud Console
- [ ] Rate limiting implemented
- [ ] HTTPS enforced everywhere
- [ ] Environment variables used (never hardcoded)
- [ ] Regular key rotation schedule
- [ ] Monitoring for unusual API usage

## 🎯 Final Architecture

```
User Browser (GitHub Pages)
    ↓ (HTTPS request)
Your Backend (Vercel/Netlify/AWS)
    ↓ (Environment variables)
Google Sheets API
```

**Security Benefits:**
- ✅ API keys never exposed to users
- ✅ Keys stored securely in backend environment
- ✅ Origin validation prevents unauthorized access
- ✅ Rate limiting prevents abuse
- ✅ Easy key rotation without client updates

## 🔄 Migration Steps

1. **Choose backend platform** (Vercel recommended)
2. **Deploy backend** with credential API
3. **Set environment variables** on backend
4. **Update frontend** to use backend endpoint
5. **Test thoroughly** in production
6. **Remove any client-side credential code**
7. **Verify security** with the tests above

Your users will never see or need to enter API keys, and your credentials stay secure! 🔒