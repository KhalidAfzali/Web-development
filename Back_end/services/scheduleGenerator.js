// services/scheduleGenerator.js - Enhanced version
const Schedule = require("../models/Schedule");
const Section = require("../models/Section");
const TimeSlot = require("../models/TimeSlot");
const Classroom = require("../models/Classroom");
const Doctor = require("../models/Doctor");
const { overlaps } = require("../utils/time");

// Main schedule generation function
async function generateSchedule(semesterId) {
  try {
    console.log(`Generating schedule for semester: ${semesterId}`);
    
    // Fetch all required data
    const [sections, timeSlots, classrooms, existingSchedules] = await Promise.all([
      Section.find({ semester: semesterId, isActive: true })
        .populate("course")
        .populate("assignedDoctor")
        .populate("assignedTAs"),
      TimeSlot.find({ semester: semesterId, isActive: true })
        .sort({ day: 1, startTime: 1 }),
      Classroom.find({ isAvailable: true })
        .sort({ building: 1, roomNumber: 1 }),
      Schedule.find({ semester: semesterId })
        .populate('course doctor classroom')
    ]);

    console.log(`Found ${sections.length} sections, ${timeSlots.length} time slots, ${classrooms.length} classrooms`);

    const generatedSchedules = [];
    const conflicts = [];
    const unassignedSections = [];

    // Generate schedule for each section
    for (const section of sections) {
      if (!section.assignedDoctor) {
        unassignedSections.push({
          sectionId: section._id,
          course: section.course?.courseCode,
          reason: "No professor assigned"
        });
        continue;
      }

      const doctor = section.assignedDoctor;
      
      // Check if doctor is at max capacity
      const doctorSchedules = existingSchedules.filter(s => 
        s.doctor && s.doctor._id.toString() === doctor._id.toString()
      );
      
      if (doctorSchedules.length >= (doctor.maxCourses || 3)) {
        unassignedSections.push({
          sectionId: section._id,
          course: section.course?.courseCode,
          reason: `Professor ${doctor.employeeId} at max capacity (${doctor.maxCourses} courses)`
        });
        continue;
      }

      // Find suitable time slot
      const suitableTimeSlot = findSuitableTimeSlot(
        section,
        timeSlots,
        existingSchedules,
        doctor
      );

      if (!suitableTimeSlot) {
        unassignedSections.push({
          sectionId: section._id,
          course: section.course?.courseCode,
          reason: "No suitable time slot available"
        });
        continue;
      }

      // Find suitable classroom
      const suitableClassroom = findSuitableClassroom(
        section,
        classrooms,
        existingSchedules,
        suitableTimeSlot
      );

      if (!suitableClassroom) {
        unassignedSections.push({
          sectionId: section._id,
          course: section.course?.courseCode,
          reason: "No suitable classroom available"
        });
        continue;
      }

      // Create schedule
      const schedule = await Schedule.create({
        semester: semesterId,
        section: section._id,
        course: section.course._id,
        doctor: doctor._id,
        teachingAssistants: section.assignedTAs?.map(ta => ta._id) || [],
        classroom: suitableClassroom._id,
        scheduleSlots: [{
          day: suitableTimeSlot.day,
          startTime: suitableTimeSlot.startTime,
          endTime: suitableTimeSlot.endTime,
          type: suitableTimeSlot.slotType
        }],
        status: "Draft",
        notes: "Auto-generated schedule"
      });

      // Populate references
      await schedule.populate('course doctor classroom');
      generatedSchedules.push(schedule);
      
      // Add to existing schedules for next iterations
      existingSchedules.push(schedule);
    }

    return {
      success: true,
      generated: generatedSchedules.length,
      unassigned: unassignedSections.length,
      conflicts: conflicts,
      unassignedSections: unassignedSections,
      schedules: generatedSchedules
    };

  } catch (error) {
    console.error('Error in generateSchedule:', error);
    throw error;
  }
}

