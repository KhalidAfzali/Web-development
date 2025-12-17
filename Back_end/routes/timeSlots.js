const express = require("express");
const router = express.Router();
const TimeSlot = require("../models/TimeSlot");

// If you have auth middleware, apply it:
// const { auth, requireAdmin } = require("../middleware/auth");

function isValidHHMM(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

router.get("/", async (req, res) => {
  try {
    const { semesterId } = req.query;
    if (!semesterId) return res.status(400).json({ success: false, error: "semesterId is required" });

    const data = await TimeSlot.find({ semester: semesterId }).sort({ day: 1, startTime: 1 });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, error: "Failed to fetch time slots" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { semester, day, startTime, endTime, label } = req.body;

    if (!semester) return res.status(400).json({ success: false, error: "semester is required" });
    if (!day) return res.status(400).json({ success: false, error: "day is required" });
    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, error: "startTime and endTime are required" });
    }
    if (!isValidHHMM(startTime) || !isValidHHMM(endTime)) {
      return res.status(400).json({ success: false, error: "Time must be HH:MM (e.g. 09:00)" });
    }
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      return res.status(400).json({ success: false, error: "endTime must be after startTime" });
    }

    const created = await TimeSlot.create({
      semester,
      day,
      startTime,
      endTime,
      label: label || "",
    });

    return res.json({ success: true, data: created });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ success: false, error: "Duplicate time slot in this semester" });
    }
    return res.status(400).json({ success: false, error: e.message || "Failed to create time slot" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await TimeSlot.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false, error: "Failed to delete time slot" });
  }
});

module.exports = router;
