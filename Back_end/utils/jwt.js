// utils/jwt.js
const jwt = require('jsonwebtoken');

const getJWTSecret = () => {
  // Try JWT_SECRET first, then JWT_KEY, then fallback
  const secret = process.env.JWT_SECRET || process.env.JWT_KEY;
  if (!secret) {
    console.error('JWT secret key not configured in environment variables');
    throw new Error('JWT secret key not configured');
  }
  return secret;
};

const getJWTExpiry = () => {
  return process.env.JWT_EXPIRES_IN || '7d';
};

const generateToken = (payload) => {
  try {
    return jwt.sign(payload, getJWTSecret(), {
      expiresIn: getJWTExpiry()
    });
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Failed to generate token');
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJWTSecret());
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expired");
    }
    throw error;
  }
};

const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

module.exports = {
  getJWTSecret,
  getJWTExpiry,
  generateToken,
  verifyToken,
  decodeToken
};