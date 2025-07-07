const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
  schoolName: { type: String, required: true },
  schoolType: { type: String },
  establishmentYear: { type: String },
  address: { type: String },
  village: { type: String },
  postOffice: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  pincode: { type: String },
  primaryPhone: { type: String },
  secondaryPhone: { type: String },
  email: { type: String },
  website: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("School", schoolSchema);
