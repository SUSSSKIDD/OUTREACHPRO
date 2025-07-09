const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const sentApplicationRoutes = require('./routes/sentApplicationRoutes');
const googleAuthRoutes = require('./routes/googleAuth');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // frontend URL
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/resume', require('./routes/resumeRoutes'));
app.use('/api/sent', sentApplicationRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/hr', require('./routes/hrRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/email', require('./routes/emailRoutes'));
app.use('/api/gmail', require('./routes/gmailRoutes'));
app.use('/api/gemini', require('./routes/geminiRoutes'));


app.get('/', (req, res) => {
  res.send("✅ OUTREACHPRO API is running");
});

module.exports = app;
