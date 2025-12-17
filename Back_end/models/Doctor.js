const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  specialization: [{
    type: String,
    required: true
  }],
  office: {
    building: {
      type: String,
      required: true
    },
    room: {
      type: String,
      required: true
    }
  },
  maxCourses: {
    type: Number,
    required: true,
    default: 3
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Doctor', doctorSchema);