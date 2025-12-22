const express = require("express");
const ctrl = require("../../controllers/vehicle.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = express.Router();

router.use(authenticate);

// User routes
router.get("/my", ctrl.listMy);
router.post("/my", ctrl.createMy);

// Admin routes
router.get("/", ctrl.list);
router.get("/pending", authorize(["admin"]), ctrl.listPending);
router.post("/", authorize(["admin"]), ctrl.create);
router.get("/:id", ctrl.get);
router.put("/:id", ctrl.update);
router.put("/:id/approve", authorize(["admin"]), ctrl.approve);
router.put("/:id/reject", authorize(["admin"]), ctrl.reject);
router.delete("/:id", ctrl.remove);

module.exports = router;


