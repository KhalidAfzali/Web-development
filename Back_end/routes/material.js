// routes/material.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const router = express.Router();
const materialController = require("../controllers/materialController");
const verifyUser = require("../middleware/verifyUser");

router.use(verifyUser);

// Ensure upload folder exists
const uploadDir = path.join(process.cwd(), "uploads", "materials");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = String(file.originalname || "file").replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.post("/upload", upload.single("file"), materialController.uploadMaterial);

router.get("/course/:courseId", materialController.getCourseMaterials);
router.get("/my-materials", materialController.getMyMaterials);

router.get("/:id/download", materialController.downloadMaterial);
router.delete("/:id", materialController.deleteMaterial);

module.exports = router;
