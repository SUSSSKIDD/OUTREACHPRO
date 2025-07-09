const sendGmail = require('../utils/sendGmail');
const Resume = require('../models/Resume');
const SentApplication = require('../models/SentApplication');
const HR = require('../models/HR.JS'); // assuming you have an HR model
const { generateEmailUsingGemini } = require('../utils/generateEmailUsingGemini');

exports.sendEmail = async (req, res) => {
  try {
    const { hrId, source, role } = req.body;
    const user = req.user;

    if (!hrId || !source || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 1️⃣ Fetch HR info (name, email, etc.)
    const hr = await HR.findById(hrId);
    if (!hr) return res.status(404).json({ message: 'HR not found' });

    // 2️⃣ Match resume for the role
    const resume = await Resume.findOne({ user: user._id, role });
    if (!resume) {
      return res.status(400).json({ message: `No resume found for role: ${role}` });
    }

    // 3️⃣ Compose email using Gemini
    const promptContext = {
      role,
      context: source,
      hrName: hr.name || '',
      company: hr.company || '',
      jobLink: hr.jobLink || '',
      resumeUrl: resume.fileUrl,
      userEmail: user.email,
    };

    const { subject, body } = await generateEmailUsingGemini(promptContext);

    // 4️⃣ Send email via Gmail
    const result = await sendGmail({
      user: user,
      to: hr.email,
      subject,
      body,
      attachmentUrl: resume.fileUrl,
    });

    // 5️⃣ Save sent record
    await SentApplication.create({
      user: user._id,
      hrId,
      hrName: hr.name,
      hrEmail: hr.email,
      role: hr.role,
      company: hr.company,
      source,
      resumeId: resume._id,
      threadId: result.threadId,
      messageId: result.messageId,
    });

    res.json({ message: 'Email sent successfully', threadId: result.threadId });

  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ message: 'Failed to send email' });
  }
};
