const passport = require("passport");

// Protect routes - requires JWT token
const protect = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || "Unauthorized. Please login.",
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({
    success: false,
    message: "Access denied. Admins only.",
  });
};

module.exports = { protect, adminOnly };
