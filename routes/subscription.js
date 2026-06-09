const express = require('express');
const { Subscription } = require('../models');
const router = express.Router();

router.get('/manage-subscriptions', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const subscriptions = await Subscription.find({ user: req.session.user.id }).lean().exec();
    res.render('manage-subscriptions', { subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return res.status(500).send('Error fetching subscriptions');
  }
});

router.get('/update', (req, res) => {
  // Redirect users to the subscription manager when no specific subscription ID is provided.
  return res.redirect('/subscriptions/manage-subscriptions');
});

router.get('/update/:id', async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id).lean().exec();

    if (!subscription) {
      return res.status(404).send('Subscription not found');
    }

    res.render('update-subscription', { subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).send('Error fetching subscription');
  }
});

router.post('/update/:id', async (req, res) => {
  const { name, type, start, expiry, amount } = req.body;
  const startDate = new Date(start);
  const expiryDate = new Date(expiry);

  if (isNaN(startDate.getTime()) || isNaN(expiryDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date format' });
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
  }

  try {
    await Subscription.findByIdAndUpdate(req.params.id, {
      name,
      type,
      start: startDate,
      expiry: expiryDate,
      amount: parseFloat(amount),
    }).exec();

    res.redirect('/subscriptions/manage-subscriptions');
  } catch (error) {
    console.error('Error updating subscription:', error);
    return res.status(500).send('Error updating subscription');
  }
});

router.get('/delete/:id', async (req, res) => {
  try {
    await Subscription.deleteOne({ _id: req.params.id, user: req.session.user?.id }).exec();
    res.redirect('/subscriptions/manage-subscriptions');
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return res.status(500).send('Error deleting subscription');
  }
});

router.post('/add', async (req, res) => {
  const { user_id, name, type, start, expiry, amount } = req.body;
  const userId = req.session.user?.id || user_id;

  if (!userId || !name || !type || !start || !expiry || !amount) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const startDate = new Date(start);
  const expiryDate = new Date(expiry);

  if (isNaN(startDate.getTime()) || isNaN(expiryDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date format' });
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
  }

  try {
    const subscription = await Subscription.create({
      user: userId,
      name,
      type,
      start: startDate,
      expiry: expiryDate,
      amount: parseFloat(amount),
    });

    res.json({
      success: true,
      message: 'Subscription added successfully',
      id: subscription._id,
    });
  } catch (error) {
    console.error('Error adding subscription:', error);
    return res.status(500).json({ success: false, message: 'Error adding subscription' });
  }
});

module.exports = router;
