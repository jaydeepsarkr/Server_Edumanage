const moment = require("moment");
const User = require("../models/User");
const TeacherAttendance = require("../models/TeacherAttendance");

exports.scanAttendance = async (req, res) => {
  try {
    const { userId, role, schoolId } = req.user;

    // 🔍 Get teacher's name and photo
    const user = await User.findOne({ _id: userId, schoolId }).select(
      "name photo"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // 🔄 Check if attendance already exists
    let attendance = await TeacherAttendance.findOne({
      userId,
      schoolId,
      date,
    });

    let type;

    if (!attendance) {
      // ✅ First scan = Check-in
      type = "checkin";

      const cutoff = new Date(now);
      cutoff.setHours(9, 30, 0, 0); // 9:30 AM

      const status = now <= cutoff ? "present" : "late";

      attendance = new TeacherAttendance({
        userId,
        schoolId,
        date,
        checkIn: now,
        status,
        name: user.name,
      });

      await attendance.save();
    } else if (!attendance.checkOut) {
      // ✅ Second scan = Check-out
      type = "checkout";

      attendance.checkOut = now;
      await attendance.save();
    } else {
      return res
        .status(400)
        .json({ message: "Already checked in and out today." });
    }

    return res.status(200).json({
      message: `${type} successful`,
      type,
    });
  } catch (err) {
    console.error("❌ Attendance Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAttendanceForToday = async (req, res) => {
  try {
    const { schoolId, role } = req.user;
    if (role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this." });
    }

    const { page = 1, limit = 10, name = "", date } = req.query;
    const skip = (page - 1) * limit;

    // Filters
    const query = { schoolId };

    if (name) {
      // 🔍 search in `name` field in TeacherAttendance collection
      query.name = { $regex: name, $options: "i" };
    }

    if (date) {
      query.date = date;
    }

    const total = await TeacherAttendance.countDocuments(query);
    const records = await TeacherAttendance.find(query)
      .populate("userId", "name photo")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      records,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Failed to get attendance history." });
  }
};

exports.getAttendanceNotifications = async (req, res) => {
  try {
    const { schoolId, role } = req.user;
    if (role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can access notifications." });
    }

    const today = moment().format("YYYY-MM-DD");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const allRecords = await TeacherAttendance.find({
      schoolId,
      date: today,
    }).populate("userId", "name");

    const total = allRecords.length;

    const paginatedRecords = allRecords.slice(skip, skip + limit);

    const notifications = [];

    const lateCheckins = paginatedRecords
      .filter((r) => r.status === "late")
      .map((r) => {
        const name = r.userId?.name || "Unknown";
        const time = r.checkIn
          ? moment(r.checkIn).format("hh:mm A")
          : "unknown time";
        return `${name} had late check-in at ${time}`;
      });

    const missingCheckouts = paginatedRecords
      .filter((r) => r.checkIn && !r.checkOut)
      .map((r) => {
        const name = r.userId?.name || "Unknown";
        return `${name} missed checkout`;
      });

    if (lateCheckins.length) notifications.push(...lateCheckins);
    if (missingCheckouts.length) notifications.push(...missingCheckouts);

    if (!paginatedRecords.length) {
      notifications.push("No attendance records found for today.");
    }

    res.json({
      notifications,
      totalRecords: total,
      page,
      limit,
    });
  } catch (err) {
    console.error("Error fetching attendance notifications:", err);
    res.status(500).json({ message: "Failed to get notifications." });
  }
};
