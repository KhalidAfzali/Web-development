// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
mongoose.set("strictPopulate", false);

// CORS
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsRoot = path.join(process.cwd(), "uploads");
const materialsDir = path.join(uploadsRoot, "materials");
fs.mkdirSync(materialsDir, { recursive: true });

// Static files
app.use("/uploads", express.static(uploadsRoot));

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const doctorRoutes = require("./routes/doctors");
const adminRoutes = require("./routes/admin");
const scheduleRoutes = require("./routes/schedule");
const courseRoutes = require("./routes/courses");
const classroomRoutes = require("./routes/classrooms");
const materialRoutes = require("./routes/material");
const scheduleManagementRoutes = require("./routes/scheduleManagement");
const sectionsRoutes = require("./routes/sections");
const timeSlotsRoutes = require("./routes/timeSlots");
const semestersRoutes = require("./routes/semesters");
const doctorPortalRoutes = require("./routes/doctorPortal");
const doctorMeRoutes = require("./routes/doctorsMe");
const authPasswordRoutes = require("./routes/authPassword");
const adminMessagesRoutes = require("./routes/messagesAdmin");
const doctorMessagesRoutes = require("./routes/messagesDoctor");
const headMeetingsRoutes = require("./routes/headMeetings");

const adminHeadRoutes = require("./routes/adminHead");
app.use("/api/admin/head", adminHeadRoutes);

app.use("/api/admin/messages", adminMessagesRoutes);
app.use("/api/doctor/messages", doctorMessagesRoutes);


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/admin/schedule", scheduleManagementRoutes);
app.use("/api/sections", sectionsRoutes);
app.use("/api/timeslots", timeSlotsRoutes);
app.use("/api/semesters", semestersRoutes);
app.use("/api/doctor-portal", doctorPortalRoutes);
app.use("/api/head/meetings", headMeetingsRoutes);



app.use("/api/doctors", doctorMeRoutes);     // adds /api/doctors/me
app.use("/api/auth", authPasswordRoutes);    // adds /api/auth/change-password, forgot-password, reset-password

const adminRoleRoutes = require("./routes/adminRole");
app.use("/api/admin", adminRoleRoutes);

// Health
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API running", db: mongoose.connection.readyState });
});

// 404
app.use((req, res) => res.status(404).json({ success: false, message: "Not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Server error" });
});

// DB + listen
const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cs-scheduling";

mongoose
  .connect(MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Server on ${PORT}`)))
  .catch((e) => {
    console.error("Mongo connect error:", e);
    process.exit(1);
  });

module.exports = app;
