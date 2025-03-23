#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

// Update package.json
function updatePackageJson(version) {
  try {
    const packagePath = path.resolve('package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.version = `${version.major}.${version.minor}.${version.patch}`;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log(`Updated package.json version to ${packageJson.version}`);
  } catch (error) {
    console.error('Error updating package.json:', error);
  }
}

// Main function for major version upgrade
function main() {
  const currentVersion = getCurrentVersion();
  console.log(`Current version: ${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`);
  
  rl.question(`Are you sure you want to upgrade to version ${currentVersion.major + 1}.0.0? [y/N] `, (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const newVersion = {
        major: currentVersion.major + 1,
        minor: 0,
        patch: 0
      };
      
      updateVersionFile(newVersion);
      updatePackageJson(newVersion);
      
      // Commit the version change
      try {
        execSync('git add src/common/version.ts package.json');
        execSync(`git commit -m "chore: version bump to ${newVersion.major}.${newVersion.minor}.${newVersion.patch}"`);
        console.log('Changes committed to git');
      } catch (error) {
        console.error('Error committing version changes:', error);
      }
      
      console.log(`Successfully upgraded to version ${newVersion.major}.${newVersion.minor}.${newVersion.patch}`);
    } else {
      console.log('Major version upgrade cancelled');
    }
    rl.close();
  });
}

main(); 