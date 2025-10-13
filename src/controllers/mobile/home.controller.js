const { Op } = require("sequelize");
const HomeService = require("../../services/home.service");
const {
  conditionalRides,
  getRideById,
  getRideByIdData,
} = require("../../services/ride.service");
const {
  getEarningsSum,
  createEarnings,
} = require("../../services/earnings.service");
const {
  driverProfileWithCar,
  getDriverById,
  updateDriverBalance,
} = require("../../services/driver.service");
const Package = require("../../models/package.model");
const SubPackage = require("../../models/sub-package.model");
const driverCarService = require("../../services/driverCar.service");
const Car = require("../../models/cars.model");
const Driver = require("../../models/driver.model");
const { Transaction } = require("sequelize");
const { sequelize } = require("../../models");
const Settings = require("../../models/settings.model");
const WalletReports = require("../../models/wallet-report.model");
const { v4: uuid } = require("uuid");
const DriverCar = require("../../models/driver-cars.model");
const { isValidStatus, isRideStatus } = require("../../helper/common");
const { createWalletReport } = require("../../services/wallet.service");

// 1. Get Dashboard/Home Data
const getAllHomeData = async (req, res) => {
  const driver_id = req.driver?.id;

  if (!driver_id) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing driver ID" });
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Get Today"s Completed Rides
    const todayRides = await conditionalRides({
      where: {
        driver_id,
        status: "completed",
        updatedAt: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });

    // 2. Get Today"s Earnings
    const todayEarnings = await getEarningsSum({
      where: {
        driver_id,
        createdAt: {
          [Op.between]: [startOfDay, endOfDay],
        },
        status: "completed",
      },
    });

    // 3. Driver profile with vehicle
    const driverProfile = await driverProfileWithCar(driver_id);
    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found",
      });
    }

    // 4. Accepted & Completed Rides
    const acceptedRides = await conditionalRides({
      where: {
        driver_id,
        status: {
          [Op.in]: ["completed", "accepted"],
        },
      },
      attributes: [
        "customer_name",
        "email",
        "phone",
        "pickup_address",
        "pickup_location",
        "initiated_by_driver_id",
        "drop_location",
        "drop_address",
        "scheduled_time",
        "pickup_time",
        "dropoff_time",
      ],
      limit: 10,
      order: [["scheduled_time", "ASC"]],
    });

    // 5. Available Rides (unassigned)
    const driverCar = await driverCarService.getDriverCarByDriverId(driver_id);
    if (!driverCar) {
      return res.status(404).json({
        success: false,
        message: "Driver has no registered car.",
      });
    }

    const availableRides = await conditionalRides({
      where: {
        driver_id: null,
        status: "pending",
      },
      attributes: [
        "id",
        "customer_name",
        "email",
        "phone",
        "pickup_address",
        "pickup_location",
        "initiated_by_driver_id",
        "drop_location",
        "drop_address",
        "scheduled_time",
        "pickup_time",
        "dropoff_time",
        "Price",
        "Total",
      ],
      include: [
        {
          model: Car,
          as: "Car", // must match Ride.belongsTo(Car, { as: "Car" })
          attributes: ["id", "brand", "model"],
          where: {
            brand: driverCar.Car?.brand,
            model: driverCar.Car?.model,
          },
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
      limit: 10,
      order: [["scheduled_time", "DESC"]],
    });

    console.log("DriverCar with Car:", JSON.stringify(driverCar, null, 2));

    return res.status(200).json({
      success: true,
      message: "Home data fetched successfully!",
      data: {
        todayRides: todayRides || [],
        todayEarnings: todayEarnings || 0,
        driverProfile: driverProfile || null,
        acceptedRides: acceptedRides || [],
        availableRides: availableRides || [],
      },
    });
  } catch (error) {
    console.error("Error fetching home data:", error.message);
    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
    });
  }
};

