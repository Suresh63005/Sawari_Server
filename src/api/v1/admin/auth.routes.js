const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../../middlewares/admin/authMiddleware");
const { login, register, logout, getPermissions, getMe } = require("../../../controllers/admin/auth.controller");
const { getAdmins, updatePermissions, updateStatus } = require("../../../controllers/admin/admin.controller");
const adminManagementController = require("../../../controllers/admin/admin_management.controller");
router.post("/login", login);
router.post("/register", register);
router.post("/logout", authMiddleware, logout);
router.get("/permissions/:id", authMiddleware, getPermissions);
router.get("/me", authMiddleware, getMe);
router.get("/admins", authMiddleware, getAdmins);
router.put("/admins/:id/permissions", authMiddleware, updatePermissions);
router.put("/admins/:id/status", authMiddleware, updateStatus);


// Admin management routes
router.get("/admin-management", authMiddleware, adminManagementController.listAdmins);
router.post("/admin-management", authMiddleware, adminManagementController.createAdmin);
router.put("/admin-management/:id", authMiddleware, adminManagementController.updateAdmin);
router.put("/admin-management/:id/status", authMiddleware, adminManagementController.updateAdminStatus);
router.put("/admin-management/:id/permissions", authMiddleware, adminManagementController.updatePermissions);

module.exports = router;