const { Op } = require("sequelize");
const { fn, col, where: sequelizeWhere } = require("sequelize");
const Ride = require("../models/ride.model");
const PackagePrice = require("../models/packageprice.model");
const Package = require("../models/package.model");
const SubPackage = require("../models/sub-package.model");
const Car = require("../models/cars.model");
const Earnings = require("../models/earnings.model");
const Settings = require("../models/settings.model");
const { generateRideCode } = require("../utils/generateCode");
// Response DTO
const rideResponseDTO = (ride) => ({
  id: ride.id,
  ride_code: ride.ride_code,
  customer_name: ride.customer_name,
  phone: ride.phone,
  email: ride.email,
  pickup_address: ride.pickup_address,
  drop_address: ride.drop_address,
  pickup_location: ride.pickup_location,
  drop_location: ride.drop_location,
  // ride_date: ride.ride_date,
  car_id: ride.car_id,
  package_id: ride.package_id,
  subpackage_id: ride.subpackage_id,
  scheduled_time: ride.scheduled_time,
  driver_id: ride.driver_id,
  initiated_by_driver_id: ride.initiated_by_driver_id,
  status: ride.status,
  notes: ride.notes,
  Price: ride.Price,
  tax: ride.tax,
  Total: ride.Total,
  payment_status: ride.payment_status,
  accept_time: ride.accept_time,
  pickup_time: ride.pickup_time,
  dropoff_time: ride.dropoff_time,
  rider_hours: ride.rider_hours,
  createdAt: ride.createdAt,
  updatedAt: ride.updatedAt,
});

// Check if sub-package is 1-hour (based on name or ID logic)
const isOneHourSubPackage = (subPackage) => {
  // Assuming sub-package name contains "1 Hour" or similar; adjust logic based on your data
  return subPackage.name.toLowerCase().includes("1 hour");
};

// Create a new ride
const createRide = async (data) => {
  const transaction = await Ride.sequelize.transaction();
  try {
    console.log("createRide data:", data);

    // Validate required fields
    if (!data.package_id || !data.subpackage_id || !data.car_id) {
      throw new Error(
        "Missing required fields: package_id, subpackage_id, or car_id"
      );
    }
    if (
      !data.customer_name ||
      !data.phone ||
      !data.pickup_location ||
      !data.drop_location
    ) {
      throw new Error(
        "Missing required fields: customer_name, phone, pickup_location, or drop_location"
      );
    }

    // Validate date formats
    const scheduledTime = data.scheduled_time
      ? new Date(data.scheduled_time)
      : null;
    if (scheduledTime && isNaN(scheduledTime.getTime())) {
      throw new Error(
        "Invalid scheduled_time: Must be a valid ISO datetime string"
      );
    }

    // Validate package exists
    const packageExists = await Package.findByPk(data.package_id, {
      transaction,
    });
    if (!packageExists) {
      throw new Error("Invalid package_id: Package does not exist");
    }

    // Validate sub-package exists and belongs to the package
    const subPackage = await SubPackage.findOne({
      where: {
        id: data.subpackage_id,
        package_id: data.package_id,
      },
      transaction,
    });
    if (!subPackage) {
      throw new Error(
        "Invalid subpackage_id: Sub-package does not exist or does not belong to the selected package"
      );
    }

    // Validate car exists
    const car = await Car.findByPk(data.car_id, { transaction });
    if (!car) {
      throw new Error("Invalid car_id: Car does not exist");
    }

    // Validate package, sub-package, and car combination and fetch price
    const packagePrice = await PackagePrice.findOne({
      where: {
        package_id: data.package_id,
        sub_package_id: data.subpackage_id,
        car_id: data.car_id,
      },
      transaction,
    });
    if (!packagePrice) {
      throw new Error("Invalid package, sub-package, or car combination");
    }

    // Fetch tax rate from Settings
    const settings = await Settings.findOne({ transaction });
    const taxRate = settings ? parseFloat(settings.tax_rate) || 18 : 0;

    // Ensure the provided price matches the package price
    const baseFare = parseFloat(packagePrice.base_fare);
    if (data.Price && parseFloat(data.Price) !== baseFare) {
      throw new Error(
        `Invalid price: Provided price (${data.Price}) does not match the base fare (${baseFare})`
      );
    }

    // Calculate Total and Tax
    const riderHours = isOneHourSubPackage(subPackage)
      ? data.rider_hours || 1
      : 1;
    const subtotal = isOneHourSubPackage(subPackage)
      ? baseFare * riderHours
      : baseFare;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const ride_code = generateRideCode();
    const ride = await Ride.create(
      {
        ride_code,
        customer_name: data.customer_name,
        phone: data.phone,
        email: data.email,
        pickup_address: data.pickup_address,
        drop_address: data.drop_address,
        pickup_location: data.pickup_location,
        drop_location: data.drop_location,
        car_id: data.car_id,
        package_id: data.package_id,
        subpackage_id: data.subpackage_id,
        scheduled_time: scheduledTime
          ? `${scheduledTime.getFullYear()}-${String(scheduledTime.getMonth() + 1).padStart(2, "0")}-${String(scheduledTime.getDate()).padStart(2, "0")}T${String(scheduledTime.getHours()).padStart(2, "0")}:${String(scheduledTime.getMinutes()).padStart(2, "0")}:${String(scheduledTime.getSeconds()).padStart(2, "0")}`
          : null,

        notes: data.notes,
        Price: baseFare,
        tax: Number(tax.toFixed(2)), // Store tax amount
        Total: Number(total.toFixed(2)), // Store total with tax
        rider_hours: riderHours,
        status: data.status || "pending",
        payment_status: data.payment_status || "pending",
        accept_time: data.accept_time || new Date().toISOString(),
      },
      { transaction }
    );

    await transaction.commit();
    return { data: rideResponseDTO(ride) };
  } catch (error) {
    await transaction.rollback();
    console.error("createRide error:", error);
    throw error;
  }
};

