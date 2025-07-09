const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('../config/aws');
const Resume = require('../models/Resume');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT middleware
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

// Multer S3 setup (AWS SDK v2 compatible)
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const filename = `resumes/${Date.now()}_${file.originalname}`;
      cb(null, filename);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: 'private' // safer for resume PDFs
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error("Only PDFs allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Upload Resume
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "Role is required" });

    const resume = await Resume.create({
      user: req.user._id,
      role,
      fileUrl: req.file.location,
      fileKey: req.file.key
    });

    req.user.resumes.push(resume._id);
    await req.user.save();

    res.json({ message: "Resume uploaded", resume });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Get user's resumes
router.get('/my', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id });
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch resumes" });
  }
});

// Get signed URL for inline preview
router.get('/url/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume || resume.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Resume not found or unauthorized' });
    }

    const url = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: resume.fileKey,
      Expires: 60,
      ResponseContentDisposition: 'inline',
      ResponseContentType: 'application/pdf'
    });

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate signed URL' });
  }
});

// Delete Resume
router.delete('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume || resume.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Resume not found or unauthorized' });
    }

    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: resume.fileKey
    }).promise();

    await resume.deleteOne();
    res.json({ message: 'Resume deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete resume' });
  }
});

module.exports = router;
