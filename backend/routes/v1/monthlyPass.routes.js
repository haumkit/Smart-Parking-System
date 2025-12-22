const router = require("express").Router();
const ctrl = require("../../controllers/monthlyPass.controller");
const { authenticate, authorize } = require("../../middleware/auth");

// User routes
router.get("/my", authenticate, ctrl.myPasses);
router.post("/request", authenticate, ctrl.requestPass);

// Admin routes
router.get("/", authenticate, authorize("admin"), ctrl.listAll);
router.post("/manual", authenticate, authorize("admin"), ctrl.createManual);
router.put("/:id/approve", authenticate, authorize("admin"), ctrl.approve);
router.put("/:id/reject", authenticate, authorize("admin"), ctrl.reject);
router.put("/:id/extend", authenticate, authorize("admin"), ctrl.extend);

module.exports = router;

