const multer = require("multer");
const sharp = require("sharp");
const path = require("path");

// Allowed fields
const allowedFields = [
  "photo",
  "aadhaarCard",
  "birthCertificate",
  "transferCertificate",
  "marksheet",
];

// Multer memory storage
const multerStorage = multer.memoryStorage();

// ✅ Allow image for photo; image or PDF for documents
const multerFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith("image/");
  const isPDF = file.mimetype === "application/pdf";
  const field = file.fieldname;
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedFields.includes(field)) {
    return cb(new Error(`Unknown upload field "${field}"`), false);
  }

  // ✅ "photo" field must be image
  if (field === "photo" && isImage) return cb(null, true);

  // ✅ Other fields can be image or PDF
  if (field !== "photo" && (isImage || isPDF)) return cb(null, true);

  return cb(
    new Error(`Invalid file type or extension "${ext}" for field "${field}"`),
    false
  );
};

// Multer upload config
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Handle multiple fields
const uploadUserDocuments = upload.fields(
  allowedFields.map((name) => ({ name, maxCount: 1 }))
);

// Resize only photo
const processUploads = async (req, res, next) => {
  try {
    if (req.files?.photo?.[0]) {
      const file = req.files.photo[0];
      const resizedBuffer = await sharp(file.buffer)
        .resize(500, 500)
        .jpeg({ quality: 90 })
        .toBuffer();

      req.files.photo[0] = {
        ...file,
        buffer: resizedBuffer,
        size: resizedBuffer.length,
      };
    }

    // Debug log
    if (req.files) {
      Object.entries(req.files).forEach(([field, files]) => {
        files.forEach((file) => {
          console.log(`✅ Uploaded ${field}:`, {
            name: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          });
        });
      });
    }

    next();
  } catch (err) {
    console.error("❌ File processing error:", err);
    res.status(500).json({ error: "File processing failed" });
  }
};

// ✅ Fix: Include fieldname for folder mapping
const normalizeFiles = (req) => {
  const normalized = {};
  for (const field in req.files) {
    if (req.files[field]?.[0]) {
      const file = req.files[field][0];
      normalized[field] = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        fieldname: field, // ✅ This is critical
      };
    }
  }
  return normalized;
};

// Optional: Convert base64 to Buffer (if needed)
const base64ToBuffer = (base64String) => {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string format.");
  }
  return Buffer.from(matches[2], "base64");
};

module.exports = {
  uploadUserDocuments,
  processUploads,
  normalizeFiles,
  base64ToBuffer,
};
