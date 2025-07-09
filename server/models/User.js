const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  fingerprintId: { type: String, required: true }, // NEW
  plan: { type: String, default: 'Free' }, // Free | Basic | Pro | Unlimited
  isAdmin: { type: Boolean, default: false }, // Admin access
  resumes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resume' }],
  gmailAccess: {
    token: String,
    refreshToken: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
