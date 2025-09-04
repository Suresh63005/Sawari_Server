const { Op, Sequelize } = require("sequelize");
const Ride = require("../models/ride.model")
const Earnings = require("../models/earnings.model")
const Driver = require("../models/driver.model")
const DriverCar = require("../models/driver-cars.model");
const Package = require("../models/package.model");
const SubPackage = require("../models/sub-package.model");
const Car = require("../models/cars.model");
const Settings = require("../models/settings.model");

const acceptRide = async (ride_id, driver_id) => {
    const ride = await Ride.findOne({
        where: {
            id: ride_id,
            status: "pending",
            driver_id: {
                [Op.or]: [null, ""], // handles both null and empty string
            }
        }
    });

    if (!ride) {
        throw new Error("Ride is not available or already accepted.");
    }

    ride.driver_id = driver_id;
    ride.status = "accepted";
    await ride.save();

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
}

const RideDetails = async (driver_id, ride_id) => {
    console.log(driver_id, ride_id, "hhhhhhhhhhhhhhhhhhhhhhhhh")
    

    if (!ride) {
        throw new Error("Ride not found");
    }

    return ride;
};



const getCompletedOrCancelledAndAcceptedRides = async (driver_id, status) => {
    if (!["accepted", "completed", "cancelled"].includes(status)) {
        throw new Error("Invalid status. Allowed values: 'accepted', 'cancelled','completed");
    }
    const rides = await Ride.findAll({
        where: {
            [Op.or]: [
                { driver_id: driver_id },
                { initiated_by_driver_id: driver_id }],
            status: status
        },
        order: [["updatedAt", "DESC"]]
    });

    return rides;
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
    package_id,
    subpackage_id,
    car_id,
    Price,
    Total
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

    await ride.update({
      initiated_by_driver_id: driver_id,
      customer_name,
      phone,
      email,
      car_model,
      pickup_time,
      pickup_address,
      pickup_location: JSON.stringify(pickup_location), // stringify object
      drop_location: JSON.stringify(drop_location),     // stringify object
      drop_address,
      ride_type,
      accept_time,
      package_id,
      subpackage_id,
      car_id,
      Price,
      Total,
    });

    return ride;
  } else {
    const newRide = await Ride.create({
      initiated_by_driver_id: driver_id,
      customer_name,
      phone,
      email,
      car_model,
      pickup_time,
      pickup_address,
      pickup_location: JSON.stringify(pickup_location),
      drop_location: JSON.stringify(drop_location),
      ride_type,
      accept_time,
      package_id,
      subpackage_id,
      car_id,
      Price,
      Total,
    });

    return newRide;
  }
};




const getDriverEarningsHistory = async (driver_id, filters) => {
  const where = { driver_id };

  // ------------------- FILTERS -------------------
  // Filter by months
  if (filters?.months?.length > 0) {
    const monthConditions = filters.months.map(month => {
      const [year, monthNum] = month.split("-");
      return {
        [Op.and]: [
          Sequelize.where(Sequelize.fn("YEAR", Sequelize.col("createdAt")), year),
          Sequelize.where(Sequelize.fn("MONTH", Sequelize.col("createdAt")), monthNum),
        ]
      };
    });
    where[Op.or] = [...(where[Op.or] || []), ...monthConditions];
  }

  // Filter by days
  if (filters?.days?.length > 0) {
    where[Op.or] = [
      ...(where[Op.or] || []),
      {
        [Op.or]: filters.days.map(day => ({
          [Op.and]: [
            Sequelize.where(Sequelize.fn("DATE", Sequelize.col("createdAt")), day)
          ]
        }))
      }
    ];
  }

  // Filter by years
  if (filters?.years?.length > 0) {
    where[Op.or] = [
      ...(where[Op.or] || []),
      {
        [Op.or]: filters.years.map(year =>
          Sequelize.where(Sequelize.fn("YEAR", Sequelize.col("createdAt")), year)
        )
      }
    ];
  }

  // ------------------- HISTORY DATA -------------------
  const history = await Earnings.findAll({
    where,
    order: [["createdAt", "DESC"]],
  });

  // ------------------- TOTAL CALCULATIONS -------------------
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const endOfToday = new Date(today.setHours(23, 59, 59, 999));

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

  // Aggregate Queries
  const todayTotal = await Earnings.sum("amount", {
    where: {
      driver_id,
      createdAt: { [Op.between]: [startOfToday, endOfToday] }
    }
  }) || 0;

  const weekTotal = await Earnings.sum("amount", {
    where: {
      driver_id,
      createdAt: { [Op.between]: [startOfWeek, endOfWeek] }
    }
  }) || 0;

  const monthTotal = await Earnings.sum("amount", {
    where: {
      driver_id,
      createdAt: { [Op.between]: [startOfMonth, endOfMonth] }
    }
  }) || 0;

  return {
    history,
    totals: {
      today: todayTotal,
      week: weekTotal,
      month: monthTotal
    }
  };
};


module.exports = { getDriverEarningsHistory };


// Service for relieving driver from a ride
const releaseRide = async (rideId, driver_id) => {
    const ride = await Ride.findOne({
        where: {
            id: rideId,
            driver_id: driver_id,
            status: "accepted"
        }
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
const startRide = async (rideId, driver_id) => {
    const ride = await Ride.findOne({
        where: {
            id: rideId,
            driver_id: driver_id,
            status: "accepted"
        }
    });

    if (!ride) {
        throw new Error("Ride not found or cannot be started.");
    }

    ride.status = "on-route";
    await ride.save();

    return ride;
};

// service for end the ride
const endRide = async (rideId, driver_id) => {
    const ride = await Ride.findOne({
        where: {
            id: rideId,
            driver_id: driver_id,
            status: "on-route"
        }
    });

    if (!ride) {
        throw new Error("Ride not found or cannot be ended.");
    }

    ride.status = "completed";
    ride.dropoff_time = new Date();
    await ride.save();

    // get tax/commisstion percentage from settings table
    const settings = await Settings.findOne();
    const percentage = settings?.tax_rate || 0;

    // Calculate commission and driver's earnings
    const amount = parseFloat(ride.Total) || 0;
    const commission = (amount * percentage) / 100;

    // create earnings record
    const earnings = await Earnings.create({
        driver_id: driver_id,
        ride_id: ride.id,
        amount,
        commission,
        percentage,
        // payment_method:ride.payment_method,
        status: "pending"
    })
    return {ride,earnings};
};


module.exports = {
    releaseRide,
    startRide,
    endRide,
    acceptRide,
    DriverStatus,
    RideDetails,
    getCompletedOrCancelledAndAcceptedRides,
    upsertRide,
    getDriverEarningsHistory
}