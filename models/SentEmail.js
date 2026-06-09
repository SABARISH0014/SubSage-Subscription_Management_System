const mongoose = require('mongoose');

const sentEmailSchema = new mongoose.Schema({
  senderEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  receiverEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SentEmail', sentEmailSchema);
