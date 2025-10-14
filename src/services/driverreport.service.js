const Driver = require("../models/driver.model");
const DriverCar = require("../models/driver-cars.model");
const Car = require("../models/cars.model"); //Added: Assume this exists for vehicle name
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");

const getAllDrivers = async (
  search = "",
  status = "",
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { first_name: { [Op.like]: `%${search}%` } },
      { last_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  try {
    const { count, rows } = await Driver.findAndCountAll({
      where,
      include: [
        {
          model: DriverCar,
          as: "Vehicles",
          include: [{ model: Car, as: "Car", attributes: ["model"] }], // Added: Nested include for car model
          attributes: ["id", "color", "license_plate", "status"],
        },
      ],
      limit,
      offset,
    });

    return {
      drivers: rows,
      counts: {
        totalDrivers: count,
        active: await Driver.count({ where: { status: "active" } }),
        inactive: await Driver.count({ where: { status: "inactive" } }),
        blocked: await Driver.count({ where: { status: "blocked" } }),
        rejected: await Driver.count({ where: { status: "rejected" } }),
      },
    };
  } catch (error) {
    console.log(error, "error in getAllDrivers");
    throw new Error("Failed to fetch drivers: " + error.message);
  }
};

const getDriverById = async (driverId) => {
  try {
    const driver = await Driver.findByPk(driverId, {
      include: [
        {
          model: DriverCar,
          as: "Vehicles",
          include: [{ model: Car, as: "Car", attributes: ["model"] }], // Added: Nested include for car model
          attributes: [
            "id",
            "color",
            "license_plate",
            "status",
            "car_photos",
            "rc_doc",
            "insurance_doc",
          ],
        },
      ],
    });
    if (!driver) {
      throw new Error("Driver not found");
    }
    return driver;
  } catch (error) {
    console.log(error, "error in getDriverById");
    throw new Error("Failed to fetch driver: " + error.message);
  }
};

const exportAllDrivers = async (search = "", status = "") => {
  const where = {};

  if (search) {
    where[Op.or] = [
      { first_name: { [Op.like]: `%${search}%` } },
      { last_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  try {
    const drivers = await Driver.findAll({
      where,
      include: [
        {
          model: DriverCar,
          as: "Vehicles",
          include: [{ model: Car, as: "Car", attributes: ["model"] }], // Added: Nested include for car model
          attributes: ["license_plate", "color", "status"],
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Drivers");

    worksheet.columns = [
      { header: "Driver ID", key: "id", width: 36 },
      { header: "First Name", key: "first_name", width: 15 },
      { header: "Last Name", key: "last_name", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Status", key: "status", width: 10 },
      { header: "Vehicles", key: "vehicles", width: 50 }, // Fixed: Key name for consistency
    ];

    drivers.forEach((driver) => {
      worksheet.addRow({
        id: driver.id ? driver.id.split("-")[0] : "-",
        first_name: driver.first_name || "-",
        last_name: driver.last_name || "-",
        email: driver.email || "-",
        phone: driver.phone || "-",
        status: driver.status || "-",
        vehicles: driver.Vehicles.map(
          // Fixed: driver.Vehicles instead of driver.cars
          (car) =>
            `Name: ${car.Car?.model || "-"}, License: ${car.license_plate}, Color: ${car.color || "-"}, Status: ${car.status}`
        ).join("; "),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.log(error, "error in exportAllDrivers");
    throw new Error("Failed to export drivers: " + error.message);
  }
};

const exportDriverById = async (driverId) => {
  try {
    const driver = await getDriverById(driverId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Driver");

    worksheet.columns = [
      { header: "Driver ID", key: "id", width: 36 },
      { header: "First Name", key: "first_name", width: 15 },
      { header: "Last Name", key: "last_name", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Status", key: "status", width: 10 },
      { header: "Vehicles", key: "vehicles", width: 50 }, // Fixed: Key name for consistency
    ];

    worksheet.addRow({
      id: driver.id ? driver.id.split("-")[0] : "-",
      first_name: driver.first_name || "-",
      last_name: driver.last_name || "-",
      email: driver.email || "-",
      phone: driver.phone || "-",
      status: driver.status || "-",
      vehicles: driver.Vehicles.map(
        // Fixed: driver.Vehicles instead of driver.cars
        (car) =>
          `Name: ${car.Car?.model || "-"}, License: ${car.license_plate}, Color: ${car.color || "-"}, Status: ${car.status}`
      ).join("; "),
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.log(error, "error in exportDriverById");
    throw new Error("Failed to export driver: " + error.message);
  }
};

module.exports = {
  getAllDrivers,
  getDriverById,
  exportAllDrivers,
  exportDriverById,
};
