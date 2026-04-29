const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  const tokenParts = token.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token format invalid' });
  }

  jwt.verify(tokenParts[1], process.env.JWT_SECRET || 'panchayat_secret_key', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized!' });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.unitId = decoded.unit_id;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.userRole === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Require Admin Role!' });
  }
};

const isUnit = (req, res, next) => {
  if (req.userRole === 'unit') {
    next();
  } else {
    res.status(403).json({ error: 'Require Unit Role!' });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isUnit
};