// 2. Accept a Ride
const acceptRide = async (req, res) => {
  const driverId = req.driver?.id;

  if (!driverId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Driver ID is required",
    });
  }

  const { ride_id } = req.body;

  if (!ride_id) {
    return res.status(400).json({
      success: false,
      message: "Ride ID are required.",
    });
  }

  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    // Fetch ride with lock
    const { ride, data } = await getRideById(ride_id, t, t.LOCK.UPDATE);
    if (!ride) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Ride not found.",
      });
    }

    console.log("Ride details:", {
      driver_id: ride.driver_id,
      status: ride.status,
    });

    // Check if ride is already accepted or not pending
    if (ride.driver_id || ride.status !== "pending") {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "Ride already accepted by another driver or not available.",
      });
    }

    // Validate driver's car model matches ride's car model (via car_id)
    const driverCar = await DriverCar.findOne({
      where: { driver_id: driverId },
      include: [{ model: Car, as: "Car", attributes: ["model"] }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!driverCar) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Driver has no associated car.",
      });
    }

    const rideCar = await Car.findByPk(ride.car_id, {
      attributes: ["model"],
      transaction: t,
    });

    if (!rideCar) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Ride's car not found.",
      });
    }

    if (driverCar.Car.model !== rideCar.model) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: `Driver's car model (${driverCar.Car.model}) does not match the ride's required model (${rideCar.model}).`,
      });
    }

    // Fetch driver wallet
    const driver = await Driver.findByPk(driverId, {
      attributes: ["id", "wallet_balance", "credit_ride_count"],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!driver) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    // Fetch min_wallet_percentage from Settings
    const setting = await Settings.findOne({
      attributes: ["min_wallet_percentage"],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    let required = 0;
    if (setting && setting.min_wallet_percentage) {
      const percentage = parseFloat(setting.min_wallet_percentage);
      required = (percentage / 100) * parseFloat(ride.Price || 0);
    }

    const balance = parseFloat(driver.wallet_balance) || 0.0;

    let isCredit = false;
    let newCount = driver.credit_ride_count || 0;
    let newBalance = balance;

    // Check wallet balance and credit ride limit
    if (balance < required) {
      if (newCount >= 3) {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: `You have exceeded the maximum of 3 credit rides. Please recharge your wallet (current balance: $${balance.toFixed(2)}, required: $${required.toFixed(2)}).`,
        });
      }
      isCredit = true;
      newCount += 1;
      // Deduct available balance for credit ride
      const amountToDebit = required - balance;
      newBalance = 0; // Deduct all available balance
      console.log(
        `Ride ${ride_id} accepted on credit. Wallet deducted: $${balance.toFixed(2)}, Remaining debit: $${amountToDebit.toFixed(2)}, Credit ride count: ${newCount}`
      );
    } else {
      // Deduct full required amount for non-credit ride
      newBalance = balance - required;
    }

    // Update ride
    await ride.update(
      {
        driver_id: driverId,
        status: "accepted",
        accept_time: new Date(),
        is_credit: isCredit,
      },
      { transaction: t }
    );

    // Update driver
    await driver.update(
      { wallet_balance: newBalance, credit_ride_count: newCount },
      { transaction: t }
    );

    // Create wallet report for credit rides
    if (isCredit) {
      const amountToDebit = required - balance;
      await WalletReports.create(
        {
          id: uuid(),
          driver_id: driverId,
          amount: -amountToDebit,
          balance_after: newBalance,
          transaction_date: new Date(),
          transaction_type: "debit",
          description: `Debit due to insufficient balance for ride ${ride_id} (wallet deducted: $${balance.toFixed(2)}, remaining debit: $${amountToDebit.toFixed(2)})`,
          // ride_id,
        },
        { transaction: t }
      );
    }

    // Commit transaction
    await t.commit();

    // Return formatted response
    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully!",
      data: {
        ...data,
        status: ride.status,
        driver_id: ride.driver_id,
        accept_time: ride.accept_time,
        is_credit: isCredit,
      },
    });
  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error("Error accepting ride:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to accept ride",
    });
  }
};

