const AuthService  = require('../../services/auth.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Debug log to verify AuthService import
console.log('AuthService:', AuthService);

const getRolePermissions = (role) => {
  const permissions = {
    super_admin: {
      dashboard_access: true,
      manage_drivers: true,
      manage_vehicles: true,
      manage_ride: true,
      manage_hotel: true,
      manage_earnings: true,
      manage_support_tickets: true,
      manage_notitications: true,
      manage_admin: true,
    },
    admin: {
      dashboard_access: true,
      manage_drivers: true,
      manage_vehicles: true,
      manage_ride: true,
      manage_hotel: true,
      manage_earnings: false,
      manage_support_tickets: true,
      manage_notitications: true,
      manage_admin: true,
    },
    executive_admin: {
      dashboard_access: true,
      manage_drivers: true,
      manage_vehicles: true,
      manage_ride: true,
      manage_hotel: false,
      manage_earnings: false,
      manage_support_tickets: true,
      manage_notitications: true,
      manage_admin: true,
    },
    ride_manager: {
      dashboard_access: true,
      manage_drivers: false,
      manage_vehicles: false,
      manage_ride: true,
      manage_hotel: false,
      manage_earnings: false,
      manage_support_tickets: false,
      manage_notitications: false,
      manage_admin: false,
    },
    hotel_admin: {
      dashboard_access: true,
      manage_drivers: false,
      manage_vehicles: false,
      manage_ride: true,
      manage_hotel: true,
      manage_earnings: false,
      manage_support_tickets: false,
      manage_notitications: false,
      manage_admin: false,
    },
  };
  return permissions[role] || permissions.hotel_admin;
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body,"req body")

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await AuthService.getAdminByEmail(email);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const permissions = await AuthService.getAdminPermissions(admin.id);
    if (!permissions) {
      return res.status(401).json({ message: 'No permissions found' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '60d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
      sameSite: 'strict',
    });

    return res.json({
  id: admin.id,
  name: `${admin.first_name} ${admin.last_name}`,
  email: admin.email,
  role: admin.role,
  token: token, // Add token to response
  permissions: {
    dashboard: permissions.dashboard_access,
    drivers: permissions.manage_drivers,
    vehicles: permissions.manage_vehicles,
    rides: permissions.manage_ride,
    hotels: permissions.manage_hotel,
    earnings: permissions.manage_earnings,
    support: permissions.manage_support_tickets,
    notifications: permissions.manage_notitications,
    admin_management: permissions.manage_admin,
  },
});
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, role, granted_by } = req.body;
    console.log(req.body, "req body in register");

    if (!first_name || !last_name || !email || !phone || !role) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (!AuthService) {
      throw new Error('AuthService is undefined');
    }

    const existingAdmin = await AuthService.getAdminByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already exists' });
    }

   const rawPassword = req.body.password;
if (!rawPassword) {
  return res.status(400).json({ message: 'Password is required' });
}
const password = await bcrypt.hash(rawPassword, 10);
console.log(password, "hashed password");
 // Default password, should be changed by admin
    const admin = await AuthService.createAdmin({
      first_name,
      last_name,
      email,
      phone,
      role,
      password,
      status: 'active',
    });

    const permissions = getRolePermissions(role);
    await AuthService.createPermissions({
      user_id: admin.id,
      dashboard_access: permissions.dashboard_access,
      manage_drivers: permissions.manage_drivers,
      manage_vehicles: permissions.manage_vehicles,
      manage_ride: permissions.manage_ride,
      manage_hotel: permissions.manage_hotel,
      manage_earnings: permissions.manage_earnings,
      manage_support_tickets: permissions.manage_support_tickets,
      manage_notitications: permissions.manage_notitications,
      manage_admin: permissions.manage_admin,
      granted_by: granted_by || req.user?.id || null, // Allow null for unauthenticated registration
    });

    return res.status(201).json({
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie('token');
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const permissions = await AuthService.getAdminPermissions(id);
    if (!permissions) {
      return res.status(404).json({ message: 'Permissions not found' });
    }

    return res.json({
      permissions: {
        dashboard: permissions.dashboard_access,
        drivers: permissions.manage_drivers,
        vehicles: permissions.manage_vehicles,
        rides: permissions.manage_ride,
        hotels: permissions.manage_hotel,
        earnings: permissions.manage_earnings,
        support: permissions.manage_support_tickets,
        notifications: permissions.manage_notitications,
        admin_management: permissions.manage_admin,
      },
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { login, register, logout, getPermissions };