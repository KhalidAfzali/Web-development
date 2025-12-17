const mongoose = require("mongoose");

const TimeSlotSchema = new mongoose.Schema(
  {
    semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
    day: {
      type: String,
      required: true,
      enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      index: true,
    },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "10:30"
    label: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicates in same semester
TimeSlotSchema.index({ semester: 1, day: 1, startTime: 1, endTime: 1 }, { unique: true });

module.exports = mongoose.model("TimeSlot", TimeSlotSchema);
