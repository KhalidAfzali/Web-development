// controllers/scheduleController.js
const Schedule = require('../models/Schedule');
const Section = require('../models/Section');
const Doctor = require('../models/Doctor');
const Classroom = require('../models/Classroom');
const Course = require('../models/Course');
const { generateSchedule, validateSchedule } = require('../services/scheduleGenerator');

const scheduleController = {
  // Generate schedule for semester
  generate: async (req, res) => {
    try {
      const { semesterId } = req.body;
      
      if (!semesterId) {
        return res.status(400).json({
          success: false,
          message: 'Semester ID is required'
        });
      }

      const result = await generateSchedule(semesterId);
      
      res.json({
        success: true,
        message: 'Schedule generated successfully',
        data: result
      });
    } catch (error) {
      console.error('Schedule generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating schedule',
        error: error.message
      });
    }
  },

  // Validate schedule
  validate: async (req, res) => {
    try {
      const { semesterId } = req.body;
      
      if (!semesterId) {
        return res.status(400).json({
          success: false,
          message: 'Semester ID is required'
        });
      }

      const validation = await validateSchedule(semesterId);
      
      res.json({
        success: true,
        message: 'Schedule validation completed',
        data: validation
      });
    } catch (error) {
      console.error('Schedule validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating schedule',
        error: error.message
      });
    }
  },

  // Assign course to professor
  assignCourse: async (req, res) => {
    try {
      const { professorId, courseId, sectionId } = req.body;
      
      // Find or create section
      let section;
      if (sectionId) {
        section = await Section.findById(sectionId);
      } else {
        // Create new section
        const course = await Course.findById(courseId);
        if (!course) {
          return res.status(404).json({
            success: false,
            message: 'Course not found'
          });
        }
        
        // Generate section number
        const existingSections = await Section.countDocuments({ course: courseId });
        const sectionNumber = (existingSections + 1).toString().padStart(3, '0');
        
        section = await Section.create({
          course: courseId,
          sectionNumber,
          type: 'Lecture',
          capacity: course.maxStudents || 30
        });
      }
      
      // Update section with professor
      section.assignedDoctor = professorId;
      await section.save();
      
      res.json({
        success: true,
        message: 'Course assigned successfully',
        data: section
      });
    } catch (error) {
      console.error('Course assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Error assigning course',
        error: error.message
      });
    }
  },

  // Publish schedule
  publish: async (req, res) => {
    try {
      const { semesterId } = req.body;
      
      await Schedule.updateMany(
        { semester: semesterId },
        { status: 'Published', publishedAt: new Date() }
      );
      
      res.json({
        success: true,
        message: 'Schedule published successfully'
      });
    } catch (error) {
      console.error('Publish schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Error publishing schedule',
        error: error.message
      });
    }
  }
};

module.exports = scheduleController;