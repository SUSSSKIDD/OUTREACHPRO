const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Resume = require('../models/Resume');
const HR = require('../models/HR.JS');
const SentApplication = require('../models/SentApplication');

const sendGmailApi = require('../utils/sendGmailApi');
const { generateEmailUsingGemini } = require('../utils/generateEmailUsingGemini');
const { google } = require('googleapis');

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

// Fetch all messages in a Gmail thread
router.get('/thread/:threadId', async (req, res) => {
  const { threadId } = req.params;
  try {
    // Find the SentApplication to get the user
    const SentApplication = require('../models/SentApplication');
    const app = await SentApplication.findOne({ threadId }).populate('user');
    if (!app || !app.user) {
      return res.status(404).json({ message: 'Application or user not found' });
    }
    if (!app.user.gmailAccess?.refreshToken) {
      return res.status(403).json({ message: 'User not authorized with Gmail' });
    }
    // Set up OAuth2 client
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: app.user.gmailAccess.refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    // Fetch the thread
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId });
    // Parse messages
    const messages = (thread.data.messages || []).map(msg => {
      const headers = msg.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      let text = '';
      if (msg.payload.parts) {
        // Find the plain text part
        const part = msg.payload.parts.find(p => p.mimeType === 'text/plain');
        if (part && part.body && part.body.data) {
          text = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      } else if (msg.payload.body && msg.payload.body.data) {
        text = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
      }
      return { from, text };
    });
    res.json({ messages });
  } catch (err) {
    console.error('Error fetching thread:', err);
    res.status(500).json({ message: 'Failed to fetch thread' });
  }
});

// Gmail Push Notification Webhook
router.post('/webhook', async (req, res) => {
  const notification = req.body;
  if (!notification) {
    return res.status(400).send('No notification payload');
  }
  console.log('Received Gmail webhook notification:', notification);

  // --- DEMO LOGIC: Simulate finding user/thread and updating status ---
  // In real implementation, extract threadId and user info from notification or Gmail API
  const threadId = notification.threadId || 'SIMULATED_THREAD_ID'; // Replace with real extraction
  const userId = notification.userId || 'SIMULATED_USER_ID'; // Replace with real extraction
  const hrName = notification.hrName || 'HR Name'; // Replace with real extraction

  // Update SentApplication status
  if (threadId !== 'SIMULATED_THREAD_ID') {
    await require('../models/SentApplication').findOneAndUpdate(
      { threadId },
      { status: 'Got a Reply' }
    );
  }

  // Emit socket.io event to user
  const io = req.app.get('io');
  if (userId !== 'SIMULATED_USER_ID') {
    io.to(userId).emit('hr-reply', { threadId, hrName });
  }

  res.status(200).send('OK');
});

module.exports = router;
