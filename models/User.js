const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  // 🔐 Common Fields
  name: { type: String, required: true },

  role: {
    type: String,
    enum: ["student", "teacher", "admin", "parent"],
    required: true,
  },

  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => /^[6-9]\d{9}$/.test(v),
      message: "Invalid phone number format",
    },
  },

  address: {
    type: String,
    required: function () {
      return this.role !== "teacher";
    },
  },

  status: {
    type: String,
    enum: ["active", "leaved", "passout"],
    default: "active",
  },

  photo: { type: String, default: "" },

  // 📚 Student-Only Fields
  class: {
    type: Number,
    min: 1,
    max: 10,
    required: function () {
      return this.role === "student";
    },
  },

  rollNumber: {
    type: String,
    required: function () {
      return this.role === "student";
    },
  },

  enrollmentDate: {
    type: Date,
    required: function () {
      return this.role === "student";
    },
    default: function () {
      return this.role === "student" ? new Date() : undefined;
    },
  },

  birthCertificate: {
    type: String,
    required: function () {
      return this.role === "student";
    },
    default: "",
  },

  transferCertificate: {
    type: String,
    default: "",
    validate: {
      validator: function (value) {
        return !value || this.role === "student";
      },
      message: "Transfer Certificate is only allowed for students.",
    },
  },

  marksheet: {
    type: String,
    default: "",
    validate: {
      validator: function (value) {
        return !value || this.role === "student";
      },
      message: "Marksheet is only allowed for students.",
    },
  },

  // 🎓 Teacher-Only Fields
  dob: {
    type: Date,
    required: function () {
      return this.role === "teacher";
    },
  },

  subject: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
  },

  qualifications: {
    type: [
      {
        type: { type: String, required: true },
        institution: { type: String, required: true },
        year: { type: String, required: true },
        fileUrl: { type: String, default: "" },
        _id: false,
      },
    ],
    required: function () {
      return this.role === "teacher";
    },
    default: [],
  },

  aadhaarNumber: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
    default: "",
  },

  aadhaarCard: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
    default: "",
  },

  vtc: {
    type: String,
    default: "", // Optional for all roles
  },

  postOffice: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
    default: "",
  },

  subDistrict: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
    default: "",
  },

  state: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
    default: "",
  },

  pincode: {
    type: String,
    required: function () {
      return this.role === "teacher";
    },
    default: "",
  },

  // 🏫 Common
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: function () {
      return this.role !== "admin";
    },
  },

  remark: { type: String, default: "" },

  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// 🔐 Password Hash Middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔐 Compare Password Method
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
