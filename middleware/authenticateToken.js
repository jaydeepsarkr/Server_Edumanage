const jwt = require("jsonwebtoken");

module.exports = function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  // Bearer TOKEN or just token
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // will contain: { userId, username, role, ... }
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
