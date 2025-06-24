const User = require("../models/User");

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId; // From the token
    const user = await User.findById(userId).select(
      "_id name role email phone address class rollNumber password"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    // ✅ Allow only teachers
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied. Teachers only." });
    }

    const student = await User.findById(req.params.id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ name: student.name }); // You can return more fields if needed
  } catch (error) {
    console.error("getStudentById error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
