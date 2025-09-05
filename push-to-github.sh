#!/bin/bash

# AJAI Trading Platform - GitHub Push Script
# This script pushes your trading platform code to GitHub

echo "🚀 AJAI Trading Platform - GitHub Push Script"
echo "=============================================="

# Check if environment variables are set
if [ -z "$GITHUB_TOKEN" ] || [ -z "$GITHUB_REPO" ] || [ -z "$GITHUB_OWNER" ]; then
    echo "❌ Missing required environment variables:"
    echo "   GITHUB_TOKEN: ${GITHUB_TOKEN:+✅ Set}${GITHUB_TOKEN:-❌ Missing}"
    echo "   GITHUB_REPO: ${GITHUB_REPO:+✅ Set}${GITHUB_REPO:-❌ Missing}"
    echo "   GITHUB_OWNER: ${GITHUB_OWNER:+✅ Set}${GITHUB_OWNER:-❌ Missing}"
    echo ""
    echo "Please set these in your Replit Secrets first!"
    exit 1
fi

echo "📂 Repository: $GITHUB_OWNER/$GITHUB_REPO"
echo ""

# Function to run commands with error checking
run_command() {
    echo "📋 $2..."
    if $1; then
        echo "✅ $2 completed"
    else
        echo "❌ $2 failed"
        exit 1
    fi
    echo ""
}

# Check if git is initialized
if [ ! -d ".git" ]; then
    run_command "git init" "Initializing Git repository"
    run_command "git branch -M main" "Setting main branch"
else
    echo "✅ Git repository already initialized"
    echo ""
fi

# Configure git user
run_command "git config user.email 'action@github.com'" "Setting Git email"
run_command "git config user.name 'AJAI Bot'" "Setting Git username"

# Add remote origin with token authentication
REMOTE_URL="https://$GITHUB_TOKEN@github.com/$GITHUB_OWNER/$GITHUB_REPO.git"

# Remove existing origin if it exists
git remote remove origin 2>/dev/null || echo "ℹ️ No existing origin to remove"

run_command "git remote add origin $REMOTE_URL" "Adding GitHub remote"

# Add all files
run_command "git add ." "Adding all files"

# Check if there are changes to commit
if git diff-index --quiet HEAD --; then
    echo "ℹ️ No changes to commit"
    exit 0
fi

# Commit with detailed message
COMMIT_MSG="🚀 Update AJAI Trading Platform - $(date -u +%Y-%m-%dT%H:%M:%S)

🔧 Features:
- AI-powered trading signals with 85%+ confidence auto-execution  
- Real-time market data analysis and portfolio management
- News sentiment analysis and market impact predictions
- Advanced risk management and position tracking
- Interactive chat assistant (AJxAI) with trading insights
- Comprehensive dashboard with live market indicators

💻 Tech Stack:
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + PostgreSQL  
- AI: OpenAI API integration for market analysis
- Real-time: WebSocket connections for live updates
- Database: PostgreSQL with Drizzle ORM"

run_command "git commit -m \"$COMMIT_MSG\"" "Committing changes"

# Push to GitHub
run_command "git push -u origin main" "Pushing to GitHub"

echo "🎉 SUCCESS! Your AJAI Trading Platform has been pushed to GitHub!"
echo "🔗 Repository: https://github.com/$GITHUB_OWNER/$GITHUB_REPO"
echo "📊 View your code: https://github.com/$GITHUB_OWNER/$GITHUB_REPO/tree/main"
echo ""
echo "🚀 Your AI trading platform is now live on GitHub!"