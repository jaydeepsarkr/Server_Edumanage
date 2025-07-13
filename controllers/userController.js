const sharp = require("sharp");
const User = require("../models/User");
const { base64ToBuffer } = require("../middleware/uploadPhoto");
const uploadToCloudinary = require("../utils/cloudinaryUtils");

exports.editUser = async (req, res) => {
  try {
    const id = req.params.id;

    // ✅ Only teachers or admins are allowed
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Fetch the user to be edited
    const userToEdit = await User.findById(id);
    if (!userToEdit) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Ensure both users belong to the same school
    if (userToEdit.schoolId?.toString() !== req.user.schoolId?.toString()) {
      return res
        .status(403)
        .json({ error: "You can only edit users from your school" });
    }

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

    const docFolders = {
      photo: "users/profiles",
      aadhaarCard: "users/documents/aadhaar",
      birthCertificate: "users/documents/birth_certs",
      transferCertificate: "users/documents/transfer_certs",
      marksheet: "users/documents/marksheets",
    };

    const updates = {};

    for (const field of allowedFields) {
      let buffer = null;

      // ✅ Check for uploaded file from Multer
      if (req.files?.[field]?.[0]) {
        buffer = req.files[field][0].buffer;
      }

      // ✅ Check for base64 string
      if (
        !buffer &&
        typeof req.body[field] === "string" &&
        req.body[field].startsWith("data:")
      ) {
        buffer = base64ToBuffer(req.body[field]);
      }

      // ✅ Upload file if we have a buffer
      if (buffer) {
        // Resize photo if needed
        if (field === "photo") {
          buffer = await sharp(buffer)
            .resize(500, 500)
            .jpeg({ quality: 90 })
            .toBuffer();
        }

        const url = await uploadToCloudinary({
          buffer,
          originalname: `${field}_${Date.now()}.jpg`,
          mimetype: "image/jpeg",
          fieldname: field,
        });

        updates[field] = url;
      }

      // ✅ Simple text field (non-file, non-base64)
      else if (
        req.body[field] !== undefined &&
        (typeof req.body[field] !== "string" ||
          !req.body[field].startsWith("data:"))
      ) {
        updates[field] = req.body[field];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("editUser error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId; // From the token
    const user = await User.findById(userId).select(
      "_id name role email phone address class rollNumber password photo"
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
