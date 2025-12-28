const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@patientassist.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI in .env.local');
  process.exit(1);
}

async function createAdmin() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('patient-assist');
    const usersCollection = db.collection('users');

    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ email: ADMIN_EMAIL });
    
    // Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    if (existingAdmin) {
      // Update existing admin credentials
      await usersCollection.updateOne(
        { email: ADMIN_EMAIL },
        {
          $set: {
            password: hashedPassword,
            role: 'admin',
            verified: true, // Admin users are automatically verified
            // Preserve other fields like name, profilePic, createdAt
          }
        }
      );
      console.log('Admin credentials updated successfully!');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
    } else {
      // Create new admin user
      const admin = {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
        profilePic: '',
        verified: true, // Admin users are automatically verified
        createdAt: new Date(),
      };

      await usersCollection.insertOne(admin);
      console.log('Admin user created successfully!');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await client.close();
  }
}

createAdmin();

