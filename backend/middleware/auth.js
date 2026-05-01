const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'ferreteria_fyd_secret_2024';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function employeeOnly(req, res, next) {
  if (req.user?.role !== 'employee') return res.status(403).json({ error: 'Acceso solo para empleados' });
  next();
}

module.exports = { authMiddleware, employeeOnly, SECRET };
