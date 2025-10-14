const { Op } = require("sequelize");
const {
  monthFilteredEarnings,
  getEarningsSum,
  getPendingPayouts,
  getTotalCommission,
  generateExcel,
  singleEarnings,
  allEarnings,
} = require("../../services/earnings.service");
const { AbortController } = require("node-abort-controller");

const earningsHistory = async (req, res) => {
  const sortMonth = req.query.month;
  const search = req.query.search || "";
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
        [Op.between]: [start, end],
      },
    };

    const { earningsList, total } = await monthFilteredEarnings(
      dateRange,
      search,
      page,
      limit
    );

    const processedTotal = await getEarningsSum({
      ...dateRange,
      status: "processed",
    });

    const pendingTotal = await getPendingPayouts({
      ...dateRange,
      status: "pending",
    });

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

const Download = async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const { id } = req.params;
    const sortMonth = req.query.month;
    const search = req.query.search || "";
    let earnings;
    let filename;

    if (id) {
      earnings = await singleEarnings(id, controller.signal);
      filename = `earnings_report_${id}.xlsx`;
    } else {
      let dateRange = {};
      if (sortMonth) {
        const [year, month] = sortMonth.split("-");
        const start = new Date(year, parseInt(month) - 1, 1, 0, 0, 0);
        const end = new Date(year, parseInt(month), 0, 23, 59, 59);
        dateRange = {
          createdAt: {
            [Op.between]: [start, end],
          },
        };
      }
      earnings = await allEarnings(dateRange, search, controller.signal);
      // filename = sortMonth ? `earnings_${sortMonth}.xlsx` : `all_earnings.xlsx`;
      filename = sortMonth ? `earnings_${sortMonth}.xlsx` : "all_earnings.xlsx";
    }

    if (!earnings || (Array.isArray(earnings) && earnings.length === 0)) {
      return res
        .status(404)
        .json({ message: "No earnings data available to download" });
    }

    const buffer = await generateExcel(earnings, controller.signal);
    clearTimeout(timeout);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
    res.end();
  } catch (error) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      return res.status(408).json({ message: "Request timed out or aborted" });
    }
    console.error("Error downloading earnings report:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  earningsHistory,
  Download,
};
