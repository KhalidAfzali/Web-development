const { overlaps } = require("../utils/time");
const Classroom = require("../models/Classroom");
const Section = require("../models/Section");
const Schedule = require("../models/Schedule");

function push(conflicts, type, message, severity, a, b) {
  conflicts.push({ type, message, severity, a, b });
}

async function validateSemesterSchedule(semesterId) {
  const schedules = await Schedule.find({ semester: semesterId })
    .populate("doctor")
    .populate("classroom")
    .populate("section")
    .populate("course")
    .populate("teachingAssistants");

  const conflicts = [];

  // Pairwise checks
  for (let i = 0; i < schedules.length; i++) {
    const A = schedules[i];

    // Capacity check
    const section = await Section.findById(A.section);
    if (section && A.classroom?.capacity < section.capacity) {
      push(conflicts, "Capacity", `Room capacity (${A.classroom.capacity}) < section capacity (${section.capacity})`, "Error", A, null);
    }

    // Room type check
    const roomType = A.classroom?.roomType;
    if (roomType && A.scheduleSlots?.[0]?.type) {
      const need = A.scheduleSlots[0].type;
      const ok =
        (need === "Lab" && (roomType === "Lab" || roomType === "Computer Lab")) ||
        (need !== "Lab" && roomType !== "Lab" && roomType !== "Computer Lab") ||
        true;
      if (!ok) push(conflicts, "RoomType", `Room type ${roomType} not suitable for ${need}`, "Error", A, null);
    }

    // Classroom unavailableSlots check
    const classroomDoc = await Classroom.findById(A.classroom?._id);
    if (classroomDoc?.unavailableSlots?.length) {
      for (const slot of A.scheduleSlots) {
        for (const block of classroomDoc.unavailableSlots) {
          if (block.day === slot.day && overlaps(slot.startTime, slot.endTime, block.startTime, block.endTime)) {
            push(conflicts, "Classroom", `Room blocked: ${block.reason || "unavailable"} (${block.day} ${block.startTime}-${block.endTime})`, "Error", A, null);
          }
        }
      }
    }

    for (let j = i + 1; j < schedules.length; j++) {
      const B = schedules[j];

      for (const s1 of A.scheduleSlots) {
        for (const s2 of B.scheduleSlots) {
          if (s1.day !== s2.day) continue;
          if (!overlaps(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) continue;

          if (A.doctor?._id?.toString() === B.doctor?._id?.toString()) {
            push(conflicts, "Doctor", "Doctor double-booked", "Error", A, B);
          }
          if (A.classroom?._id?.toString() === B.classroom?._id?.toString()) {
            push(conflicts, "Classroom", "Classroom double-booked", "Error", A, B);
          }

          const A_TAs = new Set((A.teachingAssistants || []).map(x => x._id.toString()));
          for (const ta of (B.teachingAssistants || [])) {
            if (A_TAs.has(ta._id.toString())) {
              push(conflicts, "TA", "TA double-booked", "Warning", A, B);
            }
          }
        }
      }
    }
  }

  return { conflicts, schedulesCount: schedules.length };
}

module.exports = { validateSemesterSchedule };
