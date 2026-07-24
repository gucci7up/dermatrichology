// ponytail: in-memory fixed-window limiter; single-process only. Swap for a
// shared store (Redis) if this ever runs multiple replicas.
export const rateLimit = ({ windowMs, max }) => {
  const hits = new Map(); // ip -> { count, resetAt }
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Demasiados intentos. Intente más tarde.' });
    }
    next();
  };
};
