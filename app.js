require('dotenv').config();  // Load environment variables from .env file
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt'); // Import bcrypt
const mongoose = require('mongoose');
require('./database/connection'); // Initialize MongoDB Atlas connection
const { User, Subscription, Contact, Review, Payment, PayerDetail } = require('./models');
const notificationsRouter = require('./routes/notifications');
const axios = require('axios'); // For making HTTP requests
const transporter = require('./utils/emailTransporter');
const paymentRoutes = require('./routes/payments');
const flash = require('connect-flash');
const crypto = require('crypto'); // For generating secure tokens


const app = express();
const PORT = 3000;


// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure the views folder exists

// Trust the proxy when deployed behind Vercel or another proxy
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Session middleware for handling user sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Use env var in production
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000,
    },
}));

// Static Files (serve images, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
// Serve Forgot Password page

app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', {
        message: null,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
    });  // Pass message as null initially
});

console.log("--- EMAIL CONFIG DIAGNOSTIC ---");
console.log("Email from address defined:", !!process.env.EMAIL_FROM);
console.log("Brevo SMTP user defined:", !!process.env.BREVO_USER);
console.log("--------------------------------");
async function updateResetToken(email, token, expireTime) {
    const result = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { resetToken: token, resetTokenExpiry: new Date(expireTime) },
        { new: true }
    ).exec();
    return result ? 1 : 0;
}

