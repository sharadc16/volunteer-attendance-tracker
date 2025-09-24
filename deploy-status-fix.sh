#!/bin/bash

# Deploy Status Fix Script
echo "🚀 Deploying status unification fix..."

# Check if we're in the right directory
if [ ! -f "js/status-unification-fix.js" ]; then
    echo "❌ Error: status-unification-fix.js not found. Make sure you're in the volunteer-attendance-tracker directory."
    exit 1
fi

# Add the fixed file to git
echo "📝 Adding fixed files to git..."
git add js/status-unification-fix.js
git add test-status-fix.html

# Commit the fix
echo "💾 Committing status fix..."
git commit -m "🔧 Fix status-unification-fix.js missing method error

- Added missing applyGlobalUnifiedStyling() method
- Fixed TypeError: this.applyUnifiedStyling is not a function
- Added test-status-fix.html for verification
- Status elements should now properly unify in single row"

# Push to deploy
echo "🚀 Pushing to dev branch..."
git push origin dev

echo "✅ Status fix deployed!"
echo "🔗 Test the fix at: https://dev--gurukul-attendance.netlify.app/"
echo "🧪 Test page: https://dev--gurukul-attendance.netlify.app/test-status-fix.html"