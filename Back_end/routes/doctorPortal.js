const express = require("express");
const router = express.Router();

const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

const Doctor = require("../models/Doctor");
const Availability = require("../models/Availability");
const Semester = require("../models/Semester");
const Schedule = require("../models/Schedule");

router.use(verifyUser, requireRole(["doctor", "head"]));


router.get("/me", async (req, res) => {
  const doc = await Doctor.findOne({ user: req.user._id }).populate("user", "email username profile");
  if (!doc) return res.status(404).json({ success: false, error: "Doctor profile not found" });
  res.json({ success: true, data: doc });
});

router.get("/schedule", async (req, res) => {
  const active = await Semester.findOne({ isActive: true });
  if (!active) return res.status(400).json({ success: false, error: "No active semester" });

  const doc = await Doctor.findOne({ user: req.user._id });
  const schedules = await Schedule.find({ semester: active._id, doctor: doc._id, status: "Published" })
    .populate("course", "courseCode courseName")
    .populate("classroom", "roomNumber building")
    .populate("section", "sectionNumber type capacity")
    .populate("teachingAssistants");

  res.json({ success: true, data: schedules });
});

router.get("/availability", async (req, res) => {
  const active = await Semester.findOne({ isActive: true });
  const doc = await Doctor.findOne({ user: req.user._id });
  const av = await Availability.findOne({ semester: active._id, doctor: doc._id });
  res.json({ success: true, data: av || null });
});

router.post("/availability", async (req, res) => {
  const active = await Semester.findOne({ isActive: true });
  const doc = await Doctor.findOne({ user: req.user._id });

  const av = await Availability.findOneAndUpdate(
    { semester: active._id, doctor: doc._id },
    { ...req.body, semester: active._id, doctor: doc._id },
    { new: true, upsert: true, runValidators: true }
  );

  res.json({ success: true, data: av });
});

module.exports = router;
