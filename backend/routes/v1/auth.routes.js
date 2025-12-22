const express = require("express");
const { register, login, me, searchUsers } = require("../../controllers/auth.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.get("/search", authenticate, authorize(["admin"]), searchUsers);

module.exports = router;


