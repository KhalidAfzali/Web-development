// routes/semesters.js
const express = require("express");
const router = express.Router();
const verifyUser = require("../middleware/verifyUser");
const Semester = require("../models/Semester");

// Any logged-in user (admin/doctor) can read semesters
router.get("/", verifyUser, async (req, res) => {
  try {
    const semesters = await Semester.find({}).sort({ year: -1, term: 1, createdAt: -1 });
    res.json({ success: true, data: semesters });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to fetch semesters" });
  }
});

module.exports = router;
