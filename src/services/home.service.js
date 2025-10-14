const { Op, Sequelize } = require("sequelize");
const Ride = require("../models/ride.model");
const Earnings = require("../models/earnings.model");
const Driver = require("../models/driver.model");
const Package = require("../models/package.model");
const SubPackage = require("../models/sub-package.model");
const Car = require("../models/cars.model");
const Settings = require("../models/settings.model");
const { sequelize } = require("../models");
const { sendPushNotification } = require("../helper/sendPushNotification");
const DriverCar = require("../models/driver-cars.model");
// const { updateDriverBalance } = require("./driver.service");
// const { createWalletReport } = require("./wallet.service");
const { sendNotificationService } = require("./notifications.service");
const { generateRideCode } = require("../utils/generateCode");
// const { generateRideCode } = require("../utils/generateCode");
// const DriverCar = require("../models/driver-cars.model");

const acceptRide = async (ride_id, driver_id, accept_time) => {
  const ride = await Ride.findOne({
    where: {
      id: ride_id,
      status: "pending",
      driver_id: {
        [Op.or]: [null, ""], // handles both null and empty string
      },
    },
  });

  if (!ride) {
    throw new Error("Ride is not available or already accepted.");
  }

  // ride.driver_id = driver_id;
  // // ride.accept_time=new Date();
  // ride.status = "accepted";
  // await ride.save();

  await ride.update({
    driver_id,
    status: "accepted",
    accept_time: new Date().toISOString(),
  });

  return ride;
};

const DriverStatus = async (driver_id, status) => {
  // Validate status
  if (!["active", "inactive"].includes(status)) {
    throw new Error("Invalid status. Only 'active' or 'inactive' allowed.");
  }
  // Find the driver by ID
  const driver = await Driver.findOne({ where: { id: driver_id } });

  if (!driver) {
    throw new Error("Driver not found.");
  }

  // Update the status
  driver.status = status;
  await driver.save();
  return driver;
};

const RideDetails = async (driver_id, ride_id) => {
  console.log(driver_id, ride_id, "hhhhhhhhhhhhhhhhhhhhhhhhh");

  // if (!ride) {
  //     throw new Error("Ride not found");
  // }

  // return ride;
};

