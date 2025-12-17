const express = require("express");
const router = express.Router();

const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

const Doctor = require("../models/Doctor");
const Message = require("../models/Message");

// routes/messagesDoctor.js
router.use(verifyUser, requireRole(["doctor", "head"]));


async function getDoctor(req) {
  const doc = await Doctor.findOne({ user: req.user._id });
  return doc;
}

router.get("/", async (req, res) => {
  const doc = await getDoctor(req);
  if (!doc) return res.status(404).json({ success: false, message: "Doctor profile not found" });

  const msgs = await Message.find({ recipients: doc._id })
    .populate("sender", "username email profile role")
    .sort({ createdAt: -1 })
    .lean();

  const data = msgs.map((m) => ({
    ...m,
    isRead: Array.isArray(m.readBy) ? m.readBy.some((id) => String(id) === String(doc._id)) : false,
  }));

  res.json({ success: true, data });
});

router.get("/unread-count", async (req, res) => {
  const doc = await getDoctor(req);
  if (!doc) return res.status(404).json({ success: false, message: "Doctor profile not found" });

  const count = await Message.countDocuments({
    recipients: doc._id,
    readBy: { $ne: doc._id },
  });

  res.json({ success: true, data: { unreadCount: count } });
});

router.get("/:id", async (req, res) => {
  const doc = await getDoctor(req);
  if (!doc) return res.status(404).json({ success: false, message: "Doctor profile not found" });

  const msg = await Message.findOne({ _id: req.params.id, recipients: doc._id })
    .populate("sender", "username email profile role")
    .lean();

  if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

  const data = {
    ...msg,
    isRead: Array.isArray(msg.readBy) ? msg.readBy.some((id) => String(id) === String(doc._id)) : false,
  };

  res.json({ success: true, data });
});

router.post("/:id/read", async (req, res) => {
  const doc = await getDoctor(req);
  if (!doc) return res.status(404).json({ success: false, message: "Doctor profile not found" });

  const msg = await Message.findOneAndUpdate(
    { _id: req.params.id, recipients: doc._id },
    { $addToSet: { readBy: doc._id } },
    { new: true }
  );

  if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

  res.json({ success: true });
});

module.exports = router;
