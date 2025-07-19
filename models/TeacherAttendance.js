const mongoose = require("mongoose");

const teacherAttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: String, required: true }, // format: YYYY-MM-DD
  checkIn: { type: String }, // e.g., "08:45:30"
  checkOut: { type: String }, // e.g., "15:55:12"

  status: {
    type: String,
    enum: ["present", "late", "absent"],
    default: "absent",
  },
  photo: { type: String },
  name: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Ensure compound unique index on userId and date
teacherAttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const TeacherAttendance =
  mongoose.models.TeacherAttendance ||
  mongoose.model("TeacherAttendance", teacherAttendanceSchema);

module.exports = TeacherAttendance;
