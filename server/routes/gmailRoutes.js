const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Resume = require('../models/Resume');
const HR = require('../models/HR.JS');
const SentApplication = require('../models/SentApplication');

const sendGmailApi = require('../utils/sendGmailApi');
const { generateEmailUsingGemini } = require('../utils/generateEmailUsingGemini');

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

// 📤 SEND GMAIL API (Legacy)
router.post('/send', auth, async (req, res) => {
  try {
    const { hrId, source, resumeId } = req.body;

    if (!hrId || !source || !resumeId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get HR details
    const hr = await HR.findById(hrId);
    if (!hr) return res.status(404).json({ message: 'HR not found' });

    // Get resume
    const resume = await Resume.findById(resumeId);
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    // Fetch jobId from job link if active
    let jobId = null;
    if (source === 'active' && hr.jobLink) {
      const match = hr.jobLink.match(/jobs\/(\d+)/i);
      jobId = match ? match[1] : null;
    }

    const company = hr.company || 'the company';

    // 📩 Generate email body using Gemini API
    const { subject, body } = await generateEmailUsingGemini({
      resumeUrl: resume.fileUrl,
      role: resume.role,
      company,
      jobId,
      context: source,
    });

    // 📨 Send Email via Gmail API
    const { threadId, messageId } = await sendGmailApi({
      user: req.user,
      to: hr.email,
      subject,
      body,
      attachmentUrl: resume.fileUrl,
    });

    // 🗂 Save SentApplication
    const sent = await SentApplication.create({
      user: req.user._id,
      hrId,
      hrName: hr.name,
      hrEmail: hr.email,
      role: hr.role,
      company: hr.company,
      source,
      resumeId,
      threadId,
      messageId,
    });

    res.json({ message: 'Email sent successfully', threadId, messageId });
  } catch (err) {
    console.error('Gmail Send Error:', err);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

// 📤 SEND EMAIL WITH RESUME ATTACHMENT (now using Gmail API)
router.post('/send-email', auth, async (req, res) => {
  try {
    const { to, subject, body, resumeUrl, hrRole, hrData } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // If resumeUrl is provided, ensure it's a valid PDF URL
    let attachmentUrl = null;
    if (resumeUrl) {
      if (resumeUrl.toLowerCase().includes('.pdf') || resumeUrl.includes('application/pdf')) {
        attachmentUrl = resumeUrl;
      } else {
        console.warn('Invalid resume URL format:', resumeUrl);
      }
    }
    if (!attachmentUrl && hrRole) {
      try {
        const Resume = require('../models/Resume');
        const resume = await Resume.findOne({ user: req.user._id, role: hrRole });
        if (resume && resume.fileUrl) {
          attachmentUrl = resume.fileUrl;
        }
      } catch (resumeErr) {
        console.error('Error finding resume:', resumeErr);
      }
    }

    // 📨 Send Email via Gmail API with resume attachment
    const result = await sendGmailApi({
      user: req.user,
      to,
      subject,
      body,
      attachmentUrl: attachmentUrl,
    });

    // Try to save the sent application if we have HR data
    try {
      if (hrData) {
        const SentApplication = require('../models/SentApplication');
        await SentApplication.create({
          user: req.user._id,
          hrId: hrData._id, // Fix: include hrId
          hrName: hrData.name,
          hrEmail: to,
          role: hrData.role,
          company: hrData.company,
          source: 'active',
          threadId: result.threadId,
          messageId: result.id,
          status: 'Awaiting Reply', // Set status
        });
      }
    } catch (saveErr) {
      console.error('Error saving sent application:', saveErr);
    }

    res.json({
      message: 'Email sent successfully (via Gmail API)',
      threadId: result.threadId,
      messageId: result.id,
      hasAttachment: !!attachmentUrl,
      attachmentUrl: attachmentUrl
    });
  } catch (err) {
    console.error('Gmail API Send Email Error:', err);
    if (err.message && err.message.includes('not authorized with Gmail')) {
      return res.status(401).json({
        message: 'Gmail not authorized',
        error: 'Please authorize Gmail access first by visiting /api/auth/login',
        needsAuth: true
      });
    }
    res.status(500).json({
      message: 'Failed to send email',
      error: err.message
    });
  }
});

module.exports = router;
