const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI in .env.local');
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function deleteAdmin() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db('patient-assist');
    const usersCollection = db.collection('users');

    // List all admin accounts
    const admins = await usersCollection.find({ role: 'admin' }).toArray();
    
    if (admins.length === 0) {
      console.log('No admin accounts found in the database.');
      return;
    }

    console.log('Current admin accounts:');
    console.log('======================');
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Email: ${admin.email}`);
      console.log(`   Name: ${admin.name || 'N/A'}`);
      console.log(`   Created: ${admin.createdAt ? new Date(admin.createdAt).toLocaleString() : 'N/A'}`);
      console.log('');
    });

    // Ask which admin to delete
    const emailToDelete = await question('Enter the email of the admin account to delete: ');
    
    if (!emailToDelete || !emailToDelete.trim()) {
      console.log('No email provided. Exiting...');
      return;
    }

    // Find the admin
    const adminToDelete = await usersCollection.findOne({ 
      email: emailToDelete.trim(),
      role: 'admin' 
    });

    if (!adminToDelete) {
      console.log(`\nAdmin account with email "${emailToDelete.trim()}" not found.`);
      return;
    }

    // Confirm deletion
    console.log(`\nAdmin account found:`);
    console.log(`  Email: ${adminToDelete.email}`);
    console.log(`  Name: ${adminToDelete.name || 'N/A'}`);
    
    const confirm = await question('\nAre you sure you want to delete this admin account? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('Deletion cancelled.');
      return;
    }

    // Delete the admin
    const result = await usersCollection.deleteOne({ 
      email: emailToDelete.trim(),
      role: 'admin' 
    });

    if (result.deletedCount === 1) {
      console.log(`\n✅ Admin account "${emailToDelete.trim()}" deleted successfully!`);
      
      // Show remaining admins
      const remainingAdmins = await usersCollection.find({ role: 'admin' }).toArray();
      if (remainingAdmins.length > 0) {
        console.log('\nRemaining admin accounts:');
        remainingAdmins.forEach(admin => {
          console.log(`  - ${admin.email}`);
        });
      } else {
        console.log('\n⚠️  Warning: No admin accounts remaining in the database!');
        console.log('   You will need to create a new admin account to access the admin dashboard.');
      }
    } else {
      console.log(`\n❌ Failed to delete admin account.`);
    }

  } catch (error) {
    console.error('Error deleting admin:', error);
  } finally {
    rl.close();
    await client.close();
  }
}

deleteAdmin();

