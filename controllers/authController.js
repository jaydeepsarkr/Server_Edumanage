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

    const normalizedFiles = normalizeFiles(req); // Extract files from multer
    const validationInput = { ...req.body };

    // Simulate file URLs for validation
    for (const field of fields) {
      if (normalizedFiles[field] || req.body[field]?.startsWith("data:")) {
        validationInput[field] = "https://dummy.url/fakefile.jpg";
      }
    }

    // ✅ Validate before uploading
    const { error } = registerValidation.validate(validationInput, {
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

    // ✅ Check for duplicate email or phone before uploading
    const { email, phone } = req.body;
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

    // ✅ Upload files after validation and uniqueness check
    const uploads = {};

    for (const field of fields) {
      let file;

      if (normalizedFiles[field]) {
        file = {
          ...normalizedFiles[field],
          fieldname: field, // ✅ required for Cloudinary folder mapping
        };
      } else if (req.body[field]?.startsWith("data:")) {
        file = {
          buffer: base64ToBuffer(req.body[field]),
          originalname: `${field}.jpeg`,
          mimetype: field === "photo" ? "image/jpeg" : "application/pdf",
          fieldname: field,
        };
      }

      if (!file) continue;

      const url = await uploadToCloudinary(file);
      req.body[field] = url;
      uploads[field] = url;
    }

    const {
      name,
      password,
      role,
      address,
      class: classLevel,
      rollNumber,
      enrollmentDate,
      status,
    } = req.body;

    const schoolId = req.user.schoolId; // ✅ from token
    if (!schoolId) {
      return res.status(400).json({ error: "Missing schoolId in token" });
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
      schoolId,
      ...uploads,
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
        schoolId: user.schoolId,
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
        schoolId: user.schoolId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};