// Update a ride
const updateRide = async (id, data) => {
  const transaction = await Ride.sequelize.transaction();
  try {
    console.log("updateRide data:", { id, data });
    const ride = await Ride.findByPk(id, { transaction });
    if (!ride) throw new Error("Ride not found with the given ID");

    // Validate date formats if provided
    let scheduledTime = ride.scheduled_time;
    if (data.scheduled_time) {
      scheduledTime = new Date(data.scheduled_time);
      if (isNaN(scheduledTime.getTime())) {
        throw new Error(
          "Invalid scheduled_time: Must be a valid ISO datetime string"
        );
      }
      scheduledTime = `${scheduledTime.getFullYear()}-${String(scheduledTime.getMonth() + 1).padStart(2, "0")}-${String(scheduledTime.getDate()).padStart(2, "0")}T${String(scheduledTime.getHours()).padStart(2, "0")}:${String(scheduledTime.getMinutes()).padStart(2, "0")}:${String(scheduledTime.getSeconds()).padStart(2, "0")}`;
    }

    // ✅ force numeric types right away
    let baseFare = Number(ride.Price);
    let tax = Number(ride.tax);
    let total = Number(ride.Total);
    let riderHours = ride.rider_hours;

    // Validate package, sub-package, and car combination if provided
    if (data.package_id && data.subpackage_id && data.car_id) {
      // Validate package exists
      const packageExists = await Package.findByPk(data.package_id, {
        transaction,
      });
      if (!packageExists) {
        throw new Error("Invalid package_id: Package does not exist");
      }

      // Validate sub-package exists and belongs to the package
      const subPackage = await SubPackage.findOne({
        where: {
          id: data.subpackage_id,
          package_id: data.package_id,
        },
        transaction,
      });
      if (!subPackage) {
        throw new Error(
          "Invalid subpackage_id: Sub-package does not exist or does not belong to the selected package"
        );
      }

      // Validate car exists
      const car = await Car.findByPk(data.car_id, { transaction });
      if (!car) {
        throw new Error("Invalid car_id: Car does not exist");
      }

      // Validate package, sub-package, and car combination and fetch price
      const packagePrice = await PackagePrice.findOne({
        where: {
          package_id: data.package_id,
          sub_package_id: data.subpackage_id,
          car_id: data.car_id,
        },
        transaction,
      });
      if (!packagePrice) {
        throw new Error("Invalid package, sub-package, or car combination");
      }

      // Fetch tax rate from Settings
      const settings = await Settings.findOne({ transaction });
      const taxRate = settings ? parseFloat(settings.tax_rate) || 0 : 0;

      // Ensure the provided price matches the package price
      baseFare = parseFloat(packagePrice.base_fare);
      if (data.Price && parseFloat(data.Price) !== baseFare) {
        throw new Error(
          `Invalid price: Provided price (${data.Price}) does not match the base fare (${baseFare})`
        );
      }

      riderHours = isOneHourSubPackage(subPackage)
        ? data.rider_hours || ride.rider_hours || 1
        : 1;
      const subtotal = isOneHourSubPackage(subPackage)
        ? baseFare * riderHours
        : baseFare;
      tax = subtotal * (taxRate / 100);
      total = subtotal + tax;
    }

    await ride.update(
      {
        customer_name: data.customer_name || ride.customer_name,
        phone: data.phone || ride.phone,
        email: data.email || ride.email,
        pickup_address: data.pickup_address || ride.pickup_address,
        drop_address: data.drop_address || ride.drop_address,
        pickup_location: data.pickup_location || ride.pickup_location,
        drop_location: data.drop_location || ride.drop_location,
        car_id: data.car_id || ride.car_id,
        package_id: data.package_id || ride.package_id,
        subpackage_id: data.subpackage_id || ride.subpackage_id,
        scheduled_time: scheduledTime,
        notes: data.notes || ride.notes,
        Price: baseFare,
        tax: Number(tax).toFixed(2), // ✅ always number before toFixed
        Total: Number(total).toFixed(2), // ✅ always number before toFixed
        rider_hours: riderHours,
        status: data.status || ride.status,
        payment_status: data.payment_status || ride.payment_status,
        accept_time: data.accept_time || ride.accept_time,
      },
      { transaction }
    );

    await transaction.commit();
    return { data: rideResponseDTO(ride) };
  } catch (error) {
    await transaction.rollback();
    console.error("updateRide error:", error);
    throw error;
  }
};

