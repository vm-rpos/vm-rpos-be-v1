const jwt = require("jsonwebtoken");
const User = require("../models/User");
const JWT_SECRET = "Kedhareswarmatha"

const protect = async (req, res, next) => {
    try {
      const token = req.header("Authorization")?.replace("Bearer ", "");
      
      if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
        restaurantId: decoded.restaurantId
      };
      
      next();
    } catch (err) {
      console.error("Auth error:", err);
      res.status(401).json({ message: "Invalid token" });
    }
  };

module.exports = protect;
