// server/models/HR.js
const mongoose = require('mongoose');

const hrSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  position: String,
  company: String,
  jobLink: { type: String, required: true },
  role: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HR', hrSchema);
