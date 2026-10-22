const jwt = require('jsonwebtoken');
const {
  User
} = require('../models');
exports.auth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(claims.id).select('_id name role active generator');
    if (!user || !user.active) return res.status(401).json({
      error: 'Account is inactive. Please sign in again.'
    });
    req.user = {
      id: user.id,
      name: user.name,
      role: user.role,
      generator: user.generator
    };
    next();
  } catch {
    return res.status(401).json({
      error: 'Please sign in again.'
    });
  }
};
exports.allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({
  error: 'This role cannot perform that action.'
});
