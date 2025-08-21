const { Op } = require("sequelize");
const HomeService = require("../../services/home.service");
const { conditionalRides, getRideById, getRideByIdData } = require("../../services/ride.service");
const { getEarningsSum } = require("../../services/earnings.service");
const { driverProfileWithCar, getDriverById } = require("../../services/driver.service");

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
    const availableRides = await conditionalRides({
      where: {
        driver_id: null,
        status: "pending"
      },
      attributes: [
        "customer_name", "email", "phone", "pickup_address", "pickup_location",
        "drop_location", "scheduled_time", "pickup_time", "dropoff_time"
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

  try {
    const rideGetById = await getRideById(ride_id);
    // console.log(rideGetById,"iddddddddddddddddddddddddd")
    if (!rideGetById) {
      return res.status(404).json({
        success: false,
        message: "Ride not found."
      });
    }

    rideGetById.driver_id = driver_id;
    rideGetById.status = "accepted";
    const result = await rideGetById.save();
    
    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully!",
      data: result,
    });
  } catch (error) {
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
  const { status } = req.body; // expecting "active" or "inactive"

  if (!driver_id || !status) {
    return res.status(400).json({ message: "Driver ID and status required." });
  }

  try {
    const driverGetById = await getDriverById(driver_id);
    driverGetById.status=status
    const result=await driverGetById.save()
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
      ride_type,
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
      ride_type
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
      message: "Server error",
    });
  }
};

const earningsHistory = async (req, res) => {
  const driver_id = req.driver?.id;
  const sortMonth = req.query.month;

  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const earnings = await HomeService.getDriverEarningsHistory(driver_id, sortMonth);
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
}


module.exports = {
  getAllHomeData,
  acceptRide,
  toggleDriverStatus,
  getRideDetails,
  updateRideStatus,
  getRidesByStatus,
  upsertRide,
  earningsHistory
};
