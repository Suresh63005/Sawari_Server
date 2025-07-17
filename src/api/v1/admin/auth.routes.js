const express = require('express');
const { login, register, logout, getPermissions } = require('../../../controllers/admin/auth.controller');
const { authMiddleware, permissionMiddleware } = require('../../../middlewares/admin/authMiddleware');

const router = express.Router();

router.post('/login', login);
// Allow registration without authentication for initial setup
router.post('/register', register);
router.post('/logout', authMiddleware, logout);
router.get('/permissions/:id', authMiddleware, getPermissions);

module.exports = router;