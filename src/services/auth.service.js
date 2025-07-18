// src/services/auth.service.js
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
  return await Admin.create({
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    password: data.password,
    status: data.status,
    one_signal_id: `onesignal-${Date.now()}`,
  });
};

const getAdminPermissions = async (user_id) => {
  return await Permissions.findOne({ where: { user_id } }); // Removed user_type
};

const createPermissions = async (data) => {
  return await Permissions.create(data);
};

const updateAdminStatus = async (id, status) => {
  const admin = await Admin.findByPk(id);
  if (admin) {
    admin.status = status;
    await admin.save();
    return admin;
  }
  throw new Error('Admin not found');
};

const getAllAdmins = async () => {
  return await Admin.findAll({
    include: [{ model: Permissions, as: 'AdminPermissions', required: false }], // Removed user_type
  });
};

const updatePermissions = async (id, permissions) => {
  const existingPermissions = await Permissions.findOne({ where: { user_id: id } }); // Removed user_type
  if (existingPermissions) {
    await existingPermissions.update(permissions);
  } else {
    await Permissions.create({ user_id: id, ...permissions });
  }
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