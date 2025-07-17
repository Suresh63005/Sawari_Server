const { AuthService } = require('../../services/auth.service');

const getAdmins = async (req, res) => {
  try {
    const admins = await AuthService.getAllAdmins();
    return res.json(admins.map(admin => ({
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      status: admin.status,
      created_by: admin.created_by,
      created_at: admin.created_at.toISOString().split('T')[0],
      permissions: {
        dashboard: admin.permissions ? admin.permissions.dashboard_access : false,
        drivers: admin.permissions ? admin.permissions.manage_drivers : false,
        vehicles: admin.permissions ? admin.permissions.manage_vehicles : false,
        rides: admin.permissions ? admin.permissions.manage_ride : false,
        hotels: admin.permissions ? admin.permissions.manage_hotel : false,
        earnings: admin.permissions ? admin.permissions.manage_earnings : false,
        support: admin.permissions ? admin.permissions.manage_support_tickets : false,
        notifications: admin.permissions ? admin.permissions.manage_notitications : false,
        admin_management: admin.permissions ? admin.permissions.manage_admin : false,
      },
    })));
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