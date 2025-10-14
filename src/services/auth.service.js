const Admin = require("../models/admin.model");
const Permissions = require("../models/permissions.model");
const { Op } = require("sequelize");
const { sequelize } = require("../models");
const { getAdminHierarchy } = require("../utils/adminHierarchy");
const getAdminByEmail = async (email) => {
  return await Admin.findOne({
    where: { email },
  });
};

const getAdminById = async (id) => {
  return await Admin.findByPk(id);
};

const createAdmin = async (data) => {
  const admin = await Admin.create({
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    password: data.password,
    status: data.status || "active",
    one_signal_id: `onesignal-${Date.now()}`,
  });
  // Ensure permissions are created even if not provided
  await Permissions.findOrCreate({
    where: { user_id: admin.id },
    defaults: {
      user_id: admin.id,
      dashboard_access: 0,
      manage_drivers: 0,
      manage_vehicles: 0,
      manage_ride: 0,
      manage_earnings: 0,
      manage_support_tickets: 0,
      manage_push_notifications: 0, // Renamed
      manage_fleet: 0,
      manage_admin: 0,
      granted_by: data.created_by || null,
    },
  });
  return admin;
};

const getAdminPermissions = async (user_id) => {
  return await Permissions.findOne({ where: { user_id } });
};

const createPermissions = async (data) => {
  return await Permissions.create({
    user_id: data.user_id,
    dashboard_access: data.dashboard_access ? 1 : 0,
    manage_drivers: data.manage_drivers ? 1 : 0,
    manage_vehicles: data.manage_vehicles ? 1 : 0,
    manage_ride: data.manage_ride ? 1 : 0,
    manage_earnings: data.manage_earnings ? 1 : 0,
    manage_support_tickets: data.manage_support_tickets ? 1 : 0,
    manage_push_notifications: data.manage_push_notifications ? 1 : 0,
    manage_fleet: data.manage_fleet ? 1 : 0, // New
    manage_reports: data.manage_reports ? 1 : 0, // New
    manage_admin: data.manage_admin ? 1 : 0,
    granted_by: data.granted_by,
  });
};
const updateAdmin = async (id, updates) => {
  const admin = await Admin.findByPk(id);
  if (!admin) throw new Error("Admin not found");

  Object.assign(admin, updates);
  await admin.save();
  return admin;
};

const updateAdminStatus = async (id, status) => {
  const admin = await Admin.findByPk(id);
  if (admin) {
    if (!["active", "inactive", "blocked"].includes(status)) {
      throw new Error(
        'Invalid status. Must be "active", "inactive", or "blocked"'
      );
    }
    admin.status = status;
    await admin.save();
    return admin;
  }
  throw new Error("Admin not found");
};

const getAllAdmins = async ({
  search = "",
  limit = 10,
  page = 1,
  sortBy = "createdAt",
  sortOrder = "DESC",
  currentUser, // Add currentUser to apply role-based filtering
}) => {
  // Validate query parameters
  const parsedPage = parseInt(page) > 0 ? parseInt(page) : 1;
  const parsedLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
  const validSortBy = [
    "createdAt",
    "first_name",
    "last_name",
    "email",
    "role",
  ].includes(sortBy)
    ? sortBy
    : "createdAt";
  const validSortOrder =
    sortOrder && ["ASC", "DESC"].includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";
  const offset = (parsedPage - 1) * parsedLimit;

  // Build where clause with role-based filtering
  let where = {};
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.like]: `%${search}%` } },
      { last_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { role: { [Op.like]: `%${search}%` } },
    ];
  }

  // Apply role-based filtering and exclude current user
  if (currentUser.role !== "super_admin") {
    const allowedRoles = getAdminHierarchy(currentUser.role);
    where = {
      ...where,
      role: { [Op.in]: allowedRoles },
      id: { [Op.ne]: currentUser.id },
    };
  } else {
    where = {
      ...where,
      id: { [Op.ne]: currentUser.id },
    };
  }

  const { rows, count } = await Admin.findAndCountAll({
    where,
    include: [{ model: Permissions, as: "AdminPermissions" }],
    order: [[validSortBy, validSortOrder]],
    limit: parsedLimit,
    offset,
    distinct: true, // 👈 tells Sequelize to count only distinct Admins
  });

  console.log(
    `getAllAdmins: page=${parsedPage}, limit=${parsedLimit}, count=${count}, rows=${rows.length}`
  );

  return {
    total: count,
    page: parsedPage,
    limit: parsedLimit,
    data: rows,
  };
};

const updatePermissions = async (id, permissions) => {
  const updatedValues = {
    dashboard_access: permissions.dashboard_access ? 1 : 0,
    manage_drivers: permissions.manage_drivers ? 1 : 0,
    manage_vehicles: permissions.manage_vehicles ? 1 : 0,
    manage_ride: permissions.manage_ride ? 1 : 0,
    manage_earnings: permissions.manage_earnings ? 1 : 0,
    manage_support_tickets: permissions.manage_support_tickets ? 1 : 0,
    manage_push_notifications: permissions.manage_push_notifications ? 1 : 0,
    manage_fleet: permissions.manage_fleet ? 1 : 0,
    manage_reports: permissions.manage_reports ? 1 : 0,
    manage_admin: permissions.manage_admin ? 1 : 0,
    granted_by: permissions.granted_by || null,
  };

  return await sequelize.transaction(async (t) => {
    // 1) Try update
    const [affectedRows] = await Permissions.update(updatedValues, {
      where: { user_id: id },
      transaction: t,
    });

    if (affectedRows === 0) {
      // 2) Nothing to update -> create
      const created = await Permissions.create(
        { user_id: id, ...updatedValues },
        { transaction: t }
      );
      return created;
    }

    // 3) Fetch fresh record and return
    const perm = await Permissions.findOne({
      where: { user_id: id },
      transaction: t,
    });
    return perm;
  });
};

module.exports = {
  getAdminByEmail,
  getAdminById,
  createAdmin,
  updateAdmin,
  getAdminPermissions,
  createPermissions,
  updateAdminStatus,
  getAllAdmins,
  updatePermissions,
};
