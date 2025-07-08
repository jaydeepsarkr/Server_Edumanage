require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const DB = process.env.CONNECTION_STRING.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });

const createAdmin = async () => {
  try {
    const exists = await User.findOne({ email: "admin@example.com" });
    if (exists) {
      console.log("⚠️ Admin already exists");
      process.exit();
    }

    // ✅ DO NOT HASH PASSWORD HERE — mongoose will hash it automatically
    const admin = new User({
      name: "Super Admin",
      email: "admin@example.com",
      password: "Admin@123", // plain password
      role: "admin",
      phone: "9999999999",
      address: "Admin Office, Central City",
    });

    await admin.save();
    console.log("✅ Admin created successfully");
    process.exit();
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
