const mongoose = require('mongoose');

const taSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: String, required: true, unique: true },
  department: { type: String, required: true, default: 'Computer Science' },
  year: { type: Number, required: true },
  qualifications: [String],
  assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  maxHours: { type: Number, default: 20 },
  currentHours: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('TeachingAssistant', taSchema);