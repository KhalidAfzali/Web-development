const express = require("express");
const router = express.Router();

const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

const Semester = require("../models/Semester");
const Section = require("../models/Section");
const TimeSlot = require("../models/TimeSlot");
const Availability = require("../models/Availability");
const Schedule = require("../models/Schedule");
const AuditLog = require("../models/AuditLog");

const { validateSemesterSchedule } = require("../services/scheduleValidation");
const { generateSchedule } = require("../services/scheduleGenerator");

router.use(verifyUser, requireRole("admin"));

// Semesters
router.get("/semesters", async (req, res) => {
  const data = await Semester.find().sort({ year: -1, name: 1 });
  res.json({ success: true, data });
});

router.post("/semesters", async (req, res) => {
  const sem = await Semester.create(req.body);
  res.status(201).json({ success: true, data: sem });
});

router.post("/semesters/:id/activate", async (req, res) => {
  await Semester.updateMany({}, { isActive: false });
  const sem = await Semester.findByIdAndUpdate(req.params.id, { isActive: true, status: "Active" }, { new: true });
  res.json({ success: true, data: sem });
});

// Sections
router.get("/sections", async (req, res) => {
  const { semesterId } = req.query;
  const q = semesterId ? { semester: semesterId } : {};
  const data = await Section.find(q).populate("course").populate("assignedDoctor").populate("assignedTAs");
  res.json({ success: true, data });
});

router.post("/sections", async (req, res) => {
  const sec = await Section.create(req.body);
  res.status(201).json({ success: true, data: sec });
});

router.put("/sections/:id", async (req, res) => {
  const sec = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, data: sec });
});

// TimeSlots
router.get("/timeslots", async (req, res) => {
  const { semesterId } = req.query;
  const q = semesterId ? { semester: semesterId } : {};
  const data = await TimeSlot.find(q).sort({ day: 1, startTime: 1 });
  res.json({ success: true, data });
});

router.post("/timeslots", async (req, res) => {
  const ts = await TimeSlot.create(req.body);
  res.status(201).json({ success: true, data: ts });
});

// Availability (admin view)
router.get("/availability", async (req, res) => {
  const { semesterId } = req.query;
  const data = await Availability.find({ semester: semesterId }).populate("doctor");
  res.json({ success: true, data });
});

// Scheduling actions
router.post("/schedule/generate", async (req, res) => {
  const { semesterId } = req.body;
  const result = await generateSchedule(semesterId);

  await AuditLog.create({
    actor: req.user._id,
    action: "SCHEDULE_GENERATED",
    entity: "Schedule",
    details: result
  });

  res.json({ success: true, data: result });
});

router.post("/schedule/validate", async (req, res) => {
  const { semesterId } = req.body;
  const result = await validateSemesterSchedule(semesterId);

  const hasErrors = result.conflicts.some(c => c.severity === "Error");
  if (!hasErrors) {
    await Schedule.updateMany({ semester: semesterId }, { status: "Validated" });
  }

  res.json({ success: true, data: { ...result, validated: !hasErrors } });
});

router.post("/schedule/publish", async (req, res) => {
  const { semesterId } = req.body;
  const result = await validateSemesterSchedule(semesterId);
  const hasErrors = result.conflicts.some(c => c.severity === "Error");
  if (hasErrors) {
    return res.status(400).json({ success: false, error: "Cannot publish. Fix conflicts first.", data: result });
  }

  await Schedule.updateMany({ semester: semesterId }, { status: "Published", publishedAt: new Date() });

  await AuditLog.create({
    actor: req.user._id,
    action: "SCHEDULE_PUBLISHED",
    entity: "Schedule",
    details: { semesterId }
  });

  res.json({ success: true, message: "Schedule published" });
});

module.exports = router;
