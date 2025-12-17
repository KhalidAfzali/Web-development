const express = require("express");
const router = express.Router();
const Section = require("../models/Section");
const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

// GET sections (admin only)
router.get("/", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const { courseId, semesterId, professorId } = req.query;
    const filter = {};
    if (courseId) filter.course = courseId;
    if (semesterId) filter.semester = semesterId;
    if (professorId) filter.assignedDoctor = professorId;

    const sections = await Section.find(filter)
      .populate("course", "courseCode courseName")
      .populate("assignedDoctor", "employeeId user")
      .populate("semester", "name year");

    res.json({ success: true, data: sections });
  } catch (e) {
    res.status(500).json({ success: false, message: "Error fetching sections" });
  }
});

// CREATE section (admin only) with clean duplicate error
router.post("/", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const section = await Section.create(req.body);
    res.status(201).json({ success: true, data: section, message: "Section created" });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 11000,
        error: "DUPLICATE_SECTION",
        message: `Section ${e?.keyValue?.sectionNumber} already exists for this semester + course.`,
        keyValue: e.keyValue,
      });
    }
    res.status(400).json({ success: false, message: "Error creating section", error: e.message });
  }
});

// UPDATE section (admin only)
router.put("/:id", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!section) return res.status(404).json({ success: false, message: "Section not found" });
    res.json({ success: true, data: section, message: "Section updated" });
  } catch (e) {
    res.status(400).json({ success: false, message: "Error updating section", error: e.message });
  }
});

// ASSIGN course to professor must include semester
router.post("/assign", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const { semesterId, professorId, courseId, sectionNumber = "001", type = "Lecture", capacity = 30 } = req.body;
    if (!semesterId) return res.status(400).json({ success: false, message: "semesterId is required" });

    const section = await Section.create({
      semester: semesterId,
      course: courseId,
      assignedDoctor: professorId,
      sectionNumber,
      type,
      capacity,
      isActive: true,
    });

    res.status(201).json({ success: true, data: section, message: "Assigned successfully" });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 11000,
        error: "DUPLICATE_SECTION",
        message: `Section ${e?.keyValue?.sectionNumber} already exists for this semester + course.`,
        keyValue: e.keyValue,
      });
    }
    res.status(400).json({ success: false, message: "Error assigning course", error: e.message });
  }
});

router.delete("/:id", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: "Section not found" });
    res.json({ success: true, message: "Section deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to delete section" });
  }
});

module.exports = router;
