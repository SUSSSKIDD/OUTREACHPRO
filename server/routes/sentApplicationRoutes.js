const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SentApplication = require('../models/SentApplication');
const User = require('../models/User');

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Save sent application
router.post('/log', auth, async (req, res) => {
  try {
    const {
      hrName, hrEmail, role, resumeUsed,
      threadId, messageId, status
    } = req.body;

    const app = await SentApplication.create({
      user: req.user._id,
      hrName,
      hrEmail,
      role,
      resumeUsed,
      status: status || 'Not Applied', // Default to 'Not Applied' if not provided
      threadId,
      messageId
    });

    res.json({ message: "Application logged", app });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to log application" });
  }
});

// Manually log application with Not Applied status
router.post('/log-not-applied', auth, async (req, res) => {
  try {
    const {
      hrName, hrEmail, role, company, source, resumeId
    } = req.body;

    if (!hrName || !hrEmail || !role) {
      return res.status(400).json({ message: "Missing required fields: hrName, hrEmail, role" });
    }

    const app = await SentApplication.create({
      user: req.user._id,
      hrId: null, // No specific HR record
      hrName,
      hrEmail,
      role,
      company,
      source: source || 'manual',
      resumeId,
      status: 'Not Applied', // Explicitly set to Not Applied
      sentAt: new Date()
    });

    res.json({ message: "Not Applied application logged", app });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to log application" });
  }
});

// Get user’s applications
router.get('/my', auth, async (req, res) => {
  try {
    const apps = await SentApplication.find({ user: req.user._id }).sort({ sentAt: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

module.exports = router;