// Get available cars and prices for a package and sub-package
const getAvailableCarsAndPrices = async (package_id, sub_package_id) => {
  try {
    console.log("getAvailableCarsAndPrices query:", {
      package_id,
      sub_package_id,
    });

    // Validate package exists
    const packageExists = await Package.findByPk(package_id);
    if (!packageExists) {
      throw new Error("Invalid package_id: Package does not exist");
    }

    // Validate sub-package exists and belongs to the package
    const subPackage = await SubPackage.findOne({
      where: {
        status: true,
        id: sub_package_id,
        package_id,
      },
    });
    if (!subPackage) {
      throw new Error(
        "Invalid subpackage_id: Sub-package does not exist or does not belong to the selected package"
      );
    }

    // Fetch package prices with associated cars
    const packagePrices = await PackagePrice.findAll({
      where: {
        status: true,
        package_id,
        sub_package_id,
      },
      include: [
        {
          model: Car,
          as: "Car",
          attributes: ["id", "brand", "model", "image_url"],
        },
      ],
    });

    if (!packagePrices.length) {
      throw new Error(
        "No cars available for this package and sub-package combination"
      );
    }

    const result = packagePrices.map((pp) => ({
      car_id: pp.car_id,
      car_model: pp.Car
        ? `${pp.Car.brand} ${pp.Car.model}`.trim()
        : `${pp.car_id} (Unknown)`,
      base_fare: pp.base_fare,
    }));

    return { data: result };
  } catch (error) {
    console.error("getAvailableCarsAndPrices error:", error);
    throw error;
  }
};

