const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const User = require("../models/User");
const {
  registerValidation,
  loginValidation,
} = require("../validation/userValidation");

exports.registerUser = async (req, res) => {
  try {
    // ✅ Validate input data
    const { error } = registerValidation.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      const errors = {};
      error.details.forEach((err) => {
        const key = err.path[0];
        errors[key] = err.message;
      });

      return res.status(400).json({ errors });
    }

    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      class: classLevel,
      rollNumber,
      enrollmentDate,
      status,
      photo,
      aadhaarCard,
      birthCertificate,
      transferCertificate,
      marksheet,
    } = req.body;

    // ✅ Check for duplicate email
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        errors: {
          email: "Email already registered.",
        },
      });
    }

    // ✅ Check for duplicate phone
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({
        errors: {
          phone: "Phone already registered.",
        },
      });
    }

    // ✅ Base URL for public file access
    const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

    // ✅ Convert relative file paths to full URLs
    const buildFullPath = (filePath) =>
      filePath ? `${BASE_URL}/${filePath.replace(/^public\//, "")}` : undefined;

    // ✅ Save new user
    const newUser = new User({
      name,
      email,
      password,
      role,
      phone,
      address,
      class: classLevel,
      rollNumber,
      enrollmentDate,
      status: status || "active",

      // ✅ Document paths converted to public URLs
      photo: buildFullPath(photo),
      aadhaarCard: buildFullPath(aadhaarCard),
      birthCertificate: buildFullPath(birthCertificate),
      transferCertificate: buildFullPath(transferCertificate),
      marksheet: buildFullPath(marksheet),
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { error } = loginValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        name: user.name,
        photo: user.photo || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        photo: user.photo || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};
