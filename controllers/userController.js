const sharp = require("sharp");
const User = require("../models/User");
const { base64ToBuffer, normalizeFiles } = require("../middleware/uploadPhoto");
const uploadToCloudinary = require("../utils/cloudinaryUtils");
const cloudinary = require("cloudinary").v2;
const bcrypt = require("bcryptjs");

// Extract publicId from a Cloudinary URL
const extractPublicId = (url) => {
  if (!url) return null;
  const match = url.match(/\/v\d+\/([^/]+)\.(jpg|jpeg|png|pdf)$/);
  return match ? match[1] : null;
};

// Delete from Cloudinary
const deleteFromCloudinary = async (url, resourceType = "image") => {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log(`🗑️ Deleted old file: ${publicId}`);
  } catch (err) {
    console.error("❌ Cloudinary deletion error:", err.message);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    console.log("🟡 Incoming update request body:", req.body);
    const userId = req.user.userId;
    const schoolId = req.user.schoolId;
    const { currentPassword, newPassword, photoBase64 } = req.body;

    const user = await User.findOne({ _id: userId, schoolId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔐 Password update
    if (currentPassword && newPassword) {
      // First, verify the current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Assign the plain new password to the user object.
      // The Mongoose pre('save') hook in your User model will handle hashing this password.
      user.password = newPassword;
    }

    // 🖼️ Profile photo update (keeping original logic as it's not related to the bcrypt issue)
    const files = normalizeFiles(req);
    let photoBuffer = null;
    let originalname = "";

    // Priority 1: Multer
    if (files.photo) {
      photoBuffer = files.photo.buffer;
      originalname = files.photo.originalname || `photo_${Date.now()}.jpg`;
    }
    // Priority 2: Base64
    if (
      !photoBuffer &&
      typeof photoBase64 === "string" &&
      photoBase64.startsWith("data:")
    ) {
      photoBuffer = base64ToBuffer(photoBase64);
      originalname = `photo_${Date.now()}.jpg`;
    }

    if (photoBuffer) {
      const resizedPhoto = await sharp(photoBuffer)
        .resize(500, 500)
        .jpeg({ quality: 90 })
        .toBuffer();

      if (user.photo && user.photo.startsWith("http")) {
        await deleteFromCloudinary(user.photo);
      }

      const uploadRes = await uploadToCloudinary({
        buffer: resizedPhoto,
        originalname,
        mimetype: "image/jpeg",
        fieldname: "photo",
      });
      user.photo = uploadRes;
    }

    // 💾 Save the user object, explicitly disabling schema validation for this save operation.
    // The pre('save') hook for password hashing will still run.
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Profile updated successfully", photo: user.photo });
  } catch (error) {
    console.error("❌ Profile update error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// 🎯 Controller for editing students only
exports.editUser = async (req, res) => {
  try {
    const id = req.params.id;

    // 🔐 Role check
    if (!["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const student = await User.findById(id);
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    // 🏫 School check
    if (student.schoolId?.toString() !== req.user.schoolId?.toString()) {
      return res.status(403).json({
        error: "You can only edit students from your school",
      });
    }

    // ✅ Allowed fields for students
    const allowedFields = [
      "name",
      "email",
      "phone",
      "address",
      "class",
      "rollNumber",
      "status",
      "enrollmentDate",
      "photo",
      "aadhaarCard",
      "birthCertificate",
      "transferCertificate",
      "marksheet",
    ];

    for (const field of allowedFields) {
      let buffer = null;

      // Multer file
      if (req.files?.[field]?.[0]) {
        buffer = req.files[field][0].buffer;
      }

      // Base64 upload
      if (
        !buffer &&
        typeof req.body[field] === "string" &&
        req.body[field].startsWith("data:")
      ) {
        buffer = base64ToBuffer(req.body[field]);
      }

      // File handling
      if (buffer) {
        if (field === "photo") {
          buffer = await sharp(buffer)
            .resize(500, 500)
            .jpeg({ quality: 90 })
            .toBuffer();
        }

        const oldUrl = student[field];
        if (oldUrl) {
          const isPDF =
            req.files?.[field]?.[0]?.mimetype === "application/pdf" ||
            req.body[field]?.includes("pdf");
          await deleteFromCloudinary(oldUrl, isPDF ? "raw" : "image");
        }

        const url = await uploadToCloudinary({
          buffer,
          originalname: `${field}_${Date.now()}.jpg`,
          mimetype: "image/jpeg",
          fieldname: field,
        });

        student[field] = url;
      }

      // Simple fields
      else if (
        req.body[field] !== undefined &&
        (typeof req.body[field] !== "string" ||
          !req.body[field].startsWith("data:"))
      ) {
        student[field] = req.body[field];
      }
    }

    // 🧠 Save to trigger proper validation
    await student.save();

    res.json(student);
  } catch (error) {
    console.error("❌ editStudent error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId; // From the token

    // Exclude 'password', 'isDeleted', and 'createdAt'
    const user = await User.findById(userId).select(
      "-password -isDeleted -createdAt"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    // ✅ Allow only teachers or admins
    if (!["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const student = await User.findOne({
      _id: req.params.id,
      role: "student",
      schoolId: req.user.schoolId, // ✅ Match schoolId
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ name: student.name }); // Add more fields if needed
  } catch (error) {
    console.error("getStudentById error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    // ✅ Only allow access to teachers or admins
    if (!["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await User.findOne({
      _id: req.params.id,
      schoolId: req.user.schoolId, // ✅ Enforce same school access
    }).select(
      "_id name email phone address class rollNumber status enrollmentDate photo aadhaarCard birthCertificate transferCertificate marksheet role"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Sanitize helper
    const sanitize = (value) =>
      value === "undefined" || value === "null" ? null : value;

    // ✅ Build sanitized response
    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: sanitize(user.email),
      phone: sanitize(user.phone),
      address: sanitize(user.address),
      class: sanitize(user.class),
      rollNumber: sanitize(user.rollNumber),
      status: user.status,
      enrollmentDate: user.enrollmentDate,
      photo: sanitize(user.photo),
      aadhaarCard: sanitize(user.aadhaarCard),
      birthCertificate: sanitize(user.birthCertificate),
      transferCertificate: sanitize(user.transferCertificate),
      marksheet: sanitize(user.marksheet),
      role: user.role,
    };

    res.json(sanitizedUser);
  } catch (error) {
    console.error("getUserById error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Only allow teachers or admins
    if (!["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Ensure the user being deleted belongs to the same school
    const user = await User.findOneAndUpdate(
      { _id: id, schoolId: req.user.schoolId },
      { isDeleted: true },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found or not in your school" });
    }

    res.json({ message: "User deleted successfully", user });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.promoteStudentsByIds = async (req, res) => {
  try {
    const { studentIds } = req.body;

    // ✅ Role check
    if (!["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Input validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "No valid student IDs provided." });
    }

    // ✅ Fetch students belonging to the same school
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
      isDeleted: { $ne: true },
      schoolId: req.user.schoolId, // ✅ enforce same school
    });

    if (!students.length) {
      return res
        .status(404)
        .json({ error: "No matching students found in your school." });
    }

    // ✅ Prepare promotion logic
    const bulkOps = students.map((student) => {
      if (student.class === 10) {
        return {
          updateOne: {
            filter: { _id: student._id },
            update: { $set: { status: "passout" } },
          },
        };
      } else {
        return {
          updateOne: {
            filter: { _id: student._id },
            update: { $inc: { class: 1 } },
          },
        };
      }
    });

    // ✅ Perform bulk update
    const result = await User.bulkWrite(bulkOps);

    res.status(200).json({
      message: `Promoted ${result.modifiedCount} student(s).`,
      promotedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Promotion error:", err);
    res.status(500).json({ error: "Server error during promotion." });
  }
};
