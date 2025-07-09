// server/routes/hrRoutes.js
const express = require('express');
const router = express.Router();
const HR = require('../models/HR.JS');

router.get('/active', async (req, res) => {
  try {
    const activeHRs = await HR.find(); // optionally filter based on link validation
    res.json(activeHRs);
  } catch (err) {
    console.error("Error fetching HRs:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
