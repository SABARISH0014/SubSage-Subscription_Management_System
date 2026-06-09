const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Payment, Subscription, PayerDetail, User } = require('../models');
const router = express.Router();

router.get('/', async (req, res) => {
  const userId = req.session?.user?.id || req.query.user_id;
  const subscriptionId = req.query.subscription_id;

  if (!userId) {
    return res.status(400).send('User ID is required.');
  }

  try {
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).send('User not found.');
    }

    const query = subscriptionId ? { _id: subscriptionId, user: userId } : { user: userId };
    const subscriptions = await Subscription.find(query).lean().exec();

    if (!subscriptions || subscriptions.length === 0) {
      return res.render('payments', {
        user_id: user._id,
        subscriptions: [],
        stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
        message: 'No subscriptions found.',
      });
    }

    const currentDate = new Date();
    subscriptions.forEach(subscription => {
      const expiryDate = new Date(subscription.expiry);
      const daysRemaining = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
      subscription.allowExtend = daysRemaining <= 7;
    });

    res.render('payments', {
      user_id: user._id,
      subscriptions,
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
      message: null,
    });
  } catch (error) {
    console.error('Error fetching payments page:', error);
    res.render('payments', {
      user_id: userId,
      subscriptions: [],
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
      message: 'Error fetching subscriptions. Please try again later.',
    });
  }
});

router.post('/create-checkout-session', async (req, res) => {
  const { subscription_name, amount, subscription_id, payment_type } = req.body;
  const sanitizedAmount = Math.round(parseFloat(amount) * 100);

  if (isNaN(sanitizedAmount) || sanitizedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount value' });
  }

  try {
    const payments = await Payment.find({ subscription: subscription_id, status: 'succeeded' }).lean().exec();
    const hasNormalPayment = payments.some(payment => payment.paymentType === 'normal');
    const hasExtendPayment = payments.some(payment => payment.paymentType === 'extend');

    if (hasNormalPayment && payment_type === 'normal') {
      return res.status(400).json({ error: 'You have already made a normal payment for this subscription.' });
    }

    if (hasExtendPayment && payment_type === 'normal') {
      return res.status(400).json({ error: 'You cannot make a normal payment after extending this subscription.' });
    }

    if (payment_type === 'extend') {
      const subscription = await Subscription.findById(subscription_id).lean().exec();
      if (!subscription) {
        return res.status(404).send('Subscription not found.');
      }

      const expiryDate = new Date(subscription.expiry);
      const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysRemaining > 7) {
        return res.status(400).json({ error: 'Extension is not allowed for this subscription.' });
      }
    }

    await createStripeSession(res, subscription_name, sanitizedAmount, subscription_id, payment_type);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Database error while checking payment history.' });
  }
});

async function createStripeSession(res, subscription_name, sanitizedAmount, subscription_id, payment_type) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: { name: subscription_name || 'Subscription' },
            unit_amount: sanitizedAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${res.req.headers.origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${res.req.headers.origin}/payments/`,
      metadata: { subscription_id, payment_type },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ error: 'Failed to create Stripe session' });
  }
}

router.get('/success', async (req, res) => {
  const sessionId = req.query.session_id;

  if (!sessionId) {
    return res.status(400).send('Session ID is missing');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || !session.payment_intent) {
      return res.status(400).send('Invalid session or missing payment intent');
    }

    const paymentIntent = session.payment_intent;
    const paymentDetails = await stripe.paymentIntents.retrieve(paymentIntent);

    if (paymentDetails.status === 'succeeded') {
      await proceedWithPayment(sessionId);
    }

    res.redirect('/payments');
  } catch (error) {
    console.error('Error handling payment success:', error);
    res.status(500).send('Error processing payment.');
  }
});

async function proceedWithPayment(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || !session.metadata || !session.metadata.subscription_id) {
      return;
    }

    const subscriptionId = session.metadata.subscription_id;
    const paymentType = session.metadata.payment_type;
    const paymentIntentId = session.payment_intent;
    const paymentDetails = await stripe.paymentIntents.retrieve(paymentIntentId);
    const customerDetails = session.customer_details;
    const status = paymentDetails.status === 'succeeded' ? 'succeeded' : 'failed';

    const subscription = await Subscription.findById(subscriptionId).exec();
    if (!subscription) {
      console.error(`Subscription not found for ID: ${subscriptionId}`);
      return;
    }

    await Payment.create({
      paymentId: paymentIntentId,
      user: subscription.user,
      subscription: subscription._id,
      subscriptionName: subscription.name,
      amount: paymentDetails.amount / 100,
      currency: paymentDetails.currency,
      status,
      paymentType,
      paymentMethod: paymentDetails.payment_method || '',
      latestCharge: paymentIntentId,
      paymentIntentId,
    });

    await PayerDetail.create({
      paymentId: paymentIntentId,
      user: subscription.user,
      payerName: customerDetails?.name || '',
      payerEmail: customerDetails?.email || '',
      addressCountry: customerDetails?.address?.country || '',
    });

    if (paymentType === 'extend') {
      await updateSubscriptionDates(subscription);
    }
  } catch (error) {
    console.error('Error processing payment:', error);
  }
}

async function updateSubscriptionDates(subscription) {
  try {
    const currentExpiry = new Date(subscription.expiry);
    const newStartDate = new Date(currentExpiry);
    newStartDate.setDate(currentExpiry.getDate() + 1);

    const newExpiryDate = new Date(newStartDate);
    newExpiryDate.setDate(newStartDate.getDate() + 30);

    await Subscription.findByIdAndUpdate(subscription._id, {
      start: newStartDate,
      expiry: newExpiryDate,
    }).exec();
  } catch (error) {
    console.error('Error updating subscription dates:', error);
  }
}

module.exports = router;
