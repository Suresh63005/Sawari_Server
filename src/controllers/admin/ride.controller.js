const rideService = require("../../services/ride.service");
const Settings = require("../../models/settings.model");

// Create Ride
const createRide = async (req, res) => {
  try {
    console.log("createRide request body:", req.body);
    const result = await rideService.createRide(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error("createRide error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// Update Ride
const updateRide = async (req, res) => {
  try {
    console.log("updateRide request:", { id: req.params.id, body: req.body });
    const result = await rideService.updateRide(req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error("updateRide error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// Get All Rides
const getAllRides = async (req, res) => {
  try {
    console.log("getAllRides query:", req.query);
    const result = await rideService.getAllRides(req.query);
    res.status(200).json(result);
  } catch (error) {
    console.error("getAllRides error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// Get Ride by ID
const getRideById = async (req, res) => {
  try {
    console.log("getRideById request:", { id: req.params.id });
    const result = await rideService.getRideById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("getRideById error:", error.message);
    res.status(404).json({ error: error.message });
  }
};

// Get Available Cars and Prices
const getAvailableCarsAndPrices = async (req, res) => {
  try {
    console.log("yyyyyyyyyyyyyyyyyyyyy", req.params);
    const { package_id, sub_package_id } = req.params;
    if (!package_id || !sub_package_id) {
      return res.status(400).json({
        error: "Missing required query parameters: package_id, sub_package_id",
      });
    }
    const result = await rideService.getAvailableCarsAndPrices(
      package_id,
      sub_package_id
    );
    // Fetch tax rate from Settings
    const settings = await Settings.findOne();
    const taxRate = settings ? parseFloat(settings.tax_rate) || 0 : 0;
    // Include tax_rate in the response
    const responseData = result.data.map((item) => ({
      ...item,
      tax_rate: taxRate,
    }));
    res.status(200).json({ data: responseData });
  } catch (error) {
    console.error("getAvailableCarsAndPrices error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createRide,
  updateRide,
  getAllRides,
  getRideById,
  getAvailableCarsAndPrices,
};
