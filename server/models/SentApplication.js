const mongoose = require('mongoose');

const sentAppSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hrId: { type: mongoose.Schema.Types.ObjectId, required: true },
  hrName: { type: String, required: true },
  hrEmail: { type: String, required: true },
  role: { type: String, required: true },
  company: String,
  source: { type: String, enum: ['active', 'database'], required: true },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  resumeUsed: String,
  threadId: String,
  messageId: String,
  status: { type: String, enum: ['Not Applied', 'Awaiting Reply', 'Got a Reply'], default: 'Awaiting Reply' },
  sentAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SentApplication', sentAppSchema);
