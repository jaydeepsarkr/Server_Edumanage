// routes/schoolRoutes.js
const express = require("express");
const router = express.Router();
const { createSchool } = require("../controllers/schoolController");
const authenticateToken = require("../middleware/authenticateToken"); // assumed

router.post("/schools", authenticateToken, createSchool);

module.exports = router;
