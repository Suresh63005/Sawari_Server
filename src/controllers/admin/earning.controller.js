const { Op } = require("sequelize");
const Earnings = require("../../models/earnings.model");
const Ride = require("../../models/ride.model");
const { monthFilteredEarnings, getEarningsSum, getPendingPayouts, getTotalCommission,} = require("../../services/earnings.service");


const earningsHistory = async (req, res) => {
  console.log(1)
  const sortMonth = req.query.month;
  console.log(sortMonth,"monthhhhhhhh")
  try {
    console.log(2)
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
    console.log(3)

    const dateRange = {
      createdAt: {
        [Op.between]: [start, end]
      }
    };
    console.log(4)
    // 1. Get all earnings within date range
    const earningsList = await monthFilteredEarnings(dateRange);
    console.log(6)
    // 2. Get processed earnings sum
    const processedTotal = await getEarningsSum({
      ...dateRange,
      status: "processed",
    });
    console.log(7)
    // 3. Get pending payouts
    const pendingTotal = await getPendingPayouts({
      ...dateRange,
      status: "pending",
    });
    console.log(8)
    // 4. Get total commission from processed earnings
    const commissionTotal = await getTotalCommission({
      ...dateRange,
      status: "processed",
    });
console.log(9)
    return res.status(200).json({
      success: true,
      message: "Earnings history fetched successfully",
      data: earningsList,
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