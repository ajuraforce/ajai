#!/usr/bin/env python3

import os
import subprocess
import sys
from datetime import datetime

def run_command(command, description, cwd=None):
    """Run a command and handle errors"""
    print(f"📋 {description}...")
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            capture_output=True, 
            text=True,
            cwd=cwd or os.getcwd()
        )
        print(f"✅ {description} completed")
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        if e.stdout:
            print(f"Output: {e.stdout}")
        return None

def check_git_repo():
    """Check if git repository exists"""
    return os.path.exists('.git')

def push_to_github():
    """Main function to push code to GitHub"""
    
    print("🚀 AJAI Trading Platform - GitHub Push Script")
    print("=" * 50)
    
    # Get environment variables
    github_token = os.getenv('GITHUB_TOKEN')
    github_repo = os.getenv('GITHUB_REPO') 
    github_owner = os.getenv('GITHUB_OWNER')
    
    # Validate environment variables
    if not all([github_token, github_repo, github_owner]):
        print("❌ Missing required environment variables:")
        print(f"   GITHUB_TOKEN: {'✅ Set' if github_token else '❌ Missing'}")
        print(f"   GITHUB_REPO: {'✅ Set' if github_repo else '❌ Missing'}")
        print(f"   GITHUB_OWNER: {'✅ Set' if github_owner else '❌ Missing'}")
        print("\nPlease set these in your Replit Secrets!")
        return False
    
    print(f"📂 Repository: {github_owner}/{github_repo}")
    print()
    
    # Check if git is initialized
    if not check_git_repo():
        if run_command("git init", "Initializing Git repository") is None:
            return False
        if run_command("git branch -M main", "Setting main branch") is None:
            return False
    else:
        print("✅ Git repository already initialized")
        print()
    
    # Configure git user
    if run_command('git config user.email "ajai-bot@example.com"', "Setting Git email") is None:
        print("⚠️ Could not set git email, continuing...")
    
    if run_command('git config user.name "AJAI Bot"', "Setting Git username") is None:
        print("⚠️ Could not set git username, continuing...")
    
    # Remove existing origin if it exists
    subprocess.run("git remote remove origin", shell=True, capture_output=True)
    print("ℹ️ Removed existing origin (if any)")
    
    # Add remote origin with token authentication
    remote_url = f"https://{github_token}@github.com/{github_owner}/{github_repo}.git"
    if run_command(f'git remote add origin {remote_url}', "Adding GitHub remote") is None:
        return False
    
    # Add all files
    if run_command("git add .", "Adding all files") is None:
        return False
    
    # Check if there are changes to commit
    try:
        result = subprocess.run("git diff-index --quiet HEAD --", shell=True, check=True)
        print("ℹ️ No changes to commit")
        return True
    except subprocess.CalledProcessError:
        # There are changes to commit
        pass
    
    # Create detailed commit message
    timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S')
    commit_message = f"""🚀 AJAI Trading Platform Update - {timestamp}

🔧 Features:
- AI-powered trading signals with 85%+ confidence auto-execution
- Real-time market data analysis and portfolio management  
- News sentiment analysis and market impact predictions
- Advanced risk management and position tracking
- Interactive chat assistant (AJxAI) with trading insights
- Comprehensive dashboard with live market indicators
- Unified navigation system with seamless page routing

💻 Tech Stack:
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + PostgreSQL
- AI: OpenAI API integration for market analysis
- Real-time: WebSocket connections for live updates
- Database: PostgreSQL with Drizzle ORM
- UI: shadcn/ui + Radix UI components

🚀 Ready for deployment and live trading!"""
    
    # Commit changes
    if run_command(f'git commit -m "{commit_message}"', "Committing changes") is None:
        return False
    
    # Push to GitHub
    if run_command("git push -u origin main", "Pushing to GitHub") is None:
        print("⚠️ Push failed, trying force push...")
        if run_command("git push -f origin main", "Force pushing to GitHub") is None:
            return False
    
    print()
    print("🎉 SUCCESS! Your AJAI Trading Platform has been pushed to GitHub!")
    print(f"🔗 Repository: https://github.com/{github_owner}/{github_repo}")
    print(f"📊 View your code: https://github.com/{github_owner}/{github_repo}/tree/main")
    print()
    print("🚀 Your AI trading platform is now live on GitHub!")
    
    return True

if __name__ == "__main__":
    try:
        success = push_to_github()
        if not success:
            print("\n❌ Push to GitHub failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⛔ Push cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)