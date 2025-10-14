const Ride = require("../models/ride.model");
const Driver = require("../models/driver.model");
const Car = require("../models/cars.model");
const Package = require("../models/package.model");
const SubPackage = require("../models/sub-package.model"); //Assuming SubPackage model exists
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");

const getAllRides = async (search = "", status = "", page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { customer_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { pickup_address: { [Op.like]: `%${search}%` } },
      { drop_address: { [Op.like]: `%${search}%` } },
      { ride_code: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  try {
    const { count, rows } = await Ride.findAndCountAll({
      where,
      include: [
        {
          model: Driver,
          as: "AssignedDriver",
          attributes: ["first_name", "last_name"],
        },
        {
          model: Car,
          as: "Car",
          attributes: ["model"],
        },
        {
          model: Package,
          as: "Package",
          attributes: ["name"],
        },
        {
          model: SubPackage,
          as: "SubPackage",
          attributes: ["name"],
        },
      ],
      limit,
      offset,
    });

    return {
      rides: rows,
      counts: {
        totalRides: count,
        pending: await Ride.count({ where: { status: "pending" } }),
        accepted: await Ride.count({ where: { status: "accepted" } }),
        onRoute: await Ride.count({ where: { status: "on-route" } }),
        completed: await Ride.count({ where: { status: "completed" } }),
        cancelled: await Ride.count({ where: { status: "cancelled" } }),
        totalRevenue:
          (await Ride.sum("Total", { where: { status: "completed" } })) || 0,
      },
    };
  } catch (error) {
    console.log(error, "error in getAllRides");
    throw new Error("Failed to fetch rides: " + error.message);
  }
};

const getRideById = async (rideId) => {
  try {
    const ride = await Ride.findByPk(rideId, {
      include: [
        {
          model: Driver,
          as: "AssignedDriver",
          attributes: ["first_name", "last_name"],
        },
        {
          model: Car,
          as: "Car",
          attributes: ["model"],
        },
        {
          model: Package,
          as: "Package",
          attributes: ["name"],
        },
        {
          model: SubPackage,
          as: "SubPackage",
          attributes: ["name"],
        },
      ],
    });
    if (!ride) {
      throw new Error("Ride not found");
    }
    return ride;
  } catch (error) {
    console.log(error, "error in getRideById");
    throw new Error("Failed to fetch ride: " + error.message);
  }
};

// const formatDateTimeExcel = (dateStr) => {
//   if (!dateStr) return "-";
//   const date = new Date(dateStr);

//   const day = String(date.getDate()).padStart(2, "0");
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const year = String(date.getFullYear()).slice(-2);

//   // ✅ Ensure 24-hour time format
//   const hours = String(date.getHours()).padStart(2, "0");
//   const minutes = String(date.getMinutes()).padStart(2, "0");

//   return `${day}/${month}/${year} ${hours}:${minutes}`;
// };

const exportAllRides = async (search = "", status = "") => {
  const where = {};

  if (search) {
    where[Op.or] = [
      { customer_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { pickup_address: { [Op.like]: `%${search}%` } },
      { drop_address: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  try {
    const rides = await Ride.findAll({
      where,
      include: [
        {
          model: Driver,
          as: "AssignedDriver",
          attributes: ["first_name", "last_name"],
        },
        {
          model: Car,
          as: "Car",
          attributes: ["model"],
        },
        {
          model: Package,
          as: "Package",
          attributes: ["name"],
        },
        {
          model: SubPackage,
          as: "SubPackage",
          attributes: ["name"],
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rides");

    worksheet.columns = [
      { header: "Ride ID", key: "id", width: 36 },
      { header: "Customer Name", key: "customer_name", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Pickup Address", key: "pickup_address", width: 30 },
      { header: "Drop Address", key: "drop_address", width: 30 },
      // { header: "Ride Date", key: "ride_date", width: 20 },
      { header: "Scheduled Time", key: "scheduled_time", width: 20 },
      { header: "Driver Name", key: "driver_name", width: 20 },
      { header: "Vehicle Model", key: "vehicle_model", width: 20 },
      { header: "Package Name", key: "package_name", width: 20 },
      { header: "Subpackage Name", key: "subpackage_name", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Price", key: "Price", width: 10 },
      { header: "Total", key: "Total", width: 10 },
    ];

    rides.forEach((ride) => {
      worksheet.addRow({
        id: ride.ride_code || "-",
        customer_name: ride.customer_name || "-",
        email: ride.email || "-",
        phone: ride.phone || "-",
        pickup_address: ride.pickup_address || "-",
        drop_address: ride.drop_address || "-",
        // rideDate: formatDateTimeExcel(ride.ride_date)||"-",
        scheduled_time: ride.scheduled_time || "-",
        driver_name: ride.AssignedDriver
          ? `${ride.AssignedDriver.first_name} ${ride.AssignedDriver.last_name}`
          : "-",
        vehicle_model: ride.Car ? ride.Car.model : "-",
        package_name: ride.Package ? ride.Package.name : "-",
        subpackage_name: ride.SubPackage ? ride.SubPackage.name : "-",
        status: ride.status || "-",
        Price: ride.Price || 0,
        Total: ride.Total || 0,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.log(error, "error in exportAllRides");
    throw new Error("Failed to export rides: " + error.message);
  }
};

const exportRideById = async (rideId) => {
  try {
    const ride = await getRideById(rideId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ride");

    worksheet.columns = [
      { header: "Ride ID", key: "id", width: 36 },
      { header: "Customer Name", key: "customer_name", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Pickup Address", key: "pickup_address", width: 30 },
      { header: "Drop Address", key: "drop_address", width: 30 },
      // { header: "Ride Date", key: "ride_date", width: 20 },
      { header: "Scheduled Time", key: "scheduled_time", width: 20 },
      { header: "Driver Name", key: "driver_name", width: 20 },
      { header: "Vehicle Model", key: "vehicle_model", width: 20 },
      { header: "Package Name", key: "package_name", width: 20 },
      { header: "Subpackage Name", key: "subpackage_name", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Price", key: "Price", width: 10 },
      { header: "Total", key: "Total", width: 10 },
    ];

    worksheet.addRow({
      id: ride.ride_code || "-",
      customer_name: ride.customer_name || "-",
      email: ride.email || "-",
      phone: ride.phone || "-",
      pickup_address: ride.pickup_address || "-",
      drop_address: ride.drop_address || "-",
      // ride_date: formatDateTimeExcel(ride.ride_date)||"-",
      scheduled_time: ride.scheduled_time || "-",
      driver_name: ride.AssignedDriver
        ? `${ride.AssignedDriver.first_name} ${ride.AssignedDriver.last_name}`
        : "-",
      vehicle_model: ride.Car ? ride.Car.model : "-",
      package_name: ride.Package ? ride.Package.name : "-",
      subpackage_name: ride.SubPackage ? ride.SubPackage.name : "-",
      status: ride.status || "-",
      Price: ride.Price || 0,
      Total: ride.Total || 0,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.log(error, "error in exportRideById");
    throw new Error("Failed to export ride: " + error.message);
  }
};

module.exports = {
  getAllRides,
  getRideById,
  exportAllRides,
  exportRideById,
};
