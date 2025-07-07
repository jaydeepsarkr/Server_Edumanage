// models/School.js
const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  email: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("School", schoolSchema);
