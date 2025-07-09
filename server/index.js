const express = require('express');
const http = require('http');
const app = require('./app');
const server = http.createServer(app);

// If you need to access io elsewhere, you can do:
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

const mongoose = require('mongoose');
require('dotenv').config();
const { google } = require('googleapis');
const SentApplication = require('./models/SentApplication');
const User = require('./models/User');

// Polling job for HR replies
setInterval(async () => {
  try {
    const awaitingApps = await SentApplication.find({ status: 'Awaiting Reply' }).populate('user');
    for (const app of awaitingApps) {
      if (!app.user || !app.user.gmailAccess?.refreshToken || !app.threadId) continue;
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      oauth2Client.setCredentials({ refresh_token: app.user.gmailAccess.refreshToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      try {
        const thread = await gmail.users.threads.get({ userId: 'me', id: app.threadId });
        const messages = thread.data.messages || [];
        // Find the latest message not from the user
        const userEmail = app.user.email;
        const hrReply = messages.find(msg => {
          const from = (msg.payload.headers || []).find(h => h.name === 'From')?.value || '';
          return from && !from.includes(userEmail);
        });
        if (hrReply) {
          // Update status and notify user
          app.status = 'Got a Reply';
          await app.save();
          const io = app.user && app.user._id ? app.user._id : null;
          if (io) {
            const ioInstance = app.get('io') || require('socket.io')(server);
            ioInstance.to(app.user._id.toString()).emit('hr-reply', { threadId: app.threadId, hrName: app.hrName });
          }
        }
      } catch (err) {
        console.error('Polling: Error fetching Gmail thread for', app.threadId, err.message);
      }
    }
  } catch (err) {
    console.error('Polling: Error checking HR replies', err.message);
  }
}, 1 * 60 * 1000); // Every 2 minutes

const PORT = process.env.PORT || 8000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

  