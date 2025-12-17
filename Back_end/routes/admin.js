
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Doctor Management
router.get('/doctors', adminController.getAllDoctors);
router.post('/doctors', adminController.createDoctor);
router.put('/doctors/:id', adminController.updateDoctor);
router.delete('/doctors/:id', adminController.deleteDoctor);

// TA Management
router.get('/teaching-assistants', adminController.getAllTAs);
router.post('/teaching-assistants', adminController.createTA);
router.put('/teaching-assistants/:id', adminController.updateTA);
router.delete('/teaching-assistants/:id', adminController.deleteTA);

// Course Management
router.get('/courses', adminController.getAllCourses);
router.post('/courses', adminController.createCourse);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);

// Classroom Management
router.get('/classrooms', adminController.getAllClassrooms);
router.post('/classrooms', adminController.createClassroom);
router.put('/classrooms/:id', adminController.updateClassroom);
router.delete('/classrooms/:id', adminController.deleteClassroom);

// Schedule Management
router.get('/schedules', adminController.getAllSchedules);
router.post('/schedules', adminController.createSchedule);
router.put('/schedules/:id', adminController.updateSchedule);
router.delete('/schedules/:id', adminController.deleteSchedule);
router.post('/schedules/generate', adminController.generateSchedule);
router.post('/schedules/validate', adminController.validateSchedule);

module.exports = router;
