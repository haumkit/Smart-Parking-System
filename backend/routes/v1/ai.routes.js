const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate } = require("../../middleware/auth");
const ctrl = require("../../controllers/ai.controller");

const router = express.Router();

const uploadDir = path.join(process.cwd(), "backend", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

router.use(authenticate);
router.post("/plate", upload.single("image"), ctrl.detectPlate);
router.post("/slots", upload.single("image"), ctrl.detectSlots);

module.exports = router;


