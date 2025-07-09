import React, { useEffect, useState } from 'react';
import axios from 'axios';

function EmailComposer({ hrData, source, onClose, onEmailSent }) {
  const [emailText, setEmailText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Validate required props
  if (!hrData || !hrData.name || !hrData.email) {
    return (
      <div className="p-4 border rounded shadow bg-white max-w-xl mx-auto">
        <div className="text-red-600 mb-3">❌ Invalid HR data provided</div>
        <button onClick={onClose} className="text-gray-600">Close</button>
      </div>
    );
  }

  useEffect(() => {
    const generateEmail = async () => {
      try {
        setLoading(true);
        setError(''); // Clear any previous errors
        
        const res = await axios.post('http://localhost:8000/api/gemini/generate-email', {
          hr: hrData,
          source,
        }, { withCredentials: true });

        if (res.data && res.data.email) {
          setEmailText(res.data.email);
          setEmailSubject(res.data.subject || 'Interest in Position');
          setResumeUrl(res.data.resumeUrl || '');
          
          // Check if resume was found
          if (!res.data.resumeUrl) {
            setError('⚠️ No resume found for this role. Please upload your resume first.');
          }
        } else {
          // Fallback email template
          const fallbackEmail = `Hi ${hrData.name},

I hope this email finds you well. I came across the ${hrData.role} position at ${hrData.company || 'your company'} and I'm very interested in this opportunity.

I believe my background and skills align well with what you're looking for. I would love to discuss how I can contribute to your team.

Please let me know if you'd be available for a brief conversation about this role.

Best regards,
${hrData.email}`;
          
          setEmailText(fallbackEmail);
          setEmailSubject('Interest in Position');
          setError('⚠️ No resume found for this role. Please upload your resume first.');
        }
      } catch (err) {
        console.error('Failed to generate email:', err);
        setError('Could not generate email. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (hrData && hrData.name && hrData.email) {
      generateEmail();
    }
  }, [hrData, source]);

  const sendEmail = async () => {
    try {
      setSending(true);
      const response = await axios.post('http://localhost:8000/api/gmail/send-email', {
        to: hrData.email,
        subject: emailSubject,
        body: emailText,
        resumeUrl: resumeUrl,
        hrRole: hrData.role, // Pass the HR role to find the correct resume
        hrData: hrData // Pass full HR data for saving application
      }, { withCredentials: true });

      if (response.data.hasAttachment) {
        alert("✅ Email sent successfully with resume attachment!");
      } else {
        alert("✅ Email sent successfully!");
      }
      if (onEmailSent) onEmailSent(); // Notify parent to refresh lists
      onClose(); // close modal or refresh parent
    } catch (err) {
      console.error(err);
      
      // Check if it's a Gmail authorization error
      if (err.response?.data?.needsAuth) {
        const shouldAuth = confirm("❌ Gmail not authorized. Would you like to authorize Gmail access now?");
        if (shouldAuth) {
          window.open('http://localhost:8000/api/auth/login', '_blank');
        }
      } else {
        alert(`❌ Failed to send email: ${err.response?.data?.error || err.message}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow bg-white max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">📧 Compose Email to {hrData.name}</h2>
      <div className="text-sm text-gray-600 mb-3">
        📧 <a href={`mailto:${hrData.email}`} className="text-green-600 hover:underline">
          {hrData.email}
        </a>
        {hrData.company && ` • ${hrData.company}`}
      </div>
      {resumeUrl && (
        <div className="text-sm text-blue-600 mb-3">
          📎 Resume will be automatically attached as PDF: {resumeUrl.split('/').pop()}
        </div>
      )}
      {!resumeUrl && hrData.role && (
        <div className="text-sm text-orange-600 mb-3">
          📎 Looking for resume for role: {hrData.role}
        </div>
      )}

      {loading ? (
        <p>Generating email...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject:
            </label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Body:
            </label>
            <textarea
              rows={10}
              className="w-full border rounded p-2"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="text-gray-600">Cancel</button>
            <button
              onClick={sendEmail}
              disabled={sending || !resumeUrl}
              className={`px-4 py-2 rounded ${
                sending || !resumeUrl 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {sending ? "Sending..." : !resumeUrl ? "No Resume Available" : "Send Email"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default EmailComposer;
