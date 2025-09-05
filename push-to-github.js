#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Get environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_OWNER = process.env.GITHUB_OWNER;

// Validate environment variables
if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
  console.error('❌ Missing required environment variables:');
  console.error('   GITHUB_TOKEN:', !!GITHUB_TOKEN ? '✅ Set' : '❌ Missing');
  console.error('   GITHUB_REPO:', !!GITHUB_REPO ? '✅ Set' : '❌ Missing'); 
  console.error('   GITHUB_OWNER:', !!GITHUB_OWNER ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

console.log('🚀 Starting GitHub push process...');
console.log(`📂 Repository: ${GITHUB_OWNER}/${GITHUB_REPO}`);

function runCommand(command, description) {
  try {
    console.log(`\n📋 ${description}...`);
    const result = execSync(command, { 
      stdio: 'pipe', 
      encoding: 'utf-8',
      cwd: process.cwd()
    });
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(error.message);
    if (error.stdout) console.error('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
    throw error;
  }
}

async function pushToGitHub() {
  try {
    // Check if git is initialized
    const isGitRepo = fs.existsSync('.git');
    
    if (!isGitRepo) {
      runCommand('git init', 'Initializing Git repository');
      runCommand('git branch -M main', 'Setting main branch');
    } else {
      console.log('✅ Git repository already initialized');
    }

    // Configure git user (for commits)
    try {
      runCommand('git config user.email "action@github.com"', 'Setting Git email');
      runCommand('git config user.name "AJAI Bot"', 'Setting Git username');
    } catch (error) {
      console.log('ℹ️ Git config already set or failed to set');
    }

    // Add remote origin with token authentication
    const remoteUrl = `https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;
    
    try {
      runCommand('git remote remove origin', 'Removing existing origin');
    } catch (error) {
      console.log('ℹ️ No existing origin to remove');
    }
    
    runCommand(`git remote add origin ${remoteUrl}`, 'Adding GitHub remote');

    // Add all files (respecting .gitignore)
    runCommand('git add .', 'Adding all files');

    // Check if there are any changes to commit
    try {
      const status = runCommand('git status --porcelain', 'Checking Git status');
      if (!status.trim()) {
        console.log('ℹ️ No changes to commit');
        return;
      }
    } catch (error) {
      // Continue if status check fails
    }

    // Commit changes
    const commitMessage = `🚀 Update AJAI Trading Platform - ${new Date().toISOString()}

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
- Database: PostgreSQL with Drizzle ORM`;

    runCommand(`git commit -m "${commitMessage}"`, 'Committing changes');

    // Push to GitHub
    runCommand('git push -u origin main', 'Pushing to GitHub');

    console.log('\n🎉 SUCCESS! Your AJAI Trading Platform has been pushed to GitHub!');
    console.log(`🔗 Repository: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`);
    console.log(`📊 View your code: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/tree/main`);

  } catch (error) {
    console.error('\n❌ Push to GitHub failed:', error.message);
    process.exit(1);
  }
}

// Run the push process
pushToGitHub();