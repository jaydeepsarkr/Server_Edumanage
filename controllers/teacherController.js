const sharp = require("sharp");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const uploadToCloudinary = require("../utils/cloudinaryUtils");
const { base64ToBuffer, normalizeFiles } = require("../middleware/uploadPhoto");

// Extract publicId from Cloudinary URL
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

// ✅ Controller
exports.editTeacherById = async (req, res) => {
  console.log("📁 Uploaded Files:", req.files);
  console.log("📄 Body Fields:", req.body);

  try {
    const teacherId = req.params.id;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "dob",
      "gender",
      "subject",
      "address",
      "status",
      "photo",
      "aadhaarCard",
      "aadhaarNumber",
      "remarks",
      "vtc",
      "postOffice",
      "subDistrict",
      "state",
      "pincode",
      "qualifications",
    ];

    const files = normalizeFiles(req); // ✅ Flatten file array
    const updates = {};

    for (const field of allowedFields) {
      let buffer = null;
      let isPDF = false;
      let originalname = "";

      // ✅ 1. File from Multer (now flattened)
      if (files[field]) {
        const file = files[field];
        buffer = file.buffer;
        originalname = file.originalname;
        isPDF = file.mimetype === "application/pdf";
      }

      // ✅ 2. Base64 file
      if (
        !buffer &&
        typeof req.body[field] === "string" &&
        req.body[field].startsWith("data:")
      ) {
        buffer = base64ToBuffer(req.body[field]);
        originalname = `${field}_${Date.now()}.${
          field === "aadhaarCard" ? "pdf" : "jpg"
        }`;
        isPDF = req.body[field].includes("pdf");
      }

      // ✅ 3. Upload file to Cloudinary
      if (buffer) {
        if (field === "photo") {
          buffer = await sharp(buffer)
            .resize(500, 500)
            .jpeg({ quality: 90 })
            .toBuffer();
          originalname = `${field}_${Date.now()}.jpg`;
          isPDF = false;
        }

        const oldUrl = teacher[field];
        if (oldUrl && oldUrl.startsWith("http")) {
          await deleteFromCloudinary(oldUrl, isPDF ? "raw" : "image");
        }

        const uploadedUrl = await uploadToCloudinary({
          buffer,
          originalname,
          mimetype: isPDF ? "application/pdf" : "image/jpeg",
          fieldname: field,
        });

        updates[field] = uploadedUrl;
      }

      // ✅ 4. Regular field
      else if (
        req.body[field] !== undefined &&
        (typeof req.body[field] !== "string" ||
          !req.body[field].startsWith("data:"))
      ) {
        if (field === "qualifications" && typeof req.body[field] === "string") {
          try {
            updates[field] = JSON.parse(req.body[field]);
          } catch (err) {
            console.warn("⚠️ Invalid qualifications JSON");
          }
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    const updatedTeacher = await User.findByIdAndUpdate(teacherId, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updatedTeacher);
  } catch (error) {
    console.error("❌ editTeacher error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/teachers
exports.getTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status, subject } = req.query;

    // ✅ Get schoolId from logged-in user
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID not found for user",
      });
    }

    const query = {
      role: "teacher",
      schoolId,
      isDeleted: { $ne: true }, // ✅ Exclude deleted users
    };

    // Optional filters
    if (status) query.status = status;
    if (subject) query.subject = new RegExp(subject, "i");

    // Search by name, email, or phone
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    const selectedFields =
      "id name role email phone status photo dob subject qualifications aadhaarNumber aadhaarCard vtc postOffice subDistrict state pincode remark";

    const teachers = await User.find(query)
      .select(selectedFields)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: teachers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("❌ Failed to fetch teachers:", err);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
};