const getCompletedOrCancelledAndAcceptedRides = async (driver_id, status) => {
  if (!["accepted", "completed", "cancelled"].includes(status)) {
    throw new Error(
      "Invalid status. Allowed values: 'accepted', 'cancelled', 'completed'"
    );
  }

  const whereCondition = {
    driver_id,
    status,
  };

  // Fetch all rides first
  const rides = await Ride.findAll({
    where: whereCondition,
    order: [["createdAt", "DESC"]],
  });

  // If accepted, filter future rides and sort by scheduled_time
  if (status === "accepted") {
    const now = new Date();

    // Convert Sequelize instances to plain objects with proper Date conversion
    const ridesWithDates = rides.map((ride) => {
      const rideObj = ride.get({ plain: true });
      rideObj.scheduled_time = new Date(rideObj.scheduled_time);
      return rideObj;
    });

    // Filter future rides and sort by scheduled_time ascending
    return ridesWithDates
      .filter((ride) => ride.scheduled_time >= now)
      .sort((a, b) => a.scheduled_time - b.scheduled_time);
  }

  // For completed/cancelled, sort by createdAt descending
  return rides
    .map((ride) => {
      const rideObj = ride.get({ plain: true });
      rideObj.createdAt = new Date(rideObj.createdAt);
      return rideObj;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
};

const upsertRide = async (rideData) => {
  const {
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
    ride_type,
    accept_time,
    scheduled_time,
    rider_hours,
    package_id,
    subpackage_id,
    car_id,
    Price,
    tax,
    Total,
  } = rideData;

  // ✅ Validate related IDs
  const pkg = await Package.findByPk(package_id);
  if (!pkg) throw new Error("Invalid package_id");

  const subPkg = await SubPackage.findByPk(subpackage_id);
  if (!subPkg) throw new Error("Invalid subpackage_id");

  const car = await Car.findByPk(car_id);
  if (!car) throw new Error("Invalid car_id");

  if (id) {
    const ride = await Ride.findByPk(id);
    if (!ride) {
      throw new Error("Ride not found");
    }

    // ✅ Check if the ride was initiated by this driver and is still pending
    if (ride.initiated_by_driver_id !== driver_id) {
      throw new Error("Unauthorized: You can only update rides you initiated");
    }

    if (["on-route", "completed", "cancelled"].includes(ride.status)) {
      return {
        success: false,
        statusCode: 400,
        message:
          "Cannot edit ride once it is on-route, completed, or cancelled",
      };
    }

    // ⏳ Check time limit (only applicable after ride is accepted)
    if (ride.status === "accepted") {
      const settings = await Settings.findOne({
        attributes: ["ride_edit_time_limit"],
      });

      // ride_edit_time_limit is now in HOURS
      const editTimeLimitHours = settings?.ride_edit_time_limit || 1; // default 1 hour

      const acceptTime = new Date(ride.accept_time);
      const now = new Date();

      // Difference in hours
      const diffHours = (now - acceptTime) / (1000 * 60 * 60);

      if (diffHours > editTimeLimitHours) {
        return {
          success: false,
          statusCode: 400,
          message: `Edit time expired. You can edit the ride only within ${editTimeLimitHours} hour(s) after acceptance.`,
        };
      }
    }

    await ride.update({
      initiated_by_driver_id: driver_id,
      customer_name,
      phone,
      email,
      car_model,
      pickup_time,
      pickup_address,
      pickup_location,
      drop_location,
      drop_address,
      ride_type,
      accept_time,
      scheduled_time,
      rider_hours,
      package_id,
      subpackage_id,
      car_id,
      Price,
      tax,
      Total,
    });

    return ride.toJSON();
  } else {
    const ride_code = generateRideCode();
    const newRide = await Ride.create({
      ride_code,
      initiated_by_driver_id: driver_id,
      customer_name,
      phone,
      email,
      car_model,
      pickup_time,
      pickup_address,
      pickup_location,
      drop_location,
      drop_address,
      ride_type,
      accept_time,
      scheduled_time,
      rider_hours,
      package_id,
      subpackage_id,
      car_id,
      Price,
      tax,
      Total,
      status: "pending",
    });

    // Ride Auto Cancel Flow:
    const settings = await Settings.findOne({
      attributes: ["ride_auto_cancel_time_limit"],
    });
    const cancelTimeLimitHours = settings?.ride_auto_cancel_time_limit || 6;

    // ⏳ Schedule auto-cancel check
    setTimeout(
      async () => {
        try {
          const rideToCheck = await Ride.findByPk(newRide.id);
          if (rideToCheck && rideToCheck.status === "pending") {
            await rideToCheck.update({
              status: "cancelled",
              cancellation_reason: `No driver accepted the ride within ${cancelTimeLimitHours} hour(s)`,
            });
            console.log(
              `🚫 Ride ${rideToCheck.id} auto-cancelled after ${cancelTimeLimitHours} hour(s)`
            );
          }
        } catch (error) {
          console.error("❌ Auto-cancel check failed:", error.message);
        }
      },
      cancelTimeLimitHours * 60 * 60 * 1000
    );

    // Find drivers with matching car model
    const matchingDrivers = await Driver.findAll({
      include: [
        {
          model: DriverCar,
          as: "Vehicles",
          attributes: ["car_id"],
          where: { car_id: car_id },
          include: [
            {
              model: Car,
              as: "Car",
              attributes: ["model"],
            },
          ],
        },
      ],
      where: {
        status: "active",
      },
    });

    for (const driver of matchingDrivers) {
      const carModel = driver.Vehicles[0]?.Car?.model || "N/A";

      const heading = { en: "New Ride Available" };
      const message = {
        en: `A new ride with car model ${carModel} is available from ${pickup_address} to ${drop_address} on ${scheduled_time}.`,
      };

      try {
        // ✅ Send push notification if driver has OneSignal ID
        if (driver.one_signal_id) {
          await sendPushNotification(driver.one_signal_id, heading, message);
          console.log(`✅ Push notification sent to driver ${driver.id}`);
        } else {
          console.warn(`⚠️ Driver with ID ${driver.id} has no OneSignal ID`);
        }

        // ✅ Create notification entry in the database
        await sendNotificationService({
          user_id: driver.id,
          title: heading.en,
          message: message.en,
          is_read: false,
          image: null,
        });
      } catch (error) {
        console.error(
          `❌ Failed to notify driver ${driver.id}:`,
          error.message
        );
      }
    }

    return newRide;
  }
};

// const getDriverEarningsHistory = async (driver_id, filters) => {
//   const where = { driver_id };

//   // ------------------- FILTERS -------------------
//   // Filter by months
//   if (filters?.months?.length > 0) {
//     const monthConditions = filters.months.map(month => {
//       const [year, monthNum] = month.split("-");
//       return {
//         [Op.and]: [
//           Sequelize.where(Sequelize.fn("YEAR", Sequelize.col("Earnings.createdAt")), year),
//           Sequelize.where(Sequelize.fn("MONTH", Sequelize.col("Earnings.createdAt")), monthNum),
//         ]
//       };
//     });
//     where[Op.or] = [...(where[Op.or] || []), ...monthConditions];
//   }

//   // Filter by days
//   if (filters?.days?.length > 0) {
//     where[Op.or] = [
//       ...(where[Op.or] || []),
//       {
//         [Op.or]: filters.days.map(day => ({
//           [Op.and]: [
//             Sequelize.where(Sequelize.fn("DATE", Sequelize.col("Earnings.createdAt")), day)
//           ]
//         }))
//       }
//     ];
//   }

//   // Filter by years
//   if (filters?.years?.length > 0) {
//     where[Op.or] = [
//       ...(where[Op.or] || []),
//       {
//         [Op.or]: filters.years.map(year =>
//           Sequelize.where(Sequelize.fn("YEAR", Sequelize.col("Earnings.createdAt")), year)
//         )
//       }
//     ];
//   }

//   // ------------------- HISTORY DATA -------------------
//   const history = await Earnings.findAll({
//     where,
//     order: [["createdAt", "DESC"]],
//     include: [
//       {
//         model: Ride,
//         as: "Ride",
//         attributes: [
//           "pickup_address",
//           "drop_address",
//           "pickup_time",
//           "dropoff_time",
//           "status",
//           "Total",
//           "customer_name",
//           "status"
//         ]
//       }
//     ]
//   });

//   // ------------------- TOTAL CALCULATIONS -------------------
//   const today = new Date();
//   const startOfToday = new Date(today.setHours(0, 0, 0, 0));
//   const endOfToday = new Date(today.setHours(23, 59, 59, 999));

//   const startOfWeek = new Date();
//   startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
//   startOfWeek.setHours(0, 0, 0, 0);

//   const endOfWeek = new Date(startOfWeek);
//   endOfWeek.setDate(startOfWeek.getDate() + 6);
//   endOfWeek.setHours(23, 59, 59, 999);

//   const startOfMonth = new Date();
//   startOfMonth.setDate(1);
//   startOfMonth.setHours(0, 0, 0, 0);

//   const endOfMonth = new Date(
//     startOfMonth.getFullYear(),
//     startOfMonth.getMonth() + 1,
//     0,
//     23,
//     59,
//     59,
//     999
//   );

//   // Aggregate Queries
//   const todayTotal = await Earnings.sum("amount", {
//     where: {
//       driver_id,
//       createdAt: { [Op.between]: [startOfToday, endOfToday] }
//     }
//   }) || 0;

//   const weekTotal = await Earnings.sum("amount", {
//     where: {
//       driver_id,
//       createdAt: { [Op.between]: [startOfWeek, endOfWeek] }
//     }
//   }) || 0;

//   const monthTotal = await Earnings.sum("amount", {
//     where: {
//       driver_id,
//       createdAt: { [Op.between]: [startOfMonth, endOfMonth] }
//     }
//   }) || 0;

//   return {
//     history,
//     totals: {
//       today: todayTotal,
//       week: weekTotal,
//       month: monthTotal
//     }
//   };
// };

// Service for relieving driver from a ride

const getDriverEarningsHistory = async (driver_id, filters) => {
  const where = { driver_id };

  // ------------------- FILTERS -------------------
  // Filter by months
  if (filters?.months?.length > 0) {
    const monthConditions = filters.months.map((month) => {
      const [year, monthNum] = month.split("-");
      return {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("YEAR", Sequelize.col("Earnings.createdAt")),
            year
          ),
          Sequelize.where(
            Sequelize.fn("MONTH", Sequelize.col("Earnings.createdAt")),
            monthNum
          ),
        ],
      };
    });
    where[Op.or] = [...(where[Op.or] || []), ...monthConditions];
  }

  // Filter by days
  if (filters?.days?.length > 0) {
    const dayConditions = filters.days.map((day) => ({
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("Earnings.createdAt")),
          day
        ),
      ],
    }));
    where[Op.or] = [...(where[Op.or] || []), ...dayConditions];
  }

  // Filter by years
  if (filters?.years?.length > 0) {
    const yearConditions = filters.years.map((year) =>
      Sequelize.where(
        Sequelize.fn("YEAR", Sequelize.col("Earnings.createdAt")),
        year
      )
    );
    where[Op.or] = [...(where[Op.or] || []), ...yearConditions];
  }

  // ------------------- HISTORY DATA -------------------
  const history = await Earnings.findAll({
    where,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Ride,
        as: "Ride",
        attributes: [
          "pickup_address",
          "drop_address",
          "pickup_time",
          "dropoff_time",
          "status",
          "Total",
          "customer_name",
        ],
      },
    ],
  });

  // ------------------- DATE RANGES -------------------
  const now = new Date();

  // Today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // This Week (Sunday - Saturday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  endOfWeek.setHours(23, 59, 59, 999);

  // This Month
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // This Year
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  // ------------------- TOTAL CALCULATIONS -------------------
  const todayTotal =
    (await Earnings.sum("amount", {
      where: {
        driver_id,
        createdAt: { [Op.between]: [startOfToday, endOfToday] },
      },
    })) || 0;

  const weekTotal =
    (await Earnings.sum("amount", {
      where: {
        driver_id,
        createdAt: { [Op.between]: [startOfWeek, endOfWeek] },
      },
    })) || 0;

  const monthTotal =
    (await Earnings.sum("amount", {
      where: {
        driver_id,
        createdAt: { [Op.between]: [startOfMonth, endOfMonth] },
      },
    })) || 0;

  const yearTotal =
    (await Earnings.sum("amount", {
      where: {
        driver_id,
        createdAt: { [Op.between]: [startOfYear, endOfYear] },
      },
    })) || 0;

  return {
    history,
    totals: {
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      year: yearTotal,
    },
  };
};

