#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Get the most recent commit message from staged changes
function getCommitMessage() {
  try {
    // Get the commit message from the commit that's being prepared
    // First check if there's a prepared commit message
    if (fs.existsSync('.git/COMMIT_EDITMSG')) {
      const message = fs.readFileSync('.git/COMMIT_EDITMSG', 'utf8').trim();
      if (message && !message.startsWith('#')) {
        return message;
      }
    }
    
    // If no prepared message, check the staged files description
    return execSync('git diff --staged --name-only').toString().trim();
  } catch (error) {
    console.error('Error getting commit information:', error);
    return '';
  }
}

// Parse current version from version.ts
function getCurrentVersion() {
  try {
    const versionFilePath = path.resolve('src/common/version.ts');
    const versionFile = fs.readFileSync(versionFilePath, 'utf8');
    
    const majorMatch = versionFile.match(/major:\s*(\d+)/);
    const minorMatch = versionFile.match(/minor:\s*(\d+)/);
    const patchMatch = versionFile.match(/patch:\s*(\d+)/);
    
    return {
      major: parseInt(majorMatch?.[1] || '1', 10),
      minor: parseInt(minorMatch?.[1] || '0', 10),
      patch: parseInt(patchMatch?.[1] || '0', 10)
    };
  } catch (error) {
    console.error('Error reading version file:', error);
    return { major: 1, minor: 0, patch: 0 };
  }
}

// Update version file
function updateVersionFile(version) {
  try {
    const versionFilePath = path.resolve('src/common/version.ts');
    const versionContent = `/**
 * Semantic versioning for the Moneybird MCP Server
 * Standard semver rules:
 * - fix: increment patch version (backwards-compatible bug fixes)
 * - feat: increment minor version (backwards-compatible features)
 * - major: manual upgrade only (breaking changes)
 */
export const VERSION = {
  major: ${version.major},
  minor: ${version.minor},
  patch: ${version.patch},
  toString: function() {
    return \`\${this.major}.\${this.minor}.\${this.patch}\`;
  }
};
`;
    fs.writeFileSync(versionFilePath, versionContent);
    console.log(`Updated version to ${version.major}.${version.minor}.${version.patch}`);
  } catch (error) {
    console.error('Error updating version file:', error);
  }
}

// Main function
function main() {
  const commitMsg = getCommitMessage();
  const currentVersion = getCurrentVersion();
  let newVersion = { ...currentVersion };
  
  // Don't update version if this is a version commit or no real commit is happening
  if (commitMsg.startsWith('chore: version') || !commitMsg) {
    console.log('No version update needed');
    return;
  }
  
  // Standard semver rules:
  // - fix: increment patch version (backwards-compatible bug fixes)
  // - feat: increment minor version (backwards-compatible features)
  // - major: manual upgrade only (breaking changes)
  if (commitMsg.toLowerCase().startsWith('feat:')) {
    newVersion.minor += 1;
    newVersion.patch = 0;
    console.log('Feature detected: incrementing MINOR version');
  } else if (commitMsg.toLowerCase().startsWith('fix:')) {
    newVersion.patch += 1;
    console.log('Fix detected: incrementing PATCH version');
  } else {
    // Default increment for other types of commits
    newVersion.patch += 1;
    console.log('Other commit: incrementing PATCH version');
  }
  
  // Only update if version actually changed
  if (newVersion.major !== currentVersion.major || 
      newVersion.minor !== currentVersion.minor || 
      newVersion.patch !== currentVersion.patch) {
    updateVersionFile(newVersion);
    
    // Also update package.json version
    try {
      const packagePath = path.resolve('package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      packageJson.version = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log(`Updated package.json version to ${packageJson.version}`);
    } catch (error) {
      console.error('Error updating package.json:', error);
    }
  } else {
    console.log('Version unchanged');
  }
}

main(); 