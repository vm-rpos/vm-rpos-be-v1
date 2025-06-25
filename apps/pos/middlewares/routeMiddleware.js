const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ACCESS_TOKEN_SECRET = "Zaikatech";

const getRole = async (req, res, next) => {
  try {
    console.log(`Getting role for request to: ${req.originalUrl}`);
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      console.log("Role extraction failed: No token provided");
      return res.status(401).json({ message: "No token, authorization denied" });
    }
    
    console.log("Extracting role from token:", token.substring(0, 10) + "...");
    
    // Verify the access token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    console.log("Token decoded successfully, User ID:", decoded.userId);
    
    // Get user from database to fetch role (include tokens field)
    const user = await User.findById(decoded.userId).select('role restaurantId firstname lastname email tokens');
    if (!user) {
      console.log("Role extraction failed: User not found");
      return res.status(401).json({ message: "Invalid token - user not found" });
    }
    
    // Check if the token exists in user's tokens array
    if (!user.tokens || !Array.isArray(user.tokens)) {
      console.log("Role extraction failed: User tokens array is missing or invalid");
      return res.status(401).json({ message: "Invalid token - user tokens not found" });
    }
    
    const tokenExists = user.tokens.some(tokenObj => tokenObj.accessToken === token);
    if (!tokenExists) {
      console.log("Role extraction failed: Token not found in database");
      return res.status(401).json({ message: "Invalid token - token not in database" });
    }
    
    // Add user information to request object
    req.user = {
      id: decoded.userId,
      restaurantId: decoded.restaurantId || user.restaurantId,
      role: user.role,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email
    };
    
    console.log(`Role extraction successful. User: ${user.firstname} ${user.lastname}, Role: ${user.role}, Restaurant ID: ${user.restaurantId}`);
    
    next();
  } catch (err) {
    console.error("Role extraction error:", err.name, err.message);
    
    if (err.name === "TokenExpiredError") {
      console.log("Access token expired");
      return res.status(401).json({ message: "Token expired", expired: true });
    }
    
    if (err.name === "JsonWebTokenError") {
      console.log("Invalid token format");
      return res.status(401).json({ message: "Invalid token format" });
    }
    
    console.log("Role extraction failed: Invalid token");
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = getRole;