# Quick Deployment Guide

## Local Testing (Before Any Commits)

```bash
# 1. Start local server
cd volunteer-attendance-tracker
python3 -m http.server 8080

# 2. Test in browser
# Open: http://localhost:8080
# Run test files:
# - http://localhost:8080/test-navigation.html
# - http://localhost:8080/test-scanner-validation.html
# - http://localhost:8080/test-event-management.html

# 3. Check for errors in browser console
```

## Deploy to Dev Environment

```bash
# 1. Commit to dev branch
git add .
git commit -m "feat: your change description"
git push origin dev

# 2. Test on dev environment (if GitHub Pages configured for dev)
# URL: https://[username].github.io/volunteer-attendance-tracker/
```

## Complete Dev-to-Production Workflow

### 1. Development Phase
```bash
# Work in dev branch
git checkout dev
# ... make changes ...
git add .
git commit -m "feat: describe your changes"
git push origin dev

# Test at: https://[username].github.io/volunteer-attendance-tracker/?env=dev
# (Alternative: https://[username].github.io/volunteer-attendance-tracker/dev/)
```

### 2. Pre-Production Validation
- [ ] Dev environment testing completed
- [ ] All features working correctly
- [ ] Team approval obtained
- [ ] No critical issues identified

### 3. Deploy to Production
```bash
# Switch to main branch
git checkout main

# Merge dev branch changes
git merge dev

# Push to deploy production
git push origin main

# Wait 2-3 minutes for deployment
# Test at: https://[username].github.io/volunteer-attendance-tracker/
```

### 4. Post-Production Verification
- [ ] Production URL loads correctly
- [ ] No DEV badge visible
- [ ] All functionality working
- [ ] Performance acceptable

## Quick Test Commands

```bash
# Run validation scripts locally
node validate-analytics.js
node test-event-validation.js
node create-sunday-events.js
```

## Emergency Rollback

```bash
# If production has issues, revert immediately
git revert HEAD
git push origin main
```

## GitHub Pages Setup

### For Dev Branch Testing (Optional)
1. Go to repository Settings → Pages
2. Source: Deploy from branch → `dev`
3. Access via: `https://[username].github.io/volunteer-attendance-tracker/`

### For Production (Required)
1. Go to repository Settings → Pages  
2. Source: Deploy from branch → `main`
3. Access via: `https://[username].github.io/volunteer-attendance-tracker/`

## Current Issue Solution

**Problem**: Cannot test dev changes online without affecting production

**Reality**: 
- GitHub Pages serves from `main` branch only
- `?env=dev` only changes database/settings, not the code
- Merging `dev` → `main` immediately affects production users

**Recommended Solutions**:

### Option 1: Local Testing Only (Current)
```bash
# Test locally before merging to production
python3 -m http.server 8080
# Test at http://localhost:8080
```

### Option 2: Separate Dev Repository
1. Create `volunteer-attendance-tracker-dev` repository
2. Push dev changes there for online testing
3. Merge to main repo only when ready for production

### Option 3: Use Netlify/Vercel for Dev
- Deploy dev branch to Netlify/Vercel for testing
- Keep GitHub Pages for production only