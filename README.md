# 🚀 SubSage

**The Ultimate Subscription & Utility Management Dashboard**

[![Node.js Version](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

SubSage is a robust, full-stack web application designed to help users track, manage, and analyze their recurring expenses, entertainment subscriptions, and household utilities in one beautiful, centralized dashboard.

[Live Demo](https://sub-sage-subscription-management-sy.vercel.app/) · [Report Bug](https://github.com/SABARISH0014/SubSage-Subscription_Management_System/issues) · [Request Feature](https://github.com/SABARISH0014/SubSage-Subscription_Management_System/issues)

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🖥️ UI & Design Showcase](#️-ui--design-showcase)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [⚙️ Environment Variables](#️-environment-variables)
- [🗺️ API & Routes](#️-api--routes)
- [☁️ Deployment](#️-deployment)
- [📜 License](#-license)

---

## ✨ Key Features

### 🛡️ Authentication & Security
* **Secure Login/Signup:** Encrypted password hashing using `bcrypt`.
* **Bot Protection:** Integrated **Google reCAPTCHA v2** validation.
* **Persistent Sessions:** Mongo-backed session persistence using `connect-mongo`.
* **Password Recovery:** Secure, token-based password reset via **Brevo SMTP** email transport.

### 📊 Dashboard & Analytics
* **Interactive Charts:** Visual analytics using `Chart.js` to track monthly spending and subscription trends.
* **Smart Notifications:** Automated background cron jobs (`node-cron`) to alert users of upcoming renewals.
* **Live Updates:** Integrated `socket.io` architecture.

### 💳 Financial Tracking
* **Transaction History:** Detailed ledger of past payments and subscription cycles.
* **Payment Integration:** Ready-to-scale payment details tracking (incorporating `stripe`).
* **Utility vs. Entertainment:** Categorized tracking for different types of recurring bills.

---

## 🖥️ UI & Design Showcase

*(Replace the `src` links below with the actual paths to your screenshots inside your repository, e.g., `docs/dashboard.png`)*

### 🌙 Light & Dark Mode Ready UI

| Dashboard Analytics | Subscription Management |
| :---: | :---: |
| ![Dashboard UI](https://via.placeholder.com/600x350/1e1e1e/007bff?text=Dashboard+Screenshot) | ![Add Subscription UI](https://via.placeholder.com/600x350/f4f4f9/0056b3?text=Add+Subscription+UI) |
| *Interactive Chart.js visualizations of monthly expenses* | *Clean, responsive forms for adding new services* |

| Secure Authentication | Transaction History |
| :---: | :---: |
| ![Login UI](https://via.placeholder.com/600x350/1e1e1e/007bff?text=Login+reCAPTCHA) | ![Transactions UI](https://via.placeholder.com/600x350/f4f4f9/0056b3?text=Transaction+Ledger) |
| *Bot-protected login flows with forgot-password support* | *Detailed ledger of all historical payments* |

---

## 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, EJS (Embedded JavaScript), Chart.js |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Mongoose ODM |
| **Authentication** | express-session, connect-mongo, bcrypt |
| **Integrations** | Stripe API, Nodemailer (Brevo SMTP), Google reCAPTCHA v2 |
| **Utilities** | node-cron (Scheduling), socket.io (WebSockets), dotenv |

---

## 📂 Project Structure

```text
subsage/
├── app.js                    # Main Express server entry point
├── package.json              # App metadata and dependencies
├── vercel.json               # Serverless deployment configuration
├── database/
│   └── connection.js         # MongoDB Atlas connection handler
├── models/                   # Mongoose Database Schemas
│   ├── Contact.js, Notification.js, PayerDetail.js, 
│   └── Payment.js, Review.js, Subscription.js, User.js
├── routes/                   # Application Routing
│   ├── auth.js, notifications.js, payments.js, subscription.js
├── utils/
│   └── emailTransporter.js   # Brevo SMTP Nodemailer config
├── public/                   # Static Assets (CDN Ready)
│   ├── css/                  # Modular CSS files for all views
│   ├── images/               # App logos, backgrounds, icons
│   └── js/                   # Client-side interactivity scripts
└── views/                    # EJS Templates & HTML Views
    ├── dashboard.ejs, login.ejs, signup.ejs, contact.ejs...
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A MongoDB Atlas Cluster URL
- Free API Keys for Brevo, Stripe, and Google reCAPTCHA

### Installation

1. **Clone the repository:**

Bash

```
   git clone [https://github.com/SABARISH0014/SubSage-Subscription_Management_System.git](https://github.com/SABARISH0014/SubSage-Subscription_Management_System.git)
   cd SubSage-Subscription_Management_System
```

1. **Install dependencies:**

Bash

```
   npm install
```

1. **Configure Environment Variables:**
Create a `.env` file in the root directory (see [Environment Variables](#️-environment-variables) below).
2. **Run the local development server:**

Bash

```
   npm start
```

Open - [http://localhost:3000](http://localhost:3000) in your browser.
## ⚙️ Environment Variables
Create a `.env` file in the root directory of your project. Do not commit this file to GitHub.Code snippet
```
# Database & Sessions
MONGODB_URI=mongodb+srv://:@cluster0.mongodb.net/subsage?retryWrites=true&w=majority
SESSION_SECRET=your-very-secure-random-secret-string
NODE_ENV=development # Change to 'production' for deployment

# Brevo SMTP Configuration (Emails)
BREVO_USER=your-brevo-username-or-apikey
BREVO_SMTP_KEY=xsmtpsib-your-long-brevo-smtp-key
EMAIL_FROM=subsageofficial@yourdomain.com
EMAIL_REJECT_UNAUTHORIZED=false # Optional TLS setting

# Security Integrations
RECAPTCHA_SITE_KEY=your-recaptcha-public-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-private-secret-key

# Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

## 🗺️ API & Routes

### Public Routes
`GET /` - Landing page
- `GET /login` | `GET /signup` - Authentication views
- `POST /auth/login` | `POST /auth/signup` - Auth form submissions
- `GET /forgot-password` | `POST /forgot-password` - Password recovery flow
- `GET /reset-password` | `POST /reset-password` - Token-based password reset

### Protected Routes (Requires Auth)

- `GET /dashboard` - Main user dashboard & analytics
- `GET /add-subscription` | `POST /add-subscription` - Subscription management
- `GET /transaction-history` - Logged-in user transaction history
- `GET /transaction-details/:paymentId` - Specific payment receipt
- `POST /submit-review` - User review submission

## ☁️ Deployment
SubSage is optimized for serverless deployment on **Vercel**.

1. Push your code to GitHub.
2. Log into Vercel and click **Import Project**.
3. Select your repository.
4. **Crucial:** Expand the **Environment Variables** section in Vercel and paste all your `.env` variables. Ensure `NODE_ENV` is set to `production` (this enables secure cookie transmission and trust-proxy headers).
5. Click **Deploy**.

*The included `vercel.json` and `app.js` export configurations will automatically handle Express routing in the serverless environment.*

## 📜 License
This project is licensed under the **ISC License**. See the `LICENSE` file for more details.
