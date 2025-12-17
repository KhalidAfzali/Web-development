// routes/scheduleManagement.js - Complete version
const express = require('express');
const router = express.Router();
const verifyUser = require('../middleware/verifyUser');
const requireRole = require('../middleware/requireRole');

const Semester = require('../models/Semester');
const Section = require('../models/Section');
const TimeSlot = require('../models/TimeSlot');
const Availability = require('../models/Availability');
const Schedule = require('../models/Schedule');
const AuditLog = require('../models/AuditLog');

const { validateSemesterSchedule } = require('../services/scheduleValidation');
const { generateSchedule } = require('../services/scheduleGenerator');

router.use(verifyUser, requireRole('admin'));

// Semesters
router.get('/semesters', async (req, res) => {
  try {
    const semesters = await Semester.find().sort({ year: -1, name: 1 });
    res.json({ 
      success: true, 
      data: semesters 
    });
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch semesters' 
    });
  }
});

router.post('/semesters', async (req, res) => {
  try {
    const semester = await Semester.create(req.body);
    res.status(201).json({ 
      success: true, 
      data: semester 
    });
  } catch (error) {
    console.error('Error creating semester:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to create semester' 
    });
  }
});

router.post('/semesters/:id/activate', async (req, res) => {
  try {
    // Deactivate all other semesters
    await Semester.updateMany({}, { isActive: false });
    
    // Activate the selected semester
    const semester = await Semester.findByIdAndUpdate(
      req.params.id, 
      { 
        isActive: true, 
        status: 'Active' 
      }, 
      { new: true }
    );
    
    res.json({ 
      success: true, 
      data: semester 
    });
  } catch (error) {
    console.error('Error activating semester:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to activate semester' 
    });
  }
});

// Sections
router.get('/sections', async (req, res) => {
  try {
    const { semesterId, courseId, professorId } = req.query;
    const filter = {};
    
    if (semesterId) filter.semester = semesterId;
    if (courseId) filter.course = courseId;
    if (professorId) filter.assignedDoctor = professorId;
    
    const sections = await Section.find(filter)
      .populate('course', 'courseCode courseName')
      .populate('assignedDoctor', 'employeeId user')
      .populate('assignedTAs', 'studentId user')
      .populate('semester', 'name year');
      
    res.json({ 
      success: true, 
      data: sections 
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sections' 
    });
  }
});

router.post('/sections', async (req, res) => {
  try {
    const section = await Section.create(req.body);
    res.status(201).json({ 
      success: true, 
      data: section 
    });
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to create section' 
    });
  }
});

router.put('/sections/:id', async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    res.json({ 
      success: true, 
      data: section 
    });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to update section' 
    });
  }
});

// TimeSlots
router.get('/timeslots', async (req, res) => {
  try {
    const { semesterId } = req.query;
    const filter = semesterId ? { semester: semesterId } : {};
    
    const timeSlots = await TimeSlot.find(filter)
      .sort({ day: 1, startTime: 1 });
      
    res.json({ 
      success: true, 
      data: timeSlots 
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch time slots' 
    });
  }
});

router.post('/timeslots', async (req, res) => {
  try {
    const timeSlot = await TimeSlot.create(req.body);
    res.status(201).json({ 
      success: true, 
      data: timeSlot 
    });
  } catch (error) {
    console.error('Error creating time slot:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to create time slot' 
    });
  }
});

// Schedule Management
router.post('/generate', async (req, res) => {
  try {
    const { semesterId } = req.body;
    
    if (!semesterId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Semester ID is required' 
      });
    }
    
    const result = await generateSchedule(semesterId);

    // Log the action
    await AuditLog.create({
      actor: req.user._id,
      action: 'SCHEDULE_GENERATED',
      entity: 'Schedule',
      details: result
    });

    res.json({ 
      success: true, 
      message: 'Schedule generated successfully',
      data: result 
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate schedule' 
    });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { semesterId } = req.body;
    
    if (!semesterId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Semester ID is required' 
      });
    }
    
    const result = await validateSemesterSchedule(semesterId);

    const hasErrors = result.conflicts.some(c => c.severity === 'Error');
    if (!hasErrors) {
      await Schedule.updateMany(
        { semester: semesterId }, 
        { status: 'Validated' }
      );
    }

    res.json({ 
      success: true, 
      data: { ...result, validated: !hasErrors } 
    });
  } catch (error) {
    console.error('Error validating schedule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate schedule' 
    });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const { semesterId } = req.body;
    
    if (!semesterId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Semester ID is required' 
      });
    }
    
    // Validate first
    const result = await validateSemesterSchedule(semesterId);
    const hasErrors = result.conflicts.some(c => c.severity === 'Error');
    
    if (hasErrors) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot publish. Fix conflicts first.', 
        data: result 
      });
    }

    // Publish the schedule
    await Schedule.updateMany(
      { semester: semesterId }, 
      { 
        status: 'Published', 
        publishedAt: new Date() 
      }
    );

    // Log the action
    await AuditLog.create({
      actor: req.user._id,
      action: 'SCHEDULE_PUBLISHED',
      entity: 'Schedule',
      details: { semesterId }
    });

    res.json({ 
      success: true, 
      message: 'Schedule published successfully' 
    });
  } catch (error) {
    console.error('Error publishing schedule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to publish schedule' 
    });
  }
});

// Assign course to professor (simplified)
router.post('/assign', async (req, res) => {
  try {
    const { professorId, courseId, sectionNumber = '001', type = 'Lecture', capacity = 30 } = req.body;
    
    if (!professorId || !courseId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Professor ID and Course ID are required' 
      });
    }
    
    // Find active semester
    const activeSemester = await Semester.findOne({ isActive: true });
    if (!activeSemester) {
      return res.status(400).json({ 
        success: false, 
        error: 'No active semester found' 
      });
    }
    
    // Create new section
    const section = await Section.create({
      semester: activeSemester._id,
      course: courseId,
      assignedDoctor: professorId,
      sectionNumber,
      type,
      capacity,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      data: section,
      message: 'Course assigned to professor successfully'
    });
  } catch (error) {
    console.error('Error assigning course:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to assign course' 
    });
  }
});

module.exports = router;