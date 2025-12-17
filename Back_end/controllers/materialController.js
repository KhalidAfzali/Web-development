// controllers/materialController.js
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Material = require("../models/Material");

const extToType = (filename) => {
  const ext = String(path.extname(filename || "")).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".doc" || ext === ".docx") return "doc";
  if (ext === ".ppt" || ext === ".pptx") return "ppt";
  if (ext === ".mp4" || ext === ".mov" || ext === ".avi") return "video";
  return "other";
};

const safeType = (t) => {
  const v = String(t || "other").toLowerCase();
  const allowed = ["slides", "assignment", "notes", "syllabus", "other"];
  return allowed.includes(v) ? v : "other";
};

const uploadMaterial = async (req, res) => {
  try {
    const uploadedBy = req.user._id;
    const { title, description = "", courseId, type = "other", isPublic = "true" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Valid courseId is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    // this path is served by server.js: app.use("/uploads", express.static(...))
    const fileUrl = `/uploads/materials/${req.file.filename}`;

    const material = await Material.create({
      title: title.trim(),
      description,
      course: courseId,
      uploadedBy,
      fileName: req.file.filename,
      fileSize: req.file.size,
      fileUrl,
      fileType: extToType(req.file.originalname),
      type: safeType(type),
      isPublic: String(isPublic).toLowerCase() !== "false",
      // optional extra fields if you want them:
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    return res.status(201).json({
      success: true,
      message: "Material uploaded successfully",
      data: material,
    });
  } catch (error) {
    console.error("Material upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading material",
      error: error.message,
    });
  }
};

const getCourseMaterials = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    const materials = await Material.find({ course: courseId })
      .populate("uploadedBy", "username profile role")
      .populate("course", "courseCode courseName")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: materials });
  } catch (error) {
    console.error("Get course materials error:", error);
    return res.status(500).json({ success: false, message: "Error fetching materials", error: error.message });
  }
};

const getMyMaterials = async (req, res) => {
  try {
    const materials = await Material.find({ uploadedBy: req.user._id })
      .populate("course", "courseCode courseName")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: materials });
  } catch (error) {
    console.error("Get my materials error:", error);
    return res.status(500).json({ success: false, message: "Error fetching materials", error: error.message });
  }
};

const downloadMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid material id" });
    }

    const material = await Material.findById(id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    const filePath = path.join(process.cwd(), material.fileUrl.replace("/uploads/", "uploads/"));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found on server" });
    }

    const downloadName = material.originalName || material.fileName || "material";
    return res.download(filePath, downloadName);
  } catch (error) {
    console.error("Download material error:", error);
    return res.status(500).json({ success: false, message: "Error downloading material", error: error.message });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid material id" });
    }

    const material = await Material.findById(id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    // Only owner or admin
    if (String(material.uploadedBy) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this material" });
    }

    // delete physical file
    try {
      const filePath = path.join(process.cwd(), material.fileUrl.replace("/uploads/", "uploads/"));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.warn("File delete warning:", e.message);
    }

    await Material.findByIdAndDelete(id);
    return res.json({ success: true, message: "Material deleted successfully" });
  } catch (error) {
    console.error("Delete material error:", error);
    return res.status(500).json({ success: false, message: "Error deleting material", error: error.message });
  }
};

module.exports = {
  uploadMaterial,
  getCourseMaterials,
  getMyMaterials,
  downloadMaterial,
  deleteMaterial,
};
