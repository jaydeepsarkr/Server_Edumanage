const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  role: {
    type: String,
    enum: ["student", "teacher", "admin", "parent"],
    required: true,
  },

  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: {
    type: String,
    enum: ["active", "leaved", "passout"],
    default: "active",
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => /^[6-9]\d{9}$/.test(v),
      message: "Invalid phone number format",
    },
  },

  address: { type: String, required: true },

  class: {
    type: Number,
    min: 1,
    max: 10,
    required: function () {
      return this.role === "student";
    },
    validate: {
      validator: function (value) {
        if (this.role === "student") return value >= 1 && value <= 10;
        return true;
      },
      message: "Class must be between 1 and 10 for students",
    },
  },

  rollNumber: {
    type: String,
    required: function () {
      return this.role === "student";
    },
    validate: {
      validator: function (value) {
        if (this.role === "student") return !!value;
        return true;
      },
      message: "Roll number is required for students",
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
  photo: {
    type: String,
    default: "",
  },
  aadhaarCard: {
    type: String,
    required: function () {
      return this.role === "student";
    },
    default: "undefined",
  },

  birthCertificate: {
    type: String,
    required: function () {
      return this.role === "student";
    },
    default: "undefined",
  },
  transferCertificate: {
    type: String,
    default: "",
  },

  marksheet: {
    type: String,
    default: "",
  },

  isDeleted: { type: Boolean, default: false },
  remark: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// userSchema.pre(/^find/, function (next) {
//   this.where({ isDeleted: false });
//   next();
// });

module.exports = mongoose.model("User", userSchema);
