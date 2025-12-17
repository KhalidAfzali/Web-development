// services/conflictDetector.js
class ConflictDetector {
  detectConflicts(schedule) {
    const conflicts = [];
    
    // Doctor conflicts
    conflicts.push(...this.detectDoctorConflicts(schedule));
    
    // Classroom conflicts
    conflicts.push(...this.detectClassroomConflicts(schedule));
    
    // TA conflicts
    conflicts.push(...this.detectTAConflicts(schedule));
    
    return conflicts;
  }

  detectDoctorConflicts(schedule) {
    const doctorSlots = {};
    const conflicts = [];
    
    schedule.forEach(slot => {
      const key = `${slot.doctor._id}-${slot.day}-${slot.startTime}`;
      if (doctorSlots[key]) {
        conflicts.push({
          type: 'Doctor',
          message: `Doctor ${slot.doctor.profile.firstName} is double-booked`,
          slot1: doctorSlots[key],
          slot2: slot
        });
      }
      doctorSlots[key] = slot;
    });
    
    return conflicts;
  }
}