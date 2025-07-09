const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate subject + body using Gemini
 * @param {Object} ctx - prompt context
 * @param {string} ctx.role
 * @param {string} ctx.context - "active" | "database"
 * @param {string} ctx.hrName
 * @param {string} ctx.company
 * @param {string} ctx.jobLink
 * @param {string} ctx.resumeUrl
 * @param {string} ctx.resumeText - Actual text content from resume
 * @param {string} ctx.userEmail
 */
async function generateEmailUsingGemini(ctx) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt =
      ctx.context === 'active'
        ? `
You are a professional job seeker writing a compelling referral email. Write a personalized email for the role "${ctx.role}" at ${ctx.company || 'the company'}.

CONTEXT:
- HR Contact: ${ctx.hrName || 'HR Manager'}
- Company: ${ctx.company || 'the company'}
- Job Link: ${ctx.jobLink || '[link not available]'}
- Your Email: ${ctx.userEmail}

RESUME CONTENT (Use this to personalize the email):
${ctx.resumeText || '[Resume content not available]'}

INSTRUCTIONS:
1. Write a professional, concise email (150-200 words max)
2. Extract and mention 2-3 specific skills/experiences from the resume content above
3. Reference the job posting link if available
4. Ask for a referral or interview opportunity
5. Keep tone confident but humble
6. Include a clear subject line
7. Do NOT mention AI, automation, or that this is auto-generated
8. Do NOT mention resume URL in the email body since it will be attached as PDF

FORMAT:
Subject: [Clear, professional subject line]

[Email body with proper greeting, introduction, skills mention, and call to action]

Best regards,
[Your name]
        `
        : `
You are a professional job seeker writing a cold outreach email. Write a personalized email for ${ctx.hrName || 'a recruiter'} at ${ctx.company || 'the company'} regarding ${ctx.role} opportunities.

CONTEXT:
- HR Contact: ${ctx.hrName || 'HR Manager'}
- Company: ${ctx.company || 'the company'}
- Your Email: ${ctx.userEmail}

RESUME CONTENT (Use this to personalize the email):
${ctx.resumeText || '[Resume content not available]'}

INSTRUCTIONS:
1. Write a warm, professional email (150-200 words max)
2. Extract and highlight 2-3 relevant skills/experiences from the resume content above
3. Express interest in opportunities at their company
4. Ask for a conversation or referral
5. Keep tone friendly and professional
6. Include a clear subject line
7. Do NOT mention AI, automation, or that this is auto-generated
8. Do NOT mention resume URL in the email body since it will be attached as PDF

FORMAT:
Subject: [Clear, professional subject line]

[Email body with proper greeting, introduction, skills mention, and call to action]

Best regards,
[Your name]
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 🧠 Extract subject + body using simple parsing
    const match = text.match(/Subject:(.*)\n([\s\S]*)/i);

    const subject = match?.[1]?.trim() || `Referral Request - ${ctx.role}`;
    const body = match?.[2]?.trim() || text.trim();

    return { subject, body };
  } catch (err) {
    console.error('Gemini API Error:', err);
    return {
      subject: `Referral Request - ${ctx.role}`,
      body: `Hi ${ctx.hrName || 'there'},\n\nI'm writing to express interest in opportunities related to ${ctx.role}. Please find my resume here: ${ctx.resumeUrl}.\n\nThanks,\n${ctx.userEmail}`,
    };
  }
}

module.exports = { generateEmailUsingGemini };
