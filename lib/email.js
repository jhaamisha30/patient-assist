import nodemailer from 'nodemailer';

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'patientassist6765@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD, // App password from environment variable
  },
});

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} verificationToken - Unique verification token
 * @returns {Promise<void>}
 */
export async function sendVerificationEmail(email, name, verificationToken) {
  // Get base URL - prioritize NEXT_PUBLIC_APP_URL, then VERCEL_URL, then localhost
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (!baseUrl && process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  if (!baseUrl) {
    baseUrl = 'http://localhost:3000';
  }
  
  // Clean up the URL - remove any path segments
  baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  baseUrl = baseUrl.replace(/\/login.*$/, ''); // Remove /login and anything after it
  baseUrl = baseUrl.replace(/\/verify-email.*$/, ''); // Remove /verify-email and anything after it
  
  // Ensure we have a proper protocol
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  // Use API route for verification - more reliable
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
  
  console.log('Verification URL generated:', verificationUrl); // Debug log

  const mailOptions = {
    from: 'Patient Assist <patientassist6765@gmail.com>',
    to: email,
    subject: 'Verify Your Patient Assist Account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #00a47d;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #00a47d;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #008a68;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Patient Assist</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for registering with Patient Assist. To complete your registration and start using your account, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #00a47d;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you did not create an account with Patient Assist, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Patient Assist. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${name}!
      
      Thank you for registering with Patient Assist. To complete your registration and start using your account, please verify your email address by visiting the following link:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you did not create an account with Patient Assist, please ignore this email.
      
      ---
      Patient Assist
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

