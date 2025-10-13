const AuthService = require("../../services/auth.service");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// auth.controller.js
const getRolePermissions = (role) => {
  const permissions = {
    super_admin: {
      dashboard_access: true,
      manage_drivers: true,
      manage_vehicles: true,
      manage_ride: true,
      manage_earnings: true,
      manage_support_tickets: true,
      manage_push_notifications: true, // Renamed from manage_notifications
      manage_admin: true,
      manage_fleet: true, // New permission
      manage_reports: true, // New permission
    },
    admin: {
      dashboard_access: true,
      manage_drivers: true,
      manage_vehicles: true,
      manage_ride: true,
      manage_earnings: false,
      manage_support_tickets: true,
      manage_push_notifications: true, // Renamed
      manage_admin: true,
      manage_fleet: true, // New permission
      manage_reports: true, // New permission
    },
    executive_admin: {
      dashboard_access: true,
      manage_drivers: true,
      manage_vehicles: true,
      manage_ride: true,
      manage_earnings: false,
      manage_support_tickets: true,
      manage_push_notifications: true, // Renamed
      manage_admin: false,
      manage_fleet: true, // New permission
      manage_reports: true, // New permission
    },
    ride_manager: {
      dashboard_access: true,
      manage_drivers: false,
      manage_vehicles: false,
      manage_ride: true,
      manage_earnings: false,
      manage_support_tickets: false,
      manage_push_notifications: false, // Renamed
      manage_admin: false,
      manage_fleet: false,
      manage_reports: true, // New permission
    },
  };
  return permissions[role] || permissions.ride_manager;
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: !email ? "Email is required" : "Password is required",
      });
    }

    const admin = await AuthService.getAdminByEmail(email);
    if (!admin) {
      return res.status(401).json({ message: "Invalid email" });
    }

    // ✅ Check account status
    if (!admin.status || admin.status !== "active") {
      return res
        .status(403)
        .json({ message: "This account is inactive. Please contact support." });
    }
    if (admin.status === "blocked") {
      return res
        .status(403)
        .json({ message: "This account is blocked. Please contact support." });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const permissions = await AuthService.getAdminPermissions(admin.id);
    if (!permissions) {
      return res.status(401).json({ message: "No permissions found" });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "60d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    return res.json({
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`,
      email: admin.email,
      role: admin.role,
      token: token,
      permissions: {
        dashboard: permissions.dashboard_access,
        drivers: permissions.manage_drivers,
        vehicles: permissions.manage_vehicles,
        rides: permissions.manage_ride,
        earnings: permissions.manage_earnings,
        support: permissions.manage_support_tickets,
        push_notifications: permissions.manage_push_notifications,
        admin_management: permissions.manage_admin,
        fleet: permissions.manage_fleet,
        reports: permissions.manage_reports,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, role, granted_by, password } =
      req.body;

    if (!first_name || !last_name || !email || !phone || !role || !password) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    const existingAdmin = await AuthService.getAdminByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await AuthService.createAdmin({
      first_name,
      last_name,
      email,
      phone,
      role,
      password: hashedPassword,
      status: "active",
    });

    const permissions = getRolePermissions(role);
    await AuthService.createPermissions({
      user_id: admin.id,
      dashboard_access: permissions.dashboard_access,
      manage_drivers: permissions.manage_drivers,
      manage_vehicles: permissions.manage_vehicles,
      manage_ride: permissions.manage_ride,
      manage_earnings: permissions.manage_earnings,
      manage_support_tickets: permissions.manage_support_tickets,
      manage_push_notifications: permissions.manage_push_notifications, // Renamed
      manage_fleet: permissions.manage_fleet, // New
      manage_reports: permissions.manage_reports, // New
      manage_admin: permissions.manage_admin,
      granted_by: granted_by || req.user?.id || null,
    });

    return res.status(201).json({
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const permissions = await AuthService.getAdminPermissions(id);
    if (!permissions) {
      return res.status(404).json({ message: "Permissions not found" });
    }

    return res.json({
      permissions: {
        dashboard: permissions.dashboard_access,
        drivers: permissions.manage_drivers,
        vehicles: permissions.manage_vehicles,
        rides: permissions.manage_ride,
        earnings: permissions.manage_earnings,
        support: permissions.manage_support_tickets,
        push_notifications: permissions.manage_push_notifications, // Renamed
        admin_management: permissions.manage_admin,
        fleet: permissions.manage_fleet, // New
        reports: permissions.manage_reports, // New
      },
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const admin = await AuthService.getAdminById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const permissions = await AuthService.getAdminPermissions(admin.id); // Debug log
    if (!permissions) {
      return res.status(404).json({ message: "Permissions not found" });
    }

    return res.json({
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`,
      email: admin.email,
      role: admin.role,
      permissions: {
        dashboard: permissions.dashboard_access,
        drivers: permissions.manage_drivers,
        vehicles: permissions.manage_vehicles,
        rides: permissions.manage_ride,
        earnings: permissions.manage_earnings,
        support: permissions.manage_support_tickets,
        push_notifications: permissions.manage_push_notifications, // Renamed
        admin_management: permissions.manage_admin,
        fleet: permissions.manage_fleet, // New
        reports: permissions.manage_reports, // New
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  login,
  register,
  logout,
  getPermissions,
  getRolePermissions,
  getMe,
};
