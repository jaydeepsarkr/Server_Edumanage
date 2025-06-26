const multer = require("multer");
const sharp = require("sharp");

// Store image in memory buffer
const multerStorage = multer.memoryStorage();

// Filter only images
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

// Setup multer
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// Middleware to handle single image file under field name "photo"
const uploadUserPhoto = upload.single("photo");

// Resize and save photo to disk
const resizeUserPhoto = async (req, res, next) => {
  if (!req.file) return next();

  const identifier = req.body.email || Date.now();
  const filename = `user-${identifier}-${Date.now()}.jpeg`;

  req.file.filename = filename;
  req.body.photo = filename; // Pass photo name to controller

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${filename}`);

  next();
};

module.exports = {
  uploadUserPhoto,
  resizeUserPhoto,
};
