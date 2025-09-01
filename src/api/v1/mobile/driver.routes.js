const express = require('express');
const router = express.Router();
const driverAuthController = require('../../../controllers/mobile/driver-auth.controller');
const authMiddleware = require('../../../middlewares/mobile/authMiddleware');
const {upload} = require('../../../utils/multer');

router.post("/verify",driverAuthController.verifyMobile);
router.post("/status",driverAuthController.blockDriverByIdentifier)
router.post("/update-profile",
    authMiddleware.isAuthenticated,
    upload.fields([
        { name: 'profile_pic', maxCount: 1 },
        { name: 'emirates_doc_front', maxCount: 1 },
        { name: 'emirates_doc_back', maxCount: 1 },
        { name: 'license_front', maxCount: 1 },
        { name: 'license_back', maxCount: 1 },
        { name: 'car_photos', maxCount: 5 },
        { name: 'rc_doc', maxCount: 1 },
        { name: 'rc_doc_back', maxCount: 1 },
        { name: 'insurance_doc', maxCount: 1 },
    ]),
    driverAuthController.updateProfileAndCarDetails
);
router.get("/account-details",authMiddleware.isAuthenticated,driverAuthController.driverAccountDetails)
router.put("/delete-account",authMiddleware.isAuthenticated,driverAuthController.deleteAccount)
router.get("/check-status",authMiddleware.isAuthenticated,driverAuthController.checkStatus);

module.exports = router;