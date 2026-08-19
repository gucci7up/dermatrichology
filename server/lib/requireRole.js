// Route guard for role-based access. Must run after `requireAuth`, which is
// what populates `req.user` from the JWT.
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
};
