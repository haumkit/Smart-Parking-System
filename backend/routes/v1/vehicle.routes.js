const express = require("express");
const ctrl = require("../../controllers/vehicle.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", authorize(["admin"]), ctrl.create);
router.get("/:id", ctrl.get);
router.put("/:id", authorize(["admin"]), ctrl.update);
router.delete("/:id", authorize(["admin"]), ctrl.remove);

module.exports = router;


