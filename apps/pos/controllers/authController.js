const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Use separate secrets for different token types
const ACCESS_TOKEN_SECRET = "Kedhareswarmatha";
const REFRESH_TOKEN_SECRET = "KedhareswarmathaRefresh";
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";
const MAX_TOKENS_PER_USER = 5;


// Helper function to clean expired tokens
const cleanExpiredTokens = async (user) => {
  const now = new Date();
  user.tokens = user.tokens.filter(token => {
    try {
      const decoded = jwt.verify(token.refreshToken, REFRESH_TOKEN_SECRET);
      return decoded.exp * 1000 > now.getTime();
    } catch (err) {
      return false; // Remove if token is invalid/expired
    }
  });
  await user.save();
};

// Generate tokens with timestamp
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, restaurantId: user.restaurantId },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { userId: user._id, restaurantId: user.restaurantId },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

// User Signup
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
    if (!role || !["admin", "pos"].includes(role)) {
      console.log("Signup failed: Invalid role");
      return res.status(400).json({ error: "Role must be either 'admin' or 'pos'" });
    }
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log("Signup failed: Email already exists");
      return res.status(400).json({ error: "Email already in use" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10); // Hash the PIN
    
    const newUser = new User({ 
      firstname, 
      lastname, 
      phonenumber, 
      email, 
      password: hashedPassword, 
      restaurantId, 
      pin: hashedPin,
      role, // Add the role
      refreshTokens: [] // Initialize empty refresh tokens array
    });
    
    await newUser.save();
    console.log("User registered successfully:", email);
    
    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// User Login with password
// User Login with token management
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
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
      user.tokens.shift(); // Remove the first/oldest token
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
// Verify PIN - remains mostly the same but uses the new token structure
exports.verifyPin = async (req, res) => {
  try {
    const { userId, pin } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    
    const isPinMatch = await bcrypt.compare(pin, user.pin);
    if (!isPinMatch) {
      return res.status(400).json({ error: "Invalid PIN" });
    }

    // Generate new access token (refresh token remains the same)
    const accessToken = jwt.sign(
      { userId: user._id, restaurantId: user.restaurantId },
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