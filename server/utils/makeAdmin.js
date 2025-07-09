const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node makeAdmin.js your-email@example.com');
      console.log('Example: node makeAdmin.js john.doe@gmail.com');
      return;
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('\n❌ No user found with email:', email);
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