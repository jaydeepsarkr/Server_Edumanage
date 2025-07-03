const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  registerValidation,
  loginValidation,
} = require("../validation/userValidation");

const { base64ToBuffer, normalizeFiles } = require("../middleware/uploadPhoto");

const uploadToCloudinary = require("../utils/cloudinaryUtils");

exports.registerUser = async (req, res) => {
  try {
    const fields = [
      "photo",
      "aadhaarCard",
      "birthCertificate",
      "transferCertificate",
      "marksheet",
    ];

    const docFolders = {
      photo: "users/profiles",
      aadhaarCard: "users/documents/aadhaar",
      birthCertificate: "users/documents/birth_certs",
      transferCertificate: "users/documents/transfer_certs",
      marksheet: "users/documents/marksheets",
    };

    const uploads = {};
    const normalizedFiles = normalizeFiles(req); // map multer files to { field: { buffer, mimetype, originalname } }

    for (const field of fields) {
      let file;

      // Check multer file upload
      if (normalizedFiles[field]) {
        file = normalizedFiles[field];
      }

      // Check base64 fallback (optional use-case)
      else if (req.body[field]?.startsWith("data:")) {
        file = {
          buffer: base64ToBuffer(req.body[field]),
          originalname: `${field}.jpeg`, // fallback filename for base64
          mimetype: field === "photo" ? "image/jpeg" : "application/pdf", // guess based on field
        };
      }

      if (!file) continue;

      const url = await uploadToCloudinary(file, docFolders[field]);

      req.body[field] = url;
      uploads[field] = url;
    }

    // ✅ Validate full body now (after uploads)
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
    } = req.body;

    const [emailExists, phoneExists] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ phone }),
    ]);

    if (emailExists || phoneExists) {
      return res.status(400).json({
        errors: {
          ...(emailExists && { email: "Email already registered." }),
          ...(phoneExists && { phone: "Phone already registered." }),
        },
      });
    }

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
      ...uploads, // photos/documents urls
    });

    await newUser.save();

    return res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Server error." });
  }
};
// 🔐 Login Controller (unchanged)
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
      { expiresIn: "30d" }
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
