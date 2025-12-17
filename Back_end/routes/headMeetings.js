const express = require("express");
const router = express.Router();

const Meeting = require("../models/Meeting");
const Message = require("../models/Message");
const Doctor = require("../models/Doctor");

/**
 * Local middleware: HEAD only
 * No requireRole used at all
 */
function headOnly(req, res, next) {
  if (!req.user || req.user.role !== "head") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Head role required"
    });
  }
  next();
}

// HEAD creates a meeting
router.post("/", headOnly, async (req, res) => {
  try {
    const { title, description, datetime, participants } = req.body;

    if (!title || !datetime || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const meeting = await Meeting.create({
      title,
      description,
      datetime,
      createdBy: req.user._id,
      participants
    });

    const doctors = await Doctor.find({
      _id: { $in: participants }
    }).lean();

    for (const d of doctors) {
      await Message.create({
        sender: req.user._id,
        recipientDoctor: d._id,
        title: `Meeting Scheduled: ${title}`,
        body:
          `Time: ${new Date(datetime).toLocaleString()}\n\n` +
          (description || ""),
        priority: "Important"
      });
    }

    res.json({
      success: true,
      message: "Meeting created and notifications sent",
      data: meeting
    });
  } catch (err) {
    console.error("Meeting error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

module.exports = router;
