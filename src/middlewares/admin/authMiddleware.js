const jwt = require("jsonwebtoken");
const Admin = require("../../models/admin.model");
const Permissions = require("../../models/permissions.model");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    console.log("Token decoded:", decoded);

    const admin = await Admin.findByPk(decoded.id);
    if (!admin || admin.status === "blocked") {
      console.log("Invalid or blocked admin:", admin);
      return res
        .status(401)
        .json({ message: "invalid or this account is blocked" });
    }

    const permissions = await Permissions.findOne({
      where: { user_id: admin.id },
    });

    req.user = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: `${admin.first_name} ${admin.last_name}`,
      permissions: permissions
        ? {
            dashboard: permissions.dashboard_access,
            drivers: permissions.manage_drivers,
            vehicles: permissions.manage_vehicles,
            rides: permissions.manage_ride,
            earnings: permissions.manage_earnings,
            support: permissions.manage_support_tickets,
            push_notifications: permissions.manage_push_notifications, // Renamed
            admin_management: permissions.manage_admin,
            fleet: permissions.manage_fleet, // New
          }
        : {},
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

const permissionMiddleware = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user?.permissions) {
      console.log("No permissions found for user"); // Debug log
      return res.status(403).json({ message: "No permissions found" });
    }

    if (!req.user.permissions[requiredPermission]) {
      console.log(`Insufficient permissions for ${requiredPermission}`); // Debug log
      return res.status(403).json({
        message: `Insufficient permissions for ${requiredPermission}`,
      });
    }

    next();
  };
};

module.exports = { authMiddleware, permissionMiddleware };
