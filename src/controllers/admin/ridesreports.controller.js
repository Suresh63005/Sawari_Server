const {
  getAllRides,
  getRideById,
  exportAllRides,
  exportRideById,
} = require("../../services/ridesreport.service");

const getAllRidesController = async (req, res) => {
  try {
    const { search = "", status = "", page = 1, limit = 10 } = req.query;
    const data = await getAllRides(
      search,
      status,
      parseInt(page),
      parseInt(limit)
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.log(error, "error in getAllRidesController");
  }
};

const getRideByIdController = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await getRideById(rideId);
    res.status(200).json({ success: true, data: ride });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
    console.log(error, "error in getRideByIdController");
  }
};

const exportAllRidesController = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const buffer = await exportAllRides(search, status);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=All_Ride_Reports_${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.log(error, "error in exportAllRidesController");
  }
};

const exportRideByIdController = async (req, res) => {
  try {
    const { rideId } = req.params;
    const buffer = await exportRideById(rideId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Ride_Report_${rideId}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
    console.log(error, "error in exportRideByIdController");
  }
};

module.exports = {
  getAllRidesController,
  getRideByIdController,
  exportAllRidesController,
  exportRideByIdController,
};
