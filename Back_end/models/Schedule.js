const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },

    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    teachingAssistants: [{ type: mongoose.Schema.Types.ObjectId, ref: "TeachingAssistant" }],
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },

    scheduleSlots: [{
      day: { type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      type: { type: String, enum: ["Lecture", "Lab", "Tutorial", "Seminar"], required: true }
    }],
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true
    },

    status: { type: String, enum: ["Draft", "Validated", "Published", "Cancelled"], default: "Draft" },
    publishedAt: Date,
  },
  { timestamps: true }
);

scheduleSchema.index({ semester: 1, section: 1 }, { unique: true });

module.exports = mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema);
