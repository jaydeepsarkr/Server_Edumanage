const School = require("../models/School");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.createSchool = async (req, res) => {
  try {
    // 🔒 Only admin allowed
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied. Only admins can create a school." });
    }

    // 🛑 Prevent duplicate school
    const admin = await User.findById(req.user.userId);
    if (admin.schoolId) {
      return res.status(400).json({ error: "School already created." });
    }

    const { name, address, phone, email } = req.body;

    // 🔎 Basic validation
    if (!name || !address || !phone) {
      return res
        .status(400)
        .json({ error: "Name, address, and phone are required." });
    }

    // ✅ Create school
    const school = new School({ name, address, phone, email });
    await school.save();

    // ✅ Update admin with schoolId
    admin.schoolId = school._id;
    await admin.save();

    // 🔁 Generate new token with schoolId
    const token = jwt.sign(
      {
        userId: admin._id,
        role: admin.role,
        schoolId: admin.schoolId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "School created and linked to admin.",
      school,
      token, // send updated token
    });
  } catch (error) {
    console.error("❌ Error creating school:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
