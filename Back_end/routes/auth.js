// routes/auth.js - Self-contained version (no utils/jwt.js needed)
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyUser = require('../middleware/verifyUser');

// Helper function for token generation
const generateToken = (payload) => {
  // Get secret from environment
  const secret = process.env.JWT_SECRET || process.env.JWT_KEY || 'fallback-secret-change-in-production';
  
  // Warn if using default secret
  if (secret === 'fallback-secret-change-in-production') {
    console.warn('⚠️  WARNING: Using default JWT secret. Change this in production!');
  }
  
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn
  });
};

// Verify token route
router.get('/verify', verifyUser, (req, res) => {
  res.json({
    success: true,
    user: {
      _id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      username: req.user.username,
      profile: req.user.profile
    }
  });
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated"
      });
    }

    // Compare passwords using the model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid password"
      });
    }

    // Generate JWT token
    const token = generateToken({
      _id: user._id,
      email: user.email,
      role: user.role,
      username: user.username
    });

    // Login successful
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: user.toJSON(),
        token: token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: "Server error during login"
    });
  }
});

// Register endpoint  
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email or username already exists"
      });
    }

    // Create new user
    const userData = {
      username,
      email,
      password,
      role: role || 'admin',
      profile: {
        firstName,
        lastName
      }
    };

    const user = await User.create(userData);

    // Generate token
    const token = generateToken({
      _id: user._id,
      email: user.email,
      role: user.role,
      username: user.username
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: user.toJSON(),
        token: token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during registration"
    });
  }
});

// Refresh token endpoint
router.post('/refresh', verifyUser, (req, res) => {
  try {
    // Generate new token with same user data
    const token = generateToken({
      _id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      username: req.user.username
    });

    res.json({
      success: true,
      message: "Token refreshed",
      data: {
        token: token
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh token"
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: "Logout successful. Please discard your token on the client side."
  });
});

module.exports = router;