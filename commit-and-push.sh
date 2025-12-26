#!/bin/bash
# Script to commit all changes and push to GitHub
# Usage: ./commit-and-push.sh "Your commit message"

set -e

echo "🚀 Committing and pushing changes..."
echo ""

# Check if commit message provided
if [ -z "$1" ]; then
    echo "❌ Please provide a commit message"
    echo "Usage: ./commit-and-push.sh \"Your commit message\""
    exit 1
fi

COMMIT_MSG="$1"

# Check for changes
if [ -z "$(git status --porcelain)" ]; then
    echo "ℹ️  No changes to commit"
    exit 0
fi

# Show what will be committed
echo "📋 Changes to be committed:"
git status --short
echo ""

# Add all changes
echo "➕ Staging all changes..."
git add -A

# Commit
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

# Push
echo "📤 Pushing to GitHub..."
git push

echo ""
echo "✅ Successfully pushed to GitHub!"
echo "🌐 Vercel will automatically deploy in a few minutes"
echo "   Check: https://vercel.com/dashboard"

