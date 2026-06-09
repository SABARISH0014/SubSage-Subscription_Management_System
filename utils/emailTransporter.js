const nodemailer = require('nodemailer');

const brevoUser = process.env.BREVO_USER || 'apikey';
const brevoPass = process.env.BREVO_SMTP_KEY;

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: brevoUser,
    pass: brevoPass,
  },
  authMethod: 'LOGIN',
  tls: {
    rejectUnauthorized: process.env.EMAIL_REJECT_UNAUTHORIZED === 'false' ? false : true,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Nodemailer transporter verification failed:', error);
  } else {
    console.log('Nodemailer transporter is ready to send messages');
  }
});

module.exports = transporter;
