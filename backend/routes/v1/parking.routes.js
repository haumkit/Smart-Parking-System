const express = require("express");
const { authenticate, authorize } = require("../../middleware/auth");
const ctrl = require("../../controllers/parking.controller");

const router = express.Router();

router.use(authenticate);

router.get("/slots", ctrl.listSlots);
router.post("/slots", authorize(["admin"]), ctrl.createSlot);
router.put("/slots/:id", authorize(["admin"]), ctrl.updateSlot);
router.delete("/slots/:id", authorize(["admin"]), ctrl.deleteSlot);
router.get("/suggest", ctrl.suggestSlot);
router.post("/check-in", ctrl.checkIn);
router.post("/check-out", ctrl.checkOut);

module.exports = router;