app.post('/forgot-password', async (req, res) => {
    try {
        const { email, 'g-recaptcha-response': recaptchaResponse } = req.body;
        if (!recaptchaResponse) {
            return res.render('forgot-password', { message: 'reCAPTCHA is required.', recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '' });
        }

        // Verify reCAPTCHA
        const recaptchaVerifyResponse = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: process.env.RECAPTCHA_SECRET_KEY,
                response: recaptchaResponse,
            }
        });

        if (!recaptchaVerifyResponse.data.success) {
            return res.render('forgot-password', { message: 'reCAPTCHA verification failed. Please try again.', recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '' });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).exec();

        if (!user) {
            return res.render('forgot-password', { message: 'If an account with that email exists, a reset link has been sent.', recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expireTime = Date.now() + 3600000;

        const updatedRows = await updateResetToken(email, token, expireTime);
        if (updatedRows === 0) {
            return res.render('forgot-password', { message: 'Error updating reset token. Please try again.', recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '' });
        }

        const resetLink = `http://localhost:3000/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL;
        const subject = 'Password Reset';
        const html = `
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>If you did not request a reset, please ignore this email.</p>
        `;
        const text = `Click the link below to reset your password:\n${resetLink}\n\nIf you did not request a reset, please ignore this email.`;

        await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject,
            text,
            html,
        });

        res.render('forgot-password', {
            message: 'If an account with that email exists, a reset link has been sent.',
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
        });

    } catch (error) {
        console.error("Error:", error);
        return res.render('forgot-password', {
            message: 'An error occurred. Please try again later.',
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
        });
    }
});




// Render reset password page
app.get('/reset-password', (req, res) => {
    const { token, email } = req.query; // Get token and email from query params

    if (!token || !email) {
        return res.status(400).send("Invalid or missing parameters.");
    }

    res.render('reset-password', {
        token,
        email,
        message: null,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
    });
});

// Handle password reset
app.post('/reset-password', async (req, res) => {
    const { token, email, password, 'g-recaptcha-response': recaptchaResponse } = req.body;

    if (!recaptchaResponse) {
        return res.render('reset-password', { token, email, message: 'reCAPTCHA is required.' });
    }

    try {
        // Verify reCAPTCHA
        const recaptchaVerifyResponse = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: process.env.RECAPTCHA_SECRET_KEY,
                response: recaptchaResponse,
            }
        });

        if (!recaptchaVerifyResponse.data.success) {
            return res.render('reset-password', { token, email, message: 'reCAPTCHA verification failed. Please try again.' });
        }

        const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } }).exec();
        if (!user) {
            return res.render('reset-password', { token, email, message: 'Invalid or expired token.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null,
        }).exec();

        res.render('reset-password', {
            token,
            email,
            message: 'Password updated successfully. Please log in with your new password.',
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
        });
    } catch (error) {
        console.error(error);
        return res.render('reset-password', {
            token,
            email,
            message: 'Error verifying reCAPTCHA. Please try again later.',
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
        });
    }
});


app.use('/notifications', notificationsRouter);


// Route to handle the redirection and render addsubscriptions.ejs

// Routes for serving HTML files (static)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/signup', (req, res) => {
    res.render('signup', { message: null });  // Pass message as null initially
});

app.post('/auth/signup', async (req, res) => {
    const { email, username, password, 'g-recaptcha-response': reCAPTCHAResponse } = req.body;

    if (!reCAPTCHAResponse) {
        return res.render('signup', { message: 'reCAPTCHA is required.' });
    }

    try {
        const verificationResponse = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: process.env.RECAPTCHA_SECRET_KEY,
                response: reCAPTCHAResponse,
            }
        });

        if (!verificationResponse.data.success) {
            return res.render('signup', { message: 'reCAPTCHA verification failed. Please try again.' });
        }

        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username },
            ],
        }).exec();

        if (existingUser) {
            return res.render('signup', { message: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ email: email.toLowerCase(), username, password: hashedPassword });

        return res.render('signup', { message: 'User registered successfully. You can now log in!' });
    } catch (error) {
        console.error('Error verifying reCAPTCHA:', error.message);
        res.render('signup', { message: 'Error verifying reCAPTCHA. Please try again later.' });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { message: null });
});

app.post('/auth/login', async (req, res) => {
    const { username, password, 'g-recaptcha-response': reCAPTCHAResponse } = req.body;

    if (!reCAPTCHAResponse) {
        return res.render('login', { message: 'reCAPTCHA is required.' });
    }

    try {
        const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const verificationResponse = await axios.post(verificationUrl, null, {
            params: {
                secret: process.env.RECAPTCHA_SECRET_KEY,
                response: reCAPTCHAResponse,
            }
        });

        if (!verificationResponse.data.success) {
            return res.render('login', { message: 'reCAPTCHA verification failed. Please try again.' });
        }

        const user = await User.findOne({ username }).exec();
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('login', { message: 'Invalid username or password.' });
        }

        req.session.user = { id: user._id.toString(), username: user.username };
        console.log('User logged in:', req.session.user);

        return res.redirect('/dashboard');
    } catch (error) {
        console.error('Error verifying reCAPTCHA:', error.message);
        res.render('login', { message: 'Error verifying reCAPTCHA. Please try again later.' });
    }
});



// Use the payment routes
app.use('/payments', paymentRoutes);
app.get('/transaction-history', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;

    try {
        const transactions = await Payment.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: 'payerdetails',
                    localField: 'paymentId',
                    foreignField: 'paymentId',
                    as: 'payerDetails'
                }
            },
            { $unwind: { path: '$payerDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    payment_id: '$paymentId',
                    subscription_name: '$subscriptionName',
                    amount: 1,
                    currency: 1,
                    status: 1,
                    payment_method: '$paymentMethod',
                    payment_type: '$paymentType',
                    created_at: '$createdAt',
                    payer_name: '$payerDetails.payerName',
                    payer_email: '$payerDetails.payerEmail',
                }
            },
            { $sort: { created_at: -1 } }
        ]).exec();

        res.render('transaction-history', { transactions });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        return res.status(500).send('Error loading transaction history');
    }
});

app.get('/transaction-details/:paymentId', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const paymentId = req.params.paymentId;
    const userId = req.session.user.id;

    try {
        const transaction = await Payment.findOne({ paymentId, user: userId }).lean().exec();
        if (!transaction) {
            return res.status(404).send('Transaction not found or unauthorized access');
        }

        const payerDetails = await PayerDetail.findOne({ paymentId }).lean().exec();
        const result = {
            payment_id: transaction.paymentId,
            subscription_name: transaction.subscriptionName,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            payment_method: transaction.paymentMethod,
            payment_type: transaction.paymentType,
            created_at: transaction.createdAt,
            payer_name: payerDetails?.payerName || null,
            payer_email: payerDetails?.payerEmail || null,
        };

        res.render('transaction-details', { transaction: result });
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        return res.status(500).send('Error loading transaction details');
    }
});


app.get('/entertainment', (req, res) => res.sendFile(path.join(__dirname, 'views', 'entertainment.html')));
app.get('/utilities', (req, res) => res.sendFile(path.join(__dirname, 'views', 'utilities.html')));
// Serve the contact page (contact.ejs)
app.use(flash());
app.get('/contact', async (req, res) => {
    try {
        const reviews = await Review.find({}, 'name rating reviewText createdAt')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()
            .exec();

        res.render('contact', {
            reviews,
            successMessage: req.flash('successMessage') || null,
            reviewSuccessMessage: req.flash('reviewSuccessMessage') || null,
            name: '',
            email: '',
            message: ''
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).send('An error occurred while loading the contact page.');
    }
});

app.post('/submit-contact', async (req, res) => {
    const { name, email, message } = req.body;

    try {
        await Contact.create({ name, email, message });
        req.flash('successMessage', 'Message sent successfully!');
        res.redirect('/contact');
    } catch (error) {
        console.error('Error saving contact message:', error);
        res.status(500).send('Failed to save message');
    }
});

app.post('/submit-review', async (req, res) => {
    if (!req.session?.user) {
        req.flash('reviewError', 'You must be logged in to submit a review.');
        return res.redirect('/contact');
    }

    const { id: userId } = req.session.user;
    const { name, email, rating, review_text } = req.body;

    if (!email || !rating || !review_text) {
        req.flash('reviewError', 'All fields are required to submit a review.');
        return res.redirect('/contact');
    }

    try {
        await Review.create({
            user: userId,
            name,
            email,
            rating: parseInt(rating, 10),
            reviewText: review_text,
        });

        req.flash('reviewSuccessMessage', 'Review submitted successfully!');
        res.redirect('/contact');
    } catch (error) {
        console.error('Error submitting review:', error);
        req.flash('reviewError', 'An error occurred while submitting your review.');
        res.redirect('/contact');
    }
});





app.get('/addsubscription', (req, res) => {
    return res.redirect('/add-subscription');
});

app.get('/addSubscription', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }

    const user = req.session.user; // Get user data from session
    const name = req.query.name || ''; // Get 'name' from query or default to empty string
    const type = req.query.type || ''; // Get 'type' from query or default to empty string

    // Render the addsubscription view with user, name, and type
    res.render('addsubscription', { user: user, name: name, type: type });
});

// Route for rendering addSubscription (possibly without authentication)
app.get('/add-subscription', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const name = req.query.name || ''; // Get the 'name' from query or default to empty string
    const type = req.query.type || '';
    res.render('addsubscription', {
        name: name,
        type: type,
        user: req.session.user || null,
    });
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const userId = req.session.user.id;

        const subscriptionData = await Subscription.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: { month: { $month: '$start' }, name: '$name' },
                    count: { $sum: 1 },
                }
            },
            {
                $project: {
                    month: { $toString: '$_id.month' },
                    name: '$_id.name',
                    count: 1,
                }
            },
            { $sort: { month: 1 } },
        ]).exec();

        const paymentData = await Payment.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: { month: { $month: '$createdAt' }, subscriptionName: '$subscriptionName' },
                    amount: { $sum: '$amount' },
                }
            },
            {
                $project: {
                    month: { $toString: '$_id.month' },
                    subscription_name: '$_id.subscriptionName',
                    amount: 1,
                }
            },
            { $sort: { month: 1 } },
        ]).exec();

        const distinctPayerEmails = await PayerDetail.distinct('payerEmail', { user: new mongoose.Types.ObjectId(userId) }).exec();
        const uniquePayers = distinctPayerEmails.length;

        res.render('dashboard', {
            username: req.session.user.username,
            message: req.session.message,
            subscriptionData,
            paymentData,
            uniquePayers,
        });

        req.session.message = null;
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return res.status(500).send('Database error');
    }
});

// Import route files (ensure routes match your API logic)
const subscriptionRoutes = require('./routes/subscription');

// Use route handlers
app.use('/subscriptions', subscriptionRoutes);
app.get('/manage-subscriptions', (req, res) => {
    return res.redirect('/subscriptions/manage-subscriptions');
});
app.use('/notifications', notificationsRouter);

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/'); // Redirect to the home page after logout
    });
});

// Error handling for unmatched routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Start the server when app.js is executed directly.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
