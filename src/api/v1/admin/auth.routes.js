const express = require('express');
const { login, register, logout, getPermissions } = require('../../../controllers/admin/auth.controller');
const { authMiddleware, permissionMiddleware } = require('../../../middlewares/admin/authMiddleware');
const {getAdmins, updatePermissions, updateStatus} = require('../../../controllers/admin/admin.controller');
const { get } = require('../../../app');

const router = express.Router();

router.post('/login', login);
// Allow registration without authentication for initial setup
router.post('/register', register);
router.post('/logout', authMiddleware, logout);
router.get('/permissions/:id', authMiddleware, getPermissions);
router.get('/getadmins', authMiddleware, permissionMiddleware('admin_management'), getAdmins);

module.exports = router;