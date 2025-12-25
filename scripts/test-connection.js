const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('Checking environment variables...');
console.log('MONGODB_URI exists:', !!MONGODB_URI);
console.log('MONGODB_URI length:', MONGODB_URI ? MONGODB_URI.length : 0);
console.log('MONGODB_URI starts with mongodb:', MONGODB_URI ? MONGODB_URI.startsWith('mongodb') : false);

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env.local');
  process.exit(1);
}

// Show first and last 20 characters (to avoid exposing full password)
if (MONGODB_URI.length > 40) {
  console.log('MONGODB_URI preview:', MONGODB_URI.substring(0, 30) + '...' + MONGODB_URI.substring(MONGODB_URI.length - 20));
} else {
  console.log('MONGODB_URI:', MONGODB_URI);
}

// Check for common issues
if (MONGODB_URI.includes(' ')) {
  console.warn('⚠️  WARNING: MONGODB_URI contains spaces. Remove any spaces!');
}

if (MONGODB_URI.startsWith('"') || MONGODB_URI.startsWith("'")) {
  console.warn('⚠️  WARNING: MONGODB_URI appears to have quotes. Remove quotes from .env.local!');
}

if (MONGODB_URI.endsWith('"') || MONGODB_URI.endsWith("'")) {
  console.warn('⚠️  WARNING: MONGODB_URI appears to have quotes. Remove quotes from .env.local!');
}

// Try to connect
async function testConnection() {
  const client = new MongoClient(MONGODB_URI.trim());
  
  try {
    console.log('\nAttempting to connect to MongoDB...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test a simple operation
    const db = client.db('patient-assist');
    const collections = await db.listCollections().toArray();
    console.log('✅ Database access successful!');
    console.log('Collections found:', collections.length);
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.message.includes('authentication')) {
      console.error('\n💡 Tip: Check your username and password in the connection string');
    }
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Tip: Check your cluster hostname in the connection string');
      console.error('💡 Tip: Make sure your IP is whitelisted in MongoDB Atlas Network Access');
    }
  } finally {
    await client.close();
  }
}

testConnection();

