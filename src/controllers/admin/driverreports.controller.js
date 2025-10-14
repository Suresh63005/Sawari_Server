const {
  getAllDrivers,
  getDriverById,
  exportAllDrivers,
  exportDriverById,
} = require("../../services/driverreport.service");

const getAllDriversController = async (req, res) => {
  try {
    const { search = "", status = "", page = 1, limit = 10 } = req.query;
    const data = await getAllDrivers(
      search,
      status,
      parseInt(page),
      parseInt(limit)
    );
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
    const { search = "", status = "" } = req.query;

    const buffer = await exportAllDrivers(search, status);

    // Create a dynamic filename based on status
    let fileName = "All_Driver_Reports.xlsx";
    if (status && status.toLowerCase() !== "all") {
      // Capitalize first letter for neatness
      const capitalizedStatus =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      fileName = `All_${capitalizedStatus}_Driver_Reports.xlsx`;
    }

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
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
    const driver = await getDriverById(driverId); // Fetch driver first to get name

    if (!driver) {
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    }

    const buffer = await exportDriverById(driverId);

    // Sanitize driver name for filename (remove spaces/special chars)
    const firstName = driver.first_name?.replace(/\s+/g, "_") || "Unknown";
    const lastName = driver.last_name?.replace(/\s+/g, "_") || "";
    const fileName = `Driver_Report_${firstName}_${lastName}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.log(error, "error in exportDriverByIdController");
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllDriversController,
  getDriverByIdController,
  exportAllDriversController,
  exportDriverByIdController,
};
