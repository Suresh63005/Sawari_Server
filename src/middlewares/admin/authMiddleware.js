const jwt = require('jsonwebtoken');
const Admin = require('../../models/admin.model');
const Permissions = require('../../models/permissions.model');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const admin = await Admin?.findByPk(decoded.id);

    if (!admin || admin.status === 'blocked') {
      res.clearCookie('token');
      return res.status(401).json({ message: 'Invalid or blocked account' });
    }

    const permissions = await Permissions?.findOne({ where: { user_id: admin.id } });

    req.user = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: permissions ? {
        dashboard: permissions.dashboard_access,
        drivers: permissions.manage_drivers,
        vehicles: permissions.manage_vehicles,
        rides: permissions.manage_ride,
        hotels: permissions.manage_hotel,
        earnings: permissions.manage_earnings,
        support: permissions.manage_support_tickets,
        notifications: permissions.manage_notitications, // Note: Typo in 'manage_notitications'
        admin_management: permissions.manage_admin,
      } : undefined,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.clearCookie('token');
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const permissionMiddleware = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user?.permissions) {
      return res.status(403).json({ message: 'No permissions found' });
    }

    // Check the permission directly using the requiredPermission (frontend key)
    if (!req.user.permissions[requiredPermission]) {
      return res.status(403).json({ message: `Insufficient permissions for ${requiredPermission}` });
    }

    next();
  };
};

module.exports = { authMiddleware, permissionMiddleware };