const router = require("express").Router();
const { authMiddleware } = require("../../../middlewares/admin/authMiddleware");
const {
  login,
  register,
  logout,
  getPermissions,
  getMe,
} = require("../../../controllers/admin/auth.controller");
const {
  getAdmins,
  updatePermissions,
  updateStatus,
} = require("../../../controllers/admin/admin.controller");
const adminManagementController = require("../../../controllers/admin/admin_management.controller");
const { endPoints } = require("../../api");

router.post(endPoints.auth.login, login);
router.post(endPoints.auth.register, register);
router.post(endPoints.auth.logout, authMiddleware, logout);
router.get(endPoints.auth.permissions, authMiddleware, getPermissions);
router.get(endPoints.auth.getMe, authMiddleware, getMe);
router.get(endPoints.auth.getAdmins, authMiddleware, getAdmins);
router.put(endPoints.auth.updatePermissions, authMiddleware, updatePermissions);
router.put(endPoints.auth.updateStatus, authMiddleware, updateStatus);

// Admin management routes
router.get(
  endPoints.auth.listAdmins,
  authMiddleware,
  adminManagementController.listAdmins
);
router.post(
  endPoints.auth.createAdmin,
  authMiddleware,
  adminManagementController.createAdmin
);
router.put(
  endPoints.auth.updateAdmin,
  authMiddleware,
  adminManagementController.updateAdmin
);
router.put(
  endPoints.auth.updateAdminStatus,
  authMiddleware,
  adminManagementController.updateAdminStatus
);
router.put(
  endPoints.auth.adminManagementupdatePermissions,
  authMiddleware,
  adminManagementController.updatePermissions
);

module.exports = router;
