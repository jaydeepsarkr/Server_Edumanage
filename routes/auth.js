const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const {
  uploadUserDocuments,
  resizeAndHandleUploads,
} = require("../middleware/uploadPhoto");

const router = express.Router();

router.post(
  "/register",
  uploadUserDocuments,
  resizeAndHandleUploads,
  registerUser
);

router.post("/login", loginUser);

module.exports = router;
