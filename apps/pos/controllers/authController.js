const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Use separate secrets for different token types
const ACCESS_TOKEN_SECRET = "Kedhareswarmatha";
const REFRESH_TOKEN_SECRET = "KedhareswarmathaRefresh";

// Generate access token (short-lived)
const generateAccessToken = (user) => {
  console.log(`Generating access token for user: ${user._id}`);
  return jwt.sign(
    {
      userId: user._id,
      restaurantId: user.restaurantId,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" } // Short expiration for security
  );
};

// Generate refresh token (long-lived)
const generateRefreshToken = (user) => {
  console.log(`Generating refresh token for user: ${user._id}`);
  return jwt.sign(
    {
      userId: user._id,
      restaurantId: user.restaurantId,
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" } // Longer expiration
  );
};

// User Signup
exports.signup = async (req, res) => {
  try {
    console.log("Signup attempt:", req.body.email);
    const { firstname, lastname, phonenumber, email, password, restaurantId, pin } = req.body;
    
    // Validate PIN (must be 4 digits)
    if (!/^\d{4}$/.test(pin)) {
      console.log("Signup failed: Invalid PIN format");
      return res.status(400).json({ error: "PIN must be a 4-digit number" });
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
exports.login = async (req, res) => {
  try {
    console.log("Login attempt:", req.body.email);
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log("Login failed: User not found");
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Login failed: Password mismatch");
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    // Generate both tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    console.log("Access token generated:", accessToken.substring(0, 10) + "...");
    console.log("Refresh token generated:", refreshToken.substring(0, 10) + "...");
    
    // Store refresh token in database
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();
    console.log("Refresh token saved to database for user:", user._id);
    
    // Return user data with both tokens
    res.json({
      accessToken,
      refreshToken,
      requirePin: true, // Indicate that PIN verification is required
      user: {
        _id: user._id,
        email: user.email,
        restaurantId: user.restaurantId,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
    console.log("Login successful for:", email);
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Verify PIN after login
exports.verifyPin = async (req, res) => {
  try {
    console.log("PIN verification attempt for user:", req.body.userId);
    const { userId, pin } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      console.log("PIN verification failed: User not found");
      return res.status(400).json({ error: "User not found" });
    }
    
    const isPinMatch = await bcrypt.compare(pin, user.pin);
    if (!isPinMatch) {
      console.log("PIN verification failed: Invalid PIN");
      return res.status(400).json({ error: "Invalid PIN" });
    }
    
    // PIN is correct, create a new access token
    const accessToken = generateAccessToken(user);
    console.log("New access token generated after PIN verification:", accessToken.substring(0, 10) + "...");
    
    res.json({
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        restaurantId: user.restaurantId,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
    console.log("PIN verification successful for user:", userId);
  } catch (error) {
    console.error("PIN verification error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    console.log("Token refresh request received");
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      console.log("Token refresh failed: No refresh token provided");
      return res.status(401).json({ error: "Refresh token required" });
    }
    
    // Verify the refresh token
    console.log("Verifying refresh token:", refreshToken.substring(0, 10) + "...");
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    console.log("Refresh token verified for user:", decoded.userId);
    
    // Find user and check if the refresh token exists in their tokens array
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log("Token refresh failed: User not found");
      return res.status(403).json({ error: "Invalid refresh token" });
    }
    
    if (!user.refreshTokens.includes(refreshToken)) {
      console.log("Token refresh failed: Token not found in user's tokens");
      return res.status(403).json({ error: "Invalid refresh token" });
    }
    
    // Generate a new access token
    const accessToken = generateAccessToken(user);
    console.log("New access token generated:", accessToken.substring(0, 10) + "...");
    
    res.json({
      accessToken,
      requirePin: true, // Always require PIN after refreshing token
      user: {
        _id: user._id,
        email: user.email,
        restaurantId: user.restaurantId,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
    console.log("Token refresh successful for user:", user._id);
  } catch (error) {
    console.error("Token refresh error:", error.message);
    return res.status(403).json({ error: "Invalid refresh token" });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    console.log("Logout request received");
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      console.log("No refresh token provided for logout");
      return res.status(400).json({ error: "Refresh token required" });
    }
    
    // Find the user with this refresh token
    const user = await User.findOne({ refreshTokens: refreshToken });
    
    if (user) {
      console.log("Removing refresh token for user:", user._id);
      // Remove the refresh token from the user's tokens array
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
      console.log("Refresh token removed successfully");
    } else {
      console.log("No user found with the provided refresh token");
    }
    
    res.json({ message: "Logged out successfully" });
    console.log("Logout successful");
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ error: error.message });
  }
};