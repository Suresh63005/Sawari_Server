const { Op } = require("sequelize");
const Earnings = require("../models/earnings.model");
const Ride = require("../models/ride.model");
const Car = require("../models/cars.model");
const Driver = require("../models/driver.model"); // Added Driver model
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
  console.log("Earnings data:", JSON.stringify(earnings, null, 2)); // Debug log
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
    Ride: earnings.Ride
      ? {
          id: earnings.Ride.id,
          customer_name: earnings.Ride.customer_name,
          email: earnings.Ride.email,
          phone: earnings.Ride.phone,
          pickup_address: earnings.Ride.pickup_address,
          pickup_location: earnings.Ride.pickup_location,
          drop_address: earnings.Ride.drop_address,
          drop_location: earnings.Ride.drop_location,
          pickup_time: earnings.Ride.pickup_time,
          dropoff_time: earnings.Ride.dropoff_time,
          ride_type: earnings.Ride.ride_type,
          rider_hours: earnings.Ride.rider_hours,
          Price: parseFloat(earnings.Ride.Price || 0),
          Total: parseFloat(earnings.Ride.Total || 0),
          car_id: earnings.Ride.car_id,
          driver_id: earnings.Ride.driver_id,
          driver_name: earnings.Ride.AssignedDriver?.first_name || "N/A", // Added driver_name
        }
      : null,
    Car: earnings.Ride?.Car
      ? {
          id: earnings.Ride.Car.id,
          brand: earnings.Ride.Car.brand,
          model: earnings.Ride.Car.model,
        }
      : null,
  };
};

const createEarnings = async (data, transaction = null) => {
  const {
    driver_id,
    ride_id,
    amount,
    commission = 0,
    percentage = 0,
    status = "pending",
  } = data;
  const earningsData = earningsDTO({
    driver_id,
    ride_id,
    amount,
    commission,
    percentage,
    status,
  });

  const earnings = await Earnings.create(earningsData, { transaction });
  return earningsResponseDTO(earnings);
};

const getEarningsByDriver = async ({
  driverId,
  status,
  limit = 10,
  page = 1,
}) => {
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
    include: [
      {
        model: Ride,
        as: "Ride",
        include: [
          {
            model: Car,
            as: "Car",
            attributes: ["id", "brand", "model"],
          },
          {
            model: Driver,
            as: "AssignedDriver",
            attributes: ["id", "first_name"], // Fetch only driver first name
          },
        ],
      },
    ],
  });

  console.log(
    "Fetched earnings by driver:",
    rows.map((e) => earningsResponseDTO(e))
  ); // Debug log
  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map((earnings) => earningsResponseDTO(earnings)),
  };
};

const getEarningsByRide = async (rideId) => {
  const earnings = await Earnings.findOne({
    where: { ride_id: rideId },
    include: [
      {
        model: Ride,
        as: "Ride",
        include: [
          {
            model: Car,
            as: "Car",
            attributes: ["id", "brand", "model"],
          },
          {
            model: Driver,
            as: "AssignedDriver",
            attributes: ["id", "first_name"],
          },
        ],
      },
    ],
  });
  if (!earnings) {
    throw new Error("Earnings not found for the given ride");
  }
  console.log("Fetched earnings by ride:", earningsResponseDTO(earnings)); // Debug log
  return earningsResponseDTO(earnings);
};

