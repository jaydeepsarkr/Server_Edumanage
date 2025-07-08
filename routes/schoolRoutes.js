// routes/schoolRoutes.js
const express = require("express");
const router = express.Router();
const {
  createSchool,
  getSchoolById,
} = require("../controllers/schoolController");
const authenticateToken = require("../middleware/authenticateToken");

router.post("/schools", authenticateToken, createSchool);
router.get("/schools", authenticateToken, getSchoolById);

module.exports = router;
