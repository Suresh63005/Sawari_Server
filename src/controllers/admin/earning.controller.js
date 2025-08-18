const { Op } = require("sequelize");
const Earnings = require("../../models/earnings.model");
const Ride = require("../../models/ride.model");
const { monthFilteredEarnings, getEarningsSum, getPendingPayouts, getTotalCommission,} = require("../../services/earnings.service");


const earningsHistory = async (req, res) => {
  const sortMonth = req.query.month;
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  try {
    let start, end;

    if (sortMonth) {
      const [year, month] = sortMonth.split("-");
      start = new Date(year, parseInt(month) - 1, 1, 0, 0, 0);
      end = new Date(year, parseInt(month), 0, 23, 59, 59);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const dateRange = {
      createdAt: {
        [Op.between]: [start, end]
      }
    };

    // 1. Get all earnings within date range with pagination and search
    const { earningsList, total } = await monthFilteredEarnings(dateRange, search, page, limit);

    // 2. Get processed earnings sum
    const processedTotal = await getEarningsSum({
      ...dateRange,
      status: "processed",
    });

    // 3. Get pending payouts
    const pendingTotal = await getPendingPayouts({
      ...dateRange,
      status: "pending",
    });

    // 4. Get total commission from processed earnings
    const commissionTotal = await getTotalCommission({
      ...dateRange,
      status: "processed",
    });

    return res.status(200).json({
      success: true,
      message: "Earnings history fetched successfully",
      data: earningsList,
      total: total,
      summary: {
        processedTotal: parseFloat(processedTotal),
        pendingTotal: parseFloat(pendingTotal),
        commissionTotal: parseFloat(commissionTotal),
      },
    });

  } catch (error) {
    console.error("Earnings fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch earnings",
      error: error.message,
    });
  }
};



module.exports = {
    earningsHistory
}