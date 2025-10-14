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

    // Create a dynamic filename based on status
    let fileName = "All_Ride_Reports.xlsx";
    if (status && status.toLowerCase() !== "all") {
      const capitalizedStatus =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      fileName = `All_${capitalizedStatus}_Ride_Reports.xlsx`;
    }

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
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

    // Fetch the ride first to get customer name
    const ride = await getRideById(rideId);
    if (!ride) {
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });
    }

    const buffer = await exportRideById(rideId);

    // Prepare filename with sanitized customer name
    const customerName = (ride.customer_name || "Unknown").replace(/\s+/g, "_");
    const fileName = `Ride_Report_${customerName}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);
  } catch (error) {
    console.log(error, "error in exportRideByIdController");
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllRidesController,
  getRideByIdController,
  exportAllRidesController,
  exportRideByIdController,
};
