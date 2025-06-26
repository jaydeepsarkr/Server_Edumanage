const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const {
  uploadUserPhoto,
  resizeUserPhoto,
} = require("../middleware/uploadPhoto");

const router = express.Router();

router.post("/register", uploadUserPhoto, resizeUserPhoto, registerUser);
router.post("/login", loginUser);

module.exports = router;
