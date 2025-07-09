const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const User = require('../models/User');
const axios = require('axios');

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Sends an email using the user's authorized Gmail account
 * @param {Object} options - { user, to, subject, body, attachmentUrl, attachments }
 * @returns {Promise<{ threadId: string | null, messageId: string }>}
 */
async function sendGmail({ user, to, subject, body, attachmentUrl = null, attachments = [] }) {
  if (!user) {
    throw new Error('User object is required');
  }
  
  if (!user.gmailAccess?.refreshToken) {
    throw new Error('User not authorized with Gmail. Please authorize Gmail access first.');
  }

  try {
    // Set up OAuth2 client with refresh token
    oauth2Client.setCredentials({
      refresh_token: user.gmailAccess.refreshToken,
    });

    // Get a fresh access token
    console.log('Getting fresh access token...');
    const { token: accessToken } = await oauth2Client.getAccessToken();
    console.log('Access token obtained successfully');

    // Create transporter with OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: user.email,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: user.gmailAccess.refreshToken,
        accessToken: accessToken,
      },
    });

    // Verify the connection
    console.log('Verifying Gmail connection...');
    await transporter.verify();
    console.log('Gmail connection verified successfully');

    // Handle attachment from URL if provided
    let finalAttachments = [...attachments];
    if (attachmentUrl) {
      try {
        console.log('Fetching attachment from:', attachmentUrl);
        const response = await axios.get(attachmentUrl, {
          responseType: 'arraybuffer',
          timeout: 10000 // 10 second timeout
        });
        
        // Extract filename from URL
        const urlParts = attachmentUrl.split('/');
        const filename = urlParts[urlParts.length - 1] || 'resume.pdf';
        
        // Ensure filename has .pdf extension
        const finalFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
        
        finalAttachments.push({
          filename: finalFilename,
          content: response.data,
          contentType: 'application/pdf'
        });
        
        console.log('Successfully attached PDF:', finalFilename);
      } catch (error) {
        console.error('Error fetching attachment:', error);
        // Continue without attachment if fetch fails
      }
    }

    const mailOptions = {
      from: `"${user.email}" <${user.email}>`,
      to,
      subject,
      text: body,
      attachments: finalAttachments,
    };

    console.log('Sending email to:', to);
    console.log('Subject:', subject);
    console.log('Has attachments:', finalAttachments.length > 0);
    
    const result = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully. Message ID:', result.messageId);

    return {
      threadId: result.envelope?.messageId || null,
      messageId: result.messageId,
    };

  } catch (error) {
    console.error('Gmail authentication error:', error);
    
    // If it's an authentication error, suggest re-authorization
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      throw new Error('Gmail authentication failed. Please re-authorize Gmail access by visiting /api/auth/login');
    }
    
    throw error;
  }
}

module.exports = sendGmail;
