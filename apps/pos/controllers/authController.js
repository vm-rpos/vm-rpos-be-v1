const User = require("../models/User");
const {generateTokens,cleanExpiredTokens} = require('../../../utils/tokenUtils');
const {generateVerificationCode, sendVerificationEmail} = require('../../../utils/emailUtils');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ms = require("ms");

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "5h";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
const MAX_TOKENS_PER_USER = process.env.MAX_TOKENS_PER_USER || 5;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "Kedhareswarmatha";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "Kedhareswarmatha";
const EMAIL_VERIFICATION_EXPIRY = process.env.EMAIL_VERIFICATION_EXPIRY || "10m";

// User Signup - Step 1: Store user data and send verification email
exports.signup = async (req, res) => {
  try {
    console.log("Signup attempt:", req.body.email);
    const { firstname, lastname, phonenumber, email, password, restaurantId, pin, role } = req.body;
    
    // Validate PIN (must be 4 digits)
    if (!/^\d{4}$/.test(pin)) {
      console.log("Signup failed: Invalid PIN format");
      return res.status(400).json({ error: "PIN must be a 4-digit number" });
    }
    
    // Validate role
    if (!role || !["admin", "pos","ivm","superadmin","salesadmin"].includes(role)) {
      console.log("Signup failed: Invalid role");
      return res.status(400).json({ error: "Role must be either 'admin' or 'pos' or 'ivm' " });
    }
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log("Signup failed: Email already exists");
      return res.status(400).json({ error: "Email already in use" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10);
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + ms(EMAIL_VERIFICATION_EXPIRY));
    
    const newUser = new User({ 
      firstname, 
      lastname, 
      phonenumber, 
      email, 
      password: hashedPassword, 
      restaurantId, 
      pin: hashedPin,
      role,
      refreshTokens: [],
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: verificationExpiry,
      isActive: false
    });
    
    await newUser.save();
    
    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode, firstname);
    
    if (!emailSent) {
      // If email sending fails, delete the user and return error
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({ error: "Failed to send verification email. Please try again." });
    }
    
    console.log("User registered successfully, verification email sent:", email);
    
    res.json({ 
      message: "User registered successfully. Please check your email for verification code.",
      userId: newUser._id,
      email: email
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Email Verification - Step 2: Verify the 6-digit code
exports.verifyEmail = async (req, res) => {
  try {
    const { userId, verificationCode } = req.body;
    
    if (!userId || !verificationCode) {
      return res.status(400).json({ error: "User ID and verification code are required" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }
    
    // Check if verification code has expired
    if (new Date() > user.emailVerificationExpiry) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
    }
    
    // Verify the code
    if (user.emailVerificationCode !== verificationCode) {
      return res.status(400).json({ error: "Invalid verification code. Please try again." });
    }
    
    // Mark email as verified and activate user
    user.isEmailVerified = true;
    user.isActive = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiry = undefined;
    
    await user.save();
    
    console.log("Email verified successfully:", user.email);
    
    res.json({ 
      message: "Email verified successfully. You can now login to your account.",
      user: {
        _id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Email verification error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Resend verification code
exports.resendVerificationCode = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }
    
    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + ms(EMAIL_VERIFICATION_EXPIRY));
    
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpiry = verificationExpiry;
    
    await user.save();
    
    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, verificationCode, user.firstname);
    
    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send verification email. Please try again." });
    }
    
    res.json({ message: "Verification code sent successfully. Please check your email." });
  } catch (error) {
    console.error("Resend verification error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// User Login with token management (only for verified users)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "No user found" });
    }
    
    // Check if email is verified
    if (!user.isEmailVerified || !user.isActive) {
      return res.status(400).json({ 
        error: "Please verify your email before logging in",
        requiresVerification: true,
        userId: user._id
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Clean expired tokens before adding new ones
    await cleanExpiredTokens(user);

    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // If we're at max capacity, remove the oldest token (FIFO)
    if (user.tokens.length >= MAX_TOKENS_PER_USER) {
      user.tokens.shift();
    }

    // Add the new token pair
    user.tokens.push({
      accessToken,
      refreshToken,
      createdAt: new Date()
    });

    await user.save();

    res.json({
      accessToken,
      refreshToken,
      requirePin: true,
      expireAt: new Date(Date.now() + ms(REFRESH_TOKEN_EXPIRY)),
      user: {
        _id: user._id,
        email: user.email,
        restaurantId: user.restaurantId,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify PIN after login
exports.verifyPin = async (req, res) => {
  try {
    const { userId, pin } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    
    // Check if user is active and verified
    if (!user.isEmailVerified || !user.isActive) {
      return res.status(400).json({ error: "Account not verified or inactive" });
    }
    
    const isPinMatch = await bcrypt.compare(pin, user.pin);
    if (!isPinMatch) {
      return res.status(400).json({ error: "Invalid PIN" });
    }

    // Generate new access token (refresh token remains the same)
    const accessToken = jwt.sign(
      { userId: user._id, restaurantId: user.restaurantId , role: user.role },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Update the most recent token with the new access token
    if (user.tokens.length > 0) {
      user.tokens[user.tokens.length - 1].accessToken = accessToken;
      await user.save();
    }

    res.json({
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        restaurantId: user.restaurantId,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Refresh token endpoint with cleanup
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token required" });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Check if user is still active and verified
    if (!user.isEmailVerified || !user.isActive) {
      return res.status(403).json({ error: "Account not verified or inactive" });
    }

    // Find the specific token pair
    const tokenIndex = user.tokens.findIndex(t => t.refreshToken === refreshToken);
    if (tokenIndex === -1) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Clean expired tokens
    await cleanExpiredTokens(user);

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Replace the old token pair with the new one
    user.tokens[tokenIndex] = {
      accessToken,
      refreshToken: newRefreshToken,
      createdAt: new Date()
    };

    await user.save();

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      expireAt: new Date(Date.now() + ms(REFRESH_TOKEN_EXPIRY)),
      requirePin: true,
      user: {
        _id: user._id,
        email: user.email,
        restaurantId: user.restaurantId,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }
};

// Logout - remove all tokens
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }
    
    const user = await User.findOne({ "tokens.refreshToken": refreshToken });
    
    if (user) {
      // Remove all tokens for this user
      user.tokens = [];
      await user.save();
    }
    
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};