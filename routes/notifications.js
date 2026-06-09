const express = require('express');
const transporter = require('../utils/emailTransporter');
const { User, Subscription, Notification, SentEmail } = require('../models');
const router = express.Router();

async function sendNotificationEmail(userId, subscription) {
  try {
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      console.error('User not found for email notification:', userId);
      return;
    }

    const userEmail = user.email;
    const subject = `Subscription Expiring Soon: ${subscription.subscriptionName}`;
    const message = `Hello,\n\nYour subscription to ${subscription.subscriptionName} is expiring soon on ${subscription.expiry}.\nPlease renew it to continue enjoying the benefits.\n\nBest regards,\nSubSage`;

    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL;
    const html = `
      <p>Hello,</p>
      <p>Your subscription to <strong>${subscription.subscriptionName}</strong> is expiring soon on <strong>${new Date(subscription.expiry).toLocaleDateString()}</strong>.</p>
      <p>Please renew it to continue enjoying the service.</p>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: userEmail,
      subject,
      text: message,
      html,
    });
    console.log('Email sent via Brevo SMTP:', info.messageId);

    await SentEmail.create({
      senderEmail: fromAddress,
      receiverEmail: userEmail,
      subject,
      message,
    });
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}

router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const userId = req.session.user.id;
    const currentDate = new Date();
    const nextWeekDate = new Date();
    nextWeekDate.setDate(currentDate.getDate() + 7);

    const subscriptions = await Subscription.find({
      user: userId,
      expiry: { $gte: currentDate, $lte: nextWeekDate },
    }).lean().exec();

    const notifications = await Promise.all(subscriptions.map(async (subscription) => {
      const notification = await Notification.create({
        user: userId,
        subscription: subscription._id,
        subscriptionName: subscription.name,
        subscriptionType: subscription.type,
        expiry: subscription.expiry,
        message: `Your subscription to ${subscription.name} will expire soon!`,
        notifiedAt: new Date(),
      });

      sendNotificationEmail(userId, notification);
      return notification;
    }));

    // Map notification documents to the shape expected by the EJS template
    const mappedNotifications = notifications.map(n => ({
      message: n.message,
      subscription_name: n.subscriptionName || n.subscription_name || '',
      subscription_type: n.subscriptionType || n.subscription_type || '',
      notified_at: n.notifiedAt ? new Date(n.notifiedAt).toLocaleString() : '',
      subscription_id: n.subscription ? n.subscription.toString() : (n.subscription_id || ''),
    }));

    res.render('notifications', { notifications: mappedNotifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).send('Error fetching notifications');
  }
});

router.post('/store', async (req, res) => {
  const { user_id, subscription_id, subscription_name, subscription_type, message, notified_at } = req.body;

  if (!user_id || !subscription_id || !subscription_name || !subscription_type || !message || !notified_at) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const subscription = await Subscription.findById(subscription_id).lean().exec();
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const notification = await Notification.create({
      user: user_id,
      subscription: subscription._id,
      subscriptionName: subscription_name,
      subscriptionType: subscription_type,
      expiry: subscription.expiry,
      message,
      notifiedAt: new Date(notified_at),
    });

    sendNotificationEmail(user_id, notification);

    res.status(200).json({ success: true, message: 'Notification saved and email sent successfully' });
  } catch (error) {
    console.error('Error storing notification:', error);
    return res.status(500).json({ success: false, message: 'Error saving notification' });
  }
});

module.exports = router;
