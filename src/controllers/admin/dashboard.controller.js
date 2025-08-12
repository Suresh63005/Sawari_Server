const { getDashboardStats, getRecentActivity, getPendingApprovals } = require('../../services/dashboard.service');

const getDashboardStatsController = async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

const getRecentActivityController = async (req, res) => {
  try {
    const activities = await getRecentActivity();
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

const getPendingApprovalsController = async (req, res) => {
  try {
    const approvals = await getPendingApprovals();
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
};

module.exports = {
  getDashboardStats: getDashboardStatsController,
  getRecentActivity: getRecentActivityController,
  getPendingApprovals: getPendingApprovalsController,
};