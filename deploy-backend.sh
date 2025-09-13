#!/bin/bash

# Quick deployment script for secure backend
# This deploys your credential API to Vercel

echo "🚀 Deploying Secure Credential Backend to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🔧 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Backend deployed! Now set your environment variables:"
echo ""
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your project"
echo "3. Go to Settings > Environment Variables"
echo "4. Add these variables:"
echo "   - GOOGLE_SHEETS_API_KEY"
echo "   - GOOGLE_OAUTH_CLIENT_ID"
echo "   - VOLUNTEER_SPREADSHEET_ID"
echo ""
echo "5. Update js/server-credential-manager.js with your Vercel URL"
echo ""
echo "🔒 Your API keys will be secure and never exposed to users!"