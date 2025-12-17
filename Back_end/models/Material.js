// models/Material.js
const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: String,
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  fileName: { 
    type: String, 
    required: true 
  },
  fileSize: { 
    type: Number, 
    required: true 
  },
  fileUrl: { 
    type: String, 
    required: true 
  },
  fileType: { 
    type: String, 
    enum: ['pdf', 'doc', 'ppt', 'video', 'other'] 
  },
  type: { 
    type: String, 
    enum: ['slides', 'assignment', 'notes', 'syllabus', 'other'] 
  },
  originalName: String,
mimeType: String,

  isPublic: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Material', materialSchema);