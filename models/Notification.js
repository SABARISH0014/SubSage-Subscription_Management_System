const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
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
  subscriptionType: {
    type: String,
    trim: true,
  },
  expiry: {
    type: Date,
  },
  message: {
    type: String,
    required: true,
  },
  notifiedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

module.exports = mongoose.model('Notification', notificationSchema);
