# GitHub Actions Multi-Environment Setup

## Overview

This setup enables automatic deployment of different branches to different environments:

- **Dev Branch** → `https://[username].github.io/[repo]/dev/` (Development)
- **Main Branch** → `https://[username].github.io/[repo]/` (Production)

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

### 3. Commit the Workflow File

The workflow file is already created at `.github/workflows/deploy.yml`. Commit it:

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions multi-environment deployment"
git push origin dev
```

### 4. Test the Setup

#### Deploy Development Environment
```bash
# Make changes in dev branch
git checkout dev
# ... make changes ...
git add .
git commit -m "feat: test dev deployment"
git push origin dev

# Wait 2-3 minutes, then check:
# https://[username].github.io/[repo]/dev/
```

#### Deploy Production Environment
```bash
# Merge to main when ready
git checkout main
git merge dev
git push origin main

# Wait 2-3 minutes, then check:
# https://[username].github.io/[repo]/
```

## How It Works

### Development Deployment (`dev` branch)
- **Trigger**: Push to `dev` branch
- **URL**: `https://[username].github.io/[repo]/dev/`
- **Features**:
  - Forces development environment (`?env=dev`)
  - Shows "[DEV]" in page title
  - Uses development database (`VolunteerAttendanceDB_Dev`)
  - Shows orange DEV badge
  - Includes all test files

### Production Deployment (`main` branch)
- **Trigger**: Push to `main` branch  
- **URL**: `https://[username].github.io/[repo]/`
- **Features**:
  - Clean production build
  - Removes test files and development guides
  - Uses production database (`VolunteerAttendanceDB`)
  - No DEV badge or indicators

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
- **Development**: `https://[username].github.io/[repo]/dev/`
- **Production**: `https://[username].github.io/[repo]/`

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