const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

// GET my doctor profile
router.get("/me", verifyUser, requireRole("doctor"), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id })
      .populate("user", "username email role profile");

    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });

    return res.json({ success: true, data: doctor });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Failed to load profile" });
  }
});

// PUT update my doctor profile + user profile
router.put("/me", verifyUser, requireRole("doctor"), async (req, res) => {
  try {
    const {
      // User profile
      firstName,
      lastName,
      phone,
      // Doctor fields
      office,
      specialization,
      bio,
    } = req.body;

    // 1) update user profile
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.profile = user.profile || {};
    if (firstName != null) user.profile.firstName = String(firstName);
    if (lastName != null) user.profile.lastName = String(lastName);
    if (phone != null) user.profile.phone = String(phone);

    await user.save();

    // 2) update doctor
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });

    if (office != null) doctor.office = office; // expect {building, room}
    if (specialization != null) doctor.specialization = specialization; // expect array of strings
    if (bio != null) doctor.bio = String(bio);

    await doctor.save();

    const populated = await Doctor.findById(doctor._id).populate("user", "username email role profile");
    return res.json({ success: true, message: "Profile updated", data: populated });
  } catch (e) {
    return res.status(400).json({ success: false, message: "Failed to update profile", error: e.message });
  }
});

module.exports = router;
