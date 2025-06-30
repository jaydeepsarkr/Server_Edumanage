const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith("image");
  const isPDF = file.mimetype === "application/pdf";

  const allowedFields = [
    "photo",
    "aadhaarCard",
    "birthCertificate",
    "transferCertificate",
    "marksheet",
  ];

  if (
    allowedFields.includes(file.fieldname) &&
    (isImage || (file.fieldname !== "photo" && isPDF))
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type or field."), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const uploadUserDocuments = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "aadhaarCard", maxCount: 1 },
  { name: "birthCertificate", maxCount: 1 },
  { name: "transferCertificate", maxCount: 1 },
  { name: "marksheet", maxCount: 1 },
]);

const resizeAndHandleUploads = async (req, res, next) => {
  if (!req.files) return next();

  const identifier =
    req.user?.userId || req.body.email?.split("@")[0] || "user";
  const timestamp = Date.now();
  const processed = new Set();

  // Helper for saving non-photo files
  const saveFile = (field, folder, prefix) => {
    if (req.files[field]?.length && !processed.has(field)) {
      processed.add(field);

      const ext =
        req.files[field][0].mimetype === "application/pdf" ? "pdf" : "jpeg";
      const filename = `${prefix}-${identifier}-${timestamp}.${ext}`;
      const relativePath = `${folder}/${filename}`;
      const fullPath = path.join(__dirname, `../public/${relativePath}`);

      fs.writeFileSync(fullPath, req.files[field][0].buffer);
      req.body[field] = relativePath;
    }
  };

  // ✅ Handle photo (with sharp resize)
  if (req.files.photo?.length && !processed.has("photo")) {
    processed.add("photo");

    const photoFilename = `user-${identifier}-${timestamp}.jpeg`;
    const photoRelativePath = `img/users/${photoFilename}`;
    const photoFullPath = path.join(
      __dirname,
      `../public/${photoRelativePath}`
    );

    // Remove old photo if exists
    const existingUser = await User.findById(req.user?.userId);
    if (
      existingUser?.photo &&
      fs.existsSync(path.join(__dirname, `../public/${existingUser.photo}`))
    ) {
      fs.unlinkSync(path.join(__dirname, `../public/${existingUser.photo}`));
    }

    await sharp(req.files.photo[0].buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(photoFullPath);

    req.body.photo = photoRelativePath;
  }

  // ✅ Save remaining docs
  saveFile("aadhaarCard", "adharupload", "aadhaar");
  saveFile("birthCertificate", "birthupload", "birth");
  saveFile("transferCertificate", "transferupload", "transfer");
  saveFile("marksheet", "marksheetupload", "marksheet");

  next();
};

module.exports = {
  uploadUserDocuments,
  resizeAndHandleUploads,
};
