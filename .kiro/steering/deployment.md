# Deployment Context for Volunteer Attendance Tracker

## Current Deployment Architecture

This project uses a **dual-target deployment system**:

- **Dev Branch** → **Netlify** (Development) - Temporary URLs for testing
- **Main Branch** → **GitHub Pages** (Production) - Stable URL for users

## Key URLs

- **Production**: https://sharadc16.github.io/volunteer-attendance-tracker/
- **Development**: `https://dev-[commit-hash]--your-site-name.netlify.app` (temporary)

## Deployment Workflow

### For Development Testing
```bash
git checkout dev
# make changes
git add . && git commit -m "feat: changes"
git push origin dev  # → Deploys to Netlify
```

### For Production Release
```bash
git checkout main
git merge dev
git push origin main  # → Deploys to GitHub Pages
```

## Important Notes

- **Never push directly to main** without testing in dev first
- **Production URL is stable** and used by actual volunteers
- **Dev deployments are temporary** and safe for testing
- **No conflicts** between environments - completely separated
- **GitHub Actions handles all deployments** automatically

## Files Reference

- Workflow: `.github/workflows/deploy-simple.yml`
- Full docs: `DEPLOYMENT_REFERENCE.md`
- Setup guide: `GITHUB_ACTIONS_SETUP.md`
- Workflow guide: `DEPLOYMENT_WORKFLOW.md`

#[[file:DEPLOYMENT_REFERENCE.md]]