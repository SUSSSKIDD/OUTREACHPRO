const express = require('express');
const { google } = require('googleapis');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Step 1: Redirect user to Google consent screen
router.get('/login', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });

  res.redirect(url);
});

// Step 2: Google redirects here after user gives consent
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    console.log('Google OAuth callback received with code:', code ? 'present' : 'missing');
    
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Tokens received:', {
      access_token: tokens.access_token ? 'present' : 'missing',
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
      expiry_date: tokens.expiry_date
    });
    
    oauth2Client.setCredentials(tokens);

    const gmail = google.oauth2({ version: 'v2', auth: oauth2Client });
    const profile = await gmail.userinfo.get();
    
    console.log('Google profile received:', {
      email: profile.data.email,
      id: profile.data.id
    });

    // Find existing user by Google ID or email
    let user = await User.findOne({ 
      $or: [
        { googleId: profile.data.id },
        { email: profile.data.email }
      ]
    });

    if (user) {
      console.log('Found existing user:', user.email);
      
      // Update existing user with Gmail tokens
      user.gmailAccess = {
        token: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };
      
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = profile.data.id;
      }
      
      await user.save();
      console.log('Updated existing user with Gmail tokens');
    } else {
      console.log('Creating new user');
      
      // Create new user
      user = await User.create({
        googleId: profile.data.id,
        email: profile.data.email,
        fingerprintId: 'temp-fingerprint', // You might want to generate this properly
        gmailAccess: {
          token: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }
      });
      
      console.log('Created new user with Gmail tokens');
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    });

    console.log('OAuth successful, redirecting to profile page');
    res.redirect('http://localhost:5173/profile'); // redirect to frontend
  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).send('OAuth failed: ' + err.message);
  }
});

module.exports = router;
