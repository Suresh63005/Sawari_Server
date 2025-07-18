const AuthService  = require('../../services/auth.service');
const { getRolePermissions } = require('./auth.controller');

const getAdmins = async (req, res) => {
  try {
    const admins = await AuthService.getAllAdmins();
    return res.json(admins.map(admin => {
      const rolePermissions = getRolePermissions(admin.role); // Fallback to role-based permissions
      return {
        id: admin.id,
        name: `${admin.first_name} ${admin.last_name}`,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        status: admin.status,
        created_by: admin.created_by,
        createdAt: admin.createdAt ? admin.createdAt.toISOString() : null,
        permissions: {
          dashboard: admin.permissions ? admin.permissions.dashboard_access : rolePermissions.dashboard_access,
          drivers: admin.permissions ? admin.permissions.manage_drivers : rolePermissions.manage_drivers,
          vehicles: admin.permissions ? admin.permissions.manage_vehicles : rolePermissions.manage_vehicles,
          rides: admin.permissions ? admin.permissions.manage_ride : rolePermissions.manage_ride,
          hotels: admin.permissions ? admin.permissions.manage_hotel : rolePermissions.manage_hotel,
          earnings: admin.permissions ? admin.permissions.manage_earnings : rolePermissions.manage_earnings,
          support: admin.permissions ? admin.permissions.manage_support_tickets : rolePermissions.manage_support_tickets,
          notifications: admin.permissions ? admin.permissions.manage_notifications : rolePermissions.manage_notifications,
          admin_management: admin.permissions ? admin.permissions.manage_admin : rolePermissions.manage_admin,
        },
      };
    }));
  } catch (error) {
    console.error('Get admins error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    await AuthService.updatePermissions(id, {
      dashboard_access: permissions.dashboard,
      manage_drivers: permissions.drivers,
      manage_vehicles: permissions.vehicles,
      manage_ride: permissions.rides,
      manage_hotel: permissions.hotels,
      manage_earnings: permissions.earnings,
      manage_support_tickets: permissions.support,
      manage_notitications: permissions.notifications,
      manage_admin: permissions.admin_management,
      granted_by: req.user.id,
    });

    return res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Update permissions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await AuthService.updateAdminStatus(id, status);
    return res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getAdmins, updatePermissions, updateStatus };