const releaseRide = async (rideId, driver_id) => {
  const ride = await Ride.findOne({
    where: {
      id: rideId,
      driver_id: driver_id,
      status: "accepted",
    },
  });

  if (!ride) {
    throw new Error("Ride not found or cannot be released.");
  }

  ride.driver_id = null;
  ride.status = "pending";
  await ride.save();

  return ride;
};

// Start the ride service
const startRide = async (rideId, driver_id, pickup_time) => {
  const ride = await Ride.findOne({
    where: {
      id: rideId,
      driver_id: driver_id,
      status: "accepted",
    },
  });

  if (!ride) {
    return null;
  }

  // ride.status = "on-route";
  // ride.pickup_time;
  // // ride.pickup_time = new Date();
  // await ride.save();

  await ride.update({
    driver_id,
    status: "on-route",
    pickup_time,
  });

  return ride;
};

// service for end the ride
// const endRide = async (rideId, driver_id,transaction=null,dropoff_time) => {
//   // Use provided trasaction or create new one
//   const t = transaction || await sequelize.transaction();
//   try {
//         const ride = await Ride.findOne({
//             where: {
//                 id: rideId,
//                 driver_id: driver_id,
//                 status: "on-route"
//             }
//         });

//         if (!ride) {
//             throw new Error("Ride not found or cannot be ended.");
//         }

