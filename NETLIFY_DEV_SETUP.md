# Netlify Development Deployment Setup

## 🎯 Current Status

Your GitHub Actions workflow is configured to deploy the `dev` branch to Netlify, but you may need to set up the secrets.

## 🔧 Setup Steps

### 1. Get Netlify Credentials

**If you have a Netlify account:**
1. Go to https://app.netlify.com
2. Go to **User settings** → **Applications** → **Personal access tokens**
3. Create a new token and copy it

**If you don't have Netlify:**
1. Sign up at https://netlify.com (free)
2. Create a new site (can be empty for now)
3. Get your Site ID from **Site settings** → **General** → **Site details**

### 2. Add GitHub Secrets

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `NETLIFY_AUTH_TOKEN` - Your personal access token
   - `NETLIFY_SITE_ID` - Your site ID from Netlify

### 3. Trigger Deployment

After adding secrets:
1. Make a small change to dev branch (or re-run the workflow)
2. Push to trigger deployment
3. Check the Actions tab for deployment status
4. Look for the deployment URL in the commit comments

## 🌐 Alternative: Manual Netlify Deploy

If you prefer manual deployment:

1. **Download the build artifact:**
   - Go to GitHub Actions → Latest dev workflow
   - Download the "development-build" artifact
   - Extract the files

2. **Deploy to Netlify:**
   - Go to https://app.netlify.com
   - Drag and drop the extracted folder
   - Get your deployment URL

## 🎯 Expected Dev URL Format

Once configured, your dev deployments will be available at:
```
https://dev-[commit-hash]--[your-site-name].netlify.app
```

For your latest commit (6596ba2):
```
https://dev-6596ba2--gurukul-attendance.netlify.app
```