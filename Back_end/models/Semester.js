const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Fall"
    year: { type: Number, required: true }, // 2025
    code: { type: String, required: true, unique: true }, // "FALL-2025"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
    status: { type: String, enum: ["Draft", "Active", "Archived"], default: "Draft" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Semester || mongoose.model("Semester", semesterSchema);
