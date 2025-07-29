const rideService = require("../../services/ride.service");

exports.getAllRides = async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;

    const result = await rideService.getAllRidesAdmin({ search, status, page, limit });

    return res.status(200).json({
      success: true,
      message: "Rides fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in getAllRides:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rides",
      error: error.message,
    });
  }
};
