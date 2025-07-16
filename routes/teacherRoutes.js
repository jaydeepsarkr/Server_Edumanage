const express = require("express");
const router = express.Router();

const { getTeachers } = require("../controllers/teacherController");
const authorizeRole = require("../middleware/authorizeRole");
const authenticate = require("../middleware/authenticateToken");
router.get("/teachers", authenticate, authorizeRole("admin"), getTeachers);

module.exports = router;
