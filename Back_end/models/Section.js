const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  semester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Semester",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true
  },
  sectionNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["Lecture", "Lab", "Tutorial"],
    default: "Lecture"
  },
  capacity: {
    type: Number,
    default: 30
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Section", sectionSchema);
