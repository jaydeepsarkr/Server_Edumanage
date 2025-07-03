const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const authenticateToken = require("../middleware/authenticateToken");

router.get("/students", authenticateToken, attendanceController.getStudents);
router.post(
  "/attendance/manual",
  authenticateToken,
  attendanceController.markAttendanceManual
);
router.get(
  "/attendance/mark/:studentId",
  attendanceController.markAttendanceViaUrl
);

router.get(
  "/history",
  authenticateToken,
  attendanceController.getAttendanceHistory
);

router.get(
  "/stats",
  authenticateToken,
  attendanceController.getAttendanceStats
);

router.get(
  "/attendance/percentage/today",
  authenticateToken,
  attendanceController.getTodaysAttendancePercentage
);

module.exports = router;
