// middleware/requireRole.js

module.exports = function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: insufficient role"
        });
      }

      next();
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Role verification failed"
      });
    }
  };
};
