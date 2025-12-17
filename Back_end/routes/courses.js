const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Schedule = require('../models/Schedule');

// @desc    Get all courses
// @route   GET /api/courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({})
      .sort({ courseCode: 1 });

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
});

// @desc    Get courses by professor ID
// @route   GET /api/courses/professor/:professorId
router.get('/professor/:professorId', async (req, res) => {
  try {
    // Get courses assigned to professor through schedules
    const schedules = await Schedule.find({ 
      doctor: req.params.professorId 
    }).populate('course');

    const courses = schedules.map(schedule => schedule.course).filter(course => course);
    
    // Remove duplicates
    const uniqueCourses = courses.filter((course, index, self) => 
      index === self.findIndex(c => c._id.toString() === course._id.toString())
    );

    res.json({
      success: true,
      data: uniqueCourses
    });
  } catch (error) {
    console.error('Error fetching professor courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
});

// @desc    Get single course by ID
// @route   GET /api/courses/:id
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message
    });
  }
});

// @desc    Create new course
// @route   POST /api/courses
router.post('/', async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    
    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully'
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating course',
      error: error.message
    });
  }
});
const verifyUser = require("../middleware/verifyUser");
const requireRole = require("../middleware/requireRole");

// Update course (admin only)
router.put("/:id", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.json({
      success: true,
      data: updated,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return res.status(400).json({
      success: false,
      message: "Error updating course",
      error: error.message,
    });
  }
});

// Delete course (admin only)
router.delete("/:id", verifyUser, requireRole("admin"), async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting course",
      error: error.message,
    });
  }
});

module.exports = router;