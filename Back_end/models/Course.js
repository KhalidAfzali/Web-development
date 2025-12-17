const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, unique: true },
  courseName: { type: String, required: true },
  description: String,
  credits: { type: Number, required: true },
  department: { type: String, required: true, default: 'Computer Science' },
  level: { 
    type: String, 
    enum: ['Undergraduate', 'Graduate', 'PhD'],
    required: true 
  },
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  learningOutcomes: [String],
  syllabus: String,
  isActive: { type: Boolean, default: true },
  maxStudents: Number,
  currentEnrollment: { type: Number, default: 0 }
}, { 
  timestamps: true 
});

// Check if model already exists to prevent OverwriteModelError
module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
