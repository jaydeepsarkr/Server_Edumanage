const jwt = require("jsonwebtoken");
const User = require("../models/User");
module.exports = async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user || user.isDeleted) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = {
      userId: user._id, // ✅ Fixed: will be available in controller
      username: user.username,
      role: user.role,
      photo: user.photo,
      schoolId: user.schoolId,
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
