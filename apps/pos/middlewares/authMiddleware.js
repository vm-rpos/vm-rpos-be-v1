const jwt = require("jsonwebtoken");
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "Kedhareswarmatha";

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
    req.user = {
      id: decoded.userId,
      restaurantId: decoded.restaurantId,
      role: decoded.role
    };
    
    console.log(`Authentication successful. User ID: ${decoded.userId}, Restaurant ID: ${decoded.restaurantId}, Role: ${decoded.role}`);
    
    next();
  } catch (err) {
    console.error("Authentication error:", err.name, err.message);
    
    // Specific error for expired tokens to help client know when to refresh
    if (err.name === "TokenExpiredError") {
      console.log("Access token expired");
      return res.status(401).json({ message: "Token expired", expired: true });
    }
    
    console.log("Authentication failed: Invalid token");
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = protect;