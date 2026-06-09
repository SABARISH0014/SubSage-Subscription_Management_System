# SubSage

SubSage is an Express-based subscription management application built with MongoDB Atlas, session-backed authentication, payment tracking, and email-based password recovery.

## Key Features

- User registration and login with reCAPTCHA validation
- MongoDB Atlas data storage via Mongoose
- Mongo-backed session persistence using `connect-mongo`
- Password reset via Brevo SMTP email transport
- Subscription dashboard with analytics and unique payer count
- Transaction history and details pages
- Contact form with saved messages and user reviews
- Static utility and entertainment pages
- Notification route integration and email alerts

## Project Structure

- `app.js` - main Express server and route definitions
- `package.json` - dependencies and NPM scripts
- `database/connection.js` - MongoDB Atlas connection configuration
- `models/` - Mongoose model definitions (users, subscriptions, payments, contact messages, reviews, payer details)
- `routes/` - route modules for notifications, payments, subscription management, auth flows
- `utils/emailTransporter.js` - Brevo SMTP Nodemailer transport
- `views/` - EJS templates and static HTML views
- `public/` - static assets (CSS, JavaScript, images)

## Requirements

- Node.js 18+ recommended
- MongoDB Atlas connection string
- Brevo SMTP credentials
- Google reCAPTCHA site and secret keys

## Installation

1. Clone the repository:

```bash
git clone <repo-url> subsage
cd subsage
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with the required environment variables.

## Environment Variables

The application uses the following environment variables:

- `MONGODB_URI` - MongoDB Atlas connection URI
- `SESSION_SECRET` - secret for Express session signing
- `BREVO_USER` - Brevo SMTP username (often `apikey`)
- `BREVO_SMTP_KEY` - Brevo SMTP password / API key
- `EMAIL_FROM` - sender email address for outgoing password reset messages
- `RECAPTCHA_SITE_KEY` - Google reCAPTCHA site key
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key
- `EMAIL_REJECT_UNAUTHORIZED` - optional TLS setting for Nodemailer (`false` to disable certificate validation)
- `NODE_ENV` - set to `production` in production environments

Example `.env` values:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/subsage?retryWrites=true&w=majority
SESSION_SECRET=your-very-secure-secret
BREVO_USER=apikey
BREVO_SMTP_KEY=your-brevo-smtp-key
EMAIL_FROM=hello@example.com
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
EMAIL_REJECT_UNAUTHORIZED=false
NODE_ENV=development
```

## Run Locally

Start the application:

```bash
npm start
```

Then open:

```
http://localhost:3000
```

## Routes Overview

- `/` - homepage
- `/signup` - user registration page
- `/auth/signup` - signup form submission
- `/login` - login page
- `/auth/login` - login submission
- `/dashboard` - authenticated user dashboard
- `/forgot-password` - request password reset
- `/reset-password` - reset password page
- `/contact` - contact/review page
- `/submit-contact` - submit a contact message
- `/submit-review` - submit a review (requires login)
- `/add-subscription` - subscription creation page
- `/transaction-history` - logged-in user transaction history
- `/transaction-details/:paymentId` - payment detail page
- `/utilities` - utility services page
- `/entertainment` - static entertainment page

## Deployment Notes

- Use MongoDB Atlas for the `MONGODB_URI` connection string.
- For production, set `NODE_ENV=production` and `SESSION_SECRET` securely.
- The app trusts proxy headers when `NODE_ENV === 'production'`, which is useful for platforms like Vercel.
- Ensure Brevo SMTP credentials and a valid `EMAIL_FROM` address are configured for password reset emails.

## Dependencies

- `express`
- `mongoose`
- `connect-mongo`
- `express-session`
- `bcrypt`
- `dotenv`
- `nodemailer`
- `axios`
- `connect-flash`
- `express-validator`
- `stripe`
- `socket.io`
- `node-cron`
- `chart.js`

## Notes

- The app uses EJS templates for dynamic pages and serves static HTML for some utility pages.
- The session store is backed by MongoDB, making it suitable for distributed deployment.
- Password reset email transport is handled through Brevo SMTP.

## License

This project is released under the ISC license.
