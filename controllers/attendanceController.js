const Attendance = require("../models/Attendance");
const User = require("../models/User");

exports.getStudents = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }

    const students = await User.find({ role: "student" })
      .select("username role email phone address class rollNumber")
      .sort({ username: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAttendanceManual = async (req, res) => {
  try {
    // ✅ Ensure only teachers can mark attendance
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ error: "Only teachers can mark attendance" });
    }

    const { studentId, status, subject, notes } = req.body;

    // ✅ Define the date range for "today"
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ Check if attendance already exists
    let existingAttendance = await Attendance.findOne({
      studentId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingAttendance) {
      // ✅ Update existing attendance
      existingAttendance.status = status;
      existingAttendance.subject = subject;
      existingAttendance.notes = notes;
      existingAttendance.markedBy = req.user.username;
      existingAttendance.teacherId = req.user.userId;
      existingAttendance.markedAt = new Date();
      existingAttendance.method = "manual";
      existingAttendance.attendanceByNFC = false;

      await existingAttendance.save();

      return res.status(200).json({
        message: "Attendance updated successfully",
        attendance: existingAttendance,
      });
    }

    // ✅ Fetch student info
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res
        .status(404)
        .json({ error: "Student not found or invalid role" });
    }

    // ✅ Create new attendance
    const attendance = new Attendance({
      studentId,
      teacherId: req.user.userId,
      class: student.class || 1,
      subject,
      status,
      notes,
      date: startOfDay,
      markedBy: req.user.username,
      markedAt: new Date(),
      method: "manual",
      attendanceByNFC: false,
    });

    await attendance.save();

    res
      .status(201)
      .json({ message: "Attendance marked successfully", attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAttendanceViaUrl = async (req, res) => {
  try {
    const { studentId } = req.params;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const student = await User.findOne({ _id: studentId, role: "student" });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const existingAttendance = await Attendance.findOne({
      studentId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingAttendance) {
      return res.json({
        message: "Attendance already marked",
        attendance: existingAttendance,
      });
    }

    const attendance = new Attendance({
      studentId,
      teacherId: null,
      class: student.class || 1,
      subject: "General",
      status: "present",
      date: startOfDay,
      markedBy: "auto",
      markedAt: new Date(),
      method: "url",
      attendanceByNFC: true,
    });

    await attendance.save();
    res.json({ message: "Attendance marked", attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const {
      studentId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      self,
    } = req.query;

    const query = {};
    const skip = (page - 1) * limit;

    if (req.user.role === "student") {
      // Student sees only their own attendance
      query.studentId = req.user.userId;
    }

    if (req.user.role === "teacher") {
      if (self === "true") {
        // Teacher filters to see only records they marked
        query.teacherId = req.user.userId;
      }
      if (studentId) {
        query.studentId = studentId;
      }
    }

    // Admin (or any other role) may access all — optionally enhance this
    if (
      req.user.role !== "student" &&
      req.user.role !== "teacher" &&
      studentId
    ) {
      query.studentId = studentId;
    }

    // Date filtering
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate("studentId", "name studentId class")
      .populate("teacherId", "name email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Attendance.countDocuments(query);

    res.json({
      message: "Attendance history retrieved successfully",
      attendance,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res
      .status(500)
      .json({ error: "Server error retrieving attendance history" });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Get stats for last 30 days
    const stats = await Attendance.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          totalPresent: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          totalAbsent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    // Stats for today
    const todayStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    res.json({
      daily: stats,
      today: todayStats[0] || {
        present: 0,
        absent: 0,
        leave: 0,
        total: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    res.status(500).json({ error: error.message });
  }
};
