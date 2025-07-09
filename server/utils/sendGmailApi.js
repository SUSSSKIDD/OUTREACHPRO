const { google } = require('googleapis');
const axios = require('axios');

const OAuth2 = google.auth.OAuth2;

// Helper to build a simple MIME message with optional PDF attachment
function buildMimeMessage({ from, to, subject, text, attachments }) {
  let boundary = '----=_Part_' + Math.random().toString(36).slice(2);
  let mime = '';
  mime += `From: ${from}\r\n`;
  mime += `To: ${to}\r\n`;
  mime += `Subject: ${subject}\r\n`;
  mime += 'MIME-Version: 1.0\r\n';
  if (attachments && attachments.length > 0) {
    mime += `Content-Type: multipart/mixed; boundary=\"${boundary}\"\r\n\r\n`;
    mime += `--${boundary}\r\n`;
    mime += 'Content-Type: text/plain; charset="UTF-8"\r\n';
    mime += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
    mime += text + '\r\n\r\n';
    for (const att of attachments) {
      mime += `--${boundary}\r\n`;
      mime += `Content-Type: ${att.contentType}; name=\"${att.filename}\"\r\n`;
      mime += 'Content-Transfer-Encoding: base64\r\n';
      mime += `Content-Disposition: attachment; filename=\"${att.filename}\"\r\n\r\n`;
      mime += att.content.toString('base64').replace(/(.{76})/g, '$1\r\n') + '\r\n\r\n';
    }
    mime += `--${boundary}--`;
  } else {
    mime += 'Content-Type: text/plain; charset="UTF-8"\r\n';
    mime += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
    mime += text;
  }
  return mime;
}

async function sendGmailApi({ user, to, subject, body, attachmentUrl = null }) {
  if (!user) throw new Error('User object is required');
  if (!user.gmailAccess?.refreshToken) throw new Error('User not authorized with Gmail. Please re-authorize.');

  // Set up OAuth2 client
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: user.gmailAccess.refreshToken });

  // Get fresh access token
  await oauth2Client.getAccessToken(); // Not used directly, but ensures token is valid
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Prepare attachments if needed
  let attachments = [];
  if (attachmentUrl) {
    try {
      const response = await axios.get(attachmentUrl, { responseType: 'arraybuffer', timeout: 10000 });
      const urlParts = attachmentUrl.split('/');
      const filename = urlParts[urlParts.length - 1] || 'resume.pdf';
      const finalFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
      attachments.push({
        filename: finalFilename,
        content: Buffer.from(response.data),
        contentType: 'application/pdf',
      });
    } catch (err) {
      console.error('Error fetching attachment:', err);
    }
  }

  // Build the MIME message
  const mimeMessage = buildMimeMessage({
    from: user.email,
    to,
    subject,
    text: body,
    attachments,
  });

  // Send the email using Gmail API
  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    id: res.data.id,
    threadId: res.data.threadId,
    labelIds: res.data.labelIds,
  };
}

module.exports = sendGmailApi; 