// Get all rides with filters
const getAllRides = async ({
  search = "",
  status = "",
  limit = "10",
  page = "1",
  sortBy = "createdAt",
  sortOrder = "DESC",
}) => {
  try {
    console.log("getAllRides query:", {
      search,
      status,
      limit,
      page,
      sortBy,
      sortOrder,
    });

    // Validate query parameters
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new Error("Invalid limit parameter");
    }
    if (isNaN(parsedPage) || parsedPage <= 0) {
      throw new Error("Invalid page parameter");
    }
    const validStatuses = [
      "all",
      "pending",
      "accepted",
      "on-route",
      "completed",
      "cancelled",
    ];
    if (status && !validStatuses.includes(status)) {
      throw new Error(
        `Invalid status parameter. Must be one of: ${validStatuses.join(", ")}`
      );
    }
    const validSortFields = [
      "createdAt",
      "ride_date",
      "Price",
      "Total",
      "status",
    ];
    if (!validSortFields.includes(sortBy)) {
      throw new Error(
        `Invalid sortBy parameter. Must be one of: ${validSortFields.join(", ")}`
      );
    }
    const validSortOrders = ["ASC", "DESC"];
    if (!validSortOrders.includes(sortOrder.toUpperCase())) {
      throw new Error(
        `Invalid sortOrder parameter. Must be one of: ${validSortOrders.join(", ")}`
      );
    }

    const where = {};
    if (search) {
      const trimmedSearch = search.trim();

      where[Op.or] = [
        { customer_name: { [Op.like]: `%${trimmedSearch}%` } },
        { pickup_location: { [Op.like]: `%${trimmedSearch}%` } },
        { drop_location: { [Op.like]: `%${trimmedSearch}%` } },
        { pickup_address: { [Op.like]: `%${trimmedSearch}%` } },
        { drop_address: { [Op.like]: `%${trimmedSearch}%` } },
        { phone: { [Op.like]: `%${trimmedSearch}%` } },
        { email: { [Op.like]: `%${trimmedSearch}%` } },
        { "$Car.brand$": { [Op.like]: `%${trimmedSearch}%` } },
        { "$Car.model$": { [Op.like]: `%${trimmedSearch}%` } },
        sequelizeWhere(fn("REPLACE", col("customer_name"), " ", ""), {
          [Op.like]: `%${trimmedSearch.replace(/\s+/g, "")}%`,
        }),
        sequelizeWhere(fn("REPLACE", col("pickup_address"), " ", ""), {
          [Op.like]: `%${trimmedSearch.replace(/\s+/g, "")}%`,
        }),
        sequelizeWhere(fn("REPLACE", col("drop_address"), " ", ""), {
          [Op.like]: `%${trimmedSearch.replace(/\s+/g, "")}%`,
        }),
        sequelizeWhere(fn("DATE_FORMAT", col("scheduled_time"), "%d-%m-%Y"), {
          [Op.like]: `%${trimmedSearch}%`,
        }),
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const offset = (parsedPage - 1) * parsedLimit;

    const { rows, count } = await Ride.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parsedLimit,
      offset,
      include: [
        { model: Package, as: "Package", attributes: ["id", "name"] },
        { model: SubPackage, as: "SubPackage", attributes: ["id", "name"] },
        { model: Car, as: "Car", attributes: ["id", "brand", "model"] },
      ],
    });

    // Calculate summary
    const counts = await Ride.findAll({
      attributes: [
        "status",
        [Ride.sequelize.fn("COUNT", Ride.sequelize.col("id")), "count"],
        [Ride.sequelize.fn("SUM", Ride.sequelize.col("Total")), "totalRevenue"],
      ],
      group: ["status"],
      raw: true,
    });

    const summary = {
      totalRides: count,
      pending: 0,
      accepted: 0,
      onRoute: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    counts.forEach((c) => {
      if (c.status === "pending") summary.pending = Number(c.count);
      if (c.status === "accepted") summary.accepted = Number(c.count);
      if (c.status === "on-route") summary.onRoute = Number(c.count);
      if (c.status === "completed") summary.completed = Number(c.count);
      if (c.status === "cancelled") summary.cancelled = Number(c.count);
      summary.totalRevenue += parseFloat(c.totalRevenue || 0);
    });

    return {
      data: {
        rides: rows.map((ride) => ({
          ...rideResponseDTO(ride),
          package_name: ride.Package ? ride.Package.name : null,
          subpackage_name: ride.SubPackage ? ride.SubPackage.name : null,
          car_name: ride.Car
            ? `${ride.Car.brand} ${ride.Car.model}`.trim()
            : null,
        })),
        counts: summary,
      },
    };
  } catch (error) {
    console.error("getAllRides error:", error);
    throw error;
  }
};

