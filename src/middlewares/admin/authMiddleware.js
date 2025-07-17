const jwt = require('jsonwebtoken');
const { Admin } = require('../../models/admin.model');
const { Permissions } = require('../../models/permissions.model');

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
        notifications: permissions.manage_notitications,
        admin_management: permissions.manage_admin,
      } : undefined,
    };

    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const permissionMiddleware = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user?.permissions) {
      return res.status(403).json({ message: 'No permissions found' });
    }

    const permissionMap = {
      dashboard: 'dashboard_access',
      drivers: 'manage_drivers',
      vehicles: 'manage_vehicles',
      rides: 'manage_ride',
      hotels: 'manage_hotel',
      earnings: 'manage_earnings',
      support: 'manage_support_tickets',
      notifications: 'manage_notitications',
      admin_management: 'manage_admin',
    };

    const dbPermission = permissionMap[requiredPermission];

    if (!dbPermission || !req.user.permissions[dbPermission]) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { authMiddleware, permissionMiddleware };