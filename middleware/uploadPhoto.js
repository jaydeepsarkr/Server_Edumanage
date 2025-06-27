const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const User = require("../models/User"); // Required to fetch old photo

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const uploadUserPhoto = upload.single("photo");

const resizeUserPhoto = async (req, res, next) => {
  if (!req.file) return next();

  const identifier = req.body.email || req.user?.userId || "user";
  const timestamp = Date.now();
  const filename = `user-${identifier}-${timestamp}.jpeg`;

  const relativePath = `img/users/${filename}`;
  const fullPath = path.join(__dirname, `../public/${relativePath}`);

  req.file.filename = filename;
  req.body.photo = relativePath;

  // ✅ Remove old photo if exists
  if (req.user?.userId) {
    const existingUser = await User.findById(req.user.userId);
    if (
      existingUser?.photo &&
      fs.existsSync(path.join(__dirname, `../public/${existingUser.photo}`))
    ) {
      fs.unlinkSync(path.join(__dirname, `../public/${existingUser.photo}`));
    }
  }

  // ✅ Save new resized image
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(fullPath);

  next();
};

module.exports = {
  uploadUserPhoto,
  resizeUserPhoto,
};
