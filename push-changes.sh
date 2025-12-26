#!/bin/bash
# Script to push changes to GitHub

echo "🚀 Pushing changes to GitHub..."
echo ""

# Check if changes are committed
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Committing them now..."
    git add -A
    git commit -m "Update: Mobile responsiveness and layout improvements"
fi

# Try to push
echo "📤 Pushing to GitHub..."
git push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Vercel should automatically deploy in a few minutes."
else
    echo ""
    echo "❌ Push failed. You may need to:"
    echo "   1. Use a Personal Access Token (not password)"
    echo "   2. Or set up SSH keys"
    echo ""
    echo "Get a token at: https://github.com/settings/tokens"
fi

