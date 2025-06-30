const User = require("../models/User");

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId; // From the token
    const user = await User.findById(userId).select(
      "_id name role email phone address class rollNumber password photo"
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

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("_id name role");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user); // Returns _id, name, role
  } catch (error) {
    console.error("getUserById error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ PATCH/PUT: Edit user by ID (Teacher or self-edit)
exports.editUser = async (req, res) => {
  try {
    const id = req.params.id;

    // ✅ Only allow teacher or user themself
    if (req.user.role !== "teacher" && req.user.userId !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Correct variable name
    const allowedUpdates = [
      "name",
      "email",
      "phone",
      "address",
      "class",
      "rollNumber",
      "status",
      "enrollmentDate",
      "photo",
      "aadhaarCard",
      "birthCertificate",
      "transferCertificate",
      "marksheet",
    ];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("editUser error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully", user });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.promoteStudentsByIds = async (req, res) => {
  try {
    const { studentIds } = req.body;

    // Check for permissions
    if (!["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate input
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "No valid student IDs provided." });
    }

    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
      isDeleted: { $ne: true },
    });

    if (!students.length) {
      return res.status(404).json({ error: "No matching students found." });
    }

    const bulkOps = students.map((student) => {
      if (student.class === 10) {
        return {
          updateOne: {
            filter: { _id: student._id },
            update: { $set: { status: "passout" } },
          },
        };
      } else {
        return {
          updateOne: {
            filter: { _id: student._id },
            update: { $inc: { class: 1 } },
          },
        };
      }
    });

    const result = await User.bulkWrite(bulkOps);

    res.status(200).json({
      message: `Promoted ${result.modifiedCount} student(s).`,
      promotedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Promotion error:", err);
    res.status(500).json({ error: "Server error during promotion." });
  }
};
