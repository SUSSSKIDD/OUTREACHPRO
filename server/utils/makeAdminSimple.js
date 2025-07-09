const mongoose = require('mongoose');
const User = require('../models/User');

async function makeAdmin() {
  try {
    // Direct MongoDB connection (for testing only)
    const MONGO_URI = 'mongodb+srv://Pratyush:proiscool911@cluster-outreachpro.5qd3i22.mongodb.net/';
    
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node makeAdminSimple.js your-email@example.com');
      console.log('Example: node makeAdminSimple.js pratyuh1234@gmail.com');
      return;
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('\n❌ No user found with email:', email);
      console.log('Make sure you have logged in at least once with this email.');
      return;
    }

    console.log('\n📋 Current user info:');
    console.log('Email:', user.email);
    console.log('Current Admin Status:', user.isAdmin);

    if (user.isAdmin) {
      console.log('\n✅ User is already an admin!');
      return;
    }

    // Update user to admin
    user.isAdmin = true;
    await user.save();

    console.log('\n🎉 Successfully made user an admin!');
    console.log('Email:', user.email);
    console.log('New Admin Status:', user.isAdmin);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

makeAdmin(); 