// Get ride by ID
const getRideById = async (id, transaction = null, lock = null) => {
  try {
    console.log("getRideById id:", id);
    const ride = await Ride.findByPk(id, {
      include: [
        { model: Package, as: "Package", attributes: ["id", "name"] },
        { model: SubPackage, as: "SubPackage", attributes: ["id", "name"] },
        { model: Car, as: "Car", attributes: ["id", "brand", "model"] },
      ],
      transaction,
      lock,
    });
    if (!ride) throw new Error("Ride not found with the given ID");
    return {
      ride, // Return the raw Sequelize model for updates
      data: {
        ...rideResponseDTO(ride),
        package_name: ride.Package ? ride.Package.name : null,
        subpackage_name: ride.SubPackage ? ride.SubPackage.name : null,
        car_name: ride.Car
          ? `${ride.Car.brand} ${ride.Car.model}`.trim()
          : null,
      },
    };
  } catch (error) {
    console.error("getRideById error:", error);
    throw error;
  }
};

const conditionalRides = async (options = {}) => {
  return Ride.findAll(options);
};

const acceptedRides = async (where = {}) => {
  return await Ride.findAll({ where });
};

const getRideByIdData = async (driver_id, ride_id) => {
  const ride = await Ride.findOne({
    where: {
      id: ride_id,
      [Op.or]: [
        { driver_id: driver_id },
        { initiated_by_driver_id: driver_id },
      ],
    },
    // attributes: ["customer_name", "pickup_location", "drop_location", "status"],
    include: [
      {
        model: Package,
        as: "Package",
        include: [
          {
            model: SubPackage,
            as: "PackageRates",
          },
        ],
      },
      {
        model: Earnings,
        as: "Earnings",
        attributes: ["amount", "commission", "percentage"],
      },
    ],
  });
  if (!ride) {
    throw new Error("Ride not found");
  }
  return ride;
};

const getRidesByStatusAndDriver = async (status, driverId) => {
  try {
    const where = { driver_id: driverId };
    if (status && status !== "all") {
      if (status === "accepted") {
        // Show both "accepted" and "on-route" rides
        where.status = { [Op.or]: ["accepted", "on-route"] };
      } else if (status === "cancelled") {
        where.status = "cancelled";
      } else {
        where.status = status;
      }
    }

    // Fetch rides from DB
    const rides = await Ride.findAll({
      where,
      order: [["createdAt", "DESC"]], // temporary order
      include: [
        { model: Package, as: "Package", attributes: ["id", "name"] },
        { model: SubPackage, as: "SubPackage", attributes: ["id", "name"] },
        { model: Car, as: "Car", attributes: ["id", "model"] },
      ],
    });

    // Convert Sequelize instances to plain objects and scheduled_time to Date
    const ridesWithDates = rides.map((ride) => {
      const rideObj = ride.get({ plain: true });
      rideObj.scheduled_time = rideObj.scheduled_time
        ? new Date(rideObj.scheduled_time)
        : null;
      return rideObj;
    });

    // If accepted/on-route, sort by scheduled_time ascending
    if (status === "accepted") {
      return ridesWithDates
        .filter((ride) => ride.scheduled_time) // only rides with scheduled_time
        .sort((a, b) => a.scheduled_time - b.scheduled_time)
        .map((ride) => ({
          ...rideResponseDTO(ride),
          package_name: ride.Package ? ride.Package.name : null,
          subpackage_name: ride.SubPackage ? ride.SubPackage.name : null,
          car_name: ride.Car ? ride.Car.model : null,
        }));
    }

    // For other statuses, keep createdAt descending
    return ridesWithDates
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((ride) => ({
        ...rideResponseDTO(ride),
        package_name: ride.Package ? ride.Package.name : null,
        subpackage_name: ride.SubPackage ? ride.SubPackage.name : null,
        car_name: ride.Car ? ride.Car.model : null,
      }));
  } catch (error) {
    console.error("getRidesByStatusAndDriver error:", error);
    throw error;
  }
};

module.exports = {
  createRide,
  updateRide,
  getAllRides,
  getRideById,
  getAvailableCarsAndPrices,
  conditionalRides,
  acceptedRides,
  getRideByIdData,
  getRidesByStatusAndDriver,
};