//         await ride.update({
//           status: "completed",
//           dropoff_time,

//         });

//         // ride.status = "completed";
//         // ride.dropoff_time;
//         // // ride.dropoff_time = new Date();
//         // await ride.save();

//         // get tax/commisstion percentage from settings table
//         const settings = await Settings.findOne();
//         const percentage = settings?.tax_rate || 0;

//         // Calculate commission and driver's earnings
//         const amount = parseFloat(ride.Total) || 0;
//         const commission = (amount * percentage) / 100;
//         const netEarnings = amount - commission;

//         // Fetch current wallent balance
//         const driver = await Driver.findByPk(driver_id,{transaction:t});
//         if(!driver){
//           throw new Error("Driver not found.");
//         }
//         const currentBalance = parseFloat(driver.wallet_balance || 0);
//         const updatedBalance = currentBalance + netEarnings;

//         // Update Wallet balance using service
//         await updateDriverBalance(driver_id,updatedBalance.toFixed(2),t);

//         // create earnings record
//         const earnings = await Earnings.create({
//             driver_id: driver_id,
//             ride_id: ride.id,
//             amount,
//             commission,
//             percentage,
//             // payment_method:ride.payment_method,
//             status: "processed"
//         },{transaction:t});

//         // Create wallet report
//         // await createWalletReport(driver_id,netEarnings,updatedBalance,ride.id,t,{
//         //   transaction_type:"credit",
//         //   description: `Earnings from ride ${rideId}`,
//         //   status:"completed"
//         // });

