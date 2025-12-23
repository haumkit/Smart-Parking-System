const express = require("express");
const { authenticate, authorize } = require("../../middleware/auth");
const ctrl = require("../../controllers/report.controller");

const router = express.Router();

router.use(authenticate, authorize(["admin"]));
router.get("/stats", ctrl.stats);
router.get("/export/excel", ctrl.exportExcel);
router.get("/export/stats/excel", ctrl.exportStatsExcel);

module.exports = router;