const monthFilteredEarnings = async (
  dateRange,
  search = "",
  page = 1,
  limit = 5
) => {
  const offset = (page - 1) * limit;
  const where = { ...dateRange };

  if (search) {
    where[Op.or] = [
      { "$Ride.customer_name$": { [Op.like]: `%${search}%` } },
      { "$Ride.email$": { [Op.like]: `%${search}%` } },
      { "$Ride.phone$": { [Op.like]: `%${search}%` } },
      { ride_id: { [Op.like]: `%${search}%` } },
      { "$Ride.AssignedDriver.first_name$": { [Op.like]: `%${search}%` } }, // Added search by driver first name
    ];
  }

  const { rows, count } = await Earnings.findAndCountAll({
    where,
    include: [
      {
        model: Ride,
        as: "Ride",
        include: [
          {
            model: Car,
            as: "Car",
            attributes: ["id", "brand", "model"],
          },
          {
            model: Driver,
            as: "AssignedDriver",
            attributes: ["id", "first_name"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  console.log(
    "Fetched month filtered earnings:",
    rows.map((e) => earningsResponseDTO(e))
  ); // Debug log
  return {
    earningsList: rows.map((earnings) => earningsResponseDTO(earnings)),
    total: count,
  };
};

// const getEarningsSum = async (conditions = {}) => {
//   const amount = await Earnings.sum("amount", conditions);
//   return amount || 0;
// };

const getEarningsSum = async (conditions = {}) => {
  const where = {};

  if (conditions.driver_id) {
    where.driver_id = conditions.driver_id;
  }

  if (conditions.status) {
    where.status = conditions.status;
  } else {
    where.status = "completed"; // default status
  }

  if (conditions.updatedAt) {
    where.updatedAt = conditions.updatedAt; // e.g., { [Op.between]: [start, end] }
  }

  const amount = await Earnings.sum("amount", { where });
  return amount || 0;
};

const getPendingPayouts = async (where = {}) => {
  const amount = await Earnings.sum("amount", { where });
  return amount || 0;
};

const getTotalCommission = async (where = {}) => {
  const commission = await Earnings.sum("commission", { where });
  return commission || 0;
};

const singleEarnings = async (id, signal) => {
  if (signal?.aborted) throw new Error("Operation aborted");
  const result = await Earnings.findOne({
    where: { id },
    include: [
      {
        model: Ride,
        as: "Ride",
        include: [
          {
            model: Car,
            as: "Car",
            attributes: ["id", "brand", "model"],
          },
          {
            model: Driver,
            as: "AssignedDriver",
            attributes: ["id", "first_name"],
          },
        ],
      },
    ],
  });
  if (!result) throw new Error("Earnings not found");
  if (signal?.aborted) throw new Error("Operation aborted after query");
  console.log(
    "Fetched single earning:",
    result ? earningsResponseDTO(result) : null
  ); // Debug log
  return result;
};

const allEarnings = async (dateRange = {}, search = "", signal) => {
  if (signal?.aborted) throw new Error("Operation aborted");
  const where = { ...dateRange };

  if (search) {
    where[Op.or] = [
      { "$Ride.customer_name$": { [Op.like]: `%${search}%` } },
      { "$Ride.email$": { [Op.like]: `%${search}%` } },
      { "$Ride.phone$": { [Op.like]: `%${search}%` } },
      { ride_id: { [Op.like]: `%${search}%` } },
      { "$Ride.Driver.name$": { [Op.like]: `%${search}%` } }, // Added search by driver name
    ];
  }

  const result = await Earnings.findAll({
    where,
    include: [
      {
        model: Ride,
        as: "Ride",
        include: [
          {
            model: Car,
            as: "Car",
            attributes: ["id", "brand", "model"],
          },
          {
            model: Driver,
            as: "AssignedDriver",
            attributes: ["id", "first_name"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
  console.log(
    "Fetched all earnings:",
    result.map((e) => earningsResponseDTO(e))
  ); // Debug log
  if (signal?.aborted) throw new Error("Operation aborted after query");
  return result;
};

const generateExcel = async (earnings, signal) => {
  if (signal?.aborted) throw new Error("Operation aborted before Excel gen");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Earnings Report");

  worksheet.columns = [
    { header: "Earning ID", key: "id", width: 36 },
    { header: "Driver ID", key: "driver_id", width: 36 },
    { header: "Driver Name", key: "driver_name", width: 20 }, // Added Driver Name column
    { header: "Ride ID", key: "ride_id", width: 36 },
    { header: "Amount (AED)", key: "amount", width: 15 },
    { header: "Commission (AED)", key: "commission", width: 15 },
    { header: "Percentage", key: "percentage", width: 15 },
    { header: "Payment Method", key: "payment_method", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Created At", key: "createdAt", width: 25 },
    { header: "Customer Name", key: "customer_name", width: 20 },
    { header: "Customer Email", key: "customer_email", width: 25 },
    { header: "Customer Phone", key: "customer_phone", width: 15 },
    { header: "Pickup Address", key: "pickup_address", width: 30 },
    { header: "Pickup Location", key: "pickup_location", width: 30 },
    { header: "Drop Address", key: "drop_address", width: 30 },
    { header: "Drop Location", key: "drop_location", width: 30 },
    { header: "Car Brand", key: "car_brand", width: 15 },
    { header: "Car Model", key: "car_model", width: 15 },
    { header: "Ride Type", key: "ride_type", width: 15 },
    { header: "Pickup Time", key: "pickup_time", width: 25 },
    { header: "Dropoff Time", key: "dropoff_time", width: 25 },
    { header: "Rider Hours", key: "rider_hours", width: 15 },
    { header: "Price (AED)", key: "price", width: 15 },
    { header: "Total (AED)", key: "total", width: 15 },
  ];

  const rows = Array.isArray(earnings) ? earnings : [earnings];

  for (const e of rows) {
    if (signal?.aborted) throw new Error("Aborted during Excel row gen");
    worksheet.addRow({
      id: e.id,
      driver_id: e.driver_id,
      driver_name: e.Ride?.AssignedDriver?.first_name || "N/A", // Added driver_name
      ride_id: e.ride_id,
      amount: parseFloat(e.amount),
      commission: parseFloat(e.commission),
      percentage: parseFloat(e.percentage),
      payment_method: e.payment_method
        ? e.payment_method.replace("_", " ").toUpperCase()
        : "N/A",
      status: e.status,
      createdAt: e.createdAt ? new Date(e.createdAt).toLocaleString() : "N/A",
      customer_name: e.Ride?.customer_name || "N/A",
      customer_email: e.Ride?.email || "N/A",
      customer_phone: e.Ride?.phone || "N/A",
      pickup_address: e.Ride?.pickup_address || "N/A",
      pickup_location: e.Ride?.pickup_location
        ? JSON.stringify(e.Ride.pickup_location)
        : "N/A",
      drop_address: e.Ride?.drop_address || "N/A",
      drop_location: e.Ride?.drop_location
        ? JSON.stringify(e.Ride.drop_location)
        : "N/A",
      car_brand: e.Ride?.Car?.brand || "N/A",
      car_model: e.Ride?.Car?.model || "N/A",
      ride_type: e.Ride?.ride_type || "N/A",
      pickup_time: e.Ride?.pickup_time
        ? new Date(e.Ride.pickup_time).toLocaleString()
        : "N/A",
      dropoff_time: e.Ride?.dropoff_time
        ? new Date(e.Ride.dropoff_time).toLocaleString()
        : "N/A",
      rider_hours: e.Ride?.rider_hours || "N/A",
      price: e.Ride?.Price ? parseFloat(e.Ride.Price) : "N/A",
      total: e.Ride?.Total ? parseFloat(e.Ride.Total) : "N/A",
    });
  }

  if (signal?.aborted) throw new Error("Aborted before writing buffer");
  console.log("Generated Excel with rows:", rows.length); // Debug log
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
  generateExcel,
};
