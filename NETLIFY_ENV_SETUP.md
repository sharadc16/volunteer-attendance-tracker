# Netlify Environment Variables Setup Guide

This guide explains how to configure environment variables in Netlify for the Gurukul Volunteer Attendance Tracker.

## Required Environment Variables

The application requires these environment variables to be set in your Netlify dashboard:

### 🔑 Required Variables

| Variable Name | Description | Example Format | Required |
|---------------|-------------|----------------|----------|
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth 2.0 Client ID | `123456789-abc...googleusercontent.com` | ✅ Yes |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets API Key | `AIzaSyA...` | ✅ Yes |
| `VOLUNTEER_SPREADSHEET_ID` | Google Sheets Spreadsheet ID | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` | ⚠️ Optional |

## Step-by-Step Setup

### 1. Access Netlify Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Sign in to your account
3. Select your site: **gurukul-attendance**

### 2. Navigate to Environment Variables

1. Click on **Site settings**
2. In the left sidebar, click **Environment variables**
3. You should see the "Environment variables" page

### 3. Add Environment Variables

For each required variable:

1. Click **Add a variable**
2. Enter the **Key** (variable name)
3. Enter the **Value** (your credential)
4. Select **All scopes** (or specific deploy contexts if needed)
5. Click **Create variable**

#### Example Setup:

```
Key: GOOGLE_OAUTH_CLIENT_ID
Value: 123456789-abcdefghijklmnop.apps.googleusercontent.com
Scopes: All scopes

Key: GOOGLE_SHEETS_API_KEY  
Value: AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567
Scopes: All scopes

Key: VOLUNTEER_SPREADSHEET_ID
Value: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
Scopes: All scopes
```

### 4. Deploy Context Configuration (Optional)

You can set different values for different deploy contexts:

- **Production**: Main branch deployments
- **Deploy previews**: Pull request deployments  
- **Branch deploys**: Other branch deployments

To set context-specific values:
1. When adding a variable, select specific scopes instead of "All scopes"
2. Choose the appropriate context(s)

## How Environment Variables Are Used

### Build-Time Injection

The application uses a build script (`netlify-env-inject.js`) that:

1. Reads environment variables during the Netlify build process
2. Generates a `netlify-env.js` file with the credentials
3. Injects this file into the application

### Runtime Fallback

If build-time injection fails, the application falls back to:

1. **Netlify Functions API**: Loads credentials from `/.netlify/functions/credentials`
2. **Local environment**: Uses `local-env.js` for development

## Verification

### Test Environment Variables

1. **Deploy your site** after setting environment variables
2. **Visit the test page**: `https://your-site.netlify.app/test-env-vars.html`
3. **Run the tests** to verify all variables are loaded correctly

### Expected Results

✅ **Success indicators:**
- Variables found in window globals
- Netlify environment injection detected
- CredentialManager validation passes
- Netlify Functions API responds correctly

⚠️ **Warning indicators:**
- Using local/test credentials
- Some optional variables missing

❌ **Error indicators:**
- No variables found
- Credential validation fails
- API endpoints not accessible

## Troubleshooting

### Variables Not Loading

**Problem**: Environment variables not found in application

**Solutions:**
1. **Check Netlify Dashboard**: Verify variables are set correctly
2. **Redeploy**: Trigger a new deployment after setting variables
3. **Check Build Logs**: Look for environment injection messages
4. **Test API Endpoint**: Visit `/.netlify/functions/credentials` directly

### Build Failures

**Problem**: Build fails after adding environment variables

**Solutions:**
1. **Check Build Logs**: Look for errors in the build process
2. **Verify Script**: Ensure `netlify-env-inject.js` is present
3. **Check netlify.toml**: Verify build command is set correctly

### Invalid Credentials

**Problem**: Credentials are set but validation fails

**Solutions:**
1. **Check Format**: Verify API key starts with `AIza` and Client ID ends with `.googleusercontent.com`
2. **Remove Quotes**: Don't wrap values in quotes in Netlify dashboard
3. **Check Permissions**: Ensure Google Cloud project has correct APIs enabled

## Security Best Practices

### ✅ Do's
- Set environment variables in Netlify dashboard only
- Use different credentials for development and production
- Regularly rotate API keys
- Monitor API usage in Google Cloud Console

### ❌ Don'ts
- Never commit credentials to Git repository
- Don't share environment variable values
- Don't use production credentials for testing
- Don't disable CORS protection without good reason

## Advanced Configuration

### Multiple Spreadsheets

You can configure multiple spreadsheets for different purposes:

```
VOLUNTEER_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
BACKUP_SPREADSHEET_ID=1CyiNWt1YSB6oGNeLvCeCZkhnVVrqumcdt85PgwF3vnt
```

### Deploy Context Variables

Set different spreadsheets for different environments:

```
Production:
VOLUNTEER_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

Deploy Previews:
VOLUNTEER_SPREADSHEET_ID=1TestSpreadsheetForDevelopment123456789
```

## Support

### Getting Help

1. **Check the test page**: `/test-env-vars.html`
2. **Review build logs**: Netlify dashboard > Deploys > Build log
3. **Check browser console**: Look for credential loading messages
4. **Verify Google Cloud setup**: Ensure APIs are enabled and credentials are valid

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "No environment variables found" | Variables not set in Netlify | Add variables in dashboard |
| "Credential validation failed" | Invalid format | Check API key/Client ID format |
| "Netlify Functions API not available" | Functions not deployed | Check netlify.toml configuration |
| "Build script failed" | Script error | Check build logs for details |

## Migration from Other Platforms

### From GitHub Pages

If migrating from GitHub Pages:
1. Set up environment variables in Netlify (they can't be set in GitHub Pages)
2. Update any hardcoded URLs to use Netlify domain
3. Test the Netlify Functions API endpoint

### From Vercel

If migrating from Vercel:
1. Copy environment variable values from Vercel dashboard
2. Set them in Netlify dashboard with same names
3. Update any Vercel-specific configurations

---

**Last Updated**: December 2024  
**Version**: 2.0.0  
**Compatibility**: Netlify, Google Sheets API v4