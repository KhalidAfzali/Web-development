// routes/authPassword.js
const express = require("express");
const crypto = require("crypto");

const router = express.Router();
const User = require("../models/User");
const verifyUser = require("../middleware/verifyUser");

// Logged-in change password (FIX: no manual hash, let User pre-save hash once)
router.put("/change-password", verifyUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    // Need password to compare
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const ok = await user.comparePassword(String(currentPassword));
    if (!ok) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    // IMPORTANT: set plain password, model will hash in pre('save')
    user.password = String(newPassword);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (e) {
    console.error("change-password error:", e);
    return res.status(500).json({ success: false, message: "Failed to change password" });
  }
});

// Forgot password: create token
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("_id password");
    // You said: "it must check the password that already exist for that email"
    // This checks account exists and has a password field.
    if (!user || !user.password) {
      // Keep same response to avoid leaking which emails exist
      return res.json({ success: true, message: "If the email exists, a reset token was created" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${rawToken}`;

    // DEV: return token so user can type it
    return res.json({
      success: true,
      message: "If the email exists, a reset token was created",
      devResetLink: resetLink,
      devToken: rawToken,
    });
  } catch (e) {
    console.error("forgot-password error:", e);
    return res.status(500).json({ success: false, message: "Failed to create reset token" });
  }
});

// Reset password using token (FIX: no manual hash)
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) return res.status(400).json({ success: false, message: "newPassword is required" });
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const hashed = crypto.createHash("sha256").update(String(token)).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password");

    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset token" });

    // Set plain password, model hashes once
    user.password = String(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (e) {
    console.error("reset-password error:", e);
    return res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});

module.exports = router;
