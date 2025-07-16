const User = require("../models/User");

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
      schoolId, // ✅ Only fetch teachers from the same school
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

    const teachers = await User.find(query)
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
