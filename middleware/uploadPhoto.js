const multer = require("multer");
const sharp = require("sharp");
const path = require("path");

// Allowed fixed fields
const allowedFields = [
  "photo",
  "aadhaarCard",
  "birthCertificate",
  "transferCertificate",
  "marksheet",
];

// Multer memory storage
const multerStorage = multer.memoryStorage();

// ✅ Filter for fixed + dynamic qualification files
const multerFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith("image/");
  const isPDF = file.mimetype === "application/pdf";
  const field = file.fieldname;
  const ext = path.extname(file.originalname).toLowerCase();

  const isQualification = /^qualification_\d+_file$/.test(field);

  if (!allowedFields.includes(field) && !isQualification) {
    return cb(new Error(`Unknown upload field "${field}"`), false);
  }

  // ✅ "photo" must be image
  if (field === "photo" && isImage) return cb(null, true);

  // ✅ Other fields can be image or PDF
  if (
    (allowedFields.includes(field) || isQualification) &&
    (isImage || isPDF)
  ) {
    return cb(null, true);
  }

  return cb(
    new Error(`Invalid file type or extension "${ext}" for field "${field}"`),
    false
  );
};

// ✅ Accept any field — filtering is done by `multerFilter`
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ✅ Use .any() to accept both known and dynamic fields
const uploadUserDocuments = upload.any();

// ✅ Resize photo only (if present)
const processUploads = async (req, res, next) => {
  try {
    if (req.files) {
      const photoFile = req.files.find((file) => file.fieldname === "photo");
      if (photoFile) {
        const resizedBuffer = await sharp(photoFile.buffer)
          .resize(500, 500)
          .jpeg({ quality: 90 })
          .toBuffer();

        photoFile.buffer = resizedBuffer;
        photoFile.size = resizedBuffer.length;
      }
    }

    next();
  } catch (err) {
    console.error("❌ File processing error:", err);
    res.status(500).json({ error: "File processing failed" });
  }
};

// ✅ Normalize files into an object: { fieldname: file }
const normalizeFiles = (req) => {
  const normalized = {};
  if (Array.isArray(req.files)) {
    req.files.forEach((file) => {
      normalized[file.fieldname] = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        fieldname: file.fieldname,
      };
    });
  }
  return normalized;
};

// ✅ Convert base64 to Buffer
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
