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

    // Normalize req.files into { fieldname: file } object
    const normalizedFiles = normalizeFiles(req);

    // Clone for Joi validation
    const validationInput = { ...req.body };

    // ✅ Inject dummy URLs and sanitize Joi input
    for (const field of fields) {
      const value = req.body[field];
      const isUploaded = normalizedFiles[field];
      const isBase64 = typeof value === "string" && value.startsWith("data:");

      if (isUploaded || isBase64) {
        validationInput[field] = `https://dummy.url/${field}.jpg`;
      }

      if (typeof value === "object") {
        delete validationInput[field];
      }
    }

    // ✅ Parse qualifications if needed
    if (
      req.body.qualifications &&
      typeof req.body.qualifications === "string"
    ) {
      try {
        const parsed = JSON.parse(req.body.qualifications);
        validationInput.qualifications = parsed;
        req.body.qualifications = parsed;
      } catch (err) {
        return res
          .status(400)
          .json({ error: "Invalid qualifications format." });
      }
    }

    // ✅ Remove file-only fields like qualification_0_file from Joi input
    Object.keys(validationInput).forEach((key) => {
      if (/^qualification_\d+_file$/.test(key)) {
        delete validationInput[key];
      }
    });

    // ✅ Run Joi validation
    const { error } = registerValidation.validate(validationInput, {
      abortEarly: false,
    });

    if (error) {
      const errors = {};
      error.details.forEach((err) => {
        errors[err.path[0]] = err.message;
      });

      console.log("🔍 Joi Validation Errors:", errors);
      return res.status(400).json({ errors });
    }

    // ✅ Check for duplicate email/phone
    const [emailExists, phoneExists] = await Promise.all([
      User.findOne({ email: req.body.email }),
      User.findOne({ phone: req.body.phone }),
    ]);

    if (emailExists || phoneExists) {
      return res.status(400).json({
        errors: {
          ...(emailExists && { email: "Email already registered." }),
          ...(phoneExists && { phone: "Phone already registered." }),
        },
      });
    }

    // ✅ Upload core files
    const uploads = {};
    for (const field of fields) {
      let file;

      if (normalizedFiles[field]) {
        file = {
          ...normalizedFiles[field],
          fieldname: field,
        };
      } else if (
        typeof req.body[field] === "string" &&
        req.body[field].startsWith("data:")
      ) {
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

    // ✅ Upload qualification files
    let qualifications = [];
    if (req.body.role === "teacher" && Array.isArray(req.body.qualifications)) {
      qualifications = await Promise.all(
        req.body.qualifications.map(async (q, index) => {
          const fileKey = `qualification_${index}_file`;
          let fileUrl = "";

          if (normalizedFiles[fileKey]) {
            fileUrl = await uploadToCloudinary({
              ...normalizedFiles[fileKey],
              fieldname: "qualification",
            });
          }

          return {
            type: q.type,
            institution: q.institution,
            year: q.year,
            fileUrl,
          };
        })
      );
    }

    // ✅ Extract other fields
    const {
      name,
      email,
      password,
      phone,
      role,
      address,
      class: classLevel,
      rollNumber,
      enrollmentDate,
      status,
      dob,
      subject,
      aadhaarNumber,
      vtc,
      postOffice,
      subDistrict,
      state,
      pincode,
      remark,
    } = req.body;

    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: "Missing schoolId in token" });
    }

    const newUser = new User({
      name,
      email,
      password,
      phone,
      role,
      address,
      class: classLevel,
      rollNumber,
      enrollmentDate,
      status: status || "active",
      dob,
      subject,
      qualifications,
      aadhaarNumber,
      vtc,
      postOffice,
      subDistrict,
      state,
      pincode,
      remark,
      schoolId,
      ...uploads,
    });

    await newUser.save();

    return res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("❌ Registration error:", err);

    if (err.name === "ValidationError") {
      const errors = {};
      for (const key in err.errors) {
        errors[key] = err.errors[key].message;
      }
      return res
        .status(400)
        .json({ message: "User validation failed", errors });
    }

    return res.status(500).json({ error: "Server error. Please try again." });
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
