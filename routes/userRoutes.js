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

const {
  uploadUserDocuments,
  processUploads, // ✅ Add this for resizing
} = require("../middleware/uploadPhoto");

const authenticateToken = require("../middleware/authenticateToken");

// ✅ Get a specific user by ID
router.get("/users/:id", authenticateToken, getUserById);

// ✅ Update user (edit) with file upload & resizing
router.put(
  "/users/:id",
  authenticateToken,
  uploadUserDocuments,
  processUploads, // ✅ Resize if 'photo' is updated
  editUser
);

// ✅ Delete user
router.delete("/users/:id", authenticateToken, deleteUser);

// ✅ Get currently logged-in user's profile
router.get("/me", authenticateToken, getCurrentUser);

// ✅ Get a student by ID
router.get("/students/:id", authenticateToken, getStudentById);

// ✅ Promote multiple students
router.post("/users/promote", authenticateToken, promoteStudentsByIds);

module.exports = router;
