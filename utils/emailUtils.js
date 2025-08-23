const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
const sendVerificationEmail = async (email, code, firstname) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Email Verification - Restaurant POS System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to Restaurant POS System!</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
              Hi ${firstname || "User"},<br>
              Please verify your email address to complete your registration.
            </p>
            <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This verification code will expire in 10 minutes.<br>
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, code, firstname) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Password Reset - Restaurant POS System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
              Hi ${firstname || "User"},<br>
              We received a request to reset your password for your Restaurant POS System account.
            </p>
            <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 16px; margin: 20px 0;">
              Enter this code in the password reset form to create a new password.
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This reset code will expire in 15 minutes for security reasons.<br>
              If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </p>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="color: #856404; font-size: 14px; margin: 0;">
                <strong>Security Note:</strong> Never share this reset code with anyone. Our team will never ask for this code.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
  transporter,
};
