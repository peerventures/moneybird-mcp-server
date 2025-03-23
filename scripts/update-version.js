#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Get the most recent commit message
function getLatestCommitMessage() {
  try {
    return execSync('git log -1 --pretty=%B').toString().trim();
  } catch (error) {
    console.error('Error getting commit message:', error);
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
 * Custom rules:
 * - fix: increment minor version
 * - feat: increment major version
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
  const commitMsg = getLatestCommitMessage();
  const currentVersion = getCurrentVersion();
  let newVersion = { ...currentVersion };
  
  // According to custom rules:
  // - fix: increment minor version
  // - feat: increment major version
  if (commitMsg.toLowerCase().startsWith('feat:')) {
    newVersion.major += 1;
    newVersion.minor = 0;
    newVersion.patch = 0;
    console.log('Feature detected: incrementing MAJOR version');
  } else if (commitMsg.toLowerCase().startsWith('fix:')) {
    newVersion.minor += 1;
    newVersion.patch = 0;
    console.log('Fix detected: incrementing MINOR version');
  } else {
    // Default to patch increment for other types of commits
    newVersion.patch += 1;
    console.log('Other commit: incrementing PATCH version');
  }
  
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
}

main(); 