const express = require("express");
const router = express.Router();

const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

const Doctor = require("../models/Doctor");
const User = require("../models/User");

// Admin only
router.use(verifyUser, requireRole(["admin"]));

/**
 * GET all doctors
 */
router.get("/doctors", async (req, res) => {
  const doctors = await Doctor.find({})
    .populate("user", "email username profile role")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: doctors });
});

/**
 * GET current head
 */
router.get("/current", async (req, res) => {
  const head = await User.findOne({ role: "head" })
    .select("email username profile");

  res.json({ success: true, data: head });
});

/**
 * SET new head (replaces old one)
 */
router.patch("/set/:doctorId", async (req, res) => {
  const doctor = await Doctor.findById(req.params.doctorId).populate("user");
  if (!doctor) {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }

  // remove old head
  await User.updateMany(
    { role: "head" },
    { $set: { role: "doctor" } }
  );

  // set new head
  await User.findByIdAndUpdate(doctor.user._id, {
    role: "head"
  });

  res.json({ success: true, message: "Head of department updated" });
});

/**
 * REMOVE head (no head assigned)
 */
router.patch("/remove", async (req, res) => {
  await User.updateMany(
    { role: "head" },
    { $set: { role: "doctor" } }
  );

  res.json({ success: true, message: "Head removed" });
});

module.exports = router;
