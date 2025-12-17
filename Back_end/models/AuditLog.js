const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // "SCHEDULE_PUBLISHED"
    entity: { type: String, required: true }, // "Schedule"
    entityId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