// Helper function to find suitable time slot
function findSuitableTimeSlot(section, timeSlots, existingSchedules, doctor) {
  for (const timeSlot of timeSlots) {
    // Check if time slot type matches section type
    if (timeSlot.slotType !== section.type) continue;

    // Check for doctor conflicts
    const hasDoctorConflict = existingSchedules.some(schedule => {
      if (!schedule.doctor || schedule.doctor._id.toString() !== doctor._id.toString()) {
        return false;
      }
      
      return schedule.scheduleSlots.some(slot => 
        slot.day === timeSlot.day && 
        overlaps(slot.startTime, slot.endTime, timeSlot.startTime, timeSlot.endTime)
      );
    });

    if (!hasDoctorConflict) {
      return timeSlot;
    }
  }
  return null;
}

// Helper function to find suitable classroom
function findSuitableClassroom(section, classrooms, existingSchedules, timeSlot) {
  for (const classroom of classrooms) {
    // Check capacity
    if (classroom.capacity < (section.capacity || 30)) continue;

    // Check room type compatibility
    if (!isRoomTypeCompatible(classroom.roomType, section.type)) continue;

    // Check for classroom conflicts
    const hasClassroomConflict = existingSchedules.some(schedule => {
      if (!schedule.classroom || schedule.classroom._id.toString() !== classroom._id.toString()) {
        return false;
      }
      
      return schedule.scheduleSlots.some(slot => 
        slot.day === timeSlot.day && 
        overlaps(slot.startTime, slot.endTime, timeSlot.startTime, timeSlot.endTime)
      );
    });

    if (!hasClassroomConflict) {
      return classroom;
    }
  }
  return null;
}

// Helper function to check room type compatibility
function isRoomTypeCompatible(roomType, sectionType) {
  if (sectionType === 'Lab') {
    return roomType === 'Lab' || roomType === 'Computer Lab';
  }
  
  if (sectionType === 'Lecture') {
    return roomType === 'Lecture Hall' || roomType === 'Auditorium';
  }
  
  // For Tutorial/Seminar, most room types work
  return roomType !== 'Lab' && roomType !== 'Computer Lab';
}

// Validate schedule function
async function validateSchedule(semesterId) {
  const schedules = await Schedule.find({ semester: semesterId })
    .populate('course doctor classroom teachingAssistants section');

  const conflicts = [];

  // Doctor conflicts
  const doctorSlots = {};
  schedules.forEach((schedule, index) => {
    if (!schedule.doctor) return;
    
    schedule.scheduleSlots.forEach(slot => {
      const key = `${schedule.doctor._id}-${slot.day}-${slot.startTime}`;
      if (doctorSlots[key]) {
        conflicts.push({
          type: 'Doctor',
          severity: 'Error',
          message: `Doctor ${schedule.doctor.employeeId} double-booked`,
          schedule1: doctorSlots[key],
          schedule2: schedule._id,
          day: slot.day,
          time: `${slot.startTime}-${slot.endTime}`
        });
      }
      doctorSlots[key] = schedule._id;
    });
  });

  // Classroom conflicts
  const classroomSlots = {};
  schedules.forEach((schedule, index) => {
    if (!schedule.classroom) return;
    
    schedule.scheduleSlots.forEach(slot => {
      const key = `${schedule.classroom._id}-${slot.day}-${slot.startTime}`;
      if (classroomSlots[key]) {
        conflicts.push({
          type: 'Classroom',
          severity: 'Error',
          message: `Classroom ${schedule.classroom.roomNumber} double-booked`,
          schedule1: classroomSlots[key],
          schedule2: schedule._id,
          day: slot.day,
          time: `${slot.startTime}-${slot.endTime}`
        });
      }
      classroomSlots[key] = schedule._id;
    });
  });

  // Capacity conflicts
  schedules.forEach(schedule => {
    if (schedule.section && schedule.classroom) {
      if (schedule.section.capacity > schedule.classroom.capacity) {
        conflicts.push({
          type: 'Capacity',
          severity: 'Error',
          message: `Classroom capacity (${schedule.classroom.capacity}) less than section capacity (${schedule.section.capacity})`,
          schedule: schedule._id,
          classroom: schedule.classroom.roomNumber
        });
      }
    }
  });

  return {
    totalSchedules: schedules.length,
    conflicts: conflicts,
    hasErrors: conflicts.some(c => c.severity === 'Error'),
    hasWarnings: conflicts.some(c => c.severity === 'Warning')
  };
}

module.exports = { generateSchedule, validateSchedule };