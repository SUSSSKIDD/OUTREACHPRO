const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Resume = require('../models/Resume');
const { generateEmailUsingGemini } = require('../utils/generateEmailUsingGemini');
const pdfParse = require('pdf-parse');
const axios = require('axios');

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

// Generate email using Gemini
router.post('/generate-email', auth, async (req, res) => {
  try {
    const { hr, source } = req.body;

    if (!hr || !hr.name || !hr.email) {
      return res.status(400).json({ message: 'Invalid HR data provided' });
    }

    // Find the user's resume for this role
    const resume = await Resume.findOne({ 
      user: req.user._id, 
      role: hr.role 
    });

    let resumeText = '';
    if (resume && resume.fileUrl) {
      try {
        console.log('Fetching resume from:', resume.fileUrl);
        // Fetch PDF from S3
        const pdfResponse = await axios.get(resume.fileUrl, {
          responseType: 'arraybuffer',
          timeout: 10000 // 10 second timeout
        });
        
        // Parse PDF text
        const pdfData = await pdfParse(pdfResponse.data);
        resumeText = pdfData.text;
        
        // Truncate if too long (keep first 1000 characters for prompt)
        if (resumeText.length > 1000) {
          resumeText = resumeText.substring(0, 1000) + '...';
        }
        
        console.log('Resume parsed successfully. Text length:', resumeText.length);
      } catch (pdfErr) {
        console.error('Error parsing PDF:', pdfErr);
        resumeText = '[Resume content could not be extracted - please ensure your resume is uploaded as a PDF]';
      }
    } else {
      console.log('No resume found for role:', hr.role);
      resumeText = '[No resume uploaded for this role - please upload your resume first]';
    }

    // Generate email content using Gemini with resume text
    const emailContent = await generateEmailUsingGemini({
      role: hr.role || 'Software Engineer',
      context: source || 'active',
      hrName: hr.name,
      company: hr.company || 'the company',
      jobLink: hr.jobLink || '',
      userEmail: req.user.email,
      resumeText: resumeText,
      resumeUrl: resume ? resume.fileUrl : ''
    });

    res.json({ 
      email: emailContent.body,
      subject: emailContent.subject,
      resumeUrl: resume ? resume.fileUrl : null
    });

  } catch (err) {
    console.error('Gemini email generation error:', err);
    res.status(500).json({ 
      message: 'Failed to generate email',
      error: err.message 
    });
  }
});

// Test route to check resume parsing
router.get('/test-resume/:userId/:role', auth, async (req, res) => {
  try {
    const { userId, role } = req.params;
    
    // Find the user's resume for this role
    const resume = await Resume.findOne({ 
      user: userId, 
      role: role 
    });

    if (!resume) {
      return res.json({ 
        message: 'No resume found for this role',
        role,
        userId
      });
    }

    let resumeText = '';
    if (resume.fileUrl) {
      try {
        // Fetch PDF from S3
        const pdfResponse = await axios.get(resume.fileUrl, {
          responseType: 'arraybuffer'
        });
        
        // Parse PDF text
        const pdfData = await pdfParse(pdfResponse.data);
        resumeText = pdfData.text.substring(0, 500); // First 500 chars
        
        res.json({ 
          message: 'Resume parsed successfully',
          role,
          resumeUrl: resume.fileUrl,
          resumeText: resumeText,
          fullTextLength: pdfData.text.length
        });
      } catch (pdfErr) {
        res.json({ 
          message: 'Error parsing PDF',
          error: pdfErr.message,
          resumeUrl: resume.fileUrl
        });
      }
    } else {
      res.json({ 
        message: 'Resume found but no file URL',
        role,
        resumeId: resume._id
      });
    }

  } catch (err) {
    console.error('Test resume error:', err);
    res.status(500).json({ 
      message: 'Test failed',
      error: err.message 
    });
  }
});

// Test email generation without sending
router.post('/test-email-generation', auth, async (req, res) => {
  try {
    const { hr, source } = req.body;

    if (!hr || !hr.name || !hr.email) {
      return res.status(400).json({ message: 'Invalid HR data provided' });
    }

    // Find the user's resume for this role
    const resume = await Resume.findOne({ 
      user: req.user._id, 
      role: hr.role 
    });

    let resumeText = '';
    if (resume && resume.fileUrl) {
      try {
        // Fetch PDF from S3
        const pdfResponse = await axios.get(resume.fileUrl, {
          responseType: 'arraybuffer'
        });
        
        // Parse PDF text
        const pdfData = await pdfParse(pdfResponse.data);
        resumeText = pdfData.text.substring(0, 1000); // First 1000 chars
      } catch (pdfErr) {
        console.error('Error parsing PDF:', pdfErr);
        resumeText = '[Resume content could not be extracted]';
      }
    }

    // Generate email content using Gemini with resume text
    const emailContent = await generateEmailUsingGemini({
      role: hr.role || 'Software Engineer',
      context: source || 'active',
      hrName: hr.name,
      company: hr.company || 'the company',
      jobLink: hr.jobLink || '',
      userEmail: req.user.email,
      resumeText: resumeText,
      resumeUrl: resume ? resume.fileUrl : ''
    });

    res.json({ 
      success: true,
      email: emailContent.body,
      subject: emailContent.subject,
      resumeUrl: resume ? resume.fileUrl : null,
      resumeTextLength: resumeText.length,
      hasResume: !!resume
    });

  } catch (err) {
    console.error('Test email generation error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate test email',
      error: err.message 
    });
  }
});

module.exports = router; 