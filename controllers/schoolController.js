const School = require("../models/School");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.createSchool = async (req, res) => {
  try {
    // 🔒 Only admin allowed
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied. Only admins can create a school.",
      });
    }

    // 🛑 Prevent duplicate school creation
    const admin = await User.findById(req.user.userId);
    if (admin.schoolId) {
      return res.status(400).json({
        error: "School already created for this admin.",
      });
    }

    // 🧾 Destructure all school fields from the request body
    const {
      schoolName,
      schoolType,
      establishmentYear,
      address,
      village,
      postOffice,
      city,
      state,
      country,
      pincode,
      primaryPhone,
      secondaryPhone,
      email,
      website,
      description,
    } = req.body;

    // 🔎 Basic validation
    if (!schoolName || !address || !primaryPhone) {
      return res.status(400).json({
        error: "School name, address, and primary phone are required.",
      });
    }

    // ✅ Create school instance
    const school = new School({
      schoolName,
      schoolType,
      establishmentYear,
      address,
      village,
      postOffice,
      city,
      state,
      country,
      pincode,
      primaryPhone,
      secondaryPhone,
      email,
      website,
      description,
    });

    // 💾 Save to database
    await school.save();

    // 🔗 Link school to admin
    admin.schoolId = school._id;
    await admin.save();

    // 🔁 Generate updated token including schoolId
    const token = jwt.sign(
      {
        userId: admin._id,
        role: admin.role,
        schoolId: admin.schoolId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 📤 Send response
    res.status(201).json({
      message: "School created and linked to admin successfully.",
      school,
      token,
    });
  } catch (error) {
    console.error("❌ Error creating school:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getSchoolById = async (req, res) => {
  try {
    const { schoolId } = req.user;

    if (!schoolId) {
      return res.status(400).json({ error: "No school linked to this user." });
    }

    const school = await School.findById(schoolId);

    if (!school) {
      return res.status(404).json({ error: "School not found." });
    }

    res.status(200).json({ school });
  } catch (error) {
    console.error("❌ Error fetching school:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
