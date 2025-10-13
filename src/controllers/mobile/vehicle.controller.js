const { getDriverById } = require("../../services/driver.service");
const {
  updateDriverCar,
  getDriverCarByDriverId,
  updateDriverDocuments,
} = require("../../services/driverCar.service");

const updateVehicle = async (req, res) => {
  const driver_id = req.driver?.id;

  // Check if the driver is authorized
  if (!driver_id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // Extract data from request
  const { id, car_model, color, license_plate } = req.body;
  const files = req.files;

  // Check if essential data is missing
  if (!id || !car_model || !color || !license_plate) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: id, car_model, color, license_plate",
    });
  }

  try {
    // Try to get the vehicle by driver ID and vehicle ID
    const vehicle = await getDriverCarByDriverId(driver_id, id);

    // If no vehicle is found, return a 404 error
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

    // Call the service to update the vehicle details (this handles the actual update)
    const result = await updateDriverCar(
      driver_id,
      { id, car_model, color, license_plate },
      files
    );

    // If everything goes well, return a success message
    return res.status(200).json({
      success: true,
      message: "Vehicle details updated successfully",
      data: result,
    });
  } catch (error) {
    // Handle specific errors with meaningful messages
    if (error.message === "Invalid car_id") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid car ID provided" });
    }

    if (error.message === "Image upload failed") {
      return res.status(422).json({
        success: false,
        message: "Image upload failed. Please try again.",
      });
    }

    // If the vehicle is not found, send a 404 response
    if (error.message === "Vehicle not found") {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

    // For unexpected server errors, send a generic message
    console.error("Error updating vehicle:", error); // Log the detailed error on the server
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// const uploadDocuments = async (req, res) => {
//   const driver_id = req.driver?.id;
//   if (!driver_id) {
//     return res.status(401).json({ success: false, message: "Unauthorized" });
//   }

//   try {
//     const driver = await getDriverById(driver_id);
//     const driverCar = await getDriverCarByDriverId(driver_id);
//     const files = req.files;

//     const result = await updateDriverDocuments({ driver, driverCar, files });
//     return res.status(200).json({
//       success: true,
//       message: "Documents updated successfully",
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error updating documents:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error", error: error.message });
//   }
// };

const uploadDocuments = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const driver = await getDriverById(driver_id);
    if (!driver) {
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    }
    const driverCar = await getDriverCarByDriverId(driver_id);
    if (!driverCar) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }
    const files = req.files;

    const result = await updateDriverDocuments({ driver, driverCar, files });
    return res.status(200).json({
      success: true,
      message: "Documents updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error updating documents:", error);
    if (error.message.includes("not found")) {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (
      error.message.includes("Invalid file type") ||
      error.message.includes("File too large")
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  updateVehicle,
  uploadDocuments,
};
