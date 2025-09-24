# Deployment Reference Guide

## Current Deployment Architecture

This project uses a **dual-target deployment system** that separates development and production environments completely.

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dev Branch    │───▶│     Netlify      │───▶│  Temp Dev URLs  │
│                 │    │   (Development)  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Main Branch   │───▶│  GitHub Pages    │───▶│ Stable Prod URL │
│                 │    │   (Production)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Environment Details

### 🔧 Development Environment
- **Branch**: `dev`
- **Deployment Target**: Netlify
- **URL Pattern**: `https://dev-[commit-hash]--your-site-name.netlify.app`
- **Trigger**: Any push to `dev` branch
- **Build Features**:
  - Includes all test files (`test-*.html`)
  - Development debugging tools
  - Development banner indicator
  - Environment override (`window.FORCE_DEV_MODE = true`)
  - Title prefix: `[DEV]`
- **Database**: `volunteer-attendance-dev` (IndexedDB)
- **Purpose**: Safe testing and team collaboration

### 🚀 Production Environment
- **Branch**: `main`
- **Deployment Target**: GitHub Pages
- **URL**: `https://sharadc16.github.io/volunteer-attendance-tracker/`
- **Trigger**: Any push to `main` branch
- **Build Features**:
  - Clean production build
  - Removes test files and guides
  - No development indicators
  - Optimized for end users
- **Database**: `volunteer-attendance-prod` (IndexedDB)
- **Purpose**: Live application for actual volunteer tracking

## Workflow Commands

### Daily Development Workflow

```bash
# 1. Work in dev branch
git checkout dev

# 2. Make changes and test locally
# ... make changes ...
python3 -m http.server 8080  # Test at http://localhost:8080

# 3. Deploy to development environment
git add .
git commit -m "feat: description of changes"
git push origin dev
# → Deploys to Netlify with temporary URL

# 4. When ready for production
git checkout main
git merge dev
git push origin main
# → Deploys to GitHub Pages at stable URL
```

### Emergency Rollback

```bash
# Rollback production immediately
git checkout main
git revert HEAD
git push origin main
```

### Check Deployment Status

```bash
# View recent deployments
git log --oneline -5

# Check GitHub Actions
# Go to: https://github.com/sharadc16/volunteer-attendance-tracker/actions
```

## Configuration Files

### GitHub Actions Workflow
- **File**: `.github/workflows/deploy-simple.yml`
- **Jobs**: 
  - `deploy-production`: Handles main branch → GitHub Pages
  - `deploy-development`: Handles dev branch → Netlify

### Required Secrets (Optional for Netlify)
- `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
- `NETLIFY_SITE_ID`: Your Netlify site ID

## URLs and Access

### Production (Netlify)
- **URL**: https://gurukul-attendance.netlify.app
- **Status**: Stable, always accessible
- **Users**: End users, production volunteer tracking
- **Environment Variables**: Set in Netlify dashboard

### Development (Temporary URLs)
- **URL Pattern**: `https://dev-[commit-hash]--gurukul-attendance.netlify.app`
- **Status**: Temporary, created per deployment
- **Users**: Developers, testers, team collaboration
- **Access**: Check commit comments or GitHub Actions logs

### GitHub Pages (Backup)
- **URL**: https://sharadc16.github.io/volunteer-attendance-tracker/
- **Status**: Backup deployment
- **Users**: Fallback access if Netlify is unavailable

## Key Benefits

✅ **Zero Conflicts**: Dev and prod never interfere  
✅ **Safe Testing**: Test online without affecting users  
✅ **Stable Production**: Main branch controls live site  
✅ **Team Collaboration**: Share temporary dev URLs  
✅ **Clean Separation**: Different databases and features  
✅ **Automatic Deployment**: Push to deploy, no manual steps  

## Troubleshooting

### Production Site Shows Redirect
**Problem**: Site redirects to `/dev/` or shows environment selector  
**Solution**: Deploy from main branch to overwrite old deployment
```bash
git checkout main
git push origin main
```

### Development Deployment Failed
**Problem**: Dev branch push doesn't create Netlify deployment  
**Cause**: Netlify secrets not configured (this is optional)  
**Solution**: Either configure Netlify secrets or test locally

### Wrong Environment Detected
**Problem**: Production shows development features  
**Solution**: Check if `env-override.js` exists in production build
```bash
# Should be removed in production builds
# Check GitHub Actions logs for build process
```

## Monitoring

### Regular Checks
- **Production URL**: Verify https://sharadc16.github.io/volunteer-attendance-tracker/ loads correctly
- **GitHub Actions**: Check for failed deployments in Actions tab
- **Branch Status**: Ensure main branch is up to date with tested dev changes

### Performance Monitoring
- **Production**: Monitor load times and functionality
- **Development**: Test new features before merging to main
- **Database**: Monitor IndexedDB usage in both environments

## Security Notes

- **GitHub Token**: Automatically provided by GitHub Actions
- **Netlify Secrets**: Optional, only needed for dev deployments
- **No API Keys**: Never commit sensitive credentials to repository
- **Environment Separation**: Dev and prod use different databases

## Migration Notes

This deployment setup was updated from a single GitHub Pages deployment to a dual-target system to:
- Eliminate conflicts between dev and production
- Provide stable production URLs
- Enable safe online testing
- Support team collaboration with temporary dev URLs

The old system created redirects and environment conflicts. The new system provides complete separation and stability.