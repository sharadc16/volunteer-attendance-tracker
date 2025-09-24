#!/usr/bin/env node

/**
 * Netlify Build-Time Environment Variable Injection
 * 
 * This script runs during Netlify build process to inject environment variables
 * into the client-side JavaScript code securely.
 * 
 * Usage: Add to netlify.toml as a build command
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting Netlify environment variable injection...');

// Environment variables to inject (these should be set in Netlify dashboard)
const envVars = {
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_SHEETS_API_KEY: process.env.GOOGLE_SHEETS_API_KEY,
  VOLUNTEER_SPREADSHEET_ID: process.env.VOLUNTEER_SPREADSHEET_ID
};

// Filter out undefined values
const definedVars = Object.entries(envVars).filter(([key, value]) => value !== undefined);

if (definedVars.length === 0) {
  console.log('⚠️  No environment variables found. Using fallback to local-env.js');
  console.log('   Make sure to set the following in Netlify dashboard:');
  console.log('   - GOOGLE_OAUTH_CLIENT_ID');
  console.log('   - GOOGLE_SHEETS_API_KEY');
  console.log('   - VOLUNTEER_SPREADSHEET_ID (optional)');
  process.exit(0);
}

// Generate the environment injection script
const envScript = `/**
 * Netlify Build-Time Environment Variables
 * Generated automatically during build process
 * DO NOT EDIT - This file is overwritten on each build
 */

// Netlify environment variables (injected at build time)
${definedVars.map(([key, value]) => {
  // Mask the value for logging but inject the full value
  const maskedValue = key.includes('KEY') ? 
    (value.substring(0, 8) + '...') : 
    (value.length > 20 ? value.substring(0, 20) + '...' : value);
  
  return `window.${key} = '${value}'; // ${maskedValue}`;
}).join('\n')}

// Mark as Netlify injected
window.ENV_INJECTED = true;
window.ENV_NETLIFY = true;
window.ENV_INJECTION_TIME = '${new Date().toISOString()}';

console.log('🌐 Netlify environment variables loaded');
console.log('📊 Variables injected:', ${definedVars.length});
console.log('🔐 Using production credentials from Netlify');
`;

// Write the environment script
const envScriptPath = path.join(__dirname, 'js', 'netlify-env.js');
fs.writeFileSync(envScriptPath, envScript);

console.log(`✅ Environment variables injected successfully`);
console.log(`📁 Generated: ${envScriptPath}`);
console.log(`📊 Variables: ${definedVars.map(([key]) => key).join(', ')}`);

// Update index.html to include the Netlify environment script
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Remove existing netlify-env.js script if present
indexContent = indexContent.replace(/<script src="js\/netlify-env\.js"><\/script>\s*/g, '');

// Add netlify-env.js script before local-env.js (higher priority)
if (indexContent.includes('<script src="js/local-env.js"></script>')) {
  indexContent = indexContent.replace(
    '<script src="js/local-env.js"></script>',
    '<script src="js/netlify-env.js"></script>\n    <script src="js/local-env.js"></script>'
  );
  
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Updated index.html to include netlify-env.js');
} else {
  console.log('⚠️  Could not find local-env.js script tag in index.html');
}

// Also create a backup method - update local-env.js to check for Netlify env first
const localEnvPath = path.join(__dirname, 'js', 'local-env.js');
let localEnvContent = fs.readFileSync(localEnvPath, 'utf8');

// Add Netlify environment check at the top
const netlifyCheck = `
// Check for Netlify environment variables first (higher priority)
if (typeof process !== 'undefined' && process.env) {
  if (process.env.GOOGLE_SHEETS_API_KEY) {
    window.GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    console.log('🌐 Using GOOGLE_SHEETS_API_KEY from Netlify environment');
  }
  if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
    window.GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
    console.log('🌐 Using GOOGLE_OAUTH_CLIENT_ID from Netlify environment');
  }
  if (process.env.VOLUNTEER_SPREADSHEET_ID) {
    window.VOLUNTEER_SPREADSHEET_ID = process.env.VOLUNTEER_SPREADSHEET_ID;
    console.log('🌐 Using VOLUNTEER_SPREADSHEET_ID from Netlify environment');
  }
}

`;

// Only add if not already present
if (!localEnvContent.includes('Check for Netlify environment variables first')) {
  localEnvContent = netlifyCheck + localEnvContent;
  fs.writeFileSync(localEnvPath, localEnvContent);
  console.log('✅ Updated local-env.js with Netlify environment check');
}

console.log('🚀 Netlify environment injection complete!');