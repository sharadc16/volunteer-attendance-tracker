# GitHub Actions Multi-Environment Setup

## Overview

This setup enables automatic deployment of different branches to different deployment targets:

- **Dev Branch** → **Netlify** (Development) - `https://dev-[commit-hash]--your-site-name.netlify.app`
- **Main Branch** → **GitHub Pages** (Production) - `https://sharadc16.github.io/volunteer-attendance-tracker/`

## Key Benefits

✅ **Complete Separation**: Dev and production never interfere with each other  
✅ **Stable Production**: Main branch always controls the live site  
✅ **Safe Testing**: Dev deployments get temporary URLs for testing  
✅ **No Conflicts**: Multiple dev deployments can exist simultaneously  
✅ **Clean Production**: Only essential files in production build

## Setup Steps

### 1. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Pages** in the left sidebar
4. Under **Source**, select **GitHub Actions**

### 2. Configure Repository Permissions

1. In repository **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

### 3. Optional: Configure Netlify for Development Deployments

**Note**: Netlify configuration is optional. If not configured, dev branch deployments will be skipped.

1. Create a Netlify account at https://netlify.com
2. Create a new site (can be empty initially)
3. Get your Netlify Site ID and Auth Token:
   - **Site ID**: Found in Site Settings → General → Site Information
   - **Auth Token**: User Settings → Applications → Personal Access Tokens
4. Add secrets to your GitHub repository:
   - Go to repository **Settings** → **Secrets and variables** → **Actions**
   - Add `NETLIFY_AUTH_TOKEN` with your auth token
   - Add `NETLIFY_SITE_ID` with your site ID

### 4. Commit the Workflow File

The workflow file is already created at `.github/workflows/deploy-simple.yml`. It's already committed and active.

### 5. Test the Setup

#### Deploy Development Environment (Netlify)
```bash
# Make changes in dev branch
git checkout dev
# ... make changes ...
git add .
git commit -m "feat: test dev deployment"
git push origin dev

# Check deployment:
# 1. Go to repository Actions tab
# 2. Look for deployment URL in commit comments (if Netlify configured)
# 3. URL format: https://dev-[commit-hash]--your-site-name.netlify.app
```

#### Deploy Production Environment (GitHub Pages)
```bash
# Merge to main when ready
git checkout main
git merge dev
git push origin main

# Wait 2-3 minutes, then check:
# https://sharadc16.github.io/volunteer-attendance-tracker/
```

## How It Works

### Development Deployment (`dev` branch → Netlify)
- **Trigger**: Push to `dev` branch
- **Target**: Netlify (temporary URLs)
- **URL**: `https://dev-[commit-hash]--your-site-name.netlify.app`
- **Features**:
  - Forces development environment (`window.FORCE_DEV_MODE = true`)
  - Shows "[DEV]" in page title
  - Uses development database (`volunteer-attendance-dev`)
  - Shows orange development banner
  - Includes all test files and debugging tools
  - Each deployment gets a unique URL
  - Safe for testing without affecting production

### Production Deployment (`main` branch → GitHub Pages)
- **Trigger**: Push to `main` branch  
- **Target**: GitHub Pages (stable URL)
- **URL**: `https://sharadc16.github.io/volunteer-attendance-tracker/`
- **Features**:
  - Clean production build
  - Removes test files and development guides
  - Uses production database (`volunteer-attendance-prod`)
  - No development indicators
  - Optimized for end users

## Workflow Benefits

✅ **Separate Environments**: Dev and prod are completely isolated
✅ **Automatic Deployment**: Push to deploy, no manual steps
✅ **Safe Testing**: Test online without affecting production
✅ **Clean Production**: Only essential files in production
✅ **Team Collaboration**: Share dev environment for testing

## Usage Workflow

### Daily Development
```bash
# 1. Work in dev branch
git checkout dev
# ... make changes ...

# 2. Test locally
python3 -m http.server 8080
# Test at http://localhost:8080

# 3. Deploy to dev environment
git add .
git commit -m "feat: new feature"
git push origin dev

# 4. Test online dev environment
# https://[username].github.io/[repo]/dev/

# 5. When ready for production
git checkout main
git merge dev
git push origin main
```

### Emergency Rollback
```bash
# Rollback production
git checkout main
git revert HEAD
git push origin main
```

## Monitoring Deployments

### Check Deployment Status
1. Go to repository **Actions** tab
2. See running/completed workflows
3. Click on workflow for detailed logs

### Deployment URLs
- **Development**: `https://dev-[commit-hash]--your-site-name.netlify.app` (if Netlify configured)
- **Production**: `https://sharadc16.github.io/volunteer-attendance-tracker/`

### Checking Deployment Status
1. **GitHub Actions**: Go to repository → Actions tab
2. **Production**: Check GitHub Pages deployment status
3. **Development**: Look for Netlify deployment URLs in commit comments

## Troubleshooting

### Deployment Failed
1. Check **Actions** tab for error logs
2. Common issues:
   - Missing files (check file paths)
   - Permission errors (check repository settings)
   - Syntax errors in workflow file

### Environment Not Working
1. Check browser console for errors
2. Verify environment detection in config.js
3. Clear browser cache and reload

### Dev Environment Shows Production
1. Check if `env-override.js` is loaded
2. Verify GitHub Actions deployed to `/dev/` path
3. Check browser developer tools → Network tab

## Advanced Configuration

### Custom Test Commands
Edit `.github/workflows/deploy.yml` to add your test commands:

```yaml
- name: Run tests
  run: |
    node test-event-validation.js
    node validate-analytics.js
    # Add more test commands
```

### Environment Variables
Add secrets in repository **Settings** → **Secrets and variables** → **Actions**:

```yaml
env:
  GOOGLE_SHEETS_API_KEY: ${{ secrets.GOOGLE_SHEETS_API_KEY }}
```

## Security Notes

- Workflow uses `GITHUB_TOKEN` (automatically provided)
- No additional secrets needed for basic deployment
- Google Sheets credentials should be added as repository secrets
- Never commit API keys or sensitive data

## Next Steps

1. Test the deployment workflow
2. Add comprehensive test suite
3. Set up monitoring and alerts
4. Configure custom domain (optional)
5. Add automated testing on pull requests