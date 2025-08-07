#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Post-install script for seamless nodejs-assets setup
 * This ensures the Node.js runtime works out-of-the-box
 */

function findProjectRoot() {
    let currentDir = process.cwd();

    // Walk up to find the project root (where package.json with react-native exists)
    while (currentDir !== path.dirname(currentDir)) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.dependencies &&
                    (packageJson.dependencies['react-native'] ||
                        packageJson.devDependencies && packageJson.devDependencies['react-native'])) {
                    return currentDir;
                }
            } catch (e) {
                // Continue searching
            }
        }
        currentDir = path.dirname(currentDir);
    }

    return process.cwd(); // Fallback
}

const projectRoot = findProjectRoot();
const libNodejsAssets = path.join(__dirname, '..', 'nodejs-assets');
const targetNodejsAssets = path.join(projectRoot, 'nodejs-assets');

// Only show output if this is a React Native project
const packageJsonPath = path.join(projectRoot, 'package.json');
let isReactNativeProject = false;

if (fs.existsSync(packageJsonPath)) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        isReactNativeProject = !!(packageJson.dependencies && packageJson.dependencies['react-native']);
    } catch (e) {
        // Silent fail
    }
}

if (!isReactNativeProject) {
    // This might be a development install or non-RN project, skip silently
    process.exit(0);
}

console.log('🚀 React Native Consumet - Configuring Node.js runtime...');

try {
    // Check if nodejs-assets exists in the library
    if (!fs.existsSync(libNodejsAssets)) {
        // Silent fail for library development
        process.exit(0);
    }

    // Check if target already exists and is up to date
    if (fs.existsSync(targetNodejsAssets)) {
        console.log('✅ Node.js runtime ready');
        process.exit(0);
    }

    // Copy nodejs-assets to project root for react-native to find
    console.log('📦 Setting up Node.js runtime...');
    copyDirectory(libNodejsAssets, targetNodejsAssets);

    console.log('✅ Node.js runtime configured!');
    console.log('🎯 Ready to execute providers from GitHub URLs');

} catch (error) {
    // Silent fail to avoid breaking installations
    console.log('⚠️  Node.js runtime setup skipped');
}

/**
 * Recursively copy directory
 */
function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
