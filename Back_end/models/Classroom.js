const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  roomNumber: { 
    type: String, 
    required: [true, 'Room number is required'], 
    unique: true,
    trim: true,
    uppercase: true
  },
  building: { 
    type: String, 
    required: [true, 'Building is required'],
    trim: true
  },
  capacity: { 
    type: Number, 
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [1000, 'Capacity cannot exceed 1000']
  },
  roomType: { 
    type: String, 
    required: [true, 'Room type is required'],
    enum: ['Lecture Hall', 'Lab', 'Seminar Room', 'Computer Lab', 'Auditorium', 'Tutorial Room'],
    default: 'Lecture Hall'
  },
  facilities: { 
    type: [String], 
    default: [] 
  },
  description: { 
    type: String, 
    default: '',
    trim: true
  },
  isAvailable: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

// Index for faster queries
classroomSchema.index({ building: 1, roomNumber: 1 });

module.exports = mongoose.models.Classroom || mongoose.model('Classroom', classroomSchema);