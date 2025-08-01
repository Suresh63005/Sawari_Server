const AuthService = require('../../services/auth.service');
const { getRolePermissions } = require('./auth.controller');

// Define admin hierarchy for role-based filtering
const getAdminHierarchy = (currentRole) => {
  const hierarchy = {
    super_admin: ['super_admin', 'admin', 'executive_admin', 'ride_manager'],
    admin: ['admin', 'executive_admin', 'ride_manager'],
    executive_admin: ['executive_admin', 'ride_manager'],
    ride_manager: ['ride_manager'],
  };
  return hierarchy[currentRole] || ['ride_manager'];
};

// Check if the current user can create a new admin role
const canCreateAdmin = (currentRole, newRole) => {
  const hierarchy = getAdminHierarchy(currentRole);
  return hierarchy.includes(newRole) && currentRole !== newRole;
};

const listAdmins = async (req, res) => {
  try {
    const currentUser = req.user;
    console.log('Listing admins for user:', currentUser.id, currentUser.role); // Debug log
    const admins = await AuthService.getAllAdmins();
    

    // Filter admins based on role
    const filteredAdmins = admins.filter(admin => {
      if (currentUser.role === 'super_admin') return true;
      const allowedRoles = getAdminHierarchy(currentUser.role);
      return (
        allowedRoles.includes(admin.role) &&
        admin.role !== currentUser.role &&
        admin.id !== currentUser.id
      );
    });

    // Map admins to response format
    const response = filteredAdmins.map(admin => {
      const permissions = admin.AdminPermissions[0] || {
        dashboard_access: false,
        manage_drivers: false,
        manage_vehicles: false,
        manage_ride: false,
        manage_earnings: false,
        manage_support_tickets: false,
        manage_notifications: false,
        manage_admin: false,
      };
      console.log(`Mapping admin ${admin.id} (${admin.first_name} ${admin.last_name}):`, { permissions });
      return {
        id: admin.id,
        name: `${admin.first_name} ${admin.last_name}`,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        status: admin.status, // 'active', 'inactive', or 'blocked'
        created_at: admin.createdAt.toISOString().split('T')[0],
        permissions: {
          dashboard: Boolean(permissions.dashboard_access),
          drivers: Boolean(permissions.manage_drivers),
          vehicles: Boolean(permissions.manage_vehicles),
          rides: Boolean(permissions.manage_ride),
          earnings: Boolean(permissions.manage_earnings),
          support: Boolean(permissions.manage_support_tickets),
          notifications: Boolean(permissions.manage_notifications),
          admin_management: Boolean(permissions.manage_admin),
        },
      };
    });

    return res.json(response);
  } catch (error) {
    console.error('List admins error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const bcrypt = require('bcrypt');

const createAdmin = async (req, res) => {
  try {
    const currentUser = req.user;
    const { first_name, last_name, email, phone, role, password } = req.body;

    if (!first_name || !last_name || !email || !phone || !role || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (!canCreateAdmin(currentUser.role, role)) {
      return res.status(403).json({ message: 'Insufficient permissions to create this role' });
    }

    const existingAdmin = await AuthService.getAdminByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // 🔐 Hash password before saving
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const admin = await AuthService.createAdmin({
      first_name,
      last_name,
      email,
      phone,
      role,
      password: hashedPassword,
      status: 'active',
      created_by: currentUser.id,
    });

    const permissions = getRolePermissions(role);
    await AuthService.createPermissions({
      user_id: admin.id,
      dashboard_access: Boolean(permissions.dashboard_access),
      manage_drivers: Boolean(permissions.manage_drivers),
      manage_vehicles: Boolean(permissions.manage_vehicles),
      manage_ride: Boolean(permissions.manage_ride),
      manage_earnings: Boolean(permissions.manage_earnings),
      manage_support_tickets: Boolean(permissions.manage_support_tickets),
      manage_notifications: Boolean(permissions.manage_notifications),
      manage_admin: Boolean(permissions.manage_admin),
      granted_by: currentUser.id,
    });

    return res.status(201).json({
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      status: admin.status,
      created_at: admin.createdAt.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


const updateAdminStatus = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const { status } = req.body;
    console.log(`Updating status for admin ${id} to: ${status} by user ${currentUser.id}`); // Debug log

    if (!['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "active", "inactive", or "blocked"' });
    }

    const admin = await AuthService.getAdminById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (currentUser.id === admin.id) {
      return res.status(403).json({ message: 'Cannot modify own status' });
    }

    const allowedRoles = getAdminHierarchy(currentUser.role);
    if (!allowedRoles.includes(admin.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to modify this admin' });
    }

    const updatedAdmin = await AuthService.updateAdminStatus(id, status);
    console.log(`Status updated for admin ${id}:`, updatedAdmin); // Debug log

    return res.json({
      id: updatedAdmin.id,
      status: updatedAdmin.status,
    });
  } catch (error) {
    console.error('Update admin status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const permissions = req.body;
    console.log(`Updating permissions for admin ${id}:`, permissions); // Debug log

    const admin = await AuthService.getAdminById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (currentUser.id === admin.id) {
      return res.status(403).json({ message: 'Cannot modify own permissions' });
    }

    const allowedRoles = getAdminHierarchy(currentUser.role);
    if (!allowedRoles.includes(admin.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to modify this admin' });
    }

    const updatedPermissions = await AuthService.updatePermissions(id, {
      dashboard_access: permissions.dashboard ? 1 : 0,
      manage_drivers: permissions.drivers ? 1 : 0,
      manage_vehicles: permissions.vehicles ? 1 : 0,
      manage_ride: permissions.rides ? 1 : 0,
      manage_earnings: permissions.earnings ? 1 : 0,
      manage_support_tickets: permissions.support ? 1 : 0,
      manage_notifications: permissions.notifications ? 1 : 0,
      manage_admin: permissions.admin_management ? 1 : 0,
      granted_by: currentUser.id,
    });
    console.log(`Permissions updated for admin ${id}:`, updatedPermissions); // Debug log

    return res.json({
      message: 'Permissions updated successfully',
      permissions: {
        dashboard: !!updatedPermissions.dashboard_access,
        drivers: !!updatedPermissions.manage_drivers,
        vehicles: !!updatedPermissions.manage_vehicles,
        rides: !!updatedPermissions.manage_ride,
        earnings: !!updatedPermissions.manage_earnings,
        support: !!updatedPermissions.manage_support_tickets,
        notifications: !!updatedPermissions.manage_notifications,
        admin_management: !!updatedPermissions.manage_admin,
      },
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  listAdmins,
  createAdmin,
  updateAdminStatus,
  updatePermissions,
};