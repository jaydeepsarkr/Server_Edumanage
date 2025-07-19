const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/teacherAttendance");
const authorizeRole = require("../middleware/authorizeRole");
const authenticate = require("../middleware/authenticateToken");

router.post(
  "/scan",
  authenticate,
  authorizeRole("teacher", "admin"),
  attendanceController.scanAttendance
);

router.get(
  "/today",
  authenticate,
  authorizeRole("admin"),
  attendanceController.getAttendanceForToday
);

router.get(
  "/notifications",
  authenticate,
  authorizeRole("admin"),
  attendanceController.getAttendanceNotifications
);

module.exports = router;
