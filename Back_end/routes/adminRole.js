const express = require("express");
const router = express.Router();

const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");
const User = require("../models/User");

router.use(verifyUser, requireRole("admin"));

// Set role to head
router.patch("/users/:id/make-head", async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: "head" },
    { new: true }
  ).select("username email role profile");

  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, message: "User is now Head of Department", data: user });
});

// Remove head (back to doctor)
router.patch("/users/:id/remove-head", async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: "doctor" },
    { new: true }
  ).select("username email role profile");

  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, message: "Head role removed", data: user });
});

module.exports = router;
