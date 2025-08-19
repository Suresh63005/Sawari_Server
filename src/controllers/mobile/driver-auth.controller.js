const { uploadToS3, deleteFromS3 } = require('../../config/fileUpload.aws');
const driverService = require('../../services/driver.service');
const driverCarService = require('../../services/driverCar.service');

const verifyMobile = async(req,res)=>{
    try {
        console.log("🔐 VERIFY endpoint hit");
         
        const {phone,token,email,social_login} = req.body
        const result = await driverService.verifyDriverMobile(phone, token, email, social_login);
        res.status(200).json({result})
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

const updateProfileAndCarDetails = async(req,res)=>{
    try {
        const driverId = req.driver.id;
        const updatedDriverData = {...req.body};
        const driver = await driverService.getDriverById(driverId)

        // Handle profile related file uploads
        const profileFields = [
            'profile_pic', 'emirates_doc_front', 'emirates_doc_back',
            'license_front', 'license_back'
        ];

        for (const field of profileFields) {
            if (req.files?.[field]) {
                const uploadedUrl = await uploadToS3(req.files[field][0], 'drivers');
                if (driver?.[field] && driver[field] !== uploadedUrl) {
                    await deleteFromS3(driver[field]);
                }
                updatedDriverData[field] = uploadedUrl;

                if (['emirates_doc_front', 'emirates_doc_back'].includes(field)) {
                    updatedDriverData.emirates_verification_status = 'pending';
                }
                if (['license_front', 'license_back'].includes(field)) {
                    updatedDriverData.license_verification_status = 'pending';
                }
            }
        }

         // Handle languages parsing
        if (updatedDriverData.languages) {
            try {
                const lang = JSON.parse(updatedDriverData.languages);
                updatedDriverData.languages = Array.isArray(lang) ? lang : [];
            } catch (err) {
                console.warn("Languages should be a valid JSON array string");
                updatedDriverData.languages = [];
            }
        }

        await driverService.updateDriverProfile(driverId,updatedDriverData);

        // Handle Vehicle/ Car info
        const carData = {
            car_model:req.body.car_model,
            car_brand:req.body.car_brand,
            license_plate:req.body.license_plate
        }
        if (req.files?.car_photos) {
            const carPhotos = await Promise.all(
                req.files.car_photos.map(file => uploadToS3(file, 'driver-cars'))
            );
            carData.car_photos = carPhotos;
        }

        if (req.files?.rc_doc) {
            carData.rc_doc = await uploadToS3(req.files.rc_doc[0], 'driver-cars');
        }
        if (req.files?.insurance_doc) {
            carData.insurance_doc = await uploadToS3(req.files.insurance_doc[0], 'driver-cars');
        }
         // Add defaults for verification fields
        carData.rc_doc_status = 'pending';
        carData.insurance_doc_status = 'pending';

        // Save or update car details
        await driverCarService.upsertDriverCar(driverId, carData);
        const vehicle = await driverCarService.getDriverCarByDriverId(driverId);

        res.status(200).json({ message: 'Driver and vehicle profile submitted successfully.',driver, vehicle });
    } catch (error) {
        console.error('Submit driver & car profile error:', error);
        res.status(500).json({ error: error.message });
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

    return res.status(200).json({
      message: "Driver account details fetched successfully.",
      driver,
      vehicle,
    });
  } catch (error) {
    console.error("Error fetching driver account:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteAccount = async(req,res)=>{
    try {
        const driverId = req.driver.id;
        const result = await driverService.deactivateDriver(driverId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: err.message });  
    }
}

module.exports = {
    verifyMobile,
    updateProfileAndCarDetails,
    driverAccountDetails,
    deleteAccount
}