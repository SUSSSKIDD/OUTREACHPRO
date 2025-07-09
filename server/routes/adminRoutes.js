
console.log("adminRoutes loaded");

const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { authAdmin } = require('../middlewares/authAdmin');
const HR = require('../models/HR.JS');
const User = require('../models/User');

const upload = multer({ dest: 'uploads/' });

// Check admin status
router.get('/status', authAdmin, (req, res) => {
  res.json({ 
    message: 'Admin access confirmed',
    user: {
      email: req.user.email,
      isAdmin: req.user.isAdmin
    }
  });
});

// Get all admin users
router.get('/admins', authAdmin, async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true }, 'email');
    res.json({ 
      admins: admins.map(admin => admin.email),
      count: admins.length
    });
  } catch (err) {
    console.error('Get admins error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch admin list',
      error: err.message 
    });
  }
});

// Make user admin by email
router.post('/make-admin', authAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    if (user.isAdmin) {
      return res.status(400).json({ message: 'User is already an admin' });
    }

    user.isAdmin = true;
    await user.save();

    res.json({ 
      message: `Successfully made ${email} an admin`,
      user: {
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error('Make admin error:', err);
    res.status(500).json({ 
      message: 'Failed to make user admin',
      error: err.message 
    });
  }
});

// Admin-only route to upload CSV
router.post('/upload', authAdmin, upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    // Check file type
    if (!req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ message: 'Only CSV files are allowed' });
    }

    const results = [];
    const filePath = path.join(__dirname, '..', req.file.path);

    // Read CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Validate required fields
        if (row.name && row.email && row.jobLink && row.role) {
          results.push({
            name: row.name.trim(),
            email: row.email.trim(),
            position: row.position ? row.position.trim() : '',
            company: row.company ? row.company.trim() : '',
            jobLink: row.jobLink.trim(),
            role: row.role.trim(),
            addedAt: new Date()
          });
        }
      })
      .on('end', async () => {
        try {
          if (results.length === 0) {
            return res.status(400).json({ 
              message: 'No valid records found. CSV must have: name, email, jobLink, role' 
            });
          }

          const target = req.body.target; // 'active' or 'hr'

          if (target === 'active' || target === 'hr') {
            await HR.insertMany(results);
            
            // Clean up temp file
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            
            res.json({ 
              message: 'Upload successful', 
              count: results.length,
              target: target 
            });
          } else {
            return res.status(400).json({ message: 'Invalid target specified' });
          }
        } catch (err) {
          console.error('Database error:', err);
          
          // Clean up temp file on error
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          res.status(500).json({ 
            message: 'Upload failed. Check CSV format and try again.',
            error: err.message 
          });
        }
      })
      .on('error', (err) => {
        console.error('CSV parsing error:', err);
        
        // Clean up temp file on error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        res.status(500).json({ 
          message: 'Invalid CSV file format',
          error: err.message 
        });
      });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      message: 'Upload failed',
      error: err.message 
    });
  }
});

module.exports = router;
