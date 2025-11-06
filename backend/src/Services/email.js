// Email service utility functions
import nodemailer from 'nodemailer';

/**
 * Send welcome email to new user
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient name
 * @param {string} options.token - Authentication token for first login
 * @param {boolean} options.requiresPasswordUpdate - Whether the user needs to update their password
 */
export const sendWelcomeEmail = async ({ to, name, token, requiresPasswordUpdate = true }) => {
  try {
    // Configure transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'commandgrid2025@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || 'your-app-password'
      },
      secure: false,
    });
    
    // Build welcome URL
    const welcomeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/welcome?token=${token}`;
    
    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'commandgrid2025@gmail.com',
      to: to,
      subject: 'Welcome to Project Management Tool',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3f51b5; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to Project Management Tool</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
            <p>Hello ${name},</p>
            <p>Welcome to the Project Management Tool! Your account has been created.</p>
            ${requiresPasswordUpdate ? `
            <p>Please click the button below to set up your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${welcomeUrl}" style="background-color: #3f51b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Set Up Account
              </a>
            </div>
            ` : `
            <p>You can now log in to your account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #3f51b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Login
              </a>
            </div>
            `}
            
            <p>If you have any questions, please contact your administrator.</p>
          </div>
        </div>
      `,
      text: `
        Hello ${name},
        
        Welcome to the Project Management Tool! Your account has been created.
        ${requiresPasswordUpdate ? `
        Please visit the following link to set up your password:
        ${welcomeUrl}
        ` : `
        You can now log in to your account:
        ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login
        `}
        
        If you have any questions, please contact your administrator.
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};