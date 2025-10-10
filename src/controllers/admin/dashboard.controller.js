const { getDashboardStats, getRecentActivity, getPendingApprovals } = require("../../services/dashboard.service");

const getDashboardStatsController = async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dashboard stats",error });
  }
};


const getRecentActivityController = async (req, res) => {
  try {
    const activities = await getRecentActivity();
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch recent activity",error });
  }
};

const getPendingApprovalsController = async (req, res) => {
  try {
    const approvals = await getPendingApprovals();
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending approvals",error });
  }
};

module.exports = {
  getDashboardStats: getDashboardStatsController,
  getRecentActivity: getRecentActivityController,
  getPendingApprovals: getPendingApprovalsController,
};