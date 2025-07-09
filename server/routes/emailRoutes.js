const express = require('express');
const router = express.Router();
const { sendEmail } = require('../controllers/emailController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

router.post('/send', auth, sendEmail);

module.exports = router;
