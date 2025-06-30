const express = require("express");
const router = express.Router();
const {
  getStudentById,
  getCurrentUser,
  getUserById,
  editUser,
  deleteUser,
  promoteStudentsByIds,
} = require("../controllers/userController");

const authenticateToken = require("../middleware/authenticateToken");
router.get("/users/:id", getUserById);

router.put("/users/:id", authenticateToken, editUser);
router.delete("/users/:id", authenticateToken, deleteUser);

router.get("/me", authenticateToken, getCurrentUser);
router.get("/students/:id", authenticateToken, getStudentById);

router.post("/users/promote", authenticateToken, promoteStudentsByIds);
module.exports = router;
