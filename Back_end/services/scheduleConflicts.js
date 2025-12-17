const Schedule = require("../models/Schedule");
const Classroom = require("../models/Classroom");
const Section = require("../models/Section");
const { overlaps } = require("../utils/time");

function push(conflicts, type, message, severity = "Error", meta = {}) {
  conflicts.push({ type, severity, message, ...meta });
}

async function checkScheduleConflicts({
  semesterId,
  doctorId,
  classroomId,
  sectionId,
  scheduleSlots,
  excludeScheduleId = null,
}) {
  const conflicts = [];

  if (!semesterId) push(conflicts, "Input", "semester is required");
  if (!doctorId) push(conflicts, "Input", "doctor is required");
  if (!classroomId) push(conflicts, "Input", "classroom is required");
  if (!scheduleSlots?.length) push(conflicts, "Input", "scheduleSlots is required");

  if (conflicts.length) return conflicts;

  // Load target docs
  const [roomDoc, secDoc] = await Promise.all([
    Classroom.findById(classroomId),
    sectionId ? Section.findById(sectionId) : null,
  ]);

  // Capacity check
  if (roomDoc && secDoc && Number(roomDoc.capacity) < Number(secDoc.capacity)) {
    push(conflicts, "Capacity", `Room capacity (${roomDoc.capacity}) < section capacity (${secDoc.capacity})`);
  }

  // Room type check (lab vs lecture)
  // Adjust to your roomType values
  const needType = scheduleSlots?.[0]?.type;
  if (roomDoc?.roomType && needType) {
    const roomType = roomDoc.roomType;
    const ok =
      (needType === "Lab" && (roomType === "Lab" || roomType === "Computer Lab")) ||
      (needType !== "Lab" && roomType !== "Lab" && roomType !== "Computer Lab");

    if (!ok) push(conflicts, "RoomType", `Room type (${roomType}) not suitable for (${needType})`);
  }

  // Room unavailableSlots (only if you add it to schema)
  if (roomDoc?.unavailableSlots?.length) {
    for (const slot of scheduleSlots) {
      for (const block of roomDoc.unavailableSlots) {
        if (block.day === slot.day && overlaps(slot.startTime, slot.endTime, block.startTime, block.endTime)) {
          push(conflicts, "Classroom", `Room blocked: ${block.reason || "unavailable"} (${block.day} ${block.startTime}-${block.endTime})`);
        }
      }
    }
  }

  // Existing schedules in semester
  const existing = await Schedule.find({ semester: semesterId })
    .select("doctor classroom scheduleSlots teachingAssistants")
    .lean();

  for (const sch of existing) {
    if (excludeScheduleId && String(sch._id) === String(excludeScheduleId)) continue;

    for (const a of sch.scheduleSlots || []) {
      for (const b of scheduleSlots) {
        if (a.day !== b.day) continue;
        if (!overlaps(a.startTime, a.endTime, b.startTime, b.endTime)) continue;

        if (String(sch.doctor) === String(doctorId)) {
          push(conflicts, "Doctor", "Doctor is double-booked", "Error", {
            conflictWithScheduleId: sch._id,
            day: b.day,
            time: `${b.startTime}-${b.endTime}`,
          });
        }

        if (String(sch.classroom) === String(classroomId)) {
          push(conflicts, "Classroom", "Classroom is double-booked", "Error", {
            conflictWithScheduleId: sch._id,
            day: b.day,
            time: `${b.startTime}-${b.endTime}`,
          });
        }

        // TA double-booking (warning)
        const A = new Set((sch.teachingAssistants || []).map((x) => String(x)));
        for (const taId of (b.teachingAssistants || [])) {
          if (A.has(String(taId))) {
            push(conflicts, "TA", "TA is double-booked", "Warning", {
              conflictWithScheduleId: sch._id,
              day: b.day,
              time: `${b.startTime}-${b.endTime}`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

module.exports = { checkScheduleConflicts };
