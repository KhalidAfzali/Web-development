// scripts/seedDatabase.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Course = require('../models/Course');
const TeachingAssistant = require('../models/TeachingAssistant');
const Classroom = require('../models/Classroom');
const Semester = require('../models/Semester');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cs-scheduling');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Course.deleteMany({});
    await TeachingAssistant.deleteMany({});
    await Classroom.deleteMany({});
    await Semester.deleteMany({});

    console.log('📝 Creating sample data...');

    // 1. Create Admin User
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@cs.edu',
      password: await bcrypt.hash('admin123', 12),
      role: 'admin',
      profile: {
        firstName: 'System',
        lastName: 'Administrator'
      },
      isActive: true
    });
    console.log('✅ Admin user created');

    // 2. Create Doctor Users
    const doctorUsers = await User.create([
      {
        username: 'dr_smith',
        email: 'smith@cs.edu',
        password: await bcrypt.hash('doctor123', 12),
        role: 'doctor',
        profile: {
          firstName: 'John',
          lastName: 'Smith',
          phone: '+1234567890',
          department: 'Computer Science'
        },
        isActive: true
      },
      {
        username: 'dr_johnson',
        email: 'johnson@cs.edu',
        password: await bcrypt.hash('doctor123', 12),
        role: 'doctor',
        profile: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          phone: '+1234567891',
          department: 'Computer Science'
        },
        isActive: true
      },
      {
        username: 'dr_abar',
        email: 'abar@cs.edu',
        password: await bcrypt.hash('doctor123', 12),
        role: 'doctor',
        profile: {
          firstName: 'Ghazy',
          lastName: 'Alabar',
          phone: '+1234567892',
          department: 'Computer Science'
        },
        isActive: true
      }
    ]);

    // 3. Create Doctors
    const doctors = await Doctor.create([
      {
        user: doctorUsers[0]._id,
        employeeId: 'CS001',
        specialization: ['Algorithms', 'Data Structures'],
        office: { 
          building: 'CS Building', 
          room: 'CS-101'
        },
        maxCourses: 3,
        isAvailable: true
      },
      {
        user: doctorUsers[1]._id,
        employeeId: 'CS002',
        specialization: ['Database Systems', 'Software Engineering'],
        office: { 
          building: 'CS Building', 
          room: 'CS-102'
        },
        maxCourses: 3,
        isAvailable: true
      },
      {
        user: doctorUsers[2]._id,
        employeeId: 'CS003',
        specialization: ['Artificial Intelligence', 'Machine Learning'],
        office: { 
          building: 'CS Building', 
          room: 'CS-103'
        },
        maxCourses: 3,
        isAvailable: true
      }
    ]);

    // 4. Create Courses
    const courses = await Course.create([
      {
        courseCode: 'CS101',
        courseName: 'Introduction to Computer Science',
        description: 'Fundamental concepts of computer science and programming.',
        credits: 3,
        department: 'Computer Science',
        level: 'Undergraduate',
        maxStudents: 60,
        currentEnrollment: 0,
        isActive: true
      },
      {
        courseCode: 'CS201',
        courseName: 'Data Structures and Algorithms',
        description: 'Study of fundamental data structures and algorithm analysis.',
        credits: 4,
        department: 'Computer Science',
        level: 'Undergraduate',
        maxStudents: 45,
        currentEnrollment: 0,
        isActive: true
      },
      {
        courseCode: 'CS301',
        courseName: 'Database Systems',
        description: 'Introduction to database design and implementation.',
        credits: 3,
        department: 'Computer Science',
        level: 'Undergraduate',
        maxStudents: 40,
        currentEnrollment: 0,
        isActive: true
      },
      {
        courseCode: 'CS401',
        courseName: 'Software Engineering',
        description: 'Principles and practices of software development.',
        credits: 4,
        department: 'Computer Science',
        level: 'Undergraduate',
        maxStudents: 35,
        currentEnrollment: 0,
        isActive: true
      }
    ]);

    // 5. Create Classrooms
    const classrooms = await Classroom.create([
      {
        roomNumber: 'CS-201',
        building: 'Computer Science Building',
        capacity: 60,
        roomType: 'Lecture Hall',
        facilities: ['Projector', 'Whiteboard', 'WiFi'],
        isAvailable: true
      },
      {
        roomNumber: 'CS-202',
        building: 'Computer Science Building',
        capacity: 45,
        roomType: 'Lecture Hall',
        facilities: ['Projector', 'Whiteboard', 'WiFi'],
        isAvailable: true
      },
      {
        roomNumber: 'LAB-101',
        building: 'Computer Science Building',
        capacity: 30,
        roomType: 'Computer Lab',
        facilities: ['Computers', 'Projector'],
        isAvailable: true
      },
      {
        roomNumber: 'LAB-102',
        building: 'Computer Science Building',
        capacity: 30,
        roomType: 'Computer Lab',
        facilities: ['Computers', 'Projector'],
        isAvailable: true
      }
    ]);

    // 6. Create Current Semester
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(currentDate.getMonth() + 1);
    
    const semester = await Semester.create({
      name: 'Spring',
      year: 2025,
      code: 'SPRING-2025',
      startDate: currentDate,
      endDate: nextMonth,
      isActive: true,
      status: 'Active'
    });

    console.log('\n================================');
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('================================');
    console.log('📊 Created:');
    console.log(`   👥 ${await User.countDocuments()} Users`);
    console.log(`   👨‍🏫 ${await Doctor.countDocuments()} Doctors`);
    console.log(`   📚 ${await Course.countDocuments()} Courses`);
    console.log(`   🏫 ${await Classroom.countDocuments()} Classrooms`);
    console.log('================================');
    console.log('🔐 DEFAULT LOGIN:');
    console.log('   Email: admin@cs.edu');
    console.log('   Password: admin123');
    console.log('================================\n');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

// Run the seed function
seedDatabase();