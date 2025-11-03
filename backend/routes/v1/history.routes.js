const express = require("express");
const { authenticate } = require("../../middleware/auth");
const ctrl = require("../../controllers/history.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", ctrl.list);

module.exports = router;


