const express = require('express');
const router = express.Router();
const admin = require('../config/firebase');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const getIP = require('../utils/getIP');
const { v4: uuidv4 } = require('uuid');


router.post('/login', async (req, res) => {
  try {
    const { idToken, visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ message: "Device fingerprint required" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const googleId = decoded.uid;
    const email = decoded.email;

    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if this device already has a Free account in last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const existing = await User.findOne({
        fingerprintId: visitorId,
        plan: 'Free',
        createdAt: { $gte: sixMonthsAgo }
      });

      if (existing) {
        return res.status(403).json({ message: "❌ Free account already used on this device in the last 6 months" });
      }

      // Create new user
      user = await User.create({
        googleId,
        email,
        fingerprintId: visitorId,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.json({ message: "✅ Login successful", user });

  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid or expired Firebase token" });
  }
});


router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) throw new Error();
    res.json({ user });
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
});



module.exports = router;
