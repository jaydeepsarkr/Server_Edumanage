const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Adjust path as needed

module.exports = async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Check if user still exists in MongoDB
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user; // Store full user object if needed
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
