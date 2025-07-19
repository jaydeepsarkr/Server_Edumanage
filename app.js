require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// const path = require("path");

const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendanceRoutes");
const userRoutes = require("./routes/userRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const teacherAttendanceRoutes = require("./routes/teacherAttendanceRoutes");

const app = express();

// Middleware
const allowedOrigins = [
  "https://edumanages.netlify.app",
  "http://localhost:8080",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
const DB = process.env.CONNECTION_STRING.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", attendanceRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api", userRoutes);
app.use("/api", schoolRoutes);
app.use("/api", teacherRoutes);
app.use("/api/attendance/teacher", teacherAttendanceRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("School Management API Running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
