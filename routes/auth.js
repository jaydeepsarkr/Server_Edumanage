const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const {
  uploadUserDocuments,
  processUploads, // ← Add this
} = require("../middleware/uploadPhoto");

const router = express.Router();

// Register route with file upload + resizing
router.post("/register", uploadUserDocuments, processUploads, registerUser);

// Login route (no upload)
router.post("/login", loginUser);

module.exports = router;
