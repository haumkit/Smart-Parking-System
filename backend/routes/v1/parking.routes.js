const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate, authorize } = require("../../middleware/auth");
const ctrl = require("../../controllers/parking.controller");

const router = express.Router();

const uploadDir = path.join(process.cwd(), "backend", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

router.use(authenticate);

router.get("/slots", ctrl.listSlots);
router.get("/slots/available", ctrl.listAvailableSlots); 
router.post("/slots", authorize(["admin"]), ctrl.createSlot);
router.put("/slots/:id", authorize(["admin"]), ctrl.updateSlot);
router.delete("/slots/:id", authorize(["admin"]), ctrl.deleteSlot);
router.get("/suggest", ctrl.suggestSlot);
router.post("/check-in", ctrl.checkIn);
router.post("/check-out", ctrl.checkOut);

router.post("/walkin/entry", upload.single("image"), ctrl.walkInEntry);
router.post("/walkin/exit", upload.single("image"), ctrl.walkInExit);

module.exports = router;


