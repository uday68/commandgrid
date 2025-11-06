import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    logger.error('SMTP connection error:', error);
  } else {
    logger.info('SMTP server is ready to take our messages');
  }
});

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';
  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>If you didn't request this, please ignore this email.</p>
    <p>This link will expire in 1 hour.</p>
  `;
  const text = `Password Reset Request\n\nClick the link to reset your password: ${resetUrl}\n\nIf you didn't request this, please ignore this email.\n\nThis link will expire in 1 hour.`;

  return sendEmail({ to: email, subject, html, text });
};

export const sendWelcomeEmail = async (email, firstName) => {
  const subject = 'Welcome to Project Management Tool';
  const html = `
    <h1>Welcome ${firstName}!</h1>
    <p>Thank you for joining our Project Management Tool.</p>
    <p>You can now log in and start managing your projects.</p>
  `;
  const text = `Welcome ${firstName}!\n\nThank you for joining our Project Management Tool.\n\nYou can now log in and start managing your projects.`;

  return sendEmail({ to: email, subject, html, text });
};

export const sendNotificationEmail = async (email, subject, message) => {
  const html = `
    <h1>${subject}</h1>
    <p>${message}</p>
  `;
  const text = `${subject}\n\n${message}`;

  return sendEmail({ to: email, subject, html, text });
}; 