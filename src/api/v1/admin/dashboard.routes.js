const express = require("express");
const router = express.Router();
const { getDashboardStats, getRecentActivity, getPendingApprovals } = require("../../../controllers/admin/dashboard.controller");
const authMiddleware = require("../../../middlewares/admin/authMiddleware");

router.get("/stats", authMiddleware.authMiddleware, getDashboardStats);
router.get("/recent-activity", authMiddleware.authMiddleware, getRecentActivity);
router.get("/pending-approvals", authMiddleware.authMiddleware, getPendingApprovals);

module.exports = router;