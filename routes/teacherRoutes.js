const express = require("express");
const router = express.Router();

const {
  getTeachers,
  editTeacherById,
} = require("../controllers/teacherController");

const authorizeRole = require("../middleware/authorizeRole");
const authenticate = require("../middleware/authenticateToken");

// Routes
router.get("/teachers", authenticate, authorizeRole("admin"), getTeachers);

router.put(
  "/teachers/:id",
  authenticate,
  authorizeRole("admin", "teacher"),
  editTeacherById
);

module.exports = router;
