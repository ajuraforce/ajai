#!/usr/bin/env python3

import os
import requests
import base64
import json
from pathlib import Path

def get_file_content(file_path):
    """Read file content and encode it"""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        return base64.b64encode(content).decode('utf-8')
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return None

def should_ignore_file(file_path):
    """Check if file should be ignored based on .gitignore patterns"""
    ignore_patterns = [
        'node_modules/', '.git/', '.env', '*.log', 'dist/', 'build/',
        '.DS_Store', '*.tar.gz', '.cache/', '.vscode/', '.idea/',
        '__pycache__/', '*.pyc', '.replit', 'repl.nix'
    ]
    
    file_str = str(file_path)
    for pattern in ignore_patterns:
        if pattern.endswith('/'):
            if f'/{pattern[:-1]}/' in file_str or file_str.startswith(pattern[:-1] + '/'):
                return True
        elif pattern.startswith('*.'):
            if file_str.endswith(pattern[1:]):
                return True
        elif pattern in file_str:
            return True
    return False

def create_or_update_file(owner, repo, token, file_path, content, message):
    """Create or update a file in GitHub repository"""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    # Check if file exists
    response = requests.get(url, headers=headers)
    
    data = {
        'message': message,
        'content': content,
        'branch': 'main'
    }
    
    if response.status_code == 200:
        # File exists, need SHA for update
        file_info = response.json()
        data['sha'] = file_info['sha']
    
    # Create or update file
    response = requests.put(url, headers=headers, json=data)
    return response.status_code in [200, 201]

def push_to_github():
    """Push all files to GitHub using GitHub API"""
    
    print("🚀 AJAI Trading Platform - GitHub API Push")
    print("=" * 50)
    
    # Get environment variables
    github_token = os.getenv('GITHUB_TOKEN')
    github_repo = os.getenv('GITHUB_REPO')
    github_owner = os.getenv('GITHUB_OWNER')
    
    if not all([github_token, github_repo, github_owner]):
        print("❌ Missing required environment variables!")
        return False
    
    print(f"📂 Repository: {github_owner}/{github_repo}")
    print()
    
    # Create repository if it doesn't exist
    create_repo_url = f"https://api.github.com/user/repos"
    create_headers = {
        'Authorization': f'token {github_token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    repo_data = {
        'name': github_repo,
        'description': '🚀 AJAI - AI-Powered Trading Platform with Real-time Market Analysis',
        'private': False,
        'auto_init': True
    }
    
    print("📋 Checking/creating repository...")
    create_response = requests.post(create_repo_url, headers=create_headers, json=repo_data)
    if create_response.status_code == 201:
        print("✅ Repository created successfully")
    elif create_response.status_code == 422:
        print("✅ Repository already exists")
    else:
        print("✅ Repository accessible")
    
    # Get all files in the project
    project_root = Path(".")
    all_files = []
    
    for file_path in project_root.rglob("*"):
        if file_path.is_file() and not should_ignore_file(file_path):
            relative_path = file_path.relative_to(project_root)
            all_files.append(relative_path)
    
    print(f"📋 Found {len(all_files)} files to upload...")
    print()
    
    # Upload files
    success_count = 0
    total_files = len(all_files)
    
    for i, file_path in enumerate(all_files, 1):
        print(f"📤 Uploading ({i}/{total_files}): {file_path}")
        
        content = get_file_content(file_path)
        if content is None:
            continue
            
        github_path = str(file_path).replace('\\', '/')
        message = f"Update {github_path}"
        
        if create_or_update_file(github_owner, github_repo, github_token, github_path, content, message):
            success_count += 1
            print(f"  ✅ Uploaded successfully")
        else:
            print(f"  ❌ Upload failed")
    
    print()
    print(f"🎉 Upload complete! {success_count}/{total_files} files uploaded successfully")
    print(f"🔗 Repository: https://github.com/{github_owner}/{github_repo}")
    print(f"📊 View your code: https://github.com/{github_owner}/{github_repo}")
    print()
    print("🚀 Your AJAI Trading Platform is now live on GitHub!")
    
    return success_count > 0

if __name__ == "__main__":
    try:
        success = push_to_github()
        if not success:
            print("\n❌ Upload to GitHub failed!")
            exit(1)
    except KeyboardInterrupt:
        print("\n⛔ Upload cancelled by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        exit(1)