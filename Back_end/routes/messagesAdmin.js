const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

const Doctor = require("../models/Doctor");
const Message = require("../models/Message");

// ✅ admin + head
router.use(verifyUser, requireRole(["admin", "head"]));

// ---------- file upload ----------
const uploadsRoot = path.join(process.cwd(), "uploads");
const messagesDir = path.join(uploadsRoot, "messages");
fs.mkdirSync(messagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, messagesDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage });

// ✅ GET doctors list for dropdown
router.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find({})
      .populate("user", "email username profile role")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: doctors });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to load doctors", error: e.message });
  }
});

// ✅ POST send message (JSON or multipart/form-data)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { title, body, priority } = req.body;

    // Support both formats:
    // - JSON: recipientDoctorIds
    // - FormData: receivers[]
    let recipientDoctorIds = req.body.recipientDoctorIds;

    let receivers = req.body["receivers[]"] || req.body.receivers;
    if (typeof receivers === "string") receivers = [receivers];
    if (Array.isArray(receivers) && receivers.length > 0) {
      recipientDoctorIds = receivers;
    }

    if (typeof recipientDoctorIds === "string") {
      try {
        // sometimes comes as JSON string
        const parsed = JSON.parse(recipientDoctorIds);
        recipientDoctorIds = parsed;
      } catch {
        recipientDoctorIds = [recipientDoctorIds];
      }
    }

    if (!Array.isArray(recipientDoctorIds) || recipientDoctorIds.length === 0) {
      return res.status(400).json({ success: false, message: "Select at least 1 doctor" });
    }

    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ success: false, message: "title is required" });
    }

    // allow file-only OR body-only OR both
    const hasBody = body && String(body).trim().length > 0;
    const hasFile = !!req.file;
    if (!hasBody && !hasFile) {
      return res.status(400).json({ success: false, message: "body or file is required" });
    }

    // validate doctor ids exist
    const count = await Doctor.countDocuments({ _id: { $in: recipientDoctorIds } });
    if (count !== recipientDoctorIds.length) {
      return res.status(400).json({ success: false, message: "One or more doctors not found" });
    }

    const attachment = req.file
      ? {
          filename: req.file.filename,
          path: `uploads/messages/${req.file.filename}`,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: `/uploads/messages/${req.file.filename}`,
        }
      : undefined;

    const msg = await Message.create({
      sender: req.user._id,
      recipients: recipientDoctorIds,
      title: String(title).trim(),
      body: hasBody ? String(body).trim() : "",
      priority: priority === "Important" ? "Important" : "Normal",
      attachment: attachment || undefined,
    });

    res.status(201).json({ success: true, message: "Message sent", data: msg });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to send message", error: e.message });
  }
});

module.exports = router;
