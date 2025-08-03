const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

// Middleware to authenticate JWT tokens
exports.authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = decoded;
    // Optionally, populate user object
    const user = await User.findById(decoded.id).populate('roles');
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to require admin role
exports.requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.roles) {
    return res.status(403).json({ error: 'Forbidden: No roles assigned' });
  }
  // Accepts either ["admin"] or array of role objects
  const roles = Array.isArray(req.user.roles) ? req.user.roles : [];
  const isAdmin = roles.some(r => (typeof r === 'string' ? r === 'admin' : r.name === 'admin'));
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }
  next();
};
