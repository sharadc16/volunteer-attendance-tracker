# Deployment Workflow Guide

## Overview

This guide outlines the complete testing and deployment workflow for the Volunteer Attendance Tracker, from local development to production deployment.

## Environment Setup

### Local Development Environment
- **Branch**: `dev` or feature branches
- **Database**: Development IndexedDB (`volunteer-attendance-dev`)
- **URL**: `file://` or local server
- **Google Sheets**: Test spreadsheet (optional)

### Development Environment (GitHub Pages)
- **Branch**: `dev` 
- **URL**: `https://[username].github.io/volunteer-attendance-tracker/` (if dev branch is configured for Pages)
- **Database**: Development IndexedDB (`volunteer-attendance-dev`)
- **Purpose**: Team testing and validation

### Production Environment (GitHub Pages)
- **Branch**: `main`
- **URL**: `https://[username].github.io/volunteer-attendance-tracker/`
- **Database**: Production IndexedDB (`volunteer-attendance-prod`)
- **Purpose**: Live application for actual volunteer tracking

## Testing Workflow

### 1. Local Testing

#### Setup Local Server
```bash
# Navigate to project directory
cd volunteer-attendance-tracker

# Start local server (choose one method)
# Method 1: Python
python3 -m http.server 8080

# Method 2: Node.js (if you have http-server installed)
npx http-server -p 8080

# Method 3: PHP
php -S localhost:8080
```

#### Access Application
- Open browser to `http://localhost:8080`
- Verify development environment is active (check console for "Development mode" message)

#### Run Test Suite
1. **Core Functionality Tests**
   ```
   http://localhost:8080/test-navigation.html
   http://localhost:8080/test-event-management.html
   http://localhost:8080/test-scanner-validation.html
   ```

2. **Integration Tests**
   ```
   http://localhost:8080/test-sync-system.html
   http://localhost:8080/test-attendance-analytics.html
   http://localhost:8080/test-sunday-events.html
   ```

3. **Manual Testing Checklist**
   - [ ] Volunteer registration works
   - [ ] Scanner input processes correctly
   - [ ] Event creation and management
   - [ ] Attendance tracking accuracy
   - [ ] Google Sheets sync (if configured)
   - [ ] Analytics and reporting
   - [ ] Mobile responsiveness
   - [ ] Error handling

#### Local Testing Commands
```bash
# Run validation scripts
node validate-analytics.js
node test-event-validation.js
node create-sunday-events.js

# Check for JavaScript errors
# Open browser console and verify no errors
```

### 2. Development Environment Testing

#### Deploy to Dev Branch
```bash
# Commit changes to dev branch
git add .
git commit -m "feat: description of changes"
git push origin dev
```

#### Configure GitHub Pages for Dev Branch (Optional)
1. Go to repository Settings → Pages
2. Set source to `dev` branch
3. Access via dev URL for team testing

#### Dev Environment Testing
- Test with multiple users/devices
- Verify cross-browser compatibility
- Test Google Sheets integration with real data
- Performance testing with larger datasets
- Mobile device testing

### 3. Production Deployment

#### Pre-Production Checklist
- [ ] All local tests pass
- [ ] Dev environment testing complete
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Google Sheets credentials configured for production
- [ ] No console errors or warnings
- [ ] Mobile testing completed

#### Merge to Production
```bash
# Switch to main branch
git checkout main

# Merge dev branch
git merge dev

# Push to production
git push origin main
```

#### Post-Deployment Verification
1. **Immediate Checks** (within 5 minutes)
   - [ ] Application loads correctly
   - [ ] No JavaScript errors in console
   - [ ] Basic functionality works (volunteer registration, scanner)

2. **Full Verification** (within 30 minutes)
   - [ ] Run all test URLs on production
   - [ ] Test Google Sheets sync
   - [ ] Verify analytics functionality
   - [ ] Test on mobile devices
   - [ ] Check data persistence

## Branch Strategy

### Development Flow
```
feature-branch → dev → main
     ↓           ↓      ↓
  local test → dev test → production
```

### Branch Purposes
- **Feature branches**: Individual feature development
- **dev**: Integration testing and team collaboration
- **main**: Production-ready code only

## Testing Checklist by Environment

### Local Testing Checklist
- [ ] Application starts without errors
- [ ] All test files run successfully
- [ ] Scanner input validation works
- [ ] Event management functions correctly
- [ ] Data persists in development database
- [ ] Console shows no errors

### Dev Environment Checklist
- [ ] Application accessible via GitHub Pages
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified
- [ ] Google Sheets integration tested
- [ ] Performance acceptable with test data
- [ ] Team members can access and test

### Production Checklist
- [ ] Application loads on production URL
- [ ] All core features functional
- [ ] Google Sheets sync working with production credentials
- [ ] Analytics and reporting accurate
- [ ] Mobile experience optimized
- [ ] No data loss during deployment
- [ ] Backup/rollback plan ready

## Rollback Procedure

### If Issues Found in Production
1. **Immediate Action**
   ```bash
   # Revert to previous working commit
   git revert HEAD
   git push origin main
   ```

2. **Alternative: Reset to Last Known Good**
   ```bash
   # Find last working commit
   git log --oneline
   
   # Reset to specific commit
   git reset --hard [commit-hash]
   git push --force origin main
   ```

3. **Fix and Redeploy**
   - Fix issues in dev branch
   - Complete testing cycle again
   - Merge to main when ready

## Monitoring and Maintenance

### Regular Checks
- Weekly: Run full test suite on production
- Monthly: Review analytics and performance
- Quarterly: Update dependencies and security review

### Performance Monitoring
- Monitor IndexedDB size growth
- Check Google Sheets API quota usage
- Verify mobile performance metrics

## Emergency Procedures

### Data Recovery
- IndexedDB data is stored locally per user
- Google Sheets serves as backup/sync source
- Export functionality available in admin panel

### Service Interruption
- GitHub Pages has 99.9% uptime SLA
- Application works offline (IndexedDB)
- Google Sheets sync will resume when connectivity restored

## Contact and Support

### For Issues
1. Check browser console for errors
2. Verify network connectivity
3. Test in incognito/private mode
4. Contact system administrator

### Development Support
- Review TESTING_GUIDE.md for detailed test procedures
- Check EVENT_MANAGEMENT_GUIDE.md for event-specific issues
- Consult SYNC_SYSTEM.md for Google Sheets problems