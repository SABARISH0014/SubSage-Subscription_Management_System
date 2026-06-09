const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  subscriptionName: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    trim: true,
  },
  paymentType: {
    type: String,
    trim: true,
  },
  paymentMethod: {
    type: String,
    trim: true,
  },
  latestCharge: {
    type: String,
    trim: true,
  },
  paymentIntentId: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Payment', paymentSchema);
