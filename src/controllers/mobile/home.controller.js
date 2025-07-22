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
    return res.status(400).json({ message: "Driver ID and Ride ID required." });
  }

  try {
    const ride = await HomeService.acceptRide(ride_id, driver_id);
    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully!",
      data: ride,
    });
  } catch (error) {
    console.error("Error accepting ride:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept ride",
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

module.exports = {
  getAllHomeData,
  acceptRide,
  toggleDriverStatus,
};
