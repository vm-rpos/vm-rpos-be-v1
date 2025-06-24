const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ACCESS_TOKEN_SECRET = "Zaikatech";

const protect = async (req, res, next) => {
  try {
    console.log(`Authenticating request to: ${req.originalUrl}`);
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      console.log("Authentication failed: No token provided");
      return res.status(401).json({ message: "No token, authorization denied" });
    }
    
    console.log("Verifying access token:", token.substring(0, 10) + "...");
    
    // Verify the access token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    
    // Check if user exists and token is valid in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log("Authentication failed: User not found");
      return res.status(401).json({ message: "Invalid token" });
    }
    
    // Check if the token exists in user's tokens array
    const tokenExists = user.tokens.some(tokenObj => tokenObj.accessToken === token);
    if (!tokenExists) {
      console.log("Authentication failed: Token not found in database");
      return res.status(401).json({ message: "Invalid token" });
    }
    
    req.user = {
      id: decoded.userId,
      restaurantId: decoded.restaurantId
    };
    
    console.log(`Authentication successful. User ID: ${decoded.userId}, Restaurant ID: ${decoded.restaurantId}`);
    
    next();
  } catch (err) {
    console.error("Authentication error:", err.name, err.message);
    
    if (err.name === "TokenExpiredError") {
      console.log("Access token expired");
      return res.status(401).json({ message: "Token expired", expired: true });
    }
    
    console.log("Authentication failed: Invalid token");
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = protect;