// 3. Toggle Driver Status (active/inactive)
const toggleDriverStatus = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  const { status } = req.body; // expecting "online" or "offline"

  if (!status) {
    return res.status(400).json({ message: "Driver ID and status required." });
  }

  const normalizedStatus = status.toLowerCase();
  if (!isValidStatus(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Status must be either 'online' or 'offline'.",
    });
  }

  const t = await sequelize.transaction();
  try {
    const [updated] = await Driver.update(
      { availability_status: normalizedStatus },
      { where: { id: driver_id }, transaction: t }
    );

    if (!updated) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Fetch updated driver info using getDriverById
    const updatedDriver = await getDriverById(driver_id);
    if (!updatedDriver) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    await t.commit();

    return res.status(200).json({
      success: true,
      message: `Driver status updated to ${normalizedStatus}`,
      data: updatedDriver,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error updating driver status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

//4 Get Ride Details
const getRideDetails = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
  const { ride_id } = req.params;
  if (!ride_id) {
    return res.status(400).json({
      success: false,
      message: "Ride ID is required.",
    });
  }

  try {
    const ride = await getRideByIdData(driver_id, ride_id);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found for this driver.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ride details fetched successfully",
      data: ride,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

//5 Update Ride Status (on-route or cancelled)
const updateRideStatus = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  const { ride_id } = req.params;
  if (!ride_id) {
    return res.status(400).json({
      success: false,
      message: "Ride ID is required.",
    });
  }

  const { status } = req.body;
  const normalizedStatus = status?.toLowerCase();
  console.log(normalizedStatus, "normalizedStatus");
  if (!status) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid status. Status must be one of: pending, accepted, on-route, completed, cancelled.",
    });
  }
  const validStatusesForUpdate = [
    "pending",
    "accepted",
    "on-route",
    "completed",
    "cancelled",
  ];
  if (!isRideStatus(normalizedStatus, validStatusesForUpdate)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Status must be one of: ${validStatusesForUpdate.join(", ")}.`,
    });
  }

  try {
    const ride = await getRideByIdData(driver_id, ride_id);
    if (ride.status !== "accepted") {
      throw new Error('Ride must be in "accepted" status to start or cancel');
    }

    ride.status = normalizedStatus;
    await ride.save();

    return res.status(200).json({
      success: true,
      message: `Ride status updated to "${normalizedStatus}"`,
      data: ride,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//6 Get Rides by Status (accepted, completed, cancelled)
const getRidesByStatus = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
  const { status } = req.query;
  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  const normalizedStatus = status.toLowerCase();
  const validStatusesForGet = ["accepted", "completed", "cancelled"];

  if (!isRideStatus(normalizedStatus, validStatusesForGet)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid status. Status must be either 'accepted' or 'completed' or 'cancelled'.",
    });
  }

  try {
    const rides = await HomeService.getCompletedOrCancelledAndAcceptedRides(
      driver_id,
      normalizedStatus
    );
    return res.status(200).json({
      success: true,
      message: `Rides with status "${normalizedStatus}" fetched successfully`,
      data: rides,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const upsertRide = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  try {
    const {
      id,
      customer_name,
      phone,
      email,
      car_model,
      pickup_time,
      pickup_address,
      pickup_location,
      drop_location,
      drop_address,
      scheduled_time,
      rider_hours,
      ride_type,
      accept_time,
      package_id,
      subpackage_id,
      car_id,
      Price,
      tax,
      Total,
    } = req.body;

    // Validate pickup_location and drop_location
    if (
      !pickup_location ||
      typeof pickup_location !== "object" ||
      !pickup_location.lat ||
      !pickup_location.lng
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid pickup_location format. Must be an object with lat and lng",
      });
    }

    if (
      !drop_location ||
      typeof drop_location !== "object" ||
      !drop_location.lat ||
      !drop_location.lng
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid drop_location format. Must be an object with lat and lng.",
      });
    }

    const ride = await HomeService.upsertRide({
      id,
      driver_id,
      customer_name,
      phone,
      email,
      car_model,
      pickup_time,
      pickup_address,
      pickup_location,
      drop_location,
      drop_address,
      scheduled_time,
      rider_hours,
      ride_type,
      accept_time,
      package_id,
      subpackage_id,
      car_id,
      Price,
      tax,
      Total,
    });

    return res.status(200).json({
      success: true,
      data: ride,
      message: id ? "Ride updated successfully" : "Ride created successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

const earningsHistory = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { months, days, years } = req.query;

  try {
    const filters = {
      months: months ? months.split(",") : [],
      days: days ? days.split(",") : [],
      years: years ? years.split(",") : [],
    };

    const earnings = await HomeService.getDriverEarningsHistory(
      driver_id,
      filters
    );

    return res.status(200).json({
      success: true,
      message: "Earnings history fetched successfully",
      data: earnings,
    });
  } catch (error) {
    console.error("Error in earningsHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch earnings history",
    });
  }
};

// controller for revealing/after accepting ride
const releaseDriverFromRide = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { rideId } = req.params;

  try {
    const ride = await HomeService.releaseRide(rideId, driver_id);
    return res.status(200).json({
      success: true,
      message: "Driver released from ride successfully",
      data: ride,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// controller for start the ride
const startRide = async (req, res) => {
  const driver_id = req.driver?.id;
  const { rideId } = req.params;

  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  try {
    const result = await HomeService.startRide(rideId, driver_id);
    if (!result.success) {
      // If the service returns an error (failure), handle it here
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// controller for end the ride and create earning entry
// const endRide = async (req, res) => {
//   const driver_id = req.driver?.id;
//   if (!driver_id) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   const { rideId } = req.params;

//   try {
//     const ride = await HomeService.endRide(rideId, driver_id);
//     return res.status(200).json({
//       success: true,
//       message: "Ride ended successfully and earning recorded",
//       data: ride,
//     });
//   } catch (error) {
//     return res.status(404).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const getMyRides = async (req, res) => {
//   const driverId = req.driver?.id;
//   if (!driverId) {
//     return res.status(401).json({success: false, message: "Unauthorized" });
//   }

//   const { statuses, sortBy, sortOrder, page, limit } = req.query;

//   // Parse statuses from query (expecting comma-separated or array)
//   let statusArray = statuses;
//   if (typeof statuses === "string") {
//     statusArray = statuses.split(",").map(s => s.trim());
//   }

//   const result = await HomeService.fetchMyRides(driverId, {
//     statuses: statusArray,
//     sortBy,
//     sortOrder,
//     page,
//     limit,
//   });

//   if (!result.success) {
//     return res.status(400).json({
//       success: false,
//       message: result.message,
//     });
//   }

//   return res.status(200).json({
//     success: true,
//     message: "Rides fetched successfully!",
//     data: result.data,
//   });
// };

const cancelRideController = async (req, res) => {
  const driverId = req.driver?.id;
  if (!driverId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { ride_id } = req.body;
  console.log(req.body, "ride_idddddddddddddddddddddddddddd");
  if (!ride_id) {
    return res.status(400).json({
      success: false,
      message: "Ride ID is required",
    });
  }

  try {
    const result = await HomeService.canceRide(driverId, ride_id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error cancelling ride:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const endRide = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { rideId } = req.params;

  // Start a single transaction for the entire process
  const t = await sequelize.transaction();

  try {
    // 1. End the ride (within the transaction)
    const result = await HomeService.endRide(rideId, driver_id, t);
    if (!result.success) {
      await t.rollback(); // Rollback if ride ending fails
      return res.status(404).json({ success: false, message: result.message });
    }
    const ride = result.ride;

    // 2. Fetch settings and calculate commission
    const settings = await Settings.findOne({ transaction: t });
    const percentage = settings?.tax_rate || 0;
    const amount = parseFloat(ride.Total) || 0;
    const commission = (amount * percentage) / 100;
    const netEarnings = amount - commission;

    // 3. Fetch driver for current balance (within the transaction)
    // Only fetch once at the beginning of the financial calculations
    const driver = await Driver.findByPk(driver_id, { transaction: t });
    if (!driver) {
      await t.rollback(); // Rollback if driver not found
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }
    const currentBalance = parseFloat(driver.wallet_balance || 0);
    const updatedBalance = currentBalance + netEarnings;

    // 4. Update wallet balance (within the transaction)
    await updateDriverBalance(driver_id, updatedBalance, t); // Pass the transaction

    // 5. Create earnings record (within the transaction)
    await createEarnings(
      {
        driver_id: driver_id,
        ride_id: ride.id,
        amount,
        commission,
        percentage,
        status: "processed",
      },
      t
    ); // Pass the transaction

    // 6. Create wallet report entry (within the transaction)
    await createWalletReport(
      driver_id,
      netEarnings,
      updatedBalance,
      ride.id,
      t
    ); // Pass the transaction

    await t.commit(); // Commit the transaction if all steps succeed

    return res.status(200).json({
      success: true,
      message: "Ride ended successfully and earning recorded",
      data: ride.id,
    });
  } catch (error) {
    await t.rollback(); // Rollback if any error occurs
    console.error("Error in endRide transaction:", error); // Log the error for debugging
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "An error occurred while processing the ride completion.",
    });
  }
};

const getMyRides = async (req, res) => {
  const driverId = req.driver?.id;
  if (!driverId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { statuses, sortBy, sortOrder, page, limit } = req.query;
  let statusArray = statuses;
  if (typeof statuses === "string") {
    statusArray = statuses.split(",").map((s) => s.trim().toLocaleLowerCase());
  }

  if (
    statusArray &&
    statusArray.some(
      (status) =>
        !["pending", "accepted", "on-route", "completed", "cancelled"].includes(
          status
        )
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid status filter. Allowed values are: pending, accepted, on-route, completed, cancelled.",
    });
  }

  // Validate sortBy and sortOrder
  const validSortFields = ["createdAt", "ride_date", "scheduled_time"];
  if (sortBy && !validSortFields.includes(sortBy)) {
    return res.status(400).json({
      success: false,
      message: `Invalid sort field. Allowed fields are: ${validSortFields.join(", ")}.`,
    });
  }

  if (sortOrder && !["ASC", "DESC"].includes(sortOrder)) {
    return res.status(400).json({
      success: false,
      message: "Invalid sort order. Allowed values are: ASC, DESC.",
    });
  }

  const pageNum = parseInt(page, 10) || 1;
  const pageSize = parseInt(limit, 10) || 10;

  try {
    const result = await HomeService.fetchMyRides(driverId, {
      statuses: statusArray,
      sortBy,
      sortOrder,
      page: pageNum,
      limit: pageSize,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Rides fetched successfully!",
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching rides in controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getAllHomeData,
  acceptRide,
  startRide,
  endRide,
  cancelRideController,
  toggleDriverStatus,
  releaseDriverFromRide,
  getRideDetails,
  updateRideStatus,
  getRidesByStatus,
  upsertRide,
  earningsHistory,
  getMyRides,
};
