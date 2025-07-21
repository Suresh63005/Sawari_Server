const Admin = require('../models/admin.model');
const Permissions = require('../models/permissions.model');
const { Op } = require('sequelize');

const getAdminByEmail = async (email) => {
  return await Admin.findOne({
    where: { email, status: { [Op.ne]: 'blocked' } },
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
    status: data.status || 'active',
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
      manage_notifications: 0,
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
    manage_notifications: data.manage_notifications ? 1 : 0,
    manage_admin: data.manage_admin ? 1 : 0,
    granted_by: data.granted_by,
  });
};

const updateAdminStatus = async (id, status) => {
  const admin = await Admin.findByPk(id);
  if (admin) {
    if (!['active', 'inactive', 'blocked'].includes(status)) {
      throw new Error('Invalid status. Must be "active", "inactive", or "blocked"');
    }
    admin.status = status;
    await admin.save();
    return admin;
  }
  throw new Error('Admin not found');
};

const getAllAdmins = async () => {
  return await Admin.findAll({
    include: [{ model: Permissions, as: 'AdminPermissions' }],
    order: [['createdAt', 'DESC']],
  });
};

const updatePermissions = async (id, permissions) => {
  const [updatedPermissions, created] = await Permissions.findOrCreate({
    where: { user_id: id },
    defaults: {
      user_id: id,
      dashboard_access: 0,
      manage_drivers: 0,
      manage_vehicles: 0,
      manage_ride: 0,
      manage_earnings: 0,
      manage_support_tickets: 0,
      manage_notifications: 0,
      manage_admin: 0,
      granted_by: permissions.granted_by || null,
    },
  });

  const updatedValues = {
    dashboard_access: permissions.dashboard_access,
    manage_drivers: permissions.manage_drivers,
    manage_vehicles: permissions.manage_vehicles,
    manage_ride: permissions.manage_ride,
    manage_earnings: permissions.manage_earnings,
    manage_support_tickets: permissions.manage_support_tickets,
    manage_notifications: permissions.manage_notifications,
    manage_admin: permissions.manage_admin,
    granted_by: permissions.granted_by,
  };

  await updatedPermissions.update(updatedValues);
  return updatedPermissions;
};

module.exports = {
  getAdminByEmail,
  getAdminById,
  createAdmin,
  getAdminPermissions,
  createPermissions,
  updateAdminStatus,
  getAllAdmins,
  updatePermissions,
};