const {
  getAllDrivers,
  getDriverById,
  exportAllDrivers,
  exportDriverById,
} = require("../../services/driverreport.service");

const getAllDriversController = async (req, res) => {
  try {
    const { search = "", status = "", page = 1, limit = 10 } = req.query;
    const data = await getAllDrivers(search, status, parseInt(page), parseInt(limit));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.log(error, "error in getAllDriversController");
  }
};

const getDriverByIdController = async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await getDriverById(driverId);
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
    console.log(error, "error in getDriverByIdController");
  }
};

const exportAllDriversController = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;  // Fixed: Use req.query instead of req.params
    const buffer = await exportAllDrivers(search, status);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=all_driver_reports_${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.log(error, "error in exportAllDriversController");
  }
};

const exportDriverByIdController = async (req, res) => {
  try {
    const { driverId } = req.params;
    const buffer = await exportDriverById(driverId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=driver_report_${driverId}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
    console.log(error, "error in exportDriverByIdController");
  }
};

module.exports = {
  getAllDriversController,
  getDriverByIdController,
  exportAllDriversController,
  exportDriverByIdController,
};