const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function findUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Replace 'your-email@example.com' with your actual email
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node findUser.js your-email@example.com');
      console.log('Example: node findUser.js john.doe@gmail.com');
      return;
    }

    const user = await User.findOne({ email });
    
    if (user) {
      console.log('\n✅ User found:');
      console.log('ID:', user._id);
      console.log('Email:', user.email);
      console.log('Google ID:', user.googleId);
      console.log('Plan:', user.plan);
      console.log('Is Admin:', user.isAdmin);
      console.log('Created:', user.createdAt);
    } else {
      console.log('\n❌ No user found with email:', email);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

findUser(); 