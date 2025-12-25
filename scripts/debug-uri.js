const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

console.log('Full MONGODB_URI (check for issues):');
console.log(MONGODB_URI);
console.log('\n');

// Check for common issues
const issues = [];

// Check for quotes
if (MONGODB_URI.startsWith('"') || MONGODB_URI.startsWith("'")) {
  issues.push('❌ Has opening quote - remove quotes!');
}

if (MONGODB_URI.endsWith('"') || MONGODB_URI.endsWith("'")) {
  issues.push('❌ Has closing quote - remove quotes!');
}

// Check for spaces
if (MONGODB_URI.includes(' ')) {
  issues.push('❌ Contains spaces - remove all spaces!');
}

// Check format
if (!MONGODB_URI.startsWith('mongodb+srv://') && !MONGODB_URI.startsWith('mongodb://')) {
  issues.push('❌ Does not start with mongodb:// or mongodb+srv://');
}

// Check for @ symbol (should have username:password@)
const atIndex = MONGODB_URI.indexOf('@');
if (atIndex === -1) {
  issues.push('❌ Missing @ symbol (should have username:password@)');
} else {
  const beforeAt = MONGODB_URI.substring(0, atIndex);
  if (!beforeAt.includes(':')) {
    issues.push('❌ Missing : between username and password');
  }
}

// Check for cluster hostname
const afterAt = MONGODB_URI.substring(atIndex + 1);
const slashIndex = afterAt.indexOf('/');
const hostname = slashIndex > 0 ? afterAt.substring(0, slashIndex) : afterAt.split('?')[0];

console.log('Detected hostname:', hostname);
console.log('\n');

if (hostname.includes('123') && !hostname.includes('mongodb.net')) {
  issues.push('⚠️  Hostname contains "123" but not "mongodb.net" - this might be the issue!');
  console.log('The hostname should be something like: cluster0.xxxxx.mongodb.net');
  console.log('But you have:', hostname);
}

if (issues.length > 0) {
  console.log('Issues found:');
  issues.forEach(issue => console.log(issue));
} else {
  console.log('✅ No obvious formatting issues detected');
  console.log('\n💡 The connection string format looks okay.');
  console.log('💡 Make sure:');
  console.log('   1. Your MongoDB Atlas cluster is running');
  console.log('   2. Your IP address is whitelisted in MongoDB Atlas Network Access');
  console.log('   3. Your database user password is correct (URL-encode special characters)');
  console.log('   4. The cluster hostname is correct');
}

