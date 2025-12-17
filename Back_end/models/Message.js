const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // admin/head user
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true }],

    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, default: "", trim: true, maxlength: 5000 },

    attachment: {
      filename: String,
      path: String,
      originalName: String,
      mimeType: String,
      size: Number,
      url: String,
    },

    priority: { type: String, enum: ["Normal", "Important"], default: "Normal" },

    // read tracking by doctor
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
