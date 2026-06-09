const mongoose = require('mongoose');

const payerDetailSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  payerName: {
    type: String,
    trim: true,
  },
  payerEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  addressCountry: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PayerDetail', payerDetailSchema);
