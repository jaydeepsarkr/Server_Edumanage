const cloudinary = require("./cloudinary");

const fieldToFolderMap = {
  photo: "uploads/profile_photos",
  aadhaarCard: "uploads/documents/aadhaar",
  birthCertificate: "uploads/documents/birth_certificate",
  transferCertificate: "uploads/documents/transfer_certificate",
  marksheet: "uploads/documents/marksheets",
};

const uploadToCloudinary = async (file) => {
  try {
    const { buffer, mimetype, originalname, fieldname } = file;

    if (
      !buffer ||
      !mimetype ||
      !originalname ||
      !fieldname ||
      !Buffer.isBuffer(buffer)
    ) {
      throw new Error("Invalid file object.");
    }

    const isPDF = mimetype === "application/pdf";
    const resource_type = isPDF ? "raw" : "image";
    const public_id = originalname.replace(/\.[^/.]+$/, "");
    const folder = fieldToFolderMap[fieldname] || "uploads/others";

    console.log(`📤 Uploading ${originalname} to folder: ${folder}`);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type,
            public_id,
            use_filename: true,
            filename_override: originalname,
            type: "upload",
            access_mode: "public",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        )
        .end(buffer);
    });

    if (!result?.public_id) throw new Error("Upload failed");

    console.log("✅ Cloudinary upload success:", result.secure_url);
    return result.secure_url;
  } catch (err) {
    console.error("❌ Cloudinary upload failed:", err.message || err);
    throw err;
  }
};

module.exports = uploadToCloudinary;
