require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", attendanceRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/attendance", attendanceRoutes);

// Root
app.get("/", (req, res) => {
  res.send("School Management API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
