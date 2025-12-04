const express = require("express");
const { authenticate, authorize } = require("../../middleware/auth");
const ctrl = require("../../controllers/history.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", ctrl.list);

router.post("/", authorize(["admin"]), ctrl.create);
router.put("/:id", authorize(["admin"]), ctrl.update);
router.delete("/:id", authorize(["admin"]), ctrl.remove);

module.exports = router;


