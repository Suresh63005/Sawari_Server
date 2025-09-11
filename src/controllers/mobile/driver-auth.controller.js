const { uploadToS3, deleteFromS3 } = require('../../config/fileUpload.aws');
const driverService = require('../../services/driver.service');
const driverCarService = require('../../services/driverCar.service');
// const checkActiveRide = require('../../services/ride.service');
const walletService =require('../../services/wallet.service');

const verifyMobile = async (req, res) => {
    try {
        console.log("🔐 VERIFY endpoint hit");

        const { phone, token, email, social_login } = req.body
        const result = await driverService.verifyDriverMobile(phone, token, email, social_login);
        res.status(200).json({ result })
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// const updateProfile = async(req,res)=>{
//     try {
//         const driverId = req.driver.id;
//         const driver = await driverService.updateDriverProfile(driverId);
//         const updatedData = {...req.body}
//         // Handle files: upload new, delete old if replaced
//         const fields = ['profile_pic', 'emirates_doc_front', 'emirates_doc_back', 'license_front', 'license_back'];
//         for (const field of fields) {
//             if (req.files && req.files[field]) {
//                 const uploadedUrl = await uploadToS3(req.files[field][0], 'drivers');

//                 // Delete old if exists and different
//                 if (driver[field] && driver[field] !== uploadedUrl) {
//                 await deleteFromS3(driver[field]);
//                 }

//                 updatedData[field] = uploadedUrl;

//                 // Reset verification if Emirates or License changed
//                 if (['emirates_doc_front', 'emirates_doc_back'].includes(field)) {
//                 updatedData.emirates_verification_status = 'pending';
//                 }
//                 if (['license_front', 'license_back'].includes(field)) {
//                 updatedData.license_verification_status = 'pending';
//                 }
//             }
//         }


//         if (updatedData.languages) {
//             try {
//                 const lang = JSON.parse(updatedData.languages);
//                 if (Array.isArray(lang)) {
//                 updatedData.languages = lang;
//                 }
//             } catch (error) {
//                 console.warn('Invalid languages format, expected JSON array string');
//             }
//         }

//         const result = await driverService.updateDriverProfile(driverId,updatedData)
//         res.status(200).json(result);
//     } catch (error) {
//         console.error('Error in updateProfile:', err.message);
//         res.status(400).json({ error: err.message });
//     }
// }



const updateProfileAndCarDetails = async (req, res) => {
  try {
    console.log("=== Start: updateProfileAndCarDetails ===");
    // Step 1: Get driver ID from request
    const driverId = req?.driver?.id;
    console.log("Driver ID:", driverId);
    if (!driverId) {
      return res.status(400).json({ error: "Driver ID is missing in the request." });
    }

    // Step 2: Clone and log request body
    const updatedDriverData = { ...req.body };
    console.log("Request Body (updatedDriverData):", updatedDriverData);

    // Step 3: Fetch driver from DB
    const driver = await driverService.getDriverById(driverId);
    console.log("Fetched Driver Data from DB:", driver);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Step 4: Handle profile-related file uploads
    const profileFields = [
      "profile_pic",
      "emirates_doc_front",
      "emirates_doc_back",
      "license_front",
      "license_back",
    ];
    let hasVerificationFiles = false; // Track if verification-related files are uploaded

    for (const field of profileFields) {
      if (req.files?.[field]) {
        if (!req.files[field][0].size) {
          console.log(`Ignoring empty ${field} upload`);
          continue; // Skip empty file uploads
        }
        console.log(`Uploading ${field}...`);
        const uploadedUrl = await uploadToS3(req.files[field][0], "drivers");
        console.log(`${field} uploaded to S3:`, uploadedUrl);

        // If old file exists and is different, delete it
        if (driver?.[field] && driver[field] !== uploadedUrl) {
          console.log(`Deleting old ${field} from S3:`, driver[field]);
          await deleteFromS3(driver[field]);
        }
        updatedDriverData[field] = uploadedUrl;

        // Update verification statuses only for verification-related documents
        if (["emirates_doc_front", "emirates_doc_back"].includes(field)) {
          updatedDriverData.emirates_verification_status = "pending";
          hasVerificationFiles = true;
          console.log(`Set emirates_verification_status to 'pending' due to new ${field} upload`);
        }
        if (["license_front", "license_back"].includes(field)) {
          updatedDriverData.license_verification_status = "pending";
          hasVerificationFiles = true;
          console.log(`Set license_verification_status to 'pending' due to new ${field} upload`);
        }
      }
    }
    console.log("All profile files processed. Current uploaded file list:", req.files);

    // Step 5: Parse languages field (if exists)
    if (updatedDriverData.languages) {
      try {
        const parsedLanguages = JSON.parse(updatedDriverData.languages);
        updatedDriverData.languages = Array.isArray(parsedLanguages) ? parsedLanguages : [];
        console.log("Parsed languages:", updatedDriverData.languages);
      } catch (err) {
        console.warn("Invalid JSON in languages field. Setting to empty array.");
        updatedDriverData.languages = [];
      }
    }

    // Step 6: Set driver status and is_approved only if verification files are uploaded
    if (hasVerificationFiles) {
      updatedDriverData.is_approved = false; // Reset for re-verification
      updatedDriverData.status = "inactive"; // Set driver status to inactive
      console.log("Set is_approved to false and status to 'inactive' in Driver due to new verification files");
    } else {
      delete updatedDriverData.is_approved; // Preserve existing is_approved
      delete updatedDriverData.status; // Preserve existing status
      console.log("Preserving existing is_approved and status values in Driver");
    }

    // Step 7: Validate if any driver data is provided
    const hasDriverData = Object.keys(updatedDriverData).length > 0 || profileFields.some((field) => req.files?.[field]);
    if (hasDriverData) {
      // Update driver profile in DB
      await driverService.updateDriverProfile(driverId, updatedDriverData);
      console.log("Driver profile updated in DB.");
    } else {
      console.log("No driver data provided, proceeding to car data");
    }

    const updatedDriver = await driverService.getDriverById(driverId);

    // Step 8: Handle Vehicle/Car info
    const carData = {
      car_id: req.body.car_id,
      license_plate: req.body.license_plate,
      color: req.body.color,
    };
    console.log("Initial car data:", carData);

    // Step 9: Validate required fields for new DriverCar entry
    const requiredFields = ["car_id", "license_plate"];
    const missingFields = requiredFields.filter((field) => !carData[field]);
    const hasCarFiles = req.files?.rc_doc || req.files?.rc_doc_back || req.files?.insurance_doc || req.files?.car_photos;
    if (missingFields.length > 0 && !hasCarFiles) {
      console.log("Skipping car update: No car-related data provided.");
      return res.status(200).json({
        message: "Driver profile updated successfully. No car data provided.",
        driver: updatedDriver,
        vehicle: null,
      });
    }
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required car fields: ${missingFields.join(", ")}`,
      });
    }

    // Step 10: Handle car photo uploads
    if (req.files?.car_photos) {
      if (req.files.car_photos.some((file) => !file.size)) {
        console.log("Ignoring empty car_photos upload");
      } else {
        console.log("Uploading car photos...");
        const carPhotos = await Promise.all(
          req.files.car_photos.map((file) => uploadToS3(file, "driver-cars"))
        );
        carData.car_photos = carPhotos;
        console.log("Uploaded car photos:", carPhotos);
      }
    }

    // Step 11: Upload car documents and update specific statuses
    let hasCarVerificationFiles = false;
    if (req.files?.rc_doc) {
      if (!req.files.rc_doc[0].size) {
        console.log("Ignoring empty rc_doc upload");
      } else {
        console.log("Uploading RC document...");
        carData.rc_doc = await uploadToS3(req.files.rc_doc[0], "driver-cars");
        carData.rc_doc_status = "pending";
        hasCarVerificationFiles = true;
        console.log("Uploaded RC document and set rc_doc_status to 'pending':", carData.rc_doc);
      }
    }
    if (req.files?.rc_doc_back) {
      if (!req.files.rc_doc_back[0].size) {
        console.log("Ignoring empty rc_doc_back upload");
      } else {
        console.log("Uploading RC document back...");
        carData.rc_doc_back = await uploadToS3(req.files.rc_doc_back[0], "driver-cars");
        carData.rc_doc_status = "pending";
        hasCarVerificationFiles = true;
        console.log("Uploaded RC document back and set rc_doc_status to 'pending':", carData.rc_doc_back);
      }
    }
    if (req.files?.insurance_doc) {
      if (!req.files.insurance_doc[0].size) {
        console.log("Ignoring empty insurance_doc upload");
      } else {
        console.log("Uploading insurance document...");
        carData.insurance_doc = await uploadToS3(req.files.insurance_doc[0], "driver-cars");
        carData.insurance_doc_status = "pending";
        hasCarVerificationFiles = true;
        console.log("Uploaded insurance document and set insurance_doc_status to 'pending':", carData.insurance_doc);
      }
    }

    // Step 12: Set is_approved in carData and driver status only if car verification files are uploaded
    if (hasCarVerificationFiles) {
      carData.is_approved = false; // Reset for re-verification
      updatedDriverData.status = "inactive"; // Set driver status to inactive
      console.log("Set is_approved to false in DriverCar and status to 'inactive' in Driver due to new car verification files");
    } else {
      delete carData.is_approved; // Preserve existing is_approved
      console.log("Preserving existing is_approved value in DriverCar");
    }

    // Step 13: Update driver status if car verification files were uploaded
    if (hasCarVerificationFiles && !hasDriverData) {
      await driverService.updateDriverProfile(driverId, { status: "inactive" });
      console.log("Driver status updated to 'inactive' due to car verification files");
    }

    // Step 14: Save or update car details
    if (hasCarFiles || carData.car_id || carData.license_plate || carData.color) {
      const vehicle = await driverCarService.upsertDriverCar(driverId, carData);
      console.log("DriverCar upsert result:", vehicle);
      return res.status(200).json({
        message: "Driver and vehicle profile submitted successfully.",
        driver: updatedDriver,
        vehicle,
      });
    } else {
      return res.status(200).json({
        message: "Driver profile updated successfully. No car data provided.",
        driver: updatedDriver,
        vehicle: null,
      });
    }
  } catch (error) {
    console.error("🚨 Submit driver & car profile error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      if (error.fields?.email) {
        return res.status(400).json({ error: "Email is already in use." });
      }
      if (error.fields?.phone) {
        return res.status(400).json({ error: "Phone number is already in use." });
      }
      if (error.fields?.emirates_id) {
        return res.status(400).json({ error: "Emirates ID is already in use." });
      }
      if (error.fields?.license_plate) {
        return res.status(400).json({ error: "License plate is already in use." });
      }
      if (error.fields?.one_signal_id) {
        return res.status(400).json({ error: "OneSignal ID is already in use." });
      }
    }
    return res.status(500).json({ error: `Failed to update profile or car details: ${error.message}` });
  }
};




const blockDriverByIdentifier = async (req, res) => {
    const { phone, email, } = req.body;

    try {
        if ((phone && email) || (!phone && !email)) {
            return res.status(400).json({
                message: "Provide either phone or email, not both or neither.",
            });
        }
        const result = await driverService.blockDriverByPhoneOrEmail(phone, email);
        res.status(200).json({
            message: "Driver status updated to blocked",
            data: result,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });

    }
}
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
            walletBalance
        });
    } catch (error) {
        console.error("Error fetching driver account:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const driverId = req.driver.id;

        await driverService.checkActiveRide(driverId)
        const result = await driverService.deactivateDriver(driverId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

const checkStatus = async (req, res) => {
  const driverId = req.driver.id;
  if (!driverId) {
    return res.status(400).json({ success: false, message: "Driver ID is required" });
  }

  try {
    // Fetch driver data
    const driver = await driverService.getDriverById(driverId);
    console.log("Driver data:", driver);

    // Fetch vehicle data (may return null if no vehicle exists)
    const vehicle = await driverCarService.getDriverCarByDriverId(driver.id);
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
    return res.status(500).json({ success: false, message: `Internal server error: ${error.message}` });
  }
};

const getStatuses = async (req, res) => {
    
    try {
        const driverId = req.driver.id;
        if (!driverId) {
            return res.status(400).json({ success: false, message: "Un Authorized" });
        }
        const driver = await driverService.getStatusByDriver(driverId);
        return res.status(200).json({ success: true, message: "Driver statuses fetched successfully", data: driver });
       
    } catch (error) {
        console.error("getStatuses error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }

}

const updateStatuses = async (req, res) => {
    
    try {
        const driverId = req.driver.id;
        if (!driverId) {
            return res.status(400).json({ success: false, message: "Un Authorized" });
        }
        const { ride_request, system_alerts, earning_updates } = req.body;
        const updatedDriver = await driverService.updateDriverProfile(driverId, { ride_request, system_alerts, earning_updates });
        return res.status(200).json({ success: true, message: "Driver statuses updated successfully", data: updatedDriver });
    } catch (error) {
        console.error("updateStatuses error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

// Controller to update one signal id
const updateOneSignalId = async (req, res) => {
    try {
        const driverId = req.driver.id;
        const { oneSignalId } = req.body;

        if (!driverId || !oneSignalId) {
            return res.status(400).json({ success: false, message: "Driver ID and OneSignal ID are required" });
        }

        const updatedDriver = await driverService.updateOneSignalPlayerId(driverId, oneSignalId);
        return res.status(200).json({ success: true, message: "OneSignal ID updated successfully", data: updatedDriver });
    } catch (error) {
        console.error("updateOneSignalId error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Controller to delete one signal id
const deleteOneSignalId = async (req, res) => {
    try {
        const driverId = req.driver.id;

        if (!driverId) {
            return res.status(400).json({ success: false, message: "Driver ID is required" });
        }

        const updatedDriver = await driverService.deleteOneSignalPlayerId(driverId);
        return res.status(200).json({ success: true, message: "OneSignal ID deleted successfully", data: updatedDriver });
    } catch (error) {
        console.error("deleteOneSignalId error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
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
    deleteOneSignalId
}