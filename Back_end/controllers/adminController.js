// controllers/adminController.js
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const TeachingAssistant = require('../models/TeachingAssistant');
const Course = require('../models/Course');
const Classroom = require('../models/Classroom');
const Schedule = require('../models/Schedule');

const adminController = {
  // User Management
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error fetching users', 
        error: error.message 
      });
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user',
        error: error.message
      });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { password, ...updateData } = req.body;
      
      if (password) {
        const bcrypt = require('bcryptjs');
        updateData.password = await bcrypt.hash(password, 12);
      }
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating user',
        error: error.message
      });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Also delete associated doctor/TA profiles
      await Doctor.deleteOne({ user: req.params.id });
      await TeachingAssistant.deleteOne({ user: req.params.id });
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting user',
        error: error.message
      });
    }
  },

  // Doctor Management
  getAllDoctors: async (req, res) => {
    try {
      const doctors = await Doctor.find().populate('user', 'username email profile');
      res.json({
        success: true,
        count: doctors.length,
        data: doctors
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error fetching doctors', 
        error: error.message 
      });
    }
  },

  createDoctor: async (req, res) => {
    try {
      // First create user
      const bcrypt = require('bcryptjs');
      const userData = {
        username: req.body.username,
        email: req.body.email,
        password: await bcrypt.hash(req.body.password || 'default123', 12),
        role: 'doctor',
        profile: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phone: req.body.phone,
          department: req.body.department
        }
      };
      
      const user = await User.create(userData);
      
      // Then create doctor profile
      const doctorData = {
        user: user._id,
        employeeId: req.body.employeeId,
        specialization: req.body.specialization || [],
        office: req.body.office || { building: 'CS Building', room: 'TBD' },
        maxCourses: req.body.maxCourses || 3
      };
      
      const doctor = await Doctor.create(doctorData);
      await doctor.populate('user', 'username email profile');
      
      res.status(201).json({
        success: true,
        data: doctor,
        message: 'Doctor created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating doctor',
        error: error.message
      });
    }
  },

  updateDoctor: async (req, res) => {
    try {
      const doctor = await Doctor.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('user', 'username email profile');
      
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }
      
      res.json({
        success: true,
        data: doctor,
        message: 'Doctor updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating doctor',
        error: error.message
      });
    }
  },

  deleteDoctor: async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }
      
      // Delete user account as well
      await User.findByIdAndDelete(doctor.user);
      await Doctor.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'Doctor deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting doctor',
        error: error.message
      });
    }
  },

  // TA Management
  getAllTAs: async (req, res) => {
    try {
      const tas = await TeachingAssistant.find().populate('user', 'username email profile');
      res.json({
        success: true,
        count: tas.length,
        data: tas
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error fetching TAs', 
        error: error.message 
      });
    }
  },

  createTA: async (req, res) => {
    try {
      // First create user
      const bcrypt = require('bcryptjs');
      const userData = {
        username: req.body.username,
        email: req.body.email,
        password: await bcrypt.hash(req.body.password || 'default123', 12),
        role: 'ta',
        profile: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phone: req.body.phone,
          department: req.body.department
        }
      };
      
      const user = await User.create(userData);
      
      // Then create TA profile
      const taData = {
        user: user._id,
        studentId: req.body.studentId,
        department: req.body.department || 'Computer Science',
        year: req.body.year,
        qualifications: req.body.qualifications || [],
        maxHours: req.body.maxHours || 20
      };
      
      const ta = await TeachingAssistant.create(taData);
      await ta.populate('user', 'username email profile');
      
      res.status(201).json({
        success: true,
        data: ta,
        message: 'Teaching Assistant created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating TA',
        error: error.message
      });
    }
  },

  updateTA: async (req, res) => {
    try {
      const ta = await TeachingAssistant.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('user', 'username email profile');
      
      if (!ta) {
        return res.status(404).json({
          success: false,
          message: 'TA not found'
        });
      }
      
      res.json({
        success: true,
        data: ta,
        message: 'TA updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating TA',
        error: error.message
      });
    }
  },

  deleteTA: async (req, res) => {
    try {
      const ta = await TeachingAssistant.findById(req.params.id);
      if (!ta) {
        return res.status(404).json({
          success: false,
          message: 'TA not found'
        });
      }
      
      // Delete user account as well
      await User.findByIdAndDelete(ta.user);
      await TeachingAssistant.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'TA deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting TA',
        error: error.message
      });
    }
  },

  // Course Management
  getAllCourses: async (req, res) => {
    try {
      const courses = await Course.find().sort({ courseCode: 1 });
      res.json({
        success: true,
        count: courses.length,
        data: courses
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error fetching courses', 
        error: error.message 
      });
    }
  },

  createCourse: async (req, res) => {
    try {
      const course = await Course.create(req.body);
      res.status(201).json({
        success: true,
        data: course,
        message: 'Course created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating course',
        error: error.message
      });
    }
  },

  updateCourse: async (req, res) => {
    try {
      const course = await Course.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      
      res.json({
        success: true,
        data: course,
        message: 'Course updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating course',
        error: error.message
      });
    }
  },

  deleteCourse: async (req, res) => {
    try {
      const course = await Course.findByIdAndDelete(req.params.id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting course',
        error: error.message
      });
    }
  },

  // Classroom Management
  getAllClassrooms: async (req, res) => {
    try {
      const classrooms = await Classroom.find().sort({ building: 1, roomNumber: 1 });
      res.json({
        success: true,
        count: classrooms.length,
        data: classrooms
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error fetching classrooms', 
        error: error.message 
      });
    }
  },

  createClassroom: async (req, res) => {
    try {
      const classroom = await Classroom.create(req.body);
      res.status(201).json({
        success: true,
        data: classroom,
        message: 'Classroom created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating classroom',
        error: error.message
      });
    }
  },

  updateClassroom: async (req, res) => {
    try {
      const classroom = await Classroom.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found'
        });
      }
      
      res.json({
        success: true,
        data: classroom,
        message: 'Classroom updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating classroom',
        error: error.message
      });
    }
  },

  deleteClassroom: async (req, res) => {
    try {
      const classroom = await Classroom.findByIdAndDelete(req.params.id);
      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Classroom deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting classroom',
        error: error.message
      });
    }
  },

  // Schedule Management
  getAllSchedules: async (req, res) => {
    try {
      const schedules = await Schedule.find()
        .populate('course', 'courseCode courseName')
        .populate('doctor', 'employeeId')
        .populate('classroom', 'roomNumber building')
        .populate('teachingAssistants', 'studentId')
        .populate('section', 'sectionNumber')
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        count: schedules.length,
        data: schedules
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching schedules',
        error: error.message
      });
    }
  },

  createSchedule: async (req, res) => {
    try {
      const schedule = await Schedule.create(req.body);
      await schedule.populate([
        { path: 'course', select: 'courseCode courseName' },
        { path: 'doctor', select: 'employeeId' },
        { path: 'classroom', select: 'roomNumber building' },
        { path: 'teachingAssistants', select: 'studentId' },
        { path: 'section', select: 'sectionNumber' }
      ]);
      
      res.status(201).json({
        success: true,
        data: schedule,
        message: 'Schedule created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating schedule',
        error: error.message
      });
    }
  },

  updateSchedule: async (req, res) => {
    try {
      const schedule = await Schedule.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate([
        { path: 'course', select: 'courseCode courseName' },
        { path: 'doctor', select: 'employeeId' },
        { path: 'classroom', select: 'roomNumber building' },
        { path: 'teachingAssistants', select: 'studentId' },
        { path: 'section', select: 'sectionNumber' }
      ]);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }
      
      res.json({
        success: true,
        data: schedule,
        message: 'Schedule updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating schedule',
        error: error.message
      });
    }
  },

  deleteSchedule: async (req, res) => {
    try {
      const schedule = await Schedule.findByIdAndDelete(req.params.id);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Schedule deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting schedule',
        error: error.message
      });
    }
  },

  generateSchedule: async (req, res) => {
    try {
      // Import schedule generator dynamically
      const { generateSchedule } = require('../services/scheduleGenerator');
      const result = await generateSchedule(req.body.semesterId);
      
      res.json({
        success: true,
        message: 'Schedule generation completed',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating schedule',
        error: error.message
      });
    }
  },

  validateSchedule: async (req, res) => {
    try {
      // Import schedule validator dynamically
      const { validateSemesterSchedule } = require('../services/scheduleValidation');
      const result = await validateSemesterSchedule(req.body.semesterId);
      
      res.json({
        success: true,
        message: 'Schedule validation completed',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error validating schedule',
        error: error.message
      });
    }
  }
};

module.exports = adminController;