const express = require("express");
const router = express.Router();
const {
  getStudentById,
  getCurrentUser,
  getUserById,
} = require("../controllers/userController");

const authenticateToken = require("../middleware/authenticateToken");
router.get("/users/:id", getUserById);

router.get("/me", authenticateToken, getCurrentUser);
router.get("/students/:id", authenticateToken, getStudentById);
module.exports = router;
