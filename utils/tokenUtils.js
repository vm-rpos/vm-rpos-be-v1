const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;

// Generate access + refresh tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, restaurantId: user.restaurantId, role: user.role },
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

// Remove expired refresh tokens from user
const cleanExpiredTokens = async (user) => {
  const now = Date.now();

  user.tokens = user.tokens.filter((token) => {
    try {
      const decoded = jwt.verify(token.refreshToken, REFRESH_TOKEN_SECRET);
      return decoded.exp * 1000 > now;
    } catch {
      return false;
    }
  });

  await user.save();
};

module.exports = {
  generateTokens,
  cleanExpiredTokens,
};
