const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },

    weekly: [{
      day: { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], required: true },
      windows: [{
        startTime: { type: String, required: true }, // "08:00"
        endTime: { type: String, required: true },   // "14:00"
      }]
    }],

    blocked: [{
      day: { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      reason: String,
    }],
  },
  { timestamps: true }
);

availabilitySchema.index({ semester: 1, doctor: 1 }, { unique: true });

module.exports = mongoose.models.Availability || mongoose.model("Availability", availabilitySchema);
