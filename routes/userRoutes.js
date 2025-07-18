const express = require("express");
const router = express.Router();

const {
  getStudentById,
  getCurrentUser,
  getUserById,
  editUser,
  deleteUser,
  promoteStudentsByIds,
  updateProfile,
} = require("../controllers/userController");

const {
  uploadUserDocuments,
  processUploads,
} = require("../middleware/uploadPhoto");

const authenticateToken = require("../middleware/authenticateToken");

// ✅ 1. MUST COME FIRST — GET current user
router.get("/users/me", authenticateToken, getCurrentUser);

// ✅ 2. THEN THE DYNAMIC ROUTE
router.get("/users/:id", authenticateToken, getUserById);

router.put("/users/update-profile", authenticateToken, updateProfile);

// ✅ Other routes
router.put(
  "/users/:id",
  authenticateToken,
  uploadUserDocuments,
  processUploads,
  editUser
);

router.delete("/users/:id", authenticateToken, deleteUser);

router.get("/students/:id", authenticateToken, getStudentById);

router.post("/users/promote", authenticateToken, promoteStudentsByIds);

module.exports = router;
