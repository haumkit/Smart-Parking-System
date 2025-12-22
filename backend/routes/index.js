const express = require("express");

const authRoutes = require("./v1/auth.routes");
const vehicleRoutes = require("./v1/vehicle.routes");
const parkingRoutes = require("./v1/parking.routes");
const historyRoutes = require("./v1/history.routes");
const reportRoutes = require("./v1/report.routes");
const aiRoutes = require("./v1/ai.routes");
const monthlyPassRoutes = require("./v1/monthlyPass.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/parking", parkingRoutes);
router.use("/history", historyRoutes);
router.use("/reports", reportRoutes);
router.use("/ai", aiRoutes);
router.use("/monthly-pass", monthlyPassRoutes);

module.exports = router;


