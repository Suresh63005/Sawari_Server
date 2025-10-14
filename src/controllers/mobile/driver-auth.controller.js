const { deleteFromS3 } = require("../../config/fileUpload.aws");
const driverService = require("../../services/driver.service");
const driverCarService = require("../../services/driverCar.service");
const walletService = require("../../services/wallet.service");
const moment = require("moment");

const verifyMobile = async (req, res) => {
  try {
    console.log("🔐 VERIFY endpoint hit");

    const { phone, token, email, social_login } = req.body;
    const result = await driverService.verifyDriverMobile(
      phone,
      token,
      email,
      social_login
    );
    res.status(200).json({ result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const blockDriverByIdentifier = async (req, res) => {
  const { phone, email } = req.body;
  console.log(req.body, "from bodyyyyyyyyyyyyyyyyyyyyyyyyyyyy");
  try {
    if ((phone && email) || (!phone && !email)) {
      return res.status(400).json({
        message: "Provide either phone or email, not both or neither.",
      });
    }
    const result = await driverService.blockDriverByPhoneOrEmail(phone, email);
    console.log(result, "ressssssssssssssssssssssssssss");
    res.status(200).json({
      message: "Driver status updated to blocked",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Driver Account Details
const driverAccountDetails = async (req, res) => {
  try {
    const driverId = req.driver?.id;
    if (!driverId) {
      return res.status(401).json({ message: "Your are not authorized." });
    }

    // Fetch driver and vehicle details
    const driver = await driverService.getDriverById(driverId);
    const vehicle = await driverCarService.getDriverCarByDriverId(driverId);
    const walletBalance = await walletService.getWalletBalance(driverId);
    driver.wallet_balance = walletBalance;

    return res.status(200).json({
      message: "Driver account details fetched successfully.",
      driver,
      vehicle,
      walletBalance,
    });
  } catch (error) {
    console.error("Error fetching driver account:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const driverId = req.driver.id;

    const activeRides = await driverService.checkActiveRide(driverId);
    if (activeRides.length > 0) {
      throw new Error("Cannot deactivate account with active rides");
    }
    const result = await driverService.deactivateDriver(driverId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const checkStatus = async (req, res) => {
  const driverId = req.driver.id;
  if (!driverId) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    // Fetch driver data
    const driver = await driverService.getDriverById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    }
    console.log("Driver data:", driver);

    // Fetch vehicle data (may return null if no vehicle exists)
    const vehicle = await driverCarService.getDriverCarByDriverId(driver.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }
    console.log("Vehicle data:", vehicle || "No vehicle found");

    return res.status(200).json({
      success: true,
      message: vehicle
        ? "Driver and vehicle data fetched successfully"
        : "Driver data fetched successfully (no vehicle data available)",
      data: { driver, vehicle },
    });
  } catch (error) {
    console.error("checkStatus error:", error);
    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
    });
  }
};

const getStatuses = async (req, res) => {
  try {
    const driverId = req.driver.id;
    if (!driverId) {
      return res.status(401).json({ success: false, message: "UnAuthorized" });
    }
    const driver = await driverService.getStatusByDriver(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Driver statuses fetched successfully",
      data: driver,
    });
  } catch (error) {
    console.error("getStatuses error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const updateStatuses = async (req, res) => {
  try {
    const driverId = req.driver.id;
    if (!driverId) {
      return res.status(400).json({ success: false, message: "Un Authorized" });
    }
    const { ride_request, system_alerts, earning_updates } = req.body;
    const updatedDriver = await driverService.updateDriverProfile(driverId, {
      ride_request,
      system_alerts,
      earning_updates,
    });

    if (!updatedDriver) {
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Driver statuses updated successfully",
      data: updatedDriver,
    });
  } catch (error) {
    console.error("updateStatuses error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Controller to update one signal id
const updateOneSignalId = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { oneSignalId } = req.body;

    if (!driverId || !oneSignalId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID and OneSignal ID are required",
      });
    }

    const updatedDriver = await driverService.updateOneSignalPlayerId(
      driverId,
      oneSignalId
    );
    return res.status(200).json({
      success: true,
      message: "OneSignal ID updated successfully",
      data: updatedDriver,
    });
  } catch (error) {
    console.error("updateOneSignalId error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Controller to delete one signal id
const deleteOneSignalId = async (req, res) => {
  try {
    const driverId = req.driver.id;

    if (!driverId) {
      return res
        .status(401)
        .json({ success: false, message: "Driver ID is required" });
    }

    const updatedDriver = await driverService.deleteOneSignalPlayerId(driverId);
    if (!updatedDriver) {
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    }
    return res.status(200).json({
      success: true,
      message: "OneSignal ID deleted successfully",
      data: updatedDriver,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateProfileAndCarDetails = async (req, res) => {
  try {
    console.log("=== Start: updateProfileAndCarDetails ===");
    const driverId = req?.driver?.id;
    console.log("Driver ID:", driverId);
    if (!driverId) {
      return res
        .status(400)
        .json({ error: "Driver ID is missing in the request." });
    }

    const updatedDriverData = { ...req.body };
    console.log("Request Body (updatedDriverData):", updatedDriverData);

    // Fetch driver from DB to check for existing fields
    const driver = await driverService.getDriverById(driverId);
    console.log("Fetched Driver Data from DB:", driver);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const profileFields = [
      "profile_pic",
      "emirates_doc_front",
      "emirates_doc_back",
      "license_front",
      "license_back",
    ];
    let hasVerificationFiles = false;

    // Loop through each field and handle S3 deletion if necessary
    for (const field of profileFields) {
      if (req.body[field]) {
        console.log(`Processing ${field} URL:`, req.body[field]);
        // If old file exists and is different, delete it
        if (driver?.[field] && driver[field] !== req.body[field]) {
          console.log(`Deleting old ${field} from S3:`, driver[field]);
          await deleteFromS3(driver[field]);
        }
        updatedDriverData[field] = req.body[field];

        // Handle the verification status for docs
        if (["emirates_doc_front", "emirates_doc_back"].includes(field)) {
          updatedDriverData.emirates_verification_status = "pending";
          hasVerificationFiles = true;
          console.log(
            `Set emirates_verification_status to 'pending' due to new ${field}`
          );
        }
        if (["license_front", "license_back"].includes(field)) {
          updatedDriverData.license_verification_status = "pending";
          hasVerificationFiles = true;
          console.log(
            `Set license_verification_status to 'pending' due to new ${field}`
          );
        }
      }
    }
    console.log("All profile fields processed:", updatedDriverData);

    // Handle the languages field
    // Handle the languages field
    if (
      updatedDriverData.languages &&
      typeof updatedDriverData.languages === "string"
    ) {
      try {
        updatedDriverData.languages = JSON.parse(updatedDriverData.languages);
      } catch (error) {
        console.error("Invalid JSON in languages field", error);
        updatedDriverData.languages = [];
      }
    } else if (!updatedDriverData.languages) {
      updatedDriverData.languages = [];
    }
    // Add this to ensure database storage as JSON string
    if (Array.isArray(updatedDriverData.languages)) {
      updatedDriverData.languages = JSON.stringify(updatedDriverData.languages);
      console.log(
        "Converted languages to JSON string for storage:",
        updatedDriverData.languages
      );
    }

    // Ensure the dob is properly formatted, it should be a valid date
    if (updatedDriverData.dob) {
      updatedDriverData.dob = moment(
        updatedDriverData.dob,
        "'DD-MM-YYYY"
      ).toDate();
    }

    // Set approval and status based on file verification
    if (hasVerificationFiles) {
      updatedDriverData.is_approved = false;
      updatedDriverData.status = "inactive";
      console.log(
        "Set is_approved to false and status to 'inactive' in Driver due to new verification files"
      );
    } else {
      delete updatedDriverData.is_approved;
      delete updatedDriverData.status;
      console.log(
        "Preserving existing is_approved and status values in Driver"
      );
    }

    // Update driver profile data if any changes
    const hasDriverData = Object.keys(updatedDriverData).length > 0;
    if (hasDriverData) {
      await driverService.updateDriverProfile(driverId, updatedDriverData);
      console.log("Driver profile updated in DB.");
    } else {
      console.log("No driver data provided, proceeding to car data");
    }

    const updatedDriver = await driverService.getDriverById(driverId);

    // Handle car data
    const carData = {
      car_id: req.body.car_id,
      license_plate: req.body.license_plate,
      color: req.body.color,
      car_photos: Array.isArray(req.body.car_photos) ? req.body.car_photos : [],
    };
    console.log("Initial car data:", carData);

    const hasCarFields =
      carData.car_id ||
      carData.license_plate ||
      carData.color ||
      carData.car_photos.length > 0;
    if (!hasCarFields) {
      console.log("Skipping car update: No car-related data provided.");
      return res.status(200).json({
        message: "Driver profile updated successfully. No car data provided.",
        driver: updatedDriver,
        vehicle: null,
      });
    }

    const existingCar = await driverCarService.getDriverCarByDriverId(driverId);
    if (!existingCar) {
      const requiredFields = ["car_id", "license_plate"];
      const missingFields = requiredFields.filter((field) => !carData[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required car fields for new car record: ${missingFields.join(", ")}`,
        });
      }
    }

    const currentCar = existingCar || {};
    carData.car_photos = Array.isArray(carData.car_photos)
      ? carData.car_photos
      : [];
    if (
      carData.car_photos.length > 0 &&
      Array.isArray(currentCar.car_photos) &&
      currentCar.car_photos.length > 0
    ) {
      console.log("Deleting old car photos from S3:", currentCar.car_photos);
      await Promise.all(
        currentCar.car_photos.map((photo) => deleteFromS3(photo))
      );
    }

    let hasCarVerificationFiles = false;
    carData.rc_doc_status = currentCar.rc_doc_status;
    carData.insurance_doc_status = currentCar.insurance_doc_status;

    if (req.body.rc_doc) {
      console.log("Processing rc_doc URL:", req.body.rc_doc);
      if (currentCar.rc_doc && currentCar.rc_doc !== req.body.rc_doc) {
        console.log("Deleting old rc_doc from S3:", currentCar.rc_doc);
        await deleteFromS3(currentCar.rc_doc);
      }
      carData.rc_doc = req.body.rc_doc;
      carData.rc_doc_status = "pending";
      hasCarVerificationFiles = true;
      console.log("Set rc_doc_status to 'pending'");
    }
    if (req.body.rc_doc_back) {
      console.log("Processing rc_doc_back URL:", req.body.rc_doc_back);
      if (
        currentCar.rc_doc_back &&
        currentCar.rc_doc_back !== req.body.rc_doc_back
      ) {
        console.log(
          "Deleting old rc_doc_back from S3:",
          currentCar.rc_doc_back
        );
        await deleteFromS3(currentCar.rc_doc_back);
      }
      carData.rc_doc_back = req.body.rc_doc_back;
      carData.rc_doc_status = "pending";
      hasCarVerificationFiles = true;
      console.log("Set rc_doc_status to 'pending'");
    }
    if (req.body.insurance_doc) {
      console.log("Processing insurance_doc URL:", req.body.insurance_doc);
      if (
        currentCar.insurance_doc &&
        currentCar.insurance_doc !== req.body.insurance_doc
      ) {
        console.log(
          "Deleting old insurance_doc from S3:",
          currentCar.insurance_doc
        );
        await deleteFromS3(currentCar.insurance_doc);
      }
      carData.insurance_doc = req.body.insurance_doc;
      carData.insurance_doc_status = "pending";
      hasCarVerificationFiles = true;
      console.log("Set insurance_doc_status to 'pending'");
    }

    if (hasCarVerificationFiles) {
      carData.is_approved = false;
      updatedDriverData.status = "inactive";
      console.log(
        "Set is_approved to false in DriverCar and status to 'inactive' in Driver due to new car verification files"
      );
    } else {
      delete carData.is_approved;
      console.log("Preserving existing is_approved value in DriverCar");
    }

    if (hasCarVerificationFiles && !hasDriverData) {
      await driverService.updateDriverProfile(driverId, { status: "inactive" });
      console.log(
        "Driver status updated to 'inactive' due to car verification files"
      );
    }

    const vehicle = await driverCarService.upsertDriverCar(driverId, carData);
    console.log("DriverCar upsert result:", vehicle);
    return res.status(200).json({
      message: "Profile and Car details updated successfully",
      driver: updatedDriver,
      vehicle,
    });
  } catch (error) {
    console.error("Error during profile and car update:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  verifyMobile,
  blockDriverByIdentifier,
  updateProfileAndCarDetails,
  driverAccountDetails,
  deleteAccount,
  checkStatus,
  getStatuses,
  updateStatuses,
  updateOneSignalId,
  deleteOneSignalId,
};
