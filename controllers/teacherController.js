const sharp = require("sharp");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const uploadToCloudinary = require("../utils/cloudinaryUtils");
const { base64ToBuffer, normalizeFiles } = require("../middleware/uploadPhoto");

// 🔍 Extract publicId from Cloudinary URL
const extractPublicId = (url) => {
  if (!url) return null;
  const match = url.match(/\/v\d+\/([^/]+)\.(jpg|jpeg|png|pdf)$/);
  return match ? match[1] : null;
};

// 🗑️ Delete file from Cloudinary
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

// ✏️ Edit teacher by ID
exports.editTeacherById = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await User.findById(teacherId);

    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // 🔐 Permission check
    const isAdmin = req.user.role === "admin";
    const isSelf =
      req.user.role === "teacher" && req.user.userId.toString() === teacherId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // 🧠 Allow different fields based on role
    const allowedFields = isAdmin
      ? [
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
        ]
      : ["photo"]; // 🧑‍🏫 Teacher can update only photo

    const files = normalizeFiles(req);
    const updates = {};

    for (const field of allowedFields) {
      let buffer = null;
      let isPDF = false;
      let originalname = "";

      // 1. Multer upload
      if (files[field]) {
        const file = files[field];
        buffer = file.buffer;
        originalname = file.originalname;
        isPDF = file.mimetype === "application/pdf";
      }

      // 2. base64 upload
      if (
        !buffer &&
        typeof req.body[field] === "string" &&
        req.body[field].startsWith("data:")
      ) {
        buffer = base64ToBuffer(req.body[field]);
        isPDF = req.body[field].includes("pdf");
        originalname = `${field}_${Date.now()}.${isPDF ? "pdf" : "jpg"}`;
      }

      // 3. Upload to Cloudinary
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
        if (oldUrl?.startsWith("http")) {
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

      // 4. Non-file fields
      else if (req.body[field] !== undefined) {
        if (field === "qualifications") {
          let qualifications = [];

          try {
            qualifications = Array.isArray(req.body.qualifications)
              ? req.body.qualifications
              : JSON.parse(req.body.qualifications);
          } catch (err) {
            console.warn("⚠️ Invalid qualifications format");
          }

          const updatedQualifications = [];

          for (const [index, q] of qualifications.entries()) {
            let { type, institution, year, fileUrl } = q;

            if (fileUrl?.startsWith("data:")) {
              const isPDF = fileUrl.includes("pdf");
              const buffer = base64ToBuffer(fileUrl);
              const originalname = `qualification_${index}_${Date.now()}.${
                isPDF ? "pdf" : "jpg"
              }`;

              const existingFileUrl = teacher.qualifications?.[index]?.fileUrl;
              if (existingFileUrl?.startsWith("http")) {
                const oldIsPDF = existingFileUrl.includes(".pdf");
                await deleteFromCloudinary(
                  existingFileUrl,
                  oldIsPDF ? "raw" : "image"
                );
              }

              fileUrl = await uploadToCloudinary({
                buffer,
                originalname,
                mimetype: isPDF ? "application/pdf" : "image/jpeg",
                fieldname: `qualification_${index}_file`,
              });
            }

            updatedQualifications.push({ type, institution, year, fileUrl });
          }

          updates[field] = updatedQualifications;
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    // Save changes
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
    const { page = 1, limit = 20, search = "", status, subject } = req.query;

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
      isDeleted: { $ne: true },
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
