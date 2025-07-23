const HomeService = require("../../services/home.service");

// 1. Get Dashboard/Home Data
const getAllHomeData = async (req, res) => {
  const driver_id = req.driver?.id;

  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const todayData = await HomeService.DashboardServiceData(driver_id);
    return res.status(200).json({
      success: true,
      message: "Home data fetched successfully!",
      data: todayData,
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
    const ride = await HomeService.acceptRide(ride_id, driver_id);
    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully!",
      data: ride,
    });
  } catch (error) {
    console.error("Error accepting ride:", error.message);

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
    const updatedDriver = await HomeService.DriverStatus(driver_id, status);
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
    const ride = await HomeService.RideDetails(driver_id, ride_id);
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
    await HomeService.statusRide(driver_id, ride_id, status);
    return res.status(200).json({
      success: true,
      message: `Ride status updated to '${status}'`,
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
  if(!driver_id){
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


module.exports = {
  getAllHomeData,
  acceptRide,
  toggleDriverStatus,
  getRideDetails,
  updateRideStatus,
  getRidesByStatus,
  upsertRide
};
