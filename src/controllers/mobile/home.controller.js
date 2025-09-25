const { Op } = require("sequelize");
const HomeService = require("../../services/home.service");
const { conditionalRides, getRideById, getRideByIdData } = require("../../services/ride.service");
const { getEarningsSum } = require("../../services/earnings.service");
const { driverProfileWithCar, getDriverById } = require("../../services/driver.service");
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

// 1. Get Dashboard/Home Data
const getAllHomeData = async (req, res) => {
  const driver_id = req.driver?.id;

  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
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
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    });

    // 2. Get Today"s Earnings
    const todayEarnings = await getEarningsSum({
      where: {
        driver_id,
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        },
        status: "completed"
      }
    });

    // 3. Driver profile with vehicle
    const driverProfile = await driverProfileWithCar(driver_id);

    // 4. Accepted & Completed Rides
    const acceptedRides = await conditionalRides({
      where: {
        driver_id,
        status: {
          [Op.in]: ["completed", "accepted"]
        }
      },
      attributes: [
        "customer_name", "email", "phone", "pickup_address", "pickup_location", "initiated_by_driver_id",
        "drop_location", "drop_address", "scheduled_time", "pickup_time", "dropoff_time"
      ],
      limit: 10,
      order: [["scheduled_time", "ASC"]]
    });

    // 5. Available Rides (unassigned)
    const driverCar = await driverCarService.getDriverCarByDriverId(driver_id);
    if (!driverCar) {
      return res.status(404).json({
        success: false,
        message: "Driver has no registered car."
      });
    }

    const availableRides = await conditionalRides({
      where: {
        driver_id: null,
        status: "pending",
      },
      attributes: [
        "id", "customer_name", "email", "phone", "pickup_address", "pickup_location", "initiated_by_driver_id",
        "drop_location", "drop_address", "scheduled_time", "pickup_time", "dropoff_time", "Price", "Total"
      ],
      include: [
        {
          model: Car,
          as: "Car", // must match Ride.belongsTo(Car, { as: "Car" })
          attributes: ["id", "brand", "model"],
          where: {
            brand: driverCar.Car?.brand,
            model: driverCar.Car?.model
          }
        },
        {
          model: Package,
          as: "Package",
          attributes: ["name"]
        },
        {
          model: SubPackage,
          as: "SubPackage",
          attributes: ["name"]
        }
      ],
      limit: 10,
      order: [["scheduled_time", "DESC"]]
    });

    console.log("DriverCar with Car:", JSON.stringify(driverCar, null, 2));


    return res.status(200).json({
      success: true,
      message: "Home data fetched successfully!",
      data: {
        todayRides,
        todayEarnings,
        driverProfile,
        acceptedRides,
        availableRides
      }
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
  const driverId = req.driver?.id;
  const { ride_id } = req.body;

  if (!driverId || !ride_id) {
    return res.status(400).json({
      success: false,
      message: "Driver ID and Ride ID are required.",
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

    console.log("Ride details:", { driver_id: ride.driver_id, status: ride.status });

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
      console.log(`Ride ${ride_id} accepted on credit. Amount debited: $${required.toFixed(2)}, Credit ride count: ${newCount}`);
    }

    // Update ride
    await ride.update(
      { driver_id: driverId, status: "accepted", accept_time: new Date(), is_credit: isCredit },
      { transaction: t }
    );

    // Deduct wallet balance if not on credit
    const newBalance = isCredit ? balance : balance - required;

    // Update driver
    await driver.update(
      { wallet_balance: newBalance, credit_ride_count: newCount },
      { transaction: t }
    );

    // Create wallet report for credit rides
    if (isCredit) {
      await WalletReports.create(
        {
          id: uuid(),
          driver_id: driverId,
          amount: -required,
          balance_after: newBalance,
          transaction_date: new Date(),
          transaction_type: "debit",
          description: `Debit due to insufficient balance for ride ${ride_id}`,
          ride_id,
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
        is_credit: ride.is_credit,
      },
    });
  } catch (error) {
    await t.rollback();
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
  const { status } = req.body; // expecting "online" or "offline"

  if (!driver_id || !status) {
    return res.status(400).json({ message: "Driver ID and status required." });
  }

  try {
    const driverGetById = await getDriverById(driver_id);
    driverGetById.availability_status = status;
    const result = await driverGetById.save();
    return res.status(200).json({
      success: true,
      message: `Driver status updated to ${status}`,
      data: result,
    });
  } catch (error) {
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
  const { ride_id } = req.params;

  try {
    const ride = await getRideByIdData(driver_id, ride_id);
    return res.status(200).json({
      success: true,
      message: "Ride details fetched successfully",
      data: ride,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

//5 Update Ride Status (on-route or cancelled)
const updateRideStatus = async (req, res) => {
  const driver_id = req.driver?.id;
  const { ride_id } = req.params;
  const { status } = req.body;

  try {
    const ride = await getRideByIdData(driver_id, ride_id);
    if (ride.status !== "accepted") {
      throw new Error("Ride must be in \"accepted\" status to start or cancel");
    }

    ride.status = status;
    await ride.save();

    return res.status(200).json({
      success: true,
      message: `Ride status updated to "${status}"`,
      data: ride
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

  try {
    const rides = await HomeService.getCompletedOrCancelledAndAcceptedRides(driver_id, status);
    return res.status(200).json({
      success: true,
      message: `Rides with status "${status}" fetched successfully`,
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
      Total
    } = req.body;

    // Validate pickup_location and drop_location
    if (!pickup_location || typeof pickup_location !== "object" || !pickup_location.lat || !pickup_location.lng) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup_location format. Must be an object with lat and lng"
      });
    }

    if (
      !drop_location || typeof drop_location !== "object" || !drop_location.lat || !drop_location.lng) {
      return res.status(400).json({
        success: false,
        message: "Invalid drop_location format. Must be an object with lat and lng.",
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
      Total
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
  const { months, days, years } = req.query;

  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const filters = {
      months: months ? months.split(",") : [],
      days: days ? days.split(",") : [],
      years: years ? years.split(",") : [],
    };

    const earnings = await HomeService.getDriverEarningsHistory(driver_id, filters);



    return res.status(200).json({
      success: true,
      message: "Earnings history fetched successfully",
      data: earnings
    });
  } catch (error) {
    console.error("Error in earningsHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch earnings history"
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
    const ride = await HomeService.startRide(rideId, driver_id);
    return res.status(200).json({
      success: true,
      message: "Ride started successfully",
      data: ride,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// controller for end the ride and create earning entry
const endRide = async (req, res) => {
  const driver_id = req.driver?.id;
  const { rideId } = req.params;

  if (!driver_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  try {
    const ride = await HomeService.endRide(rideId, driver_id);
    return res.status(200).json({
      success: true,
      message: "Ride ended successfully and earning recorded",
      data: ride,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


const getMyRides = async (req, res) => {
  const driverId = req.driver?.id;
  const { statuses, sortBy, sortOrder, page, limit } = req.query;

  if (!driverId) {
    return res.status(400).json({
      success: false,
      message: "Driver ID is required.",
    });
  }

  // Parse statuses from query (expecting comma-separated or array)
  let statusArray = statuses;
  if (typeof statuses === "string") {
    statusArray = statuses.split(",").map(s => s.trim());
  }

  const result = await HomeService.fetchMyRides(driverId, {
    statuses: statusArray,
    sortBy,
    sortOrder,
    page,
    limit,
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
};


const cancelRideController = async (req, res) => {
  const driverId = req.driver?.id;
  const { ride_id } = req.body;

  if (!driverId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Driver ID is required",
    });
  }

  if (!ride_id) {
    return res.status(400).json({
      success: false,
      message: "Ride ID is required",
    });
  }

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
  getMyRides
};
