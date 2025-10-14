const router = require("express").Router();
const {
  getDashboardStats,
  getRecentActivity,
  getPendingApprovals,
} = require("../../../controllers/admin/dashboard.controller");
const authMiddleware = require("../../../middlewares/admin/authMiddleware");
const { endPoints } = require("../../api");

router.get(
  endPoints.dashboard.getDashboardStats,
  authMiddleware.authMiddleware,
  getDashboardStats
);
router.get(
  endPoints.dashboard.getRecentActivity,
  authMiddleware.authMiddleware,
  getRecentActivity
);
router.get(
  endPoints.dashboard.getPendingApprovals,
  authMiddleware.authMiddleware,
  getPendingApprovals
);

module.exports = router;
