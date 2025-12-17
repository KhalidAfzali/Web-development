const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema({
  title: String,
  description: String,
  datetime: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }]
}, { timestamps: true });

module.exports = mongoose.model("Meeting", MeetingSchema);
