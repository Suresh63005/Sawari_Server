const { Op } = require("sequelize");
const Earnings = require("../models/earnings.model");
const Ride = require("../models/ride.model");
const ExcelJS = require("exceljs");

const earningsDTO = (data) => {
  return {
    driver_id: data.driver_id,
    ride_id: data.ride_id,
    amount: parseFloat(data.amount) || 0.0,
    commission: parseFloat(data.commission) || 0.0,
    percentage: parseFloat(data.percentage) || 0.0,
    payment_method: data.payment_method || "bank_transfer",
    status: data.status || "pending",
  };
};

const earningsResponseDTO = (earnings) => {
  return {
    id: earnings.id,
    driver_id: earnings.driver_id,
    ride_id: earnings.ride_id,
    amount: parseFloat(earnings.amount),
    commission: parseFloat(earnings.commission),
    percentage: parseFloat(earnings.percentage),
    payment_method: earnings.payment_method,
    status: earnings.status,
    createdAt: earnings.createdAt,
    updatedAt: earnings.updatedAt,
  };
};

/**
 * Create an earnings record
 * @param {Object} data - Earnings data including driver_id, ride_id, amount, commission, percentage
 * @returns {Object} - Created earnings record
 */

const createEarnings = async (data) => {
  if (!data.driver_id || !data.ride_id || !data.amount || !data.percentage || !data.commission) {
    throw new Error("Missing required fields: driver_id, ride_id, amount, percentage, commission");
  }
  const earningsData = earningsDTO(data);
  const earnings = await Earnings.create(earningsData);
  return earningsResponseDTO(earnings);
};

/**
 * Get all earnings for a driver with optional filters and pagination
 * @param {Object} options - Filters (driverId, status) and pagination (limit, page)
 * @returns {Object} - Paginated earnings list
 */

const getEarningsByDriver = async ({ driverId, status, limit = 10, page = 1 }) => {
  const where = { driver_id: driverId };
  const offset = (parseInt(page) - 1) * parseInt(limit);

  if (status) {
    where.status = status;
  }

  const { rows, count } = await Earnings.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset,
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map((earnings) => earningsResponseDTO(earnings))
  };
};

/**
 * Get earnings by ride ID
 * @param {string} riderId - UUID of the ride
 * @returns {Object} - Earnings record
 */

const getEarningsByRide = async (riderId) => {
  const earnings = await Earnings.findOne({ where: { rider_id: riderId } });
  if (!earnings) {
    throw new Error("Earnings not found for the given ride");
  }
  return earningsResponseDTO(earnings);
};

//mo

const monthFilteredEarnings = async (dateRange, search = "", page = 1, limit = 5) => {
  const offset = (page - 1) * limit;
  const where = { ...dateRange };

  if (search) {
    where[Op.or] = [
      { "$Ride.customer_name$": { [Op.like]: `%${search}%` } },
      { "$Ride.email$": { [Op.like]: `%${search}%` } },
      { "$Ride.phone$": { [Op.like]: `%${search}%` } },
      { ride_id: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Earnings.findAndCountAll({
    where,
    include: [
      {
        model: Ride,
        as: "Ride",
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return {
    earningsList: rows,
    total: count,
  };
};

const getEarningsSum = async (where = {}) => {
  const amount = await Earnings.sum("amount", where);
  return amount || 0;
};

// Get total pending payouts
const getPendingPayouts = async (where = {}) => {
  const amount = await Earnings.sum("amount", { where });
  return amount || 0;
};

/**
 * Get total commission based on condition
 * @param {Object} where
 * @returns {Number}
 */

const getTotalCommission = async (where = {}) => {
  const commission = await Earnings.sum("commission", { where });
  return commission || 0;
};

const singleEarnings = async (id,signal) => {
  if(signal?.aborted) throw new Error("Operation aborted");
  const result= await Earnings.findOne({
    where: { id },
    // attributes:[exclude:{exclude}],
    include: [{ model: Ride, as: "Ride" }],
  });

  if(signal?.aborted) throw new Error("Operation aborted after query");
  return result;
};

const allEarnings = async (signal) => {
  if(signal?.aborted) throw new Error("Operation aborted");
  const result = await Earnings.findAll({
    include: [{ model: Ride, as: "Ride" }],
    order: [["createdAt", "DESC"]],
  });
  if(signal?.aborted) throw new Error("Operation aborted after query");
  return result;
};


const generateExcel = async (earnings,signal) => {
  if(signal?.aborted) throw new Error("Operation aborted before Excel gen");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Earnings Report");

  worksheet.columns = [
    { header: "Earning ID", key: "id", width: 36 },
    { header: "Driver ID", key: "driver_id", width: 36 },
    { header: "Ride ID", key: "ride_id", width: 36 },
    { header: "Amount", key: "amount", width: 15 },
    { header: "Commission", key: "commission", width: 15 },
    { header: "Percentage", key: "percentage", width: 15 },
    { header: "Payment Method", key: "payment_method", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Created At", key: "createdAt", width: 25 }
  ];

  const rows = Array.isArray(earnings) ? earnings : [earnings];

  for (const e of rows) {
    if (signal?.aborted) throw new Error("Aborted during Excel row gen");
    worksheet.addRow({
      id: e.id,
      driver_id: e.driver_id,
      ride_id: e.ride_id,
      amount: e.amount,
      commission: e.commission,
      percentage: e.percentage,
      payment_method: e.payment_method,
      status: e.status,
      createdAt: e.createdAt
    });
  }

  if (signal?.aborted) throw new Error("Aborted before writing buffer");

  return await workbook.xlsx.writeBuffer();
};

module.exports = {
  createEarnings,
  getEarningsByDriver,
  getEarningsByRide,
  monthFilteredEarnings,
  getEarningsSum,
  getPendingPayouts,
  getTotalCommission,
  singleEarnings,
  allEarnings,
  generateExcel
};