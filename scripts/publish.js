#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get the current version from version.ts
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

// Update package.json version to match version.ts
function syncPackageVersion() {
  try {
    const version = getCurrentVersion();
    const versionStr = `${version.major}.${version.minor}.${version.patch}`;
    
    // Update package.json
    const packagePath = path.resolve('package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (packageJson.version !== versionStr) {
      packageJson.version = versionStr;
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`Updated package.json version to ${versionStr}`);
      return true;
    } else {
      console.log(`Package.json version already at ${versionStr}`);
      return false;
    }
  } catch (error) {
    console.error('Error updating package.json version:', error);
    return false;
  }
}

// Build the package
function buildPackage() {
  try {
    console.log('Building package...');
    execSync('npm run build', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Error building package:', error);
    return false;
  }
}

// Publish to npm
function publishToNpm() {
  try {
    const version = getCurrentVersion();
    const versionStr = `${version.major}.${version.minor}.${version.patch}`;
    
    console.log(`Publishing version ${versionStr} to npm...`);
    
    // Check if user is logged in to npm
    try {
      execSync('npm whoami', { stdio: 'pipe' });
    } catch (error) {
      console.error('You are not logged in to npm. Please run `npm login` first.');
      return false;
    }
    
    // Publish the package
    execSync('npm publish', { stdio: 'inherit' });
    console.log(`Successfully published version ${versionStr} to npm!`);
    return true;
  } catch (error) {
    console.error('Error publishing to npm:', error);
    return false;
  }
}

// Main function
function main() {
  // Options parsing
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log(`Starting npm publish process${dryRun ? ' (dry run)' : ''}...`);
  
  // Sync package.json version with version.ts
  const versionChanged = syncPackageVersion();
  
  // Always build the package to ensure it's up to date
  if (!buildPackage()) {
    console.error('Failed to build package. Aborting publish.');
    process.exit(1);
  }
  
  // Publish to npm if not a dry run
  if (!dryRun) {
    if (publishToNpm()) {
      console.log('Publish completed successfully!');
    } else {
      console.error('Publish failed.');
      process.exit(1);
    }
  } else {
    console.log('Dry run complete. Package would have been published.');
  }
}

// Run the main function
main(); 