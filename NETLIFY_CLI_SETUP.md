# Netlify CLI Local Development Setup

This guide explains how to use Netlify CLI for local development to access the same environment variables as your deployed environments.

## 🚀 Quick Setup

### 1. Install Netlify CLI

```bash
# Install globally
npm install -g netlify-cli

# Or use npx (no installation required)
npx netlify-cli
```

### 2. Login to Netlify

```bash
netlify login
```

This will open your browser and authenticate with your Netlify account.

### 3. Link Your Local Project

```bash
# Navigate to your project directory
cd volunteer-attendance-tracker

# Link to your Netlify site
netlify link
```

Choose your site: **gurukul-attendance**

### 4. Start Local Development

```bash
# Start Netlify development server
netlify dev
```

This will:
- Start a local server (usually on `http://localhost:8888`)
- Inject environment variables from your Netlify site
- Enable Netlify Functions locally
- Use the same environment variables as your deployed site

## 🌐 Environment Variable Access

### With Netlify CLI (`netlify dev`)

✅ **Automatic Environment Variables**:
- `GOOGLE_SHEETS_API_KEY` - Loaded from Netlify
- `GOOGLE_OAUTH_CLIENT_ID` - Loaded from Netlify  
- `VOLUNTEER_SPREADSHEET_ID` - Loaded from Netlify (context-specific)

✅ **Netlify Functions Available**:
- `/.netlify/functions/credentials` - Works locally
- Same API as production

✅ **Context-Specific Values**:
- Uses "Local development (Netlify CLI)" context from your Netlify dashboard
- Spreadsheet ID: `13i5bVltP_-PVu_MhkNlyreCgfPEusvS7HzG5svceq5Y`

### Without Netlify CLI (basic server)

⚠️ **Fallback Credentials**:
- Uses hardcoded values from `js/local-env.js`
- No Netlify Functions available
- Limited functionality

## 🔧 Commands Reference

### Basic Commands

```bash
# Start development server
netlify dev

# Start on specific port
netlify dev --port 3000

# Start with specific environment
netlify dev --context deploy-preview

# Check site status
netlify status

# View environment variables
netlify env:list
```

### Environment Management

```bash
# List all environment variables
netlify env:list

# Get specific variable
netlify env:get VOLUNTEER_SPREADSHEET_ID

# Set local environment variable (for testing)
netlify env:set TEST_VAR "test-value" --context local-development
```

### Functions Testing

```bash
# Test functions locally
curl http://localhost:8888/.netlify/functions/credentials

# View function logs
netlify functions:list
```

## 🧪 Testing Different Contexts

You can test different deployment contexts locally:

```bash
# Test as production
netlify dev --context production

# Test as deploy preview
netlify dev --context deploy-preview

# Test as branch deploy
netlify dev --context branch-deploy
```

Each context will use the appropriate environment variables from your Netlify dashboard.

## 🔍 Verification

### Check if Netlify CLI is Working

1. **Visit**: `http://localhost:8888/test-env-vars.html`
2. **Look for**:
   - ✅ "Local Development (Netlify CLI)" context
   - ✅ Environment variables loaded from Netlify
   - ✅ Netlify Functions API available

### Console Logs Should Show:

```
🌐 Deployment Context Detection:
📍 Context: Local Development (Netlify CLI) (local)
📝 Description: Running locally with Netlify CLI (netlify dev) - environment variables available
🏷️ Netlify Context: local-development
📋 Actual Spreadsheet ID: 13i5bVltP_-PVu_MhkNl...
✅ Spreadsheet loaded from Netlify environment variables
```

## 🚨 Troubleshooting

### Issue: "No environment variables found"

**Solution**: Make sure you're using `netlify dev` instead of a basic server:

```bash
# ❌ Wrong - uses fallback credentials
python3 -m http.server 8080

# ✅ Correct - uses Netlify environment variables
netlify dev
```

### Issue: "Netlify Functions not available"

**Solution**: Ensure you're linked to the correct site:

```bash
netlify unlink
netlify link
# Select: gurukul-attendance
```

### Issue: "Wrong spreadsheet ID"

**Solution**: Check your Netlify environment variables:

```bash
netlify env:list
# Verify VOLUNTEER_SPREADSHEET_ID is set correctly
```

## 📋 Development Workflow

### Recommended Workflow

1. **Start Netlify CLI**:
   ```bash
   netlify dev
   ```

2. **Develop and Test**:
   - Application runs with real environment variables
   - Functions work locally
   - Same behavior as deployed environments

3. **Deploy to Dev**:
   ```bash
   git add .
   git commit -m "feat: new feature"
   git push origin dev
   ```

4. **Deploy to Production**:
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

## 🔐 Security Notes

- Environment variables are only available during `netlify dev` session
- Never commit actual credentials to Git
- Use different spreadsheets for different contexts
- Local development uses the "Local development (Netlify CLI)" context

## 📚 Additional Resources

- [Netlify CLI Documentation](https://docs.netlify.com/cli/get-started/)
- [Local Development Guide](https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development/)
- [Environment Variables](https://docs.netlify.com/environment-variables/overview/)

---

**Quick Start**: `netlify dev` → `http://localhost:8888` → Test with real environment variables! 🚀