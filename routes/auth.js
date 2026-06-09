const express = require('express');
const bcrypt = require('bcrypt');
const { User } = require('../models');
const router = express.Router();

// Handle user signup
router.post('/signup', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).send('Email, username, and password are required.');
  }

  try {
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username },
      ],
    }).exec();

    if (existingUser) {
      return res.status(400).send('User already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email: email.toLowerCase(), username, password: hashedPassword });

    return res.redirect('/login');
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).send('Error creating user');
  }
});

// Handle user login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const user = await User.findOne({ username }).exec();
    if (!user) {
      return res.status(401).send('Invalid username or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send('Invalid username or password');
    }

    req.session.user = { id: user._id.toString(), username: user.username };
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).send('Error logging in');
  }
});

module.exports = router;
