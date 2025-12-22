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

router.post("/webhook/plate-detected", ctrl.webhookPlateDetected);
router.post("/webhook/slots-detected", ctrl.webhookSlotsDetected);

router.get("/plate-stream/:cameraId", ctrl.plateDetectionStream);
router.get("/slot-stream/:cameraId", ctrl.slotDetectionStream);

router.use(authenticate);
router.get("/cameras/:cameraId/stream", ctrl.proxyCameraStream);
router.post("/plate", upload.single("image"), ctrl.detectPlate);
router.get("/plate/from-camera/:cameraId", ctrl.detectPlateFromCamera);
router.post("/slots", upload.single("image"), ctrl.detectSlots);
router.get("/slots/from-camera/:cameraId", ctrl.detectSlotsFromCamera);

module.exports = router;


