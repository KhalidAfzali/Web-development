// routes/schedule.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Schedule = require("../models/Schedule");
const Doctor = require("../models/Doctor");

const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

const { checkScheduleConflicts } = require("../services/scheduleConflicts");

/* ---------------- Helpers ---------------- */

async function getMyDoctorId(userId) {
  const doc = await Doctor.findOne({ user: userId }).select("_id");
  return doc?._id || null;
}

function isValidId(id) {
  return !!id && mongoose.isValidObjectId(id);
}

async function populateScheduleById(id) {
  return Schedule.findById(id)
    .populate("course", "courseCode courseName credits currentEnrollment")
    .populate("doctor", "employeeId user")
    .populate("classroom", "roomNumber building capacity roomType")
    .populate("teachingAssistants", "studentId")
    .populate("section", "sectionNumber type capacity")
    .populate("semester");
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function forbidden(res, message = "Forbidden") {
  return res.status(403).json({ success: false, message });
}

function conflict(res, conflicts) {
  return res.status(409).json({
    success: false,
    error: "SCHEDULE_CONFLICT",
    message: "Schedule conflict detected",
    conflicts: conflicts || [],
  });
}

/* ---------------- Routes ---------------- */

/**
 * GET /api/schedules
 * Admin: can filter all schedules.
 * Doctor: restricted to his own schedules (ignores professorId).
 */
router.get("/", verifyUser, async (req, res) => {
  try {
    const { semesterId, professorId, courseId, status } = req.query;
    const filter = {};

    if (semesterId && isValidId(semesterId)) filter.semester = semesterId;
    if (courseId && isValidId(courseId)) filter.course = courseId;
    if (status) filter.status = status;

    if (req.user.role === "doctor") {
      const myDoctorId = await getMyDoctorId(req.user._id);
      if (!myDoctorId) return forbidden(res, "Doctor profile not found");
      filter.doctor = myDoctorId;
    } else {
      if (professorId && isValidId(professorId)) filter.doctor = professorId;
    }

    const schedules = await Schedule.find(filter)
      .populate("course", "courseCode courseName credits currentEnrollment")
      .populate("doctor", "employeeId user")
      .populate("classroom", "roomNumber building capacity roomType")
      .populate("teachingAssistants", "studentId")
      .populate("section", "sectionNumber type capacity")
      .populate("semester")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: schedules.length, data: schedules });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return res.status(500).json({ success: false, message: "Error fetching schedules", error: error.message });
  }
});

/**
 * GET /api/schedules/me
 * Doctor-only endpoint.
 */
router.get("/me", verifyUser, requireRole("doctor"), async (req, res) => {
  try {
    const myDoctorId = await getMyDoctorId(req.user._id);
    if (!myDoctorId) return res.status(404).json({ success: false, message: "Doctor profile not found" });

    const schedules = await Schedule.find({ doctor: myDoctorId })
      .populate("course", "courseCode courseName credits currentEnrollment")
      .populate("classroom", "roomNumber building capacity roomType")
      .populate("teachingAssistants", "studentId")
      .populate("section", "sectionNumber type capacity")
      .populate("semester")
      .sort({ "scheduleSlots.day": 1, "scheduleSlots.startTime": 1 });

    return res.json({ success: true, data: schedules });
  } catch (error) {
    console.error("Error fetching my schedules:", error);
    return res.status(500).json({ success: false, message: "Error fetching my schedules", error: error.message });
  }
});

/**
 * GET /api/schedules/professor/:professorId
 * Admin: can access any.
 * Doctor: only his own.
 */
router.get("/professor/:professorId", verifyUser, async (req, res) => {
  try {
    const requestedDoctorId = req.params.professorId;
    if (!isValidId(requestedDoctorId)) return badRequest(res, "Invalid professorId");

    if (req.user.role === "doctor") {
      const myDoctorId = await getMyDoctorId(req.user._id);
      if (!myDoctorId) return forbidden(res, "Doctor profile not found");
      if (String(myDoctorId) !== String(requestedDoctorId)) return forbidden(res);
    }

    const schedules = await Schedule.find({ doctor: requestedDoctorId })
      .populate("course", "courseCode courseName credits currentEnrollment")
      .populate("classroom", "roomNumber building capacity roomType")
      .populate("teachingAssistants", "studentId")
      .populate("section", "sectionNumber type capacity")
      .populate("semester")
      .sort({ "scheduleSlots.day": 1, "scheduleSlots.startTime": 1 });

    return res.json({ success: true, data: schedules });
  } catch (error) {
    console.error("Error fetching professor schedule:", error);
    return res.status(500).json({ success: false, message: "Error fetching schedule", error: error.message });
  }
});

