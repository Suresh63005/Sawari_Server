const { Op } = require("sequelize");
const HomeService = require("../../services/home.service");
const { conditionalRides, getRideById, getRideByIdData } = require("../../services/ride.service");
const { getEarningsSum } = require("../../services/earnings.service");
const { driverProfileWithCar, getDriverById } = require("../../services/driver.service");
const Package = require("../../models/package.model");
const SubPackage = require("../../models/sub-package.model");
const Ride = require("../../models/ride.model");
const driverCarService = require('../../services/driverCar.service'); 
const Car = require("../../models/cars.model");
const Driver = require("../../models/driver.model");
const {Transaction} = require('sequelize');
const { sequelize } = require("../../models");

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

    // 1. Get Today's Completed Rides
    const todayRides = await conditionalRides({
      where: {
        driver_id,
        status: "completed",
        updatedAt: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    });

    // 2. Get Today's Earnings
    const todayEarnings = await getEarningsSum({
      where: {
        driver_id,
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        },
        status: "processed"
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
        "customer_name", "email", "phone", "pickup_address", "pickup_location",
        "drop_location", "scheduled_time", "pickup_time", "dropoff_time"
      ],
      limit: 10,
      order: [["scheduled_time", "ASC"]]
    });

    // 5. Available Rides (unassigned)
    const driverCar = await driverCarService.getDriverCarByDriverId(driver_id);
    if(!driverCar){
      return res.status(404).json({
        success:false,
        message:"Driver has no registered car."
      })
    }

    const availableRides = await conditionalRides({
      where: {
        driver_id: null,
        status: "pending",
      },
      attributes: [
        "id","customer_name", "email", "phone", "pickup_address", "pickup_location",
        "drop_location", "scheduled_time", "pickup_time", "dropoff_time","Price"
      ],
      include:[
        {
          model:Car,
          as:"Car",
          attributes:["id","brand","model"],
          where: {
            [Op.or]: [
              { model: driverCar.car_model },   // correct case
              { brand: driverCar.car_model }    // fallback if stored wrongly
            ]
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
  const driver_id = req.driver?.id;
  const { ride_id } = req.body;

  if (!driver_id || !ride_id) {
    return res.status(400).json({
      success: false,
      message: "Driver ID and Ride ID are required."
    });
  }

  const t = await sequelize.transaction({
    isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ
  })

  try {
    // 1. Fetch ride
    const ride = await getRideById(ride_id);
    // console.log(rideGetById,"iddddddddddddddddddddddddd")
    if (!ride) {
      await t.rollback()
      return res.status(404).json({
        success: false,
        message: "Ride not found."
      });
    }

    if(ride.driver_id || ride.status !== "pending"){
      await t.rollback()
      return res.status(409).json({
        success: false,
        message: "Ride already accepted by another driver or not available."
      });
    }

    // 2. Fetch driver wallet
    const driver = await Driver.findByPk(driver_id,{
      attributes:["id","wallet_balance"],
      transaction:t,
      lock:t.LOCK.UPDATE
    })

    if(!driver){
      await t.rollback()
      return res.status(404).json({
        success:false,
        message:"Driver not found."
      })
    }

    // 3. Check the wallet balance vs ride total
    if(!driver.wallet_balance || parseFloat(driver.wallet_balance) < parseFloat(ride.Total)) {
      await t.rollback()
      return res.status(403).json({
        success:false,
        message:"Insufficient wallet balance to accept this ride."
      })
    }

    // 4. Update ride
    await ride.update(
      { driver_id, status: "accepted", accept_time: new Date() },
      { where: { id: ride_id } },
      { transaction: t }
    );
    await t.commit()
    
    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully!",
      data: ride,
    });
  } catch (error) {
    await t.rollback()
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
    driverGetById.availability_status=status
    const result=await driverGetById.save();
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
    const ride= await getRideByIdData(driver_id, ride_id);
    if (ride.status !== "accepted") {
        throw new Error("Ride must be in 'accepted' status to start or cancel");
    }

    ride.status = status;
    await ride.save();

    return res.status(200).json({
      success: true,
      message: `Ride status updated to '${status}'`,
      data:ride
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
      message: `Rides with status '${status}' fetched successfully`,
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
      ride_type,
      accept_time,
      package_id,
      subpackage_id,
      car_id,
      Price,
      Total
    } = req.body;

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
      ride_type,
      accept_time,
      package_id,
      subpackage_id,
      car_id,
      Price,
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

module.exports = {
  getAllHomeData,
  acceptRide,
  startRide,
  endRide,
  toggleDriverStatus,
  releaseDriverFromRide,
  getRideDetails,
  updateRideStatus,
  getRidesByStatus,
  upsertRide,
  earningsHistory
};
