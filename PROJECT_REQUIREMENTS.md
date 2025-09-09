# Project Requirements - Volunteer Attendance Tracker

## Hard Requirements (Non-Negotiable)

### 1. Development Workflow Requirements

**CRITICAL**: The development workflow MUST follow a dev-first deployment strategy:

1. **Dev Branch First**: All changes MUST be pushed to `dev` branch first
2. **Online Dev Testing**: Changes MUST be tested in the online dev environment before production
3. **No Direct Production**: Production (`main` branch) MUST NEVER be updated without prior dev testing
4. **Separate Environments**: Dev and production MUST use separate databases and configurations

### 2. Deployment Architecture Requirements

**Dev Environment:**
- **Trigger**: Push to `dev` branch
- **URL**: `https://sharadc16.github.io/volunteer-attendance-tracker/?env=dev` (primary)
- **Alternative URL**: `https://sharadc16.github.io/volunteer-attendance-tracker/dev/` (may have caching issues)
- **Database**: `VolunteerAttendanceDB_Dev`
- **Visual Indicators**: Orange "DEV" badge, "[DEV]" in title
- **Purpose**: Safe testing environment that doesn't affect production users

**Production Environment:**
- **Trigger**: Push to `main` branch (only after dev testing)
- **URL**: `https://sharadc16.github.io/volunteer-attendance-tracker/`
- **Database**: `VolunteerAttendanceDB`
- **Visual Indicators**: Clean production interface (no dev badges)
- **Purpose**: Live application for actual volunteer tracking

### 3. Mandatory Workflow Steps

```bash
# REQUIRED WORKFLOW - DO NOT BYPASS
# Step 1: Develop in dev branch
git checkout dev
# ... make changes ...
git add .
git commit -m "feat: description"
git push origin dev

# Step 2: Test in dev environment (MANDATORY)
# URL: https://sharadc16.github.io/volunteer-attendance-tracker/?env=dev
# - Verify all functionality works
# - Test with team members
# - Validate no critical issues

# Step 3: Deploy to production (only after dev testing)
git checkout main
git merge dev
git push origin main
```

### 4. Environment Separation Requirements

**Database Isolation:**
- Dev environment MUST use `VolunteerAttendanceDB_Dev`
- Production environment MUST use `VolunteerAttendanceDB`
- No data sharing between environments

**Configuration Isolation:**
- Dev environment MUST show development indicators
- Production environment MUST have clean, professional interface
- Different sync intervals and debug settings

**Testing Isolation:**
- Dev environment MUST include all test files and development tools
- Production environment MUST exclude development files

### 5. GitHub Actions Requirements

**Dual Deployment Strategy:**
- GitHub Actions MUST deploy from both `dev` and `main` branches
- Dev branch deployment MUST create development environment
- Main branch deployment MUST create production environment
- Both deployments MUST be automatic on push

**Environment Protection:**
- Repository environment protection rules MUST allow dev branch deployment
- GitHub Pages MUST be configured to use GitHub Actions (not branch deployment)

### 6. Team Collaboration Requirements

**Dev Environment Sharing:**
- Dev environment MUST be publicly accessible for team testing
- Team members MUST be able to test changes before production deployment
- Dev URL MUST work in any browser without GitHub login

**Documentation Requirements:**
- All deployment procedures MUST be documented
- Testing procedures MUST include both environments
- Rollback procedures MUST be clearly defined

## Rationale for Requirements

### Why Dev-First Deployment is Critical

1. **Production Safety**: Prevents untested code from reaching production users
2. **Team Collaboration**: Allows team members to test and validate changes
3. **Risk Mitigation**: Catches issues in a safe environment before production
4. **Quality Assurance**: Ensures thorough testing at each stage
5. **Professional Standards**: Follows industry best practices for deployment

### Why Separate Environments are Essential

1. **Data Integrity**: Prevents test data from contaminating production
2. **User Experience**: Production users never see development features or bugs
3. **Testing Accuracy**: Realistic testing environment that mirrors production
4. **Rollback Safety**: Can rollback dev without affecting production

## Compliance Verification

### Before Any Deployment
- [ ] Changes tested locally first
- [ ] Changes pushed to dev branch
- [ ] Dev environment tested thoroughly
- [ ] Team approval obtained (if required)
- [ ] No critical issues identified

### Before Production Deployment
- [ ] Dev testing completed successfully
- [ ] All functionality verified in dev environment
- [ ] Performance acceptable in dev environment
- [ ] Ready for production users

### Emergency Procedures
- [ ] Rollback procedures documented and tested
- [ ] Emergency contacts identified
- [ ] Incident response plan in place

## Non-Compliance Consequences

**Bypassing dev-first workflow:**
- Risk of production outages
- Potential data corruption
- Poor user experience
- Violation of professional development standards

**Direct production deployment:**
- Immediate rollback required
- Incident investigation needed
- Process review and correction

## Future Considerations

This requirement document MUST be:
- Referenced in all development decisions
- Updated when workflow changes are needed
- Reviewed by all team members
- Enforced through technical controls where possible

**Last Updated**: January 2025  
**Next Review**: As needed when workflow changes are proposed