/**
 * POST /api/schedules/check-conflicts
 * Admin-only. Used by frontend before saving.
 * IMPORTANT: Put this BEFORE "/:id".
 */
router.post("/check-conflicts", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const { semester, doctor, classroom, section, scheduleSlots, excludeScheduleId } = req.body;

    const conflicts = await checkScheduleConflicts({
      semesterId: semester,
      doctorId: doctor,
      classroomId: classroom,
      sectionId: section,
      scheduleSlots,
      excludeScheduleId,
    });

    return res.json({ success: true, conflicts });
  } catch (e) {
    console.error("check-conflicts error:", e);
    return res.status(500).json({ success: false, message: "Failed to check conflicts" });
  }
});

/**
 * POST /api/schedules
 * Admin-only (doctors should not create schedules).
 * Enforces all conflicts before insert.
 */
router.post("/", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const { semester, doctor, classroom, section, scheduleSlots } = req.body;

    if (!semester || !doctor || !classroom || !Array.isArray(scheduleSlots) || scheduleSlots.length === 0) {
      return badRequest(res, "Missing required fields (semester, doctor, classroom, scheduleSlots)");
    }

    const conflicts = await checkScheduleConflicts({
      semesterId: semester,
      doctorId: doctor,
      classroomId: classroom,
      sectionId: section,
      scheduleSlots,
    });

    if (conflicts.length) return conflict(res, conflicts);

    const created = await Schedule.create(req.body);
    const populated = await populateScheduleById(created._id);

    return res.status(201).json({ success: true, data: populated, message: "Schedule created successfully" });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return res.status(400).json({ success: false, message: "Error creating schedule", error: error.message });
  }
});

/**
 * GET /api/schedules/:id
 * Admin: can read any.
 * Doctor: only if belongs to him.
 */
router.get("/:id", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return badRequest(res, "Invalid schedule id");

    const schedule = await populateScheduleById(id);
    if (!schedule) return res.status(404).json({ success: false, message: "Schedule not found" });

    if (req.user.role === "doctor") {
      const myDoctorId = await getMyDoctorId(req.user._id);
      if (!myDoctorId) return forbidden(res, "Doctor profile not found");
      if (String(schedule.doctor?._id || schedule.doctor) !== String(myDoctorId)) return forbidden(res);
    }

    return res.json({ success: true, data: schedule });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return res.status(500).json({ success: false, message: "Error fetching schedule", error: error.message });
  }
});

/**
 * PUT /api/schedules/:id
 * Admin-only.
 * Enforces conflicts before update.
 */
router.put("/:id", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return badRequest(res, "Invalid schedule id");

    const { semester, doctor, classroom, section, scheduleSlots } = req.body;
    if (!semester || !doctor || !classroom || !Array.isArray(scheduleSlots) || scheduleSlots.length === 0) {
      return badRequest(res, "Missing required fields (semester, doctor, classroom, scheduleSlots)");
    }

    const conflicts = await checkScheduleConflicts({
      semesterId: semester,
      doctorId: doctor,
      classroomId: classroom,
      sectionId: section,
      scheduleSlots,
      excludeScheduleId: id,
    });

    if (conflicts.length) return conflict(res, conflicts);

    const updated = await Schedule.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Schedule not found" });

    const populated = await populateScheduleById(updated._id);
    return res.json({ success: true, data: populated, message: "Schedule updated successfully" });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return res.status(400).json({ success: false, message: "Error updating schedule", error: error.message });
  }
});

/**
 * DELETE /api/schedules/:id
 * Admin-only.
 */
router.delete("/:id", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return badRequest(res, "Invalid schedule id");

    const deleted = await Schedule.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Schedule not found" });

    return res.json({ success: true, message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return res.status(500).json({ success: false, message: "Error deleting schedule", error: error.message });
  }
});

module.exports = router;
