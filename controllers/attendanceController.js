const Attendance = require("../models/Attendance");
const User = require("../models/User");

exports.getStudents = async (req, res) => {
  try {
    // ✅ Only allow teachers to access this route
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Extract filters and pagination
    const {
      search = "",
      page = 1,
      limit = 10,
      sort = "asc",
      class: classFilter,
    } = req.query;

    const searchRegex = new RegExp(search, "i");

    // ✅ Build MongoDB query filter
    const filter = {
      role: "student",
      $or: [
        { name: searchRegex },
        { rollNumber: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    };

    if (classFilter) {
      filter.class = classFilter;
    }

    // ✅ Get total count for pagination
    const total = await User.countDocuments(filter);

    // ✅ Fetch paginated students
    const students = await User.find(filter)
      .select(
        "_id name role email phone address class rollNumber createdAt status enrollmentDate"
      )
      .sort({ class: sort === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // ✅ Prepare date range for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ Extract student IDs
    const studentIds = students.map((s) => s._id);

    // ✅ Fetch today's attendance for those students
    const todaysAttendance = await Attendance.find({
      studentId: { $in: studentIds },
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    // ✅ Map attendance data by studentId
    const attendanceMap = {};
    todaysAttendance.forEach((record) => {
      attendanceMap[record.studentId.toString()] = {
        status: record.status,
        notes: record.notes,
      };
    });

    // ✅ Add attendance data to each student
    const studentsWithAttendance = students.map((student) => {
      const record = attendanceMap[student._id.toString()];
      return {
        ...student.toObject(),
        attendanceStatus: record?.status || null,
        remarks: record?.notes || "",
      };
    });

    // ✅ Send response with students and pagination
    res.json({
      students: studentsWithAttendance,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getStudents:", error);
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

    // ✅ Extract all fields, including attendanceByNFC
    const {
      studentId,
      status,
      subject = "",
      notes = "",
      attendanceByNFC = false,
    } = req.body;

    // ✅ Define the date range for "today"
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ Check if attendance already exists for today
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
      existingAttendance.attendanceByNFC = attendanceByNFC;

      await existingAttendance.save();

      return res.status(200).json({
        message: "Attendance updated successfully",
        attendance: existingAttendance,
      });
    }

    // ✅ Fetch student info to get class
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res
        .status(404)
        .json({ error: "Student not found or invalid role" });
    }

    // ✅ Create new attendance entry
    const attendance = new Attendance({
      studentId,
      teacherId: req.user.userId,
      class: student.class || null,
      subject,
      status,
      notes,
      date: startOfDay,
      markedBy: req.user.username,
      markedAt: new Date(),
      method: "manual",
      attendanceByNFC, // ✅ from frontend
    });

    await attendance.save();

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in markAttendanceManual:", error);
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
      startDate,
      endDate,
      page = 1,
      limit = 50,
      class: classFilter,
      search,
      self,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const matchQuery = {};

    if (req.user.role === "student") {
      matchQuery.studentId = req.user.userId;
    }

    if (req.user.role === "teacher" && self === "true") {
      matchQuery.teacherId = req.user.userId;
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date(startDate);
      end.setHours(23, 59, 59, 999);
      matchQuery.date = { $gte: start, $lte: end };
    }

    const basePipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: "$studentId",
          latestRecord: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$latestRecord" } },

      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },

      {
        $lookup: {
          from: "users",
          localField: "teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },
    ];

    if (classFilter) {
      const classNumber = parseInt(classFilter);
      if (!isNaN(classNumber)) {
        basePipeline.push({
          $match: {
            "student.class": classNumber,
          },
        });
      }
    }

    if (search) {
      basePipeline.push({
        $match: {
          $or: [
            { "student.name": { $regex: search, $options: "i" } },
            { "student.rollNumber": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // 🧮 Count total unique students
    const countPipeline = [...basePipeline, { $count: "total" }];
    const totalResult = await Attendance.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    const dataPipeline = [
      ...basePipeline,
      { $sort: { date: -1, _id: 1 } }, // moved sort here
      { $skip: skip },
      { $limit: limitNum },
    ];

    const attendance = await Attendance.aggregate(dataPipeline);

    res.json({
      message: "Unique student attendance records retrieved successfully",
      attendance,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching attendance history:", error);
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
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    const today = todayStats[0] || {
      present: 0,
      absent: 0,
      late: 0,
      total: 0,
    };

    // Calculate average attendance for today
    const averageAttendance =
      today.total > 0
        ? ((today.present / today.total) * 100).toFixed(2)
        : "0.00";

    res.json({
      daily: stats,
      today: {
        ...today,
        averageAttendance: `${averageAttendance}%`,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    res.status(500).json({ error: error.message });
  }
};
