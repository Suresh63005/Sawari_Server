const { Op } = require("sequelize");
const HomeService = require("../../services/home.service");
const {
  conditionalRides,
  getRideByIdData,
} = require("../../services/ride.service");
const { getEarningsSum } = require("../../services/earnings.service");
const {
  driverProfileWithCar,
  getDriverById,
} = require("../../services/driver.service");
const Package = require("../../models/package.model");
const SubPackage = require("../../models/sub-package.model");
const driverCarService = require("../../services/driverCar.service");
const Car = require("../../models/cars.model");
const Driver = require("../../models/driver.model");
// const { Transaction } = require("sequelize");
const { sequelize } = require("../../models");
const Settings = require("../../models/settings.model");
const WalletReports = require("../../models/wallet-report.model");
const { v4: uuid } = require("uuid");
// const DriverCar = require("../../models/driver-cars.model");
const { isValidStatus, isRideStatus } = require("../../helper/common");
// const { createWalletReport } = require("../../services/wallet.service");
const moment = require("moment-timezone");
const Ride = require("../../models/ride.model");
const Earnings = require("../../models/earnings.model");

// 1. Get Dashboard/Home Data
const getAllHomeData = async (req, res) => {
  const driver_id = req.driver?.id;

  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // const startOfDay = new Date();
    // startOfDay.setHours(0, 0, 0, 0);

    // const endOfDay = new Date();
    // endOfDay.setHours(23, 59, 59, 999);

    const startOfDay = moment.tz("Asia/Dubai").startOf("day").utc().toDate();
    const endOfDay = moment.tz("Asia/Dubai").endOf("day").utc().toDate();

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
      driver_id,
      updatedAt: { [Op.between]: [startOfDay, endOfDay] },
      status: { [Op.in]: ["processed"] },
    });

    // 3. Driver profile with vehicle
    const driverProfile = await driverProfileWithCar(driver_id);

    // 4. Accepted & Completed Rides
    const acceptedRides = await conditionalRides({
      where: {
        driver_id,
        status: {
          [Op.in]: ["accepted"],
        },
      },
      attributes: [
        "ride_code",
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
      order: [["scheduled_time", "DESC"]],
    });

    // 5. Available Rides (unassigned)
    const driverCar = await driverCarService.getDriverCarByDriverId(driver_id);
    if (!driverCar) {
      return res.status(404).json({
        success: false,
        message: "Driver has no registered car.",
      });
    }

    const now = new Date();
    const availableRides = await conditionalRides({
      where: {
        driver_id: null,
        status: "pending",
        scheduled_time: {
          [Op.gte]: now,
        },
      },
      attributes: [
        "ride_code",
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

    console.log({ startOfDay, endOfDay, todayEarnings });

    return res.status(200).json({
      success: true,
      message: "Home data fetched successfully!",
      data: {
        todayRides,
        todayEarnings,
        driverProfile,
        acceptedRides,
        availableRides,
      },
    });
  } catch (error) {
    console.error("Error fetching home data:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 2. Accept a Ride
const acceptRide = async (req, res) => {
  try {
    const driver_id = req.driver?.id;
    const { ride_id } = req.body;

    if (!driver_id || !ride_id) {
      return res.status(400).json({
        success: false,
        message: "Driver ID and Ride ID are required.",
      });
    }

    const driver = await Driver.findByPk(driver_id);
    const ride = await Ride.findByPk(ride_id);
    const settings = await Settings.findOne();

    if (!driver || !ride) {
      return res.status(404).json({
        success: false,
        message: "Driver or Ride not found.",
      });
    }

    if (ride.status !== "pending" || ride.driver_id) {
      return res.status(400).json({
        success: false,
        message: "Ride is not available or already accepted.",
      });
    }

    const minWalletPercent = settings?.min_wallet_percentage || 20; // Default 20%
    const requiredBalance = (parseFloat(ride.Total) * minWalletPercent) / 100; // Use ride.Total
    const walletBalance = parseFloat(driver.wallet_balance) || 0;
    const creditCount = driver.credit_ride_count || 0;

    // Start transaction to ensure atomic updates
    const t = await sequelize.transaction();

    try {
      if (walletBalance >= requiredBalance) {
        // Driver has enough balance
        await ride.update(
          {
            driver_id,
            status: "accepted",
            is_credit: false,
            accept_time: new Date().toISOString(), // Set accept_time to current time
          },
          { transaction: t }
        );
        await t.commit();
        return res.status(200).json({
          success: true,
          message: "Ride accepted successfully.",
          data: { ride, is_credit: false },
        });
      } else if (creditCount < 3) {
        // Not enough balance but has credit rides available
        await ride.update(
          {
            driver_id,
            status: "accepted",
            is_credit: true,
            accept_time: new Date().toISOString(), // Set accept_time to current time
          },
          { transaction: t }
        );
        await driver.update(
          {
            credit_ride_count: creditCount + 1,
          },
          { transaction: t }
        );
        await t.commit();
        return res.status(200).json({
          success: true,
          message:
            "Ride accepted using credit. Your wallet will be adjusted after ride completion.",
          data: { ride, is_credit: true },
        });
      } else {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "You have exceeded your 3 credit rides. Please recharge your wallet to accept new rides.",
        });
      }
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Accept ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while accepting ride.",
      error: error.message,
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
  const { rideId } = req.params;

  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

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
    if (!result) {
      // If the service returns an error (failure), handle it here
      return res.status(404).json({
        success: false,
        message: "Ride not found or not in accepted status",
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
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
  const { rideId } = req.params;
  const dropoff_time = new Date().toISOString();

  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  const t = await sequelize.transaction();

  try {
    // 1️⃣ Fetch ride
    const ride = await Ride.findOne({
      where: { id: rideId, driver_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or does not belong to driver.",
      });
    }

    // 2️⃣ Fetch driver
    const driver = await Driver.findByPk(driver_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    // 3️⃣ Update ride status
    await ride.update(
      { status: "completed", dropoff_time },
      { transaction: t }
    );

    // 4️⃣ Calculate earnings
    const settings = await Settings.findOne({ transaction: t });
    const taxRate = settings?.tax_rate || 0;
    const amount = parseFloat(ride.Total) || 0;
    const commission = (amount * taxRate) / 100;
    // const netEarnings = amount - commission; // Not used for wallet update

    // 5️⃣ Update driver wallet: Always deduct ride.Total
    let updatedBalance = parseFloat(driver.wallet_balance || 0) - amount;

    await driver.update({ wallet_balance: updatedBalance }, { transaction: t });

    // 6️⃣ Create earnings record
    const earnings = await Earnings.create(
      {
        driver_id,
        ride_id: ride.id,
        amount,
        commission,
        percentage: taxRate,
        status: "processed",
      },
      { transaction: t }
    );

    // 7️⃣ Create wallet report: Always debit ride.Total
    await WalletReports.create(
      {
        id: uuid(),
        driver_id,
        transaction_type: "debit",
        amount: -amount,
        balance_after: updatedBalance,
        transaction_date: new Date(),
        description: `Deducted ride amount for ride ${rideId}`,
        status: "completed",
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Ride ended successfully, earnings recorded, and wallet updated",
      data: {
        ride,
        earnings,
        wallet_balance: updatedBalance,
      },
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("End ride error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
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
