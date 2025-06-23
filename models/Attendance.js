const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.method === "manual"; // required only for manual method
      },
    },

    class: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    subject: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["present", "absent", "leave"],
      default: "absent",
      required: true,
    },
    method: {
      type: String,
      enum: ["manual", "url"], // ✅ required for teacherId logic to work
      required: true,
    },
    date: {
      type: Date,
      default: () => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
      },
    },
    notes: {
      type: String,
    },
    attendanceByNFC: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

// Prevent duplicate attendance for the same student on the same date
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
