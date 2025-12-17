const express = require("express");
const router = express.Router();
const Classroom = require("../models/Classroom");
const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

// Get all classrooms
router.get("/", verifyUser, async (req, res) => {
  try {
    const classrooms = await Classroom.find()
      .select("-__v")
      .sort({ building: 1, roomNumber: 1 });

    return res.json({
      success: true,
      count: classrooms.length,
      data: classrooms,
    });
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch classrooms",
      error: error.message,
    });
  }
});

// Get classroom by ID
router.get("/:id", verifyUser, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id).select("-__v");

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: "Classroom not found",
      });
    }

    return res.json({
      success: true,
      data: classroom,
    });
  } catch (error) {
    console.error("Error fetching classroom:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch classroom",
      error: error.message,
    });
  }
});

// Create new classroom (Admin only)
router.post("/", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const { roomNumber, building, capacity, roomType, facilities, description, isAvailable } =
      req.body;

    const missingFields = [];
    if (!roomNumber || String(roomNumber).trim() === "") missingFields.push("roomNumber");
    if (!building || String(building).trim() === "") missingFields.push("building");
    if (capacity === undefined || capacity === null || String(capacity).trim() === "")
      missingFields.push("capacity");
    if (!roomType || String(roomType).trim() === "") missingFields.push("roomType");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    const rn = roomNumber.trim().toUpperCase();

const existingClassroom = await Classroom.findOne({ roomNumber: rn });
if (existingClassroom) {
  return res.status(400).json({
    success: false,
    message: `Classroom with room number "${rn}" already exists`
  });
}


    const parsedCapacity = parseInt(capacity, 10);
    if (Number.isNaN(parsedCapacity)) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a valid number",
      });
    }

    const classroomData = {
      roomNumber: rn,
      building: String(building).trim(),
      capacity: parsedCapacity,
      roomType: String(roomType).trim(),
      facilities: Array.isArray(facilities) ? facilities : [],
      description: description ? String(description).trim() : "",
      isAvailable: isAvailable !== false,
    };

    const classroom = await Classroom.create(classroomData);

    return res.status(201).json({
      success: true,
      message: "Classroom created successfully",
      data: classroom,
    });
  } catch (error) {
    console.error("Error creating classroom:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Room number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create classroom",
      error: error.message,
    });
  }
});

// Update classroom (Admin only)  ✅ SAFE UPDATE
router.put("/:id", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const { roomNumber, building, capacity, roomType, facilities, description, isAvailable } =
      req.body;

    const existing = await Classroom.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Classroom not found" });
    }

    const update = {};

    if (roomNumber !== undefined) {
      const rn = String(roomNumber).trim().toUpperCase();
      if (!rn) return res.status(400).json({ success: false, message: "Room number is required" });

      const dup = await Classroom.findOne({ roomNumber: rn, _id: { $ne: existing._id } });
      if (dup) return res.status(400).json({ success: false, message: "Room number already exists" });

      update.roomNumber = rn;
    }

    if (building !== undefined) {
      const b = String(building).trim();
      if (!b) return res.status(400).json({ success: false, message: "Building is required" });
      update.building = b;
    }

    if (roomType !== undefined) {
      const rt = String(roomType).trim();
      if (!rt) return res.status(400).json({ success: false, message: "Room type is required" });
      update.roomType = rt;
    }

    if (capacity !== undefined) {
      const c = parseInt(capacity, 10);
      if (Number.isNaN(c)) {
        return res.status(400).json({ success: false, message: "Capacity must be a valid number" });
      }
      update.capacity = c;
    }

    if (facilities !== undefined) {
      update.facilities = Array.isArray(facilities) ? facilities : [];
    }

    if (description !== undefined) {
      update.description = String(description).trim();
    }

    if (isAvailable !== undefined) {
      update.isAvailable = !!isAvailable;
    }

    const updated = await Classroom.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-__v");

    return res.json({
      success: true,
      message: "Classroom updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating classroom:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }

    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Room number already exists" });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update classroom",
      error: error.message,
    });
  }
});

// Delete classroom (Admin only)
router.delete("/:id", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndDelete(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: "Classroom not found",
      });
    }

    return res.json({
      success: true,
      message: "Classroom deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting classroom:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete classroom",
      error: error.message,
    });
  }
});

module.exports = router;
