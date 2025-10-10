const { Op } = require("sequelize");
const HomeService = require("../../services/home.service");
const { conditionalRides, getRideByIdData } = require("../../services/ride.service");
const { getEarningsSum } = require("../../services/earnings.service");
const { driverProfileWithCar, getDriverById } = require("../../services/driver.service");
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
// const { now } = require("moment");
const moment = require("moment-timezone");
const Earnings = require("../../models/earnings.model");
const Ride = require("../../models/ride.model");


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
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    });
    

    // 2. Get Today"s Earnings
    const todayEarnings = await getEarningsSum({
        driver_id,
        updatedAt: {[Op.between]: [startOfDay, endOfDay],},
        status: {[Op.in]: ["completed", "pending"], },
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
        "ride_code","customer_name", "email", "phone", "pickup_address", "pickup_location", "initiated_by_driver_id",
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

    const now = new Date();
    const availableRides = await conditionalRides({
      where: {
        driver_id: null,
        status: "pending",
        scheduled_time: {
          [Op.gte]: now
        }
      },
      attributes: [
        "ride_code","id", "customer_name", "email", "phone", "pickup_address", "pickup_location", "initiated_by_driver_id",
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
      order: [["scheduled_time", "ASC"]]
    });

    console.log("DriverCar with Car:", JSON.stringify(driverCar, null, 2));

    console.log({startOfDay,endOfDay,todayEarnings,});

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
// const acceptRide = async (req, res) => {
//   const driverId = req.driver?.id;
//   const { ride_id } = req.body;

//   if (!driverId || !ride_id) {
//     return res.status(400).json({
//       success: false,
//       message: "Driver ID and Ride ID are required.",
//     });
//   }

//   const t = await sequelize.transaction({
//     isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
//   });

//   try {
//     // Fetch ride with lock
//     const { ride, data } = await getRideById(ride_id, t, t.LOCK.UPDATE);
//     if (!ride) {
//       await t.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Ride not found.",
//       });
//     }

//     console.log("Ride details:", { driver_id: ride.driver_id, status: ride.status });

//     // Check if ride is already accepted or not pending
//     if (ride.driver_id || ride.status !== "pending") {
//       await t.rollback();
//       return res.status(409).json({
//         success: false,
//         message: "Ride already accepted by another driver or not available.",
//       });
//     }

//     // Compute accept_time here in Riyadh timezone
//     const acceptTime = moment().tz("Asia/Riyadh").format("YYYY-MM-DD HH:mm:ss");
//     console.log("accept_time =>", acceptTime, typeof acceptTime);

//     // Validate driver's car model matches ride's car model (via car_id)
//     const driverCar = await DriverCar.findOne({
//       where: { driver_id: driverId },
//       include: [{ model: Car, as: "Car", attributes: ["model"] }],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!driverCar) {
//       await t.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Driver has no associated car.",
//       });
//     }

//     const rideCar = await Car.findByPk(ride.car_id, {
//       attributes: ["model"],
//       transaction: t,
//     });

//     if (!rideCar) {
//       await t.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Ride's car not found.",
//       });
//     }

//     if (driverCar.Car.model !== rideCar.model) {
//       await t.rollback();
//       return res.status(403).json({
//         success: false,
//         message: `Driver's car model (${driverCar.Car.model}) does not match the ride's required model (${rideCar.model}).`,
//       });
//     }

//     // Fetch driver wallet & check if active
//     const driver = await Driver.findOne({
//       where:{id:driverId,status:"active"},
//       attributes: ["id", "wallet_balance", "credit_ride_count"],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!driver) {
//       await t.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Driver not found or inactive. Only active drivers can accept rides.",
//       });
//     }

//     // Fetch min_wallet_percentage from Settings
//     const setting = await Settings.findOne({
//       attributes: ["min_wallet_percentage"],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     let required = 0;
//     if (setting && setting.min_wallet_percentage) {
//       const percentage = parseFloat(setting.min_wallet_percentage);
//       required = (percentage / 100) * parseFloat(ride.Price || 0);
//     }

//     const balance = parseFloat(driver.wallet_balance) || 0.0;

//     let isCredit = false;
//     let newCount = driver.credit_ride_count || 0;
//     let newBalance = balance;

//     // Check wallet balance and credit ride limit
//     if (balance < required) {
//       if (newCount >= 3) {
//         await t.rollback();
//         return res.status(403).json({
//           success: false,
//           message: `You have exceeded the maximum of 3 credit rides. Please recharge your wallet (current balance: $${balance.toFixed(2)}, required: $${required.toFixed(2)}).`,
//         });
//       }
//       isCredit = true;
//       newCount += 1;
//       // Deduct available balance for credit ride
//       const amountToDebit = required - balance;
//       newBalance = 0; // Deduct all available balance
//       console.log(
//         `Ride ${ride_id} accepted on credit. Wallet deducted: $${balance.toFixed(2)}, Remaining debit: $${amountToDebit.toFixed(2)}, Credit ride count: ${newCount}`
//       );
//     } else {
//       // Deduct full required amount for non-credit ride
//       newBalance = balance - required;
//     }

//     // Update ride
//     await ride.update(
//       { driver_id: driverId, status: "accepted", accept_time: acceptTime, is_credit: isCredit },
//       { transaction: t }
//     );

//     // Update driver
//     await driver.update(
//       { wallet_balance: newBalance, credit_ride_count: newCount },
//       { transaction: t }
//     );

//     // Create wallet report for credit rides
//     if (isCredit) {
//       const amountToDebit = required - balance;
//       await WalletReports.create(
//         {
//           id: uuid(),
//           driver_id: driverId,
//           amount: -amountToDebit,
//           balance_after: newBalance,
//           transaction_date: new Date(),
//           transaction_type: "debit",
//           description: `Debit due to insufficient balance for ride ${ride_id} (wallet deducted: $${balance.toFixed(2)}, remaining debit: $${amountToDebit.toFixed(2)})`,
//           // ride_id,
//         },
//         { transaction: t }
//       );
//     }

//     // Commit transaction
//     await t.commit();

//     // Return formatted response
//     return res.status(200).json({
//       success: true,
//       message: "Ride accepted successfully!",
//       data: {
//         ...data,
//         status: ride.status,
//         driver_id: ride.driver_id,
//         accept_time: ride.accept_time,
//         is_credit: isCredit,
//       },
//     });
//   } catch (error) {
//     if (!t.finished) {
//       await t.rollback();
//     }
//     console.error("Error accepting ride:", error);
//     return res.status(400).json({
//       success: false,
//       message: error.message || "Failed to accept ride",
//     });
//   }
// };

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

    const minWalletPercent = settings?.min_wallet_percentage || 20; // default 20%
    const requiredBalance = (ride.total_amount * minWalletPercent) / 100;
    const walletBalance = driver.wallet_balance || 0;
    const creditCount = driver.credit_ride_count || 0;

    // Check if driver has enough balance
    if (walletBalance >= requiredBalance) {
      // ✅ Driver has enough balance
      await ride.update({
        driver_id,
        status: "accepted",
        is_credit: false,
      });

      return res.status(200).json({
        success: true,
        message: "Ride accepted successfully.",
        data: { ride, is_credit: false },
      });
    }

    // If not enough balance but has credit rides available (< 3)
    if (creditCount < 3) {
      await ride.update({
        driver_id,
        status: "accepted",
        is_credit: true,
      });

      await driver.update({
        credit_ride_count: creditCount + 1,
      });

      return res.status(200).json({
        success: true,
        message:
          "Ride accepted using credit. Your wallet will be adjusted after ride completion.",
        data: { ride, is_credit: true },
      });
    }

    // ❌ If no balance and credit limit reached
    return res.status(400).json({
      success: false,
      message:
        "You have exceeded your 3 credit rides. Please recharge your wallet to accept new rides.",
    });
  } catch (error) {
    console.error("Accept ride error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while accepting ride.",
      error: error.message,
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
     await Driver.update(
      { availability_status: status },
      { where: { id: driver_id } }
    );

    // Fetch updated driver info using getDriverById
    const updatedDriver = await getDriverById(driver_id);
    return res.status(200).json({
      success: true,
      message: `Driver status updated to ${status}`,
      data: updatedDriver,
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
// const endRide = async (req, res) => {
//   const driver_id = req.driver?.id;
//   const { rideId } = req.params;

//   if (!driver_id) {
//     return res.status(401).json({
//       success: false,
//       message: "Unauthorized access",
//     });
//   }

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

    if (!ride) throw new Error("Ride not found or cannot be ended.");

    // 2️⃣ Fetch driver
    const driver = await Driver.findByPk(driver_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!driver) throw new Error("Driver not found.");

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
    const netEarnings = amount - commission;

    // 5️⃣ Update driver wallet
    let updatedBalance = parseFloat(driver.wallet_balance || 0);

    // Deduct amount if ride was accepted on credit, otherwise add netEarnings
    if (ride.is_credit) {
      updatedBalance -= amount; // wallet goes negative for credit rides
    } else {
      updatedBalance += netEarnings;
    }

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

    // 7️⃣ Create wallet report
    await WalletReports.create(
      {
        id: uuid(),
        driver_id,
        transaction_type: ride.is_credit ? "debit" : "credit",
        amount: ride.is_credit ? -amount : netEarnings,
        balance_after: updatedBalance,
        transaction_date: new Date(),
        description: ride.is_credit
          ? `Deducted wallet for credit ride ${rideId}`
          : `Earnings from ride ${rideId}`,
        status: "completed",
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Ride ended successfully and earnings recorded",
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
