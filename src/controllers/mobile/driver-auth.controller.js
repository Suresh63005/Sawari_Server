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
            'profile_pic', 'emirates_doc_front', 'emirates_doc_back',
            'license_front', 'license_back',
        ];

        for (const field of profileFields) {
            if (req.files?.[field]) {
                console.log(`Uploading ${field}...`);
                const uploadedUrl = await uploadToS3(req.files[field][0], 'drivers');
                console.log(`${field} uploaded to S3:`, uploadedUrl);

                // If old file exists and is different, delete it
                if (driver?.[field] && driver[field] !== uploadedUrl) {
                    console.log(`Deleting old ${field} from S3:`, driver[field]);
                    await deleteFromS3(driver[field]);
                }

                updatedDriverData[field] = uploadedUrl;

                if (['emirates_doc_front', 'emirates_doc_back'].includes(field)) {
                    updatedDriverData.emirates_verification_status = 'pending';
                    console.log("Set emirates_verification_status to 'pending'");
                }

                if (['license_front', 'license_back'].includes(field)) {
                    updatedDriverData.license_verification_status = 'pending';
                    console.log("Set license_verification_status to 'pending'");
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

        // Step 6: Update driver profile in DB
        await driverService.updateDriverProfile(driverId, updatedDriverData); //update 1
        console.log("Driver profile updated in DB.");

        const UpdatedDriver = await driverService.getDriverById(driverId);

        // Handle Vehicle/ Car info
        const carData = {
            car_model: req.body.car_model,
            car_brand: req.body.car_brand,
            license_plate: req.body.license_plate
        };
        console.log("Initial car data:", carData);

        // Step 8: Handle car photo uploads
        if (req.files?.car_photos) {
            console.log("Uploading car photos...");
            const carPhotos = await Promise.all(
                req.files.car_photos.map(file => uploadToS3(file, 'driver-cars'))
            );
            carData.car_photos = carPhotos;
            console.log("Uploaded car photos:", carPhotos);
        }

        // Step 9: Upload RC document
        if (req.files?.rc_doc) {
            console.log("Uploading RC document...");
            carData.rc_doc = await uploadToS3(req.files.rc_doc[0], 'driver-cars');
            console.log("Uploaded RC document:", carData.rc_doc);
        }
        if (req.files?.rc_doc_back) {
            const uploadResult = await uploadToS3(req.files.rc_doc_back[0], 'driver-cars');

            // If rc_doc_back
            carData.rc_doc_back = uploadResult;

        }
        if (req.files?.insurance_doc) {
            console.log("Uploading insurance document...");
            carData.insurance_doc = await uploadToS3(req.files.insurance_doc[0], 'driver-cars');
            console.log("Uploaded insurance document:", carData.insurance_doc);
        }

        // Step 11: Set verification statuses
        carData.rc_doc_status = 'pending';
        carData.insurance_doc_status = 'pending';
        console.log("Set car document verification statuses to 'pending'");

        // Save or update car details
        await driverCarService.upsertDriverCar(driverId, carData); // update 2
        const vehicle = await driverCarService.getDriverCarByDriverId(driverId);

        res.status(200).json({ message: 'Driver and vehicle profile submitted successfully.', driver: UpdatedDriver, vehicle });
    } catch (error) {
        console.error('🚨 Submit driver & car profile error:', error);
        if (error.name === 'SequelizeUniqueConstraintError' && error.fields?.emirates_id) {
            return res.status(400).json({ error: 'Emirates ID is already in use.' });
        }
        res.status(500).json({ error: error.message });
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
        return res.status(400).json({ success: false, message: "driver ID is required" });
    }
    try {
        const driver = await driverService.getDriverById(driverId);
        console.log(driver,"driverrrrrrrrrrrr")
        const vehicle = await driverCarService.getDriverCarByDriverId(driver.id)
        console.log(vehicle,"vehicleeeeeeeeeeeeeeeee")
        return res.status(200).json({ success: true, message: "Driver data fetched successfully", data: {driver,vehicle} });

    } catch (error) {
        console.error("check status error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

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


module.exports = {
    verifyMobile,
    blockDriverByIdentifier,
    updateProfileAndCarDetails,
    driverAccountDetails,
    deleteAccount,
    checkStatus,
    getStatuses,
    updateStatuses
}