//         console.log(`EndRide: driver_id=${driver_id}, rideId=${rideId}, amount=${amount.toFixed(2)}, commission=${commission.toFixed(2)}, netEarnings=${netEarnings.toFixed(2)}`);

//         if(!transaction){
//           await t.commit();
//         };

//         return {ride,earnings,wallet_balance:updatedBalance.toFixed(2)};
//   } catch (error) {
//     if (!transaction && !t.finished) {
//         await t.rollback();
//       }
//       console.error("Error ending ride:", error);
//       throw new Error("Failed to end ride: " + error.message);
//   }
// };

const endRide = async (rideId, driver_id) => {
  // Fetch ride and driver only, controller will handle logic
  const ride = await Ride.findOne({ where: { id: rideId, driver_id } });
  const driver = await Driver.findByPk(driver_id);
  return { ride, driver };
};

// service for fetch initiated_by_driver_id rides (my rides)
const fetchMyRides = async (
  driverId,
  { statuses, sortBy, sortOrder, page, limit }
) => {
  const validStatuses = [
    "pending",
    "accepted",
    "on-route",
    "completed",
    "cancelled",
  ];

  try {
    // Validate statuses
    if (statuses && Array.isArray(statuses)) {
      const invalidStatuses = statuses.filter(
        (status) => !validStatuses.includes(status)
      );
      if (invalidStatuses.length > 0) {
        throw new Error(`Invalid status(es): ${invalidStatuses.join(", ")}`);
      }
    }

    // Validate sortBy and sortOrder
    const allowedSortFields = ["createdAt", "ride_date", "scheduled_time"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const order = sortOrder === "ASC" ? "ASC" : "DESC";

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * pageSize;

    // Build query
    const where = {
      initiated_by_driver_id: driverId,
    };
    if (statuses && statuses.length > 0) {
      where.status = { [Op.in]: statuses };
    }

    // Fetch rides with related data
    const rides = await Ride.findAll({
      where,
      attributes: [
        "id",
        "customer_name",
        "phone",
        "email",
        "pickup_address",
        "drop_address",
        "pickup_location",
        "drop_location",
        "ride_date",
        "scheduled_time",
        "status",
        "Price",
        "tax",
        "Total",
        "payment_status",
        "accept_time",
        "pickup_time",
        "dropoff_time",
        "is_credit",
        "package_id",
        "subpackage_id",
        "car_id",
        "rider_hours",
      ],
      include: [
        {
          model: Car,
          attributes: ["model"],
          as: "Car",
        },
        {
          model: Package,
          attributes: ["name", "description"],
          as: "Package",
        },
        {
          model: SubPackage,
          attributes: ["name", "description"],
          as: "SubPackage",
        },
      ],
      order: [[sortField, order]],
      limit: pageSize,
      offset,
    });

    // Fetch status counts
    const statusCounts = await Ride.findAll({
      where: { initiated_by_driver_id: driverId },
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    // Format counts as an object
    const counts = validStatuses.reduce((acc, status) => {
      const found = statusCounts.find((count) => count.status === status);
      acc[status] = found ? parseInt(found.count, 10) : 0;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        rides,
        counts,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: await Ride.count({ where }),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching my rides:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch rides",
    };
  }
};

// service for cancel the ride before its accept
const canceRide = async (driverId, rideId) => {
  try {
    const ride = await Ride.findOne({
      where: {
        id: rideId,
        initiated_by_driver_id: driverId,
        status: "pending",
      },
    });
    if (!ride) {
      throw new Error(
        "Ride not found, not initiated by this driver, or not in pending status"
      );
    }

    // Update the ride status to cancelled
    await ride.update({ status: "cancelled" });

    return {
      success: true,
      message: "Ride cancelled successfully.",
      data: { rideId },
    };
  } catch (error) {
    console.error("Error cancelling ride:", error);
    return {
      success: false,
      message: error.message || "Failed to cancel ride",
    };
  }
};

module.exports = {
  releaseRide,
  startRide,
  endRide,
  acceptRide,
  canceRide,
  DriverStatus,
  RideDetails,
  getCompletedOrCancelledAndAcceptedRides,
  upsertRide,
  getDriverEarningsHistory,
  fetchMyRides,
};
